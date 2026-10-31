---
title: Tips and troubleshooting
parent: Blackveil
nav_order: 12
---

# Tips and troubleshooting

## Recipes

**A classic rolling rumble.** REVERB DARK or HALL at MIX 100 %, FILTER low-pass around 200 Hz
after it, DUCK preset TIGHT, LOW END FULL. SEND GATE around 100 ms keeps the tail from smearing.

**Off-beat bass from the kick.** DELAY at 1/8 with FEEDBACK low, MIX high, and DUCK's curve
ducking the beat hard: what's left is the repeat on the off-beat.

**A darker, grainier tail.** DIST before REVERB (TAPE or TUBE, DRIVE 50 %+), then a little CRUSH.
Add NOISE (DARK) with FILTER moved after the reverb.

**A pumping volume shaper on any track.** DUCK trigger GRID, TARGET ALL, a curve preset such as
PUMP. Blackveil then works as a sidechain-style shaper with no kick needed (switch the FX chain
off, or use RUMBLE's mute, to pass the track through).

**The rumble in key.** Set KEY to your track's root: the EQ's FREQ snaps to the root or fifth, so
the boost reinforces the right note.

## Troubleshooting

| Problem | Try |
|---|---|
| No rumble, only the kick | Start the transport (EXT and GRID need it). Check that at least one of FILTER, DIST, DELAY, REVERB is on, and that RUMBLE isn't muted or at −60 dB. |
| In SAMPLE + MIDI, no kick | Check that your MIDI track sends to Blackveil (in Live: MIDI To → the Blackveil track → Blackveil). |
| The rumble ducks at the wrong time (EXT) | Set SOURCE's division to your kick pattern. Blackveil follows the grid, not the audio. |
| The low end gets thin when the rumble comes in | Flip POL, then turn PHASE (see [Lining up the low end]({{ site.baseurl }}{% link blackveil/master.md %}#lining-up-the-low-end)). |
| Too loud or clipping | Lower SOURCE LEVEL or VOLUME; the LIMITER's CEILING sets the maximum. |
| A preset load didn't change my kick | That's by design: presets keep the setup. See [What a preset holds]({{ site.baseurl }}{% link blackveil/presets.md %}#what-a-preset-holds). |
| BOUNCE says PLAY FIRST | Let a full bar play with sound, then drag again. |
| The factory presets are missing | Delete `%APPDATA%\ShadowDSP\Blackveil\User Presets` (after backing up your own presets) and restart the DAW: Blackveil unpacks them again. |

## Questions and answers

**Does Blackveil detect my kicks?**
No. In EXT it places the kicks on the host's beat grid, at SOURCE's division. That is what makes it
tight and latency-free, but your kick has to be on the grid. For other patterns, let Blackveil play
the kick from MIDI notes (see [Kicks from MIDI notes]({{ site.baseurl }}{% link blackveil/in-your-daw.md %}#kicks-from-midi-notes)).

**Does it add latency?**
No. Nothing in Blackveil looks ahead, the limiter included.

**Why does nothing happen when the transport is stopped?**
EXT and GRID take their timing from the host's transport. Only SAMPLE + MIDI plays without it.

**Can I use it on something other than a kick?**
Yes. Any audio in EXT becomes the source for the FX chain, timed by the grid. With DUCK on GRID and
TARGET ALL, Blackveil is also a tempo-synced volume shaper for pads, basses or whole groups.

**Can I share presets?**
Yes: a preset is a `.preset` file in `%APPDATA%\ShadowDSP\Blackveil\User Presets\<category>`. Copy
it into the same place on the other computer. A preset that uses your own kick file stores the
file's path, not the sound, so send the kick along and keep it at the same path.

**Where do my bounces go?**
To `%APPDATA%\ShadowDSP\Blackveil\Bounces`. Blackveil never deletes or overwrites them, because
your projects may use them: clean the folder out yourself now and then.

**The window is too small or too big.**
Click **SIZE** in the header: S (80 %), M (100 %) and L (125 %). Blackveil remembers it for you,
in every project.
