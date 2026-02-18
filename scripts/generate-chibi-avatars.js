#!/usr/bin/env node
/**
 * Genere 25 avatars chibi/Among Us pour Capturia Office.
 * Chaque avatar = strip horizontal 1664x48 (52 frames de 32x48).
 */
const sharp = require('sharp')
const path = require('path')
const W = 32, H = 48
const CHAR_DIR = path.resolve(__dirname, '..', 'client', 'public', 'assets', 'character')

const VISOR    = [140, 215, 255]
const VISOR_HI = [210, 245, 255]
const VISOR_LO = [65, 125, 195]

const CHARS = [
  { name: 'adam',    body: [197, 17, 17]   },
  { name: 'ash',     body: [30, 60, 210]   },
  { name: 'lucy',    body: [237, 84, 186]  },
  { name: 'nancy',   body: [120, 50, 190]  },
  { name: 'dany',    body: [40, 190, 180]  },
  { name: 'marcus',  body: [20, 140, 50]   },
  { name: 'elena',   body: [240, 130, 20]  },
  { name: 'kenji',   body: [80, 230, 60]   },
  { name: 'priya',   body: [230, 120, 100] },
  { name: 'omar',    body: [120, 80, 35]   },
  { name: 'sophie',  body: [236, 120, 125] },
  { name: 'carlos',  body: [246, 220, 60]  },
  { name: 'aisha',   body: [115, 45, 65]   },
  { name: 'tyler',   body: [155, 140, 115] },
  { name: 'mei',     body: [170, 130, 220] },
  { name: 'dmitri',  body: [125, 140, 150] },
  { name: 'fatima',  body: [80, 195, 140]  },
  { name: 'lucas',   body: [240, 200, 70]  },
  { name: 'yuki',    body: [220, 55, 160]  },
  { name: 'rafael',  body: [30, 50, 110]   },
  { name: 'nina',    body: [250, 165, 135] },
  { name: 'sam',     body: [130, 145, 55]  },
  { name: 'jin',     body: [80, 100, 150]  },
  { name: 'zara',    body: [165, 35, 60]   },
  { name: 'felix',   body: [40, 175, 170]  },
]

/* ── Drawing primitives ──────────────────────────────────────── */

function px(buf, x, y, r, g, b) {
  x = Math.round(x); y = Math.round(y)
  if (x < 0 || x >= W || y < 0 || y >= H) return
  const i = (y * W + x) * 4
  buf[i] = r; buf[i+1] = g; buf[i+2] = b; buf[i+3] = 255
}

function al(buf, x, y) {
  if (x < 0 || x >= W || y < 0 || y >= H) return 0
  return buf[(y * W + x) * 4 + 3]
}

function fillRect(buf, x0, y0, w, h, c) {
  for (let y = y0; y < y0+h; y++)
    for (let x = x0; x < x0+w; x++)
      px(buf, x, y, c[0], c[1], c[2])
}

function fillEllipse(buf, cx, cy, rx, ry, c) {
  for (let y = Math.floor(cy-ry); y <= Math.ceil(cy+ry); y++)
    for (let x = Math.floor(cx-rx); x <= Math.ceil(cx+rx); x++)
      if (((x-cx)/rx)**2 + ((y-cy)/ry)**2 <= 1.0)
        px(buf, x, y, c[0], c[1], c[2])
}

function addOutline(buf, c) {
  const pts = []
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (al(buf,x,y) > 0) continue
      if (al(buf,x-1,y)>0||al(buf,x+1,y)>0||al(buf,x,y-1)>0||al(buf,x,y+1)>0)
        pts.push([x,y])
    }
  pts.forEach(([x,y]) => px(buf, x, y, c[0], c[1], c[2]))
}

function dk(c, f=0.55) { return c.map(v => Math.floor(v*f)) }
function lt(c, f=1.25) { return c.map(v => Math.min(255, Math.floor(v*f))) }

/* ── Draw one crewmate frame ─────────────────────────────────── */

function drawFrame(body, dir, frame, running, sitting) {
  const buf = new Uint8Array(W * H * 4)
  const shadow = dk(body)
  const light = lt(body)
  const outline = dk(body, 0.2)

  // Animation offsets
  const bob = running ? [0,-1,-2,-1,0,1][frame] : [0,0,-1,-1,0,0][frame]
  const step = running ? [-2,-1,0,1,2,1][frame] : 0
  const by = 7 + bob  // body top

  // ── LEGS (drawn first, body overlaps top) ──
  const legY = by + 21
  const legH = sitting ? 5 : 8
  const legW = 5

  if (sitting) {
    fillRect(buf, 9, legY, legW+1, legH, body)
    fillRect(buf, 18, legY, legW+1, legH, body)
  } else if (dir === 'left' || dir === 'right') {
    const fX = dir === 'left' ? 10 : 18
    const bX = dir === 'left' ? 18 : 10
    fillRect(buf, bX, legY - step, legW, legH, shadow)
    fillRect(buf, bX, legY + legH - 2 - step, legW, 2, dk(shadow,0.8))
    fillRect(buf, fX, legY + step, legW, legH, body)
    fillRect(buf, fX, legY + legH - 2 + step, legW, 2, shadow)
  } else {
    fillRect(buf, 10, legY + step, legW, legH, body)
    fillRect(buf, 10, legY + legH - 2 + step, legW, 2, shadow)
    fillRect(buf, 18, legY - step, legW, legH, body)
    fillRect(buf, 18, legY + legH - 2 - step, legW, 2, shadow)
  }

  // ── BACKPACK (behind body for side views) ──
  if (dir === 'left')  fillEllipse(buf, 24, by+12, 3, 5, shadow)
  if (dir === 'right') fillEllipse(buf, 8, by+12, 3, 5, shadow)

  // ── BODY (capsule: dome + torso + bottom curve) ──
  fillEllipse(buf, 16, by+6, 7, 6, body)     // dome
  fillRect(buf, 9, by+6, 15, 15, body)        // torso
  fillEllipse(buf, 16, by+20, 7, 2, body)     // bottom curve

  // ── SHADING ──
  // Dome highlight
  fillEllipse(buf, 14, by+4, 3, 2, light)
  // Lower body shadow
  for (let y = by+16; y <= by+22; y++)
    for (let x = 9; x <= 23; x++)
      if (al(buf,x,y) > 0) {
        const f = (y - (by+16)) / 6
        if (f > 0.3) px(buf, x, y, shadow[0], shadow[1], shadow[2])
      }

  // ── BACKPACK (on top for UP view) ──
  if (dir === 'up') {
    fillRect(buf, 12, by+8, 8, 6, shadow)
    fillRect(buf, 13, by+9, 6, 4, dk(shadow,0.85))
  }

  // ── VISOR ──
  if (dir === 'down') {
    fillRect(buf, 10, by+4, 10, 6, VISOR)
    // Rounded corners
    ;[[10,by+4],[19,by+4],[10,by+9],[19,by+9]].forEach(([x,y]) =>
      px(buf, x, y, body[0], body[1], body[2]))
    fillRect(buf, 11, by+4, 8, 1, VISOR_HI)
    fillRect(buf, 11, by+5, 2, 2, VISOR_HI)
    fillRect(buf, 11, by+9, 8, 1, VISOR_LO)
  } else if (dir === 'left') {
    fillRect(buf, 7, by+4, 9, 6, VISOR)
    ;[[7,by+4],[15,by+4],[7,by+9],[15,by+9]].forEach(([x,y]) =>
      px(buf, x, y, body[0], body[1], body[2]))
    fillRect(buf, 8, by+4, 7, 1, VISOR_HI)
    fillRect(buf, 8, by+5, 2, 2, VISOR_HI)
    fillRect(buf, 8, by+9, 7, 1, VISOR_LO)
  } else if (dir === 'right') {
    fillRect(buf, 16, by+4, 9, 6, VISOR)
    ;[[16,by+4],[24,by+4],[16,by+9],[24,by+9]].forEach(([x,y]) =>
      px(buf, x, y, body[0], body[1], body[2]))
    fillRect(buf, 17, by+4, 7, 1, VISOR_HI)
    fillRect(buf, 22, by+5, 2, 2, VISOR_HI)
    fillRect(buf, 17, by+9, 7, 1, VISOR_LO)
  }
  // UP view: no visor

  // ── OUTLINE ──
  addOutline(buf, outline)

  return Buffer.from(buf)
}

/* ── Assemble 52-frame spritesheet ───────────────────────────── */

async function generateChar(char) {
  const frames = []
  const dirs = ['right','up','left','down']

  // Idle: 6 frames x 4 directions = 24
  for (const d of dirs)
    for (let f = 0; f < 6; f++)
      frames.push(drawFrame(char.body, d, f, false, false))

  // Run: 6 frames x 4 directions = 24
  for (const d of dirs)
    for (let f = 0; f < 6; f++)
      frames.push(drawFrame(char.body, d, f, true, false))

  // Sit: 1 frame x 4 directions = 4 (order: down, left, right, up)
  for (const d of ['down','left','right','up'])
    frames.push(drawFrame(char.body, d, 0, false, true))

  // Assemble 1664x48 strip
  const composites = frames.map((buf, i) => ({
    input: buf,
    raw: { width: W, height: H, channels: 4 },
    left: i * W,
    top: 0,
  }))

  await sharp({
    create: { width: 52*W, height: H, channels: 4, background: {r:0,g:0,b:0,alpha:0} },
  }).composite(composites).png().toFile(path.join(CHAR_DIR, `chibi_${char.name}.png`))

  console.log(`  ✓ ${char.name}`)
}

async function main() {
  console.log('Generation de 25 avatars chibi Among Us...\n')
  for (const c of CHARS) await generateChar(c)
  console.log(`\nTermine ! ${CHARS.length} avatars dans ${CHAR_DIR}`)
}

main().catch(e => { console.error(e); process.exit(1) })
