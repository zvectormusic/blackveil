---
title: Presets and RANDOM
parent: Blackveil
nav_order: 9
---

# Presets and RANDOM

## What a preset holds

A preset is a **sound**: the FX chain and its order, DUCK and its curve, OUTPUT, LIMITER, the
levels. Loading a preset **keeps your setup**: SOURCE (EXT or SAMPLE, the trigger and the
division), KEY and the selected kick (a built-in one or your own file) stay as they are, always.
So you can browse presets while your kick keeps playing the same way.

Your DAW session, on the other hand, restores everything.

## The preset box

In the header:

- **‹ ›** step to the previous / next preset in the browser's current category.
- **Click the name** to open the browser.
- **The floppy disk** saves.
- **A dot** after the name: you changed the sound since you loaded or saved it.

## The browser

![The preset browser]({{ '/assets/images/blackveil/browser.png' | relative_url }})

- **Categories** on the left: ALL (with Init on top), FAVORITES, the factory categories
  (Rumble, Hypnotic, Industrial, Movement, Sub), User, and your own.
- **Search** filters as you type.
- **A click loads** the preset and leaves the browser open, so you can audition one after another.
  Click outside the browser to close it.
- **The star** marks a favourite.
- **Scroll** the list with the mouse wheel, or drag its scrollbar.
- **Right-click** a preset of yours: Rename, Duplicate, **Move to** (one of your categories, or New
  category... to make one), Delete. On a factory preset (it has a lock): Duplicate to User.

## Saving

The floppy disk opens the save box:

![The save box]({{ '/assets/images/blackveil/save-box.png' | relative_url }})

- **NAME**: the current preset's name (a factory one gets " 2"; after Init, "My Preset").
- **CATEGORY**: one of your categories, or "+ New category...".

A name that already exists asks before overwriting. Factory presets can't be overwritten, renamed,
moved or deleted.

Presets are stored in `%APPDATA%\ShadowDSP\Blackveil\User Presets`, one folder per category.

## RANDOM

The dice in the header makes a new sound:

- **Click**: a new sound. RANDOM picks the FX chain's modules, their settings and their order, EQ,
  and DUCK's curve and depth, all within ranges that sound musical. Each roll starts from one of a
  few recipes: a reverb rumble filtered after the reverb, the same driven through DIST, a delay
  rumble, a reverb with GRAIN, or a tuned rumble (band pass or COMB after the reverb). So there is
  always a tail (REVERB, or DELAY with audible repeats), and the filter stays where the kick's
  body is.
- **Shift-click: MUTATE.** Small changes to every knob of the current sound: a variation, not a
  new sound.
- **The undo arrow** next to the dice takes back the last roll, up to 8 rolls.

RANDOM never touches the setup: SOURCE, KEY, SEND GATE, DUCK's trigger and target, the levels,
OUTPUT and LIMITER.

### Locks

Each FX module has a lock in its bottom right corner, and DUCK has one at the end of its title.
A locked module keeps its settings and its place in the chain; RANDOM rearranges the others around
it, and only uses recipes that fit what you locked (REVERB locked off: delay rumbles only). Locks
aren't saved.
