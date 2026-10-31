// ---------------------------------------------------------------------------------------
// ShadowDSP's side (hand-written, tools/vital/vital_filters_engine.inc): one voice's copy of
// Vital's eight filter models for one filter module, driven the way Vital's FilterModule
// drives them. A filter node owns a pool of these.
//
// What follows Vital:
// - the filter classes above, unchanged, fed through their own inputs (cutoff as a per-sample
//   MIDI-note buffer, resonance 0..1, drive 0..20 dB, blend 0..2, style, transpose);
// - they run at Vital's default oversampling: 2x below 88.2 kHz, 1x above
//   (SoundEngine::setOversamplingAmount), and come back down through Vital's sharp IIR
//   halfband decimator;
// - a voice start sends kVoiceOn on the reset input, so the filters clear their state and
//   jump to their settings (Vital's poly reset); a model change hard-resets the new model;
// - MIX crossfades dry / filtered at the oversampled rate, ramped per block (FilterModule);
// - the formant model is FormantModule's graph for one style: four DigitalSvfs (resonance
//   bounds 4..30) at the bilinearly interpolated vowel formants, spread toward MIDI 80,
//   transposed, summed. (Vital's third formant style, "The Mouth", renders silence in the
//   released source; it isn't offered.)
//
// What doesn't (Vital has no equivalent): the 2x upsampler. Vital's oscillators render at
// the oversampled rate; a sample voice doesn't, so its audio goes up through a polyphase IIR
// halfband interpolator, the transpose of Vital's decimator (same allpass coefficients).

namespace vital_filters
{
	using vital::poly_float;
	using vital::poly_mask;
	using vital::mono_float;

	enum Model { Analog, Dirty, Ladder, Digital, Diode, Formant, Comb, Phaser, NumModels };

	// one filter module's settings (shared by the voices)
	struct Settings
	{
		int model = Analog;
		int style = 0;
		float resonance = 0.5f;          // 0..1
		float drive = 0.0f;              // 0..20 dB
		float blend = 0.0f;              // 0..2: low .. band .. high (per style)
		float mix = 1.0f;                // 0..1
		float blendTranspose = 42.0f;    // comb (and phaser) blend offset, 0..84 semitones
		float formantX = 0.5f, formantY = 0.5f;
		float formantTranspose = 0.0f;   // semitones
		float formantResonance = 0.85f;  // 0.3..1
		float formantSpread = 0.0f;      // -1..1
	};

	// number of styles each model offers (Vital's FilterSection)
	static constexpr int NumStyles[NumModels] = { 5, 5, 5, 5, 2, 2, 6, 2 };

	// 2x up: polyphase IIR halfband (Vital's 25-tap allpass pair), the transpose of Vital's
	// decimator. Writes 2n samples [L, R] (lanes 0 / 1); internally lanes 0..1 = left, 2..3 =
	// right, the even / odd output sample.
	struct HalfbandUp
	{
		static constexpr int UpFirst = 1;   // which allpass branch gives the earlier sample
		                                    // (the other order leaves images at 0 dB)
		void reset()
		{
			for (auto& s : state)
				s = 0.0f;
		}

		void process(const float* l, const float* r, int n, poly_float* out)
		{
			const poly_float* taps = vital::IirHalfbandDecimator::kTaps25;
			for (int i = 0; i < n; i++)
			{
				poly_float result(l[i], l[i], r[i], r[i]);
				for (int t = 0; t < vital::IirHalfbandDecimator::kNumTaps25; t++)
				{
					poly_float delta = result - state[2 * t + 1];
					poly_float next = vital::utils::mulAdd(state[2 * t], taps[t], delta);
					state[2 * t] = result;
					state[2 * t + 1] = next;
					result = next;
				}
				// result = [L even, L odd, R even, R odd]
				out[2 * i] = poly_float(result[UpFirst], result[2 + UpFirst]);
				out[2 * i + 1] = poly_float(result[1 - UpFirst], result[3 - UpFirst]);
			}
		}

		poly_float state[2 * vital::IirHalfbandDecimator::kNumTaps25];
	};

	class Engine
	{
	public:
		static constexpr int MaxBlock = 32;        // base-rate samples per process() call
		static constexpr int CombMemory = 8192;    // samples: 13 Hz at 96 kHz (Vital: 25000)

		Engine() :
			audioUp(MaxBlock * 2), midi(MaxBlock * 2), formantMidi { { MaxBlock * 2 }, { MaxBlock * 2 }, { MaxBlock * 2 }, { MaxBlock * 2 } },
			wet(MaxBlock * 2), comb(CombMemory), phaser(false)
		{
			filters[Analog] = &sallenKey;
			filters[Dirty] = &dirty;
			filters[Ladder] = &ladder;
			filters[Digital] = &digital;
			filters[Diode] = &diode;
			filters[Formant] = nullptr;
			filters[Comb] = &comb;
			filters[Phaser] = &phaser;

			for (auto* f : filters)
				if (f != nullptr)
					plugInputs(*f, midi);

			for (int i = 0; i < vital::kNumFormants; i++)
			{
				formants[i].setResonanceBounds(4.0f, 30.0f);   // FormantManager
				plugInputs(formants[i], formantMidi[i]);
				formants[i].plug(&formantRes[i], vital::SynthFilter::kResonance);
				formants[i].plug(&formantGain[i], vital::SynthFilter::kGain);
				formants[i].plug(&formantStyle, vital::SynthFilter::kStyle);
				formants[i].plug(&formantBlend, vital::SynthFilter::kPassBlend);
				formants[i].plug(&zero, vital::SynthFilter::kDriveGain);
			}
			formantStyle.buffer[0] = (float)vital::DigitalSvf::k12Db;
			formantBlend.buffer[0] = 1.0f;

			decimator.plug(&wet, vital::IirHalfbandDecimator::kAudio);
			decimator.setSharpCutoff(true);   // the last (only) stage is the sharp one
		}

		void prepare(double sampleRate)
		{
			oversample = sampleRate < 88200.0 ? 2 : 1;
			const int rate = (int)std::round(sampleRate) * oversample;

			for (auto* f : filters)
				if (f != nullptr)
					f->setSampleRate(rate);
			for (auto& f : formants)
				f.setSampleRate(rate);

			hardReset();
		}

		// a voice starts: the next block resets the filters (state cleared, settings jump)
		void startVoice() { pendingReset = true; }

		void hardReset()
		{
			for (auto* f : filters)
				if (f != nullptr)
					f->hardReset();
			for (auto& f : formants)
				f.hardReset();
			decimator.reset(vital::constants::kFullMask);
			up.reset();
			pendingReset = true;
		}

		// Filters n <= MaxBlock samples of l / r in place. The cutoff in MIDI notes (Vital's
		// cutoff + modulation + keytrack) glides linearly from cutoffFrom to cutoffTo over the
		// block; formantShift (semitones) moves the formants the same way.
		void process(float* l, float* r, int n, const Settings& s,
		             float cutoffFrom, float cutoffTo, float formantShiftFrom, float formantShiftTo)
		{
			const int model = s.model < 0 || s.model >= NumModels ? Analog : s.model;
			if (model != lastModel)
			{
				if (model == Formant)
					for (auto& f : formants)
						f.hardReset();
				else
					filters[model]->hardReset();
				lastModel = model;
			}

			const int ns = n * oversample;
			upsample(l, r, n);

			// a voice start resets for this block only (Processor::getResetMask)
			resetTrigger.trigger_value = pendingReset ? poly_float((float)vital::kVoiceOn) : poly_float(0.0f);
			const bool resetNow = pendingReset;
			pendingReset = false;

			resonance.buffer[0] = s.resonance;
			drive.buffer[0] = s.drive;
			blend.buffer[0] = s.blend;
			style.buffer[0] = (float)s.style;
			transpose.buffer[0] = s.blendTranspose;

			vital::Processor* active = nullptr;

			if (model == Formant)
			{
				processFormants(s, ns, formantShiftFrom, formantShiftTo);
			}
			else
			{
				fillRamp(midi.buffer, ns, cutoffFrom, cutoffTo);
				active = filters[model];
				active->process(ns);
			}

			// MIX: Vital's FilterModule crossfade, ramped over the block
			poly_float target = vital::utils::clamp(poly_float(s.mix), 0.0f, 1.0f);
			if (resetNow)
				mix = target;
			const poly_float delta = (target - mix) * (1.0f / (float)ns);
			const poly_float* in = audioUp.buffer;

			if (model == Formant)
			{
				for (int i = 0; i < ns; i++)
				{
					mix += delta;
					poly_float sum = formants[0].output()->buffer[i] + formants[1].output()->buffer[i]
					               + formants[2].output()->buffer[i] + formants[3].output()->buffer[i];
					wet.buffer[i] = vital::utils::interpolate(in[i], sum, mix);
				}
			}
			else
			{
				const poly_float* out = active->output()->buffer;
				for (int i = 0; i < ns; i++)
				{
					mix += delta;
					wet.buffer[i] = vital::utils::interpolate(in[i], out[i], mix);
				}
			}
			mix = target;

			if (oversample == 2)
			{
				decimator.process(n);
				const poly_float* d = decimator.output()->buffer;
				for (int i = 0; i < n; i++)
				{
					l[i] = d[i][0];
					r[i] = d[i][1];
				}
			}
			else
			{
				for (int i = 0; i < n; i++)
				{
					l[i] = wet.buffer[i][0];
					r[i] = wet.buffer[i][1];
				}
			}
		}

	private:
		void plugInputs(vital::Processor& f, vital::Output& midiBuffer)
		{
			f.plug(&audioUp, vital::SynthFilter::kAudio);
			f.plug(&resetTrigger, vital::SynthFilter::kReset);
			f.plug(&midiBuffer, vital::SynthFilter::kMidiCutoff);
			f.plug(&resonance, vital::SynthFilter::kResonance);
			f.plug(&drive, vital::SynthFilter::kDriveGain);
			f.plug(&zero, vital::SynthFilter::kGain);
			f.plug(&style, vital::SynthFilter::kStyle);
			f.plug(&blend, vital::SynthFilter::kPassBlend);
			f.plug(&half, vital::SynthFilter::kInterpolateX);
			f.plug(&half, vital::SynthFilter::kInterpolateY);
			f.plug(&transpose, vital::SynthFilter::kTranspose);
			f.plug(&zero, vital::SynthFilter::kSpread);
		}

		static void fillRamp(poly_float* dest, int ns, float from, float to)
		{
			const float step = (to - from) / (float)ns;
			for (int i = 0; i < ns; i++)
				dest[i] = from + step * (float)(i + 1);
		}

		// FormantModule / FormantFilter for one style: the vowel table interpolated at X / Y,
		// spread toward the centre, transposed (FormantFilter::setupFilter's maths, with the
		// spread of FormantFilter::init's graph).
		void processFormants(const Settings& s, int ns, float shiftFrom, float shiftTo)
		{
			using namespace vital;
			const int st = s.style < 0 ? 0 : (s.style > 1 ? 1 : s.style);
			const poly_float x = utils::clamp(poly_float(s.formantX), 0.0f, 1.0f);
			const poly_float y = utils::clamp(poly_float(s.formantY), 0.0f, 1.0f);

			for (int i = 0; i < kNumFormants; i++)
			{
				SynthFilter::FilterState fs = interpolateFormants(formant_styles[st][kTopLeft][i],
				                                                  formant_styles[st][kTopRight][i],
				                                                  formant_styles[st][kBottomLeft][i],
				                                                  formant_styles[st][kBottomRight][i], x, y);
				const float base = utils::interpolate(fs.midi_cutoff, poly_float(FormantFilter::kCenterMidi),
				                                      poly_float(s.formantSpread))[0] + s.formantTranspose;
				fillRamp(formantMidi[i].buffer, ns, base + shiftFrom, base + shiftTo);
				formantRes[i].buffer[0] = fs.resonance_percent * s.formantResonance;
				formantGain[i].buffer[0] = fs.gain;
				formants[i].process(ns);
			}
		}

		void upsample(const float* l, const float* r, int n)
		{
			if (oversample == 1)
			{
				for (int i = 0; i < n; i++)
					audioUp.buffer[i] = poly_float(l[i], r[i]);
				return;
			}
			up.process(l, r, n, audioUp.buffer);
		}

		int oversample = 2;
		int lastModel = -1;
		bool pendingReset = true;
		poly_float mix = 1.0f;
		HalfbandUp up;

		// inputs (Outputs the filters read)
		vital::Output audioUp, midi, formantMidi[vital::kNumFormants], wet;
		vital::cr::Output resetTrigger, resonance, drive, blend, style, transpose, zero, half,
		                  formantRes[vital::kNumFormants], formantGain[vital::kNumFormants], formantStyle, formantBlend;

		vital::SallenKeyFilter sallenKey;
		vital::DirtyFilter dirty;
		vital::LadderFilter ladder;
		vital::DigitalSvf digital;
		vital::DiodeFilter diode;
		vital::CombFilter comb;
		vital::PhaserFilter phaser;
		vital::DigitalSvf formants[vital::kNumFormants];
		vital::Processor* filters[NumModels];

		vital::IirHalfbandDecimator decimator;
	};

	// ---------------------------------------------------------------------------------------
	// Eq: Vital's EQ bands (EqualizerModule's DigitalSvfs in their kShelving style: pass blend
	// 0 = low shelf, 1 = bell, 2 = high shelf, gain in dB, clamped to Vital's +-15 dB) in
	// series: a low shelf, three bells, a high shelf. Like the filter models they run at
	// Vital's default 2x below 88.2 kHz (same up / down sampling), which also keeps the bells'
	// shape near 20 kHz. Frequencies glide (~15 ms, then a per-sample ramp); gain and Q ramp
	// per block inside the filter. A flat band (0 dB) passes the signal unchanged.
	// mirror_eq.h hosts it.
	class Eq
	{
	public:
		static constexpr int MaxBlock = 32;     // base-rate samples per process() call
		static constexpr int NumBands = 5;
		static constexpr float QMin = 0.3f;     // resonance bounds = Q (the SVF's k is 1 / Q)
		static constexpr float QMax = 12.0f;

		struct Band
		{
			float freq = 1000.0f;   // Hz
			float gain = 0.0f;      // dB
			float q = 0.707f;
		};

		Eq() : audioUp(MaxBlock * 2), midi { { MaxBlock * 2 }, { MaxBlock * 2 }, { MaxBlock * 2 }, { MaxBlock * 2 }, { MaxBlock * 2 } }
		{
			for (int b = 0; b < NumBands; b++)
			{
				auto& f = bands[b];
				f.setResonanceBounds(QMin, QMax);
				f.plug(b == 0 ? &audioUp : bands[b - 1].output(), vital::SynthFilter::kAudio);
				f.plug(&resetTrigger, vital::SynthFilter::kReset);
				f.plug(&midi[b], vital::SynthFilter::kMidiCutoff);
				f.plug(&resonance[b], vital::SynthFilter::kResonance);
				f.plug(&zero, vital::SynthFilter::kDriveGain);
				f.plug(&gain[b], vital::SynthFilter::kGain);
				f.plug(&style, vital::SynthFilter::kStyle);
				f.plug(&blend[b], vital::SynthFilter::kPassBlend);
				f.plug(&half, vital::SynthFilter::kInterpolateX);
				f.plug(&half, vital::SynthFilter::kInterpolateY);
				f.plug(&zero, vital::SynthFilter::kTranspose);
				f.plug(&zero, vital::SynthFilter::kSpread);
				blend[b].buffer[0] = b == 0 ? 0.0f : (b == NumBands - 1 ? 2.0f : 1.0f);
			}
			style.buffer[0] = (float)vital::DigitalSvf::kShelving;
			half.buffer[0] = 0.5f;
			decimator.plug(bands[NumBands - 1].output(), vital::IirHalfbandDecimator::kAudio);
			decimator.setSharpCutoff(true);
		}

		void prepare(double sampleRate)
		{
			oversample = sampleRate < 88200.0 ? 2 : 1;
			for (auto& f : bands)
				f.setSampleRate((int)std::round(sampleRate) * oversample);
			glide = 1.0f - std::exp(-(float)MaxBlock / (0.015f * (float)sampleRate));
			for (auto& f : bands)
				f.hardReset();
			decimator.reset(vital::constants::kFullMask);
			up.reset();
			first = true;
		}

		// filters n <= MaxBlock samples of l / r in place; gainSign flips every band's gain
		void process(float* l, float* r, int n, const Band* settings, float gainSign)
		{
			const int ns = n * oversample;
			if (oversample == 1)
				for (int i = 0; i < n; i++)
					audioUp.buffer[i] = poly_float(l[i], r[i]);
			else
				up.process(l, r, n, audioUp.buffer);

			// the first block jumps to the settings (Vital's reset), later ones glide / ramp
			resetTrigger.trigger_value = first ? poly_float((float)vital::kVoiceOn) : poly_float(0.0f);

			for (int b = 0; b < NumBands; b++)
			{
				const Band& s = settings[b];
				const float target = vital::utils::frequencyToMidiNote(vital::utils::clamp(s.freq, 10.0f, 22000.0f));
				const float from = first ? target : midiNow[b];
				midiNow[b] = first ? target : from + (target - from) * glide;
				const float step = (midiNow[b] - from) / (float)ns;
				for (int i = 0; i < ns; i++)
					midi[b].buffer[i] = from + step * (float)(i + 1);

				const float q = vital::utils::clamp(s.q, QMin, QMax);
				resonance[b].buffer[0] = std::cbrt((q - QMin) / (QMax - QMin));   // DigitalSvf cubes it
				gain[b].buffer[0] = s.gain * gainSign;
				bands[b].process(ns);
			}
			first = false;

			if (oversample == 2)
			{
				decimator.process(n);
				const poly_float* d = decimator.output()->buffer;
				for (int i = 0; i < n; i++)
				{
					l[i] = d[i][0];
					r[i] = d[i][1];
				}
			}
			else
			{
				const poly_float* d = bands[NumBands - 1].output()->buffer;
				for (int i = 0; i < n; i++)
				{
					l[i] = d[i][0];
					r[i] = d[i][1];
				}
			}
		}

	private:
		int oversample = 2;
		bool first = true;
		float glide = 0.1f;
		float midiNow[NumBands] = {};
		HalfbandUp up;

		vital::Output audioUp, midi[NumBands];
		vital::cr::Output resetTrigger, resonance[NumBands], gain[NumBands], blend[NumBands], style, zero, half;
		vital::DigitalSvf bands[NumBands];
		vital::IirHalfbandDecimator decimator;
	};
}
