---
title: Chaîne d'effets
parent: Blackveil en français
nav_order: 6
---

# Chaîne d'effets

La chaîne d'effets fabrique le rumble à partir du kick. Elle comporte six modules. Le signal les
traverse de gauche à droite, et vous pouvez les placer dans n'importe quel ordre.

- **Réordonner :** faites glisser un module par sa barre de titre et déposez-le dans un autre
  emplacement. La distorsion avant la reverb donne une queue sale ; après, une pièce sale. Un filtre
  après la reverb dompte sa queue.
- **Éteindre :** le bouton d'alimentation de la barre de titre. Les modules éteints sont dessinés
  plus sombres et laissent passer le signal. La commutation se fait en fondu, sans clic.
- **Verrouiller :** le verrou en bas à droite d'un module empêche
  [RANDOM]({{ site.baseurl }}{% link fr/blackveil/presets.md %}#random) de le modifier ou de le déplacer.

Ordre par défaut : FILTER, DIST, DELAY, REVERB, EQ, GRAIN (GRAIN éteint).

{: .remarque }
Avec FILTER, DIST, DELAY et REVERB tous éteints, il n'y a pas de rumble : la sortie est le kick sec
seul. EQ et GRAIN ne fabriquent pas de rumble à eux seuls.

## FILTER {#filter}

Un filtre résonant avec une enveloppe qui l'ouvre (ou le ferme) à chaque kick.

| Contrôle | Plage | Défaut | |
|---|---|---|---|
| Type | LP 12 / LP 24 / BP 12 / BP 24 / HP 12 / HP 24 dB, LADDER, DIODE, DIRTY, COMB | LP 24 dB | Passe-bas, passe-bande ou passe-haut, 12 ou 24 dB par octave ; puis trois passe-bas de caractère et un filtre en peigne (ci-dessous). |
| **CUTOFF** | 20 Hz .. 20 kHz | 400 Hz | La fréquence de coupure. |
| **RESO** | 0 .. 100 % | 30 % | La résonance. |
| **ENV** | −100 .. +100 % | +40 % | De combien chaque kick déplace la coupure (jusqu'à 7 octaves) ; une valeur négative la fait descendre. |
| **ENV DEC** | 1 .. 2000 ms | 150 ms | La vitesse de retour de la coupure. |

L'affichage dessine la réponse du filtre et le balayage de l'enveloppe.

**Les autres types :**

- **LADDER :** un passe-bas chaud à 4 pôles. Quand RESO monte, les graves s'amincissent un peu : un
  rumble rond et doux.
- **DIODE :** un passe-bas caoutchouteux et gluant, à saveur acid. Un peu moins fort que les autres.
- **DIRTY :** un passe-bas qui sature dans sa propre résonance : du grain sans DIST.
- **COMB :** de courts échos accordés qui résonnent sur CUTOFF et ses harmoniques ; RESO règle leur
  durée. **Avec une KEY réglée, CUTOFF s'aimante sur la fondamentale de la tonalité** dans l'octave
  la plus proche : le rumble résonne sur la note du morceau (l'affichage l'indique, par exemple
  `65 Hz C2`). ENV balaie la hauteur, d'un zap jusqu'à la note. L'affichage dessine une ligne par
  harmonique.

Passer d'un de ces modèles à l'autre pendant que le filtre résonne peut cliquer.

## DIST {#dist}

Distorsion. Ses courbes sont compensées en niveau : DRIVE change le caractère, pas le niveau du
rumble.

| Contrôle | Plage | Défaut | |
|---|---|---|---|
| Mode | TAPE / TUBE / FOLD / CLIP | TAPE | TAPE et TUBE sont doux, FOLD replie l'onde (brillant, métallique), CLIP est dur. |
| **DRIVE** | 0 .. 100 % | 40 % | La force avec laquelle le signal attaque la courbe. |
| **TONE** | 200 Hz .. 20 kHz | 4 kHz | Un passe-bas après la distorsion. |
| **MIX** | 0 .. 100 % | 100 % | L'équilibre son direct / distordu. |
| **CRUSH** | 0 .. 100 % | 0 % | Lo-fi : baisse la fréquence d'échantillonnage et la résolution. Discret sous ~40 %. |

L'affichage dessine la courbe de transfert.

## DELAY {#delay}

Un delay synchronisé au tempo, avec des filtres dans sa boucle de réinjection.

| Contrôle | Plage | Défaut | |
|---|---|---|---|
| Temps | 1/32, 1/16T, 1/16, 1/16D, 1/8T, 1/8, 1/8D, 1/4T, 1/4, 1/4D, 1/2 | 1/16 | T = triolet, D = pointé. |
| **Ping-pong** (bouton à flèches) | on / off | off | Les répétitions alternent entre gauche et droite. Leurs graves restent en mono. |
| Swing (le fin curseur en haut de l'affichage) | -33 .. +33 % | 0 (centre) | Décale une répétition sur deux (la 1re, la 3e...) : à droite = plus tard (un shuffle ; tout à droite, une sensation de triolet), à gauche = plus tôt. Les autres répétitions restent sur la grille. |
| **FEEDBACK** | 0 .. 95 % | 45 % | Le nombre de répétitions. |
| **LOW CUT** | 20 Hz .. 1 kHz | 40 Hz | Retire des graves à chaque répétition. |
| **HIGH CUT** | 200 Hz .. 20 kHz | 2.5 kHz | Retire des aigus à chaque répétition : les répétitions s'assombrissent. |
| **MIX** | 0 .. 100 % | 50 % | L'équilibre son direct / retardé. |

Un FEEDBACK élevé sature en douceur au lieu de s'emballer.

## REVERB {#reverb}

| Contrôle | Plage | Défaut | |
|---|---|---|---|
| Type | PLATE / HALL / SPRING / SHIMMER / DARK | PLATE | DARK est un espace profond et très amorti, un classique pour les rumbles. |
| **SIZE** | 0 .. 100 % | 70 % | La taille de la pièce et la longueur de la queue. |
| **DAMP** | 0 .. 100 % | 60 % | L'amortissement des aigus : plus haut, plus sombre. |
| **WIDTH** | 0 .. 100 % | 40 % | La largeur stéréo de la queue. |
| **MIX** | 0 .. 100 % | 100 % | L'équilibre son direct / reverb. À 100 %, le rumble est la queue seule. |

## EQ {#eq}

Un EQ pour sculpter le corps du rumble, avec une coupure de sub pour qu'une accentuation n'accumule
pas d'énergie en dessous.

| Contrôle | Plage | Défaut | |
|---|---|---|---|
| Type | BELL / LOW SHELF / HIGH SHELF | BELL | |
| **FREQ** | 60 .. 400 Hz | 140 Hz | S'aimante sur la fondamentale ou la quinte de KEY quand une KEY est réglée. |
| **GAIN** | 0 .. +12 dB | +4 dB | |
| **WIDTH** | 0.3 .. 3.0 | 1.0 | La largeur de la cloche. |
| **SUB CUT** | 20 .. 80 Hz | 35 Hz | Un passe-haut sous l'accentuation. |

## GRAIN {#grain}

Un nuage granulaire fabriqué à partir du signal de la chaîne. Éteint par défaut.

| Contrôle | Plage | Défaut | |
|---|---|---|---|
| Mode | CLOUD / DETUNE / OCT UP / OCT DOWN / REVERSE | CLOUD | CLOUD : grains simples. DETUNE : grains légèrement désaccordés. OCT UP / OCT DOWN : grains une octave au-dessus ou en dessous. REVERSE : grains joués à l'envers. |
| **SIZE** | 10 .. 500 ms | 80 ms | La longueur de chaque grain. |
| **DENSITY** | 2 .. 100 /s | 25 /s | Le nombre de grains par seconde. Les valeurs basses sont volontairement clairsemées. |
| **SPRAY** | 0 .. 1000 ms | 200 ms | Jusqu'où dans le passé les grains peuvent démarrer. |
| **MIX** | 0 .. 100 % | 50 % | L'équilibre son direct / grains. |
