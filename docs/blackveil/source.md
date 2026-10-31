---
title: Source
parent: Blackveil
nav_order: 5
---

# Source

SOURCE decides which kick drives Blackveil. That kick feeds the FX chain (which makes the rumble
from it), and comes back untouched in the output as the dry kick.

## EXT or SAMPLE

| Mode | The kick is |
|---|---|
| **EXT** (default) | The track's own audio: put Blackveil after your kick. |
| **SAMPLE** | One of Blackveil's built-in kicks, or your own sample. It replaces the track's audio. |

### Where the kicks are, in EXT

In EXT, Blackveil doesn't listen for kicks in the audio. It takes the kick positions from the host's
beat grid, at the **division** set in SOURCE (1/4, 1/8, 1/2 or 1 BAR). The duck, FILTER's envelope,
SEND GATE and NOISE all restart on those positions. So:

- start the transport, or Blackveil has no kick positions;
- set the division to your kick pattern. For a kick on every beat, 1/4.

The trigger switch shows GRID (dimmed) in EXT: it has no other choice.

## The kick set (SAMPLE)

The ‹ › arrows step through the built-in kicks. Under the kick's name, the subtitle shows its note,
and with a KEY set the note it plays at (for example `G › F`).

### Your own kicks

Drag an audio file (WAV, AIFF or FLAC) from your file browser onto the kick box. It loads at once
and SOURCE switches to SAMPLE. The ‹ › arrows then step through the audio files in that file's
folder, and the subtitle shows the folder's name and the kick's place in it (`My Kicks · 3 / 24`).

- **Right-click** the kick box: **Load a kick file...** opens a file browser, **Factory kicks**
  goes back to the built-in set (at the kick you had before).
- **Mono or stereo, any sample rate:** a mono file plays in both channels; the pitch stays right.
- **KEY** reads the kick's note from the end of its name, like the built-in kicks: `Kick 07 F#`,
  `kick-G`, `Kick_01_A`. A name that ends in a single letter from A to G counts as a note too.
- **Blackveil plays the file from where it is.** Your Live set and your presets remember its path,
  not the sound. If the file has moved or the set opens on another computer, the built-in kick
  plays and the subtitle shows **MISSING** with the file's name. Put the file back and reopen the
  set, or pick another kick.

### Triggering

| Trigger | The kick plays |
|---|---|
| **GRID** | On the host's beat grid, at the division (1/4, 1/8, 1/2, 1 BAR). The transport must run. |
| **MIDI** | On every MIDI note Blackveil receives, sample-accurately. Velocity sets the level. The note number is ignored. |

## Knobs

| Knob | Range | Default | What it does |
|---|---|---|---|
| **TUNE** | −24 .. +24 st | 0 | Transposes the SAMPLE kick. |
| **DECAY** | 20 .. 2000 ms | 2000 ms | Shortens the SAMPLE kick (an amplitude decay). |
| **PITCH** | 0 .. 48 st | 0 | A pitch envelope on the SAMPLE kick: how far above its pitch it starts. |
| **P.DECAY** | 1 .. 1000 ms | 60 ms | How fast the pitch envelope falls back. |
| **DRIVE** | 0 .. 100 % | 20 % | Saturates the kick (both modes). |
| **LEVEL** | −24 .. +12 dB | 0 dB | The kick's level, into the chain and in the output (both modes). |

TUNE, DECAY, PITCH and P.DECAY act on the SAMPLE kick only; in EXT they are drawn dimmed.

## KEY

The **KEY** selector in the header sets the root note of your track (OFF, C .. B).

- **The SAMPLE kick is tuned to the key.** Each built-in kick knows its own note (it's in the file
  name). Blackveil transposes it the shortest way (5 semitones down to 6 up), on top of
  TUNE. A kick whose note is unknown isn't tuned.
- **EQ FREQ snaps to the key**: to the root or the fifth, whichever is nearest. Its readout shows
  the note, for example `131 Hz C3`.
- **FILTER's COMB rings at the key**: its CUTOFF snaps to the root in the nearest octave.

KEY doesn't change an EXT kick: tune your own kick in your DAW.
