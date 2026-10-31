// ---------------------------------------------------------------------------------
// vital_filters::ReverbEngine - Vital's reverb (vital::Reverb above, unchanged) run stand-alone,
// fully wet, fed through its own inputs (one value per block). Hand-written; appended by
// tools/gen_vital_filters.sh. Blackveil's REVERB node uses it (its DARK room).

namespace vital_filters
{
	// in Vital's own units (its reverb_* parameters, after their value scales)
	struct ReverbSettings
	{
		float decaySec = 1.0f;       // RT60 (0.1 .. 100 s)
		float size = 0.5f;           // 0..1: the delay lines' length, 2^(4 size - 3)
		float preLowNote = 0.0f;     // the input's band: low and high corners (MIDI notes)
		float preHighNote = 110.0f;
		float lowNote = 0.0f;        // the tail's low shelf: corner (note), gain (-24..0 dB)
		float lowGainDb = 0.0f;
		float highNote = 90.0f;      // the tail's high shelf
		float highGainDb = -1.0f;
		float chorusAmount = 0.05f;  // 0..1
		float chorusHz = 0.25f;
		float delaySec = 0.0f;       // pre-delay (0 .. 0.3 s)
	};

	class ReverbEngine
	{
	public:
		static constexpr int MaxBlock = 32;

		ReverbEngine() : audio(MaxBlock)
		{
			// every input is read, so every input is plugged (an unplugged one is a null source)
			reverb.plug(&audio, vital::Reverb::kAudio);
			reverb.plug(&decay, vital::Reverb::kDecayTime);
			reverb.plug(&preLow, vital::Reverb::kPreLowCutoff);
			reverb.plug(&preHigh, vital::Reverb::kPreHighCutoff);
			reverb.plug(&lowCut, vital::Reverb::kLowCutoff);
			reverb.plug(&lowGain, vital::Reverb::kLowGain);
			reverb.plug(&highCut, vital::Reverb::kHighCutoff);
			reverb.plug(&highGain, vital::Reverb::kHighGain);
			reverb.plug(&chorusAmount, vital::Reverb::kChorusAmount);
			reverb.plug(&chorusFreq, vital::Reverb::kChorusFrequency);
			reverb.plug(&width, vital::Reverb::kStereoWidth);
			reverb.plug(&size, vital::Reverb::kSize);
			reverb.plug(&delay, vital::Reverb::kDelay);
			reverb.plug(&wet, vital::Reverb::kWet);
			wet.buffer[0] = 1.0f;
			width.buffer[0] = 1.0f;
		}

		// allocates (the delay lines follow the rate): not on the audio thread
		void prepare(double sampleRate)
		{
			reverb.setSampleRate((int)std::round(sampleRate));
			reverb.hardReset();
		}

		// clears the tail
		void hardReset() { reverb.hardReset(); }

		// n <= MaxBlock samples of l / r, in place: the reverb's wet signal
		void process(float* l, float* r, int n, const ReverbSettings& s)
		{
			decay.buffer[0] = s.decaySec;
			size.buffer[0] = s.size;
			preLow.buffer[0] = s.preLowNote;
			preHigh.buffer[0] = s.preHighNote;
			lowCut.buffer[0] = s.lowNote;
			lowGain.buffer[0] = s.lowGainDb;
			highCut.buffer[0] = s.highNote;
			highGain.buffer[0] = s.highGainDb;
			chorusAmount.buffer[0] = s.chorusAmount;
			chorusFreq.buffer[0] = s.chorusHz;
			delay.buffer[0] = s.delaySec;

			for (int i = 0; i < n; i++)
				audio.buffer[i] = vital::poly_float(l[i], r[i]);
			reverb.processWithInput(audio.buffer, n);
			const vital::poly_float* out = reverb.output()->buffer;
			for (int i = 0; i < n; i++)
			{
				l[i] = out[i][0];
				r[i] = out[i][1];
			}
		}

	private:
		vital::Output audio;
		vital::cr::Output decay, preLow, preHigh, lowCut, lowGain, highCut, highGain, chorusAmount,
		                  chorusFreq, width, size, delay, wet;
		vital::Reverb reverb;
	};
}
