---
title: Presets et RANDOM
parent: Blackveil en français
nav_order: 9
---

# Presets et RANDOM

## Ce que contient un preset {#what-a-preset-holds}

Un preset est un **son** : la chaîne d'effets et son ordre, DUCK et sa courbe, OUTPUT, LIMITER, les
niveaux. Charger un preset **garde votre configuration** : SOURCE (EXT ou SAMPLE, le déclenchement et
la division), KEY et le kick choisi (intégré ou votre propre fichier) restent tels quels, toujours.
Vous pouvez donc parcourir les presets pendant que votre kick continue de jouer de la même façon.

Votre session DAW, elle, restaure tout.

## La case du preset {#the-preset-box}

Dans l'en-tête :

- **‹ ›** passent au preset précédent / suivant dans la catégorie actuelle du navigateur.
- **Cliquez sur le nom** pour ouvrir le navigateur.
- **La disquette** sauvegarde.
- **Un point** après le nom : vous avez modifié le son depuis son chargement ou sa sauvegarde.

## Le navigateur {#the-browser}

![Le navigateur de presets]({{ '/assets/images/blackveil/browser.png' | relative_url }})

- **Catégories** à gauche : ALL (avec Init en haut), FAVORITES, les catégories d'usine (Rumble,
  Hypnotic, Industrial, Movement, Sub), User, et les vôtres.
- **La recherche** filtre pendant la frappe.
- **Un clic charge** le preset et laisse le navigateur ouvert : vous pouvez en écouter plusieurs à la
  suite. Cliquez hors du navigateur pour le fermer.
- **L'étoile** marque un favori.
- **Faites défiler** la liste avec la molette de la souris, ou en faisant glisser sa barre de défilement.
- **Clic droit** sur un de vos presets : Rename, Duplicate, **Move to** (une de vos catégories, ou New
  category... pour en créer une), Delete. Sur un preset d'usine (il porte un cadenas) : Duplicate to
  User.

## Sauvegarder {#saving}

La disquette ouvre la fenêtre de sauvegarde :

![La fenêtre de sauvegarde]({{ '/assets/images/blackveil/save-box.png' | relative_url }})

- **NAME** : le nom du preset actuel (un preset d'usine reçoit « 2 » ; après Init, « My Preset »).
- **CATEGORY** : une de vos catégories, ou « + New category... ».

Un nom qui existe déjà demande confirmation avant d'écraser. Les presets d'usine ne peuvent pas être
écrasés, renommés, déplacés ni supprimés.

Les presets sont enregistrés dans `%APPDATA%\ShadowDSP\Blackveil\User Presets`, un dossier par
catégorie.

## RANDOM {#random}

Le dé de l'en-tête crée un nouveau son :

- **Clic** : un nouveau son. RANDOM choisit les modules de la chaîne, leurs réglages et leur ordre,
  l'EQ, ainsi que la courbe et la profondeur de DUCK, toujours dans des plages musicales. Chaque
  tirage part d'une recette parmi quelques-unes : un rumble de reverb filtré après la reverb, le même
  passé dans DIST, un rumble de delay, une reverb avec GRAIN, ou un rumble accordé (passe-bande ou
  COMB après la reverb). Il y a donc toujours une queue (REVERB, ou DELAY avec des répétitions
  audibles), et le filtre reste là où se trouve le corps du kick.
- **Maj-clic : MUTATE.** De petits changements sur chaque potentiomètre du son actuel : une
  variation, pas un nouveau son.
- **La flèche d'annulation** à côté du dé annule le dernier tirage, jusqu'à 8 tirages.

RANDOM ne touche jamais à la configuration : SOURCE, KEY, SEND GATE, le déclenchement et la cible de
DUCK, les niveaux, OUTPUT et LIMITER.

### Verrous {#locks}

Chaque module d'effet a un verrou en bas à droite, et DUCK en a un au bout de son titre. Un module
verrouillé garde ses réglages et sa place dans la chaîne ; RANDOM réarrange les autres autour, et
n'utilise que les recettes compatibles avec ce que vous avez verrouillé (REVERB verrouillée éteinte :
uniquement des rumbles de delay). Les verrous ne sont pas sauvegardés.
