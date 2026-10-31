---
title: Prise en main
parent: Blackveil en français
grand_parent: Blackveil
nav_order: 1
---

# Prise en main

## Configuration requise

- Windows 10 ou 11, 64 bits
- Un hôte VST3 (DAW). Blackveil est testé dans Ableton Live.

## Installation

1. Fermez votre DAW.
2. Copiez `Blackveil.vst3` dans `C:\Program Files\Common Files\VST3\`.
3. Lancez le DAW et laissez-le rescanner ses plugins. Blackveil apparaît comme **effet audio** de
   ShadowDSP.

Les presets d'usine sont installés au premier lancement dans
`%APPDATA%\ShadowDSP\Blackveil\User Presets`. Vos propres presets, vos favoris et vos fichiers
bouncés se trouvent aussi dans `%APPDATA%\ShadowDSP\Blackveil`.

## Votre premier rumble (votre propre kick)

1. Placez Blackveil sur la piste qui contient votre kick.
2. Lancez la lecture. Blackveil suit le tempo et la grille de l'hôte : la lecture doit tourner.
3. Dans SOURCE, laissez **EXT** sélectionné et réglez la division sur votre motif de kick (1/4 pour
   un kick sur chaque temps).
4. Chargez un preset de la catégorie **Rumble** : cliquez sur le nom du preset dans l'en-tête.
5. Équilibrez le son avec les faders **KICK** et **RUMBLE** en bas à droite.

## Votre premier rumble (un kick intégré)

1. Placez Blackveil sur n'importe quelle piste (une piste audio vide convient). En mode SAMPLE,
   Blackveil remplace l'audio de la piste par son propre kick.
2. Dans SOURCE, cliquez sur **SAMPLE**. Choisissez un kick avec les flèches ‹ ›.
3. Choisissez comment le kick est joué :
   - **GRID** : Blackveil joue le kick tout seul sur la grille de l'hôte (1/4 = chaque temps).
   - **MIDI** : Blackveil joue le kick à chaque note MIDI reçue. Dans Ableton Live, créez une piste
     MIDI, réglez son **MIDI To** sur la piste de Blackveil, puis choisissez Blackveil dans le
     second menu. Programmez les kicks en notes ; la vélocité règle le niveau du kick.
4. Lancez la lecture et chargez un preset.

## Et ensuite

- Suivez le [tutoriel]({% link fr/blackveil/tutorial.md %}) : un rumble complet en dix minutes.
- Choisissez le bon routage pour votre morceau dans
  [Blackveil dans votre DAW]({% link fr/blackveil/in-your-daw.md %}).
- Lisez [La fenêtre]({% link fr/blackveil/interface.md %}) pour faire le tour de chaque section.
- Façonnez la respiration du rumble autour du kick dans
  [Duck et visualiseur]({% link fr/blackveil/duck.md %}).
- Lancez les dés : [RANDOM]({% link fr/blackveil/presets.md %}#random) donne un nouveau son en un
  clic.
