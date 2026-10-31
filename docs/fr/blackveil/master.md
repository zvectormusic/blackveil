---
title: Sortie et limiteur
parent: Blackveil en français
nav_order: 8
---

# Sortie et limiteur

Après DUCK, OUTPUT rajoute le kick sec au rumble, puis le LIMITER rattrape les crêtes de l'ensemble.

## OUTPUT {#output}

PHASE, POL et WIDTH n'agissent que sur le rumble ; le kick sec passe intact.

| Contrôle | Plage | Défaut | |
|---|---|---|---|
| **PHASE** | 0 .. 360° | 0° | Fait tourner la phase du bas du rumble. |
| **POL** | + / − | + | Inverse la polarité du rumble. |
| **WIDTH** | 0 .. 200 % | 100 % | La largeur stéréo du rumble. 0 % est mono. |
| **VOLUME** | −60 .. +6 dB | 0 dB | Le niveau de sortie, avant le limiteur. |

### Aligner le bas du spectre {#lining-up-the-low-end}

Là où le kick et le rumble se chevauchent, leurs graves peuvent s'annuler : le résultat sonne maigre,
ou le sub disparaît. Utilisez d'abord POL, puis PHASE, jusqu'à ce que le bas sonne le plus plein.
PHASE est le plus précise autour de 50 Hz. L'affichage d'OUTPUT montre l'image stéréo.

## LIMITER {#limiter}

Le dernier étage, qui rattrape donc aussi le kick sec. Il n'a pas d'anticipation (lookahead) :
Blackveil n'ajoute aucune latence.

| Contrôle | Plage | Défaut | |
|---|---|---|---|
| Alimentation | on / off | on | |
| **DRIVE** | 0 .. +12 dB | 0 dB | Le gain à l'entrée du limiteur : plus fort et plus dense. |
| **CEILING** | −12 .. 0 dB | −0,3 dB | Le niveau maximal atteint par la sortie. |
| **RELEASE** | 1 .. 500 ms | 60 ms | La vitesse à laquelle le limiteur relâche. |

L'affichage dessine le niveau d'entrée face au niveau de sortie.

## Pied de fenêtre {#footer}

![Le pied de fenêtre : SEND GATE, NOISE, KICK et RUMBLE]({{ '/assets/images/blackveil/footer.png' | relative_url }})

### KICK et RUMBLE {#kick-and-rumble}

Deux faders en bas à droite, −60 .. +6 dB :

- **KICK** : le niveau du kick sec. Son bouton haut-parleur coupe le kick et laisse le rumble seul
  (pour placer le rumble sous un kick d'une autre piste, par exemple).
- **RUMBLE** : le niveau du rumble. Son bouton haut-parleur coupe le rumble et garde la position du
  fader.

Un bouton haut-parleur blanc est actif ; un bouton sombre et barré est coupé.

### SEND GATE {#send-gate}

La part de chaque kick qui alimente la chaîne d'effets : seulement ses 10 premières ms .. 1 s, puis
un court fondu. FULL (par défaut, tout à droite) envoie le kick entier. Un gate court garde la longue
queue du kick hors de la reverb et du delay : le rumble reste serré et ne déborde pas sur le kick
suivant. Le kick sec n'est pas modifié.

### NOISE {#noise}

Ajoute du bruit à l'entrée de la chaîne d'effets, modelé par l'enveloppe de chaque kick, pour donner
de la matière à la chaîne. De OFF (tout à gauche) à 0 dB. Le sélecteur règle sa couleur : **DARK**
(vers 500 Hz), **MID** (vers 2 kHz), **AIR** (au-dessus de 5 kHz). Le kick sec n'est pas modifié.

{: .remarque }
NOISE rencontre d'abord le premier module de la chaîne : avec le FILTER par défaut (passe-bas à
400 Hz) en tête, l'essentiel est filtré. Placez le filtre plus loin, ou éteignez-le, pour entendre
davantage de bruit.
