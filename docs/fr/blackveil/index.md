---
title: Blackveil en français
parent: Blackveil
nav_order: 13
has_children: true
---

![Blackveil]({{ '/assets/images/blackveil/logo.png' | relative_url }}){: .product-logo }

Blackveil est un générateur de rumble pour la techno. Il prend un kick, celui qui est déjà sur votre
piste ou l'un de ses kicks intégrés, et l'envoie dans une chaîne d'effets (filtre, distorsion,
delay, reverb, EQ, grain). Le résultat est le **rumble** : une queue grave et sombre qui s'installe
entre les kicks. Blackveil abaisse ensuite le rumble sous chaque kick (ducking) et rajoute le kick
sec par-dessus. Vous obtenez tout le son kick + rumble avec un seul plugin.

![La fenêtre de Blackveil]({{ '/assets/images/blackveil/overview.png' | relative_url }})

## Chemin du signal

```
 INPUT                 FX CHAIN (réordonnable)                        MASTER
┌────────┐   ┌──────┬──────┬───────┬────────┬────┬───────┐   ┌──────┐   ┌────────┐   ┌─────────┐
│ SOURCE │ → │FILTER│ DIST │ DELAY │ REVERB │ EQ │ GRAIN │ → │ DUCK │ → │ OUTPUT │ → │ LIMITER │
└────────┘   └──────┴──────┴───────┴────────┴────┴───────┘   └──────┘   └────────┘   └─────────┘
     │          ↑ SEND GATE et NOISE agissent ici                           ↑
     └──────────────────────────── le kick sec ─────────────────────────────┘
```

1. **[SOURCE]({{ site.baseurl }}{% link fr/blackveil/source.md %})** fournit le kick : l'audio de votre piste (EXT)
   ou un kick intégré (SAMPLE).
2. Le kick alimente la **[FX CHAIN]({{ site.baseurl }}{% link fr/blackveil/fx-chain.md %})**. Sa sortie est le rumble.
3. **[DUCK]({{ site.baseurl }}{% link fr/blackveil/duck.md %})** baisse le rumble à chaque kick, selon une courbe que
   vous dessinez dans le visualiseur.
4. **[OUTPUT et LIMITER]({{ site.baseurl }}{% link fr/blackveil/master.md %})** rajoutent le kick sec, règlent la
   phase et la largeur du rumble, et maîtrisent les crêtes.

## Dans ce manuel

| Page | Contenu |
|---|---|
| [Prise en main]({{ site.baseurl }}{% link fr/blackveil/getting-started.md %}) | Installation, Blackveil sur une piste, votre premier rumble |
| [Tutoriel : un rumble de A à Z]({{ site.baseurl }}{% link fr/blackveil/tutorial.md %}) | La construction guidée d'un rumble classique, étape par étape, avec ce qu'il faut écouter |
| [Blackveil dans votre DAW]({{ site.baseurl }}{% link fr/blackveil/in-your-daw.md %}) | Les quatre configurations (sur la piste du kick, une piste de rumble, kick intégré, MIDI), passer en audio, arranger, mixer |
| [La fenêtre]({{ site.baseurl }}{% link fr/blackveil/interface.md %}) | En-tête, visualiseur, modules, pied de fenêtre ; utiliser les contrôles |
| [Source]({{ site.baseurl }}{% link fr/blackveil/source.md %}) | EXT et SAMPLE, les kicks, le déclenchement, KEY |
| [Chaîne d'effets]({{ site.baseurl }}{% link fr/blackveil/fx-chain.md %}) | FILTER, DIST, DELAY, REVERB, EQ, GRAIN ; changer l'ordre |
| [Duck et visualiseur]({{ site.baseurl }}{% link fr/blackveil/duck.md %}) | La courbe de ducking, ses presets, son édition, LOW END, TARGET |
| [Sortie et limiteur]({{ site.baseurl }}{% link fr/blackveil/master.md %}) | OUTPUT, LIMITER, les faders KICK / RUMBLE, SEND GATE, NOISE |
| [Presets et RANDOM]({{ site.baseurl }}{% link fr/blackveil/presets.md %}) | Le navigateur de presets, la sauvegarde, RANDOM, MUTATE, les verrous |
| [BOUNCE]({{ site.baseurl }}{% link fr/blackveil/bounce.md %}) | Glisser le rumble, le kick ou le mix dans votre DAW sous forme audio |
| [Automation]({{ site.baseurl }}{% link fr/blackveil/automation.md %}) | Les paramètres hôte |
| [Astuces et dépannage]({{ site.baseurl }}{% link fr/blackveil/tips.md %}) | Recettes, problèmes courants, questions et réponses |
