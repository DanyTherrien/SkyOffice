/**
 * Registre central des avatars disponibles.
 *
 * Deux styles d'avatars :
 * - "normal" : sprites RPG pixel art (LPC)
 * - "chibi"  : petits personnages style Among Us
 *
 * Pour ajouter un avatar custom :
 * 1. Generer un spritesheet LPC via https://sanderfrenken.github.io/Universal-LPC-Spritesheet-Character-Generator/
 * 2. Lancer le script de conversion : node scripts/convert-lpc-sprite.js <fichier_lpc.png> <nom>
 * 3. Ajouter une entree dans AVATARS ci-dessous
 *
 * Pour regenerer les avatars chibi :
 *   node scripts/generate-chibi-avatars.js
 */

export type AvatarStyle = 'normal' | 'chibi'

export interface AvatarConfig {
  /** Cle technique (nom du fichier PNG sans extension) */
  name: string
  /** Nom affiche dans l'UI */
  label: string
  /** Style visuel */
  style: AvatarStyle
}

/* ── Noms communs aux deux styles ────────────────────────────── */

const AVATAR_NAMES = [
  // Avatars generiques (inclus de base)
  { name: 'adam', label: 'Adam' },
  { name: 'ash', label: 'Ash' },
  { name: 'lucy', label: 'Lucy' },
  { name: 'nancy', label: 'Nancy' },

  // --- Avatars custom de l'equipe ---
  { name: 'dany', label: 'Dany' },

  // --- Nouveaux avatars diversifies ---
  { name: 'marcus', label: 'Marcus' },
  { name: 'elena', label: 'Elena' },
  { name: 'kenji', label: 'Kenji' },
  { name: 'priya', label: 'Priya' },
  { name: 'omar', label: 'Omar' },
  { name: 'sophie', label: 'Sophie' },
  { name: 'carlos', label: 'Carlos' },
  { name: 'aisha', label: 'Aisha' },
  { name: 'tyler', label: 'Tyler' },
  { name: 'mei', label: 'Mei' },
  { name: 'dmitri', label: 'Dmitri' },
  { name: 'fatima', label: 'Fatima' },
  { name: 'lucas', label: 'Lucas' },
  { name: 'yuki', label: 'Yuki' },
  { name: 'rafael', label: 'Rafael' },
  { name: 'nina', label: 'Nina' },
  { name: 'sam', label: 'Sam' },
  { name: 'jin', label: 'Jin' },
  { name: 'zara', label: 'Zara' },
  { name: 'felix', label: 'Felix' },
]

/* ── Registre complet : normal + chibi ───────────────────────── */

export const AVATARS: AvatarConfig[] = [
  // Style normal (RPG pixel art)
  ...AVATAR_NAMES.map((a) => ({ name: a.name, label: a.label, style: 'normal' as const })),

  // Style chibi (Among Us)
  ...AVATAR_NAMES.map((a) => ({
    name: `chibi_${a.name}`,
    label: a.label,
    style: 'chibi' as const,
  })),
]
