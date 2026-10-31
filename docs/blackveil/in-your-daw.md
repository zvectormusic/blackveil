---
title: Blackveil in your DAW
parent: Blackveil
nav_order: 3
---

# Blackveil in your DAW

Blackveil is an audio effect that can also play its own kick. That gives several ways to set it
up, depending on where your kick comes from and whether you want to keep the kick in Blackveil
or elsewhere. The steps below use Ableton Live; other DAWs work the same way with their own
routing.

## Pick a setup

| You have | Use | Blackveil's SOURCE |
|---|---|---|
| A kick on an audio track (a loop, a bounced kick) | [On the kick track](#on-the-kick-track) | EXT |
| A kick you'd rather keep on its own track | [A rumble track next to your kick](#a-rumble-track-next-to-your-kick) | EXT, KICK muted |
| No kick yet, a four-on-the-floor is fine | [Blackveil plays the kick](#blackveil-plays-the-kick) | SAMPLE + GRID |
| A programmed kick pattern (MIDI) | [Kicks from MIDI notes](#kicks-from-midi-notes) | SAMPLE + MIDI |

### On the kick track

The simplest setup: Blackveil replaces your kick with kick + rumble.

1. Put Blackveil on the audio track that holds your kick, after any other effects on it.
2. SOURCE: **EXT** (the default). Set the division to your kick pattern: **1/4** for a kick on
   every beat.
3. Start the transport and load a preset.

{: .important }
In EXT, Blackveil doesn't listen for the kicks: it places them on the host's beat grid, at the
division. So your kick has to sit on the grid. A kick that is off the grid (swung, or a pattern
with gaps) ducks at the wrong moments; use [Kicks from MIDI notes](#kicks-from-midi-notes) for
those.

### A rumble track next to your kick

Keep your kick track as it is and give the rumble its own track, so you can mix, group and
automate them separately.

1. Duplicate your kick track (in Live: right-click its name → **Duplicate**).
2. Put Blackveil on the copy, SOURCE on **EXT**.
3. Mute Blackveil's dry kick with the speaker button next to the **KICK** fader (bottom right).
   The copy now plays the rumble alone, while the original track plays the kick.

![The KICK speaker button (bottom right) mutes the dry kick]({{ '/assets/images/blackveil/footer.png' | relative_url }})

The same works for a kick sampler on a MIDI track: put Blackveil after the sampler on a copy of
the track.

### Blackveil plays the kick

For sketching, or when a built-in kick suits the track.

1. Put Blackveil on an empty audio track.
2. SOURCE: **SAMPLE**, then **GRID** and the division (**1/4**). Pick a kick with the ‹ › arrows,
   or drag your own kick file onto the kick box.
3. Set **KEY** to your track's key: the kick is tuned to it.

### Kicks from MIDI notes

Blackveil plays its kick on every MIDI note it receives, sample-accurately, with the note's
velocity as the level. Any note number works.

1. Put Blackveil on an empty audio track. SOURCE: **SAMPLE**, then **MIDI**.
2. Create a MIDI track. In its **MIDI To** chooser pick the Blackveil track, and in the chooser
   under it pick **Blackveil**.
3. Program your kicks as notes in a clip on the MIDI track.

The duck, FILTER's envelope, SEND GATE and NOISE all restart on each note, so off-grid kicks and
fills work too.

## Turn it into audio

When the rumble is right, you may want it as audio: to edit it, to save CPU, or to keep it if you
change Blackveil later.

- **BOUNCE** (in the header): drag the last bar of the RUMBLE, the KICK or the MIX straight onto
  a track. Quick, and loops perfectly. See [BOUNCE]({% link blackveil/bounce.md %}).
- **Freeze** the track (in Live: right-click the track → **Freeze Track**, then **Flatten** to
  turn it into audio). Good for a whole arrangement with automation.
- **Resample**: record the Blackveil track onto a new audio track (in Live: set the new track's
  input to the Blackveil track, or to **Resampling**, and record).

## Arranging with it

Every control is a host parameter, so you can automate it like any other device (see
[Automation]({% link blackveil/automation.md %})). Ideas:

- **Breakdowns:** pull the **RUMBLE** fader down, or switch the REVERB off, and bring it back for
  the drop.
- **Build-ups:** raise FILTER **CUTOFF** or REVERB **SIZE** over 8 or 16 bars.
- **Variation:** step the DELAY time, or change DUCK's **DEPTH** per section. (The duck curve
  itself isn't a host parameter: it can't be automated.)
- **Sections in other keys:** automate **KEY**.

Presets keep your setup (SOURCE, KEY, the kick) when you load them, so you can try sounds in the
middle of an arrangement without breaking the routing. See
[What a preset holds]({% link blackveil/presets.md %}#what-a-preset-holds).

## Mixing tips

- **Keep the sub mono.** OUTPUT's **WIDTH** widens the rumble; if the low end gets vague on a
  club system, bring WIDTH toward 0 % (mono) or add a mono-bass tool after Blackveil.
- **Leave headroom.** The LIMITER keeps Blackveil's own peaks under its CEILING (−0.3 dB by
  default). If you mix the track lower, lower **VOLUME** rather than letting the limiter work
  hard.
- **Kick and rumble in phase.** If the low end sounds thinner with the rumble than without,
  flip **POL** or turn **PHASE** (see
  [Lining up the low end]({% link blackveil/master.md %}#lining-up-the-low-end)).
- **No latency.** Blackveil adds no delay to the track, so it needs no compensation and is fine
  to play live.
