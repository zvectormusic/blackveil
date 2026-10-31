# Blackveil

A new ShadowDSP plugin (HISE project, created 2026-10-27): a techno rumble kick generator. Read
`SPEC.md` (the user's decisions and the iteration 1 layout). Iteration 1 was a UI mock in HISE; the
engine was wired module by module (below; every module since 2026-10-29; host parameters, KEY and SEND GATE since
2026-10-29; RANDOM and presets since 2026-10-30).

- Product name "Blackveil", plugin code `Bkvl`, bundle `com.shadowdsp.blackveil`
  (`project_info.xml`); company "ShadowDSP", company code `Shdw` (`user_info.xml`). The
  company code is part of the VST3 ID: since 2026-10-31 (a new code) builds are a new plugin to a
  DAW (sets made before lose Blackveil); the user data is in `%APPDATA%\ShadowDSP\Blackveil`.
- Project XML: `XmlPresetBackups/Blackveil.xml` (save with filename `Blackveil`).
- The environment, HISE workflow, C++ node steps and HISE traps are in the repository's root
  `CLAUDE.md`. Build with `bash tools/build_plugin.sh Blackveil` from the repository root.

## Engine (since 2026-10-28)

- One C++ node, `DspNetworks/ThirdParty/bv_engine.h`, in the HardcodedMasterFX `BvEngine`: the
  whole signal path, wired module by module (the FX chain's order will be its processing order).
  Its header lists what's wired. After editing it, follow the root `CLAUDE.md` "C++ nodes" steps.
- The plugin is an audio effect that takes MIDI: `plugin_type` = `effect` (read by
  `tools/build_plugin.sh`), `EnableMidiInputFX` in `project_info.xml`.
- The visualizer reads `BvEngine`'s display buffer 0 (2 x 4096: one snapshot per window, layout in
  the node's header); the script sets its size (a node compiled into HISE's DLL can't resize it).
- Testing without Live: `renderhost Blackveil.vst3 out.wav` feeds a kick on every beat (120 BPM)
  into an effect's input. HISE itself has no audio input to test EXT with, and its test signal
  (`/api/testing/sequence` `testsignal`) records silence here (even bypassed, Live closed). In HISE,
  test with SAMPLE + MIDI notes (`note` messages) instead, with Live closed (HISE records nothing
  while Live holds the audio device).
- **Engine parameters (append-only):** 0 Source (0 EXT, 1 SAMPLE), 1 Drive (0..1), 2 Level (dB,
  -24..12), 3 Window (beats: 1, 4, 8), 4 Trigger (0 MIDI, 1 GRID), 5 Division (beats), 6 Tune (st),
  7 Decay (ms), 8 Pitch (st), 9 PitchDecay (ms), 10 Hit (a counter: a change plays the kick),
  11 HitOffset (samples into the block), 12 HitVelocity (0..1), 13 FilterOn, 14 FilterType (0..9: LP 12,
  LP 24, BP 12, BP 24, HP 12, HP 24, then LADDER, DIODE, DIRTY, COMB since 2026-10-31), 15 Cutoff (Hz), 16 Resonance (0..1), 17 FilterEnv (-1..1, x 7
  octaves), 18 FilterEnvDecay (ms), 19 Order (unused since 72 ChainOrder; was the four FX modules, 2 bits each),
  20 DryOn, 21 DryLevel (dB, -60 = silent), 22 Phase (degrees, 0..360), 23 Polarity (0 +, 1 -),
  24 Width (%, 0..200), 25 Volume (dB), 26 DuckTrigger (0 KICK, 1 GRID), 27 DuckDivision (beats),
  28 DuckDepth (0..1), 29 DuckMix (0..1, held at 1 since LOW END), 30 DuckFall, 31 DuckHold, 32 DuckRelease (ms),
  33 DuckShape (-1..1), 34 DuckOffset (ms, -50..50), 35 ReverbOn, 36 ReverbType (0..4: PLATE,
  HALL, SPRING, SHIMMER, DARK), 37 ReverbSize, 38 ReverbDamp, 39 ReverbWidth, 40 ReverbMix
  (0..1), 41 DuckLength (beats), 42 CloneOn, 43 CloneBar2, 44 CloneBar3, 45 CloneBar4 (0..0.6),
  46 CloneDecay (ms) (42..46 unused since DELAY replaced CLONE), 47 DistOn, 48 DistMode (0..3: TAPE, TUBE, FOLD, CLIP), 49 DistDrive (0..1),
  50 DistTone (Hz), 51 DistMix (0..1), 52 EqOn, 53 EqFreq (Hz), 54 EqGain (dB), 55 EqWidth
  (the bell's bandwidth, 1 / Q), 56 EqSubCut (Hz), 57 LimiterOn, 58 LimiterDrive (dB),
  59 LimiterCeiling (dB), 60 LimiterRelease (ms), 61 DuckTarget (0 RUMBLE, 1 ALL), 62 WetLevel
  (dB, -60 = silent: the RUMBLE fader), 63 DelayOn, 64 DelayTime (beats), 65 DelayFeedback
  (0..0.95), 66 DelayLowCut (Hz), 67 DelayHighCut (Hz), 68 DelayMix (0..1), 69 DelayPingPong
  (0 MONO, 1 PING-PONG), 70 DuckSplit (Hz, 40..2000; 2000 = FULL), 71 GateLength (ms, 10..1000; 1000 = FULL: SEND GATE), 72 ChainOrder (the FX chain with EQ: slot k's module in bits
  3k..3k+2, 0 FILTER, 1 DIST, 2 DELAY, 3 REVERB, 4 EQ, 5 GRAIN; range 0..262143 since GRAIN; a
  five-slot value from before puts GRAIN last, engine `decodeChainOrder` and script `chainDecode`),
  73 DistCrush (0..1), 74 NoiseLevel (dB, -60..0; -60 = OFF), 75 NoiseColor (0 DARK, 1 MID, 2 AIR)
  (the `grit` branch, merged 2026-10-30), 76 GrainOn,
  77 GrainMode (0 CLOUD, 1 DETUNE, 2 OCT UP, 3 OCT DOWN, 4 REVERSE), 78 GrainSize (ms, 10..500),
  79 GrainDensity (/s, 2..100), 80 GrainSpray (ms, 0..1000), 81 GrainMix (0..1), 82 EqType (0 BELL,
  1 LOW SHELF, 2 HIGH SHELF; 2026-10-30), 83 Bounce (0 -> 1 writes the bounce), 84 BounceBars
  (1..8), 85 BounceStem (0 RUMBLE, 1 KICK, 2 MIX) (2026-10-30), 86 DelaySwing (-1/3..1/3 of TIME;
  2026-10-30), 87 BassMono (Hz, 20..500; 20 = OFF; 2026-10-31).
- **BOUNCE** (2026-10-30, user: drag the sound into the host; placed "in the envelope header",
  white, "always 1 bar", stem "in a drop down, default to rumble"): `pnlBounce` (white, a
  four-arrow drag icon, the user's reference) and `cmbBounceStem` (not saved) in the header left of KEY (since 2026-10-31; user: "key dropdown
  can be smaller so we can move bounce and its dropdown to the header"; before: at the right end of
  the visualizer's top row); the legend is in the hint line. The engine records RUMBLE, KICK and MIX
  all the time (10 s each, with the bar lines: 4/4 only) and, on Bounce 0 -> 1, writes the last
  BounceBars complete bars of BounceStem to `%APPDATA%/ShadowDSP/Blackveil/Bounces/_bounce.wav`
  (bv_engine.h's header: what each stem holds). A mouse down runs `bounceRender()`: the script's
  `setAttribute` reaches the node's `setParameter` synchronously (HardcodedSwappableEffect), so
  the file exists when it returns; it is renamed `Blackveil_<preset>_<STEM>_<bpm>bpm[_<key>].wav`
  (never overwritten: a Live set may use an older one) and dragged with
  `startExternalFileDrag`. No file (not a whole bar recorded yet, or silence): PLAY FIRST.
  **The Bounces folder holds the user's clips, which Live references: a test must delete only the
  files it created** (a test that cleared the folder was stopped only by Live's file lock).
- **GRAIN** (2026-10-30, user: "go with grain engine you mentioned", the granular cloud from the
  grit discussion): node 4 (DUCK's index; its slot was freed for it), a sixth reorderable FX chain
  node (`fxOrder` [0, 1, 2, 3, 6, 4], `nodeModule`), off by default (sessions and presets from
  before sound the same). Engine `processGrain` / `startGrain` (see bv_engine.h's header): a 2.5 s
  buffer, up to 32 grains, each with its own level scale taken at its start (a SIZE / DENSITY change
  doesn't step the sum: StepClicks 1.00 / 1.01; before, with one shared scale, 12 / 8). Display:
  one second of grains (Hann bumps; fixed pseudo-random scatter). Measured with renderhost (kick
  off, from 1.5 s: renderhost's parameters land after ~1 s): GRAIN after the chain at MIX 100 %
  -26.9 dB vs -26.3 off; OCT UP / OCT DOWN move the low-passed zero-crossing rate x1.95 / x0.51;
  DENSITY 100 + SIZE 500 -27.8 dB; 2 /s x 10 ms -47 dB (sparse by design). RANDOM turns it on 35 %
  of the time and shuffles six slots.
- **CRUSH and NOISE** (the `grit` branch, written in its worktree by another session, merged and
  first compiled 2026-10-30): CRUSH = DIST's fourth knob (`knbDstCrush`): after the curve a
  sample-and-hold down to 1/50 of the rate and a bit reducer, 12 bits down to 2 (16 .. 4 as
  written: measured on the rumble alone, DIST only, the change was -52.6 dB at 50 %, inaudible; now
  -47 dB at 50 %, -24.6 dB at 100 %; still mild under ~40 %, RANDOM rolls it 0..30 %). NOISE = the
  footer fader `sldNoise` (-60 = OFF .. 0 dB) and `cmbNoiseColor` (DARK / MID / AIR): band-limited
  noise added to the chain's input, following the kick's envelope, before SEND GATE; the dry kick
  is untouched. It meets FILTER first in the default chain (LP 400 Hz): there it all but vanishes;
  with FILTER off into REVERB, 0 dB adds -30 dB (MID, DARK) / -40 dB (AIR) to a -15.6 dB rumble.
  Their block in Interface.js (GRIT) sits before PRESETS; their host parameters join `HOST_PARAMS`
  (so `presetInit` resets them). Both smooth to turn (StepClicks 1.03 / 0.97).
- EXT takes its kicks (for the KICK duck and FILTER's envelope) from the host's grid at
  the SOURCE division while the transport plays; nothing is detected in the input (an onset
  detector until 2026-10-29: in Live, behind a Drum Rack, CLONE lost a step with it; user: "we
  don't need detection, use the grid"). In EXT the TRIGGER switch shows GRID (dimmed).
  HISE's internal clock (TransportHandler) doesn't reach the node: test grid behaviour with
  renderhost (a playing transport, a kick per beat as input).
- FILTER MODELS (2026-10-31, branch `blackveil-filter-models`; user: "diode ladder eg?", option
  "append to TYPE", "comb follows key"): TYPE items 7..10 = LADDER, DIODE, DIRTY, COMB, Vital's
  models already in `vital_filters.h` (24 dB low passes; the diode's style 0, no high pass). COMB:
  Vital's feedback is bipolar (0.5 = none), so the engine maps RESO to 0.5..1; with a KEY the
  script snaps CUTOFF to the key's root in the nearest octave (`fltComb`, Theme.js
  `combSnapHz`; the readout shows the note, "65 Hz C2"), re-sent on TYPE / KEY changes; ENV still
  sweeps it. A model change hard-resets Vital's filter (a click if switched while it rings). The
  display draws COMB as a spike per harmonic (a response curve aliased at that size). Measured,
  rumble alone: each differs from LP 24 by -3..-7 dB (difference signal); DIODE ~4 dB quieter at
  60 Hz.
- USER KICKS (2026-10-31, branch `blackveil-user-kicks`; user: drop a sample, "browse the folder
  that contains it with arrows"): a file dropped on `pnlSrcKick` (`setFileDropCallback`, WAV / AIFF
  / FLAC) or picked from its right-click menu plays from where it is (`kickSlot.setFile(<abs
  path>)`; the engine already reads mono files and the file's sample rate); ‹ › step through its
  folder (`userKicks`, sorted). Its path is the hidden label `lblKickFile` (saved; "" = factory,
  `knbKickIndex` keeps the factory kick meanwhile); a missing file plays the factory kick and
  shows MISSING. Presets: `lblKickFile` is in PRESET_KEEP and PRESET_KICK (it travels with
  "load their kick"; a preset without it then means the factory kick). The note comes from the
  name's last word (`kickNoteOf`). `Graphics.drawFittedText` isn't registered in this HISE
  ("function not found"): the name shrinks / shortens by `getStringWidth`. Test paths through
  `/api/repl` with forward slashes: its string parser drops backslashes.
- **The grid's clock resyncs** (2026-10-31; user: SAMPLE kicks "out of sync" after changing
  presets): the engine counts the host's beat per sample from a transport start or a resync. HISE
  suspends the audio while it loads a preset (no process calls, the count stands still), and with
  the master clock's sync mode at Inactive (HISE's default) it never sends a resync: the GRID kick
  and the GRID duck lagged the host until the transport restarted. The script sets
  `Engine.createTransportHandler().setSyncMode(ExternalOnly)`: the clock resyncs when the host's
  position leaves its 3-block estimate (a preset load, a loop), and the engine's `onResync` restarts
  both grids as at a transport start (no stray kick mid-step; a kick due in the resync's block fires
  only if the block starts on it).
- DELAY SWING (2026-10-30, branch `blackveil-delay-swing`; user: a slider "above the bars, middle
  is no swing", no label or value, not randomized): `knbDlySwing` (-33..33, host parameter "Delay
  Swing", engine 86 = value / 100), a thin bipolar slider along the top of the DELAY display (its
  own look and feel `swLaf`; the bars sit under it, `DLY_SW_H`). The odd repeats (the 1st, 3rd...)
  move early (left) or late (right); every pair still spans 2 TIME. Engine: each loop is two lines
  feeding each other (A reads TIME (1 + SWING) back, B TIME (1 - SWING)); MONO a pair per channel,
  PING-PONG one pair (A left, B right); at 0 the same sound as before. Measured at 1/16, 120 BPM:
  gaps 94 / 156 ms at +25, 156 / 94 at -25. Not in `RAND_KNOBS`.
- DELAY (branch `delay-unit`, 2026-10-29, user: "replace clone with a delay unit"; CLONE
  had replaced a delay in the first spec): CLONE's slot in the chain (chain module 2, node 2,
  power button `btnFx2On`). Synced only: TIME (`cmbDlyTime`, `DLY_TIMES` / `DLY_BEATS`, 1/32 ..
  1/2 with dotted and triplet values; the script sends beats, `dlyTimeSend`), FEEDBACK, LOW CUT and
  HIGH CUT inside the loop (12 dB each), a tanh on the fed-back signal, MIX, and PING-PONG (the
  arrows button `btnDlyPing`; the repeats' lows stay mono under ~150 Hz). The lines hold 2 beats
  at 30 BPM with SWING's longer gap (5.5 s). CLONE's knobs (`knbClnBar2..4`, `knbClnDecay`) stay as hidden components.
  Before: CLONE played the input again 1, 2 and 3 sixteenths later (_XXX); see git history.
- BASS MONO (2026-10-31, user: "add a bass mono knob to the output module"; "don't add the value
  to the output screen"): `knbOutMono` (OUTPUT's fourth knob, 20..500 Hz, 20 = OFF, Theme kind
  `monofreq`; host parameter "Bass Mono", appended; engine 87 BassMono). Engine: after the dry kick
  is added back and DUCK's ALL, before VOLUME, `bassMonoPair` sums both channels' lows to mono
  through a 24 dB Linkwitz-Riley pair like DUCK's (`bmA`; BOUNCE's RUMBLE and KICK stems their own,
  `bmSR` / `bmSK`, so RUMBLE + KICK = MIX still holds); ON / OFF crossfades over ~20 ms (OFF
  keeps the last frequency for the fade), the filters always run. Not in RANDOM (OUTPUT is setup).
  Measured in HISE (REVERB HALL alone, WIDTH 100 %, side = (L - R) / 2): side under 80 Hz -17.3 dB
  OFF, -29.0 at 80 Hz, -49.1 at 200, -73.9 at 500; side above 1.5 kHz and mid unchanged (+-0.6 dB).
- DIST, EQ, LIMITER (2026-10-29): DIST's curves are level-compensated (`distMakeup`: the inverse of
  the slope at 0; FOLD keeps its square root), so DRIVE changes the character, not the rumble's
  level against the kick; the node display draws the shapes before it. EQ's WIDTH widens the bell
  (the engine's k, the display's `ek`). The LIMITER has no lookahead (no latency to report):
  instant attack, 12 ms hold, RELEASE, a clamp at CEILING. ON / OFF of all three fades.
- Node styling (2026-10-30, user: the fixed modules should look different): `paintNode` kind
  `NODE_CHAIN` (the six reorderable FX nodes: raised, lighter, a drop shadow drawn by `pnlBg`, a
  grip, the title bar lit on hover) or `NODE_FIXED` (SOURCE, OUTPUT, LIMITER: recessed, a solid
  title band). Group titles INPUT, FX CHAIN, MASTER; the signal flow is drawn as arrowheads at
  the end of the INPUT and FX CHAIN lines (`drawFlowLine`; the "›" between nodes is gone). The
  header shows the product logo `Images/blackveil_logo.png` (white on transparent, made from the
  user's logo: alpha from brightness, so it sits on any background; a new image needs a HISE
  restart).
- UI size: the header's SIZE button (`pnlUiSize`, flush right with KEY left of it) steps through
  `UI_SIZES` S / M / L = 80 / 100 / 125 % (a zoom saved by an older version shows as the nearest); HISE keeps
  the zoom in its own settings (per user), so the script never sets it at startup.
- After a test session, list the controls that differ from their defaults (REPL:
  `Content.getAllComponents("")` filtered on `getValue() != get("defaultValue")`; `cmbFltType` = 2
  is expected): controls changed by themselves during testing twice (likely the mouse wheel over
  HISE's window), and a save would keep them.
- REVERB: PLATE / HALL / SPRING / SHIMMER are DuskVerb (`src/duskverb.h`, generated into
  `shared/dsp/` by `tools/gen_duskverb.sh`, with `dusk_vendor::DuskRooms`: the preset
  loading and knob mapping without HISE); DARK is Vital's reverb (`vital_filters::ReverbEngine` in
  `src/vital_filters.h`). Never call DuskVerb's reset() (it drops its prepared engines).
- DUCK: the curve is a list of breakpoints `duckPts` ([x, y, bend]) over LENGTH (41 DuckLength,
  beats: `DUCK_LENGTHS`), edited in the visualizer (`cePaint` / `ceMouse`), with
  presets (`DUCK_PRESETS`: since 2026-10-30 one button each in the visualizer's header, in the
  LENGTH pills' place, lit when the curve matches one, `duckPresetMatch`; `cmbDuckPreset` hidden).
  LENGTH is always 1/4 since then (user: "we only need 1/4"; `DUCK_LEN_FIXED`: a stored, random
  or make_presets length is ignored). `duckSend` writes the points into the engine's slider pack 0
  ([0] = count, then x, y, bend; max 16 points; the script sets the pack to 49 sliders: HISE's
  default is 16, i.e. 5 points, and until 2026-10-30 the engine ignored every point after the
  5th: a 7-point curve never dropped), and the engine computes the same curve
  (`duckShapeAt`, mirrored by the script's `duckShapeAt`). The points, LENGTH and OFFSET are the
  hidden panel `pnlDuckCurve`'s value (saveInPreset: presets and sessions keep the curve; its
  callback reloads it). Parameters 30..33 (FALL / HOLD / RELEASE / SHAPE) are unused since.
  In KICK mode a negative OFFSET counts as 0 (it would need lookahead latency); the script shows
  the effective one (`duckOffset()`).
- DUCK's controls (2026-10-30, user: room for a new module) are in the visualizer's right column
  (`DUCK_COL_X` / `DUCK_COL_W`; `VIZ_COL_W` = 176): the title DUCK (Theme.drawSectionTitle, in `cePaint`),
  KICK | GRID + division, RUMBLE | ALL, DEPTH and LOW END. Node 4 (DUCK) keeps its index, but its
  slot in MASTER is an empty dashed placeholder for the next module (pnlNode4's paint routine);
  `pnlDisp4` and `pnlDuckInfo` are hidden (kept: component ids are append-only).
  DEPTH and LOW END get `onNodeCtl` by hand: the loop over `nodeControls` gives only node
  controls their callback (from the move until 2026-10-30 neither reached the engine: DEPTH
  stayed at 0.85 whatever the knob showed). A control taken out of a node needs the same.
- Testing the curve editor: the e2e tool's `doubleClick` is two clicks (the panel never gets a
  double-click: call `ceMouse({doubleClick: true, x, y})` from the REPL); `drag` needs
  `pixelPosition` + `delta`. Check all control values afterwards: one e2e run also moved
  unrelated controls (TUNE, DIST, DUCK DEPTH / MIX).
- The visualizer's curve starts at the triggers the engine recorded in the snapshot
  (`bvDuckRefs`, see the display buffer layout in `bv_engine.h`), plus OFFSET; before the first
  snapshot it shows one trigger per beat (KICK) or per division (GRID).
- OUTPUT: the dry kick is the SOURCE's output (after DRIVE / LEVEL), added back untouched; PHASE,
  POL and WIDTH act on the rumble only. PHASE is exact at 50 Hz and drifts away from it (the
  network's own phase, about +-18° at 40 / 60 Hz): putting the dry kick through the same network
  would make it exact everywhere, but would delay the kick's sub against its click by ~5 ms.
- The visualizer's white waveform is what DUCK acts on, ducked: the rumble (after PHASE / POL /
  WIDTH, without the dry kick and VOLUME), or in TARGET ALL the rumble and the dry kick.
- The visualizer and the curve editor are one view (2026-10-29, user: "merge the two views"):
  zoom CURVE (one cycle from the first trigger over the width) or the snapshot's window
  (`pnlVizWindow`: CURVE | 1 BEAT | 1 BAR | 2 BARS; `vizView` = the timeline shown; since
  2026-10-30 always 1 BEAT, user: `vizWindow` = 0, the switch hidden). The cycle
  from the window's first trigger is the editable one. `pnlVizMode` (the old WAVE | CURVE switch)
  is kept hidden (component ids are append-only). Every zoom's timeline is anchored on the
  editable cycle's start and covers the whole cycle; the KICK / BEAT line is the OFFSET handle in
  every zoom (a drag moves the line and the waveforms, the curve stays; user: the curve's start
  and the beat marker "not aligned" at OFFSET +50, "i can no longer drag it").
- No chain module on (FILTER, DIST, DELAY, REVERB all off): no rumble, the output is the dry kick
  (user: bypass vs "transparent" settings sounded different: the all-off chain passed the kick a
  second time, through PHASE's allpass network). DUCK TARGET ALL ducks the whole output (with
  GRID: a volume shaper on any track); with KICK it ducks the kick under its own hit.
- KICK / RUMBLE faders in the footer, right (horizontal; `sldKick`, `sldRumble`, their own
  look and feel `fdrLaf`): KICK is the dry level (DryLevel); RUMBLE is WetLevel. Mute buttons
  left of them, drawn as a speaker (2026-10-30, user: no sound waves; on, the default = black on
  white, like the dice; muted = crossed out, dim like a disabled button; the value is still 1 = muted, "Rumble Mute" is a host parameter): `btnKickMute` is DRY off (`btnDryOn` inverted, not saved itself), `btnRumbleMute`
  sends -60 dB and keeps the fader (`rumbleSend`). OUTPUT's DRY knob and power button were removed
  (user, 2026-10-29): `knbDryLevel` and `btnDryOn` stay as hidden components that follow the
  footer (sessions saved before the fader take their level from `knbDryLevel` at startup).
- Testing levels: the sample kick peaks near 0 dBFS, so kick + rumble clips HISE's recording; set
  SOURCE LEVEL to -12 dB for level comparisons.
- FILTER uses `src/vital_filters.h` (the shared Vital filter engine), generated into `shared/dsp/` and
  copied here by `tools/gen_vital_filters.sh`: never edit the copy.
- **Kicks:** every audio file in `AudioFiles/` (embedded in the plugin; `Engine.loadAudioFilesIntoPool`),
  in file order, named after the file (underscores -> spaces). Add a kick = drop a WAV there and
  rebuild. The script loads the selected one into `BvEngine`'s audio file slot.
- MIDI reaches the Interface script's `onNoteOn` (the plugin takes MIDI); it passes the note's
  offset in the block and its velocity, then bumps Hit, so the kick plays sample-accurately.
- DUCK LOW END (`knbDuckSplit`, 2026-10-29, in MIX's place; user: "replace duck mix with ducking
  the low end"): DUCK acts under it, through a 24 dB Linkwitz-Riley crossover (`duckBand`: the
  lows at the duck's gain, the highs as they are), for TARGET RUMBLE and ALL; at the top (2000 Hz,
  shown FULL, Theme kind `splitfreq`) the whole band. `knbDuckMix` stays hidden; the script holds
  DuckMix at 1. A first version subtracted (1 - gain) x a low-pass from the signal: the
  low-pass's phase shift kept the sub from cancelling (the lows barely ducked). Measured: 150 Hz
  ducks the lows as much as FULL, the rumble's highs above 2 kHz unchanged.

## Host parameters, KEY, SEND GATE (2026-10-29)

- **Host (plugin) parameters** are listed in `HOST_PARAMS` at the end of `Interface.js`
  (component id, the name the DAW shows). The DAW lists them in the components' order, which is
  the script's order after the components are recreated (see the root `CLAUDE.md` on stacking);
  the VST3 parameter ID is a hash of the component id (2026-10-30, HISE's
  `ScriptedControlAudioParameter`), so automation follows the id, not the position: a new control
  can sit anywhere in the script. **Append-only**: never rename one (its id), change its range or
  items, or drop one. Not host parameters: the duck curve (`pnlDuckCurve`), the FX order, the kick
  (`knbKickIndex`: the kick set grows), the visualizer's zoom.
- **State components:** the switches drawn as panels keep their state in hidden combos
  (`cmbSrcMode`, `cmbSrcTrig`, `cmbSrcDiv`, `cmbDuckTrig`, `cmbDuckDiv`, `cmbDuckTarget`; host
  parameters, a DAW shows their items) and hidden knobs (`knbKickIndex`; `knbChainOrder` = the chain with EQ, engine 72; `knbFxOrder` = the
  four others' order, 2 bits each, so a session from before EQ joined puts EQ last, where it was;
  `engineSendOrder`'s value). Before this they were script variables: sessions and presets lost
  them. A click on a switch sets its combo; the combo's callback (`onStateCombo`) applies it, also
  when a session, a preset or the host sets it.
- **KEY** (`cmbKey`, the header: OFF, C .. B; `keyRoot` 0..11, -1 OFF): the SAMPLE kick is tuned
  to it: the kick's note comes from its file name's last part (`..._G.wav`, also `F#`, `Db`;
  `KICKS[i][2]`, -1 unknown = not tuned), `kickKeyOffset()` (-5..+6 st) is added to TUNE in
  `srcSend`. EQ FREQ snaps to the key's root or fifth (`keySnapHz` / `keySnapNote` in Theme.js,
  60..400 Hz; `engineSend` and the EQ display use the snapped value; the readout shows "131 Hz C3",
  Theme kind `keyfreq`). The kick's subtitle shows its note and the note it plays at ("G › F").
- **SEND GATE** (`sldSend`, footer left; engine 71 GateLength): only each kick's first LENGTH ms
  feed the FX chain (full for 60 %, then a cosine fade); the dry kick is untouched; 1000 = FULL (no
  gate, the default). In EXT the kicks are the grid's: with the transport stopped the gate stays
  closed (no rumble).
- **EQ in the FX chain** (2026-10-29, user: "part of the fx chain that can be reordered"): node 6
  is in `fxOrder` (5 entries, `isChainNode`), dragged like the others; the engine runs it as chain
  module 4 (`FxEq`). EQ alone makes no rumble (no chain module on = no rumble counts FILTER, DIST,
  DELAY, REVERB only). MASTER = DUCK, OUTPUT, LIMITER.
- **RANDOM** (2026-10-30; header, left of the preset box): `pnlDice` (black on white, to catch
  the eye; user) click = `randRoll(false)` (a new
  sound), shift-click = `randRoll(true)` (MUTATE: each knob of `RAND_KNOBS` +-7 % of its travel,
  LOW END stays FULL), `pnlRandUndo` = `randUndoLast()` (8 snapshots, `randUndo`, not saved). It
  sets the sound only: `RAND_KNOBS` (musical ranges, drawn along the knob's skew: `randToNorm` /
  `randFromNorm`), `RAND_COMBOS` (the items allowed), `RAND_POWER` (how often a module is on; one of
  FILTER / DIST / DELAY / REVERB is always on), a duck curve preset with LENGTH 1/8..1/2 (OFFSET
  stays), and the chain order (`knbChainOrder`).
  **Recipes** (2026-10-31, branch `blackveil-random-recipes`; user: "make sure rumble outputs
  sound"): a new sound first picks one of `RAND_RECIPES` by weight (CLASSIC 3, DRIVEN 2, ECHO,
  HAZE, TONAL 1), among those the locks allow (`randPickRecipe`: not if a module it needs is
  locked off, or FILTER is locked on another type): the modules it turns on, FILTER's types,
  order rules ([a, b] = a before b, ChainOrder codes; swapped in the shuffle when both are free)
  and knob ranges that replace `RAND_KNOBS`. Every recipe has a tail (REVERB, or DELAY). Then the
  rules for every new sound: CUTOFF's range by TYPE (`RAND_FLT_CUTOFF`: HP 20..60, BP 60..250, the
  low passes 100..1500), a negative ENV goes no lower than 50 Hz (`RAND_FLT_FLOOR`), no REVERB and
  no DELAY on: REVERB (else DELAY) on, DELAY as the only tail FEEDBACK >= 45 and MIX >= 50, SUB CUT
  <= 35 under a low pass below 150 Hz, DEPTH <= 85 for LONG / GATE. Before, a roll with only FILTER
  (an HP or BP at 1..2 kHz possible) or DIST had no tail, and DUCK took the rest. MUTATE uses none
  of this (the knobs move +-7 % as before). `randLastRecipe` names the last roll's recipe (tests). Never SOURCE, KEY, SEND GATE, DUCK's trigger /
  TARGET, levels, OUTPUT, LIMITER. Each control is set with `setValue` + `changed()` (its callback
  runs). Tune the ranges in those tables.
  **A preset from before a control existed** loads that control at its default (the pre-callback
  adds every missing `HOST_PARAMS` control; first for EQ TYPE, 2026-10-30), so no factory preset
  needs regenerating for a new control.
  **Locks** (2026-10-30): `pnlLock0..6` (ChainOrder codes 0..5 = FILTER, DIST, DELAY, REVERB, EQ, GRAIN,
  6 = DUCK; `randLocked`, not saved), in each FX node's bottom right corner and at the end of
  DUCK's title line. `randModuleOf(id)` maps a RAND_* control to its module by its id
  (Flt / Dst / Dly / Rvb / Eq / Grn / Duck, and the btnFx*On power buttons): a locked module's
  controls, its curve (DUCK) and its chain slot stay; the unlocked modules are shuffled into the
  other slots. A new RAND_* control needs one of those tags in its id.
- **Presets** (2026-10-30). A preset is a sound: `uph`'s pre-callback (preprocessing on)
  rewrites the `PRESET_KEEP` controls (SOURCE mode / trigger / division, KEY, the kick) to their
  current values on a user-preset load; a DAW session (`isInternalPresetLoad`) restores everything.
  Exception: with the browser's "KICK presets also load their kick" (`pbPrefs.loadKick`), a preset
  saved in SAMPLE (its `cmbSrcMode` 2) brings its `knbKickIndex`; the source stays.
  The post-callback (`pbLoaded`) sets the current preset, clears the dot, clears RANDOM's undo.
- **Preset browser** (2026-10-30, branch `preset-ux`; user: "the preset system ... is not user
  friendly at all"; mockup approved first). The PRESET BROWSER block in Interface.js, `pb*`:
  - Header: `pnlPreset` shows CATEGORY / name and a dot when the sound changed since the load or
    save (`pbSnap`: every host parameter but `PRESET_KEEP`, plus the chain order, compared on a
    300 ms timer; the snapshot is taken on the tick after a load / init, after the stored values
    are restored); ‹ › step through the browser's category and filter, wrapping (`pbStep`);
    the floppy disk `pnlSaveBtn` opens the save popup; the "Saved" flash lasts 1.5 s.
  - `pnlBrowser` (620 x 460, under the box; `pnlPbShade` under it: a click outside closes):
    categories (ALL with Init pinned on top, FAVORITES, the factory folders, User, the user's),
    search (`lblSearch`, filters on each key), filter ALL / EXT / KICK (opens on the current
    SOURCE), a star per preset, the tag badge, a lock on factory presets, a dragged scrollbar (11
    rows; panels get no wheel). A click loads, the browser stays open (audition). Right-click
    (the panel's own popup menu, its items set as the mouse moves over a row): Rename / Duplicate /
    Move to category... / Delete (a confirmation box) on the user's, Duplicate to User on factory
    ones (`pbMenuAction`). Rename / move / a new save category type into `lblEdit` in place.
  - The tag is read from the file (`cmbSrcMode` value 2 = KICK), so saving tags it. The factory
    presets were all made in EXT, so they're all EXT: give make_presets.sh a `cmbSrcMode 2` where a
    sound is meant for the SAMPLE kick.
  - Factory = the folders in `PRESET_FACTORY` (Init, Rumble, Dub, Hypnotic, Industrial): never
    overwritten, renamed, moved or deleted, not a save category. **Add a new factory folder there.**
  - `pnlSave`: NAME (`lblSaveName`, each key), CATEGORY (`cmbSaveCat`: the user's categories, or
    "+ New category..."), MADE WITH (the tag; for KICK the kick it keeps), CANCEL / SAVE; a name
    taken asks "Overwrite?" (BACK / OVERWRITE). `pbDoSave` writes with
    `Engine.saveUserPreset(file)` and loads the file back, so it is the current preset (box,
    arrows, sessions). Default name: the current one (a factory one + " 2"), category User.
  - Favourites and the kick option: `%APPDATA%\ShadowDSP\Blackveil\PresetBrowser.json`, per user.
  - `fltPresets` (HISE's PresetBrowser before) stays, hidden (ids are append-only). The browser's
    components come after it, the labels last (on top).
  - Traps found: HISE's `Content.showModalTextInput` box only closes when it loses keyboard focus,
    and a click on a panel doesn't take focus, so it stayed on screen: the fields are editable
    labels. A label given focus by `grabFocus()` swallowed the next click elsewhere (e2e): the
    name field takes a click to edit. In e2e, click events carry no `hover`: hit-test on
    `event.clicked` too. A panel's right-click menu is modal: e2e can't drive it (it hangs the
    test window until HISE restarts); test `pbMenuAction` through the REPL.
  - **Factory presets:** `bash tools/make_presets.sh` (from this folder, HISE running, project
    loaded): 12 sounds in Rumble / Hypnotic / Industrial / Dub plus Init/Init, each from
    `presetInit()` (every host-parameter control but `PRESET_KEEP` at its default, default chain
    order, curve TIGHT 1/4) plus its overrides (`presetCurve(name, lengthIndex)` for the curve).
    Re-run it after adding a control, then save the project (it ends at the defaults).
  - **Shipping:** the export embeds `UserPresets/`; the plugin extracts them into
    `%APPDATA%\ShadowDSP\Blackveil\User Presets` when its version differs from that folder's
    `info.json` (`HISE_OVERWRITE_OLD_USER_PRESETS=1`, ExtraDefinitionsWindows in
    `project_info.xml`; without it HISE extracts only into a missing folder). It overwrites
    factory files of the same name, not the user's own: **bump `Version` in project_info.xml when
    the factory presets change.**
