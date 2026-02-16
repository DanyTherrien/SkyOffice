#!/usr/bin/env node
/**
 * Script de generation de la carte compacte 24x18
 * Lit le map.json original, modifie les dimensions, et genere la nouvelle carte
 */

const fs = require('fs')
const path = require('path')

const srcPath = path.join(__dirname, '..', 'client', 'public', 'assets', 'map', 'map.json')
const outPath = srcPath // overwrite in place

const original = JSON.parse(fs.readFileSync(srcPath, 'utf-8'))

// === NOUVELLES DIMENSIONS ===
const W = 24
const H = 18

// === TILE IDs (du tileset FloorAndGround) ===
const TILES = {
  // Coins
  TL_CORNER: 88,   // top-left corner (collision)
  TR_CORNER: 90,   // top-right corner (collision)
  BL_CORNER: 216,  // bottom-left corner (collision)
  BR_CORNER: 218,  // bottom-right corner (collision)
  // Murs
  TOP_WALL: 546,   // top wall (collision)
  BOTTOM_WALL: 217, // bottom wall (collision)
  LEFT_WALL: 152,  // left wall (collision)
  RIGHT_WALL: 154, // right wall (collision)
  SEPARATOR: 92,   // interior wall separator (collision)
  // Sols (walkable)
  BRAINSTORM_FLOOR: 415,
  MEETING_FLOOR: 412,
  DEEPWORK_FLOOR: 1607,
  SALES_FLOOR: 668,
}

// === GENERATION DU GROUND LAYER (24x18 = 432 tiles) ===
function generateGroundData() {
  const data = new Array(W * H).fill(0)

  function setTile(col, row, tileId) {
    if (col >= 0 && col < W && row >= 0 && row < H) {
      data[row * W + col] = tileId
    }
  }

  function fillRow(row, tiles) {
    for (let col = 0; col < W; col++) {
      setTile(col, row, tiles[col])
    }
  }

  // --- Row 0: top wall ---
  setTile(0, 0, TILES.TL_CORNER)
  for (let c = 1; c < W - 1; c++) setTile(c, 0, TILES.TOP_WALL)
  setTile(W - 1, 0, TILES.TR_CORNER)

  // --- Row 17: bottom wall ---
  setTile(0, H - 1, TILES.BL_CORNER)
  for (let c = 1; c < W - 1; c++) setTile(c, H - 1, TILES.BOTTOM_WALL)
  setTile(W - 1, H - 1, TILES.BR_CORNER)

  // --- Corridor en "+" : cols 11-12 (vertical) + rows 8-9 (horizontal) ---
  // Le corridor est toujours walkable et connecte les 4 salles.
  // Les murs ne sont qu'au perimetre exterieur.

  // --- Rows 1-7: top rooms (brainstorm left, meeting right) ---
  for (let r = 1; r <= 7; r++) {
    setTile(0, r, TILES.LEFT_WALL)
    // Brainstorm floor (cols 1-10)
    for (let c = 1; c <= 10; c++) setTile(c, r, TILES.BRAINSTORM_FLOOR)
    // Corridor vertical (cols 11-12) — toujours ouvert
    setTile(11, r, TILES.BRAINSTORM_FLOOR)
    setTile(12, r, TILES.MEETING_FLOOR)
    // Meeting floor (cols 13-22)
    for (let c = 13; c <= 22; c++) setTile(c, r, TILES.MEETING_FLOOR)
    setTile(W - 1, r, TILES.RIGHT_WALL)
  }

  // --- Rows 8-9: corridor horizontal (toujours ouvert) ---
  for (let r = 8; r <= 9; r++) {
    setTile(0, r, TILES.LEFT_WALL)
    // Cote gauche: transition brainstorm → deep_work
    for (let c = 1; c <= 10; c++) {
      setTile(c, r, r === 8 ? TILES.BRAINSTORM_FLOOR : TILES.DEEPWORK_FLOOR)
    }
    // Centre: carrefour
    setTile(11, r, r === 8 ? TILES.BRAINSTORM_FLOOR : TILES.DEEPWORK_FLOOR)
    setTile(12, r, r === 8 ? TILES.MEETING_FLOOR : TILES.SALES_FLOOR)
    // Cote droit: transition meeting → sales
    for (let c = 13; c <= 22; c++) {
      setTile(c, r, r === 8 ? TILES.MEETING_FLOOR : TILES.SALES_FLOOR)
    }
    setTile(W - 1, r, TILES.RIGHT_WALL)
  }

  // --- Rows 10-16: bottom rooms (deep_work left, sales right) ---
  for (let r = 10; r <= 16; r++) {
    setTile(0, r, TILES.LEFT_WALL)
    // Deep work floor (cols 1-10)
    for (let c = 1; c <= 10; c++) setTile(c, r, TILES.DEEPWORK_FLOOR)
    // Corridor vertical (cols 11-12) — toujours ouvert
    setTile(11, r, TILES.DEEPWORK_FLOOR)
    setTile(12, r, TILES.SALES_FLOOR)
    // Sales floor (cols 13-22)
    for (let c = 13; c <= 22; c++) setTile(c, r, TILES.SALES_FLOOR)
    setTile(W - 1, r, TILES.RIGHT_WALL)
  }

  return data
}

// === ITEMS INTERACTIFS ===
// GIDs
const CHAIR_UP = 2561, CHAIR_DOWN = 2562, CHAIR_LEFT = 2563, CHAIR_RIGHT = 2564
const COMPUTER_0 = 4680, COMPUTER_1 = 4681, COMPUTER_2 = 4682, COMPUTER_3 = 4683
const WHITEBOARD_0 = 4685, WHITEBOARD_1 = 4686
const VENDING = 5488

// Firstgids pour les tilesets de decoration
const MODERN_OFFICE_FIRSTGID = 2584
const GENERIC_FIRSTGID = 3432
const BASEMENT_FIRSTGID = 4688

function makeChair(x, y, direction) {
  const gidMap = { up: CHAIR_UP, down: CHAIR_DOWN, left: CHAIR_LEFT, right: CHAIR_RIGHT }
  return {
    gid: gidMap[direction],
    height: 64, width: 32,
    id: 0, // will be assigned
    name: '',
    rotation: 0,
    type: '',
    visible: true,
    x, y,
    properties: [{ name: 'direction', type: 'string', value: direction }]
  }
}

function makeComputer(x, y, gid) {
  return {
    gid, height: 64, width: 96,
    id: 0, name: '', rotation: 0, type: '', visible: true, x, y
  }
}

function makeWhiteboard(x, y, gid) {
  return {
    gid, height: 64, width: 64,
    id: 0, name: '', rotation: 0, type: '', visible: true, x, y
  }
}

function makeVendingMachine(x, y) {
  return {
    gid: VENDING, height: 72, width: 48,
    id: 0, name: '', rotation: 0, type: '', visible: true, x, y
  }
}

function makeDecoObject(x, y, gid, w = 32, h = 32) {
  return {
    gid, height: h, width: w,
    id: 0, name: '', rotation: 0, type: '', visible: true, x, y
  }
}

function makeZone(name, x, y, width, height) {
  return {
    height, width, x, y,
    id: 0,
    name,
    rotation: 0,
    type: '',
    visible: true
  }
}

// === PLACEMENT DES ITEMS ===
// Coordonnees en pixels. Rappel: y en Tiled = bas de l'objet
// Rooms pixel bounds:
//   Brainstorm: cols 1-10, rows 1-7 -> x: 32-352, y: 32-256
//   Meeting:    cols 13-22, rows 1-7 -> x: 416-736, y: 32-256
//   Deep Work:  cols 1-10, rows 10-16 -> x: 32-352, y: 320-544
//   Sales:      cols 13-22, rows 10-16 -> x: 416-736, y: 320-544

function generateChairs() {
  return [
    // === BRAINSTORM (4 chaises autour d'une zone de table) ===
    makeChair(128, 160, 'up'),     // col 4, row 3-4 area
    makeChair(224, 160, 'up'),     // col 7
    makeChair(128, 224, 'down'),   // col 4, row 5-6 area
    makeChair(224, 224, 'down'),   // col 7

    // === MEETING (6 chaises en conference — 3 de chaque cote) ===
    makeChair(480, 128, 'right'),  // left side, row 2
    makeChair(480, 176, 'right'),  // left side, row 3
    makeChair(480, 224, 'right'),  // left side, row 5
    makeChair(672, 128, 'left'),   // right side, row 2
    makeChair(672, 176, 'left'),   // right side, row 3
    makeChair(672, 224, 'left'),   // right side, row 5

    // === DEEP WORK (3 chaises devant les bureaux) ===
    makeChair(112, 448, 'down'),   // devant computer 0
    makeChair(272, 448, 'down'),   // devant computer 1
    makeChair(176, 512, 'up'),     // supplementaire

    // === SALES (3 chaises) ===
    makeChair(496, 448, 'down'),   // devant computer
    makeChair(656, 448, 'down'),   // devant computer
    makeChair(576, 512, 'up'),     // supplementaire
  ]
}

function generateComputers() {
  // 6 ordinateurs au total (requis par le serveur)
  return [
    // Brainstorm: 1 computer
    makeComputer(80, 128, COMPUTER_0),     // top area

    // Meeting: 1 computer
    makeComputer(640, 96, COMPUTER_1),     // top-right

    // Deep Work: 2 computers (zone de travail principale)
    makeComputer(64, 400, COMPUTER_2),     // left desk
    makeComputer(224, 400, COMPUTER_3),    // right desk

    // Sales: 2 computers
    makeComputer(448, 400, COMPUTER_0),    // left desk
    makeComputer(608, 400, COMPUTER_1),    // right desk
  ]
}

function generateWhiteboards() {
  // 2 whiteboards au total (requis par le serveur)
  return [
    // Brainstorm: whiteboard sur le mur nord
    makeWhiteboard(160, 96, WHITEBOARD_0),

    // Meeting: whiteboard sur le mur nord
    makeWhiteboard(544, 96, WHITEBOARD_1),
  ]
}

function generateVendingMachines() {
  return [
    // Sales: vending machine dans le coin
    makeVendingMachine(688, 536),
  ]
}

// === DECORATIONS ===
// Modern_Office tiles (firstgid 2584, 16 cols)
// Quelques tiles utiles estimes dans Modern_Office_Black_Shadow:
// Les indices sont relatifs au tileset, donc gid = firstgid + index
// On va ajouter des objets decoratifs pour donner de la personnalite aux salles

function generateDecoObjects() {
  // Objects layer — Modern_Office tileset
  // On place des objets decoratifs non-collidable
  return [
    // === BRAINSTORM ===
    // Petite table (centre de la salle) — utilise un tile table
    makeDecoObject(160, 192, MODERN_OFFICE_FIRSTGID + 48),   // table tile
    makeDecoObject(192, 192, MODERN_OFFICE_FIRSTGID + 49),   // table tile (suite)

    // === MEETING ===
    // Table conference longue (centre)
    makeDecoObject(528, 160, MODERN_OFFICE_FIRSTGID + 48),
    makeDecoObject(560, 160, MODERN_OFFICE_FIRSTGID + 49),
    makeDecoObject(592, 160, MODERN_OFFICE_FIRSTGID + 48),
    makeDecoObject(624, 160, MODERN_OFFICE_FIRSTGID + 49),
    makeDecoObject(528, 192, MODERN_OFFICE_FIRSTGID + 64),
    makeDecoObject(560, 192, MODERN_OFFICE_FIRSTGID + 65),
    makeDecoObject(592, 192, MODERN_OFFICE_FIRSTGID + 64),
    makeDecoObject(624, 192, MODERN_OFFICE_FIRSTGID + 65),

    // === DEEP WORK ===
    // Bureaux (dessus de table pour les computers)
    makeDecoObject(96, 384, MODERN_OFFICE_FIRSTGID + 80),
    makeDecoObject(128, 384, MODERN_OFFICE_FIRSTGID + 81),
    makeDecoObject(256, 384, MODERN_OFFICE_FIRSTGID + 80),
    makeDecoObject(288, 384, MODERN_OFFICE_FIRSTGID + 81),

    // === SALES ===
    // Bureaux pour les computers
    makeDecoObject(480, 384, MODERN_OFFICE_FIRSTGID + 80),
    makeDecoObject(512, 384, MODERN_OFFICE_FIRSTGID + 81),
    makeDecoObject(640, 384, MODERN_OFFICE_FIRSTGID + 80),
    makeDecoObject(672, 384, MODERN_OFFICE_FIRSTGID + 81),
  ]
}

function generateGenericObjects() {
  // GenericObjects layer — Generic tileset
  // Plantes, lampes, et autres decorations
  return [
    // === BRAINSTORM — plantes et lampe ===
    makeDecoObject(48, 64, GENERIC_FIRSTGID + 0),      // coin haut-gauche
    makeDecoObject(320, 64, GENERIC_FIRSTGID + 0),      // coin haut-droit
    makeDecoObject(48, 256, GENERIC_FIRSTGID + 16),     // coin bas-gauche

    // === MEETING — plante et decoration ===
    makeDecoObject(432, 64, GENERIC_FIRSTGID + 0),      // coin haut-gauche
    makeDecoObject(720, 256, GENERIC_FIRSTGID + 16),    // coin bas-droit

    // === DEEP WORK — plante discrete ===
    makeDecoObject(320, 544, GENERIC_FIRSTGID + 0),     // coin

    // === SALES — plante et decoration ===
    makeDecoObject(432, 544, GENERIC_FIRSTGID + 0),     // coin
  ]
}

// === ZONES ===
function generateZones() {
  // Zones couvrent exactement les zones de chaque salle (sans les murs)
  return [
    makeZone('brainstorm', 32, 32, 320, 224),    // cols 1-10, rows 1-7
    makeZone('meeting', 416, 32, 320, 224),       // cols 13-22, rows 1-7
    makeZone('deep_work', 32, 320, 320, 224),     // cols 1-10, rows 10-16
    makeZone('sales', 416, 320, 320, 224),        // cols 13-22, rows 10-16
  ]
}

// === CONSTRUCTION DU NOUVEAU MAP.JSON ===

// Garder toutes les proprietes de base du fichier original
const newMap = { ...original }
newMap.width = W
newMap.height = H

// Assigner des IDs uniques aux objets
let nextObjectId = 100

function assignIds(objects) {
  return objects.map(obj => ({ ...obj, id: nextObjectId++ }))
}

// Construire les layers
newMap.layers = [
  // 0: Ground (tilelayer)
  {
    ...original.layers[0], // garder les proprietes du layer original
    data: generateGroundData(),
    height: H,
    width: W,
  },
  // 1: Chair (objectgroup)
  {
    ...original.layers[1],
    objects: assignIds(generateChairs()),
  },
  // 2: Computer (objectgroup)
  {
    ...original.layers[2],
    objects: assignIds(generateComputers()),
  },
  // 3: Whiteboard (objectgroup)
  {
    ...original.layers[3],
    objects: assignIds(generateWhiteboards()),
  },
  // 4: VendingMachine (objectgroup)
  {
    ...original.layers[4],
    objects: assignIds(generateVendingMachines()),
  },
  // 5: Wall (objectgroup) — vide pour l'instant
  {
    ...original.layers[5],
    objects: [],
  },
  // 6: Objects (objectgroup) — decoration Modern_Office
  {
    ...original.layers[6],
    objects: assignIds(generateDecoObjects()),
  },
  // 7: ObjectsOnCollide (objectgroup) — vide
  {
    ...original.layers[7],
    objects: [],
  },
  // 8: GenericObjects (objectgroup) — decoration Generic
  {
    ...original.layers[8],
    objects: assignIds(generateGenericObjects()),
  },
  // 9: GenericObjectsOnCollide (objectgroup) — vide
  {
    ...original.layers[9],
    objects: [],
  },
  // 10: Basement (objectgroup) — vide
  {
    ...original.layers[10],
    objects: [],
  },
  // 11: Zone (objectgroup)
  {
    ...original.layers[11],
    objects: assignIds(generateZones()),
  },
]

newMap.nextobjectid = nextObjectId

// Ecrire le fichier
fs.writeFileSync(outPath, JSON.stringify(newMap, null, 1))

console.log(`Carte compacte generee: ${W}x${H} tiles (${W * 32}x${H * 32} px)`)
console.log(`Ground layer: ${W * H} tiles`)
console.log(`Chairs: ${generateChairs().length}`)
console.log(`Computers: ${generateComputers().length}`)
console.log(`Whiteboards: ${generateWhiteboards().length}`)
console.log(`VendingMachines: ${generateVendingMachines().length}`)
console.log(`Zones: ${generateZones().length}`)
console.log(`Deco objects: ${generateDecoObjects().length}`)
console.log(`Generic objects: ${generateGenericObjects().length}`)
console.log(`Fichier ecrit: ${outPath}`)
