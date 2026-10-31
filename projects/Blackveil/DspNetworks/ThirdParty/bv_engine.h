/*  bv_engine - Blackveil's whole signal path in one HISE third party node, wired module by
    module (see SPEC.md). Running it as one node lets the FX chain be reordered at runtime
    (later: it's only the order of the processing calls).

    Wired so far:
    - SOURCE: EXT (the track's audio) or SAMPLE (the kick in audio file slot 0, which the script
      loads), then DRIVE (a tanh saturation blended in, 0 = clean) and LEVEL (dB). SAMPLE replaces
      the input. Its kick plays on a MIDI note (Trigger 0: the script bumps Hit, with the note's
      offset in the block and its velocity) or on every Division of the host's beat while the
      transport plays (Trigger 1, GRID), through TUNE (st), PITCH (a pitch envelope, st, falling
      over PitchDecay) and DECAY (full level for 60 %, then a cosine fade to silence at DECAY).
      Two voices: a new kick fades the previous one out over 3 ms.
      EXT: the kicks (for FILTER's envelope and the KICK duck) are on every Division of
      the host's grid while it plays, not detected in the input (until 2026-10-29 an onset
      detector; in Live, behind a Drum Rack, CLONE lost a step with it: user, "use the grid").
    - SEND GATE (GateLength, 2026-10-29): only each kick's first GateLength ms feed the FX chain
      (full for 60 %, then a cosine fade), so the kick's long tail stays out of the rumble; the
      dry kick is untouched. At 1000 (FULL) no gate. Before the first kick (EXT with the
      transport stopped: no grid kicks) the gate is closed.
    - NOISE (NoiseLevel, NoiseColor, 2026-10-30): band-limited white noise (DARK ~500 Hz, MID
      ~2 kHz, AIR above 5 kHz; decorrelated left / right) added to the chain's input, its level
      following the kick's envelope (an envelope follower on the source), so it lives and dies
      with each kick and the FX chain smears it into texture. Before the SEND GATE; the dry kick
      is untouched. NoiseLevel -60 = OFF.
    - THE FX CHAIN, in ChainOrder (the block is processed in 32-sample chunks: source, chain,
      snapshot). FILTER: Vital's analog (Sallen-Key) model through the shared vital_filters
      engine (Vital's 2x oversampling), 12 / 24 dB as low / band / high pass, then (2026-10-31)
      Vital's LADDER (24 dB), DIODE and DIRTY (24 dB) low passes and its COMB (positive
      feedback: RESO 0..1 = Vital's resonance 0.5..1, the comb at CUTOFF; the script snaps
      CUTOFF to the KEY's root for it), CUTOFF, RESO, and
      an envelope restarted by each kick (the player's, or in EXT a grid step) that
      sweeps the cutoff by ENV x 7 octaves, falling over ENV DEC. REVERB: five rooms, PLATE /
      HALL / SPRING / SHIMMER (DuskVerb's tuned presets, the shared mapping of SIZE / DAMP /
      WIDTH) and DARK (Vital's reverb: SIZE = its size and a 0.5 .. 8 s decay, DAMP darkens its
      input and its tail, WIDTH scales its side signal); MIX dry / wet. Switching between a
      DuskVerb room and DARK crossfades over 50 ms (DuskVerb crossfades its own rooms).
      DELAY (CLONE's place in the chain since 2026-10-29, user: "replace clone with a delay
      unit"): a delay synced to the host's tempo (DelayTime, beats: 1/32 .. 1/2 with dotted and
      triplet values), its repeats through LOW CUT and HIGH CUT (12 dB Butterworth high- and
      low-pass) inside the feedback loop, so each repeat gets thinner and darker, and a tanh on
      the fed-back signal (warmth, and FEEDBACK at its top can't run away); MONO (each channel its
      own loop) or PING-PONG (the input summed into the left line, the lines feeding each other;
      the repeats' lows, under 150 Hz (12 dB split), kept mono so the sub doesn't swing); MIX dry / wet.
      SWING (DelaySwing, 2026-10-30): each loop is two lines feeding each other, A reading
      TIME (1 + SWING) back and B TIME (1 - SWING), so the odd repeats (the 1st, 3rd...) come
      early or late and every pair still spans 2 TIME; at 0 the same sound as one line (MONO:
      a pair per channel; PING-PONG: one pair, A left, B right, as before). A
      tempo change glides the time over ~50 ms. CLONE's parameters (42..46) stay registered,
      unused.
      DIST: TAPE / TUBE / FOLD / CLIP curves (see distCurve) driven 1..10x and level-compensated
      (distMakeup: DRIVE changes the character, not the balance), a DC blocker, TONE (a
      one-pole low-pass) and MIX; no oversampling (the rumble is mostly under 200 Hz).
      CRUSH (DistCrush, 2026-10-30): after the curve, a sample-and-hold rate reducer (the full rate
      down to 1/50 of it) and a bit reducer (12 bits down to 2: from 16 .. 4 at the merge, 2026-10-30, the lower 60 % of the knob was inaudible on the rumble), both from the one knob; TONE then
      softens the steps. 0 = untouched.
    - GRAIN (2026-10-30, in the FX chain, off by default): a granular cloud. The chain's signal at
      its slot is written into a 2.5 s buffer; every 1 / DENSITY s (+-50 % at random) a grain
      starts somewhere in the last SPRAY ms (at random), reads SIZE ms through a Hann window and
      is panned at random (+-50 %), up to MaxGrains at once. MODE sets how it reads: CLOUD (as
      recorded), DETUNE (+-30 cents at random), OCT UP / OCT DOWN (2x / 0.5x), REVERSE. The
      grains' sum is scaled by 1 / sqrt(their average overlap x 0.375, the Hann window's power), so
      DENSITY and SIZE change the texture more than the level; MIX dry / wet. A setting applies
      from the next grain (no zipper); ON / OFF and MIX fade over ~20 ms.
    - No chain module on (FILTER, DIST, DELAY, REVERB, GRAIN all off): no rumble (faded), so the output
      is the dry kick alone, like a bypass (an all-off chain passes its input: the kick twice).
    - EQ (in the FX chain since 2026-10-29, user: part of the reorderable chain; before, fixed
      after it): TYPE (EqType: a bass bell at FREQ, GAIN, WIDTH = its bandwidth; or since 2026-10-30
      a LOW or HIGH SHELF at FREQ, WIDTH its slope) and
      SUB CUT, a 12 dB high-pass under it, so the boost doesn't pile up sub energy.
    - DUCK (after EQ): the rumble's gain follows a curve restarted
      by a trigger: KICK (the player's kicks, or in EXT the grid steps) or GRID (every
      DuckDivision beats of the host's grid while it plays). The curve: the script's curve editor
      sends its breakpoints through slider pack 0 (see duckShapeAt: x, y = 1 no duck .. 0 full
      DEPTH, bend), spread over DuckLength beats; after its end the last value holds until the
      next trigger.
      The gain = 1 - DEPTH (1 - shape); a retrigger blends from the gain it was at over 3 ms.
      OFFSET shifts the curve against the trigger: in GRID it can start before
      the beat (the grid is known ahead); in KICK only after (a negative one counts as 0: it would
      need lookahead latency). SPLIT (2026-10-29, in MIX's place, user: "replace duck mix with
      ducking the low end"): DUCK acts under SPLIT (a 24 dB Linkwitz-Riley crossover: the lows
      at the gain, the highs as they are; LP + HP of a Linkwitz-Riley pair sum flat), or
      at FULL (2000) on the whole band; DuckMix stays at 1. TARGET: RUMBLE ducks the rumble (here),
      ALL the whole output (in OUTPUT, after the dry kick is added back: with GRID, a volume
      shaper on any track).
    - OUTPUT: the chain's output, the rumble,
      through PHASE (a rotation of its phase by 0..360°: a 90° phase difference network, two
      allpass paths mixed so that at 50 Hz, the kick's sub, the rumble is shifted by exactly
      PHASE; the network's own phase drifts away from there: about +-18° at 40 / 60 Hz, +-40°
      at 30 / 80 Hz, the dry kick being untouched) and POL (+ / -), then WIDTH (its side
      signal, 0..200 %) and the RUMBLE level (WetLevel, dB); then the dry kick (the SOURCE's
      output, untouched) added back at DRY
      (dB, when DRY is on); then BASS MONO (BassMono, 2026-10-31: under it, 20..500 Hz, the
      output's lows summed to mono through a 24 dB Linkwitz-Riley pair, like DUCK's; 20 = OFF,
      ON / OFF crossfades over ~20 ms; BOUNCE's RUMBLE and KICK stems get their own copy), all at
      VOLUME (dB).
    - LIMITER (the last stage, so it also catches the dry kick): DRIVE (dB) into a stereo-linked
      peak limiter without lookahead (no latency: the gain drops at once, holds 12 ms, recovers
      over RELEASE), the output clamped at CEILING (dB).
    - BOUNCE (2026-10-30): three stems are recorded into a 10 s ring each, with the position of
      each bar line (4 beats, from the host's beat position; a jump in it starts over): RUMBLE
      (the rumble after OUTPUT's PHASE / POL / WIDTH and level, ducked, at VOLUME), KICK (the
      dry kick at DRY, ducked in TARGET ALL, at VOLUME), MIX (the output, after the LIMITER). In
      TARGET ALL each stem goes through its own copy of DUCK's crossover (dkSR, dkSK): it's
      linear, so RUMBLE + KICK = MIX before the LIMITER. Bounce going from 0 to 1 (the script
      sets 0, then 1, from the message thread: setParameter runs there, synchronously) writes
      BounceStem's last BounceBars complete bars as a 24-bit WAV,
      `%APPDATA%/ShadowDSP/Blackveil/Bounces/_bounce.wav` (deleted first, so no file = nothing to
      bounce: fewer bars recorded, or silence). The audio played before the first bar line
      rings into its start, so a loop of a steady sound repeats seamlessly.
    - The visualizer's snapshot: per window (Window = 1, 4 or 8 beats, aligned to the host's
      bars), the min / max of the source (channel 0) and of the output (channel 1) in Bins
      bins (the output = what DUCK acts on, ducked: the rumble after OUTPUT's PHASE / POL / WIDTH, or
      in TARGET ALL the rumble and the dry kick; without the dry kick in RUMBLE, never VOLUME),
      written whole to display buffer 0 when the window ends. A window that stayed
      silent isn't written, so the last snapshot stays on screen when the sound stops. The
      host position comes from HISE's master clock (transport start / resync, then counted
      per sample at the host tempo); with the transport stopped it free-runs. The resync needs
      the clock's sync mode on (the script sets ExternalOnly; Inactive, HISE's default, never
      resyncs): without it a preset load (HISE suspends the audio meanwhile) left the grid behind
      the host until the transport restarted (until 2026-10-31).

    Display buffer layout (the script sets it to 2 channels x 4096): per channel, bin b's min
    and max at [2b] and [2b + 1] for b < Bins, then 32 slots at [2 Bins ..] holding the window's
    duck triggers (where the trigger was, as a fraction of the window: the kick, or the grid
    point; the script adds OFFSET; channel 0 the first 32, channel 1 the next; -1000 = none),
    then [4094] = a counter (+1 per snapshot) and [4095] = the window in beats.
*/

#pragma once
#include <JuceHeader.h>
#include <cmath>
#include <complex>
#include <vector>
#include "src/vital_filters.h"   // shared/dsp/vital_filters.h, copied by tools/gen_vital_filters.sh
#include "src/duskverb.h"        // shared/dsp/duskverb.h, copied by tools/gen_duskverb.sh

namespace project
{
using namespace juce;
using namespace hise;
using namespace scriptnode;

template <int NV> struct bv_engine : public data::base,
                                     public hise::TempoListener
{
	SNEX_NODE(bv_engine);

	struct MetadataClass
	{
		SN_NODE_ID("bv_engine");
	};

	static constexpr bool isModNode() { return false; };
	static constexpr bool isPolyphonic() { return NV > 1; };
	static constexpr bool hasTail() { return false; };
	static constexpr bool isSuspendedOnSilence() { return false; };
	static constexpr int getFixChannelAmount() { return 2; };

	static constexpr int NumTables = 0;
	static constexpr int NumSliderPacks = 1;       // the duck curve's shape (the script fills it)
	static constexpr int NumAudioFiles = 1;
	static constexpr int NumFilters = 0;
	static constexpr int NumDisplayBuffers = 1;

	static constexpr int SnapSize = 4096;          // floats per channel in the display buffer
	static constexpr int RefSlots = 32;            // duck triggers per channel
	static constexpr int Bins = SnapSize / 2 - 1 - RefSlots / 2;  // then the triggers, the counter + window
	static constexpr float NoRef = -1000.0f;

	static constexpr int Chunk = vital_filters::Engine::MaxBlock;   // samples per chain pass
	static constexpr int NumFx = 6;                // the FX chain's modules (EQ since 2026-10-29, GRAIN since 2026-10-30)
	enum Fx { FxFilter, FxDist, FxDelay, FxReverb, FxEq, FxGrain };   // (FxDelay: CLONE's slot until 2026-10-29)
	static constexpr int NumFilterTypes = 10;      // LP 12, LP 24, BP 12, BP 24, HP 12, HP 24, LADDER, DIODE, DIRTY, COMB
	static constexpr float FilterEnvRange = 84.0f; // st at ENV 100 % (7 octaves)
	static constexpr int DefaultOrder = 0 + 4 * 1 + 16 * 2 + 64 * 3;
	static constexpr int DefaultChainOrder = 0 + 8 * 1 + 64 * 2 + 512 * 3 + 4096 * 4 + 32768 * 5;   // FILTER DIST DELAY REVERB EQ GRAIN
	static constexpr int MaxGrains = 32;           // GRAIN's voices
	static constexpr int NumGrainModes = 5;        // CLOUD, DETUNE, OCT UP, OCT DOWN, REVERSE
	static constexpr int GrainWinSize = 1024;      // the grains' Hann window (a table)
	static constexpr int NumRooms = 5;             // PLATE, HALL, SPRING, SHIMMER (DuskVerb), DARK (Vital)
	static constexpr int DarkRoom = 4;
	static constexpr float DarkTrim = 1.0f;        // DARK's wet level next to the DuskVerb rooms'
	static constexpr int MaxDuckPoints = 16;        // the duck curve's breakpoints (slider pack 0)
	static constexpr float DuckFull = 1990.0f;      // DuckSplit at or above it: FULL (the whole band)
	static constexpr float GateFull = 995.0f;       // GateLength at or above it: FULL (no gate)
	static constexpr float BassMonoOff = 20.5f;    // BassMono at or under it: OFF

	// append-only: presets and DAW sessions store these by index
	enum Parameters
	{
		Source,    // 0 EXT, 1 SAMPLE
		Drive,     // 0..1
		Level,     // dB
		Window,    // beats: 1, 4 or 8
		Trigger,   // 0 MIDI, 1 GRID
		Division,  // GRID: beats between kicks (0.5, 1, 2, 4)
		Tune,      // st
		Decay,     // ms
		Pitch,     // st, the pitch envelope's start
		PitchDecay,// ms, its fall time constant
		Hit,       // a counter: every change plays the kick (MIDI)
		HitOffset, // the note's sample offset in the block (set before Hit)
		HitVelocity,// 0..1 (set before Hit)
		FilterOn,  // 0 / 1
		FilterType,// 0..9: LP 12, LP 24, BP 12, BP 24, HP 12, HP 24 (Vital's analog model), LADDER, DIODE, DIRTY, COMB
		Cutoff,    // Hz
		Resonance, // 0..1
		FilterEnv, // -1..1: the envelope's sweep, x 7 octaves
		FilterEnvDecay, // ms
		Order,     // the FX chain: slot k's module in bits 2k..2k+1 (0 FILTER, 1 DIST, 2 DELAY, 3 REVERB)
		DryOn,     // 0 / 1: the kick added back
		DryLevel,  // dB (-60 = silent)
		Phase,     // degrees, 0..360: the rumble's phase rotation
		Polarity,  // 0 +, 1 - (the rumble)
		Width,     // %, 0..200: the rumble's stereo width
		Volume,    // dB, the output
		DuckTrigger,  // 0 KICK, 1 GRID
		DuckDivision, // GRID: beats between triggers
		DuckDepth,    // 0..1
		DuckMix,      // 0..1: ducked vs unducked rumble
		DuckFall,     // ms (DuckFall .. DuckShape: unused since the curve editor, 2026-10-28)
		DuckHold,     // ms
		DuckRelease,  // ms
		DuckShape,    // -1..1: the release's curve
		DuckOffset,   // ms, -50..50: the curve against the trigger
		ReverbOn,     // 0 / 1
		ReverbType,   // 0..4: PLATE, HALL, SPRING, SHIMMER, DARK
		ReverbSize,   // 0..1
		ReverbDamp,   // 0..1
		ReverbWidth,  // 0..1
		ReverbMix,    // 0..1
		DuckLength,   // beats: the duck curve's length
		CloneOn,      // 0 / 1 (CloneOn .. CloneDecay: unused since DELAY replaced CLONE, 2026-10-29)
		CloneBar2,    // 0..0.6: the clone one sixteenth later (STEP 2; the names are the old bars)
		CloneBar3,    // 0..0.6: two sixteenths later (STEP 3)
		CloneBar4,    // 0..0.6: three sixteenths later (STEP 4)
		CloneDecay,   // ms: how long each echoed kick rings (full for 60 %, then a fade)
		DistOn,       // 0 / 1
		DistMode,     // 0..3: TAPE, TUBE, FOLD, CLIP
		DistDrive,    // 0..1 (x 1..10 into the curve)
		DistTone,     // Hz: a low-pass after the curve
		DistMix,      // 0..1
		EqOn,         // 0 / 1
		EqFreq,       // Hz, 60..400: the bell's centre
		EqGain,       // dB, 0..12
		EqWidth,      // 0.3..3: the bell's bandwidth (1 / Q)
		EqSubCut,     // Hz, 20..80: the high-pass under the bell
		LimiterOn,    // 0 / 1
		LimiterDrive, // dB, 0..12 into it
		LimiterCeiling, // dB, -12..0
		LimiterRelease, // ms
		DuckTarget,   // 0 RUMBLE (the rumble only), 1 ALL (the rumble and the dry kick: the whole output)
		WetLevel,     // dB (-60 = silent): the rumble's level in OUTPUT (the visualizer's RUMBLE fader)
		DelayOn,      // 0 / 1
		DelayTime,    // beats, 0.125..2 (synced to the host's tempo)
		DelayFeedback,// 0..0.95
		DelayLowCut,  // Hz, 20..1000: a 12 dB high-pass in the feedback loop
		DelayHighCut, // Hz, 200..20000: a 12 dB low-pass in the feedback loop
		DelayMix,     // 0..1: dry / wet
		DelayPingPong,// 0 MONO, 1 PING-PONG
		DuckSplit,    // Hz, 40..2000: DUCK acts under it (the low end); 2000 = FULL, the whole band
		GateLength,   // ms, 10..1000: SEND GATE, only that much of each kick feeds the FX chain; 1000 = FULL
		ChainOrder,   // the FX chain (EQ in it since 2026-10-29): slot k's module in bits 3k..3k+2 (0 FILTER, 1 DIST, 2 DELAY, 3 REVERB, 4 EQ, 5 GRAIN); Order (19) is unused since
		DistCrush,    // 0..1: DIST's CRUSH (rate and bit reduction after the curve); 0 = off
		NoiseLevel,   // dB, -60..0 (-60 = OFF): NOISE, noise into the chain following the kick
		NoiseColor,   // 0 DARK, 1 MID, 2 AIR: NOISE's band
		GrainOn,      // 0 / 1 (2026-10-30)
		GrainMode,    // 0..4: CLOUD, DETUNE, OCT UP, OCT DOWN, REVERSE
		GrainSize,    // ms, 10..500: each grain's length
		GrainDensity, // grains per second, 2..100
		GrainSpray,   // ms, 0..1000: how far back in the recent input a grain may start (at random)
		GrainMix,     // 0..1: dry / wet
		EqType,       // 0 BELL, 1 LOW SHELF, 2 HIGH SHELF (2026-10-30; FREQ = the shelf's corner, WIDTH its slope)
		Bounce,       // 0 -> 1 writes the bounce (see the header)
		BounceBars,   // 1..8: how many bars it holds
		BounceStem,   // 0 RUMBLE, 1 KICK, 2 MIX
		DelaySwing,   // -1/3..1/3 of TIME: the odd repeats early / late (0 = straight; 2026-10-30)
		BassMono,     // Hz, 20..500: OUTPUT's lows under it in mono (<= 20 = OFF; 2026-10-31)
		numParameters
	};

	~bv_engine()
	{
		if (syncer != nullptr)
			syncer->deregisterItem(this);
	}

	// ---------------------------------------------------------------------------------

	void prepare(PrepareSpecs specs)
	{
		sr = specs.sampleRate;

		if (syncer == nullptr && specs.voiceIndex != nullptr)
		{
			syncer = specs.voiceIndex->getTempoSyncer();
			if (syncer != nullptr)
				syncer->registerItem(this);
		}

		// ~20 ms parameter smoothing
		smoothCoef = (float)(1.0 - std::exp(-1.0 / (0.02 * sr)));
		stealStep = (float)(1.0 / (0.003 * sr));
		filter.prepare(sr);
		rooms.prepare(sr, specs.blockSize);
		dark.prepare(sr);
		darkStale = false;
		rvbXfStep = (float)(1.0 / (0.05 * sr));
		// DELAY's lines: 2 beats (1/2) at 30 BPM, SWING's longer gap (x 4/3) included
		dlySize = (int)(5.5 * sr) + 4;
		for (auto& b : dlyBuf)
			b.assign((size_t)dlySize, 0.0f);
		dlyTimeCoef = (float)(1.0 - std::exp(-1.0 / (0.05 * sr)));
		{
			// the mono split of the PING-PONG repeats: a 12 dB Butterworth low-pass at 150 Hz
			const double K = std::tan(MathConstants<double>::pi * 150.0 / sr);
			const double d = 1.0 + MathConstants<double>::sqrt2 * K + K * K;
			dlyXo.set(K * K / d, 2.0 * K * K / d, K * K / d, 2.0 * (K * K - 1.0) / d, (1.0 - MathConstants<double>::sqrt2 * K + K * K) / d);
		}
		chunkCoef = (float)(1.0 - std::exp(-(double)Chunk / (0.02 * sr)));
		// GRAIN: 2.5 s (SPRAY 1 s + a 0.5 s grain read at 2x)
		grnSize = (int)(2.5 * sr) + 4;
		for (auto& b : grnBuf)
			b.assign((size_t)grnSize, 0.0f);
		for (int k = 0; k <= GrainWinSize; k++)
			grnWin[k] = (float)(0.5 - 0.5 * std::cos(MathConstants<double>::twoPi * k / GrainWinSize));
		dstXfStep = (float)(1.0 / (0.01 * sr));
		dstDcR = (float)(1.0 - MathConstants<double>::twoPi * 5.0 / sr);   // the DC blocker: 5 Hz
		noiseRel = (float)std::exp(-1.0 / (0.04 * sr));
		noiseColorCur = -1;                  // (the coefficients follow the sample rate)
		limHoldSamples = (int)(0.012 * sr);
		{
			// BOUNCE: 10 s of each stem (1 bar down to ~26 BPM)
			SpinLock::ScopedLockType sl(capLock);
			capLen = (int)(BounceSeconds * sr);
			for (auto& b : capBuf)
				b.assign((size_t)capLen, 0.0f);
			capTotal = 0;
			capMarks = 0;
			capLastBar = -1.0e10;
		}
		reset();
	}

	void reset()
	{
		driveSm = driveValue.load();
		gainSm = Decibels::decibelsToGain(levelValue.load());
		startWindow(true);
		for (auto& v : voices)
			v.on = false;
		lastCell = -1.0e10;
		filter.hardReset();
		fltEnv = 0.0f;
		for (auto& ro : rot)
			ro = Rotator();
		dryGainSm = dryGainTarget();
		volSm = Decibels::decibelsToGain(volumeValue.load());
		widthSm = widthValue.load() / 100.0f;
		phaseDirty = true;
		updatePhase();
		rotCSm = rotC;
		rotSSm = rotS;
		duckOn = false;
		duckGain = 1.0f;
		duckPending = -1;
		lastDuckCell = -1.0e10;
		duckMixSm = duckMix.load();
		duckSplitSm = duckSplit.load();
		duckFullSm = duckSplit.load() >= DuckFull ? 1.0f : 0.0f;
		gateAge = 1.0e9;
		gateFullSm = gateLength.load() >= GateFull ? 1.0f : 0.0f;
		noiseF[0].clear();
		noiseF[1].clear();
		noiseEnv = 0.0f;
		noiseGainSm = noiseLevel.load() <= -59.5f ? 0.0f : Decibels::decibelsToGain(noiseLevel.load());
		for (int k = 0; k < 4; k++)
		{
			dkR[k].clear();
			dkA[k].clear();
			dkSR[k].clear();
			dkSK[k].clear();
			bmA[k].clear();
			bmSR[k].clear();
			bmSK[k].clear();
		}
		bassMonoOnSm = bassMono.load() > BassMonoOff ? 1.0f : 0.0f;
		bassMonoSm = bassMono.load() > BassMonoOff ? bassMono.load() : 120.0f;
		duckTgtSm = duckTarget.load() ? 1.0f : 0.0f;
		rumOnSm = 1.0f;
		wetGainSm = wetGainTarget();
		// the reverbs keep their state: DuskVerb's reset() would drop its prepared engines
		rvbXf = reverbType.load() == DarkRoom ? 1.0f : 0.0f;
		rvbMixSm = reverbMix.load();
		// DELAY: empty lines, the settings as they are
		for (auto& b : dlyBuf)
			std::fill(b.begin(), b.end(), 0.0f);
		dlyWrite = 0;
		dlySamplesSm = -1.0;             // the time jumps to its target on the next block
		dlyHp.clear();
		dlyLp.clear();
		dlyHpB.clear();
		dlyLpB.clear();
		dlyXo.clear();
		dlySwingSm = delaySwing.load();
		dlyLowSm = delayLowCut.load();
		dlyHighSm = delayHighCut.load();
		dlyFbSm = delayFeedback.load();
		dlyMixSm = delayMix.load();
		dlyPpSm = delayPingPong.load() ? 1.0f : 0.0f;
		dlyOnSm = delayOn.load() ? 1.0f : 0.0f;
		// GRAIN: an empty buffer, no grains
		for (auto& b : grnBuf)
			std::fill(b.begin(), b.end(), 0.0f);
		grnWrite = 0;
		grnNext = 0.0;
		for (auto& g : grains)
			g.on = false;
		grnOnSm = grainOn.load() ? 1.0f : 0.0f;
		grnMixSm = grainMix.load();
		// DIST, EQ, LIMITER: empty states, the settings as they are
		dstCur = dstPrev = distMode.load();
		dstXf = 1.0f;
		dstDriveSm = distDrive.load();
		dstMixSm = distMix.load();
		dstToneSm = distTone.load();
		dstOnSm = distOn.load() ? 1.0f : 0.0f;
		dstCrushSm = distCrush.load();
		dstCrPhase = 0.0f;
		for (int c = 0; c < 2; c++)
			dstLp[c] = dstDcX[c] = dstDcY[c] = dstCrHeld[c] = 0.0f;
		eqBell.clear();
		eqSub.clear();
		eqFreqSm = eqFreq.load();
		eqGainSm = eqGain.load();
		eqWidthSm = eqWidth.load();
		eqSubSm = eqSubCut.load();
		eqOnSm = eqOn.load() ? 1.0f : 0.0f;
		limGain = 1.0f;
		limHoldLeft = 0;
		limOnSm = limOn.load() ? 1.0f : 0.0f;
		limDriveSm = Decibels::decibelsToGain(limDrive.load());
		limCeilSm = Decibels::decibelsToGain(limCeiling.load());
	}

	void handleHiseEvent(HiseEvent& e)
	{
	}

	void tempoChanged(double newTempo) override
	{
		if (newTempo > 0.0)
			bpm = newTempo;
	}

	void onTransportChange(bool isPlaying, double ppqPosition) override
	{
		playing = isPlaying;
		if (isPlaying)
			beatPos = ppqPosition;
	}

	// the host's position jumped (a loop, or audio resumed after HISE suspended it to load a preset:
	// the count stood still meanwhile; the script turns the master clock on for this): take the host's
	// position, and restart both grids as at a transport start, so the jump fires no kick mid-step
	void onResync(double ppqPosition) override
	{
		beatPos = ppqPosition;
		lastCell = -1.0e10;
		lastDuckCell = -1.0e10;
	}

	template <typename T> void process(T& data)
	{
		// the audio file (and the display buffer) can't change while this runs
		DataReadLock sl_(this);

		auto& fixData = data.template as<ProcessData<2>>();
		const int numSamples = fixData.getNumSamples();
		auto ch = fixData.getRawDataPointers();
		auto l = ch[0];
		auto r = ch[1];

		const double beatsPerSample = bpm / (60.0 * sr);
		const double win = (double)windowBeats.load();
		if (win != curWindow)
		{
			curWindow = win;
			startWindow(true);
		}

		const bool ext = sourceMode.load() == 0;
		const float driveTarget = driveValue.load();
		const float gainTarget = Decibels::decibelsToGain(levelValue.load());

		// the kick player's settings for this block
		const bool grid = triggerGrid.load();
		const double div = (double)divisionBeats.load();
		const double baseRate = kickSr / sr;
		const double tune = (double)tuneValue.load();
		const double decaySec = jmax(0.005, (double)decayValue.load() / 1000.0);
		const double pitchSt = (double)pitchValue.load();
		const double pitchDecSec = jmax(0.0005, (double)pitchDecayValue.load() / 1000.0);
		const double secPerSample = 1.0 / sr;
		const double gateSec = (double)gateLength.load() / 1000.0;
		const float gateFullTarget = gateLength.load() >= GateFull ? 1.0f : 0.0f;
		const float noiseGainT = noiseLevel.load() <= -59.5f ? 0.0f : Decibels::decibelsToGain(noiseLevel.load());
		noiseSetColor(noiseColor.load());

		// a MIDI note (the script bumped Hit): play at its offset in this block
		int hitAt = -1;
		float hitVel = 1.0f;
		const int hit = hitValue.load();
		if (hit != lastHit)
		{
			lastHit = hit;
			hitAt = jlimit(0, jmax(0, numSamples - 1), hitOffsetValue.load());
			hitVel = hitVelocityValue.load();
		}

		// the FX chain's order and the filter's settings for this block
		int order[NumFx];
		decodeChainOrder(chainOrderValue.load(), order);
		const bool fltOn = filterOn.load();
		const int ft = jlimit(0, NumFilterTypes - 1, filterType.load());
		if (ft < 6)
		{
			fltSettings.model = vital_filters::Analog;
			fltSettings.style = ft % 2;          // 12 dB, 24 dB
			fltSettings.blend = (float)(ft / 2); // 0 low pass, 1 band pass, 2 high pass
		}
		else
		{
			// LADDER, DIODE, DIRTY: low passes (24 dB; the diode's style 0 = no high pass), COMB:
			// style 0 = feedback comb, its loop filter low (blend 0) at its transpose (42 st up)
			static constexpr int models[4] = { vital_filters::Ladder, vital_filters::Diode, vital_filters::Dirty, vital_filters::Comb };
			static constexpr int styles[4] = { 1, 0, 1, 0 };
			fltSettings.model = models[ft - 6];
			fltSettings.style = styles[ft - 6];
			fltSettings.blend = 0.0f;
		}
		// COMB's feedback is bipolar (0.5 = none): RESO runs over the positive half (pitched)
		fltSettings.resonance = fltSettings.model == vital_filters::Comb ? 0.5f + 0.5f * filterReso.load() : filterReso.load();
		fltSettings.drive = 0.0f;
		fltSettings.mix = 1.0f;
		const float cutoffNote = hzToNote(filterCutoff.load());
		const float envSt = filterEnvAmount.load() * FilterEnvRange;
		const float envCoef = (float)std::exp(-(double)Chunk / (jmax(1.0, (double)filterEnvDecay.load()) * 0.001 * sr));

		// REVERB's settings for this block
		const bool rvbOn = reverbOn.load();
		const int rvbType = jlimit(0, NumRooms - 1, reverbType.load());
		const float rvbSize = reverbSize.load(), rvbDamp = reverbDamp.load(), rvbWidth = reverbWidth.load();
		const float rvbMixTarget = reverbMix.load();

		// DELAY's settings for this block (its time in samples at the host's tempo)
		const bool dlyOn = delayOn.load();
		const double dlyTarget = jlimit(1.0, (double)(dlySize - 4) * 0.75, (double)delayTime.load() * 60.0 / bpm * sr);
		if (dlySamplesSm < 0.0)
			dlySamplesSm = dlyTarget;

		// GRAIN's settings for this block
		const bool grnOnV = grainOn.load();

		// DIST's, EQ's and LIMITER's settings for this block
		const bool dstOn = distOn.load();
		const int dstMode = distMode.load();
		const float dstDriveT = distDrive.load(), dstToneT = distTone.load(), dstMixT = distMix.load();
		const float dstCrushT = distCrush.load();
		const bool eqOnV = eqOn.load();
		const int eqTypeV = eqType.load();
		const float eqFreqT = eqFreq.load(), eqGainT = eqGain.load(), eqWidthT = eqWidth.load(), eqSubT = eqSubCut.load();
		const bool limOnV = limOn.load();
		const float limDriveT = Decibels::decibelsToGain(limDrive.load());
		const float limCeilT = Decibels::decibelsToGain(limCeiling.load());
		limRelCoef = (float)(1.0 - std::exp(-1.0 / (jmax(1.0f, limRelease.load()) * 0.001 * sr)));

		// DUCK's settings for this block
		const bool duckGrid = duckTrigger.load();
		const double duckDiv = (double)duckDivision.load();
		const double duckOffSec = (double)duckOffset.load() / 1000.0;
		const int duckOffSamples = jmax(0, (int)(duckOffSec * sr));   // KICK: after the kick only
		const double duckOffBeats = duckOffSec * bpm / 60.0;            // GRID: either way
		const float duckMixTarget = duckMix.load();
		const float duckTgtTarget = duckTarget.load() ? 1.0f : 0.0f;
		const float duckFullTarget = duckSplit.load() >= DuckFull ? 1.0f : 0.0f;
		duckDepthV = duckDepth.load();
		duckLenSec = jmax(0.005, (double)duckLength.load() * 60.0 / bpm);

		// OUTPUT's settings for this block
		updatePhase();
		const float dryTarget = dryGainTarget();
		const float wetTarget = wetGainTarget();
		const float volTarget = Decibels::decibelsToGain(volumeValue.load());
		const float widthTarget = widthValue.load() / 100.0f;

		// in chunks of the filter's block size: SOURCE, then the chain, then the snapshot
		for (int c0 = 0; c0 < numSamples; c0 += Chunk)
		{
		const int cn = jmin(Chunk, numSamples - c0);
		float srcL[Chunk], srcR[Chunk];
		bool hitInChunk = false;
		int kickIdx = -1;                    // the chunk's first kick (for DUCK)
		const double chunkBeat = beatPos;

		for (int i = c0; i < c0 + cn; i++)
		{
			// SOURCE
			float sl = 0.0f, sr_ = 0.0f;
			driveSm += smoothCoef * (driveTarget - driveSm);
			gainSm += smoothCoef * (gainTarget - gainSm);
			// the grid: a kick on each Division of the host's beat while the transport plays (SAMPLE
			// with GRID; EXT always: its kicks aren't detected in the input, user: "use the grid")
			bool gridHit = false;
			if ((grid || ext) && playing)
			{
				const double cell = std::floor(beatPos / div);
				// a new cell; or the first sample after the start, if it lands on a division
				const bool first = lastCell < -1.0e9;
				gridHit = (!first && cell != lastCell) || (first && beatPos - cell * div < beatsPerSample);
				lastCell = cell;
			}
			else
				lastCell = -1.0e10;

			if (ext)
			{
				sl = shape(l[i], driveSm) * gainSm;
				sr_ = shape(r[i], driveSm) * gainSm;
				kickStarted = gridHit;   // the input plays itself: only the kick's time
			}
			else
			{
				// SAMPLE: the trigger (MIDI, or GRID)
				if (!grid && i == hitAt)
					startKick(hitVel);
				if (gridHit)
					startKick(1.0f);

				float kl = 0.0f, kr = 0.0f;
				for (auto& v : voices)
					renderVoice(v, kl, kr, baseRate, tune, pitchSt, pitchDecSec, decaySec, secPerSample);
				sl = shape(kl, driveSm) * gainSm;
				sr_ = shape(kr, driveSm) * gainSm;
			}

			// a kick: one the player started, or (EXT) a grid step
			if (kickStarted)
			{
				if (!hitInChunk)
					kickIdx = i - c0;
				hitInChunk = true;
			}

			// SEND GATE: the chain gets each kick's first GateLength ms (full for 60 %, then a cosine
			// fade, DECAY's shape); the dry kick (srcL / srcR) is untouched. FULL fades the gate out.
			if (kickStarted)
				gateAge = 0.0;
			kickStarted = false;
			gateFullSm += smoothCoef * (gateFullTarget - gateFullSm);
			float gate = 0.0f;
			if (gateAge < gateSec)
			{
				const double fadeStart = 0.6 * gateSec;
				gate = gateAge <= fadeStart ? 1.0f
				     : (float)(0.5 * (1.0 + std::cos(MathConstants<double>::pi * (gateAge - fadeStart) / (gateSec - fadeStart))));
			}
			gateAge += secPerSample;
			gate += gateFullSm * (1.0f - gate);

			// NOISE: band-limited noise at the kick's envelope, into the chain only
			float nl = 0.0f, nr = 0.0f;
			noiseGainSm += smoothCoef * (noiseGainT - noiseGainSm);
			if (noiseGainSm > 1.0e-5f)
			{
				const float pk = jmax(std::abs(sl), std::abs(sr_));
				noiseEnv = pk > noiseEnv ? pk : noiseEnv * noiseRel;
				const float e = noiseEnv * noiseGainSm * noiseTrim;
				nl = e * noiseF[1].process(noiseF[0].process(noiseWhite(0), 0), 0);
				nr = e * noiseF[1].process(noiseF[0].process(noiseWhite(1), 1), 1);
			}

			srcL[i - c0] = sl;
			srcR[i - c0] = sr_;
			l[i] = (sl + nl) * gate;
			r[i] = (sr_ + nr) * gate;
			beatPos += beatsPerSample;
		}

		// THE FX CHAIN, in its order
		for (int s = 0; s < NumFx; s++)
		{
			if (order[s] == FxFilter && fltOn)
			{
				// the envelope restarts on each kick and sweeps the cutoff by ENV (up to 7 octaves)
				if (hitInChunk)
					fltEnv = 1.0f;
				const float from = cutoffNote + envSt * fltEnv;
				fltEnv *= envCoef;
				const float to = cutoffNote + envSt * fltEnv;
				filter.process(l + c0, r + c0, cn, fltSettings, clampNote(from), clampNote(to), 0.0f, 0.0f);
			}
			if (order[s] == FxReverb && rvbOn)
				processReverb(l + c0, r + c0, cn, rvbType, rvbSize, rvbDamp, rvbWidth, rvbMixTarget);
			if (order[s] == FxDelay)
				processDelay(l + c0, r + c0, cn, dlyOn, dlyTarget);
			if (order[s] == FxDist)
				processDist(l + c0, r + c0, cn, dstOn, dstMode, dstDriveT, dstToneT, dstMixT, dstCrushT);
			if (order[s] == FxEq)
				processEq(l + c0, r + c0, cn, eqOnV, eqTypeV, eqFreqT, eqGainT, eqWidthT, eqSubT);
			if (order[s] == FxGrain)
				processGrain(l + c0, r + c0, cn, grnOnV);
		}
		if (!fltOn)
			fltEnv = 0.0f;

		// no chain module on: no rumble, only the dry kick (so "everything off" sounds like a
		// bypass; a chain that is all off would pass its input: the kick twice), faded (EQ alone makes
		// no rumble either: it only shapes one)
		const float rumOnTarget = (fltOn || dstOn || dlyOn || rvbOn || grnOnV) ? 1.0f : 0.0f;
		for (int i = c0; i < c0 + cn; i++)
		{
			rumOnSm += smoothCoef * (rumOnTarget - rumOnSm);
			l[i] *= rumOnSm;
			r[i] *= rumOnSm;
		}

		// DUCK: the curve restarts on each trigger; refAt = the trigger's beat (for the visualizer).
		// TARGET RUMBLE ducks the rumble here; ALL ducks the whole output in OUTPUT (after
		// the dry kick is added back); a switch crossfades (duckTgt: 0 RUMBLE .. 1 ALL). It ducks
		// the low end, under SPLIT (duckBand: a Linkwitz-Riley crossover, the lows ducked, the highs
		// as they are), or at FULL the whole band (duckFull, a switch crossfades)
		duckSplitSm += chunkCoef * (duckSplit.load() - duckSplitSm);
		{
			// 24 dB Linkwitz-Riley: two 12 dB Butterworth low-passes, two high-passes
			const double K = std::tan(MathConstants<double>::pi * jmin((double)duckSplitSm, 0.45 * sr) / sr);
			const double d = 1.0 + MathConstants<double>::sqrt2 * K + K * K;
			const double lb = K * K / d, a1 = 2.0 * (K * K - 1.0) / d, a2 = (1.0 - MathConstants<double>::sqrt2 * K + K * K) / d;
			for (int k = 0; k < 2; k++)
			{
				dkR[k].set(lb, 2.0 * lb, lb, a1, a2);
				dkA[k].set(lb, 2.0 * lb, lb, a1, a2);
				dkR[k + 2].set(1.0 / d, -2.0 / d, 1.0 / d, a1, a2);
				dkA[k + 2].set(1.0 / d, -2.0 / d, 1.0 / d, a1, a2);
				for (auto* s : { dkSR, dkSK })
				{
					s[k].set(lb, 2.0 * lb, lb, a1, a2);
					s[k + 2].set(1.0 / d, -2.0 / d, 1.0 / d, a1, a2);
				}
			}
		}
		double refAt[Chunk];
		float duckG[Chunk], duckTgt[Chunk], duckFull[Chunk];   // per sample: the gain, TARGET, FULL
		for (int j = 0; j < cn; j++)
		{
			const double bp = chunkBeat + j * beatsPerSample;
			refAt[j] = -1.0e10;
			bool start = false;
			if (duckGrid)
			{
				duckPending = -1;
				if (playing)
				{
					// the grid shifted by OFFSET: a new cell starts the curve
					const double sb = bp - duckOffBeats;
					const double cell = std::floor(sb / duckDiv);
					const bool first = lastDuckCell < -1.0e9;
					if ((!first && cell != lastDuckCell) || (first && sb - cell * duckDiv < beatsPerSample))
					{
						start = true;
						refAt[j] = cell * duckDiv;
					}
					lastDuckCell = cell;
				}
				else
					lastDuckCell = -1.0e10;
			}
			else
			{
				lastDuckCell = -1.0e10;
				if (j == kickIdx)
				{
					refAt[j] = bp;
					if (duckOffSamples == 0)
						start = true;
					else
						duckPending = duckOffSamples;
				}
				else if (duckPending > 0 && --duckPending == 0)
				{
					duckPending = -1;
					start = true;
				}
			}
			if (start)
			{
				duckOn = true;
				duckAge = 0.0;
				duckFrom = duckGain;
			}
			duckGain = duckCurve();
			duckAge += 1.0 / sr;
			duckMixSm += smoothCoef * (duckMixTarget - duckMixSm);
			duckTgtSm += smoothCoef * (duckTgtTarget - duckTgtSm);
			const float g = 1.0f - duckMixSm * (1.0f - duckGain);
			duckTgt[j] = duckTgtSm;
			duckFullSm += smoothCoef * (duckFullTarget - duckFullSm);
			duckFull[j] = duckFullSm;
			duckG[j] = g;
			// TARGET RUMBLE: the rumble's low end ducked (or at FULL all of it); ALL: untouched here
			const float xl = l[c0 + j], xr = r[c0 + j];
			const float rt = 1.0f - duckTgtSm;
			l[c0 + j] = xl + rt * (duckBand(dkR, xl, 0, g, duckFullSm) - xl);
			r[c0 + j] = xr + rt * (duckBand(dkR, xr, 1, g, duckFullSm) - xr);
		}

		// BASS MONO's crossover (OFF keeps the last frequency, so the fade out sounds like it)
		const float bmV = bassMono.load();
		const float bmOnTarget = bmV > BassMonoOff ? 1.0f : 0.0f;
		if (bmV > BassMonoOff)
			bassMonoSm += chunkCoef * (bmV - bassMonoSm);
		{
			const double K = std::tan(MathConstants<double>::pi * jmin((double)bassMonoSm, 0.45 * sr) / sr);
			const double d = 1.0 + MathConstants<double>::sqrt2 * K + K * K;
			const double lb = K * K / d, a1 = 2.0 * (K * K - 1.0) / d, a2 = (1.0 - MathConstants<double>::sqrt2 * K + K * K) / d;
			for (auto* s : { bmA, bmSR, bmSK })
			{
				for (int k = 0; k < 2; k++)
				{
					s[k].set(lb, 2.0 * lb, lb, a1, a2);
					s[k + 2].set(1.0 / d, -2.0 / d, 1.0 / d, a1, a2);
				}
			}
		}

		// OUTPUT: the rumble through PHASE / POL and WIDTH, the dry kick added back, BASS MONO, VOLUME
		float rumble[Chunk];
		float stem[2][2][Chunk];             // BOUNCE: [RUMBLE, KICK][channel]
		for (int i = c0; i < c0 + cn; i++)
		{
			rotCSm += smoothCoef * (rotC - rotCSm);
			rotSSm += smoothCoef * (rotS - rotSSm);
			widthSm += smoothCoef * (widthTarget - widthSm);
			dryGainSm += smoothCoef * (dryTarget - dryGainSm);
			wetGainSm += smoothCoef * (wetTarget - wetGainSm);
			volSm += smoothCoef * (volTarget - volSm);
			const float wl = wetGainSm * rot[0].process(l[i], rotCSm, rotSSm);
			const float wr = wetGainSm * rot[1].process(r[i], rotCSm, rotSSm);
			const float mid = 0.5f * (wl + wr);
			const float side = 0.5f * (wl - wr) * widthSm;
			// TARGET ALL: the whole output's low end ducked (or at FULL all of it)
			const float tg = duckTgt[i - c0];
			const float gg = duckG[i - c0], gf = duckFull[i - c0];
			const float kl = dryGainSm * srcL[i - c0], kr = dryGainSm * srcR[i - c0];
			const float pl = mid + side + kl;
			const float pr = mid - side + kr;
			float dl = pl + tg * (duckBand(dkA, pl, 0, gg, gf) - pl);
			float dr = pr + tg * (duckBand(dkA, pr, 1, gg, gf) - pr);
			// (the snapshot's output: what DUCK acts on, ducked: the rumble, or in ALL with the dry kick)
			rumble[i - c0] = (1.0f - tg) * mid + tg * 0.5f * (dl + dr);
			// BASS MONO: the whole output's lows (the rumble and the dry kick) in mono
			bassMonoOnSm += smoothCoef * (bmOnTarget - bassMonoOnSm);
			bassMonoPair(bmA, dl, dr, bassMonoOnSm);
			l[i] = volSm * dl;
			r[i] = volSm * dr;
			// BOUNCE's stems, the same way (ALL: each through its own crossover; BASS MONO too)
			const float rl = mid + side, rr = mid - side;
			float sl = rl + tg * (duckBand(dkSR, rl, 0, gg, gf) - rl);
			float sr2 = rr + tg * (duckBand(dkSR, rr, 1, gg, gf) - rr);
			float ql = kl + tg * (duckBand(dkSK, kl, 0, gg, gf) - kl);
			float qr = kr + tg * (duckBand(dkSK, kr, 1, gg, gf) - kr);
			bassMonoPair(bmSR, sl, sr2, bassMonoOnSm);
			bassMonoPair(bmSK, ql, qr, bassMonoOnSm);
			stem[0][0][i - c0] = volSm * sl;
			stem[0][1][i - c0] = volSm * sr2;
			stem[1][0][i - c0] = volSm * ql;
			stem[1][1][i - c0] = volSm * qr;
		}

		// LIMITER: the last stage (it also catches the dry kick)
		processLimiter(l + c0, r + c0, cn, limOnV, limDriveT, limCeilT);

		// the snapshot: which bin of the window each sample falls in
		for (int i = c0; i < c0 + cn; i++)
		{
			const double bp = chunkBeat + (i - c0) * beatsPerSample;
			const double wpos = bp - std::floor(bp / curWindow) * curWindow;
			const int bin = jlimit(0, Bins - 1, (int)(wpos / curWindow * Bins));
			if (bin < lastBin)
				endWindow();
			if (bin != lastBin)
			{
				// a new bin (or bins skipped after a jump): start it from this sample
				for (int b = jmax(0, lastBin + 1); b <= bin; b++)
					clearBin(b);
				lastBin = bin;
			}
			const float sl = srcL[i - c0], sr_ = srcR[i - c0];
			addToBin(snap[0], bin, 0.5f * (sl + sr_));
			if (refAt[i - c0] > -1.0e9 && refCount < 2 * RefSlots)
				refs[refCount++] = (float)((wpos + refAt[i - c0] - bp) / curWindow);
			const float ro = rumble[i - c0];
			addToBin(snap[1], bin, ro);
			peak = jmax(peak, jmax(std::abs(sl), std::abs(sr_)), std::abs(ro));
			const int j = i - c0;
			const float cs[NumStems * 2] = { stem[0][0][j], stem[0][1][j], stem[1][0][j], stem[1][1][j], l[i], r[i] };
			captureSample(cs, bp);
		}
		}
	}

	template <typename T> void processFrame(T& data)
	{
	}

	int handleModulation(double& value)
	{
		return 0;
	}

	void setExternalData(const ExternalData& data, int index)
	{
		base::setExternalData(data, index);
		if (data.dataType == ExternalData::DataType::DisplayBuffer)
			rb = dynamic_cast<SimpleRingBuffer*>(data.obj);
		if (data.dataType == ExternalData::DataType::SliderPack)
		{
			if (data.numSamples > 0)
			{
				data.referBlockTo(duckTable, 0);
				duckTableLen = data.numSamples;
			}
			else
			{
				duckTable.referToNothing();
				duckTableLen = 0;
			}
		}
		if (data.dataType == ExternalData::DataType::AudioFile)
		{
			// the kick: mono files play in both channels
			for (auto& v : voices)
				v.on = false;
			if (data.numSamples > 0 && data.numChannels > 0)
			{
				data.referBlockTo(kick[0], 0);
				data.referBlockTo(kick[1], data.numChannels > 1 ? 1 : 0);
				kickLen = data.numSamples;
				kickSr = data.sampleRate > 0.0 ? data.sampleRate : 44100.0;
			}
			else
			{
				kick[0].referToNothing();
				kick[1].referToNothing();
				kickLen = 0;
			}
		}
	}

	// ---------------------------------------------------------------------------------

	template <int P> void setParameter(double v)
	{
		if constexpr (P == Source) sourceMode.store(v > 0.5 ? 1 : 0);
		if constexpr (P == Drive)  driveValue.store((float)jlimit(0.0, 1.0, v));
		if constexpr (P == Level)  levelValue.store((float)jlimit(-60.0, 24.0, v));
		if constexpr (P == Window) windowBeats.store((float)jlimit(1.0, 8.0, v));
		if constexpr (P == Trigger) triggerGrid.store(v > 0.5);
		if constexpr (P == Division) divisionBeats.store((float)jlimit(0.125, 16.0, v));
		if constexpr (P == Tune) tuneValue.store((float)jlimit(-48.0, 48.0, v));
		if constexpr (P == Decay) decayValue.store((float)jlimit(5.0, 5000.0, v));
		if constexpr (P == Pitch) pitchValue.store((float)jlimit(0.0, 48.0, v));
		if constexpr (P == PitchDecay) pitchDecayValue.store((float)jlimit(0.5, 2000.0, v));
		if constexpr (P == Hit) hitValue.store(roundToInt(v));
		if constexpr (P == HitOffset) hitOffsetValue.store(roundToInt(v));
		if constexpr (P == HitVelocity) hitVelocityValue.store((float)jlimit(0.0, 1.0, v));
		if constexpr (P == FilterOn) filterOn.store(v > 0.5);
		if constexpr (P == FilterType) filterType.store(jlimit(0, NumFilterTypes - 1, roundToInt(v)));
		if constexpr (P == Cutoff) filterCutoff.store((float)jlimit(20.0, 20000.0, v));
		if constexpr (P == Resonance) filterReso.store((float)jlimit(0.0, 1.0, v));
		if constexpr (P == FilterEnv) filterEnvAmount.store((float)jlimit(-1.0, 1.0, v));
		if constexpr (P == FilterEnvDecay) filterEnvDecay.store((float)jlimit(1.0, 5000.0, v));
		if constexpr (P == Order) orderValue.store(jlimit(0, 255, roundToInt(v)));
		if constexpr (P == DryOn) dryOn.store(v > 0.5);
		if constexpr (P == DryLevel) dryLevel.store((float)jlimit(-60.0, 12.0, v));
		if constexpr (P == Phase) phaseValue.store((float)jlimit(0.0, 360.0, v));
		if constexpr (P == Polarity) polarity.store(v > 0.5);
		if constexpr (P == Width) widthValue.store((float)jlimit(0.0, 200.0, v));
		if constexpr (P == Volume) volumeValue.store((float)jlimit(-60.0, 12.0, v));
		if constexpr (P == DuckTrigger) duckTrigger.store(v > 0.5);
		if constexpr (P == DuckDivision) duckDivision.store((float)jlimit(0.125, 16.0, v));
		if constexpr (P == DuckDepth) duckDepth.store((float)jlimit(0.0, 1.0, v));
		if constexpr (P == DuckMix) duckMix.store((float)jlimit(0.0, 1.0, v));
		if constexpr (P == DuckFall) duckFall.store((float)jlimit(0.1, 200.0, v));
		if constexpr (P == DuckHold) duckHold.store((float)jlimit(0.0, 1000.0, v));
		if constexpr (P == DuckRelease) duckRelease.store((float)jlimit(1.0, 3000.0, v));
		if constexpr (P == DuckShape) duckShape.store((float)jlimit(-1.0, 1.0, v));
		if constexpr (P == DuckOffset) duckOffset.store((float)jlimit(-50.0, 50.0, v));
		if constexpr (P == ReverbOn) reverbOn.store(v > 0.5);
		if constexpr (P == ReverbType) reverbType.store(jlimit(0, NumRooms - 1, roundToInt(v)));
		if constexpr (P == ReverbSize) reverbSize.store((float)jlimit(0.0, 1.0, v));
		if constexpr (P == ReverbDamp) reverbDamp.store((float)jlimit(0.0, 1.0, v));
		if constexpr (P == ReverbWidth) reverbWidth.store((float)jlimit(0.0, 1.0, v));
		if constexpr (P == ReverbMix) reverbMix.store((float)jlimit(0.0, 1.0, v));
		if constexpr (P == DuckLength) duckLength.store((float)jlimit(0.03, 16.0, v));
		if constexpr (P == CloneOn) cloneOn.store(v > 0.5);
		if constexpr (P == CloneBar2) cloneLevel[0].store((float)jlimit(0.0, 0.6, v));
		if constexpr (P == CloneBar3) cloneLevel[1].store((float)jlimit(0.0, 0.6, v));
		if constexpr (P == CloneBar4) cloneLevel[2].store((float)jlimit(0.0, 0.6, v));
		if constexpr (P == CloneDecay) cloneDecay.store((float)jlimit(10.0, 4000.0, v));
		if constexpr (P == DistOn) distOn.store(v > 0.5);
		if constexpr (P == DistMode) distMode.store(jlimit(0, NumDistModes - 1, roundToInt(v)));
		if constexpr (P == DistDrive) distDrive.store((float)jlimit(0.0, 1.0, v));
		if constexpr (P == DistTone) distTone.store((float)jlimit(20.0, 20000.0, v));
		if constexpr (P == DistMix) distMix.store((float)jlimit(0.0, 1.0, v));
		if constexpr (P == EqOn) eqOn.store(v > 0.5);
		if constexpr (P == EqFreq) eqFreq.store((float)jlimit(20.0, 2000.0, v));
		if constexpr (P == EqGain) eqGain.store((float)jlimit(-24.0, 24.0, v));
		if constexpr (P == EqWidth) eqWidth.store((float)jlimit(0.1, 4.0, v));
		if constexpr (P == EqSubCut) eqSubCut.store((float)jlimit(10.0, 200.0, v));
		if constexpr (P == LimiterOn) limOn.store(v > 0.5);
		if constexpr (P == LimiterDrive) limDrive.store((float)jlimit(0.0, 24.0, v));
		if constexpr (P == LimiterCeiling) limCeiling.store((float)jlimit(-24.0, 0.0, v));
		if constexpr (P == LimiterRelease) limRelease.store((float)jlimit(1.0, 2000.0, v));
		if constexpr (P == DuckTarget) duckTarget.store(v > 0.5);
		if constexpr (P == WetLevel) wetLevel.store((float)jlimit(-60.0, 12.0, v));
		if constexpr (P == DelayOn) delayOn.store(v > 0.5);
		if constexpr (P == DelayTime) delayTime.store((float)jlimit(0.03, 2.0, v));
		if constexpr (P == DelayFeedback) delayFeedback.store((float)jlimit(0.0, 0.95, v));
		if constexpr (P == DelayLowCut) delayLowCut.store((float)jlimit(20.0, 1000.0, v));
		if constexpr (P == DelayHighCut) delayHighCut.store((float)jlimit(200.0, 20000.0, v));
		if constexpr (P == DelayMix) delayMix.store((float)jlimit(0.0, 1.0, v));
		if constexpr (P == DelayPingPong) delayPingPong.store(v > 0.5);
		if constexpr (P == DuckSplit) duckSplit.store((float)jlimit(40.0, 2000.0, v));
		if constexpr (P == GateLength) gateLength.store((float)jlimit(10.0, 1000.0, v));
		if constexpr (P == ChainOrder) chainOrderValue.store(jlimit(0, 262143, roundToInt(v)));
		if constexpr (P == DistCrush) distCrush.store((float)jlimit(0.0, 1.0, v));
		if constexpr (P == NoiseLevel) noiseLevel.store((float)jlimit(-60.0, 0.0, v));
		if constexpr (P == NoiseColor) noiseColor.store(jlimit(0, 2, roundToInt(v)));
		if constexpr (P == GrainOn) grainOn.store(v > 0.5);
		if constexpr (P == GrainMode) grainMode.store(jlimit(0, NumGrainModes - 1, roundToInt(v)));
		if constexpr (P == GrainSize) grainSize.store((float)jlimit(10.0, 500.0, v));
		if constexpr (P == GrainDensity) grainDensity.store((float)jlimit(2.0, 100.0, v));
		if constexpr (P == GrainSpray) grainSpray.store((float)jlimit(0.0, 1000.0, v));
		if constexpr (P == GrainMix) grainMix.store((float)jlimit(0.0, 1.0, v));
		if constexpr (P == EqType) eqType.store(jlimit(0, 2, roundToInt(v)));
		if constexpr (P == BounceBars) bounceBars = jlimit(1, MaxBounceBars, roundToInt(v));
		if constexpr (P == BounceStem) bounceStem = jlimit(0, NumStems - 1, roundToInt(v));
		if constexpr (P == DelaySwing) delaySwing.store((float)jlimit(-0.34, 0.34, v));
		if constexpr (P == BassMono) bassMono.store((float)jlimit(20.0, 500.0, v));
		if constexpr (P == Bounce)
		{
			const bool on = v > 0.5;
			if (on && !bounceArmed)
				writeBounce();
			bounceArmed = on;
		}
	}

	void createParameters(ParameterDataList& data)
	{
		{
			parameter::data p("Source", { 0.0, 1.0, 1.0 });
			registerCallback<Source>(p);
			p.setDefaultValue(0.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("Drive", { 0.0, 1.0 });
			registerCallback<Drive>(p);
			p.setDefaultValue(0.2);
			data.add(std::move(p));
		}
		{
			parameter::data p("Level", { -24.0, 12.0 });
			registerCallback<Level>(p);
			p.setDefaultValue(0.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("Window", { 1.0, 8.0, 1.0 });
			registerCallback<Window>(p);
			p.setDefaultValue(4.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("Trigger", { 0.0, 1.0, 1.0 });
			registerCallback<Trigger>(p);
			p.setDefaultValue(0.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("Division", { 0.125, 16.0 });
			registerCallback<Division>(p);
			p.setDefaultValue(1.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("Tune", { -24.0, 24.0 });
			registerCallback<Tune>(p);
			p.setDefaultValue(0.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("Decay", { 20.0, 2000.0 });
			registerCallback<Decay>(p);
			p.setDefaultValue(2000.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("Pitch", { 0.0, 48.0 });
			registerCallback<Pitch>(p);
			p.setDefaultValue(0.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("PitchDecay", { 1.0, 1000.0 });
			registerCallback<PitchDecay>(p);
			p.setDefaultValue(60.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("Hit", { 0.0, 1000000.0, 1.0 });
			registerCallback<Hit>(p);
			p.setDefaultValue(0.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("HitOffset", { 0.0, 8192.0, 1.0 });
			registerCallback<HitOffset>(p);
			p.setDefaultValue(0.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("HitVelocity", { 0.0, 1.0 });
			registerCallback<HitVelocity>(p);
			p.setDefaultValue(1.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("FilterOn", { 0.0, 1.0, 1.0 });
			registerCallback<FilterOn>(p);
			p.setDefaultValue(1.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("FilterType", { 0.0, (double)(NumFilterTypes - 1), 1.0 });
			registerCallback<FilterType>(p);
			p.setDefaultValue(1.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("Cutoff", { 20.0, 20000.0 });
			registerCallback<Cutoff>(p);
			p.setDefaultValue(400.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("Resonance", { 0.0, 1.0 });
			registerCallback<Resonance>(p);
			p.setDefaultValue(0.3);
			data.add(std::move(p));
		}
		{
			parameter::data p("FilterEnv", { -1.0, 1.0 });
			registerCallback<FilterEnv>(p);
			p.setDefaultValue(0.4);
			data.add(std::move(p));
		}
		{
			parameter::data p("FilterEnvDecay", { 1.0, 2000.0 });
			registerCallback<FilterEnvDecay>(p);
			p.setDefaultValue(150.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("Order", { 0.0, 255.0, 1.0 });
			registerCallback<Order>(p);
			p.setDefaultValue((double)DefaultOrder);
			data.add(std::move(p));
		}
		{
			parameter::data p("DryOn", { 0.0, 1.0, 1.0 });
			registerCallback<DryOn>(p);
			p.setDefaultValue(1.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("DryLevel", { -60.0, 6.0 });
			registerCallback<DryLevel>(p);
			p.setDefaultValue(0.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("Phase", { 0.0, 360.0 });
			registerCallback<Phase>(p);
			p.setDefaultValue(0.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("Polarity", { 0.0, 1.0, 1.0 });
			registerCallback<Polarity>(p);
			p.setDefaultValue(0.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("Width", { 0.0, 200.0 });
			registerCallback<Width>(p);
			p.setDefaultValue(100.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("Volume", { -60.0, 6.0 });
			registerCallback<Volume>(p);
			p.setDefaultValue(0.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("DuckTrigger", { 0.0, 1.0, 1.0 });
			registerCallback<DuckTrigger>(p);
			p.setDefaultValue(0.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("DuckDivision", { 0.125, 16.0 });
			registerCallback<DuckDivision>(p);
			p.setDefaultValue(1.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("DuckDepth", { 0.0, 1.0 });
			registerCallback<DuckDepth>(p);
			p.setDefaultValue(0.85);
			data.add(std::move(p));
		}
		{
			parameter::data p("DuckMix", { 0.0, 1.0 });
			registerCallback<DuckMix>(p);
			p.setDefaultValue(1.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("DuckFall", { 0.1, 200.0 });
			registerCallback<DuckFall>(p);
			p.setDefaultValue(4.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("DuckHold", { 0.0, 1000.0 });
			registerCallback<DuckHold>(p);
			p.setDefaultValue(30.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("DuckRelease", { 1.0, 3000.0 });
			registerCallback<DuckRelease>(p);
			p.setDefaultValue(180.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("DuckShape", { -1.0, 1.0 });
			registerCallback<DuckShape>(p);
			p.setDefaultValue(0.4);
			data.add(std::move(p));
		}
		{
			parameter::data p("DuckOffset", { -50.0, 50.0 });
			registerCallback<DuckOffset>(p);
			p.setDefaultValue(0.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("ReverbOn", { 0.0, 1.0, 1.0 });
			registerCallback<ReverbOn>(p);
			p.setDefaultValue(1.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("ReverbType", { 0.0, (double)(NumRooms - 1), 1.0 });
			registerCallback<ReverbType>(p);
			p.setDefaultValue(0.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("ReverbSize", { 0.0, 1.0 });
			registerCallback<ReverbSize>(p);
			p.setDefaultValue(0.7);
			data.add(std::move(p));
		}
		{
			parameter::data p("ReverbDamp", { 0.0, 1.0 });
			registerCallback<ReverbDamp>(p);
			p.setDefaultValue(0.6);
			data.add(std::move(p));
		}
		{
			parameter::data p("ReverbWidth", { 0.0, 1.0 });
			registerCallback<ReverbWidth>(p);
			p.setDefaultValue(0.4);
			data.add(std::move(p));
		}
		{
			parameter::data p("ReverbMix", { 0.0, 1.0 });
			registerCallback<ReverbMix>(p);
			p.setDefaultValue(1.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("DuckLength", { 0.03, 16.0 });
			registerCallback<DuckLength>(p);
			p.setDefaultValue(1.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("CloneOn", { 0.0, 1.0, 1.0 });
			registerCallback<CloneOn>(p);
			p.setDefaultValue(1.0);
			data.add(std::move(p));
		}
		{
			parameter::data p("CloneBar2", { 0.0, 0.6 });
			registerCallback<CloneBar2>(p);
			p.setDefaultValue(0.6);
			data.add(std::move(p));
		}
		{
			parameter::data p("CloneBar3", { 0.0, 0.6 });
			registerCallback<CloneBar3>(p);
			p.setDefaultValue(0.4);
			data.add(std::move(p));
		}
		{
			parameter::data p("CloneBar4", { 0.0, 0.6 });
			registerCallback<CloneBar4>(p);
			p.setDefaultValue(0.2);
			data.add(std::move(p));
		}
		{
			parameter::data p("CloneDecay", { 10.0, 4000.0 });
			registerCallback<CloneDecay>(p);
			p.setDefaultValue(120.0);
			data.add(std::move(p));
		}
		addParam<DistOn>(data, "DistOn", 0.0, 1.0, 1.0, 1.0);
		addParam<DistMode>(data, "DistMode", 0.0, 3.0, 0.0, 1.0);
		addParam<DistDrive>(data, "DistDrive", 0.0, 1.0, 0.4);
		addParam<DistTone>(data, "DistTone", 20.0, 20000.0, 4000.0);
		addParam<DistMix>(data, "DistMix", 0.0, 1.0, 1.0);
		addParam<EqOn>(data, "EqOn", 0.0, 1.0, 1.0, 1.0);
		addParam<EqFreq>(data, "EqFreq", 20.0, 2000.0, 140.0);
		addParam<EqGain>(data, "EqGain", -24.0, 24.0, 4.0);
		addParam<EqWidth>(data, "EqWidth", 0.1, 4.0, 1.0);
		addParam<EqSubCut>(data, "EqSubCut", 10.0, 200.0, 35.0);
		addParam<LimiterOn>(data, "LimiterOn", 0.0, 1.0, 1.0, 1.0);
		addParam<LimiterDrive>(data, "LimiterDrive", 0.0, 24.0, 0.0);
		addParam<LimiterCeiling>(data, "LimiterCeiling", -24.0, 0.0, -0.3);
		addParam<LimiterRelease>(data, "LimiterRelease", 1.0, 2000.0, 60.0);
		addParam<DuckTarget>(data, "DuckTarget", 0.0, 1.0, 0.0, 1.0);
		addParam<WetLevel>(data, "WetLevel", -60.0, 6.0, 0.0);
		addParam<DelayOn>(data, "DelayOn", 0.0, 1.0, 1.0, 1.0);
		addParam<DelayTime>(data, "DelayTime", 0.03, 2.0, 0.25);
		addParam<DelayFeedback>(data, "DelayFeedback", 0.0, 0.95, 0.45);
		addParam<DelayLowCut>(data, "DelayLowCut", 20.0, 1000.0, 40.0);
		addParam<DelayHighCut>(data, "DelayHighCut", 200.0, 20000.0, 2500.0);
		addParam<DelayMix>(data, "DelayMix", 0.0, 1.0, 0.5);
		addParam<DelayPingPong>(data, "DelayPingPong", 0.0, 1.0, 0.0, 1.0);
		addParam<DuckSplit>(data, "DuckSplit", 40.0, 2000.0, 2000.0);
		addParam<GateLength>(data, "GateLength", 10.0, 1000.0, 1000.0);
		addParam<ChainOrder>(data, "ChainOrder", 0.0, 262143.0, (double)DefaultChainOrder, 1.0);
		addParam<DistCrush>(data, "DistCrush", 0.0, 1.0, 0.0);
		addParam<NoiseLevel>(data, "NoiseLevel", -60.0, 0.0, -60.0);
		addParam<NoiseColor>(data, "NoiseColor", 0.0, 2.0, 1.0, 1.0);
		addParam<GrainOn>(data, "GrainOn", 0.0, 1.0, 0.0, 1.0);
		addParam<GrainMode>(data, "GrainMode", 0.0, (double)(NumGrainModes - 1), 0.0, 1.0);
		addParam<GrainSize>(data, "GrainSize", 10.0, 500.0, 80.0);
		addParam<GrainDensity>(data, "GrainDensity", 2.0, 100.0, 25.0);
		addParam<GrainSpray>(data, "GrainSpray", 0.0, 1000.0, 200.0);
		addParam<GrainMix>(data, "GrainMix", 0.0, 1.0, 0.5);
		addParam<EqType>(data, "EqType", 0.0, 2.0, 0.0, 1.0);
		addParam<Bounce>(data, "Bounce", 0.0, 1.0, 0.0, 1.0);
		addParam<BounceBars>(data, "BounceBars", 1.0, (double)MaxBounceBars, 2.0, 1.0);
		addParam<BounceStem>(data, "BounceStem", 0.0, (double)(NumStems - 1), 0.0, 1.0);
		addParam<DelaySwing>(data, "DelaySwing", -0.34, 0.34, 0.0);
		addParam<BassMono>(data, "BassMono", 20.0, 500.0, 20.0);
	}

	// one parameter: its range (step 0 = continuous) and default
	template <int P> void addParam(ParameterDataList& data, const char* name, double lo, double hi,
	                               double def, double step = 0.0)
	{
		parameter::data p(name, { lo, hi, step });
		registerCallback<P>(p);
		p.setDefaultValue(def);
		data.add(std::move(p));
	}

private:

	static float hzToNote(float hz) { return 69.0f + 12.0f * std::log2(jmax(1.0f, hz) / 440.0f); }

	// the filters' cutoff range (MIDI notes: 8 Hz .. ~19 kHz)
	static float clampNote(float n) { return jlimit(0.0f, 134.0f, n); }

	// ChainOrder -> order[slot] = module: a permutation of the six; else (a value from before GRAIN,
	// 2026-10-30) a permutation of the first five, GRAIN last; else the default
	static bool decodeSlots(int v, int n, int* order)
	{
		int seen = 0;
		for (int k = 0; k < n; k++)
		{
			order[k] = (v >> (3 * k)) & 7;
			if (order[k] < n)
				seen |= 1 << order[k];
		}
		return seen == (1 << n) - 1 && (v >> (3 * n)) == 0;
	}
	static void decodeChainOrder(int v, int* order)
	{
		if (decodeSlots(v, NumFx, order))
			return;
		if (decodeSlots(v, NumFx - 1, order))
		{
			order[NumFx - 1] = FxGrain;
			return;
		}
		for (int k = 0; k < NumFx; k++)
			order[k] = k;
	}

	// one playing kick: its read position (file samples), its age, gain, and a 3 ms fade-out
	// once a newer kick took over
	struct Voice
	{
		bool on = false;
		double pos = 0.0;
		double age = 0.0;
		float gain = 1.0f;
		float steal = 1.0f;   // 1 = playing; falls to 0 when stolen
		bool stolen = false;
	};

	void startKick(float velocity)
	{
		if (kickLen <= 0)
			return;
		for (auto& v : voices)
			if (v.on)
				v.stolen = true;
		// take a free voice, else the most faded one
		Voice* nv = &voices[0];
		for (auto& v : voices)
			if (!v.on || v.steal < nv->steal)
				nv = &v;
		*nv = Voice();
		nv->on = true;
		nv->gain = velocity;
		kickStarted = true;
	}

	void renderVoice(Voice& v, float& outL, float& outR, double baseRate, double tune, double pitchSt,
	                 double pitchDecSec, double decaySec, double secPerSample)
	{
		if (!v.on)
			return;
		const int i0 = (int)v.pos;
		if (i0 + 1 >= kickLen || v.age >= decaySec || v.steal <= 0.0f)
		{
			v.on = false;
			return;
		}
		// DECAY: full level up to 60 %, then a cosine fade to silence
		float env = 1.0f;
		const double fadeStart = 0.6 * decaySec;
		if (v.age > fadeStart)
			env = (float)(0.5 * (1.0 + std::cos(MathConstants<double>::pi * (v.age - fadeStart) / (decaySec - fadeStart))));
		if (v.stolen)
			v.steal = jmax(0.0f, v.steal - stealStep);
		const float g = v.gain * env * v.steal;
		const float frac = (float)(v.pos - i0);
		outL += g * (kick[0][i0] + frac * (kick[0][i0 + 1] - kick[0][i0]));
		outR += g * (kick[1][i0] + frac * (kick[1][i0 + 1] - kick[1][i0]));
		// TUNE plus PITCH falling exponentially over P.DECAY
		const double st = tune + pitchSt * std::exp(-v.age / pitchDecSec);
		v.pos += baseRate * std::exp2(st / 12.0);
		v.age += secPerSample;
	}

	// DELAY, n samples in place (see the header): both lines always run (switched on, it already
	// holds the recent input); ON / OFF, MIX, FEEDBACK and MONO / PING-PONG fade over ~20 ms, the
	// time glides over ~50 ms (a tempo or TIME change), LOW / HIGH CUT are set per chunk
	void processDelay(float* l, float* r, int n, bool on, double targetSamples)
	{
		if (dlySize <= 0)
			return;
		dlyLowSm += chunkCoef * (delayLowCut.load() - dlyLowSm);
		dlyHighSm += chunkCoef * (delayHighCut.load() - dlyHighSm);
		{
			// 12 dB Butterworth high-pass (LOW CUT) and low-pass (HIGH CUT)
			const double K = std::tan(MathConstants<double>::pi * jmin((double)dlyLowSm, 0.45 * sr) / sr);
			const double d = 1.0 + MathConstants<double>::sqrt2 * K + K * K;
			for (auto* f : { &dlyHp, &dlyHpB })
				f->set(1.0 / d, -2.0 / d, 1.0 / d, 2.0 * (K * K - 1.0) / d, (1.0 - MathConstants<double>::sqrt2 * K + K * K) / d);
		}
		{
			const double K = std::tan(MathConstants<double>::pi * jmin((double)dlyHighSm, 0.45 * sr) / sr);
			const double d = 1.0 + MathConstants<double>::sqrt2 * K + K * K;
			for (auto* f : { &dlyLp, &dlyLpB })
				f->set(K * K / d, 2.0 * K * K / d, K * K / d, 2.0 * (K * K - 1.0) / d, (1.0 - MathConstants<double>::sqrt2 * K + K * K) / d);
		}
		const float fbT = delayFeedback.load(), mixT = delayMix.load();
		const float ppT = delayPingPong.load() ? 1.0f : 0.0f, onT = on ? 1.0f : 0.0f;
		const float swT = delaySwing.load();
		const double maxRead = (double)(dlySize - 4);
		// a line's sample readBack samples ago (linear interpolation)
		auto readLine = [this](const std::vector<float>& b, double readBack)
		{
			double pos = (double)dlyWrite - readBack;
			if (pos < 0.0)
				pos += dlySize;
			const int i0 = (int)pos;
			const int i1 = i0 + 1 < dlySize ? i0 + 1 : 0;
			const float fr = (float)(pos - i0);
			return b[(size_t)i0] + fr * (b[(size_t)i1] - b[(size_t)i0]);
		};
		for (int j = 0; j < n; j++)
		{
			dlyFbSm += smoothCoef * (fbT - dlyFbSm);
			dlyMixSm += smoothCoef * (mixT - dlyMixSm);
			dlyPpSm += smoothCoef * (ppT - dlyPpSm);
			dlyOnSm += smoothCoef * (onT - dlyOnSm);
			dlySamplesSm += dlyTimeCoef * (targetSamples - dlySamplesSm);
			dlySwingSm += dlyTimeCoef * (swT - dlySwingSm);

			// the repeats, each line filtered: A (the odd repeats: the 1st, 3rd...) reads TIME
			// (1 + SWING) back, B (the even ones) TIME (1 - SWING): a pair of repeats still spans
			// 2 TIME, the odd ones early or late. Lines: 0, 1 = A left, right; 2, 3 = B left, right
			const double rA = jlimit(1.0, maxRead, dlySamplesSm * (1.0 + dlySwingSm));
			const double rB = jlimit(1.0, maxRead, dlySamplesSm * (1.0 - dlySwingSm));
			const float aL = dlyLp.process(dlyHp.process(readLine(dlyBuf[0], rA), 0), 0);
			const float aR = dlyLp.process(dlyHp.process(readLine(dlyBuf[1], rA), 1), 1);
			const float bL = dlyLpB.process(dlyHpB.process(readLine(dlyBuf[2], rB), 0), 0);
			const float bR = dlyLpB.process(dlyHpB.process(readLine(dlyBuf[3], rB), 1), 1);

			// into the lines: A takes the input and B's repeats, B takes A's (each pass FEEDBACK
			// lower, through a tanh). MONO: a chain per channel. PING-PONG: one chain (left) from
			// the summed input, A out left, B out right (the right chain gets no input)
			const float inL = l[j], inR = r[j];
			const float pp = dlyPpSm;
			dlyBuf[0][(size_t)dlyWrite] = inL + pp * (0.5f * (inR - inL)) + std::tanh(dlyFbSm * bL);
			dlyBuf[1][(size_t)dlyWrite] = (1.0f - pp) * inR + std::tanh(dlyFbSm * bR);
			dlyBuf[2][(size_t)dlyWrite] = std::tanh(dlyFbSm * aL);
			dlyBuf[3][(size_t)dlyWrite] = std::tanh(dlyFbSm * aR);
			dlyWrite = dlyWrite + 1 < dlySize ? dlyWrite + 1 : 0;
			const float fL = aL + (1.0f - pp) * bL;
			const float fR = (1.0f - pp) * (aR + bR) + pp * bL;

			// the wet signal: the repeats; in PING-PONG their lows (under ~150 Hz) mono
			const float lowL = dlyXo.process(fL, 0), lowR = dlyXo.process(fR, 1);
			const float lowM = 0.5f * (lowL + lowR);
			const float wL = fL + dlyPpSm * (lowM - lowL);
			const float wR = fR + dlyPpSm * (lowM - lowR);
			l[j] = inL + dlyOnSm * dlyMixSm * (wL - inL);
			r[j] = inR + dlyOnSm * dlyMixSm * (wR - inR);
		}
	}

	// DIST's level compensation: the inverse of a curve's slope at 0, so DRIVE changes the
	// character, not the rumble's level against the kick (TAPE 40 % lifted it 12 dB without it);
	// FOLD keeps the square root of its slope (fully compensated, it got quieter as it folded)
	static float distMakeup(int mode, float dr)
	{
		switch (mode)
		{
			case 0:
			case 1: return std::tanh(dr) / dr;
			case 2: return 1.0f / (MathConstants<float>::halfPi * std::sqrt(dr));
			default: return 1.0f / dr;
		}
	}

	// DIST's curves (the script's node display draws these shapes, before distMakeup), x in,
	// dr = 1..10 the drive
	static float distCurve(int mode, float x, float dr)
	{
		switch (mode)
		{
			case 0: return std::tanh(dr * x) / std::tanh(dr);                       // TAPE
			case 1: return x >= 0.0f ? std::tanh(dr * x) / std::tanh(dr)            // TUBE: softer,
			                         : 0.8f * std::tanh(0.6f * dr * x) / std::tanh(0.6f * dr); // lower below
			case 2: return std::sin(x * dr * MathConstants<float>::halfPi);          // FOLD
			default: return jlimit(-1.0f, 1.0f, x * dr);                             // CLIP
		}
	}

	// DIST, n samples in place: the curve, a DC blocker (TUBE is asymmetric), TONE (a one-pole
	// low-pass), then MIX against the input. A mode change crossfades over 10 ms; ON / OFF
	// fades over ~20 ms. No oversampling: the rumble is mostly under 200 Hz. CRUSH (a rate and bit
	// reducer) acts on the curve's output, before TONE, which softens its steps.
	void processDist(float* l, float* r, int n, bool on, int mode, float driveT, float toneT, float mixT, float crushT)
	{
		if (!on && dstOnSm < 1.0e-4f)
		{
			dstOnSm = 0.0f;
			return;
		}
		if (mode != dstCur)
		{
			dstPrev = dstXf < 1.0f ? mode : dstCur;   // a change mid-fade: no fade
			dstCur = mode;
			dstXf = dstPrev == mode ? 1.0f : 0.0f;
		}
		dstToneSm += chunkCoef * (toneT - dstToneSm);
		const float a = (float)(1.0 - std::exp(-MathConstants<double>::twoPi * jmin((double)dstToneSm, 0.45 * sr) / sr));
		const float onT = on ? 1.0f : 0.0f;
		float* ch[2] = { l, r };
		for (int j = 0; j < n; j++)
		{
			dstDriveSm += smoothCoef * (driveT - dstDriveSm);
			dstMixSm += smoothCoef * (mixT - dstMixSm);
			dstOnSm += smoothCoef * (onT - dstOnSm);
			dstCrushSm += smoothCoef * (crushT - dstCrushSm);
			const float dr = 1.0f + 9.0f * dstDriveSm;
			// CRUSH: hold a new sample at 1 .. 1/50 of the rate, quantized to 12 .. 2 bits
			const bool crush = dstCrushSm > 1.0e-4f;
			bool take = true;
			float step = 0.0f;
			if (crush)
			{
				dstCrPhase += std::exp(dstCrushSm * CrushRateLog);
				take = dstCrPhase >= 1.0f;
				if (take)
					dstCrPhase -= 1.0f;
				step = std::exp2(-(11.0f - 10.0f * dstCrushSm));
			}
			for (int c = 0; c < 2; c++)
			{
				const float x = ch[c][j];
				float w = distCurve(dstCur, x, dr) * distMakeup(dstCur, dr);
				if (dstXf < 1.0f)
					w = dstXf * w + (1.0f - dstXf) * distCurve(dstPrev, x, dr) * distMakeup(dstPrev, dr);
				if (crush)
				{
					if (take)
						dstCrHeld[c] = std::round(w / step) * step;
					w = dstCrHeld[c];
				}
				const float y = w - dstDcX[c] + dstDcR * dstDcY[c];
				dstDcX[c] = w;
				dstDcY[c] = y;
				dstLp[c] += a * (y - dstLp[c]);
				const float wet = dstMixSm * dstLp[c] + (1.0f - dstMixSm) * x;
				ch[c][j] = x + dstOnSm * (wet - x);
			}
			if (dstXf < 1.0f)
				dstXf = jmin(1.0f, dstXf + dstXfStep);
		}
	}

	// GRAIN, n samples in place (see the header). The buffer is always written (switched on, it
	// already holds the recent input); grains start only while it's on.
	void processGrain(float* l, float* r, int n, bool on)
	{
		if (grnSize <= 0)
			return;
		const int mode = grainMode.load();
		const double lenS = jmax(16.0, (double)grainSize.load() * 0.001 * sr);
		const double gap = sr / (double)grainDensity.load();
		const double spray = (double)grainSpray.load() * 0.001 * sr;
		const float mixT = grainMix.load();
		const float onT = on ? 1.0f : 0.0f;
		// the grains' average overlap -> their sum's level (Hann: mean power 0.375); each grain takes the
		// scale when it starts (a SIZE or DENSITY change then reaches the sum as the grains turn over: no step)
		const float norm = 1.0f / std::sqrt(jmax(1.0f, (float)(lenS / gap) * 0.375f));
		const double size = (double)grnSize;
		for (int j = 0; j < n; j++)
		{
			const float xl = l[j], xr = r[j];
			grnBuf[0][(size_t)grnWrite] = xl;
			grnBuf[1][(size_t)grnWrite] = xr;
			grnOnSm += smoothCoef * (onT - grnOnSm);
			grnMixSm += smoothCoef * (mixT - grnMixSm);
			if (!on && grnOnSm < 1.0e-4f)
			{
				grnOnSm = 0.0f;
				grnWrite = (grnWrite + 1) % grnSize;
				continue;
			}
			// a new grain every 1 / DENSITY s, +-50 %
			grnNext -= 1.0;
			if (on && grnNext <= 0.0)
			{
				grnNext += gap * (0.5 + grnRand());
				startGrain(mode, lenS, spray, norm);
			}
			float wl = 0.0f, wr = 0.0f;
			for (auto& g : grains)
			{
				if (!g.on)
					continue;
				double p = g.pos;
				if (p < 0.0) p += size;
				if (p >= size) p -= size;
				g.pos = p;
				const int i0 = jmin((int)p, grnSize - 1);
				const int i1 = i0 + 1 < grnSize ? i0 + 1 : 0;
				const float frac = (float)(p - i0);
				const double u = g.age / g.len * GrainWinSize;
				const int w0 = jmin((int)u, GrainWinSize - 1);
				const float w = grnWin[w0] + (float)(u - w0) * (grnWin[w0 + 1] - grnWin[w0]);
				wl += w * g.gl * (grnBuf[0][(size_t)i0] + frac * (grnBuf[0][(size_t)i1] - grnBuf[0][(size_t)i0]));
				wr += w * g.gr * (grnBuf[1][(size_t)i0] + frac * (grnBuf[1][(size_t)i1] - grnBuf[1][(size_t)i0]));
				g.pos += g.rate;
				g.age += 1.0;
				if (g.age >= g.len)
					g.on = false;
			}
			const float m = grnMixSm * grnOnSm;
			l[j] = xl + m * (wl - xl);
			r[j] = xr + m * (wr - xr);
			grnWrite = (grnWrite + 1) % grnSize;
		}
	}

	// one grain: where it starts (somewhere in the last SPRAY, behind the write position by what
	// it reads ahead at its rate), its rate (MODE) and pan; skipped when all voices play
	void startGrain(int mode, double lenS, double spray, float norm)
	{
		Grain* g = nullptr;
		for (auto& v : grains)
			if (!v.on)
			{
				g = &v;
				break;
			}
		if (g == nullptr)
			return;
		double rate = 1.0;
		if (mode == 1) rate = std::exp2((grnRand() * 2.0 - 1.0) * 0.3 / 12.0);   // DETUNE: +-30 cents
		if (mode == 2) rate = 2.0;                                                // OCT UP
		if (mode == 3) rate = 0.5;                                                // OCT DOWN
		if (mode == 4) rate = -1.0;                                               // REVERSE
		const double ahead = rate > 1.0 ? lenS * (rate - 1.0) : 0.0;
		const double back = 2.0 + ahead + grnRand() * spray;
		g->pos = (double)grnWrite - back;
		g->rate = rate;
		g->len = lenS;
		g->age = 0.0;
		const double pan = (grnRand() * 2.0 - 1.0) * 0.5;   // +-50 %, equal power (1, 1 in the middle)
		g->gl = norm * (float)(std::cos((pan + 1.0) * MathConstants<double>::pi / 4.0) * MathConstants<double>::sqrt2);
		g->gr = norm * (float)(std::sin((pan + 1.0) * MathConstants<double>::pi / 4.0) * MathConstants<double>::sqrt2);
		g->on = true;
	}

	// 0..1 (xorshift)
	double grnRand()
	{
		grnSeed ^= grnSeed << 13;
		grnSeed ^= grnSeed >> 17;
		grnSeed ^= grnSeed << 5;
		return (double)grnSeed / 4294967296.0;
	}

	// EQ, n samples in place: TYPE at FREQ (GAIN, WIDTH) and SUB CUT (a 12 dB Butterworth
	// high-pass), their coefficients from the settings smoothed per chunk; ON / OFF fades. With
	// s normalised to FREQ, k = WIDTH, G = GAIN as a factor (the script's display draws the same):
	//   BELL        H(s) = (s² + k G s + 1) / (s² + k s + 1)                  (k: the bandwidth)
	//   LOW SHELF   H(s) = A (s² + k√A s + A) / (A s² + k√A s + 1), A = √G     (k: 1 / Q, the slope)
	//   HIGH SHELF  H(s) = A (A s² + k√A s + 1) / (s² + k√A s + A)
	// (GAIN at DC for LOW, at the top for HIGH; 0 dB on the other side.) A TYPE change switches
	// the coefficients at once (not smoothed: not automated in practice).
	// a biquad from an analog H(s) = (b2 s² + b1 s + b0) / (a2 s² + a1 s + a0), s normalised to the
	// corner, by the bilinear transform with K = tan(pi f / sr)
	template <class B>   // (Biquad is declared further down)
	static void setAnalog(B& bq, double K, double b2, double b1, double b0, double a2, double a1, double a0)
	{
		const double K2 = K * K;
		const double d = a2 + a1 * K + a0 * K2;
		bq.set((b2 + b1 * K + b0 * K2) / d, 2.0 * (b0 * K2 - b2) / d, (b2 - b1 * K + b0 * K2) / d,
		       2.0 * (a0 * K2 - a2) / d, (a2 - a1 * K + a0 * K2) / d);
	}

	void processEq(float* l, float* r, int n, bool on, int type, float freqT, float gainT, float widthT, float subT)
	{
		if (!on && eqOnSm < 1.0e-4f)
		{
			eqOnSm = 0.0f;
			return;
		}
		eqFreqSm += chunkCoef * (freqT - eqFreqSm);
		eqGainSm += chunkCoef * (gainT - eqGainSm);
		eqWidthSm += chunkCoef * (widthT - eqWidthSm);
		eqSubSm += chunkCoef * (subT - eqSubSm);
		{
			const double K = std::tan(MathConstants<double>::pi * jmin((double)eqFreqSm, 0.45 * sr) / sr);
			const double k = eqWidthSm, G = std::pow(10.0, eqGainSm / 20.0);
			if (type == 0)
				setAnalog(eqBell, K, 1.0, k * G, 1.0, 1.0, k, 1.0);
			else
			{
				const double A = std::sqrt(G), q = k * std::sqrt(A);
				if (type == 1)
					setAnalog(eqBell, K, A, A * q, A * A, A, q, 1.0);
				else
					setAnalog(eqBell, K, A * A, A * q, A, 1.0, q, A);
			}
		}
		{
			const double K = std::tan(MathConstants<double>::pi * jmin((double)eqSubSm, 0.45 * sr) / sr);
			const double d = 1.0 + MathConstants<double>::sqrt2 * K + K * K;
			eqSub.set(1.0 / d, -2.0 / d, 1.0 / d, 2.0 * (K * K - 1.0) / d, (1.0 - MathConstants<double>::sqrt2 * K + K * K) / d);
		}
		const float onT = on ? 1.0f : 0.0f;
		float* ch[2] = { l, r };
		for (int j = 0; j < n; j++)
		{
			eqOnSm += smoothCoef * (onT - eqOnSm);
			for (int c = 0; c < 2; c++)
			{
				const float x = ch[c][j];
				const float y = eqSub.process(eqBell.process(x, c), c);
				ch[c][j] = x + eqOnSm * (y - x);
			}
		}
	}

	// LIMITER, n samples in place (the last stage): DRIVE into it, then a stereo-linked peak
	// limiter without lookahead (no latency): the gain drops at once to keep the peak at CEILING,
	// holds 12 ms (a sub's cycles don't make it flutter), then recovers over RELEASE; the output
	// is clamped at CEILING. ON / OFF fades.
	void processLimiter(float* l, float* r, int n, bool on, float driveT, float ceilT)
	{
		if (!on && limOnSm < 1.0e-4f)
		{
			limOnSm = 0.0f;
			limGain = 1.0f;
			return;
		}
		const float onT = on ? 1.0f : 0.0f;
		for (int j = 0; j < n; j++)
		{
			limOnSm += smoothCoef * (onT - limOnSm);
			limDriveSm += smoothCoef * (driveT - limDriveSm);
			limCeilSm += smoothCoef * (ceilT - limCeilSm);
			const float dl = l[j] * limDriveSm, dr = r[j] * limDriveSm;
			const float p = jmax(std::abs(dl), std::abs(dr));
			const float target = p > limCeilSm ? limCeilSm / p : 1.0f;
			if (target < limGain)
			{
				limGain = target;
				limHoldLeft = limHoldSamples;
			}
			else if (limHoldLeft > 0)
				limHoldLeft--;
			else
				limGain += limRelCoef * (target - limGain);
			const float ol = jlimit(-limCeilSm, limCeilSm, dl * limGain);
			const float orr = jlimit(-limCeilSm, limCeilSm, dr * limGain);
			l[j] += limOnSm * (ol - l[j]);
			r[j] += limOnSm * (orr - r[j]);
		}
	}

	// REVERB, n <= Chunk samples in place: a DuskVerb room or DARK (Vital), crossfaded over 50 ms
	// when switching between the two kinds, then MIX against the dry signal
	void processReverb(float* l, float* r, int n, int type, float size, float damp, float width, float mixTarget)
	{
		float dl[Chunk], dr[Chunk], al[Chunk] = {}, ar[Chunk] = {}, bl[Chunk] = {}, br[Chunk] = {};
		const float xfTarget = type == DarkRoom ? 1.0f : 0.0f;

		if (rvbXf < 1.0f || xfTarget < 1.0f)
		{
			if (type != DarkRoom)
				rooms.set(type, size, damp, width);
			std::copy(l, l + n, al);
			std::copy(r, r + n, ar);
			rooms.process(al, ar, n);
		}
		if (rvbXf > 0.0f || xfTarget > 0.0f)
		{
			// DARK left a while ago: start from a silent tail
			if (darkStale)
			{
				dark.hardReset();
				darkStale = false;
			}
			vital_filters::ReverbSettings vs;
			vs.size = size;
			vs.decaySec = std::exp2(-1.0f + 4.0f * size);    // 0.5 .. 8 s
			vs.preLowNote = 0.0f;                           // the subs go in: it's a rumble
			vs.preHighNote = 128.0f - 60.0f * damp;
			vs.lowNote = 0.0f;
			vs.lowGainDb = 0.0f;
			vs.highNote = 100.0f - 40.0f * damp;
			vs.highGainDb = -1.0f - 9.0f * damp;
			std::copy(l, l + n, bl);
			std::copy(r, r + n, br);
			dark.process(bl, br, n, vs);
			for (int i = 0; i < n; i++)
			{
				const float mid = 0.5f * (bl[i] + br[i]);
				const float side = 0.5f * (bl[i] - br[i]) * width;
				bl[i] = DarkTrim * (mid + side);
				br[i] = DarkTrim * (mid - side);
			}
		}

		std::copy(l, l + n, dl);
		std::copy(r, r + n, dr);
		for (int i = 0; i < n; i++)
		{
			rvbXf = xfTarget > rvbXf ? jmin(xfTarget, rvbXf + rvbXfStep) : jmax(xfTarget, rvbXf - rvbXfStep);
			rvbMixSm += smoothCoef * (mixTarget - rvbMixSm);
			const float wl = al[i] + rvbXf * (bl[i] - al[i]);
			const float wr = ar[i] + rvbXf * (br[i] - ar[i]);
			l[i] = dl[i] + rvbMixSm * (wl - dl[i]);
			r[i] = dr[i] + rvbMixSm * (wr - dr[i]);
		}

		// fully on one side: the other one starts over when it comes back
		if (rvbXf >= 1.0f)
			rooms.restage();
		if (rvbXf <= 0.0f && xfTarget <= 0.0f)
			darkStale = true;
	}

	// the duck curve's gain duckAge seconds after its start
	float duckCurve()
	{
		// the shape (1 = no duck, 0 = full depth) over the length, then its last value
		float shape;
		if (duckOn && duckAge < duckLenSec)
			shape = duckShapeAt(duckAge / duckLenSec);
		else
		{
			duckOn = false;
			shape = duckShapeAt(1.0);
		}
		float g = 1.0f - duckDepthV * (1.0f - shape);
		// a retrigger: from the gain it was at, over 3 ms
		if (duckAge < 0.003)
		{
			const float start = 1.0f - duckDepthV * (1.0f - duckShapeAt(0.0));
			g += (duckFrom - start) * (float)(1.0 - duckAge / 0.003);
		}
		return g;
	}

	// the curve's shape at u (0..1 of its length), from slider pack 0: [0] = the number of points
	// (2..MaxDuckPoints), then per point x (0..1, rising), y (0..1), bend (-1..1: the segment
	// ending there is t^(2^(2.5 bend))). No points: 1 (no duck).
	float duckShapeAt(double u)
	{
		const int n = duckTableLen >= 1 + 3 * 2 ? jmin((int)duckTable[0], MaxDuckPoints, (duckTableLen - 1) / 3) : 0;
		if (n < 2)
			return 1.0f;
		auto px = [this](int k) { return (double)duckTable[1 + 3 * k]; };
		auto py = [this](int k) { return jlimit(0.0f, 1.0f, (float)duckTable[2 + 3 * k]); };
		if (u <= px(0))
			return py(0);
		for (int k = 1; k < n; k++)
		{
			if (u <= px(k))
			{
				const double x0 = px(k - 1);
				const double t = px(k) > x0 ? (u - x0) / (px(k) - x0) : 1.0;
				const double e = std::exp2(2.5 * jlimit(-1.0, 1.0, (double)duckTable[3 + 3 * k]));
				return py(k - 1) + (py(k) - py(k - 1)) * (float)std::pow(jlimit(0.0, 1.0, t), e);
			}
		}
		return py(n - 1);
	}

	// DRY's gain (-60 dB = silent)
	float dryGainTarget() const
	{
		const float db = dryLevel.load();
		return dryOn.load() && db > -59.9f ? Decibels::decibelsToGain(db) : 0.0f;
	}

	float wetGainTarget() const
	{
		const float db = wetLevel.load();
		return db > -59.9f ? Decibels::decibelsToGain(db) : 0.0f;
	}

	// PHASE: Olli Niemitalo's 90° phase difference network: two allpass paths 90° apart from
	// ~15 Hz to 20 kHz at 44.1 kHz (each section y = a2 (x + y[-2]) - x[-2]; path A one sample
	// later). The rumble = c A + s B, with c, s chosen so that at RotRefHz it's the input shifted
	// by -PHASE (x -1 for POL -): 0° leaves the kick's sub in phase.
	static constexpr double RotRefHz = 50.0;
	static constexpr double ApA[4] = { 0.6923878, 0.9360654322959, 0.9882295226860, 0.9987488452737 };
	static constexpr double ApB[4] = { 0.4021921162426, 0.8561710882420, 0.9722909545651, 0.9952884791278 };

	struct Rotator
	{
		float xa[4][2] = {}, ya[4][2] = {}, xb[4][2] = {}, yb[4][2] = {};
		float aDelay = 0.0f;

		static float section(float x, float a2, float* xs, float* ys)
		{
			const float y = a2 * (x + ys[1]) - xs[1];
			xs[1] = xs[0]; xs[0] = x;
			ys[1] = ys[0]; ys[0] = y;
			return y;
		}

		float process(float x, float c, float s)
		{
			float a = x, b = x;
			for (int k = 0; k < 4; k++)
			{
				a = section(a, (float)(ApA[k] * ApA[k]), xa[k], ya[k]);
				b = section(b, (float)(ApB[k] * ApB[k]), xb[k], yb[k]);
			}
			const float aOut = aDelay;
			aDelay = a;
			return c * aOut + s * b;
		}
	};

	// the network's response at RotRefHz, then c, s for the current PHASE / POL
	void updatePhase()
	{
		const float ph = phaseValue.load();
		const bool pol = polarity.load();
		if (!phaseDirty && ph == rotPhase && pol == rotPol)
			return;
		phaseDirty = false;
		rotPhase = ph;
		rotPol = pol;
		using cd = std::complex<double>;
		const double w = MathConstants<double>::twoPi * RotRefHz / sr;
		const cd z2 = std::polar(1.0, -2.0 * w);
		cd ha = std::polar(1.0, -w), hb = 1.0;
		for (int k = 0; k < 4; k++)
		{
			const double a2 = ApA[k] * ApA[k], b2 = ApB[k] * ApB[k];
			ha *= (a2 - z2) / (1.0 - a2 * z2);
			hb *= (b2 - z2) / (1.0 - b2 * z2);
		}
		const cd t = std::polar(pol ? -1.0 : 1.0, -(double)ph * MathConstants<double>::pi / 180.0);
		// c ha + s hb = t, in real and imaginary parts
		const double det = ha.real() * hb.imag() - ha.imag() * hb.real();
		if (std::abs(det) < 1.0e-6)
			return;
		rotC = (float)((t.real() * hb.imag() - t.imag() * hb.real()) / det);
		rotS = (float)((ha.real() * t.imag() - ha.imag() * t.real()) / det);
	}

	// DRIVE: tanh saturation (up to 10x into it, peaks kept near their level), blended in by
	// the amount, so 0 is clean
	static float shape(float x, float amount)
	{
		if (amount <= 0.0001f)
			return x;
		const float g = 1.0f + 9.0f * amount;
		const float wet = std::tanh(g * x) / std::tanh(g);
		return x + amount * (wet - x);
	}

	void clearBin(int b)
	{
		for (auto& s : snap)
		{
			s[2 * b] = 1.0f;        // min > max: empty until a sample arrives
			s[2 * b + 1] = -1.0f;
		}
	}

	static void addToBin(float* s, int b, float v)
	{
		s[2 * b] = jmin(s[2 * b], v);
		s[2 * b + 1] = jmax(s[2 * b + 1], v);
	}

	// a window ended: publish it unless it was partial or silent, then start the next one
	void endWindow()
	{
		if (!partial && peak > 1.0e-4f && rb != nullptr)
		{
			counter += 1.0f;
			for (auto& s : snap)
			{
				for (int b = 0; b < Bins; b++)
				{
					if (s[2 * b] > s[2 * b + 1])   // a bin no sample reached
						s[2 * b] = s[2 * b + 1] = 0.0f;
				}
				for (int k = 0; k < RefSlots; k++)
					s[2 * Bins + k] = NoRef;
				s[SnapSize - 2] = counter;
				s[SnapSize - 1] = (float)curWindow;
			}
			for (int k = 0; k < refCount; k++)
				snap[k / RefSlots][2 * Bins + k % RefSlots] = refs[k];
			// written whole: the ring's write index comes back where it was, so the script reads
			// the snapshot in order (process() holds the data lock)
			const float* chans[2] = { snap[0], snap[1] };
			rb->write(chans, 2, SnapSize);
		}
		startWindow(false);
	}

	// fresh: after a reset or a window change, i.e. joined mid-window: that one isn't shown
	void startWindow(bool fresh)
	{
		lastBin = -1;
		partial = fresh;
		peak = 0.0f;
		refCount = 0;
	}

	// BOUNCE: one sample of each stem (RUMBLE, KICK, MIX: left, right) into the ring; a bar line (a
	// new bar right after the last one, or the very first sample of a bar after a jump) is marked
	void captureSample(const float* s, double bp)
	{
		if (capLen <= 0)
			return;
		const int64 t = capTotal.load(std::memory_order_relaxed);
		const int w = (int)(t % capLen);
		for (int c = 0; c < NumStems * 2; c++)
			capBuf[c][(size_t)w] = s[c];
		const double bar = std::floor(bp / BeatsPerBar);
		if (bar != capLastBar)
		{
			SpinLock::ScopedLockType sl(capLock);
			const bool onLine = bp - bar * BeatsPerBar < bpm / (60.0 * sr) * 1.5;
			if (bar != capLastBar + 1.0)
				capMarks = 0;
			if (bar == capLastBar + 1.0 || onLine)
			{
				if (capMarks == MaxBounceBars + 1)
				{
					for (int k = 1; k <= MaxBounceBars; k++)
						capMark[k - 1] = capMark[k];
					capMarks--;
				}
				capMark[capMarks++] = t;
			}
			capLastBar = bar;
		}
		capTotal.store(t + 1, std::memory_order_relaxed);
	}

	// BOUNCE: the last bounceBars complete bars into the WAV (the message thread; see the header)
	void writeBounce()
	{
		auto dir = File::getSpecialLocation(File::userApplicationDataDirectory).getChildFile("ShadowDSP/Blackveil/Bounces");
		auto f = dir.getChildFile("_bounce.wav");
		f.deleteFile();

		AudioBuffer<float> out;
		{
			// (held while copying: the audio thread only waits for it at a bar line)
			SpinLock::ScopedLockType sl(capLock);
			const int n = bounceBars;
			if (capLen <= 0 || capMarks < n + 1)
				return;
			const int64 to = capMark[capMarks - 1], from = capMark[capMarks - 1 - n];
			// still in the ring, with half a second to spare (the audio thread writes on)
			if (capTotal.load() - from > (int64)capLen - (int64)(0.5 * sr))
				return;
			const int len = (int)(to - from);
			out.setSize(2, len);
			for (int c = 0; c < 2; c++)
			{
				auto dst = out.getWritePointer(c);
				const auto& src = capBuf[bounceStem * 2 + c];
				for (int i = 0; i < len; i++)
					dst[i] = src[(size_t)((from + i) % capLen)];
			}
		}
		if (out.getNumSamples() == 0 || out.getMagnitude(0, out.getNumSamples()) < 1.0e-5f)
			return;

		dir.createDirectory();
		auto fos = std::make_unique<FileOutputStream>(f);
		if (!fos->openedOk())
			return;
		WavAudioFormat wav;
		std::unique_ptr<AudioFormatWriter> w(wav.createWriterFor(fos.get(), sr, 2, 24, {}, 0));
		if (w == nullptr)
			return;
		fos.release();   // the writer owns it
		w->writeFromAudioSampleBuffer(out, 0, out.getNumSamples());
	}

	static constexpr double BeatsPerBar = 4.0;     // (4/4 only, like the snapshot's windows)
	static constexpr double BounceSeconds = 10.0;  // (1 bar down to ~26 BPM; 2 bars to 52)
	static constexpr int MaxBounceBars = 8;
	static constexpr int NumStems = 3;             // RUMBLE, KICK, MIX
	std::vector<float> capBuf[NumStems * 2];       // [stem * 2 + channel]
	int capLen = 0;
	std::atomic<int64> capTotal { 0 };   // samples recorded since prepare()
	int64 capMark[MaxBounceBars + 1] = {};  // the last bar lines (capTotal at each), oldest first
	int capMarks = 0;
	double capLastBar = -1.0e10;
	SpinLock capLock;
	int bounceBars = 2;
	int bounceStem = 0;
	bool bounceArmed = false;

	hise::DllBoundaryTempoSyncer* syncer = nullptr;
	SimpleRingBuffer* rb = nullptr;
	double sr = 44100.0;
	double bpm = 120.0;
	double beatPos = 0.0;          // host beat position (quarter notes)
	double curWindow = 4.0;

	float snap[2][SnapSize] = {};  // [source, output]
	int lastBin = -1;
	bool partial = false;
	float peak = 0.0f;
	float counter = 0.0f;
	float refs[2 * RefSlots] = {};  // the window's duck triggers (fractions of the window)
	int refCount = 0;

	float smoothCoef = 0.001f;
	float driveSm = 0.2f, gainSm = 1.0f;

	bool playing = false;

	// the kick player
	block kick[2];
	int kickLen = 0;
	double kickSr = 44100.0;
	Voice voices[2];
	float stealStep = 0.01f;
	double lastCell = -1.0e10;     // GRID: the division cell of the last sample
	int lastHit = 0;

	std::atomic<int> sourceMode { 0 }, hitValue { 0 }, hitOffsetValue { 0 };
	std::atomic<bool> triggerGrid { false };
	std::atomic<float> driveValue { 0.2f }, levelValue { 0.0f }, windowBeats { 4.0f };
	std::atomic<float> divisionBeats { 1.0f }, tuneValue { 0.0f }, decayValue { 2000.0f };
	std::atomic<float> pitchValue { 0.0f }, pitchDecayValue { 60.0f }, hitVelocityValue { 1.0f };

	// the FX chain: FILTER (Vital's analog model through the shared engine)
	vital_filters::Engine filter;
	vital_filters::Settings fltSettings;
	float fltEnv = 0.0f;
	bool kickStarted = false;
	std::atomic<bool> filterOn { true };
	std::atomic<int> filterType { 1 }, orderValue { DefaultOrder };
	std::atomic<int> chainOrderValue { DefaultChainOrder };
	std::atomic<float> filterCutoff { 400.0f }, filterReso { 0.3f }, filterEnvAmount { 0.4f }, filterEnvDecay { 150.0f };

	// CLONE's parameters (unused since DELAY replaced it; DELAY's state is after the Biquad, below)
	std::atomic<bool> cloneOn { true };
	std::atomic<float> cloneLevel[3] = { { 0.6f }, { 0.4f }, { 0.2f } };
	std::atomic<float> cloneDecay { 120.0f };

	// REVERB
	dusk_vendor::DuskRooms rooms;
	vital_filters::ReverbEngine dark;
	float rvbXf = 0.0f, rvbXfStep = 0.001f, rvbMixSm = 1.0f;   // 0 = the DuskVerb room, 1 = DARK
	bool darkStale = false;
	std::atomic<bool> reverbOn { true };
	std::atomic<int> reverbType { 0 };
	std::atomic<float> reverbSize { 0.7f }, reverbDamp { 0.6f }, reverbWidth { 0.4f }, reverbMix { 1.0f };

	// DUCK
	bool duckOn = false;
	double duckAge = 0.0;
	float duckGain = 1.0f, duckFrom = 1.0f, duckDepthV = 0.85f, duckMixSm = 1.0f;
	double duckLenSec = 0.5;
	block duckTable;               // slider pack 0: the curve's breakpoints
	int duckTableLen = 0;
	int duckPending = -1;          // KICK + OFFSET: samples until the curve starts
	double lastDuckCell = -1.0e10; // GRID: the shifted grid's cell of the last sample
	std::atomic<bool> duckTrigger { false };
	std::atomic<float> duckDivision { 1.0f }, duckDepth { 0.85f }, duckMix { 1.0f }, duckFall { 4.0f };
	std::atomic<float> duckHold { 30.0f }, duckRelease { 180.0f }, duckShape { 0.4f }, duckOffset { 0.0f };
	std::atomic<float> duckLength { 1.0f };
	std::atomic<bool> duckTarget { false };
	float duckTgtSm = 0.0f;           // 0 RUMBLE .. 1 ALL, smoothed (a switch crossfades)
	float rumOnSm = 1.0f;             // the rumble, faded out when no chain module is on
	std::atomic<float> wetLevel { 0.0f };
	float wetGainSm = 1.0f;

	// OUTPUT
	Rotator rot[2];
	float rotC = 1.0f, rotS = 0.0f, rotCSm = 1.0f, rotSSm = 0.0f;
	float rotPhase = 0.0f;
	bool rotPol = false, phaseDirty = true;
	float dryGainSm = 1.0f, volSm = 1.0f, widthSm = 1.0f;
	std::atomic<bool> dryOn { true }, polarity { false };
	std::atomic<float> dryLevel { 0.0f }, phaseValue { 0.0f }, widthValue { 100.0f }, volumeValue { 0.0f };

	float chunkCoef = 0.05f;       // ~20 ms smoothing, applied once per chunk

	// DIST
	static constexpr int NumDistModes = 4;
	int dstCur = 0, dstPrev = 0;
	float dstXf = 1.0f, dstXfStep = 0.002f;   // the mode crossfade, 0 -> 1
	float dstDriveSm = 0.4f, dstMixSm = 1.0f, dstToneSm = 4000.0f, dstOnSm = 1.0f;
	float dstLp[2] = {}, dstDcX[2] = {}, dstDcY[2] = {}, dstDcR = 0.9993f;
	std::atomic<bool> distOn { true };
	std::atomic<int> distMode { 0 };
	std::atomic<float> distDrive { 0.4f }, distTone { 4000.0f }, distMix { 1.0f };
	// CRUSH: the held samples, the rate counter (CrushRateLog = ln 1/50: the lowest rate)
	static constexpr float CrushRateLog = -3.912f;
	float dstCrushSm = 0.0f, dstCrPhase = 0.0f, dstCrHeld[2] = {};
	std::atomic<float> distCrush { 0.0f };

	// EQ: transposed direct form II, one state per channel
	struct Biquad
	{
		float b0 = 1.0f, b1 = 0.0f, b2 = 0.0f, a1 = 0.0f, a2 = 0.0f;
		float z1[2] = {}, z2[2] = {};
		void set(double nb0, double nb1, double nb2, double na1, double na2)
		{
			b0 = (float)nb0; b1 = (float)nb1; b2 = (float)nb2; a1 = (float)na1; a2 = (float)na2;
		}
		float process(float x, int c)
		{
			const float y = b0 * x + z1[c];
			z1[c] = b1 * x - a1 * y + z2[c];
			z2[c] = b2 * x - a2 * y;
			return y;
		}
		void clear() { z1[0] = z1[1] = z2[0] = z2[1] = 0.0f; }
	};
	Biquad eqBell, eqSub;

	// DUCK's band split, one sample of channel c: x's lows (f[0], f[1]) at gain, its highs (f[2],
	// f[3]) as they are (a Linkwitz-Riley pair sums flat), or at FULL x at gain
	float duckBand(Biquad* f, float x, int c, float gain, float full)
	{
		const float lo = f[1].process(f[0].process(x, c), c);
		const float hi = f[3].process(f[2].process(x, c), c);
		return full * gain * x + (1.0f - full) * (hi + gain * lo);
	}

	// BASS MONO, one stereo sample: the lows (f[0], f[1]) of both channels summed to mono, the
	// highs (f[2], f[3]) as they are; on (0..1) crossfades from the input (the filters always run)
	void bassMonoPair(Biquad* f, float& l, float& r, float on)
	{
		const float lol = f[1].process(f[0].process(l, 0), 0);
		const float lor = f[1].process(f[0].process(r, 1), 1);
		const float hil = f[3].process(f[2].process(l, 0), 0);
		const float hir = f[3].process(f[2].process(r, 1), 1);
		const float m = 0.5f * (lol + lor);
		l += on * (hil + m - l);
		r += on * (hir + m - r);
	}

	// NOISE: two filter stages per COLOR (DARK, MID: band-passes at 500 Hz / 2 kHz; AIR: 12 dB
	// high-passes at 5 kHz, 24 dB in all), a trim per COLOR so 0 dB is about -12 dB under the
	// kick's peak; the envelope follows the source (instant attack, ~40 ms release)
	Biquad noiseF[2];
	int noiseColorCur = -1;
	float noiseTrim = 1.0f, noiseEnv = 0.0f, noiseRel = 0.9995f, noiseGainSm = 0.0f;
	uint32_t noiseSeed[2] = { 0x9E3779B9u, 0x7F4A7C15u };
	std::atomic<float> noiseLevel { -60.0f };
	std::atomic<int> noiseColor { 1 };

	void noiseSetColor(int color)
	{
		if (color == noiseColorCur)
			return;
		noiseColorCur = color;
		if (color == 2)
		{
			const double K = std::tan(MathConstants<double>::pi * jmin(5000.0, 0.45 * sr) / sr);
			const double d = 1.0 + MathConstants<double>::sqrt2 * K + K * K;
			for (auto& f : noiseF)
				f.set(1.0 / d, -2.0 / d, 1.0 / d, 2.0 * (K * K - 1.0) / d, (1.0 - MathConstants<double>::sqrt2 * K + K * K) / d);
			noiseTrim = 0.5f;
			return;
		}
		// a band-pass (0 dB at its centre), Q 0.8
		const double w0 = MathConstants<double>::twoPi * (color == 0 ? 500.0 : 2000.0) / sr;
		const double alpha = std::sin(w0) / (2.0 * 0.8);
		const double a0 = 1.0 + alpha;
		for (auto& f : noiseF)
			f.set(alpha / a0, 0.0, -alpha / a0, -2.0 * std::cos(w0) / a0, (1.0 - alpha) / a0);
		noiseTrim = color == 0 ? 3.5f : 1.6f;
	}

	// white noise, -1..1 (xorshift; one generator per channel: the noise is decorrelated)
	float noiseWhite(int c)
	{
		uint32_t s = noiseSeed[c];
		s ^= s << 13;
		s ^= s >> 17;
		s ^= s << 5;
		noiseSeed[c] = s;
		return (float)(int32_t)s * 4.656613e-10f;
	}

	float eqFreqSm = 140.0f, eqGainSm = 4.0f, eqWidthSm = 1.0f, eqSubSm = 35.0f, eqOnSm = 1.0f;
	std::atomic<bool> eqOn { true };
	std::atomic<float> eqFreq { 140.0f }, eqGain { 4.0f }, eqWidth { 1.0f }, eqSubCut { 35.0f };
	std::atomic<int> eqType { 0 };

	// DELAY: four lines (A left, right; B left, right: SWING's alternating gaps), LOW / HIGH CUT
	// in the loop (dlyHp / dlyLp on A, dlyHpB / dlyLpB on B), the lows' mono split
	std::vector<float> dlyBuf[4];
	int dlySize = 0, dlyWrite = 0;
	double dlySamplesSm = -1.0;       // the time (samples), gliding; < 0 = jump to the target
	float dlyTimeCoef = 0.0004f;
	float dlySwingSm = 0.0f;          // SWING (-1/3..1/3 of TIME), gliding like the time
	Biquad dlyHp, dlyLp, dlyHpB, dlyLpB;
	Biquad dlyXo;                     // PING-PONG: the repeats' lows (mono) / the rest
	float dlyLowSm = 40.0f, dlyHighSm = 2500.0f, dlyFbSm = 0.45f, dlyMixSm = 0.5f, dlyPpSm = 0.0f, dlyOnSm = 1.0f;
	std::atomic<bool> delayOn { true }, delayPingPong { false };
	std::atomic<float> delayTime { 0.25f }, delayFeedback { 0.45f }, delayLowCut { 40.0f };
	std::atomic<float> delayHighCut { 2500.0f }, delayMix { 0.5f }, delaySwing { 0.0f };

	// DUCK's low end: what it ducks, the lows under SPLIT (a 24 dB Linkwitz-Riley low-pass: two
	// 12 dB Butterworths; [2], [3] the high-pass), the rumble's (dkR) and the whole output's (dkA, ALL)
	Biquad dkR[4], dkA[4];
	Biquad dkSR[4], dkSK[4];   // BOUNCE: the RUMBLE and KICK stems' in ALL (dkA, split)
	float duckSplitSm = 2000.0f, duckFullSm = 1.0f;   // FULL: 1 = the whole band
	std::atomic<float> duckSplit { 2000.0f };

	// BASS MONO: the output's lows under it summed to mono (the same 24 dB Linkwitz-Riley pair as
	// DUCK's), the output's (bmA) and BOUNCE's RUMBLE and KICK stems' (bmSR, bmSK); ON / OFF crossfades
	Biquad bmA[4], bmSR[4], bmSK[4];
	float bassMonoSm = 120.0f, bassMonoOnSm = 0.0f;
	std::atomic<float> bassMono { 20.0f };

	// GRAIN: the recent input (both channels), the grains, the next grain's countdown (samples)
	struct Grain
	{
		bool on = false;
		double pos = 0.0, rate = 1.0, len = 1.0, age = 0.0;
		float gl = 1.0f, gr = 1.0f;
	};
	std::vector<float> grnBuf[2];
	int grnSize = 0, grnWrite = 0;
	Grain grains[MaxGrains];
	double grnNext = 0.0;
	uint32 grnSeed = 0x9E3779B9u;
	float grnWin[GrainWinSize + 1] = {};
	float grnOnSm = 0.0f, grnMixSm = 0.5f;
	std::atomic<bool> grainOn { false };
	std::atomic<int> grainMode { 0 };
	std::atomic<float> grainSize { 80.0f }, grainDensity { 25.0f }, grainSpray { 200.0f }, grainMix { 0.5f };

	// SEND GATE: the age of the last kick (the gate closes over GateLength after it), FULL faded

	double gateAge = 1.0e9;
	float gateFullSm = 1.0f;
	std::atomic<float> gateLength { 1000.0f };

	// LIMITER
	float limGain = 1.0f, limOnSm = 1.0f, limDriveSm = 1.0f, limCeilSm = 0.966f, limRelCoef = 0.001f;
	int limHoldLeft = 0, limHoldSamples = 529;
	std::atomic<bool> limOn { true };
	std::atomic<float> limDrive { 0.0f }, limCeiling { -0.3f }, limRelease { 60.0f };
};
}
