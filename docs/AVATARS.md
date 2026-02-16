# Avatars Custom — Guide pour l'equipe

## Comment creer son avatar personnalise

### Etape 1 : Generer le spritesheet LPC

1. Aller sur le **Universal LPC Spritesheet Character Generator** :
   https://sanderfrenken.github.io/Universal-LPC-Spritesheet-Character-Generator/

2. Personnaliser votre personnage :
   - **Body** : choisir la couleur de peau
   - **Hair** : style et couleur de cheveux
   - **Facial** : barbe, moustache (optionnel)
   - **Accessories** : lunettes, chapeaux (optionnel)
   - **Shirts/Pants/Shoes** : vetements

3. Cliquer sur **"Export"** en haut a droite pour telecharger le PNG

### Etape 2 : Convertir le spritesheet

Depuis la racine du projet, lancer :

```bash
yarn convert-avatar ~/Downloads/spritesheet.png prenom
```

Par exemple :
```bash
yarn convert-avatar ~/Downloads/dany_lpc.png dany
yarn convert-avatar ~/Downloads/alex_lpc.png alex
```

Le script cree automatiquement le fichier dans `client/public/assets/character/prenom.png`.

### Etape 3 : Enregistrer l'avatar

Ouvrir `client/src/characters/avatarConfig.ts` et ajouter une ligne :

```typescript
export const AVATARS: AvatarConfig[] = [
  // Avatars generiques
  { name: 'adam', label: 'Adam' },
  { name: 'ash', label: 'Ash' },
  { name: 'lucy', label: 'Lucy' },
  { name: 'nancy', label: 'Nancy' },

  // Avatars custom
  { name: 'dany', label: 'Dany' },    // <- ajouter ici
  { name: 'alex', label: 'Alex' },
]
```

### Etape 4 : Tester

Relancer le client (`cd client && yarn dev`) et verifier que le nouvel avatar apparait dans le selecteur a la connexion.

## Notes techniques

- Le format de sortie est un strip horizontal de **1664 x 48 pixels** (52 frames de 32x48)
- L'animation idle utilise le frame de repos (statique) — le personnage ne bouge pas quand il est immobile
- L'animation run utilise 6 frames de marche du spritesheet LPC
- Les frames sit utilisent aussi le frame de repos (le personnage est debout sur la chaise)
- Pour des sit/idle plus elabores, il faudrait editer le spritesheet manuellement dans Aseprite ou Piskel

## Depannage

**Le personnage n'apparait pas dans le selecteur ?**
→ Verifier que le `name` dans `avatarConfig.ts` correspond exactement au nom du fichier PNG (sans extension)

**Le script de conversion echoue ?**
→ Verifier que le PNG exporte fait bien ~832x1344 pixels ou plus (format LPC standard)
→ Assurez-vous d'avoir fait `yarn install` a la racine du projet (pour installer `sharp`)

**Le personnage est trop petit / mal cadre ?**
→ Le script crop le frame LPC (64x64) vers 32x48. Si le resultat ne vous plait pas, vous pouvez editer le PNG de sortie dans un editeur de pixel art.
