---
title: Blackveil dans votre DAW
parent: Blackveil en français
grand_parent: Blackveil
nav_order: 3
---

# Blackveil dans votre DAW

Blackveil est un effet audio qui peut aussi jouer son propre kick. D'où plusieurs façons de le
configurer, selon la provenance de votre kick et selon que vous voulez garder le kick dans Blackveil
ou ailleurs. Les étapes ci-dessous utilisent Ableton Live ; les autres DAW fonctionnent de la même
façon, avec leur propre routage.

## Choisir une configuration {#pick-a-setup}

| Vous avez | Utilisez | SOURCE de Blackveil |
|---|---|---|
| Un kick sur une piste audio (une boucle, un kick bouncé) | [Sur la piste du kick](#on-the-kick-track) | EXT |
| Un kick que vous préférez garder sur sa propre piste | [Une piste de rumble à côté du kick](#a-rumble-track-next-to-your-kick) | EXT, KICK coupé |
| Pas encore de kick, un four-on-the-floor convient | [Blackveil joue le kick](#blackveil-plays-the-kick) | SAMPLE + GRID |
| Un motif de kick programmé (MIDI) | [Des kicks depuis des notes MIDI](#kicks-from-midi-notes) | SAMPLE + MIDI |

### Sur la piste du kick {#on-the-kick-track}

La configuration la plus simple : Blackveil remplace votre kick par kick + rumble.

1. Placez Blackveil sur la piste audio qui contient votre kick, après ses autres effets.
2. SOURCE : **EXT** (par défaut). Réglez la division sur votre motif de kick : **1/4** pour un kick
   sur chaque temps.
3. Lancez la lecture et chargez un preset.

{: .important }
En EXT, Blackveil n'écoute pas les kicks : il les place sur la grille de l'hôte, à la division
choisie. Votre kick doit donc être calé sur la grille. Un kick hors grille (swingué, ou un motif avec
des trous) déclenche le ducking au mauvais moment ; pour ces cas-là, utilisez
[Des kicks depuis des notes MIDI](#kicks-from-midi-notes).

### Une piste de rumble à côté du kick {#a-rumble-track-next-to-your-kick}

Gardez votre piste de kick telle quelle et donnez au rumble sa propre piste : vous pouvez alors les
mixer, les grouper et les automatiser séparément.

1. Dupliquez votre piste de kick (dans Live : clic droit sur son nom → **Duplicate**).
2. Placez Blackveil sur la copie, SOURCE sur **EXT**.
3. Coupez le kick sec de Blackveil avec le bouton haut-parleur à côté du fader **KICK** (en bas à
   droite). La copie joue maintenant le rumble seul, et la piste d'origine le kick.

![Le bouton haut-parleur KICK (en bas à droite) coupe le kick sec]({{ '/assets/images/blackveil/footer.png' | relative_url }})

Même principe pour un sampler de kick sur une piste MIDI : placez Blackveil après le sampler, sur une
copie de la piste.

### Blackveil joue le kick {#blackveil-plays-the-kick}

Pour esquisser une idée, ou quand un kick intégré convient au morceau.

1. Placez Blackveil sur une piste audio vide.
2. SOURCE : **SAMPLE**, puis **GRID** et la division (**1/4**). Choisissez un kick avec les flèches
   ‹ ›, ou glissez votre propre fichier de kick sur la case du kick.
3. Réglez **KEY** sur la tonalité du morceau : le kick s'accorde dessus.

### Des kicks depuis des notes MIDI {#kicks-from-midi-notes}

Blackveil joue son kick à chaque note MIDI reçue, à l'échantillon près, avec la vélocité de la note
comme niveau. N'importe quel numéro de note fonctionne.

1. Placez Blackveil sur une piste audio vide. SOURCE : **SAMPLE**, puis **MIDI**.
2. Créez une piste MIDI. Dans son menu **MIDI To**, choisissez la piste de Blackveil, et dans le
   menu en dessous, **Blackveil**.
3. Programmez vos kicks en notes dans un clip de la piste MIDI.

Le ducking, l'enveloppe de FILTER, SEND GATE et NOISE redémarrent tous à chaque note : les kicks hors
grille et les breaks fonctionnent aussi.

## Passer en audio {#turn-it-into-audio}

Quand le rumble est au point, vous pouvez le vouloir en audio : pour l'éditer, économiser du CPU, ou
le garder si vous changez Blackveil plus tard.

- **BOUNCE** (dans l'en-tête) : glissez la dernière mesure du RUMBLE, du KICK ou du MIX directement
  sur une piste. Rapide, et la boucle est parfaite. Voir [BOUNCE]({% link fr/blackveil/bounce.md %}).
- **Freeze** de la piste (dans Live : clic droit sur la piste → **Freeze Track**, puis **Flatten**
  pour la convertir en audio). Idéal pour tout un arrangement avec automation.
- **Rééchantillonner** : enregistrez la piste de Blackveil sur une nouvelle piste audio (dans Live :
  réglez l'entrée de la nouvelle piste sur la piste de Blackveil, ou sur **Resampling**, et
  enregistrez).

## Arranger avec {#arranging-with-it}

Chaque contrôle est un paramètre hôte : vous pouvez l'automatiser comme sur n'importe quel appareil
(voir [Automation]({% link fr/blackveil/automation.md %})). Quelques idées :

- **Breaks :** baissez le fader **RUMBLE**, ou éteignez la REVERB, et ramenez-les pour le drop.
- **Montées :** augmentez le **CUTOFF** de FILTER ou la **SIZE** de REVERB sur 8 ou 16 mesures.
- **Variation :** changez le temps du DELAY, ou la **DEPTH** de DUCK selon la section. (La courbe de
  ducking elle-même n'est pas un paramètre hôte : elle ne s'automatise pas.)
- **Sections dans d'autres tonalités :** automatisez **KEY**.

Les presets gardent votre configuration (SOURCE, KEY, le kick) quand vous les chargez : vous pouvez
essayer des sons en plein arrangement sans casser le routage. Voir
[Ce que contient un preset]({% link fr/blackveil/presets.md %}#what-a-preset-holds).

## Conseils de mixage {#mixing-tips}

- **Gardez le sub en mono.** La **WIDTH** d'OUTPUT élargit le rumble ; si le bas devient flou sur un
  système de club, ramenez WIDTH vers 0 % (mono) ou ajoutez un outil de basses mono après Blackveil.
- **Gardez de la marge.** Le LIMITER maintient les crêtes de Blackveil sous son CEILING (−0,3 dB par
  défaut). Si vous mixez la piste plus bas, baissez **VOLUME** plutôt que de faire travailler le
  limiteur.
- **Kick et rumble en phase.** Si le bas sonne plus maigre avec le rumble que sans, basculez **POL**
  ou tournez **PHASE** (voir
  [Aligner le bas du spectre]({% link fr/blackveil/master.md %}#lining-up-the-low-end)).
- **Pas de latence.** Blackveil n'ajoute aucun retard à la piste : aucune compensation nécessaire, et
  il se joue sans problème en live.
