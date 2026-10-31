---
title: BOUNCE
parent: Blackveil en français
nav_order: 10
---

# BOUNCE

BOUNCE transforme le son de Blackveil en clip audio : glissez-le directement dans votre DAW.

Le bouton blanc **BOUNCE** se trouve dans l'en-tête, entre la case du preset et KEY, avec un
sélecteur à côté :

| Stem | Le clip contient |
|---|---|
| **RUMBLE** (par défaut) | Le rumble seul, avec son ducking. |
| **KICK** | Le kick sec seul. |
| **MIX** | Tout, tel que vous l'entendez. |

## Utilisation {#using-it}

1. Laissez la lecture tourner au moins une mesure complète.
2. Choisissez le stem.
3. Faites glisser le bouton BOUNCE sur une piste de votre DAW.

Vous obtenez la **dernière mesure complète** jouée, sous forme de fichier WAV. Bouclez-la, ou placez
le rumble sous un autre kick.

Si le bouton affiche **PLAY FIRST**, Blackveil n'a pas encore enregistré une mesure entière, ou la
mesure était silencieuse.

## Les fichiers {#the-files}

Les clips sont nommés d'après le preset, le stem, le tempo et la tonalité, par exemple
`Blackveil_Deep-Tunnel_RUMBLE_128bpm_F.wav`, et rangés dans
`%APPDATA%\ShadowDSP\Blackveil\Bounces`. Un bounce n'écrase jamais un fichier plus ancien, puisque
vos projets DAW peuvent l'utiliser : videz le dossier vous-même quand vous n'en avez plus besoin.

{: .remarque }
BOUNCE compte les mesures en 4/4.
