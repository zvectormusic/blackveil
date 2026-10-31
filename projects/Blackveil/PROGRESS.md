# Blackveil: progress

| What | Status | Notes |
|---|---|---|
| Project (2026-10-27) | done | Empty HISE project, plugin code `Bkvl`; spec in `SPEC.md`. |
| Iteration 1: UI mock (2026-10-27) | done, to review | `Scripts/Interface.js` (+ the shared `Theme.js` and images, copied). One view, left to right: SOURCE (EXT \| SAMPLE, kick name ‹ ›, MIDI \| GRID + division, TUNE / DECAY / PITCH / P.DECAY / DRIVE / LEVEL) → FX CHAIN (FILTER, DIST, DELAY, REVERB blocks with ON \| OFF; drag a title bar to reorder, `fxOrder` / `fxLayout`) → DUCK (KICK \| GRID + division, DEPTH, MIX, the curve's values) and OUTPUT (DRY OFF \| ON, DRY, VOLUME), under the visualizer (INPUT / CURVE / OUTPUT lanes, 1 BEAT / 1 BAR / 2 BARS; fake data: a kick per beat at 120 BPM and a ducked rumble; curve handles FALL+DEPTH, HOLD, RELEASE, SHAPE). No DSP, nothing is a plugin parameter yet. Checked in HISE: screenshot, block reorder by drag (e2e), RELEASE handle drag (180 → 330 ms for 80 px). |

## Notes

- `Theme.js` reads state Blackveil doesn't have (macros, modulation rings, sequencer); `Interface.js` defines empty
  stand-ins before including it. When the look moves to `shared/scripts`, those reads should become
  optional.
- HISE keeps a component's value across recompiles (and saves it in the UI data): a new default only
  shows after setting the value once and saving.
- 2026-10-27: the visualizer's three rows became one overlaid lane (user's choice among four
  options): input grey filled behind, output white in front, the duck curve as a white line with a
  dark halo; legend top left, beat
  numbers at the bottom.
- 2026-10-27: waveforms are per-pixel peaks again (the cycles visible); a ~20 ms smoothed outline
  was tried and rejected ("no longer looks like waveforms").
- 2026-10-27: OFFSET (duck curve vs trigger, −50..+50 ms; drag the curve line, a triangle marks
  the start; the timeline shows 60 ms before the first beat so a negative offset stays visible) and
  OUTPUT's PHASE (0..360°) + POL (+ / −), which rotate / flip the mock rumble in the visualizer.
  Checked: dragging the curve line 40 px at 1 BEAT gave −18 ms (expected −18).
- Trap: PowerShell 5's `Get-Content -Raw` reads a UTF-8 file without BOM as ANSI, and
  `Set-Content -Encoding utf8` then writes mojibake (‹ › · °) plus a BOM. Edit files with the Edit
  tool or bash, not a PowerShell read/replace/write.
- 2026-10-27: DELAY replaced by CLONE (BAR 2 / BAR 3 / BAR 4 levels, DECAY); one knob column per
  FX block (visualizer 16 px lower to make room); input / output level meters on every module
  (mock levels from a timer, `meterTimer`, 40 ms); switched-off controls draw darker (`uiDim`,
  read by Blackveil's copy of Theme.js: knobs, combo boxes, switches; `uiDimUpdate`). Checked:
  screenshots with DIST off + EXT + DRY off, and back to defaults; the DELAY controls removed from
  the stored UI data.
- 2026-10-28: the modules became "nodes" in one row (SOURCE, FILTER, DIST, CLONE, REVERB, DUCK,
  OUTPUT, EQ, LIMITER): title bar with an icon (after the user's reference sheet) and a power
  button, a small settings display per node, one knob column (small knobs), meters on both edges.
  New: EQ (bass bell + SUB CUT), LIMITER (DRIVE, CEILING, RELEASE), OUTPUT WIDTH. Spec: the
  visualizer shows a per-window snapshot that stays when the sound stops. The visualizer is 16 px
  lower again. Checked in HISE: screenshot, EQ power dims its node. Not checked: dragging a node
  title to reorder (after a forced HISE restart the e2e tool delivered no clicks at all, not even
  on the visualizer's window switch that worked before; the drag code is the same as before).
- Trap: compiling right after `ui/apply` removed all 61 components hung HISE's script thread (every
  later compile timed out with 504; REPL still answered). A forced restart fixed it; the same
  script then compiled in 2.4 s. After a forced restart, components removed but not saved come
  back from the stored UI data: remove them again.
- 2026-10-28: curve lag fixed. While a handle is dragged only the curve redraws; the output
  waveform is rebuilt on release (as the real plugin, whose output shows the new ducking with the
  next snapshot). The waveforms are pre-built as two paths in `vizBuild` (a repaint draws two
  paths instead of ~2,200 rectangles), and knobs that change them (DUCK DEPTH / MIX, PHASE, POL)
  ask for a rebuild that runs once they pause for 120 ms (`vizRequestBuild`, `vizBuildTimer`).
  Checked after a clean HISE restart (the e2e tool works again after one; it had stopped
  delivering clicks after the forced restart): node reorder by title drag ([1, 2, 0, 3]), RELEASE
  handle 180 -> 290 ms for 60 px, the deferred rebuild (DUCK MIX 0 changes the ducked output only
  after the pause), screenshot unchanged.
- 2026-10-28: an FX node can be dragged by any spot outside its controls (not only the title
  bar), with a hand cursor. Level meters removed from every node (user's request; code, the 18
  panels from the stored UI data); the displays and selectors widened into the freed edges.
- 2026-10-28: master order DUCK, EQ, OUTPUT, LIMITER (user's choice): EQ shapes the rumble alone,
  the limiter is last so it also catches the dry kick. The nodes keep their indexes and ids;
  `MASTER_SLOT` places them. Checked: screenshot.
- 2026-10-28: EQ moved before DUCK (user's choice): EQ, DUCK, OUTPUT, LIMITER (`MASTER_SLOT`).
  Checked: screenshot.
- 2026-10-28: EQ shown under the FX CHAIN title (fixed after the four reorderable nodes); MASTER
  = DUCK, OUTPUT, LIMITER.
- 2026-10-28: CLONE as the user defined it: BAR 2 / 3 / 4 = each clone's level, 0..60 % of the
  source; DECAY = how long the clones ring, one setting for all three.
- 2026-10-28: engine, step 1 (SOURCE EXT + visualizer). `bv_engine.h` in the HardcodedMasterFX
  `BvEngine`: EXT through DRIVE (tanh blended in) and LEVEL; SAMPLE outputs silence (not wired).
  One snapshot per visualizer window (aligned to the host's bars, HISE's master clock), source and
  output min / max in 2047 bins, written whole to display buffer 0; a partial or silent window
  isn't written, so the last one stays. The script polls it (50 ms), follows the host tempo
  (`Engine.getHostBpm`), draws the snapshot (the pre-roll shows its end), and shows "NO SIGNAL
  YET" until the first one; the duck curve is still only drawn (DUCK isn't wired). The plugin
  is now an effect (`plugin_type`, `EnableMidiInputFX`), EXT the default source. Checked: node
  DLL and plugin build; `renderhost` (now feeds an effect a kick per beat) gives 0.80 peak in,
  0.83 out (DRIVE 20 %). Not checked: the snapshot display with real audio (HISE plays nothing
  while Live holds the audio device): to see in Live.
- 2026-10-28: fixed: most controls couldn't be clicked in Live. The node plates (`pnlNode0..7`,
  `pnlSrcNode`) and displays were above the knobs in the stored UI data (they were added after
  the knobs existed, so HISE appended them on top), and a plate catches clicks even with "No
  Callbacks". All components but pnlBg / pnlViz / pnlVizWindow removed with `ui/apply` and
  recreated in script order (plates first). Missed earlier because the e2e tests only clicked
  panels, never a control on a plate. Checked: a power button on a plate toggles by click.
  The knob values went back to the script's defaults.
- 2026-10-28: engine, step 2 (SOURCE SAMPLE). The kicks are the WAVs in `AudioFiles/` (embedded;
  the user's one kick moved there from `Samples/`), ‹ › steps through them. The engine plays the
  selected one from its audio file slot: on a MIDI note (sample-accurate: the script's onNoteOn
  passes the note's offset and velocity, then bumps Hit) or on every GRID division while the
  host plays; TUNE, PITCH (pitch envelope) + P.DECAY, DECAY (full for 60 %, then a cosine fade);
  two voices, a new kick fades the old one over 3 ms; then DRIVE / LEVEL as EXT. New defaults:
  PITCH 0 st, DECAY 2000 ms (the sample as it is). Checked in HISE (Live closed): two MIDI notes
  -> two kicks (-0.8 dB peak, the half-velocity one 4.7 dB lower); DECAY 150 ms cuts each kick
  (silence after it); the visualizer's snapshot with real audio: 4 kicks a beat apart in 1 BAR.
  Not checked: GRID (HISE has no running transport; renderhost can't switch to SAMPLE, the
  controls aren't host parameters), the PITCH envelope by ear.
- 2026-10-28: engine, step 3 (FILTER). Vital's analog (Sallen-Key) model through the shared
  vital_filters engine (2x oversampled), now shared: `tools/gen_vital_filters.sh` writes
  `shared/dsp/vital_filters.h` and copies it into each project that uses it (the earlier copy unchanged,
  byte for byte). Types LP / BP / HP x 12 / 24 dB (the mock's list replaced; default LP 24).
  CUTOFF, RESO, and an envelope restarted by each kick (the player's; in EXT an onset detector
  on the input) sweeping the cutoff by ENV x 7 octaves over ENV DEC; FILTER's power button. The
  engine now processes 32-sample chunks (source, chain in Order, snapshot) and receives the FX
  order (`engineSendOrder` on every reorder). Checked in HISE on the sample kick: off rms -4.1 dB
  hf -37.4; LP 24 400 Hz -8.5 / -46.2; HP 24 2 kHz rms -38.2 (body gone); LP 24 100 Hz hf -50.3,
  with ENV 100 % hf -41.4 (opened on the kick); wide open (20 kHz, reso 0) -1.4 dB rms, -2 dB peak
  (the model's saturation on a near-0 dBFS kick). Not checked: EXT's onset detector (HISE's test
  signal never reaches the master FX here; only MIDI-triggered SAMPLE could be measured).
- Trap (testing): a PowerShell helper named `sv` silently did nothing (`sv` = Set-Variable).
- 2026-10-28: engine, step 4 (OUTPUT). After the chain (DUCK and EQ will slot in before it): the
  rumble through PHASE (a 90° phase difference network, two allpass paths mixed so the rumble is
  shifted by exactly PHASE at 50 Hz; it drifts about +-18° at 40 / 60 Hz, +-40° at 30 / 80 Hz) and
  POL, then WIDTH (side x 0..2); the dry kick (SOURCE's output, untouched) added back at DRY when
  DRY is on (-60 dB = silent); everything at VOLUME. All smoothed (~20 ms). The visualizer's white
  waveform is now the rumble alone. Engine parameters 20..25. Checked in HISE (SAMPLE + MIDI,
  FILTER off so the rumble is the kick, SOURCE LEVEL -12 dB): rumble alone rms -22.2 dB; + dry
  -16.7 (+5.5); POL - -25.5 (the sub cancels); PHASE 180 = POL - (-25.5); PHASE 90 -20.2; VOLUME
  -6 exactly -6 dB; DRY -60 = DRY off. Not checked: WIDTH (the sample kick is mono).
- 2026-10-28: engine, step 5 (DUCK). The rumble (the chain's output; EQ will come before) is
  ducked by the curve, restarted by KICK (the player's kicks, or EXT's onset detector) or GRID
  (every division while the host plays): a straight fall from the current gain to 1 - DEPTH,
  HOLD, RELEASE (u^p, SHAPE), shifted by OFFSET (GRID: also before the beat; KICK: only after, a
  negative one counts as 0, no lookahead yet); MIX ducked vs unducked. Engine parameters 26..34;
  the handles send the curve as they move (FALL / DEPTH also moves the DEPTH knob). The
  visualizer's curve now starts at the real triggers (the engine writes them into the snapshot:
  the bins went from 2047 to 2031 to make room) instead of the mock's one per beat. Checked in
  HISE (SAMPLE + MIDI, FILTER and DRY off, rms per 25 ms): DEPTH 85 % ducks right after the kick
  and recovers by ~200 ms; DEPTH 100 % + HOLD 200 ms -> -100 dB for 200 ms; OFFSET +50 ms leaves
  the first 50 ms; KICK with OFFSET -30 ms = 0; MIX 50 % at DEPTH 100 % -> at most -6 dB; four
  kicks 0.5 s apart -> four triggers 0.5 s apart in the snapshot, the curve drawn from them
  (screenshot). Not checked: GRID (no running transport in HISE), EXT's onset detector as the
  trigger. The curve's handle values aren't saved yet (presets / session).
- 2026-10-28: engine, step 6 (REVERB; user's choice: four DuskVerb rooms plus Vital's reverb).
  PLATE / HALL / SPRING / SHIMMER = DuskVerb's tuned presets with a SIZE / DAMP / WIDTH
  mapping (`dusk_vendor::DuskRooms`, a HISE-free copy of an existing node's logic); DARK (new, last in
  the selector) = Vital's reverb, fully wet: SIZE = its size and a 0.5 .. 8 s decay (2^(4 SIZE -
  1)), DAMP lowers its input's top (note 128 - 60 DAMP) and shelves its tail (note 100 - 40 DAMP,
  -1 .. -10 dB), WIDTH scales its side signal; MIX dry / wet. Between a DuskVerb room and DARK a
  50 ms crossfade; the one left behind starts over (DuskVerb restaged, Vital's tail cleared) when
  it comes back. Shared code: `shared/dsp/duskverb.h` (the earlier reverb node now includes it
  from src/; its DSP unchanged except one added `#include <memory>`) and Vital's reverb added to
  `shared/dsp/vital_filters.h` (`tools/vital/src/reverb.*` vendored, same commit). The earlier node's
  DLL still compiles. Checked in HISE (one kick, FILTER / DRY / DUCK off, wet rms per 500 ms):
  every room has its tail (PLATE -23.5 -> -118 dB over 4 s, HALL slow, SPRING short, SHIMMER
  building, DARK -21 dB and about 3.7 s RT60 at SIZE 70 = the 3.5 s expected; SIZE 20 about 1 s);
  DARK's level sits with the DuskVerb rooms (no trim); DAMP and MIX act; switching rooms in a tail
  fades the old one out (no click). Not checked: CPU in Live.
- 2026-10-28: UI at 100 % (1200 x 926; 80 % was too small in Live). The first build with it
  missed the change: the export compiles HISE's own copy of the script (see the root CLAUDE.md).
- 2026-10-28: duck curve editor (user: "need more control over the ducking, the interface to
  draw the duck env is not very easy"; chose the editor among split ducking, lookahead and EXT
  detection controls). The visualizer has WAVE | CURVE. WAVE: the snapshot with the curve where it
  ran, read only (the old handles are gone). CURVE: one cycle over the full width, a free
  breakpoint envelope (up to 16 points: drag, double-click to add / remove, a diamond per
  segment to bend it, magnetic grid of 16 x 4, SHIFT = free), the KICK / BEAT line dragged for
  OFFSET, LENGTH 1/32 .. 1 BAR (synced), 8 presets (TIGHT, PUMP, SMOOTH, LONG, GATE, SNAP,
  SWELL, DOUBLE; user asked for presets). The engine computes the same curve from the points
  (slider pack 0, new parameter 41 DuckLength); DEPTH scales it; a retrigger blends over 3 ms.
  The curve is saved with presets and sessions (hidden panel pnlDuckCurve). Checked in HISE:
  presets and LENGTH by click (e2e), point drag (snapped to the grid in x), bend drag, OFFSET by
  dragging the KICK line (+5 ms), add / remove by double-click (handler called directly: the
  e2e tool can't double-click), the engine gets the same points; audio (SAMPLE kick, DEPTH 100 %):
  GATE at 1/4 = -96 .. -111 dB from 50 to 300 ms then back, at 1/8 silent to 150 ms, SWELL rises
  slowly. Not checked: double-click with a real mouse, a session reload restoring the curve.
  (The user: works in Live.)
- 2026-10-28: SIZE button in the header (user: "it's still tiny" at 100 %): steps the zoom through
  80 / 100 / 125 / 150 / 175 / 200 %, kept by HISE per user; the forced startup zoom is gone.
- 2026-10-28: engine, step 7 (CLONE; user's choices: per-kick fade, plain copies). The module's
  input again 1, 2 and 3 bars later (4 beats a bar), BAR 2 / 3 / 4 = 0..60 %, added to the input.
  Each echoed kick (the kick times are kept: the player's kicks or EXT's onsets) restarts its
  clone's envelope: full for 60 % of DECAY, then a cosine fade (SOURCE DECAY's shape; a first
  try with an exponential fade to -60 dB over DECAY left the 60 % clone 11 dB under the kick).
  The delay line is written also while CLONE is off. Engine parameters 42..46. Checked in HISE
  (one SAMPLE kick, 120 BPM, CLONE alone): clones at 2 / 4 / 6 s, -4.5 / -8.0 / -14.0 dB under
  the kick (60 / 40 / 20 % = -4.4 / -8.0 / -14.0), silent 0.75 s later; DECAY 100 ms keeps only
  the hit; BAR 3 at 0 removes that clone; CLONE off: none. Not checked: EXT kicks, a tempo change
  while clones are pending (they follow the new bar length).
- 2026-10-28: CLONE corrected (user: "time division is wrong ... should be 1/16 clones"): the
  clones are 1, 2 and 3 sixteenths after the kick (the beat's steps 2, 3, 4: a rolling rumble),
  not bars; knobs STEP 2 / 3 / 4 (ids unchanged), the node's display shows one beat, the delay
  line is 1.2 s. Also fixed: the visualizer's beat labels read "1.0.1" (a float printed). Checked
  in HISE (120 BPM, DECAY 50 ms): clones at 125 / 250 / 375 ms, -4.5 / -8 / -14 dB under the kick.
- 2026-10-28: CLONE as gated hits, _XXX (user: "clone still does not play 1/16 notes"; then "gated
  hits, but don't play the first kick, clones are _XXX"; duck as now). The timing was right
  (clones on the sixteenths at 120 and 150 BPM: the engine follows the tempo), but the clones sat
  on the kick's own long tail and under DUCK / REVERB. Now CLONE's output is the three clones
  alone (the input doesn't pass), each a hit lasting DECAY; DECAY's default 120 ms (was 800).
  Checked in HISE (CLONE alone): silence on step 1, hits at 125 / 250 / 375 ms (-20 / -23.6 /
  -29.6 dB) with 10 dB gaps between them. With all defaults the TIGHT duck curve takes most of
  step 2 (the user keeps the duck as it is: the curve can be reshaped).
- 2026-10-29: EXT kick detection reads the raw input (user, in Live on an audio kick track: "I
  only hear two series after pressing play"). Not reproduced: in HISE (16 MIDI kicks) and in
  renderhost (EXT, a playing transport, 19 kicks) the clones follow every kick, and they don't
  fade into the reverb over time. But a simulation of the onset detector (the shipped kick, 120
  BPM) showed that at DRIVE 100 % it finds only the first kick (DRIVE flattens the attack against
  the tail), which silences CLONE and the KICK duck. The detector now reads the input before
  DRIVE / LEVEL. To check in Live: whether the clones now follow every kick; if not, the kick
  file and the settings that reproduce it.
- 2026-10-29: EXT takes its kicks from the host's grid (user: "we don't need detection. use the
  grid"). In Live the duck kept pumping but CLONE lost a step behind a Drum Rack in EXT, while
  SAMPLE worked with the same kick; neither HISE (real audio kicks into EXT, 16 kicks) nor a
  simulation showed why. Now EXT's kicks (CLONE, the KICK duck, FILTER's envelope) are on every
  SOURCE division of the host's grid while the transport plays; the onset detector is gone. The
  TRIGGER switch shows GRID in EXT, the division pill is active. Checked: renderhost (below).
  HISE's internal clock (TransportHandler, InternalOnly) doesn't reach the node: GRID can't be
  tested in HISE.
- 2026-10-29: DIST, EQ and LIMITER wired (user: "proceed with all the remaining modules"),
  parameters 47..60. DIST: the display's four curves, driven 1..10x, a DC blocker, TONE, MIX, and
  a level compensation (first built without: TAPE 40 % lifted the rumble 12 dB over the kick).
  EQ: the bell (H(s) = (s² + k A s + 1) / (s² + k s + 1), k = WIDTH; the display's WIDTH was
  inverted, fixed) and SUB CUT (12 dB Butterworth). LIMITER: no lookahead, instant attack, 12 ms
  hold, RELEASE, a clamp at CEILING. Checked in HISE (SAMPLE + MIDI, the rumble alone): DIST off
  vs on at 40 %: TAPE -0.8, TUBE -3.2, FOLD +5.5, CLIP 0 dB rms, MIX 0 = the input exactly, TONE
  300 Hz takes 1 kHz down 12 dB; EQ default +4.0 dB at 140 Hz, -4.2 at 30 Hz (SUB CUT 35), +12
  narrow / wide as set, SUB CUT 80 Hz: -17 dB at 30 Hz; LIMITER: peaks at the CEILING (-0.3,
  -6 dB), DRIVE +12 louder at the same peak. All defaults: -9.8 dB rms, peak -0.3 (DIST and
  LIMITER off: -9.6, peak 0). Not checked: by ear; the LIMITER's instant attack adds some
  distortion on the kick's attack (1 kHz +5 dB at the default ceiling).
- 2026-10-29: the CURVE view draws the waveforms behind the editor (user: "couldn't we see the
  waveform behind the envelope editor?"): the last snapshot's input (grey) and output (white),
  dim, from its first trigger on, on the editor's time base (`ceBuildWave`, rebuilt when the
  snapshot, LENGTH, OFFSET or tempo changes), so the kick starts on the KICK / BEAT line. Checked
  in HISE (SAMPLE + MIDI, OFFSET 0 and +40 ms).
- 2026-10-29: "transparent" settings (DRIVE 0, DUCK DEPTH / MIX 0, every FX off) sounded unlike a
  bypass in Live: an all-off chain passed the kick on as the "rumble", so the output was the dry
  kick plus a second copy through PHASE's allpass network (+6 dB where in phase, the lows
  smeared). Now no chain module on = no rumble (faded): the output is the dry kick alone.
  DUCK TARGET (parameter 61, switch RUMBLE | ALL in the DUCK node): ALL ducks the whole output
  after the dry kick is added back (user: "turn it into ducking the main signal"); a volume
  shaper with GRID. The visualizer's output waveform follows the target. Checked in HISE
  (SAMPLE + MIDI, SOURCE LEVEL -12): all off + DRY on = the dry kick (DUCK RUMBLE: no change);
  all off + DRY off = silence; DUCK ALL: the kick ducked (-14 dB in its first 50 ms, then back).
- 2026-10-29: the visualizer and the curve editor merged into one view (user): the waveforms,
  the beat grid and the duck curve on one timeline, zoom CURVE (one cycle from the first trigger)
  or 1 BEAT / 1 BAR / 2 BARS (the snapshot window). The editable cycle starts at the window's
  first trigger; the others repeat it. OFFSET: in CURVE the trigger line moves, in a window the
  curve's start. Recreating the components (stacking order, new pnlDuckTarget) reset cmbFltType
  and pnlDuckCurve's value: restored (LP 24, the default curve) before saving.
- 2026-10-29: KICK / RUMBLE faders right of the visualizer (user, instead of a dry / wet knob):
  KICK = the dry kick's level (the DRY knob's parameter, kept in sync), RUMBLE = a new rumble
  level (WetLevel, 62, applied in OUTPUT with PHASE / WIDTH). The lane got 112 px narrower.
  Checked in HISE (SAMPLE + MIDI, SOURCE LEVEL -12): RUMBLE -60 = the dry kick alone, with DRY
  off silence; the fader and the DRY knob follow each other. Components recreated again
  (stacking): cmbFltType and the curve restored before saving.
- 2026-10-29: curve editor, window zooms: the editable cycle's end could lie past the window
  (user, 1 BEAT, LENGTH 1/4, OFFSET +50 ms: "could not reach some points"); its last points were
  off screen. A window's timeline now reaches past the window's end to show the whole editable
  cycle (`vizUpdateView`; frozen during an OFFSET drag, updated on release).
- 2026-10-29: KICK / RUMBLE faders moved to the footer (user: "move kick and rumble in the
  footer"), horizontal, right; the visualizer has its full width back.
- 2026-10-29: mute buttons left of the footer faders (user: "add mute btns in the footer"):
  KICK's = DRY off (synced with DRY's power button), RUMBLE's silences WetLevel and keeps the
  fader. Checked in HISE: the engine gets -60 when muted, the fader's level when not.
- 2026-10-29: the KICK / BEAT line is the OFFSET handle in every zoom (user, 1 BEAT: the curve's
  start and the beat marker "not aligned", that's OFFSET +50 ms, and "i can no longer drag it":
  in a window only the curve's start was the handle). Every zoom's timeline is now anchored on the
  editable cycle's start, so the curve stays and the line and the waveforms move. Checked in HISE
  (simulated drag, 1 BEAT): the line onto the curve's start = OFFSET 0.
- 2026-10-29: OUTPUT's DRY knob and power button removed (the footer's KICK fader and mute do the
  same); OUTPUT is PHASE, WIDTH, VOLUME. The two components stay hidden (append-only ids).
- 2026-10-29 (branch `delay-unit`): DELAY replaces CLONE (user: "replace clone with a delay
  unit", option 1 of 3: our own delay in `bv_engine.h`). Synced TIME (1/32 .. 1/2, dotted,
  triplet), FEEDBACK, LOW CUT / HIGH CUT in the loop, tanh on the feedback, MIX, MONO /
  PING-PONG (lows mono). Engine parameters 63..69; CLONE's 42..46 and knobs kept, unused /
  hidden. Components recreated (stacking): cmbFltType and the curve restored before saving.
  Not yet heard: HISE couldn't record (Live had the audio device).
- 2026-10-29: DELAY measured in HISE (SAMPLE + MIDI, 120 BPM, the delay alone at MIX 100 %):
  repeats every 125 ms at 1/16 and 375 ms at 1/8D, about -7 dB each at FEEDBACK 45 % (-0.5 dB at
  95 %, bounded); PING-PONG alternates left / right; HIGH CUT 300 Hz darkens each repeat further.
  The mono-lows split went from a one-pole to a 12 dB low-pass at 150 Hz (the one-pole left the
  side under 150 Hz only 4 dB under the side); now the side under 60 Hz is ~21 dB under the
  channel.
- 2026-10-29 (branch `delay-unit`): DUCK MIX replaced by LOW END (user: "replace duck mix with
  ducking the low end"): engine parameter 70 DuckSplit, a 24 dB Linkwitz-Riley crossover, FULL at
  the top (default: sessions sound as before). Measured in HISE (a reverb tail ducked by a kick,
  1 BAR curve): at 150 Hz the lows under 60 Hz drop like FULL (-16 dB), the highs above 1 kHz
  -1.6 dB (FULL: -76 dB); TARGET ALL on the dry kick: lows -20.6 dB at 150 Hz.
- 2026-10-29: host parameters, KEY, SEND GATE (user: "go for those 3"; KEY = kick + EQ, SEND
  GATE as a footer fader). 57 host parameters (`HOST_PARAMS`, see CLAUDE.md). The panel switches
  (EXT | SAMPLE, MIDI | GRID, the divisions, KICK | GRID, RUMBLE | ALL), the kick and the FX order
  were script variables: sessions and presets lost them; now hidden components (combos = host
  parameters). KEY (header): the SAMPLE kick tuned to the key from its file name's note (the
  shipped kick is G), EQ FREQ snapped to the key's root or fifth. SEND GATE (engine 71
  GateLength): only each kick's first LENGTH ms feed the FX chain. Components recreated
  (stacking, host parameter order); cmbFltType and the curve restored before saving. Checked in
  HISE (SAMPLE + MIDI): KEY A on the G kick: TUNE +2 st sent, the kick's body 48.1 -> 54.0 Hz
  (x1.123 = +2 st; 48 Hz = G1, the file name is right); EQ FREQ 140 Hz with KEY A -> 164.8 Hz
  (E3), 100 -> 110 (A2), KEY OFF -> as set; readout "165 Hz E3". SEND GATE, the reverb alone:
  60 ms leaves the tail ~5 dB lower all along (150 ms: 1..2 dB, this kick has little energy past
  150 ms). A user preset saved and loaded every switch, KEY and the FX order (the engine got
  them). Trap found: a stray top-level `local` (a botched edit at the top of Theme.js) hung every
  compile (root CLAUDE.md).
- 2026-10-29: EQ joined the reorderable FX chain (user: "part of the fx chain that can be
  reordered"). Engine parameter 72 ChainOrder (5 slots x 3 bits; 19 Order unused), EQ = chain
  module 4; script `fxOrder` has node 6, saved in the new hidden `knbChainOrder` (`knbFxOrder`
  keeps the other four's order for sessions from before). Checked in HISE: the default order sends
  18056; EQ moved to the front -> [6, 0, 1, 2, 3], ChainOrder 13380, the node and its knobs at
  slot 0 (screenshot); EQ +12 dB before DIST CLIP 100 % -21.7 dB rms, after it -13.8 dB (the
  order is heard). The e2e tool delivered no drag events in this session (not even on FILTER,
  also after a clean restart): the drag was run as its steps from the REPL; to check by mouse.
  Plugin built (170 s), validator 45 / 47 (the known bus tests); not installed (Live open).
- 2026-10-30: RANDOM (user: shift-click for MUTATE, chain order randomized). Dice + undo arrow in
  the header (see CLAUDE.md). Checked in HISE (from the REPL: the e2e tool delivered no clicks or
  drags in this session): rolls stay inside `RAND_KNOBS` and the engine gets the values (cutoff
  76 Hz knob = engine), the chain order is shuffled ([0, 3, 6, 2, 1] -> ChainOrder 5400), six
  undos land exactly on the defaults; MUTATE at +-15 % moved CUTOFF 400 -> 86 Hz (a log knob), so
  +-7 %: 400 -> 529 -> 692 -> 601 Hz. Screenshot after a roll. Plugin built (177 s), validator
  45 / 47; not installed (Live open). To check by mouse: click, shift-click, undo.
- 2026-10-30: mute buttons drawn as a speaker (user: "replace mute btns with a speaker icon (on by
  def)"): waves = on (default), crossed out = muted; the values are unchanged (1 = muted, host
  parameter "Rumble Mute"). Screenshot checked both states.
- 2026-10-30: presets (user: "go for presets"). Header box `pnlPreset` (‹ › and the browser
  `fltPresets`), a preset keeps the setup (`PRESET_KEEP`: SOURCE mode / trigger / division, KEY, the
  kick), sessions restore everything; 12 factory presets + Init (`tools/make_presets.sh`), version
  0.2.0 with `HISE_OVERWRITE_OLD_USER_PRESETS=1` (the installed plugin had made an empty preset
  folder, so plain HISE would never extract them). Checked in HISE: SAMPLE + KEY A, then Classic
  Rumble (saved with EXT, KEY OFF) -> SAMPLE and A stay, ChainOrder 10251 and DELAY off reach the
  engine; › steps Deep Tunnel (PUMP, 4 points) -> Low Pressure -> Tight Sub (ChainOrder 10328), ‹
  back; RANDOM's undo cleared. Browser screenshot. Plugin built (208 s), validator 45 / 47;
  renderhost loading the build extracted all 13 presets + info.json into AppData. Not heard: the
  factory sounds were set by value, not by ear (HISE can't record while Live is open). Not checked
  by mouse: the box's clicks, the browser's save.
- 2026-10-30: the user's kicks (user: "process the samples i added"): 9 ASS063 kicks moved from
  `Samples/` to `AudioFiles/` (SAMPLE's set: 10 kicks; the old kick stays index 1, sessions keep
  it) with their note in the name, measured: zero-crossing cycles of the 150 Hz low-passed kick,
  the energy-weighted (amp^2 x period) median frequency after 40 ms; calibrated on the G-labelled
  kick (50.0 Hz = G1 +35 ct; plain autocorrelation drifted a semitone with the window). 01 G#
  (-44 ct), 02 G#, 03 G, 04 G#, 05 F#, 06 F#, 07 F#, 08 G, 09 A (-44 ct): 01 and 09 sit between
  two notes. Levels untouched (peaks -0.2 dBFS). The four `._ADRKT_DTB_*` files were macOS
  metadata (AppleDouble), no audio: removed; the DTB kicks themselves weren't copied.
- 2026-10-30: kick waveform preview (user): SOURCE's line under the kick name is now a strip with
  the kick's waveform (`kickWave`, 90 peaks over the first second, computed on load:
  `kickWaveUpdate`) and its number + note on the right; the trigger row and knobs moved down
  14 px. Screenshots: long G kick, a short new one with KEY A ("2 / 10 · G# › A"), EXT. Built
  (184 s), validator 45 / 47, installed.
- 2026-10-30: DUCK's controls moved into the visualizer (user: "move the duck controls from the
  bottom to the top, replacing curve presets that can be a dropdown. goal is to make room for new
  module"; asked: the slot stays empty in MASTER, 1 BEAT only without a selector). Right column:
  curve presets dropdown, KICK | GRID + division, RUMBLE | ALL, DEPTH, LOW END; the node slot is a
  dashed placeholder; the view is always one beat. Checked in HISE: the dropdown loads PUMP (4
  points, stored) and shows its title again; trigger / target / depth reach the engine; engine
  window 1 beat; screenshots; the stacking rebuilt (the browser stays on top). The rebuild
  showed why the earlier "remove all" failed: list_components also lists the LAF objects (laf,
  fdrLaf), and one unknown id fails the whole ui/apply batch; filter them out.
- 2026-10-30: GRAIN (user: "go with grain engine you mentioned": option 6 of the grain/texture
  list, the granular cloud), in DUCK's freed slot as a sixth reorderable FX chain node, off by
  default. Engine 76..81 (73..75 reserved for the uncommitted `grit` worktree's CRUSH / NOISE);
  ChainOrder grows to six slots (old five-slot values put GRAIN last: the saved 18056 came back as
  181896). Measured with renderhost (see CLAUDE.md "GRAIN"): level held at MIX 100 %, OCT UP / DOWN
  x1.95 / x0.51, no NaN; SIZE / DENSITY clicked (StepClicks 12 / 8) with one shared level scale,
  fixed by a per-grain scale (1.00 / 1.01). Found: HISEScript `%` is an integer modulo (the display's
  pseudo-random scatter was all 0); VST3 parameter IDs hash the component id (automation doesn't
  depend on component order); renderhost's parameters land after ~1 s. RANDOM: six-slot shuffles
  checked (e.g. 5986), undo back to 181896. Factory presets regenerated (16: + Hypnotic/Grain Haze,
  Industrial/Grain Shred, Dub/Octave Ghost), version 0.3.0 so the plugin re-extracts them. Octave
  Ghost loaded in HISE: GRAIN on, OCT DOWN, 200 ms, 40 % reach the engine. Not heard by ear; the
  node not dragged by mouse.
- 2026-10-30: merged the `grit` branch (user: "merge grit branch too"): CRUSH (DIST) and NOISE
  (footer), written by another session in its worktree and never compiled there; committed there
  as written (f1ff7e2), merged here. Conflicts: the engine's 73..75 (reserved here for exactly
  these: kept grit's code, GRAIN after), Interface.js's constants and its last block (GRIT now
  before PRESETS so the browser stays on top; its host parameters join HOST_PARAMS). Compiled,
  stacking rebuilt (66 host parameters), screenshot (CRUSH under MIX in DIST, NOISE + colour in
  the footer). Measured with renderhost (see CLAUDE.md "CRUSH and NOISE"): CRUSH was inaudible
  below ~60 % as written, so its bits go 12 .. 2 now (was 16 .. 4); NOISE works but is mostly
  filtered away by the default chain's FILTER. Factory presets regenerated (with the new controls
  at their defaults), version 0.4.0. Not heard by ear.
- 2026-10-30: preset browser (branch `preset-ux`; user: "refactor the preset system which is not
  user friendly at all ... saved instantly to a preset with a floppy disk icon and naming
  confirmation"). Mockup first (header, dropdown browser, save popup), then the user asked for a
  source tag and filter (EXT / KICK) and the "load their kick" option. Built as script panels in
  place of HISE's PresetBrowser (see CLAUDE.md "Preset browser"). Checked in HISE (e2e clicks and
  the REPL): open / close, load by click with the browser open, favourite star and FAVORITES, the
  filter, categories, save (new name, a factory name gets " 2", a taken name asks, OVERWRITE),
  the "Saved" flash, duplicate (user and factory), rename, move to a new category, delete with its
  confirmation, a KICK preset tagged and its kick loaded only with the option on, ‹ › stepping and
  wrapping in a category, the modified dot. Not checked: the right-click menu by mouse (modal, e2e
  can't drive it), typing into the fields (e2e can't type; the label's editor opens on click), in
  Live.
- 2026-10-30: `preset-ux` merged into `blackveil-presets` (fast-forward). DUCK LENGTH pills removed
  (user: "we only need 1/4"; LENGTH is fixed at 1/4, stored / random lengths ignored, make_presets
  set to 1/4), the curve presets are buttons in their place again (lit when the curve matches one);
  the dropdown is hidden and DUCK's column moved up 30 px. Checked in HISE: TIGHT lit at init,
  clicks on PUMP / DOUBLE load the curve (stored, LENGTH stays 1/4), screenshots. Not built yet.
- 2026-10-30: UI pass (user, step by step, each shown in HISE first): fixed vs movable modules
  (FX nodes raised with a grip and hover, SOURCE / OUTPUT / LIMITER recessed with a title band;
  mockup https://claude.ai/artifact/PHuCmK46xBYdotvvYe8xVZ, the first version was too subtle);
  INPUT group title; flow arrows on the title lines instead of "›" between nodes; DUCK title in
  the section style, its column spaced out; the product logo in the header; the preset browser's
  and save popup's text 1 px larger. RANDOM locks (7, not saved): checked in HISE, REVERB and DUCK
  locked over four rolls kept their values and REVERB its first slot, the rest changed; the
  stacking rebuilt (the browser stays on top). Not built yet.
- 2026-10-30: EQ TYPE (user: "add other eq types, eg shelf"): engine parameter 82 EqType (BELL,
  LOW SHELF, HIGH SHELF; `setAnalog`: the analog prototypes through the bilinear transform; a
  shelf's WIDTH is its slope, GAIN at DC for LOW, at the top for HIGH), `cmbEqType` in the EQ node's
  menu row (host parameter "EQ Type", RANDOM [BELL, BELL, LOW, HIGH]), the display draws all three.
  Older presets load BELL (the pre-callback fills in missing host parameters with their defaults).
  Checked: node compiled (83 parameters), the engine gets 0 / 1 / 2, screenshots of the three
  curves; the shelves' DC / Nyquist gains checked on paper (G and 1). Not heard: HISE can't play
  while Live holds the audio device; check with renderhost after the build.
- 2026-10-30: BOUNCE (user: drag the sound into the host). The engine records three stems (RUMBLE,
  KICK, MIX) into 10 s rings with the bar lines; engine parameters 83 Bounce (0 -> 1 writes the
  WAV, synchronously from setParameter), 84 BounceBars, 85 BounceStem. The script's white BOUNCE
  button (drag icon: four arrows) and a RUMBLE / KICK / MIX dropdown sit at the right end of the
  visualizer's top row (the legend moved to the hint line); always 1 bar. Placement chosen by the
  user after a header tile and two mockups (the visualizer row with switches; the footer, stems on
  their faders). Checked: in HISE the 2-bar prototype came out at exactly 4.000 s at 120 BPM with
  the pattern constant to the loop point; naming and never-overwrite; in Live (user) the drag works,
  1-bar RUMBLE bounces at 139 BPM. Not checked by measurement: RUMBLE + KICK = MIX (HISE couldn't
  record: Live had the audio device). Build 209 s, validator 45 / 47.
- 2026-10-31: RANDOM recipes (branch `blackveil-random-recipes`; user: "more sensible
  randomizer ... make sure rumble outputs sound"). A new sound picks a recipe (CLASSIC, DRIVEN,
  ECHO, HAZE, TONAL; see CLAUDE.md) and the rules for every roll (CUTOFF by TYPE, the ENV floor,
  a tail always, DELAY alone audible, SUB CUT under a low LP, DEPTH <= 85 for LONG / GATE).
  Checked in HISE from the REPL (values only: `changed()` doesn't run from there): 200 rolls, 0
  breaking a rule (recipes 82 / 47 / 24 / 27 / 20 against weights 3 / 2 / 1 / 1 / 1); REVERB
  locked off, 40 rolls all ECHO with DELAY on; MUTATE moves CUTOFF only a little, type and order
  stay; undo restores. Level test (HISE, Live closed; SAMPLE, MIDI, SOURCE LEVEL -12 dB, KICK
  muted; per roll 1.5 s to settle, then 4 kicks at 120 BPM, RMS over the 4 beats + 0.5 s; the
  kick alone -20.4 dB), 100 rolls each: old roll median -32.6 dB, 17 below -45 dB (min -84; nearly
  all BP 24 / HP 12 at 700..1950 Hz, one DIODE at 116 Hz with ENV -40), new median -34.8 dB, 3
  below -45 dB (min -51: ECHO with DIODE at 114 Hz, TONAL BP 12 at 189 Hz, DRIVEN LADDER 394 Hz;
  their other settings weren't logged). Spread p10..p90: old -51..-25, new -40..-25 dB. Not
  heard by ear yet.
- 2026-10-31: header (user: "remove the [company] logo, make size selector one button to click
  through s/m/l -> 80/100/125% and align the key and size selection right"): no company logo (its
  image is gone too); SIZE shows S / M / L and steps 80 -> 100 -> 125 -> 80 % (`UI_SIZES`,
  `uiSizeIndex`: an older 150..200 % zoom shows as L, the next click gives S); KEY and SIZE flush
  right (`SIZE_X` / `KEY_X`, 24 px margin). The manual's overview screenshot retaken.
- 2026-10-31: the duck curve's hint line 11 -> 14.5 px (user: "make the envelope explanation a bit
  bigger", then "even bigger"). KEY's combo 90 -> 56 px, and BOUNCE (90 x 26) with its stem combo
  (80) moved from the visualizer's top right into the header, left of KEY (user: "key dropdown can
  be smaller so we can move bounce and its dropdown to the header"). The bounce drag itself wasn't
  retried from the new spot (same code).
- 2026-10-31: the company is ShadowDSP (the user's choice, with a new company code and the user
  data moved by hand). `user_info.xml` Company ShadowDSP, CompanyCode Shdw (a new VST3 ID: Live
  sees a new plugin, sets made before lose Blackveil), bundle `com.shadowdsp.blackveil`, the bounce
  folder in bv_engine.h, docs, notes and comments (`vital_filters.h` through
  `tools/gen_vital_filters.sh`), the HISE patch file `shadowdsp-local.diff`. The user data copied
  to `%APPDATA%\ShadowDSP\Blackveil` (71 files; the old folder deleted the same day). The
  repository folder keeps its name.
- 2026-10-31: BASS MONO (user: "add a bass mono knob to the output module", then "dont add the
  value to the output screen"): `knbOutMono` under VOLUME, engine 87 BassMono (see CLAUDE.md).
  Node compiled (88 parameters), the stacking rebuilt (the knob under the preset browser; FILTER
  TYPE and the duck curve, reset by the rebuild, restored; the project XML only gains the knob and
  the attribute). Measured in HISE with a wide reverb: the lows' side signal -17 dB OFF -> -49 dB at
  200 Hz, the highs and the mid unchanged. Screenshot checked. Plugin build (170 s): StepClicks with "~Bass Mono" stepped every 25 ms: median 1.06, 90th pct 1.85
  (no step: 0.98 / 1.27), a few steps louder (likely the crossover's allpass phase moving with the
  frequency). Not heard yet.
- 2026-10-31: Windows installer (user: "We need a windows installer"; chose Inno Setup, unsigned
  for now): `tools/build_installer.sh` + `tools/installer/plugin.iss` (see the root CLAUDE.md),
  `installer/app_id` and `installer/THIRD-PARTY.txt` here, the GPL-3.0 text as the repository's
  `LICENSE`. Built: Blackveil-0.4.0-Setup.exe, 10 MB (with BASS MONO). Manual: getting-started's
  install steps. Tested (silent mode, elevated): install = the bundle identical to the build, the
  licence files, the Apps entry "Blackveil 0.4.0" / ShadowDSP; uninstall removes all three and keeps
  AppData's User Presets; reinstall as the first. Not tested: the wizard's pages by hand, the
  close-the-DAW prompt with Live open.
