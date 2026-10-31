---
title: Getting started
parent: Blackveil
nav_order: 1
---

# Getting started

## Requirements

- Windows 10 or 11, 64-bit
- A VST3 host (DAW). Blackveil is tested in Ableton Live.

## Installing

1. Close your DAW.
2. Run `Blackveil-<version>-Setup.exe` and follow it. It installs `Blackveil.vst3` into
   `C:\Program Files\Common Files\VST3\` (it asks for administrator rights for that folder).
   The installer isn't signed yet, so Windows may show "Windows protected your PC": click
   **More info**, then **Run anyway**.
3. Start the DAW and let it rescan its plugins. Blackveil appears as an **audio effect** from
   ShadowDSP.

A new version installs the same way, over the old one. To remove Blackveil, uninstall it from
Windows' **Settings > Apps**. Updating or uninstalling never touches your presets.

The factory presets are unpacked on the first start into
`%APPDATA%\ShadowDSP\Blackveil\User Presets`. Your own presets, favourites and bounced audio live in
`%APPDATA%\ShadowDSP\Blackveil` as well.

## Your first rumble (your own kick)

1. Put Blackveil on the track that holds your kick.
2. Start the transport. Blackveil follows the host's tempo and beat grid, so it needs the
   transport running.
3. In SOURCE, leave **EXT** selected and set the division to match your kick pattern (1/4 for a
   four-on-the-floor kick).
4. Load a preset from the **Rumble** category: click the preset name in the header.
5. Balance the sound with the **KICK** and **RUMBLE** faders at the bottom right.

## Your first rumble (a built-in kick)

1. Put Blackveil on any track (an empty audio track works). In SAMPLE mode Blackveil replaces the
   track's audio with its own kick.
2. In SOURCE, click **SAMPLE**. Pick a kick with the ‹ › arrows.
3. Choose how the kick is played:
   - **GRID**: Blackveil plays the kick on the host's beat grid by itself (1/4 = every beat).
   - **MIDI**: Blackveil plays the kick on each MIDI note it receives. In Ableton Live, create a
     MIDI track, set its **MIDI To** to the track with Blackveil, and pick Blackveil in the second
     chooser. Program the kicks as notes; velocity sets the kick's level.
4. Start the transport and load a preset.

## Next steps

- Follow the [tutorial]({% link blackveil/tutorial.md %}): a complete rumble in ten minutes.
- Choose the right routing for your track in [Blackveil in your DAW]({% link blackveil/in-your-daw.md %}).
- Read [The window]({% link blackveil/interface.md %}) for a tour of every section.
- Shape how the rumble breathes around the kick in [Duck and the visualizer]({% link blackveil/duck.md %}).
- Roll the dice: [RANDOM]({% link blackveil/presets.md %}#random) gives a new sound in one click.
