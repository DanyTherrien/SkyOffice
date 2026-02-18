#!/usr/bin/env node
/**
 * populate-zones.js
 *
 * Ajoute 100+ objets decoratifs dans map.json pour donner une identite
 * visuelle distincte a chaque zone du bureau Capturia.
 *
 * Usage: node scripts/populate-zones.js
 *
 * Tilesets references (firstgid):
 *   FloorAndGround          1     (64 cols, 2560 tiles)
 *   Modern_Office_Black_Shadow 2584 (16 cols, 848 tiles)
 *   Generic                 3432  (16 cols, 1248 tiles)
 *   Basement                4688  (16 cols, 800 tiles)
 *   Classroom_and_library   5489  (16 cols, 544 tiles) — NOUVEAU
 *
 * Coordonnees map.json (convention Tiled pour les object layers):
 *   x = bord gauche de l'objet
 *   y = bord BAS de l'objet (pour un 32x32, le haut est a y-32)
 */

const fs = require('fs')
const path = require('path')

const MAP_PATH = path.join(__dirname, '../client/public/assets/map/map.json')

// ── Firstgid de chaque tileset ──────────────────────────────────────────
const GID = {
  floor: 1,
  office: 2584,
  generic: 3432,
  basement: 4688,
  classroom: 5489,
}

// ── Tiles utiles — Modern_Office (16 cols) ──────────────────────────────
const O = {
  // Cubicle dividers (rows 0-1, forment des separations 32x64)
  divTop1: GID.office + 0,
  divTop2: GID.office + 1,
  divTop3: GID.office + 2,
  divTop4: GID.office + 3,
  divBot1: GID.office + 16,
  divBot2: GID.office + 17,
  divBot3: GID.office + 18,
  divBot4: GID.office + 19,
  // Desk surfaces (row 3, deja utilises)
  deskL: GID.office + 48,
  deskR: GID.office + 49,
  // Row 4: sofas, plante, accessoires
  sofaL: GID.office + 64,
  sofaR: GID.office + 65,
  sofaL2: GID.office + 66,
  sofaR2: GID.office + 67,
  plant: GID.office + 69,
  frameSm: GID.office + 70,
  laptop: GID.office + 71,
  // Row 5: chaises, moniteurs
  chairL: GID.office + 80,
  chairR: GID.office + 81,
  monitor1: GID.office + 88,
  monitor2: GID.office + 89,
  // Row 6: cadres, etageres, ecrans graphiques
  frameArt1: GID.office + 96,
  frameArt2: GID.office + 97,
  frameArt3: GID.office + 98,
  frameArt4: GID.office + 99,
  shelf1: GID.office + 102,
  shelf2: GID.office + 103,
  graphScr1: GID.office + 104,
  graphScr2: GID.office + 105,
  // Row 7: sieges d'attente
  seatGray: GID.office + 114,
  seatBlue: GID.office + 115,
  seatGold: GID.office + 116,
  // Row 10-11: murs de cubicle
  cubWall1: GID.office + 160,
  cubWall2: GID.office + 161,
  cubWall3: GID.office + 162,
  cubWall4: GID.office + 163,
  cubWall5: GID.office + 176,
  cubWall6: GID.office + 177,
  // Row 12: classeurs, imprimante
  filing1: GID.office + 192,
  filing2: GID.office + 193,
  printer: GID.office + 198,
  // Row 14: table de conference
  confT1: GID.office + 224,
  confT2: GID.office + 225,
  confT3: GID.office + 226,
  confT4: GID.office + 227,
  // Row 15: comptoir/bureau
  counter1: GID.office + 240,
  counter2: GID.office + 241,
}

// ── Tiles utiles — Generic (16 cols) ────────────────────────────────────
const G = {
  // Row 0: petits objets deco
  lampDesk: GID.generic + 0,
  stool: GID.generic + 1,
  nightstand: GID.generic + 2,
  // Row 1
  ottoman: GID.generic + 16,
  // Row 3-4: tapis colores (paires 2x2)
  rugBlue_TL: GID.generic + 48,
  rugBlue_TR: GID.generic + 49,
  rugRed_TL: GID.generic + 50,
  rugRed_TR: GID.generic + 51,
  rugBlue_BL: GID.generic + 64,
  rugBlue_BR: GID.generic + 65,
  rugRed_BL: GID.generic + 66,
  rugRed_BR: GID.generic + 67,
  rugYel_TL: GID.generic + 52,
  rugYel_TR: GID.generic + 53,
  rugYel_BL: GID.generic + 68,
  rugYel_BR: GID.generic + 69,
  rugGrn_TL: GID.generic + 54,
  rugGrn_TR: GID.generic + 55,
  rugGrn_BL: GID.generic + 70,
  rugGrn_BR: GID.generic + 71,
  // Row 5-6: tables, chaises
  tableRnd: GID.generic + 80,
  chairSm1: GID.generic + 96,
  chairSm2: GID.generic + 97,
  // Row 8-9: motifs de moquette individuels
  carpet1: GID.generic + 128,
  carpet2: GID.generic + 129,
  carpet3: GID.generic + 130,
  carpet4: GID.generic + 131,
  carpet5: GID.generic + 144,
  carpet6: GID.generic + 145,
  // Row 11: plantes, arbres, cadres muraux
  plantLg1: GID.generic + 180,
  plantLg2: GID.generic + 181,
  treeSm: GID.generic + 182,
  treeLg: GID.generic + 183,
  plantPot1: GID.generic + 184,
  plantPot2: GID.generic + 185,
  palmTree1: GID.generic + 186,
  palmTree2: GID.generic + 187,
  frameW1: GID.generic + 188,
  frameW2: GID.generic + 189,
  // Row 22: fenetres
  window1: GID.generic + 352,
  window2: GID.generic + 353,
  window3: GID.generic + 354,
  window4: GID.generic + 355,
  // Row 28: pots de fleurs
  flowerPot1: GID.generic + 448,
  flowerPot2: GID.generic + 449,
  potPlant1: GID.generic + 450,
  potPlant2: GID.generic + 451,
}

// ── Tiles utiles — Basement (16 cols) ───────────────────────────────────
const B = {
  roundTable: GID.basement + 0,
  // Row 12-13: fenetres
  winBlue1: GID.basement + 192,
  winBlue2: GID.basement + 193,
  winGreen1: GID.basement + 194,
  winGreen2: GID.basement + 195,
  // Row 16-17: grands ecrans
  screenDk1: GID.basement + 256,
  screenDk2: GID.basement + 257,
  screenBlu1: GID.basement + 258,
  screenBlu2: GID.basement + 259,
  // Row 20-22: fauteuils colores
  armYellow: GID.basement + 320,
  armRed: GID.basement + 321,
  armWhite: GID.basement + 322,
  armBlue: GID.basement + 323,
  armLBlue: GID.basement + 324,
  armGreen: GID.basement + 325,
  // Row 31: panneaux d'affichage
  display1: GID.basement + 496,
  display2: GID.basement + 497,
}

// ── Tiles utiles — Classroom_and_library (16 cols) ──────────────────────
const C = {
  desk: GID.classroom + 0,
  chairCl: GID.classroom + 1,
  globe1: GID.classroom + 14,
  globe2: GID.classroom + 15,
  // Row 4-5: longues etageres de livres (top + bottom)
  bkLongT1: GID.classroom + 64,
  bkLongT2: GID.classroom + 65,
  bkLongT3: GID.classroom + 66,
  bkLongT4: GID.classroom + 67,
  bkLongB1: GID.classroom + 80,
  bkLongB2: GID.classroom + 81,
  bkLongB3: GID.classroom + 82,
  bkLongB4: GID.classroom + 83,
  // Row 9: etageres individuelles
  bkShelf1: GID.classroom + 144,
  bkShelf2: GID.classroom + 145,
  bkShelf3: GID.classroom + 146,
  bkShelf4: GID.classroom + 147,
  bkShelfB1: GID.classroom + 160,
  bkShelfB2: GID.classroom + 161,
  bkShelfB3: GID.classroom + 162,
  bkShelfB4: GID.classroom + 163,
  // Row 13: livres individuels, signet
  books1: GID.classroom + 200,
  books2: GID.classroom + 201,
  openBook: GID.classroom + 202,
}

// ── Helpers ─────────────────────────────────────────────────────────────
let nextId = 200

function obj(gid, x, y, w = 32, h = 32) {
  return {
    gid,
    height: h,
    id: nextId++,
    name: '',
    rotation: 0,
    type: '',
    visible: true,
    width: w,
    x,
    y,
  }
}

function getLayer(map, name) {
  return map.layers.find((l) => l.name === name)
}

// ── Main ────────────────────────────────────────────────────────────────
const map = JSON.parse(fs.readFileSync(MAP_PATH, 'utf-8'))

console.log('[populate] Lecture de map.json OK')
console.log('[populate] Layers existants:', map.layers.map((l) => l.name).join(', '))

// ── 1. Ajouter le tileset Classroom_and_library ─────────────────────────
const hasClassroom = map.tilesets.some((t) => t.name === 'Classroom_and_library')
if (!hasClassroom) {
  map.tilesets.push({
    columns: 16,
    firstgid: GID.classroom,
    image: '../tileset/Classroom_and_library.png',
    imageheight: 1088,
    imagewidth: 512,
    margin: 0,
    name: 'Classroom_and_library',
    spacing: 0,
    tilecount: 544,
    tileheight: 32,
    tilewidth: 32,
  })
  console.log('[populate] Tileset Classroom_and_library ajoute (firstgid=5489)')
}

// ── 2. Ajouter le layer ClassroomObjects s'il n'existe pas ──────────────
if (!getLayer(map, 'ClassroomObjects')) {
  const basementIdx = map.layers.findIndex((l) => l.name === 'Basement')
  map.layers.splice(basementIdx + 1, 0, {
    draworder: 'topdown',
    id: 20,
    name: 'ClassroomObjects',
    objects: [],
    opacity: 1,
    type: 'objectgroup',
    visible: true,
    x: 0,
    y: 0,
  })
  console.log('[populate] Layer ClassroomObjects cree')
}

// ── 3. References aux layers ────────────────────────────────────────────
const wallLayer = getLayer(map, 'Wall')
const objectsLayer = getLayer(map, 'Objects')
const objCollideLayer = getLayer(map, 'ObjectsOnCollide')
const genericLayer = getLayer(map, 'GenericObjects')
const genericCollideLayer = getLayer(map, 'GenericObjectsOnCollide')
const basementLayer = getLayer(map, 'Basement')
const classroomLayer = getLayer(map, 'ClassroomObjects')

// ═══════════════════════════════════════════════════════════════════════
// ZONE 1 — BRAINSTORM (top-left: x 32-352, y 32-256)
// Theme: creatif, ouvert, plantes, couleurs vives
// ═══════════════════════════════════════════════════════════════════════

console.log('[populate] Zone Brainstorm...')

// Plantes decoratives
genericLayer.objects.push(
  obj(G.plantPot1, 304, 96),     // plante haut-droite
  obj(G.plantPot2, 48, 240),     // plante bas-gauche
  obj(G.treeSm, 304, 240),       // petit arbre bas-droite
  obj(G.flowerPot1, 272, 64),    // pot de fleurs mur nord
)

// Tapis colore bleu/jaune (2x2 = 64x64px) au centre
genericLayer.objects.push(
  obj(G.rugBlue_TL, 160, 144),
  obj(G.rugBlue_TR, 192, 144),
  obj(G.rugBlue_BL, 160, 176),
  obj(G.rugBlue_BR, 192, 176),
)

// Cadres sur le mur nord
objectsLayer.objects.push(
  obj(O.frameArt1, 256, 64),     // cadre droit du whiteboard
  obj(O.frameArt2, 288, 64),     // cadre encore plus a droite
  obj(O.frameArt3, 64, 64),      // cadre gauche
)

// Plante et accessoires sur meubles
objectsLayer.objects.push(
  obj(O.plant, 240, 128),        // plante sur une surface
  obj(O.laptop, 96, 192),        // laptop pres du computer
  obj(O.frameSm, 320, 128),      // petit cadre cote droit
)

// Etagere decorative cote droit
objectsLayer.objects.push(
  obj(O.shelf1, 320, 160),
  obj(O.shelf2, 320, 192),
)

// Fauteuils colores (Basement) — ambiance creative
basementLayer.objects.push(
  obj(B.armYellow, 272, 224),     // fauteuil jaune
  obj(B.armRed, 64, 160),         // fauteuil rouge
)

// ═══════════════════════════════════════════════════════════════════════
// ZONE 2 — MEETING (top-right: x 416-736, y 32-256)
// Theme: formel, table de conference, cafe, presentation
// ═══════════════════════════════════════════════════════════════════════

console.log('[populate] Zone Meeting...')

// Extension de la table de conference (row 14 office)
objectsLayer.objects.push(
  obj(O.confT1, 528, 224),
  obj(O.confT2, 560, 224),
  obj(O.confT3, 592, 224),
  obj(O.confT4, 624, 224),
)

// Ecrans de presentation (Basement — grands ecrans)
basementLayer.objects.push(
  obj(B.screenBlu1, 560, 64),    // ecran bleu centre du mur nord
  obj(B.screenBlu2, 592, 64),    // ecran bleu (suite)
)

// Plantes formelles
genericLayer.objects.push(
  obj(G.plantLg1, 432, 96),      // plante gauche du mur
  obj(G.plantLg2, 720, 96),      // plante droite du mur
  obj(G.potPlant1, 432, 240),    // plante bas-gauche
  obj(G.potPlant2, 720, 240),    // plante bas-droite
)

// Tapis formel rouge (2x2)
genericLayer.objects.push(
  obj(G.rugRed_TL, 560, 128),
  obj(G.rugRed_TR, 592, 128),
  obj(G.rugRed_BL, 560, 160),
  obj(G.rugRed_BR, 592, 160),
)

// Cadres/horloge sur le mur
objectsLayer.objects.push(
  obj(O.frameArt4, 448, 64),     // cadre gauche
  obj(O.frameArt1, 704, 64),     // cadre droite
)

// Accessoires de reunion
objectsLayer.objects.push(
  obj(O.plant, 656, 128),        // plante decorative
  obj(O.laptop, 544, 192),       // laptop sur table
  obj(O.laptop, 608, 192),       // laptop sur table
)

// Fenetres sur mur nord (Generic)
genericLayer.objects.push(
  obj(G.window1, 464, 64),
  obj(G.window2, 496, 64),
  obj(G.window3, 656, 64),
  obj(G.window4, 688, 64),
)

// ═══════════════════════════════════════════════════════════════════════
// ZONE 3 — DEEP WORK (bottom-left: x 32-352, y 320-544)
// Theme: calme, cubicles, bibliotheques, lampes, concentration
// ═══════════════════════════════════════════════════════════════════════

console.log('[populate] Zone Deep Work...')

// Separations de cubicle (Office rows 0-1, paires top+bottom = 32x64)
objCollideLayer.objects.push(
  // Cubicle gauche
  obj(O.divTop1, 160, 352, 32, 32),
  obj(O.divBot1, 160, 384, 32, 32),
  // Cubicle central
  obj(O.divTop2, 256, 352, 32, 32),
  obj(O.divBot2, 256, 384, 32, 32),
)

// Bibliotheques (Classroom — longue etagere 4 tiles de large, 2 de haut)
classroomLayer.objects.push(
  // Etagere le long du mur nord de la zone (y=352 = mur)
  obj(C.bkLongT1, 48, 352),
  obj(C.bkLongT2, 80, 352),
  obj(C.bkLongT3, 112, 352),
  obj(C.bkLongT4, 144, 352),
  // Etagere cote droit
  obj(C.bkShelf1, 304, 384),
  obj(C.bkShelf2, 336, 384),
  obj(C.bkShelf3, 304, 416),
  obj(C.bkShelf4, 336, 416),
)

// Globe et livres pour l'ambiance studieuse
classroomLayer.objects.push(
  obj(C.globe1, 288, 352),       // globe sur une etagere
  obj(C.books1, 192, 384),       // livres sur un bureau
  obj(C.openBook, 176, 512),     // livre ouvert
)

// Classeurs (Filing cabinets)
objectsLayer.objects.push(
  obj(O.filing1, 48, 480),       // classeur gauche
  obj(O.filing2, 48, 512),       // classeur gauche (bas)
)

// Lampe de bureau et accessoires
genericLayer.objects.push(
  obj(G.lampDesk, 144, 416),     // lampe sur bureau
  obj(G.lampDesk, 240, 416),     // lampe sur autre bureau
  obj(G.nightstand, 320, 480),   // table de nuit / rangement
)

// Plantes (moins que brainstorm, plus sobre)
genericLayer.objects.push(
  obj(G.plantPot1, 48, 352),     // plante coin
  obj(G.plantLg1, 320, 528),     // plante bas-droite
)

// Moquette neutre (carpet tiles individuels)
genericLayer.objects.push(
  obj(G.carpet1, 128, 464),
  obj(G.carpet2, 160, 464),
  obj(G.carpet3, 192, 464),
  obj(G.carpet1, 128, 496),
  obj(G.carpet2, 160, 496),
  obj(G.carpet3, 192, 496),
)

// Imprimante pres des bureaux
objectsLayer.objects.push(
  obj(O.printer, 304, 512),
)

// ═══════════════════════════════════════════════════════════════════════
// ZONE 4 — SALES (bottom-right: x 416-736, y 320-544)
// Theme: energique, moniteurs, graphiques, standing desks
// ═══════════════════════════════════════════════════════════════════════

console.log('[populate] Zone Sales...')

// Ecrans de graphiques/KPI (Office row 6)
objectsLayer.objects.push(
  obj(O.graphScr1, 448, 352),    // graphique mur nord
  obj(O.graphScr2, 480, 352),    // graphique suite
  obj(O.graphScr1, 640, 352),    // graphique droite
  obj(O.graphScr2, 672, 352),    // graphique suite
)

// Moniteurs supplementaires sur les bureaux
objectsLayer.objects.push(
  obj(O.monitor1, 512, 384),     // moniteur bureau
  obj(O.monitor2, 544, 384),     // moniteur bureau
  obj(O.laptop, 592, 416),       // laptop
  obj(O.laptop, 464, 416),       // laptop
)

// Panneau motivationnel / display (Basement)
basementLayer.objects.push(
  obj(B.display1, 704, 384),     // panneau affichage
  obj(B.display2, 704, 416),     // panneau suite
  obj(B.screenDk1, 560, 352),    // ecran sombre
  obj(B.screenDk2, 592, 352),    // ecran sombre suite
)

// Tapis energique vert (2x2)
genericLayer.objects.push(
  obj(G.rugGrn_TL, 544, 464),
  obj(G.rugGrn_TR, 576, 464),
  obj(G.rugGrn_BL, 544, 496),
  obj(G.rugGrn_BR, 576, 496),
)

// Plantes dynamiques
genericLayer.objects.push(
  obj(G.treeLg, 432, 352),       // arbre entree de zone
  obj(G.palmTree1, 720, 528),    // palmier coin
  obj(G.potPlant1, 432, 528),    // pot bas-gauche
)

// Cadres et poster motivationnel
objectsLayer.objects.push(
  obj(O.frameArt2, 512, 352),    // poster
  obj(O.frameArt3, 624, 352),    // cadre
)

// Classeur et rangement
objectsLayer.objects.push(
  obj(O.filing1, 720, 464),      // classeur cote
  obj(O.filing2, 720, 496),      // classeur bas
)

// Fauteuil pour espace detente rapide
basementLayer.objects.push(
  obj(B.armGreen, 464, 528),     // fauteuil vert (energie!)
)

// ═══════════════════════════════════════════════════════════════════════
// CORRIDORS & ZONE COMMUNE (entre les 4 zones)
// ═══════════════════════════════════════════════════════════════════════

console.log('[populate] Corridors & espace commun...')

// Plantes aux intersections des corridors
genericLayer.objects.push(
  obj(G.palmTree2, 368, 160),    // palmier couloir vertical haut
  obj(G.palmTree1, 368, 448),    // palmier couloir vertical bas
  obj(G.treeSm, 192, 288),      // arbre couloir horizontal gauche
  obj(G.treeLg, 560, 288),      // arbre couloir horizontal droite
)

// Petites decorations de couloir
genericLayer.objects.push(
  obj(G.flowerPot2, 384, 288),   // pot au carrefour central
  obj(G.potPlant2, 384, 320),    // pot au carrefour
)

// Fenetres sur les murs exterieurs (Generic row 22)
// Mur nord (y=32 = bord superieur de la carte)
wallLayer.objects.push(
  // Mur nord — zone Brainstorm
  obj(G.window1, 96, 48, 32, 32),
  obj(G.window2, 128, 48, 32, 32),
  obj(G.window1, 256, 48, 32, 32),
  obj(G.window2, 288, 48, 32, 32),
  // Mur nord — zone Meeting
  obj(G.window3, 480, 48, 32, 32),
  obj(G.window4, 512, 48, 32, 32),
  obj(G.window3, 640, 48, 32, 32),
  obj(G.window4, 672, 48, 32, 32),
)

// Fenetres mur sud (y=576 = bord inferieur)
wallLayer.objects.push(
  // Mur sud — zone Deep Work
  obj(G.window1, 96, 560, 32, 32),
  obj(G.window2, 128, 560, 32, 32),
  obj(G.window1, 256, 560, 32, 32),
  obj(G.window2, 288, 560, 32, 32),
  // Mur sud — zone Sales
  obj(G.window3, 480, 560, 32, 32),
  obj(G.window4, 512, 560, 32, 32),
  obj(G.window3, 640, 560, 32, 32),
  obj(G.window4, 672, 560, 32, 32),
)

// Fenetres mur ouest (x=0-32) — Brainstorm et Deep Work
wallLayer.objects.push(
  obj(G.window1, 16, 96, 32, 32),
  obj(G.window2, 16, 160, 32, 32),
  obj(G.window1, 16, 384, 32, 32),
  obj(G.window2, 16, 448, 32, 32),
)

// Fenetres mur est (x=736-768) — Meeting et Sales
wallLayer.objects.push(
  obj(G.window3, 736, 96, 32, 32),
  obj(G.window4, 736, 160, 32, 32),
  obj(G.window3, 736, 384, 32, 32),
  obj(G.window4, 736, 448, 32, 32),
)

// ═══════════════════════════════════════════════════════════════════════
// VARIATION DES SOLS — Modifier le Ground layer data
// ═══════════════════════════════════════════════════════════════════════

console.log('[populate] Variation des sols...')

const groundLayer = map.layers.find((l) => l.name === 'Ground')
const W = 24 // largeur en tiles

// Tiles de sol alternatifs (FloorAndGround tileset, firstgid=1)
// Tile 415 = sol gauche actuel, Tile 412 = sol droit actuel
// Utilisons des variantes proches pour creer de la diversite
const FLOOR_ALT1 = 416  // variante 1 (adjacent a 415)
const FLOOR_ALT2 = 413  // variante 2 (adjacent a 412)
const FLOOR_ALT3 = 480  // variante 3 (rangee suivante)
const FLOOR_ALT4 = 477  // variante 4

// Helper: modifier un tile du Ground layer (row/col 0-based)
function setGroundTile(col, row, tileId) {
  const idx = row * W + col
  if (idx >= 0 && idx < groundLayer.data.length) {
    groundLayer.data[idx] = tileId
  }
}

// Brainstorm (cols 1-11, rows 1-7): petite zone de tapis au centre
// Centre: cols 4-7, rows 3-5
for (let r = 3; r <= 5; r++) {
  for (let c = 4; c <= 7; c++) {
    setGroundTile(c, r, FLOOR_ALT1)
  }
}

// Meeting (cols 13-22, rows 1-7): moquette formelle au centre
// Centre: cols 16-19, rows 3-5
for (let r = 3; r <= 5; r++) {
  for (let c = 16; c <= 19; c++) {
    setGroundTile(c, r, FLOOR_ALT2)
  }
}

// Deep Work (cols 1-11, rows 10-16): sol neutre/sobre au centre
// Centre: cols 4-7, rows 12-14
for (let r = 12; r <= 14; r++) {
  for (let c = 4; c <= 7; c++) {
    setGroundTile(c, r, FLOOR_ALT3)
  }
}

// Sales (cols 13-22, rows 10-16): sol energique au centre
// Centre: cols 16-19, rows 12-14
for (let r = 12; r <= 14; r++) {
  for (let c = 16; c <= 19; c++) {
    setGroundTile(c, r, FLOOR_ALT4)
  }
}

// ═══════════════════════════════════════════════════════════════════════
// STATS & ECRITURE
// ═══════════════════════════════════════════════════════════════════════

const totalNew = nextId - 200
console.log(`\n[populate] Total objets ajoutes: ${totalNew}`)
console.log('[populate] Repartition:')
console.log(`  Wall:              ${wallLayer.objects.length} objets`)
console.log(`  Objects:           ${objectsLayer.objects.length} objets`)
console.log(`  ObjectsOnCollide:  ${objCollideLayer.objects.length} objets`)
console.log(`  GenericObjects:    ${genericLayer.objects.length} objets`)
console.log(`  Basement:          ${basementLayer.objects.length} objets`)
console.log(`  ClassroomObjects:  ${classroomLayer.objects.length} objets`)

// Ecrire le fichier mis a jour
fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 1))
console.log(`\n[populate] map.json mis a jour avec succes!`)
console.log(`[populate] Taille: ${(fs.statSync(MAP_PATH).size / 1024).toFixed(1)} KB`)
