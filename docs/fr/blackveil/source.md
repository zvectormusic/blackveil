---
title: Source
parent: Blackveil en français
nav_order: 5
---

# Source

SOURCE détermine quel kick pilote Blackveil. Ce kick alimente la chaîne d'effets (qui en fabrique le
rumble) et revient intact dans la sortie, comme kick sec.

## EXT ou SAMPLE {#ext-or-sample}

| Mode | Le kick est |
|---|---|
| **EXT** (par défaut) | L'audio de la piste elle-même : placez Blackveil après votre kick. |
| **SAMPLE** | L'un des kicks intégrés de Blackveil, ou votre propre sample. Il remplace l'audio de la piste. |

### Où sont les kicks, en EXT {#where-the-kicks-are-in-ext}

En EXT, Blackveil ne détecte pas les kicks dans l'audio. Il prend leurs positions sur la grille de
l'hôte, à la **division** réglée dans SOURCE (1/4, 1/8, 1/2 ou 1 BAR). Le ducking, l'enveloppe de
FILTER, SEND GATE et NOISE redémarrent tous sur ces positions. Donc :

- lancez la lecture, sinon Blackveil n'a pas de positions de kick ;
- réglez la division sur votre motif de kick. Pour un kick sur chaque temps, 1/4.

L'interrupteur de déclenchement affiche GRID (grisé) en EXT : il n'y a pas d'autre choix.

## Les kicks (SAMPLE) {#the-kick-set-sample}

Les flèches ‹ › parcourent les kicks intégrés. Sous le nom du kick, le sous-titre indique sa note,
et avec une KEY réglée la note jouée (par exemple `G › F`).

### Vos propres kicks {#your-own-kicks}

Glissez un fichier audio (WAV, AIFF ou FLAC) depuis votre explorateur de fichiers sur la case du kick.
Il se charge aussitôt et SOURCE passe en SAMPLE. Les flèches ‹ › parcourent alors les fichiers audio
de ce dossier, et le sous-titre affiche le nom du dossier et la place du kick dedans
(`My Kicks · 3 / 24`).

- **Clic droit** sur la case du kick : **Load a kick file...** ouvre un explorateur de fichiers,
  **Factory kicks** revient aux kicks intégrés (sur le kick que vous aviez avant).
- **Mono ou stéréo, toute fréquence d'échantillonnage :** un fichier mono joue dans les deux canaux ;
  la hauteur reste juste.
- **KEY** lit la note du kick à la fin de son nom, comme pour les kicks intégrés : `Kick 07 F#`,
  `kick-G`, `Kick_01_A`. Un nom qui se termine par une seule lettre de A à G compte aussi comme une
  note.
- **Blackveil lit le fichier là où il se trouve.** Votre set Live et vos presets retiennent son
  chemin, pas le son. Si le fichier a été déplacé ou si le set s'ouvre sur un autre ordinateur, le
  kick intégré joue et le sous-titre affiche **MISSING** avec le nom du fichier. Remettez le fichier
  en place et rouvrez le set, ou choisissez un autre kick.

### Déclenchement {#triggering}

| Déclenchement | Le kick joue |
|---|---|
| **GRID** | Sur la grille de l'hôte, à la division (1/4, 1/8, 1/2, 1 BAR). La lecture doit tourner. |
| **MIDI** | À chaque note MIDI reçue par Blackveil, à l'échantillon près. La vélocité règle le niveau. Le numéro de note est ignoré. |

## Potentiomètres {#knobs}

| Potentiomètre | Plage | Défaut | Rôle |
|---|---|---|---|
| **TUNE** | −24 .. +24 demi-tons | 0 | Transpose le kick SAMPLE. |
| **DECAY** | 20 .. 2000 ms | 2000 ms | Raccourcit le kick SAMPLE (une décroissance d'amplitude). |
| **PITCH** | 0 .. 48 demi-tons | 0 | Une enveloppe de hauteur sur le kick SAMPLE : de combien au-dessus de sa hauteur il démarre. |
| **P.DECAY** | 1 .. 1000 ms | 60 ms | La vitesse de retour de l'enveloppe de hauteur. |
| **DRIVE** | 0 .. 100 % | 20 % | Sature le kick (dans les deux modes). |
| **LEVEL** | −24 .. +12 dB | 0 dB | Le niveau du kick, vers la chaîne et dans la sortie (dans les deux modes). |

TUNE, DECAY, PITCH et P.DECAY n'agissent que sur le kick SAMPLE ; en EXT, ils sont grisés.

## KEY {#key}

Le sélecteur **KEY** de l'en-tête règle la fondamentale de votre morceau (OFF, C .. B).

- **Le kick SAMPLE s'accorde sur la tonalité.** Chaque kick intégré connaît sa propre note (elle est
  dans le nom du fichier). Blackveil le transpose par le plus court chemin (de 5 demi-tons vers le
  bas à 6 vers le haut), en plus de TUNE. Un kick dont la note est inconnue n'est pas accordé.
- **EQ FREQ s'aimante sur la tonalité** : sur la fondamentale ou la quinte, la plus proche. Son
  affichage indique la note, par exemple `131 Hz C3`.
- **Le COMB de FILTER résonne dans la tonalité** : son CUTOFF s'aimante sur la fondamentale, dans
  l'octave la plus proche.

KEY ne modifie pas un kick EXT : accordez votre propre kick dans votre DAW.
