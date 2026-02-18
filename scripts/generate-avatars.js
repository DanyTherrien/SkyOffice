#!/usr/bin/env node
/**
 * Genere 20 avatars diversifies par palette-swap des 4 sprites de base.
 *
 * Methode : pour chaque pixel non-transparent, on determine s'il est
 * "peau", "outline" ou "cheveux/vetements" en analysant le HSL.
 * On applique ensuite des transformations ciblees :
 *   - Peau → recoloration vers un nouveau teint
 *   - Cheveux/vetements → rotation de teinte
 *   - Outlines → inchanges
 *
 * Usage: node scripts/generate-avatars.js
 */

const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const CHAR_DIR = path.resolve(__dirname, '..', 'client', 'public', 'assets', 'character')

// ─── Utilitaires couleur ────────────────────────────────────────────────

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2

  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: h * 360, s, l }
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360
  h /= 360
  let r, g, b

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) }
}

function clamp(v, lo = 0, hi = 255) { return Math.max(lo, Math.min(hi, Math.round(v))) }

// ─── Classification des pixels ──────────────────────────────────────────

/**
 * Classifie un pixel RGB en : 'outline', 'skin', ou 'other' (cheveux/vetements)
 * Basee sur l'analyse des palettes des 4 sprites de base.
 */
function classifyPixel(r, g, b) {
  const { h, s, l } = rgbToHsl(r, g, b)

  // Outlines : tres sombres et faible saturation
  if (l < 0.30 && s < 0.30) return 'outline'
  // Outlines moyens (gris-bleu fonces)
  if (l < 0.42 && s < 0.20) return 'outline'

  // Peau : teintes chaudes (orange/rose/peche), saturation moderee, luminosite moyenne-haute
  // Hue range 0-45 et 340-360 (rouge/orange/peche)
  const isSkinHue = (h >= 0 && h <= 45) || (h >= 340 && h <= 360)
  if (isSkinHue && s >= 0.20 && l >= 0.45) return 'skin'

  // Peau plus claire/desaturee
  if (isSkinHue && s >= 0.15 && l >= 0.65) return 'skin'

  return 'other'
}

// ─── Transformations de palette ─────────────────────────────────────────

/**
 * Recolore un pixel "peau" vers un nouveau teint.
 * skinTarget = { h, s, lShift } ou lShift ajuste la luminosite relative
 */
function recolorSkin(r, g, b, skinTarget) {
  const { h, s, l } = rgbToHsl(r, g, b)
  const newL = clamp((l + skinTarget.lShift) * 255, 0, 255) / 255
  const newS = clamp(skinTarget.s * 255, 0, 255) / 255
  return hslToRgb(skinTarget.h, newS, Math.max(0.2, Math.min(0.95, newL)))
}

/**
 * Applique une rotation de teinte aux pixels "other" (cheveux/vetements)
 */
function recolorOther(r, g, b, hueShift, satMult = 1.0) {
  const { h, s, l } = rgbToHsl(r, g, b)
  return hslToRgb(h + hueShift, Math.min(1, s * satMult), l)
}

// ─── Definitions des 20 avatars ─────────────────────────────────────────

const AVATAR_DEFS = [
  // Base: adam (corps masculin, cheveux violets, vetements verts)
  { base: 'adam', name: 'marcus',  skin: { h: 25, s: 0.55, lShift: -0.18 }, hueShift: 200, satMult: 0.9 },
  { base: 'adam', name: 'kenji',   skin: { h: 30, s: 0.35, lShift: -0.05 }, hueShift: 160, satMult: 1.1 },
  { base: 'adam', name: 'carlos',  skin: { h: 22, s: 0.50, lShift: -0.10 }, hueShift: 40,  satMult: 1.0 },
  { base: 'adam', name: 'dmitri',  skin: { h: 20, s: 0.30, lShift: 0.02  }, hueShift: -30, satMult: 0.8 },
  { base: 'adam', name: 'felix',   skin: { h: 18, s: 0.40, lShift: 0.0   }, hueShift: 280, satMult: 1.2 },

  // Base: ash (corps masculin, cheveux bruns, vetements rouges)
  { base: 'ash', name: 'omar',    skin: { h: 28, s: 0.50, lShift: -0.12 }, hueShift: 30,  satMult: 1.0 },
  { base: 'ash', name: 'tyler',   skin: { h: 15, s: 0.40, lShift: 0.05  }, hueShift: -40, satMult: 0.9 },
  { base: 'ash', name: 'rafael',  skin: { h: 20, s: 0.45, lShift: -0.08 }, hueShift: 180, satMult: 1.0 },
  { base: 'ash', name: 'lucas',   skin: { h: 22, s: 0.35, lShift: 0.0   }, hueShift: 90,  satMult: 1.1 },
  { base: 'ash', name: 'sam',     skin: { h: 25, s: 0.30, lShift: 0.02  }, hueShift: 240, satMult: 1.0 },

  // Base: lucy (corps feminin, cheveux oranges, vetements gris-bleu)
  { base: 'lucy', name: 'elena',  skin: { h: 18, s: 0.38, lShift: 0.0   }, hueShift: 120, satMult: 1.1 },
  { base: 'lucy', name: 'priya',  skin: { h: 25, s: 0.50, lShift: -0.15 }, hueShift: -20, satMult: 1.0 },
  { base: 'lucy', name: 'sophie', skin: { h: 15, s: 0.35, lShift: 0.05  }, hueShift: 50,  satMult: 0.8 },
  { base: 'lucy', name: 'mei',    skin: { h: 30, s: 0.30, lShift: -0.03 }, hueShift: 200, satMult: 1.2 },
  { base: 'lucy', name: 'nina',   skin: { h: 20, s: 0.55, lShift: -0.20 }, hueShift: 160, satMult: 1.0 },

  // Base: nancy (corps feminin, cheveux brun fonce, vetements sombres)
  { base: 'nancy', name: 'aisha',  skin: { h: 25, s: 0.55, lShift: -0.20 }, hueShift: 30,  satMult: 1.1 },
  { base: 'nancy', name: 'fatima', skin: { h: 22, s: 0.50, lShift: -0.12 }, hueShift: 140, satMult: 1.0 },
  { base: 'nancy', name: 'yuki',   skin: { h: 28, s: 0.28, lShift: 0.03  }, hueShift: 270, satMult: 1.3 },
  { base: 'nancy', name: 'zara',   skin: { h: 20, s: 0.40, lShift: -0.06 }, hueShift: -60, satMult: 0.9 },
  { base: 'nancy', name: 'jin',    skin: { h: 30, s: 0.35, lShift: -0.04 }, hueShift: 90,  satMult: 1.0 },
]

// ─── Generation ─────────────────────────────────────────────────────────

async function generateAvatar(def) {
  const basePath = path.join(CHAR_DIR, `${def.base}.png`)
  const outPath = path.join(CHAR_DIR, `${def.name}.png`)

  const meta = await sharp(basePath).metadata()
  const raw = await sharp(basePath).ensureAlpha().raw().toBuffer()
  const out = Buffer.from(raw)

  for (let i = 0; i < raw.length; i += 4) {
    const a = raw[i + 3]
    if (a < 128) continue // transparent

    const r = raw[i], g = raw[i + 1], b = raw[i + 2]
    const type = classifyPixel(r, g, b)

    let newR = r, newG = g, newB = b

    if (type === 'skin') {
      const c = recolorSkin(r, g, b, def.skin)
      newR = c.r; newG = c.g; newB = c.b
    } else if (type === 'other') {
      const c = recolorOther(r, g, b, def.hueShift, def.satMult)
      newR = c.r; newG = c.g; newB = c.b
    }
    // outline: inchange

    out[i] = clamp(newR)
    out[i + 1] = clamp(newG)
    out[i + 2] = clamp(newB)
  }

  await sharp(out, { raw: { width: meta.width, height: meta.height, channels: 4 } })
    .png()
    .toFile(outPath)

  console.log(`  ✓ ${def.name} (base: ${def.base})`)
}

async function main() {
  console.log('Generation de 20 avatars diversifies...\n')

  for (const def of AVATAR_DEFS) {
    await generateAvatar(def)
  }

  console.log(`\n${AVATAR_DEFS.length} avatars generes dans ${CHAR_DIR}`)
  console.log('\nPensez a decommenter les entrees dans avatarConfig.ts !')
}

main().catch((err) => {
  console.error('Erreur:', err.message)
  process.exit(1)
})
