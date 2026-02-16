#!/usr/bin/env node
/**
 * Convertit un spritesheet LPC (Universal LPC Spritesheet Character Generator)
 * vers le format utilise par Capturia Office (32x48, 52 frames, strip horizontal).
 *
 * Usage:
 *   node scripts/convert-lpc-sprite.js <fichier_lpc.png> <nom_avatar>
 *
 * Exemple:
 *   node scripts/convert-lpc-sprite.js ~/Downloads/dany_lpc.png dany
 *
 * Le fichier sera cree dans client/public/assets/character/<nom>.png
 *
 * Format LPC (entree):
 *   - Frames de 64x64 pixels, grille 13 colonnes x 21+ lignes
 *   - Lignes 8-11 = Walk (up, left, down, right), 9 frames chaque
 *
 * Format Capturia (sortie):
 *   - Strip horizontal de 1664x48 (52 frames de 32x48)
 *   - Ordre : idle_right(6) idle_up(6) idle_left(6) idle_down(6)
 *             run_right(6) run_up(6) run_left(6) run_down(6)
 *             sit_down(1) sit_left(1) sit_right(1) sit_up(1)
 */

const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

// --- Configuration ---
const LPC_FRAME = 64 // taille d'un frame LPC (64x64)
const OUT_W = 32 // largeur cible
const OUT_H = 48 // hauteur cible
const TOTAL_FRAMES = 52

// Lignes LPC pour les animations walk
const LPC_ROW_WALK_UP = 8
const LPC_ROW_WALK_LEFT = 9
const LPC_ROW_WALK_DOWN = 10
const LPC_ROW_WALK_RIGHT = 11

// Mapping : direction -> ligne LPC
const DIRECTIONS = {
  right: LPC_ROW_WALK_RIGHT,
  up: LPC_ROW_WALK_UP,
  left: LPC_ROW_WALK_LEFT,
  down: LPC_ROW_WALK_DOWN,
}

/**
 * Extrait un frame 64x64 du spritesheet LPC, puis le redimensionne en 32x48.
 * Methode : crop centre 42x64 (ratio 2:3) puis resize nearest-neighbor a 32x48.
 * Nearest-neighbor preserve les bords nets du pixel art (pas de flou/shimmer).
 */
async function extractFrame(lpcBuffer, row, col) {
  const x = col * LPC_FRAME
  const y = row * LPC_FRAME

  // Extraire le frame 64x64
  const frame64 = await sharp(lpcBuffer)
    .extract({ left: x, top: y, width: LPC_FRAME, height: LPC_FRAME })
    .toBuffer()

  // Crop centre a 42x64 (ratio ~2:3, meme proportion que 32x48)
  const cropW = 42
  const cropX = Math.floor((LPC_FRAME - cropW) / 2) // 11px de chaque cote
  const cropped = await sharp(frame64)
    .extract({ left: cropX, top: 0, width: cropW, height: LPC_FRAME })
    .toBuffer()

  // Resize nearest-neighbor vers 32x48 (pixel art, pas d'anti-aliasing)
  return sharp(cropped)
    .resize(OUT_W, OUT_H, { kernel: 'nearest' })
    .raw()
    .toBuffer()
}

/**
 * Supprime le fond damier (checkerboard) d'un spritesheet LPC.
 * Detecte les 2 couleurs du damier depuis les coins de l'image,
 * puis rend tous les pixels correspondants transparents.
 */
async function removeCheckerboard(inputBuffer) {
  const meta = await sharp(inputBuffer).metadata()
  const raw = await sharp(inputBuffer).ensureAlpha().raw().toBuffer()
  const w = meta.width
  const channels = 4 // RGBA

  // Echantillonner les couleurs du damier depuis le coin haut-droit (toujours vide)
  const samplePixels = []
  for (let sy = 0; sy < 32; sy++) {
    for (let sx = w - 32; sx < w; sx++) {
      const idx = (sy * w + sx) * channels
      samplePixels.push({ r: raw[idx], g: raw[idx + 1], b: raw[idx + 2], a: raw[idx + 3] })
    }
  }

  // Identifier les 2 couleurs distinctes du damier
  const bgColors = []
  for (const px of samplePixels) {
    if (px.a < 128) continue // deja transparent, pas de damier
    const exists = bgColors.some((c) => Math.abs(c.r - px.r) < 5 && Math.abs(c.g - px.g) < 5 && Math.abs(c.b - px.b) < 5)
    if (!exists) bgColors.push({ r: px.r, g: px.g, b: px.b })
  }

  if (bgColors.length === 0) {
    console.log('  Fond: deja transparent (rien a faire)')
    return inputBuffer
  }

  console.log(`  Fond damier detecte: ${bgColors.length} couleur(s) — suppression...`)
  for (const c of bgColors) {
    console.log(`    RGB(${c.r}, ${c.g}, ${c.b})`)
  }

  // Rendre tous les pixels du damier transparents
  const tolerance = 8
  for (let i = 0; i < raw.length; i += channels) {
    const r = raw[i], g = raw[i + 1], b = raw[i + 2]
    for (const bg of bgColors) {
      if (Math.abs(r - bg.r) <= tolerance && Math.abs(g - bg.g) <= tolerance && Math.abs(b - bg.b) <= tolerance) {
        raw[i + 3] = 0 // alpha = 0
        break
      }
    }
  }

  return sharp(raw, { raw: { width: w, height: meta.height, channels } }).png().toBuffer()
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length < 2) {
    console.error('Usage: node scripts/convert-lpc-sprite.js <fichier_lpc.png> <nom_avatar>')
    console.error('Exemple: node scripts/convert-lpc-sprite.js ~/Downloads/dany_lpc.png dany')
    process.exit(1)
  }

  const inputPath = path.resolve(args[0])
  const avatarName = args[1].toLowerCase()
  const outputDir = path.resolve(__dirname, '..', 'client', 'public', 'assets', 'character')
  const outputPath = path.join(outputDir, `${avatarName}.png`)

  if (!fs.existsSync(inputPath)) {
    console.error(`Erreur: fichier introuvable: ${inputPath}`)
    process.exit(1)
  }

  console.log(`Conversion LPC -> Capturia Office`)
  console.log(`  Entree:  ${inputPath}`)
  console.log(`  Sortie:  ${outputPath}`)
  console.log(`  Avatar:  ${avatarName}`)
  console.log()

  let lpcBuffer = fs.readFileSync(inputPath)

  // Auto-detection et suppression du fond damier
  lpcBuffer = await removeCheckerboard(lpcBuffer)

  // Verifier les dimensions du spritesheet LPC
  const lpcMeta = await sharp(lpcBuffer).metadata()
  console.log(`  Dimensions LPC: ${lpcMeta.width}x${lpcMeta.height}`)

  const minRows = 12 // On a besoin des lignes 8-11 (walk)
  const expectedMinHeight = minRows * LPC_FRAME
  if (lpcMeta.height < expectedMinHeight) {
    console.error(`Erreur: le spritesheet semble trop petit (hauteur ${lpcMeta.height}, minimum ${expectedMinHeight})`)
    console.error(`Assurez-vous d'utiliser un export du Universal LPC Spritesheet Character Generator.`)
    process.exit(1)
  }

  // Collecter tous les frames dans l'ordre du format Capturia
  const frames = []

  // Ordre des directions dans le spritesheet Capturia
  const dirOrder = ['right', 'up', 'left', 'down']

  // --- Idle : 6 frames par direction (frame 0 = pose debout, statique) ---
  console.log('  Extraction des frames idle...')
  for (const dir of dirOrder) {
    const row = DIRECTIONS[dir]
    const standingFrame = await extractFrame(lpcBuffer, row, 0)
    for (let i = 0; i < 6; i++) {
      frames.push(standingFrame)
    }
  }

  // --- Run : 6 frames par direction (frames 1-6 de walk) ---
  console.log('  Extraction des frames run...')
  for (const dir of dirOrder) {
    const row = DIRECTIONS[dir]
    for (let col = 1; col <= 6; col++) {
      frames.push(await extractFrame(lpcBuffer, row, col))
    }
  }

  // --- Sit : 1 frame par direction (frame 0 de walk) ---
  console.log('  Extraction des frames sit...')
  const sitDirOrder = ['down', 'left', 'right', 'up']
  for (const dir of sitDirOrder) {
    const row = DIRECTIONS[dir]
    frames.push(await extractFrame(lpcBuffer, row, 0))
  }

  console.log(`  Total frames: ${frames.length}`)

  if (frames.length !== TOTAL_FRAMES) {
    console.error(`Erreur: nombre de frames incorrect (${frames.length}, attendu ${TOTAL_FRAMES})`)
    process.exit(1)
  }

  // --- Assembler le strip horizontal (1664 x 48) ---
  console.log('  Assemblage du strip horizontal...')
  const stripWidth = TOTAL_FRAMES * OUT_W // 52 * 32 = 1664
  const stripHeight = OUT_H // 48

  // Creer les composites pour sharp
  const composites = frames.map((frameBuffer, i) => ({
    input: frameBuffer,
    raw: { width: OUT_W, height: OUT_H, channels: 4 },
    left: i * OUT_W,
    top: 0,
  }))

  await sharp({
    create: {
      width: stripWidth,
      height: stripHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(outputPath)

  console.log()
  console.log(`Conversion terminee !`)
  console.log(`Fichier cree: ${outputPath}`)
  console.log()
  console.log(`Prochaine etape:`)
  console.log(`  Ajouter dans client/src/characters/avatarConfig.ts :`)
  console.log(`    { name: '${avatarName}', label: '${avatarName.charAt(0).toUpperCase() + avatarName.slice(1)}' },`)
}

main().catch((err) => {
  console.error('Erreur:', err.message)
  process.exit(1)
})
