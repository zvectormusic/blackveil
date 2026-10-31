---
title: Blackveil
nav_order: 1
# the site's home page (the only plugin so far; the old /blackveil/ address: blackveil-redirect.html)
permalink: /
has_children: true
---

![Blackveil]({{ '/assets/images/blackveil/logo.png' | relative_url }}){: .product-logo }

Blackveil is a rumble generator for techno. It takes a kick, either the one already on your track
or one of its own built-in kicks, and sends it through a chain of effects (filter, distortion,
delay, reverb, EQ, grain). The result is the **rumble**: a dark low-end tail that sits between the
kicks. Blackveil then ducks the rumble under each kick and adds the dry kick back on top. You get
the whole kick-and-rumble sound from one plugin.

![The Blackveil window]({{ '/assets/images/blackveil/overview.png' | relative_url }})

## Signal flow

```
 INPUT                 FX CHAIN (reorderable)                         MASTER
┌────────┐   ┌──────┬──────┬───────┬────────┬────┬───────┐   ┌──────┐   ┌────────┐   ┌─────────┐
│ SOURCE │ → │FILTER│ DIST │ DELAY │ REVERB │ EQ │ GRAIN │ → │ DUCK │ → │ OUTPUT │ → │ LIMITER │
└────────┘   └──────┴──────┴───────┴────────┴────┴───────┘   └──────┘   └────────┘   └─────────┘
     │          ↑ SEND GATE and NOISE act here                              ↑
     └──────────────────────────── the dry kick ────────────────────────────┘
```

1. **[SOURCE]({{ site.baseurl }}{% link blackveil/source.md %})** provides the kick: your track's audio (EXT) or a
   built-in kick sample (SAMPLE).
2. The kick feeds the **[FX CHAIN]({{ site.baseurl }}{% link blackveil/fx-chain.md %})**. Its output is the rumble.
3. **[DUCK]({{ site.baseurl }}{% link blackveil/duck.md %})** turns the rumble down on each kick, following a curve
   you draw in the visualizer.
4. **[OUTPUT and LIMITER]({{ site.baseurl }}{% link blackveil/master.md %})** add the dry kick back, set the
   rumble's phase and width, keep the low end mono, and keep the peaks in check.

## In this manual

| Page | Covers |
|---|---|
| [Getting started]({{ site.baseurl }}{% link blackveil/getting-started.md %}) | Installing, putting Blackveil on a track, your first rumble |
| [Tutorial: a rumble from scratch]({{ site.baseurl }}{% link blackveil/tutorial.md %}) | A guided build of a classic rumble, step by step, with what to listen for |
| [Blackveil in your DAW]({{ site.baseurl }}{% link blackveil/in-your-daw.md %}) | The four setups (on the kick track, a rumble track, built-in kick, MIDI), turning it into audio, arranging, mixing |
| [The window]({{ site.baseurl }}{% link blackveil/interface.md %}) | Header, visualizer, modules, footer; how the controls work |
| [Source]({{ site.baseurl }}{% link blackveil/source.md %}) | EXT and SAMPLE, the kick set, triggering, KEY |
| [FX chain]({{ site.baseurl }}{% link blackveil/fx-chain.md %}) | FILTER, DIST, DELAY, REVERB, EQ, GRAIN; reordering |
| [Duck and the visualizer]({{ site.baseurl }}{% link blackveil/duck.md %}) | The duck curve, its presets, editing it, LOW END, TARGET |
| [Output and limiter]({{ site.baseurl }}{% link blackveil/master.md %}) | OUTPUT, LIMITER, the KICK / RUMBLE faders, SEND GATE, NOISE |
| [Presets and RANDOM]({{ site.baseurl }}{% link blackveil/presets.md %}) | The preset browser, saving, RANDOM, MUTATE, locks |
| [BOUNCE]({{ site.baseurl }}{% link blackveil/bounce.md %}) | Dragging the rumble, the kick or the mix into your DAW as audio |
| [Automation]({{ site.baseurl }}{% link blackveil/automation.md %}) | The host parameters |
| [Tips and troubleshooting]({{ site.baseurl }}{% link blackveil/tips.md %}) | Recipes, common problems, questions and answers |

Ce manuel existe aussi [en français]({{ site.baseurl }}{% link fr/blackveil/index.md %}).
