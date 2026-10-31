---
title: Output and limiter
parent: Blackveil
nav_order: 8
---

# Output and limiter

After DUCK, OUTPUT adds the dry kick back to the rumble, then the LIMITER catches the peaks of the
whole sound.

## OUTPUT

PHASE, POL and WIDTH act on the rumble only; the dry kick passes untouched.

| Control | Range | Default | |
|---|---|---|---|
| **PHASE** | 0 .. 360° | 0° | Rotates the phase of the rumble's low end. |
| **POL** | + / − | + | Flips the rumble's polarity. |
| **WIDTH** | 0 .. 200 % | 100 % | Stereo width of the rumble. 0 % is mono. |
| **VOLUME** | −60 .. +6 dB | 0 dB | The output level, before the limiter. |

### Lining up the low end

Where the kick and the rumble overlap, their low end can cancel: the result sounds thin, or the
sub drops out. Use POL first, then PHASE, until the low end sounds fullest. PHASE is most exact
around 50 Hz. The OUTPUT display shows the stereo image.

## LIMITER

The last stage, so it also catches the dry kick. It has no lookahead: Blackveil adds no latency.

| Control | Range | Default | |
|---|---|---|---|
| Power | on / off | on | |
| **DRIVE** | 0 .. +12 dB | 0 dB | Gain into the limiter: more is louder and denser. |
| **CEILING** | −12 .. 0 dB | −0.3 dB | The highest level the output reaches. |
| **RELEASE** | 1 .. 500 ms | 60 ms | How fast the limiter lets go. |

The display draws the input level against the output level.

## Footer

![The footer: SEND GATE, NOISE, KICK and RUMBLE]({{ '/assets/images/blackveil/footer.png' | relative_url }})

### KICK and RUMBLE

Two faders at the bottom right, −60 .. +6 dB:

- **KICK**: the dry kick's level. Its speaker button mutes the kick, leaving the rumble alone (to
  layer the rumble under a kick on another track, for example).
- **RUMBLE**: the rumble's level. Its speaker button mutes the rumble and keeps the fader's
  position.

A white speaker button is on; a dim, crossed-out one is muted.

### SEND GATE

How much of each kick feeds the FX chain: only its first 10 ms .. 1 s, then a short fade. FULL
(the default, fully right) sends the whole kick. A short gate keeps the kick's long tail out of the
reverb and delay, so the rumble stays tight and doesn't wash over the next kick. The dry kick isn't
touched.

### NOISE

Adds noise to the FX chain's input, shaped by each kick's envelope, so the chain gets texture to
work on. From OFF (fully left) to 0 dB. The selector sets its colour: **DARK** (around 500 Hz),
**MID** (around 2 kHz), **AIR** (above 5 kHz). The dry kick isn't touched.

{: .note }
NOISE meets the chain's first module first: with the default FILTER (low-pass at 400 Hz) in front,
most of it is filtered away. Put the filter later, or switch it off, to hear more noise.
