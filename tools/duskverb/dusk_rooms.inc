// ---------------------------------------------------------------------------------
// dusk_vendor::DuskRooms - four of DuskVerb's engines, each loaded with one of its tuned factory
// presets, run fully wet (bus mode); hand-written, appended to the amalgamated DuskVerb sources by
// tools/gen_duskverb.sh. Blackveil's REVERB node uses it.
//   Room 0 PLATE   "Vintage Gold Plate"   (Dattorro plate)
//        1 HALL    "Cathedral Large Hall" (dense diffused hall)
//        2 SPRING  "Surf '63 Spring"
//        3 SHIMMER "Deep Blue Day"
// A preset is applied the way DuskVerb's own plugin does it: every parameter at its default, then
// the preset's values (plain -> host -> DSP units), then stageSound(), which crossfades from the
// old engine over 50 ms on the audio thread.
// The knobs scale the preset (at size 0.6 / damping 0.5 / width 1 it plays as tuned):
//   size    -> Decay time x 2^(3 (size - 0.6))           (x0.17 .. x3.4)
//   damping -> Treble Multiply x 2^(-2 (d - 0.5)), Hi Cut x 2^(-5 (d - 0.5)), Hi Cut shelf
//              depth 0 dB .. preset .. -24 dB
//   width   -> Width x width

namespace dusk_vendor
{
class DuskRooms
{
public:
	static constexpr int NumRooms = 4;
	using DSP = duskverb::DuskVerbDSP;
	using Params = std::array<float, duskverb::kNumParams>;

	// builds two DuskVerb engines (for the crossfade, ~1.3 MB): not on the audio thread
	DuskRooms()
	{
		dsp = std::make_unique<DSP>();

		static const char* const names[NumRooms] = { "Vintage Gold Plate", "Cathedral Large Hall",
		                                             "Surf '63 Spring", "Deep Blue Day" };
		namespace dv = duskverb;

		for (int e = 0; e < NumRooms; e++)
		{
			auto& s = sounds[e];
			for (const auto& p : getFactoryPresets())
				if (std::string_view(names[e]) == p.name)
					s.preset = &p;

			for (int i = 0; i < dv::kNumParams; i++)
				s.plain[i] = dv::dspFromHost(dv::paramDesc(i), dv::hostDefault(dv::paramDesc(i)));

			if (s.preset == nullptr)
				continue;

			s.preset->collectParameters([&s](const char* id, float plainValue)
			{
				const int index = dv::paramIndexForId(id);
				if (index >= 0)
					s.plain[index] = dv::dspFromHost(dv::paramDesc(index), dv::plainToHost(dv::paramDesc(index), plainValue));
			});

			// fully wet, never frozen or bypassed
			s.plain[dv::Mix] = 1.0f;
			s.plain[dv::BusMode] = 1.0f;
			s.plain[dv::Bypass] = 0.0f;
			s.plain[dv::Freeze] = 0.0f;

			s.sixAP.densityBaseline = s.preset->sixAPDensityBaseline;
			s.sixAP.bloomCeiling = s.preset->sixAPBloomCeiling;
			s.sixAP.earlyMix = s.preset->sixAPEarlyMix;
			s.sixAP.outputTrim = s.preset->sixAPOutputTrim;
			for (int i = 0; i < 6; i++)
				s.sixAP.bloomStagger[i] = s.preset->sixAPBloomStagger[i];
		}
	}

	// allocates: not on the audio thread
	void prepare(double sampleRate, int maxBlockSize)
	{
		dsp->prepare(sampleRate, std::max(1, maxBlockSize));
		current = -1;   // stage the sound again
	}

	// the next block stages the room again (a crossfade from whatever the engine still holds)
	void restage() { current = -1; }

	// the room and the knobs for the next blocks (audio thread)
	void set(int room, float size, float damping, float width)
	{
		wanted = std::clamp(room, 0, NumRooms - 1);
		if (size != knobSize || damping != knobDamping || width != knobWidth)
		{
			knobSize = size;
			knobDamping = damping;
			knobWidth = width;
			knobsDirty = true;
		}
	}

	// n samples of l / r, in place: the room's wet signal
	void process(float* l, float* r, int n)
	{
		// a new room waits until the previous crossfade has finished
		if (wanted != current && (current < 0 || dsp->canRecall()))
		{
			Params p = sounds[wanted].plain;
			applyKnobs(wanted, p);
			dsp->stageSound(p, sounds[wanted].preset, sounds[wanted].sixAP);
			current = wanted;
			knobsDirty = false;
		}
		else if (knobsDirty && current >= 0)
		{
			knobsDirty = false;
			Params p = sounds[current].plain;
			applyKnobs(current, p);
			namespace dv = duskverb;
			for (int i : { (int)dv::Decay, (int)dv::Damping, (int)dv::HiCut, (int)dv::HiCutShelfDb, (int)dv::Width })
				dsp->setParameter(i, p[i]);
		}

		float* ch[2] = { l, r };
		dsp->processBlock(ch, ch, 2, n);
	}

private:
	// one room's starting point: the preset's parameters in DSP units
	struct Sound
	{
		const FactoryPreset* preset = nullptr;
		Params plain {};
		DSP::SixAPBrightnessState sixAP;
	};

	// the knobs on top of room e's preset values (see the top of this file)
	void applyKnobs(int e, Params& p) const
	{
		namespace dv = duskverb;
		const auto& base = sounds[e].plain;
		const float d = knobDamping;
		p[dv::Decay] = std::clamp(base[dv::Decay] * std::pow(2.0f, 3.0f * (knobSize - 0.6f)), 0.2f, 30.0f);
		p[dv::Damping] = std::clamp(base[dv::Damping] * std::pow(2.0f, -2.0f * (d - 0.5f)), 0.1f, 1.5f);
		p[dv::HiCut] = std::clamp(base[dv::HiCut] * std::pow(2.0f, -5.0f * (d - 0.5f)), 1000.0f, 20000.0f);
		// Hi Cut is a high shelf: its depth goes from 0 dB (damping 0) through the preset's own
		// depth (0.5) to -24 dB (1)
		const float shelf = base[dv::HiCutShelfDb];
		p[dv::HiCutShelfDb] = std::clamp(d < 0.5f ? shelf * d * 2.0f : shelf + (-24.0f - shelf) * (d - 0.5f) * 2.0f, -24.0f, 0.0f);
		p[dv::Width] = std::clamp(base[dv::Width] * knobWidth, 0.0f, 2.0f);
	}

	std::unique_ptr<DSP> dsp;
	Sound sounds[NumRooms];
	int current = -1, wanted = 1;
	float knobSize = 0.6f, knobDamping = 0.5f, knobWidth = 1.0f;
	bool knobsDirty = true;
};
} // namespace dusk_vendor
