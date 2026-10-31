---
title: Duck et visualiseur
parent: Blackveil en français
nav_order: 7
---

# Duck et visualiseur

DUCK baisse le rumble à chaque kick et le laisse remonter entre eux, selon une courbe. Cette courbe
est dessinée, et éditée, dans le visualiseur.

## Lire le visualiseur {#reading-the-visualizer}

Le visualiseur montre **un temps**, capturé pendant la lecture de l'hôte. Il garde la dernière
capture à l'écran quand la lecture s'arrête.

| Couche | Ce que c'est |
|---|---|
| **Gris, plein** (derrière) | Le kick entrant. |
| **Forme d'onde blanche** (devant) | Ce sur quoi agit DUCK, après ducking : le rumble, ou avec TARGET ALL, rumble et kick. |
| **Ligne blanche** | La courbe de ducking : plein niveau en haut, totalement abaissé en bas. |
| **Ligne verticale** | L'endroit où tombe le kick (ou le temps de la grille). |

## Les contrôles de DUCK {#ducks-controls}

Sur le bord droit du visualiseur :

| Contrôle | Plage | Défaut | |
|---|---|---|---|
| **Déclenchement** | KICK / GRID + division | KICK | KICK : la courbe redémarre à chaque kick (ceux du SAMPLE ; en EXT, la grille de SOURCE). GRID : sur la grille de l'hôte, à sa propre division, indépendamment du kick. |
| **Cible** | RUMBLE / ALL | RUMBLE | RUMBLE : seul le rumble est abaissé, le kick reste au-dessus. ALL : toute la sortie, kick compris ; avec GRID, cela fonctionne comme un modulateur de volume sur n'importe quelle piste. |
| **DEPTH** | 0 .. 100 % | 85 % | De combien la courbe baisse le niveau. |
| **LOW END** | 40 Hz .. 2 kHz, FULL | FULL | DUCK n'agit que sous cette fréquence ; les aigus passent sans ducking. FULL abaisse toute la bande. Vers 150 Hz, le sub est abaissé aussi fermement qu'avec FULL et le haut du rumble continue de bouger. |

Le verrou au bout du titre de DUCK empêche RANDOM de modifier la courbe.

## Presets de courbe {#curve-presets}

Les boutons CURVE en haut du visualiseur chargent une courbe : **TIGHT, PUMP, SMOOTH, LONG, GATE,
SNAP, SWELL, DOUBLE**. Le bouton s'allume tant que la courbe lui correspond. Charger un preset garde
votre OFFSET.

## Éditer la courbe {#editing-the-curve}

La courbe couvre un temps (1/4) et se compose de points reliés par des segments courbables.

| Pour | Faites |
|---|---|
| Déplacer un point | Faites-le glisser. Les points s'aimantent sur une grille ; maintenez **Maj** pour un mouvement libre. Le premier et le dernier point ne bougent que verticalement. |
| Ajouter un point | Double-cliquez dans la zone de la courbe (jusqu'à 16 points). |
| Retirer un point | Double-cliquez dessus (sauf le premier et le dernier). |
| Courber un segment | Faites glisser le petit losange au milieu du segment vers le haut ou le bas. |
| Décaler la courbe par rapport au kick (OFFSET) | Faites glisser la ligne verticale KICK vers la gauche ou la droite, −50 .. +50 ms. Maintenez **Maj** pour des pas plus fins. |

Une ligne d'aide sous le visualiseur rappelle ces gestes.

**OFFSET :** un décalage négatif fait descendre le rumble *avant* l'arrivée du kick ; un positif
laisse un peu de rumble chevaucher l'attaque du kick. Un décalage négatif ne fonctionne qu'avec le
déclenchement GRID (qui sait où tombe le prochain temps) ; avec KICK, il compte comme 0.

La courbe, ses points et son OFFSET sont sauvegardés avec les presets et avec votre session DAW. Ce ne
sont pas des paramètres hôte (ils ne s'automatisent pas).
