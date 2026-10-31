---
title: La fenêtre
parent: Blackveil en français
grand_parent: Blackveil
nav_order: 4
---

# La fenêtre

Tout tient sur un seul écran, disposé de gauche à droite dans l'ordre du signal.

![La fenêtre de Blackveil]({{ '/assets/images/blackveil/overview.png' | relative_url }})

## En-tête {#header}

![L'en-tête]({{ '/assets/images/blackveil/header.png' | relative_url }})

De gauche à droite :

| Contrôle | Rôle |
|---|---|
| **Dé (RANDOM)** | Clic : un nouveau son. Maj-clic : MUTATE, de petits changements du son actuel. Voir [RANDOM]({{ site.baseurl }}{% link fr/blackveil/presets.md %}#random). |
| **Flèche d'annulation** | Annule le dernier tirage RANDOM (jusqu'à 8). |
| **Case du preset** | Le preset actuel. ‹ › passent d'un preset à l'autre ; un clic sur le nom ouvre le navigateur. Un point signale que le son a changé depuis son chargement. |
| **Disquette** | Sauvegarde le son actuel comme preset. |
| **Stem + BOUNCE** | Glissez BOUNCE dans votre DAW pour obtenir la dernière mesure du stem choisi (RUMBLE, KICK ou MIX). Voir [BOUNCE]({{ site.baseurl }}{% link fr/blackveil/bounce.md %}). |
| **KEY** | La fondamentale de votre morceau (OFF, C .. B). Accorde le kick SAMPLE et aimante EQ FREQ sur la tonalité. Voir [Source]({{ site.baseurl }}{% link fr/blackveil/source.md %}#key). |
| **SIZE** | Change la taille de la fenêtre : S (80 %), M (100 %), L (125 %), puis retour à S. Mémorisée par utilisateur, pas par session. |

## Visualiseur {#visualizer}

Le grand affichage du haut montre un temps du son, capturé pendant la lecture de l'hôte, avec la
courbe de ducking par-dessus et les presets de courbe sur sa ligne du haut. Les contrôles de DUCK
sont sur son bord droit. Voir [Duck et visualiseur]({{ site.baseurl }}{% link fr/blackveil/duck.md %}).

## Modules {#modules}

Sous le visualiseur, les modules forment trois groupes :

- **INPUT** : SOURCE.
- **FX CHAIN** : FILTER, DIST, DELAY, REVERB, EQ, GRAIN. Ils sont surélevés, avec une poignée :
  faites glisser un module par sa barre de titre pour le déplacer dans la chaîne. La flèche en bout
  de ligne indique le sens du signal.
- **MASTER** : OUTPUT et LIMITER (fixes). L'emplacement vide est réservé à un futur module.

Chaque module comporte :

- une **barre de titre** avec son icône et, s'il peut être éteint, un **bouton d'alimentation** ;
- un **affichage** qui dessine ce que fait le module avec ses réglages actuels (la réponse de FILTER,
  la courbe de transfert de DIST, les répétitions de DELAY, la queue de REVERB, la courbe de l'EQ,
  l'image stéréo d'OUTPUT, l'entrée face à la sortie du LIMITER) ;
- un **sélecteur** (type ou mode) et une colonne de **potentiomètres** ;
- dans la chaîne d'effets, un **verrou** en bas à droite, qui tient RANDOM à l'écart de ce module.

Un module éteint est dessiné plus sombre. Vous pouvez toujours le régler. Les contrôles sans effet
dans la configuration actuelle (par exemple ceux réservés au sample en mode EXT) sont aussi plus
sombres.

## Pied de fenêtre {#footer}

| Contrôle | Rôle |
|---|---|
| **SEND GATE** | La part de chaque kick qui alimente la chaîne d'effets. Voir [Sortie]({{ site.baseurl }}{% link fr/blackveil/master.md %}#send-gate). |
| **NOISE** + couleur | Du bruit ajouté à l'entrée de la chaîne, qui suit chaque kick. Voir [Sortie]({{ site.baseurl }}{% link fr/blackveil/master.md %}#noise). |
| **KICK** + coupure | Le niveau du kick sec dans la sortie. |
| **RUMBLE** + coupure | Le niveau du rumble dans la sortie. |

## Utiliser les contrôles {#working-with-controls}

- **Potentiomètres et faders :** faites glisser vers le haut et le bas (faders : gauche et droite).
  Un double-clic ramène un contrôle à sa valeur par défaut.
- **Interrupteurs** (EXT | SAMPLE, KICK | GRID...) : cliquez sur le côté voulu.
- **Divisions** (1/4, 1/8, 1/2, 1 BAR) : cliquez pour passer à la suivante.
- **La molette** fonctionne sur les potentiomètres et les faders, mais pas sur les panneaux dessinés
  (visualiseur, interrupteurs, liste du navigateur de presets : utilisez sa barre de défilement).
- Survolez un contrôle pour voir sa valeur et une courte explication.
