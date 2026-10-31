---
title: The window
parent: Blackveil
nav_order: 4
---

# The window

Everything is on one screen, laid out left to right in the order the signal flows.

![The Blackveil window]({{ '/assets/images/blackveil/overview.png' | relative_url }})

## Header

![The header]({{ '/assets/images/blackveil/header.png' | relative_url }})

From left to right:

| Control | What it does |
|---|---|
| **Dice (RANDOM)** | Click: a new sound. Shift-click: MUTATE, small changes to the current sound. See [RANDOM]({{ site.baseurl }}{% link blackveil/presets.md %}#random). |
| **Undo arrow** | Takes back the last RANDOM roll (up to 8). |
| **Preset box** | The current preset. ‹ › step through presets; click the name to open the browser. A dot means the sound changed since it was loaded. |
| **Floppy disk** | Saves the current sound as a preset. |
| **Stem + BOUNCE** | Drag BOUNCE into your DAW to get the last bar of the chosen stem (RUMBLE, KICK or MIX). See [Bounce]({{ site.baseurl }}{% link blackveil/bounce.md %}). |
| **KEY** | The root note of your track (OFF, C .. B). Tunes the SAMPLE kick and snaps EQ FREQ to the key. See [Source]({{ site.baseurl }}{% link blackveil/source.md %}#key). |
| **SIZE** | Steps the window size: S (80 %), M (100 %), L (125 %), then back to S. Remembered per user, not per session. |

## Visualizer

The large display at the top shows one beat of the sound, captured while the host plays, and the
duck curve over it, with the curve presets along its top row. DUCK's controls sit at its right edge.
See [Duck and the visualizer]({{ site.baseurl }}{% link blackveil/duck.md %}).

## Modules

Under the visualizer, the modules sit in three groups:

- **INPUT**: SOURCE.
- **FX CHAIN**: FILTER, DIST, DELAY, REVERB, EQ, GRAIN. These are raised, with a grip: drag a
  module by its title bar to move it in the chain. The arrow at the end of the line shows the
  signal's direction.
- **MASTER**: OUTPUT and LIMITER (fixed in place). The empty slot is reserved for a future module.

Each module has:

- a **title bar** with its icon and, where it can be switched off, a **power button**;
- a **display** that draws what the module does with its current settings (FILTER's response,
  DIST's transfer curve, DELAY's repeats, REVERB's tail, EQ's curve, OUTPUT's stereo image,
  LIMITER's input against output);
- a **selector** (type or mode) and a column of **knobs**;
- in the FX chain, a **lock** in the bottom right corner, which keeps RANDOM away from that module.

A module that is switched off is drawn darker. You can still edit it. Controls that do nothing in
the current setup (for example the sample-only controls in EXT mode) are drawn darker too.

## Footer

| Control | What it does |
|---|---|
| **SEND GATE** | How much of each kick feeds the FX chain. See [Output]({{ site.baseurl }}{% link blackveil/master.md %}#send-gate). |
| **NOISE** + colour | Noise added to the FX chain's input, following each kick. See [Output]({{ site.baseurl }}{% link blackveil/master.md %}#noise). |
| **KICK** + mute | The level of the dry kick in the output. |
| **RUMBLE** + mute | The level of the rumble in the output. |

## Working with controls

- **Knobs and faders:** drag up and down (faders: left and right). Double-click returns a control
  to its default.
- **Switches** (EXT | SAMPLE, KICK | GRID...): click the side you want.
- **Divisions** (1/4, 1/8, 1/2, 1 BAR): click to step to the next one.
- **The mouse wheel** works on knobs and faders, but not on the drawn panels (visualizer, switches,
  the preset browser's list: use its scrollbar).
- Hover over a control to see its value and a short explanation.
