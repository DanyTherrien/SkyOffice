/**
 * Registre central des avatars disponibles.
 *
 * Pour ajouter un avatar custom :
 * 1. Generer un spritesheet LPC via https://sanderfrenken.github.io/Universal-LPC-Spritesheet-Character-Generator/
 * 2. Lancer le script de conversion : node scripts/convert-lpc-sprite.js <fichier_lpc.png> <nom>
 * 3. Ajouter une entree dans AVATARS ci-dessous
 */

export interface AvatarConfig {
  /** Cle technique (nom du fichier PNG sans extension) */
  name: string
  /** Nom affiche dans l'UI */
  label: string
}

export const AVATARS: AvatarConfig[] = [
  // Avatars generiques (inclus de base)
  { name: 'adam', label: 'Adam' },
  { name: 'ash', label: 'Ash' },
  { name: 'lucy', label: 'Lucy' },
  { name: 'nancy', label: 'Nancy' },

  // --- Avatars custom de l'equipe ---
  { name: 'dany', label: 'Dany' },
  // { name: 'alex', label: 'Alex' },
]
