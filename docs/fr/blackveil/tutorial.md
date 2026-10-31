---
title: "Tutoriel : un rumble de A à Z"
parent: Blackveil en français
grand_parent: Blackveil
nav_order: 2
---

# Tutoriel : un rumble de A à Z

Ce tutoriel construit pas à pas un rumble techno classique, à partir du preset Init. Comptez une
dizaine de minutes ; en chemin, vous découvrez les contrôles qui comptent le plus. Chaque étape dit
ce qu'il faut écouter.

Il ne vous faut rien d'autre que Blackveil : il utilise l'un de ses kicks intégrés, une piste vide
suffit donc.

## 1. Mise en place

1. Placez Blackveil sur une piste audio vide.
2. Réglez le tempo de votre DAW sur une valeur techno, entre 128 et 140 BPM, et lancez la lecture.
   Blackveil suit la grille de l'hôte : **laissez la lecture tourner** pendant tout le tutoriel.
3. Cliquez sur le nom du preset dans l'en-tête, choisissez **ALL**, puis cliquez sur **Init** (en
   haut de la liste). Cliquez hors du navigateur pour le fermer.
4. Dans SOURCE, cliquez sur **SAMPLE**, puis **GRID**, et choisissez **1/4**. Vous entendez
   maintenant un kick sur chaque temps.
5. Si vous connaissez la tonalité de votre morceau, réglez **KEY** dans l'en-tête (par exemple F).
   Le kick s'accorde dessus, et plus loin l'EQ et le filtre COMB la suivront aussi.

![SOURCE en mode SAMPLE, GRID 1/4, le kick accordé de G à F]({{ '/assets/images/blackveil/source.png' | relative_url }})

{: .astuce }
Coupez le rumble avec le bouton haut-parleur à côté du fader **RUMBLE** (en bas à droite) pour
entendre le kick seul, puis réactivez-le. Faites-le chaque fois que vous voulez savoir ce que le
rumble apporte.

## 2. Créer la queue

Le rumble commence par une longue queue fabriquée à partir du kick. La reverb est la façon classique
de l'obtenir.

1. Éteignez **DIST** et **DELAY** avec les boutons d'alimentation de leur barre de titre. Il reste
   FILTER, REVERB et EQ.
2. Dans **REVERB**, choisissez **DARK**. Réglez **SIZE** vers 60 % et laissez **MIX** à 100 % :
   le rumble est alors la queue seule.

**À l'écoute :** un lavis sombre entre les kicks. Sans doute trop long et trop boueux pour l'instant ;
les étapes suivantes corrigent ça.

## 3. Le sculpter avec le filtre

Un filtre après la reverb transforme ce lavis en rumble.

1. Faites glisser **FILTER** par sa barre de titre et déposez-le dans l'emplacement après REVERB. La
   chaîne se lit maintenant REVERB, FILTER...
2. Réglez **CUTOFF** vers 200 Hz et **RESO** vers 30 %.
3. Montez **ENV** vers +40 % : chaque kick ouvre un peu le filtre, et **ENV DEC** règle la vitesse à
   laquelle il se referme (150 ms est un bon départ).

![REVERB sur DARK, puis FILTER à 200 Hz]({{ '/assets/images/blackveil/chain-reverb-filter.png' | relative_url }})

**À l'écoute :** la queue devient un roulement grave et arrondi. Un CUTOFF plus haut donne plus de
grain, plus bas plus de sub. Pour un caractère plus rond, essayez le type LADDER ; pour une pointe
acide, DIODE.

## 4. Le faire respirer : DUCK

Sans ducking, le rumble recouvre le kick. DUCK l'abaisse à chaque kick et le laisse remonter entre
eux. Sa courbe est la ligne blanche du visualiseur.

1. Essayez les presets de courbe en haut du visualiseur : **TIGHT**, **PUMP**, **SWELL**... Chacun
   fait bouger le rumble différemment. TIGHT est un bon départ, percutant.
2. Réglez **DEPTH** (DUCK, à droite du visualiseur) entre 85 et 100 %. Plus de profondeur laisse
   plus de place au kick.
3. Essayez **LOW END** vers 150 Hz : le sub reste fermement abaissé, mais le haut du rumble continue
   de bouger à travers le kick, ce qui sonne plus chargé, plus « roulant ».

![Le visualiseur avec la courbe TIGHT sur un temps, et DUCK à droite]({{ '/assets/images/blackveil/duck.png' | relative_url }})

Pour affiner la courbe, faites glisser ses points. Double-cliquez pour ajouter ou retirer un point,
et faites glisser un losange pour courber un segment. Voir
[Éditer la courbe]({{ site.baseurl }}{% link fr/blackveil/duck.md %}#editing-the-curve).

## 5. Le garder serré : SEND GATE

La queue du kick lui-même part aussi dans la reverb, ce qui peut faire gonfler et baver le rumble.
Descendez le curseur **SEND GATE** (en bas à gauche) de FULL vers 100 ms : seules les 100 premières
ms de chaque kick alimentent la chaîne.

![Le pied de fenêtre : SEND GATE à 100 ms, NOISE, les faders KICK et RUMBLE]({{ '/assets/images/blackveil/footer.png' | relative_url }})

**À l'écoute :** chaque rumble démarre maintenant proprement et s'éteint avant le kick suivant. Le
kick sec n'est pas modifié.

## 6. Ajouter du caractère

1. Rallumez **DIST** et placez-le **avant REVERB**. Choisissez **TAPE**, réglez **DRIVE** vers 50 %.
   La distorsion avant la reverb donne une queue sale et saturée.
2. Dans **EQ**, laissez le type sur **BELL** et réglez **GAIN** sur +3 ou +4 dB. Avec KEY réglé,
   **FREQ** s'aimante sur la fondamentale ou la quinte de votre tonalité : l'accentuation renforce
   la bonne note. **SUB CUT** empêche l'accentuation d'accumuler de l'énergie en dessous.

![La chaîne terminée : DIST, REVERB, FILTER, puis l'EQ aimanté sur C, la quinte de F]({{ '/assets/images/blackveil/chain-final.png' | relative_url }})

## 7. Aligner le bas du spectre

Là où le kick et le rumble se chevauchent, leurs graves peuvent s'annuler, et le résultat sonne
maigre. Dans **OUTPUT**, basculez **POL** sur − puis sur + et gardez la version la plus pleine.
Tournez ensuite doucement **PHASE** jusqu'à ce que le bas sonne le plus plein. Voir
[Aligner le bas du spectre]({{ site.baseurl }}{% link fr/blackveil/master.md %}#lining-up-the-low-end).

![OUTPUT : POL, PHASE, WIDTH et VOLUME]({{ '/assets/images/blackveil/output.png' | relative_url }})

## 8. Équilibrer et sauvegarder

1. Réglez la balance avec les faders **KICK** et **RUMBLE**. Un rumble 3 à 6 dB sous le kick est un
   point de départ courant.
2. Le **LIMITER** (actif par défaut) garde les crêtes sous son **CEILING**. Poussez son **DRIVE**
   pour un résultat plus dense et plus fort.
3. Cliquez sur la **disquette** dans l'en-tête, nommez le son, choisissez ou créez une catégorie,
   et sauvegardez.

![La fenêtre de sauvegarde]({{ '/assets/images/blackveil/save-box.png' | relative_url }})

Voilà un rumble complet. Ensuite :

- Passez votre propre kick dedans : réglez SOURCE sur **EXT** et voyez
  [Blackveil dans votre DAW]({{ site.baseurl }}{% link fr/blackveil/in-your-daw.md %}).
- Transformez-le en clip audio avec [BOUNCE]({{ site.baseurl }}{% link fr/blackveil/bounce.md %}).

## Variations à essayer

| Changement | Ce que vous obtenez |
|---|---|
| DELAY actif en 1/8, FEEDBACK bas, MIX haut, DUCK sur PUMP | Une basse sur les contretemps, fabriquée à partir du kick. |
| REVERB sur HALL ou SHIMMER au lieu de DARK | Un rumble plus brillant et plus spacieux. |
| FILTER de type COMB (avec KEY réglé) | Un rumble accordé qui résonne sur la fondamentale du morceau. |
| GRAIN actif (CLOUD ou OCT DOWN), après la reverb | Une texture granuleuse et mouvante dans la queue. |
| NOISE (barre du bas) sur DARK, FILTER placé en dernier | Plus de souffle et d'air dans la queue. |
| Maj-clic sur le dé (MUTATE) | De petites variations aléatoires de votre son ; la flèche d'annulation les reprend. |
