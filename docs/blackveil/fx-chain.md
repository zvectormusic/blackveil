---
title: FX chain
parent: Blackveil
nav_order: 6
---

# FX chain

The FX chain makes the rumble from the kick. It has six modules. The signal runs through them
from left to right, and you can put them in any order.

- **Reorder:** drag a module by its title bar and drop it in another slot. Distortion before the
  reverb gives a dirty tail; after it, a dirty room. A filter after the reverb tames its tail.
- **Switch off:** the power button in the title bar. Off modules are drawn darker and pass the
  signal through. Switching fades, so it doesn't click.
- **Lock:** the lock in a module's bottom right corner keeps [RANDOM]({% link blackveil/presets.md %}#random)
  from changing it or moving it.

Default order: FILTER, DIST, DELAY, REVERB, EQ, GRAIN (GRAIN off).

{: .note }
With FILTER, DIST, DELAY and REVERB all off there is no rumble: the output is the dry kick alone.
EQ and GRAIN on their own don't make a rumble.

## FILTER

A resonant filter with an envelope that opens (or closes) it on every kick.

| Control | Range | Default | |
|---|---|---|---|
| Type | LP 12 / LP 24 / BP 12 / BP 24 / HP 12 / HP 24 dB, LADDER, DIODE, DIRTY, COMB | LP 24 dB | Low-pass, band-pass or high-pass, 12 or 24 dB per octave; then three low-pass characters and a comb (below). |
| **CUTOFF** | 20 Hz .. 20 kHz | 400 Hz | The cutoff frequency. |
| **RESO** | 0 .. 100 % | 30 % | Resonance. |
| **ENV** | −100 .. +100 % | +40 % | How far each kick moves the cutoff (up to 7 octaves); negative moves it down. |
| **ENV DEC** | 1 .. 2000 ms | 150 ms | How fast the cutoff returns. |

The display draws the filter's response and the envelope's sweep.

**The other types:**

- **LADDER:** a warm 4-pole low-pass. As RESO rises the lows thin out a little: a round, smooth
  rumble.
- **DIODE:** a rubbery, squelchy low-pass with an acid flavour. A little quieter than the others.
- **DIRTY:** a low-pass that saturates in its own resonance: grit without DIST.
- **COMB:** short tuned echoes that ring at CUTOFF and its harmonics; RESO sets how long they ring.
  **With a KEY set, CUTOFF snaps to the key's root** in the nearest octave, so the rumble rings at
  your track's note (the readout shows it, for example `65 Hz C2`). ENV sweeps the pitch, from a
  zap down into the note. The display draws one line per harmonic.

Switching TYPE between these models while the filter rings can click.

## DIST

Distortion. Its curves are level-compensated: DRIVE changes the character, not the rumble's level.

| Control | Range | Default | |
|---|---|---|---|
| Mode | TAPE / TUBE / FOLD / CLIP | TAPE | TAPE and TUBE are soft, FOLD folds the wave back (bright, metallic), CLIP is hard. |
| **DRIVE** | 0 .. 100 % | 40 % | How hard the signal hits the curve. |
| **TONE** | 200 Hz .. 20 kHz | 4 kHz | A low-pass after the distortion. |
| **MIX** | 0 .. 100 % | 100 % | Dry / distorted balance. |
| **CRUSH** | 0 .. 100 % | 0 % | Lo-fi: lowers the sample rate and the bit depth. Subtle under ~40 %. |

The display draws the transfer curve.

## DELAY

A tempo-synced delay with filters in its feedback loop.

| Control | Range | Default | |
|---|---|---|---|
| Time | 1/32, 1/16T, 1/16, 1/16D, 1/8T, 1/8, 1/8D, 1/4T, 1/4, 1/4D, 1/2 | 1/16 | T = triplet, D = dotted. |
| **Ping-pong** (arrows button) | on / off | off | The repeats alternate left and right. Their lows stay in mono. |
| Swing (the thin slider at the top of the display) | -33 .. +33 % | 0 (centre) | Moves every other repeat (the 1st, 3rd...): right = later (a shuffle; the right end is a triplet feel), left = earlier. The other repeats stay on the grid. |
| **FEEDBACK** | 0 .. 95 % | 45 % | How many repeats. |
| **LOW CUT** | 20 Hz .. 1 kHz | 40 Hz | Removes lows from each repeat. |
| **HIGH CUT** | 200 Hz .. 20 kHz | 2.5 kHz | Removes highs from each repeat: repeats get darker. |
| **MIX** | 0 .. 100 % | 50 % | Dry / delayed balance. |

High FEEDBACK saturates softly instead of running away.

## REVERB

| Control | Range | Default | |
|---|---|---|---|
| Type | PLATE / HALL / SPRING / SHIMMER / DARK | PLATE | DARK is a deep, heavily damped space, a classic for rumbles. |
| **SIZE** | 0 .. 100 % | 70 % | Room size and tail length. |
| **DAMP** | 0 .. 100 % | 60 % | High-frequency damping: higher is darker. |
| **WIDTH** | 0 .. 100 % | 40 % | Stereo width of the tail. |
| **MIX** | 0 .. 100 % | 100 % | Dry / reverb balance. At 100 % the rumble is the tail alone. |

## EQ

A tone-shaping EQ for the rumble's body, with a sub cut so a boost doesn't pile up energy under
it.

| Control | Range | Default | |
|---|---|---|---|
| Type | BELL / LOW SHELF / HIGH SHELF | BELL | |
| **FREQ** | 60 .. 400 Hz | 140 Hz | Snaps to the KEY's root or fifth when a KEY is set. |
| **GAIN** | 0 .. +12 dB | +4 dB | |
| **WIDTH** | 0.3 .. 3.0 | 1.0 | The bell's width. |
| **SUB CUT** | 20 .. 80 Hz | 35 Hz | A high-pass under the boost. |

## GRAIN

A granular cloud made from the chain's signal. Off by default.

| Control | Range | Default | |
|---|---|---|---|
| Mode | CLOUD / DETUNE / OCT UP / OCT DOWN / REVERSE | CLOUD | CLOUD: plain grains. DETUNE: slightly detuned grains. OCT UP / OCT DOWN: grains an octave up or down. REVERSE: grains played backwards. |
| **SIZE** | 10 .. 500 ms | 80 ms | The length of each grain. |
| **DENSITY** | 2 .. 100 /s | 25 /s | Grains per second. Low values are sparse on purpose. |
| **SPRAY** | 0 .. 1000 ms | 200 ms | How far back in time grains may start. |
| **MIX** | 0 .. 100 % | 50 % | Dry / grain balance. |
