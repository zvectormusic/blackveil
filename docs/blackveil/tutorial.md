---
title: "Tutorial: a rumble from scratch"
parent: Blackveil
nav_order: 2
---

# Tutorial: a rumble from scratch

This walk-through builds a classic techno rumble step by step, starting from the Init preset. It
takes about ten minutes, and on the way you meet the controls that matter most. Every step says
what to listen for.

You need nothing but Blackveil: it uses one of its built-in kicks, so an empty track is enough.

## 1. Set up

1. Put Blackveil on an empty audio track.
2. Set your DAW's tempo to something techno-ish, 128 to 140 BPM, and start the transport.
   Blackveil follows the host's beat grid, so **keep the transport running** through the whole
   tutorial.
3. Click the preset name in the header, choose **ALL**, and click **Init** (at the top of the
   list). Click outside the browser to close it.
4. In SOURCE, click **SAMPLE**, then **GRID**, and choose **1/4**. You now hear a kick on every
   beat.
5. If you know your track's key, set **KEY** in the header (say F). The kick is tuned to it, and
   later the EQ and the COMB filter will follow it too.

![SOURCE in SAMPLE mode, GRID 1/4, the kick tuned from G to F]({{ '/assets/images/blackveil/source.png' | relative_url }})

{: .tip }
Mute the rumble with the speaker button next to the **RUMBLE** fader (bottom right) to hear the
kick alone, and unmute it again. Do this whenever you want to know what the rumble adds.

## 2. Make the tail

The rumble starts as a long tail made from the kick. Reverb is the classic way to get one.

1. Switch **DIST** and **DELAY** off with the power buttons in their title bars. That leaves
   FILTER, REVERB and EQ.
2. In **REVERB**, choose **DARK**. Set **SIZE** to about 60 % and leave **MIX** at 100 %, so the
   rumble is the tail alone.

**Listen:** a dark wash between the kicks. It's probably too long and too muddy for now. The next
steps fix that.

## 3. Shape it with the filter

A filter after the reverb is what turns a wash into a rumble.

1. Drag **FILTER** by its title bar and drop it on the slot after REVERB. The chain now reads
   REVERB, FILTER...
2. Set **CUTOFF** to about 200 Hz and **RESO** to about 30 %.
3. Turn **ENV** up to about +40 %: each kick opens the filter a little, and **ENV DEC** sets how
   fast it closes again (150 ms is a good start).

![REVERB on DARK, then FILTER at 200 Hz]({{ '/assets/images/blackveil/chain-reverb-filter.png' | relative_url }})

**Listen:** the tail is now a low, rounded thump-and-roll. Higher CUTOFF gives more growl, lower
gives more sub. For a rounder character try the LADDER type; for an acid edge, DIODE.

## 4. Make it breathe: DUCK

Without ducking, the rumble covers the kick. DUCK pulls it down on every kick and lets it swell
back between them. Its curve is the white line in the visualizer.

1. Click through the curve presets along the visualizer's top row: **TIGHT**, **PUMP**,
   **SWELL**... Each one makes the rumble move differently. TIGHT is a good, punchy start.
2. Set **DEPTH** (DUCK, right of the visualizer) between 85 and 100 %. More depth gives the kick
   more room.
3. Try **LOW END** at about 150 Hz: the sub is still ducked firmly, but the rumble's upper part
   keeps moving through the kick, which sounds busier and more "rolling".

![The visualizer with the TIGHT curve over one beat, and DUCK on the right]({{ '/assets/images/blackveil/duck.png' | relative_url }})

To fine-tune the curve, drag its points. Double-click to add or remove a point, and drag a
diamond to bend a segment. See [Editing the curve]({% link blackveil/duck.md %}#editing-the-curve).

## 5. Keep it tight: SEND GATE

The kick's own tail also goes into the reverb, which can make the rumble build up and smear.
Move the **SEND GATE** slider (bottom left) from FULL down to about 100 ms: only the first 100 ms
of each kick feeds the chain.

![The footer: SEND GATE at 100 ms, NOISE, the KICK and RUMBLE faders]({{ '/assets/images/blackveil/footer.png' | relative_url }})

**Listen:** each rumble now starts cleanly and dies before the next kick. The dry kick isn't
changed.

## 6. Add character

1. Switch **DIST** back on and drag it **before REVERB**. Choose **TAPE**, set **DRIVE** to about
   50 %. Distortion before the reverb gives a dirty, saturated tail.
2. In **EQ**, leave the type on **BELL** and set **GAIN** to +3 or +4 dB. With KEY set, **FREQ**
   snaps to your key's root or fifth: the boost reinforces the right note. **SUB CUT** keeps the
   boost from piling up energy below it.

![The finished chain: DIST, REVERB, FILTER, then EQ snapped to C, the fifth of F]({{ '/assets/images/blackveil/chain-final.png' | relative_url }})

## 7. Line up the low end

Where the kick and the rumble overlap, their lows can cancel each other out, and the result sounds
thin. In **OUTPUT**, flip **POL** to − and back to + and keep the fuller one. Then slowly turn
**PHASE** until the low end sounds the fullest. See
[Lining up the low end]({% link blackveil/master.md %}#lining-up-the-low-end).

![OUTPUT: POL, PHASE, WIDTH and VOLUME]({{ '/assets/images/blackveil/output.png' | relative_url }})

## 8. Balance and save

1. Set the balance with the **KICK** and **RUMBLE** faders. A rumble 3 to 6 dB under the kick is
   a common start.
2. The **LIMITER** (on by default) keeps the peaks under its **CEILING**. Push its **DRIVE** for a
   denser, louder result.
3. Click the **floppy disk** in the header, name the sound, pick or create a category, and save.

![The save box]({{ '/assets/images/blackveil/save-box.png' | relative_url }})

That's a complete rumble. Next:

- Run your own kick through it: set SOURCE to **EXT** and see
  [Blackveil in your DAW]({% link blackveil/in-your-daw.md %}).
- Turn it into an audio clip with [BOUNCE]({% link blackveil/bounce.md %}).

## Variations to try

| Change | What you get |
|---|---|
| DELAY on at 1/8, FEEDBACK low, MIX high, DUCK on PUMP | A bassline on the off-beats, made from the kick. |
| REVERB on HALL or SHIMMER instead of DARK | A brighter, more spacious rumble. |
| FILTER type COMB (with KEY set) | A tuned, ringing rumble that plays your track's root. |
| GRAIN on (CLOUD or OCT DOWN), after the reverb | A grainy, shifting texture in the tail. |
| NOISE (bottom bar) on DARK, FILTER moved last | More hiss and air in the tail. |
| Shift-click the dice (MUTATE) | Small random variations of your sound; the undo arrow takes them back. |
