---
title: Astuces et dépannage
parent: Blackveil en français
nav_order: 12
---

# Astuces et dépannage

## Recettes {#recipes}

**Un rumble roulant classique.** REVERB DARK ou HALL avec MIX à 100 %, FILTER passe-bas vers 200 Hz
après elle, preset DUCK TIGHT, LOW END sur FULL. Un SEND GATE vers 100 ms empêche la queue de baver.

**Une basse sur les contretemps à partir du kick.** DELAY en 1/8 avec FEEDBACK bas, MIX haut, et une
courbe DUCK qui abaisse fortement le temps : ce qui reste, c'est la répétition sur le contretemps.

**Une queue plus sombre et plus granuleuse.** DIST avant REVERB (TAPE ou TUBE, DRIVE 50 % et plus),
puis un peu de CRUSH. Ajoutez NOISE (DARK) en plaçant FILTER après la reverb.

**Un modulateur de volume sur n'importe quelle piste.** Déclenchement DUCK sur GRID, TARGET ALL, un
preset de courbe comme PUMP. Blackveil fonctionne alors comme un ducking façon sidechain, sans kick
(éteignez la chaîne d'effets, ou coupez RUMBLE, pour laisser passer la piste).

**Le rumble dans la tonalité.** Réglez KEY sur la fondamentale de votre morceau : FREQ de l'EQ
s'aimante sur la fondamentale ou la quinte, et l'accentuation renforce la bonne note.

## Dépannage {#troubleshooting}

| Problème | Essayez |
|---|---|
| Pas de rumble, seulement le kick | Lancez la lecture (EXT et GRID en ont besoin). Vérifiez qu'au moins un de FILTER, DIST, DELAY, REVERB est actif, et que RUMBLE n'est ni coupé ni à −60 dB. |
| En SAMPLE + MIDI, pas de kick | Vérifiez que votre piste MIDI envoie vers Blackveil (dans Live : MIDI To → la piste de Blackveil → Blackveil). |
| Le rumble est abaissé au mauvais moment (EXT) | Réglez la division de SOURCE sur votre motif de kick. Blackveil suit la grille, pas l'audio. |
| Le bas s'amincit quand le rumble arrive | Basculez POL, puis tournez PHASE (voir [Aligner le bas du spectre]({{ site.baseurl }}{% link fr/blackveil/master.md %}#lining-up-the-low-end)). |
| Trop fort ou saturé | Baissez LEVEL dans SOURCE ou VOLUME ; le CEILING du LIMITER fixe le maximum. |
| Charger un preset n'a pas changé mon kick | C'est voulu : les presets gardent la configuration. Voir [Ce que contient un preset]({{ site.baseurl }}{% link fr/blackveil/presets.md %}#what-a-preset-holds). |
| BOUNCE affiche PLAY FIRST | Laissez jouer une mesure entière avec du son, puis glissez de nouveau. |
| Les presets d'usine ont disparu | Supprimez `%APPDATA%\ShadowDSP\Blackveil\User Presets` (après avoir sauvegardé vos propres presets) et relancez le DAW : Blackveil les réinstalle. |

## Questions et réponses {#questions-and-answers}

**Blackveil détecte-t-il mes kicks ?**
Non. En EXT, il place les kicks sur la grille de l'hôte, à la division de SOURCE. C'est ce qui le rend
précis et sans latence, mais votre kick doit être calé sur la grille. Pour les autres motifs, laissez
Blackveil jouer le kick à partir de notes MIDI (voir
[Des kicks depuis des notes MIDI]({{ site.baseurl }}{% link fr/blackveil/in-your-daw.md %}#kicks-from-midi-notes)).

**Ajoute-t-il de la latence ?**
Non. Rien dans Blackveil n'anticipe, le limiteur compris.

**Pourquoi rien ne se passe quand la lecture est arrêtée ?**
EXT et GRID prennent leur timing de la lecture de l'hôte. Seul SAMPLE + MIDI joue sans elle.

**Puis-je l'utiliser sur autre chose qu'un kick ?**
Oui. En EXT, n'importe quel audio devient la source de la chaîne d'effets, calé sur la grille. Avec
DUCK sur GRID et TARGET ALL, Blackveil est aussi un modulateur de volume synchronisé au tempo pour des
nappes, des basses ou des groupes entiers.

**Puis-je partager des presets ?**
Oui : un preset est un fichier `.preset` dans
`%APPDATA%\ShadowDSP\Blackveil\User Presets\<catégorie>`. Copiez-le au même endroit sur l'autre
ordinateur. Un preset qui utilise votre propre fichier de kick enregistre le chemin du fichier, pas le
son : envoyez le kick avec, et gardez-le au même chemin.

**Où vont mes bounces ?**
Dans `%APPDATA%\ShadowDSP\Blackveil\Bounces`. Blackveil ne les supprime ni ne les écrase jamais,
puisque vos projets peuvent les utiliser : faites le ménage vous-même de temps en temps.

**La fenêtre est trop petite ou trop grande.**
Cliquez sur **SIZE** dans l'en-tête : S (80 %), M (100 %) et L (125 %). Blackveil la mémorise pour
vous, dans tous vos projets.
