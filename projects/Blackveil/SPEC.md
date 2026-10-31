# Blackveil: spec (draft for iteration 1, 2026-10-27)

A techno rumble kick generator: a kick (from the track, or Blackveil's own sample player) feeds a
reorderable FX chain (filter, distortion, delay, reverb) whose output, the rumble, is ducked under
the kick. Everything is visible in one view, under a large visualizer.

## Decisions (from the user)

| Topic | Decision |
|---|---|
| Plugin type | Audio effect that also takes MIDI (for the sample player). |
| Source | `EXT` (the track's audio) or `SAMPLE` (a built-in kick set: the user's WAVs in `AudioFiles/`, embedded in the plugin; ‹ › steps through them). SAMPLE replaces the input. |
| Sample trigger | `MIDI` (notes) or `GRID` (the host's beat grid, a division); switch TRIG MIDI \| GRID. |
| Source controls | TUNE (st), DECAY (amp decay to shorten the kick), PITCH ENV amount + decay, DRIVE. |
| FX chain | Four blocks, each with ON/OFF, reorderable freely by dragging: FILTER (types, cutoff, resonance, env amount on each hit), DISTORTION (new: modes TAPE / TUBE / FOLD / CLIP, drive, tone, mix), DELAY (2026-10-29, replaces CLONE again, user: "replace clone with a delay unit": synced TIME 1/32 .. 1/2 with dotted and triplet values, FEEDBACK, LOW CUT and HIGH CUT in the feedback loop, MIX, MONO / PING-PONG; before it, CLONE (replaced the delay, 2026-10-27: the block's input played again on the 16th steps 2, 3 and 4 after a kick on step 1, i.e. one, two and three sixteenths later (user, 2026-10-28; first built as bars by mistake), with a level knob each, STEP 2 / STEP 3 / STEP 4 (the block outputs the clones alone, as gated hits: _XXX, user 2026-10-28), 0..60 % of the source (a clone never gets louder than that), and DECAY: how long the clones ring, one setting for all three; user, 2026-10-28)), REVERB (DuskVerb's engines PLATE / HALL / SPRING / SHIMMER: size, damping, width, mix). GRAIN (2026-10-30, user, in DUCK's freed slot, off by default): a granular cloud of the chain's signal, MODE CLOUD / DETUNE / OCT UP / OCT DOWN / REVERSE, SIZE, DENSITY, SPRAY (how far back grains start), MIX. |
| Ducking | The FX output (rumble) is ducked by a curve restarted by a trigger: `KICK` (the kicks: SAMPLE's, or in EXT the SOURCE division of the host grid: no transient detection, user 2026-10-29) or `GRID` (host beat grid), selectable. LOW END (2026-10-29, replaces DUCK MIX, user: "replace duck mix with ducking the low end"): DUCK acts under this frequency (40 Hz .. 2 kHz, a 24 dB crossover), the highs pass; at the top, FULL = the whole band. TARGET (2026-10-29): RUMBLE, or ALL = the whole output with the dry kick (a volume shaper with GRID). DEPTH. OFFSET (−50..+50 ms) shifts the whole curve against the trigger (drag the curve line): negative = the rumble is already down when the kick lands (free in GRID mode; in KICK mode it needs lookahead, i.e. reported latency), positive = some rumble overlaps the kick's attack. The curve is drawn in the visualizer (2026-10-28; one view with the waveforms since 2026-10-29): free breakpoints with bends over a synced LENGTH (1/32 .. 1 BAR), presets; saved with presets and sessions. |
| Master | EQ is a reorderable FX CHAIN block since 2026-10-29 (user; before: fixed after the four, before DUCK). After the chain: DUCK, then OUTPUT (the kick is added back), then LIMITER (the last stage, so it also catches the dry kick; user's choice 2026-10-28). EQ: bass emphasis, not the subs: a bell at FREQ (60..400 Hz) with GAIN (0..+12 dB) and WIDTH, plus SUB CUT, a high-pass under it so the boost doesn't pile up sub energy. LIMITER: DRIVE into it, CEILING, RELEASE. EQ and LIMITER can be switched off. |
| KEY (2026-10-29) | A root note in the header (OFF, C .. B): the SAMPLE kick is tuned to it (its note from the file name), EQ FREQ snaps to the key's root or fifth. |
| SEND GATE (2026-10-29) | A footer fader: only each kick's first 10 ms .. 1 s feed the FX chain (FULL: all), so the kick's tail stays out of the rumble; the dry kick isn't touched. |
| RANDOM (2026-10-30) | A dice in the header: click = a new sound (the FX chain, its order, EQ, DUCK's curve and depth, in musical ranges; since 2026-10-31 from a recipe with a tail, so the rumble always sounds), shift-click = MUTATE (small changes); an undo arrow (8 rolls). Never the setup (SOURCE, KEY, SEND GATE, levels, OUTPUT, LIMITER). |
| Presets (2026-10-30) | The header box: ‹ › step, a click on the name opens the browser (load, save, folders). A preset is a sound: it keeps the setup (SOURCE, its trigger and division, KEY, the kick). Factory presets in Rumble / Hypnotic / Industrial / Dub, plus Init. |
| Bounce (2026-10-30) | The BOUNCE button (white, a drag icon) in the header between the preset box and KEY (2026-10-31; was the visualizer's top row), with a dropdown RUMBLE / KICK / MIX (default RUMBLE): drag it into the DAW to get the last complete bar of that stem as a WAV, named after the preset, stem, tempo and KEY. Always 1 bar. |
| Host parameters (2026-10-29) | Every visible control and switch (57); not the duck curve, the FX order, the kick, the visualizer zoom. |
| Output | WIDTH (0..200 %, stereo width). DRY = the kick's level + ON/OFF (kick + rumble, or the rumble alone), plus the output VOLUME. PHASE (0..360°, a rotation of the rumble's low end) and POL (+ / −) line the rumble up with the kick where they overlap, so their sub adds instead of cancelling. BASS MONO (2026-10-31, user: "add a bass mono knob to the output module"; "don't add the value to the output screen"): under it, OFF .. 500 Hz, the whole output (rumble and dry kick) is mono. |
| Visualizer | Shows a snapshot of one beat (2026-10-30, user; was 1 BEAT / 1 BAR / 2 BARS); DUCK's controls sit at its right (2026-10-30): the curve presets as a dropdown, trigger, TARGET, DEPTH, LOW END. The snapshot is captured once per window, not redrawn in between, and kept on screen when the sound stops (the last snapshot stays). On top, large, one lane with everything over each other: the incoming signal (grey, filled, behind), the FX chain output (white, in front) and the duck curve (white line: full level at the top, fully ducked at the bottom), edited by dragging handles on it (fall + depth, hold, release, shape). Synced to the host. (Iteration 1 had three rows; the user asked for the overlay, grey + white.) |
| Nodes | Every module is a node in one row, left to right like the signal (2026-10-30: DUCK's slot in MASTER is empty, kept for a new module; its controls are in the visualizer): SOURCE (two knob columns), then FILTER, DIST, DELAY, REVERB, EQ (reorderable), DUCK, OUTPUT, LIMITER (one knob column each). A node has a title bar with an icon (white line drawings after the user's reference sheet) and a power button where it can be off, a small display of its settings (FILTER: response curve with the envelope's sweep; DIST: transfer curve; DELAY: the input and its repeats; REVERB: the tail; DUCK: one beat of the curve; OUTPUT: the stereo image; EQ: its curve; LIMITER: input vs output level), its selector and its knobs (no level meters: removed 2026-10-28). |
| Display rules | Everything switched off looks disabled (darker, still editable): an OFF block, the sample-only controls in EXT (kick, trigger, TUNE, DECAY, PITCH, P.DECAY), DRY when DRY is off. One column of knobs per FX block. |
| Look | The ShadowDSP look (knobs, faders, switches, texture background, fonts), 1200 x 926, zoom S / M / L (80 / 100 / 125 %) by the header's SIZE button (the user's choice, kept per user). Shared code is copied for now. |
| Iteration 1 | UI mock in HISE: every section and control laid out in one view, the blocks draggable, the visualizer drawn with fake data. No DSP. Reviewed in HISE before the engine. |

## Layout (iteration 1 proposal)

```
y 0    ┌ HEADER: BLACKVEIL ·························· [preset ‹ name ›] [save] ··· KEY [SIZE] ┐
y 110  ├ VISUALIZER ··························································· [1 BEAT|1 BAR|2 BARS] ┤
       │  INPUT    ▁▇▅▃▂▁▁▁▁▇▅▃▂▁▁▁  (waveform, beat lines)                                    │
       │  CURVE    ‾‾\__/‾‾‾‾\__/‾‾  (drag: fall / hold / release handles)                       │
       │  OUTPUT   ▂▃▅▆▆▅▃▂▃▅▆▆▅▃▂  (rumble after the chain, ducked)                             │
y 400  ├ SOURCE  [EXT|SAMPLE] [TRIG MIDI|GRID 1/4]         ├ DUCK [KICK|GRID]  DEPTH  DUCK MIX     ┤
       │  ‹ kick name ›  category                           │ OUTPUT  DRY ON  DRY LEVEL  VOLUME     │
       │  TUNE  DECAY  PITCH AMT  PITCH DEC  DRIVE          │                                       │
y 610  ├ FX CHAIN  (drag a block to reorder; signal flows left to right) ──────────────────────────┤
       │ ┌ FILTER  [ON] ┐ ┌ DISTORTION [ON] ┐ ┌ DELAY  [ON] ┐ ┌ REVERB  [ON] ┐                     │
       │ │ type ▾       │ │ TAPE|TUBE|FOLD|CLIP│ │ NOTE FDBK   │ │ PLATE|HALL.. │                     │
       │ │ CUT RES ENV  │ │ DRIVE TONE MIX   │ │ TONE WOB MIX│ │ SIZE DAMP WID MIX│                 │
       │ └──────────────┘ └──────────────────┘ └─────────────┘ └──────────────┘                     │
y 866  └ (bottom bar: CLIP light, CPU) ─────────────────────────────────────────────────────────────┘
```

## Later iterations (not in iteration 1)

- Engine: the sources (external input, sample player with MIDI + grid triggering), the chain with
  runtime reordering, the transient detector and the ducking curve, the output mix.
- Reused code (filter, tape delay, reverb, pitch env / drive) moves to `shared/` then.
- To verify for the engine: how HISE exports an effect that also receives MIDI, and how Live routes
  MIDI to it.
