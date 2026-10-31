---
title: BOUNCE
parent: Blackveil
nav_order: 10
---

# BOUNCE

BOUNCE turns Blackveil's sound into an audio clip: drag it straight into your DAW.

The white **BOUNCE** button sits in the header, between the preset box and KEY, with a selector
next to it:

| Stem | The clip holds |
|---|---|
| **RUMBLE** (default) | The rumble alone, ducked. |
| **KICK** | The dry kick alone. |
| **MIX** | Everything, as you hear it. |

## Using it

1. Play the transport for at least one full bar.
2. Choose the stem.
3. Drag the BOUNCE button onto a track in your DAW.

You get the **last complete bar** that played, as a WAV file. Loop it, or layer the rumble under
another kick.

If the button says **PLAY FIRST**, Blackveil hasn't recorded a whole bar yet, or the bar was
silent.

## The files

The clips are named after the preset, the stem, the tempo and the key, for example
`Blackveil_Deep-Tunnel_RUMBLE_128bpm_F.wav`, and kept in `%APPDATA%\ShadowDSP\Blackveil\Bounces`.
A bounce never overwrites an older one, since your DAW projects may use it: clear the folder out
yourself when you no longer need them.

{: .note }
BOUNCE counts bars in 4/4.
