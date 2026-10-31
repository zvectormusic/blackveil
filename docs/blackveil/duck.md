---
title: Duck and the visualizer
parent: Blackveil
nav_order: 7
---

# Duck and the visualizer

DUCK turns the rumble down on each kick and lets it swell back between them, following a curve.
That curve is drawn, and edited, in the visualizer.

## Reading the visualizer

The visualizer shows **one beat**, captured while the host plays. It keeps the last capture on
screen when the transport stops.

| Layer | What it is |
|---|---|
| **Grey, filled** (behind) | The incoming kick. |
| **White waveform** (in front) | What DUCK acts on, after ducking: the rumble, or with TARGET ALL, rumble and kick. |
| **White line** | The duck curve: full level at the top, fully ducked at the bottom. |
| **Vertical line** | Where the kick (or the grid's beat) lands. |

## DUCK's controls

At the right edge of the visualizer:

| Control | Range | Default | |
|---|---|---|---|
| **Trigger** | KICK / GRID + division | KICK | KICK: the curve restarts on each kick (SAMPLE's kicks; in EXT, SOURCE's grid). GRID: on the host grid at its own division, independent of the kick. |
| **Target** | RUMBLE / ALL | RUMBLE | RUMBLE: only the rumble is ducked, the kick stays on top. ALL: the whole output, kick included; with GRID it works as a volume shaper on any track. |
| **DEPTH** | 0 .. 100 % | 85 % | How far the curve pulls the level down. |
| **LOW END** | 40 Hz .. 2 kHz, FULL | FULL | DUCK only acts below this frequency; the highs pass unducked. FULL ducks the whole band. Around 150 Hz ducks the sub as firmly as FULL and keeps the rumble's top end moving. |

The lock at the end of DUCK's title keeps RANDOM from changing the curve.

## Curve presets

The CURVE buttons along the visualizer's top row load a curve: **TIGHT, PUMP, SMOOTH, LONG, GATE, SNAP,
SWELL, DOUBLE**. The button lights while the curve matches it. Loading a preset keeps your OFFSET.

## Editing the curve

The curve spans one beat (1/4) and is made of points joined by bendable segments.

| To | Do |
|---|---|
| Move a point | Drag it. Points snap to a grid; hold **Shift** for free movement. The first and last points move only up and down. |
| Add a point | Double-click on the curve's area (up to 16 points). |
| Remove a point | Double-click it (not the first or last). |
| Bend a segment | Drag the small diamond in the middle of the segment up or down. |
| Shift the curve against the kick (OFFSET) | Drag the vertical KICK line left or right, −50 .. +50 ms. Hold **Shift** for finer steps. |

A hint line under the visualizer repeats these moves.

**OFFSET:** a negative offset brings the rumble down *before* the kick lands; a positive one lets
some rumble overlap the kick's attack. A negative offset works only with the GRID trigger (it knows
where the next beat is); with KICK it counts as 0.

The curve, its points and its OFFSET are saved with presets and with your DAW session. They are not
host parameters (they can't be automated).
