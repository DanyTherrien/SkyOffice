# PLAN COMPLET — Capturia Office (Bureau Virtuel 2D)

---
## STATUT ACTUEL (mis a jour a chaque session)

**Phase en cours**: Phase 1C COMPLETEE — Pret pour Phase 1D
**Derniere action completee**: Phase 1C complete (liste utilisateurs en ligne groupes par zone, affichage role sur avatar, champ role dans LoginDialog, bouton Utilisateurs avec badge, UserListPanel, tracking zone/role dans Redux)
**Prochaine action**: Phase 1D — Tests complets et polish
**Repo**: https://github.com/DanyTherrien/SkyOffice (fork)
**Branche**: `capturia/main`
**Repertoire local**: `/Users/dany/Desktop/Reunions_Capturia`

### Progression par phase
- [x] Phase 0.1 — Fork SkyOffice sur GitHub
- [x] Phase 0.2 — Clone + remotes
- [x] Phase 0.3 — Installer les dependances (yarn install)
- [x] Phase 0.4 — Lancer et verifier SkyOffice original (serveur:2567, client:5173)
- [x] Phase 0.5 — Carte generee programmatiquement (pas besoin de Tiled)
- [x] Phase 0.6 — Creer CLAUDE.md
- [x] Phase 0.7 — Commit initial + push
- [x] Phase 1A — Nouvelle carte et systeme de zones
- [x] Phase 1B — Branding Capturia + francais
- [x] Phase 1C — Liste utilisateurs en ligne + roles + labels
- [ ] Phase 1D — Tests complets et polish
- [ ] Phase 2 — Deploiement en production
- [ ] Phase 3 — Fonctionnalites post-MVP
---

## Contexte

**Entreprise**: Capturia — services d'automatisation IA pour PME au Quebec
**Projet**: Bureau virtuel 2D pixel art (clone de Gather.town) pour l'equipe interne (5-15 personnes)
**Base open-source**: SkyOffice (MIT) — github.com/kevinshen56714/SkyOffice
**Stack**: Phaser 3 + Colyseus 0.14 + React 18/Redux Toolkit + PeerJS (WebRTC) + Vite + TypeScript
**Langue interface**: Francais
**Approche**: Fork SkyOffice → personnaliser (carte, branding, zones, francais)

### Architecture SkyOffice (resume)
- **Monorepo**: `/client` (Vite+React+Phaser), `/server` (Express+Colyseus), `/types` (interfaces partagees)
- **Carte**: UNE SEULE tilemap Tiled (.tmx → .json), 40x30 tiles a 32px. Toutes les zones sont sur la meme carte.
- **Rooms Colyseus**: Ce sont des instances serveur (lobby, public, custom), PAS des zones physiques sur la carte
- **Proximite video**: Phaser overlap detection → PeerJS call. Coordonnee hardcodee dans `OtherPlayer.preUpdate()` pour zone persistante
- **Etat**: Schema Colyseus (serveur) + Redux (client). Sync auto via WebSocket
- **Items interactifs**: 5 ordinateurs, 3 tableaux blancs, chaises, machines distributrices — positionnes dans Tiled

---

# ============================================================
# PHASE 0 — INITIALISATION ET VERIFICATION
# ============================================================
# Objectif: Fork, cloner, installer, verifier que SkyOffice fonctionne localement
# Duree estimee: 1-2 heures
# Prerequis: Node.js, Yarn, GitHub CLI (gh), compte GitHub
# ============================================================

## To-dos Phase 0

### 0.1 — Fork le repository SkyOffice sur GitHub
- [ ] Executer: `gh repo fork kevinshen56714/SkyOffice --clone=false`
- [ ] Verifier que le fork existe sur ton compte GitHub

### 0.2 — Cloner le fork dans le repertoire de travail
- [ ] Executer:
  ```bash
  git clone https://github.com/<TON_USER>/SkyOffice.git /Users/dany/Desktop/Reunions_Capturia
  cd /Users/dany/Desktop/Reunions_Capturia
  ```
- [ ] Ajouter le remote upstream: `git remote add upstream https://github.com/kevinshen56714/SkyOffice.git`
- [ ] Creer la branche de travail: `git checkout -b capturia/main`

### 0.3 — Installer les dependances
- [ ] Root (serveur): `yarn install`
- [ ] Types: `cd types && yarn install && cd ..`
- [ ] Client: `cd client && yarn install && cd ..`
- [ ] Verifier qu'il n'y a pas d'erreurs d'installation

### 0.4 — Lancer et verifier SkyOffice original
- [ ] Terminal 1 — Serveur: `yarn start` (port 2567)
- [ ] Terminal 2 — Client: `cd client && yarn dev` (port 5173)
- [ ] Ouvrir http://localhost:5173 dans 2 onglets de navigateur
- [ ] Test: Se connecter au lobby public dans les 2 onglets
- [ ] Test: Choisir un avatar et un nom dans chaque onglet
- [ ] Test: Se deplacer avec WASD/fleches
- [ ] Test: Approcher les 2 avatars → verifier que la video de proximite s'active
- [ ] Test: Eloigner les avatars → verifier que la video se coupe
- [ ] Test: Envoyer un message texte → verifier qu'il apparait des 2 cotes
- [ ] Test: Cliquer sur un ordinateur → verifier le dialog de screen sharing
- [ ] Test: Cliquer sur un tableau blanc → verifier le whiteboard

### 0.5 — Installer Tiled Map Editor
- [ ] Telecharger depuis https://www.mapeditor.org/ (gratuit, macOS)
- [ ] Ouvrir `client/public/assets/map/map.tmx`
- [ ] Explorer les layers: Ground, Wall, Chair, Computer, Whiteboard, VendingMachine, Objects, etc.
- [ ] Comprendre comment les tilesets sont references (FloorAndGround.png, etc.)

### 0.6 — Creer le fichier CLAUDE.md a la racine
- [ ] Creer `/Users/dany/Desktop/Reunions_Capturia/CLAUDE.md` avec:
  - Description du projet
  - Stack technique
  - Comment lancer le projet
  - Conventions de code (TypeScript, commentaires en francais)
  - Structure des fichiers cles
  - Phases du plan

### 0.7 — Commit initial
- [ ] `git add -A && git commit -m "chore: setup initial du projet Capturia Office"`
- [ ] `git push -u origin capturia/main`

### Verification Phase 0
- SkyOffice original tourne localement sans erreurs
- Video de proximite fonctionne entre 2 onglets
- Tiled Map Editor ouvre la carte existante
- CLAUDE.md est cree et commite

---

# ============================================================
# PHASE 1A — NOUVELLE CARTE ET SYSTEME DE ZONES
# ============================================================
# Objectif: Creer la carte 80x60 avec 6 zones, implementer la detection de zones
# Duree estimee: 10-14 heures
# Prerequis: Phase 0 completee, Tiled Map Editor installe
# Fichiers principaux: map.tmx, Game.ts, OfficeState.ts, OtherPlayer.ts
# ============================================================

## To-dos Phase 1A

### 1A.1 — Concevoir le layout de la carte
- [ ] Dessiner le layout des 6 zones sur papier ou Figma:
  ```
  +---------------------------+---------------------------+
  |   HALL D'ENTREE (20x25)   |     SALES ROOM (25x25)   |
  +-----------porte-----------+-----------porte-----------+
  |   DEEP WORK (25x20)       |     BRAINSTORM (25x20)   |
  +-----------porte-----------+-----------porte-----------+
  |   CAFE / PAUSE (25x15)    |     WAR ROOM (25x15)     |
  +---------------------------+---------------------------+
  ```
- [ ] Definir le contenu de chaque zone:
  - **Hall**: Logo Capturia au sol/mur, point de spawn, 2 ordinateurs, 1 tableau blanc
  - **Sales**: Grande table, chaises, 2 ordinateurs, 1 tableau blanc
  - **Deep Work**: Bureaux individuels espaces, 2 ordinateurs, PAS de machine distributrice
  - **Brainstorm**: Sieges en cercle/demi-cercle, 1 tableau blanc, 1 ordinateur
  - **Cafe**: Divans, machine a cafe (vending machine), plantes, ambiance detendue
  - **War Room**: Grande table de conference, 1 ordinateur, 1 tableau blanc, ecran

### 1A.2 — Creer la tilemap dans Tiled Map Editor
- [ ] Nouveau fichier: 80 tiles largeur x 60 tiles hauteur, 32x32 pixels par tile
- [ ] Importer les tilesets existants:
  - `client/public/assets/map/FloorAndGround.png`
  - `client/public/assets/tileset/Modern_Office_Black_Shadow.png`
  - `client/public/assets/tileset/Generic.png`
  - `client/public/assets/tileset/Basement.png`
- [ ] Creer le layer de tiles `Ground`:
  - Dessiner les sols de chaque zone
  - Dessiner les murs entre les zones avec propriete custom `collides: true`
  - Laisser des ouvertures de 2-3 tiles pour les portes entre zones adjacentes
- [ ] Creer les layers objets (memes noms que l'original pour compatibilite):
  - `Chair` — chaises interactives (positions x,y)
  - `Computer` — 8 ordinateurs repartis dans les zones
  - `Whiteboard` — 4 tableaux blancs
  - `VendingMachine` — 2 machines dans le Cafe
  - `Wall` — decorations murales
  - `Objects` — mobilier non-interactif
  - `ObjectsOnCollide` — mobilier avec collision
  - `GenericObjects` — decorations generiques
  - `GenericObjectsOnCollide` — decorations avec collision
  - `Basement` — elements de fond
- [ ] Creer le layer objet **`Zone`** (NOUVEAU):
  - 6 rectangles avec propriete custom `zoneName` (string):
    - `hall` — couvre le Hall d'entree
    - `sales` — couvre la Sales Room
    - `deep_work` — couvre le Deep Work Room
    - `brainstorm` — couvre le Brainstorm Room
    - `cafe` — couvre le Cafe/Pause
    - `war_room` — couvre la War Room
  - Chaque rectangle doit couvrir exactement l'espace de sa zone (murs inclus)

### 1A.3 — Exporter et remplacer la carte
- [ ] Exporter depuis Tiled: File → Export As → `map.json` (format JSON)
- [ ] Sauvegarder aussi le `map.tmx` (source editable)
- [ ] Remplacer `client/public/assets/map/map.json`
- [ ] Remplacer `client/public/assets/map/map.tmx`
- [ ] Verifier que les chemins des tilesets dans le JSON sont corrects (relatifs)

### 1A.4 — Mettre a jour le schema serveur (OfficeState)
**Fichier: `types/IOfficeState.ts`**
- [ ] Ajouter `zone: string` a l'interface `IPlayer`
- [ ] Ajouter `role: string` a l'interface `IPlayer`

**Fichier: `server/rooms/schema/OfficeState.ts`**
- [ ] Ajouter au schema `Player`:
  ```typescript
  @type('string') zone = 'hall'
  @type('string') role = ''
  ```

**Fichier: `types/Messages.ts`**
- [ ] Ajouter a l'enum `Message`:
  ```typescript
  UPDATE_PLAYER_ZONE = 'update-player-zone',
  UPDATE_PLAYER_ROLE = 'update-player-role',
  ```

### 1A.5 — Mettre a jour le handler serveur
**Fichier: `server/rooms/SkyOffice.ts`**
- [ ] Changer le nombre d'ordinateurs de `5` a `8`:
  ```typescript
  for (let i = 0; i < 8; i++) { // etait 5
    this.state.computers.set(String(i), new Computer())
  }
  ```
- [ ] Changer le nombre de tableaux blancs de `3` a `4`:
  ```typescript
  for (let i = 0; i < 4; i++) { // etait 3
    this.state.whiteboards.set(String(i), new Whiteboard())
  }
  ```
- [ ] Ajouter le handler de message pour UPDATE_PLAYER_ZONE:
  ```typescript
  this.onMessage(Message.UPDATE_PLAYER_ZONE, (client, message: { zone: string }) => {
    const player = this.state.players.get(client.sessionId)
    if (player) player.zone = message.zone
  })
  ```
- [ ] Ajouter le handler pour UPDATE_PLAYER_ROLE:
  ```typescript
  this.onMessage(Message.UPDATE_PLAYER_ROLE, (client, message: { role: string }) => {
    const player = this.state.players.get(client.sessionId)
    if (player) player.role = message.role
  })
  ```

### 1A.6 — Implementer la detection de zones cote client
**Fichier: `client/src/scenes/Game.ts`** (FICHIER LE PLUS CRITIQUE)
- [ ] Ajouter les proprietes de zone a la classe Game:
  ```typescript
  private zones: Map<string, Phaser.Geom.Rectangle> = new Map()
  private currentZone: string = 'hall'
  ```
- [ ] Dans `create()`, apres le chargement de la tilemap, charger les zones:
  ```typescript
  const zoneLayer = this.map.getObjectLayer('Zone')
  if (zoneLayer) {
    zoneLayer.objects.forEach((zoneObj) => {
      const zoneName = zoneObj.properties?.find((p: any) => p.name === 'zoneName')?.value || 'unknown'
      this.zones.set(zoneName, new Phaser.Geom.Rectangle(
        zoneObj.x!, zoneObj.y!, zoneObj.width!, zoneObj.height!
      ))
    })
  }
  ```
- [ ] Dans `update()`, detecter le changement de zone du joueur:
  ```typescript
  for (const [name, rect] of this.zones) {
    if (Phaser.Geom.Rectangle.Contains(rect, this.myPlayer.x, this.myPlayer.y)) {
      if (name !== this.currentZone) {
        this.currentZone = name
        this.myPlayer.currentZone = name
        this.network?.updatePlayerZone(name)
      }
      break
    }
  }
  ```
- [ ] Mettre a jour le point de spawn initial vers le centre du Hall:
  - Trouver la ligne ou `x = 705` et `y = 500` sont definis pour le joueur
  - Changer vers les coordonnees du centre du Hall (ex: `x = 320, y = 400`)

### 1A.7 — Ajouter la methode updatePlayerZone au Network
**Fichier: `client/src/services/Network.ts`**
- [ ] Ajouter methode:
  ```typescript
  updatePlayerZone(zone: string) {
    this.room?.send(Message.UPDATE_PLAYER_ZONE, { zone })
  }
  ```
- [ ] Ajouter methode:
  ```typescript
  updatePlayerRole(role: string) {
    this.room?.send(Message.UPDATE_PLAYER_ROLE, { role })
  }
  ```

### 1A.8 — Ajouter currentZone aux personnages
**Fichier: `client/src/characters/Player.ts`**
- [ ] Ajouter propriete: `currentZone: string = 'hall'`

**Fichier: `client/src/characters/MyPlayer.ts`**
- [ ] S'assurer que `currentZone` est accessible (herite de Player)
- [ ] Mettre a jour le spawn par defaut si les coordonnees sont hardcodees ici

### 1A.9 — Modifier la logique de proximite video (CRITIQUE)
**Fichier: `client/src/characters/OtherPlayer.ts`**
- [ ] Ajouter propriete `currentZone: string = 'hall'`
- [ ] Dans `updateOtherPlayer()`, ajouter le cas pour le champ `zone`:
  ```typescript
  case 'zone':
    this.currentZone = value as string
    break
  ```
- [ ] Dans `makeCall()`, ajouter la verification Deep Work:
  ```typescript
  // Au debut de makeCall(), AVANT la logique existante:
  if (myPlayer.currentZone === 'deep_work' || this.currentZone === 'deep_work') {
    return // Pas d'appel automatique dans la zone Deep Work
  }
  ```
- [ ] Dans `preUpdate()`, REMPLACER le check de coordonnees hardcode:
  ```typescript
  // SUPPRIMER cette ligne:
  // if (this.x < 610 && this.y > 515 && this.myPlayer!.x < 610 && this.myPlayer!.y > 515) return

  // REMPLACER par:
  const persistentZones = ['cafe', 'war_room', 'sales']
  const myZone = this.myPlayer?.currentZone
  if (myZone && persistentZones.includes(myZone) && myZone === this.currentZone) {
    return // Appel persistant dans les zones de reunion
  }
  ```

### 1A.10 — Tests Phase 1A
- [ ] Lancer serveur + client
- [ ] Verifier que la nouvelle carte se charge sans erreurs dans la console
- [ ] Verifier que les murs bloquent le mouvement
- [ ] Verifier que les portes permettent le passage
- [ ] Verifier que les objets interactifs fonctionnent (ordinateurs, tableaux blancs, chaises)
- [ ] Ouvrir 2 onglets:
  - [ ] Se deplacer dans le Hall → verifier la proximite video (s'approcher = appel)
  - [ ] Se deplacer dans le Deep Work → verifier qu'il n'y a PAS d'appel auto
  - [ ] Se deplacer dans le Cafe → verifier que l'appel est PERSISTANT dans toute la zone
  - [ ] Se deplacer dans la War Room → meme test persistant
  - [ ] Se deplacer dans la Sales Room → meme test persistant
  - [ ] Se deplacer dans le Brainstorm → proximite normale (non persistant)
- [ ] Verifier dans la console que les changements de zone sont logues

### 1A.11 — Commit Phase 1A
- [ ] `git add -A && git commit -m "feat: nouvelle carte 6 zones + detection de zones + logique Deep Work"`
- [ ] `git push`

### Verification Phase 1A
- La carte 80x60 avec 6 zones distinctes se charge correctement
- Les murs et portes fonctionnent
- Les items interactifs (ordinateurs, tableaux, chaises) fonctionnent
- La detection de zone fonctionne (changement logue dans la console)
- Deep Work = pas de chat vocal auto
- Cafe/Sales/War Room = appels persistants dans la zone
- Hall/Brainstorm = proximite normale

---

# ============================================================
# PHASE 1B — BRANDING CAPTURIA ET INTERFACE FRANCAISE
# ============================================================
# Objectif: Remplacer tout le branding SkyOffice par Capturia, traduire l'UI en francais
# Duree estimee: 6-8 heures
# Prerequis: Phase 1A completee
# Fichiers principaux: tous les composants React, MuiTheme.ts, index.html, WebRTC.ts
# ============================================================

## To-dos Phase 1B

### 1B.1 — Remplacer les assets de marque
- [ ] Preparer les images Capturia:
  - Logo principal (PNG, ~300px de large pour l'ecran de connexion)
  - Favicon (favicon.ico, 32x32 ou 16x16)
  - Logo 192x192 (logo192.png)
- [ ] Remplacer `client/src/images/logo.png` → logo Capturia
- [ ] Remplacer `client/public/favicon.ico` → favicon Capturia
- [ ] Remplacer `client/public/logo192.png` → logo Capturia 192x192
- [ ] Verifier que les imports dans les composants React pointent vers les bons fichiers

### 1B.2 — Mettre a jour le HTML de base
**Fichier: `client/index.html`**
- [ ] Changer `<title>SkyOffice</title>` → `<title>Bureau Capturia</title>`
- [ ] Changer `lang="en"` → `lang="fr"`
- [ ] Changer la meta description → description en francais
- [ ] Verifier/mettre a jour les meta og: tags si presents

### 1B.3 — Appliquer le theme de couleurs Capturia
**Fichier: `client/src/MuiTheme.ts`**
- [ ] Remplacer les couleurs primaire/secondaire:
  ```typescript
  // Avant: primary: '#426dea', secondary: '#42eacb'
  // Apres: couleurs Capturia (a obtenir de l'utilisateur)
  ```

**Fichier: `client/src/PhaserGame.ts`**
- [ ] Changer `backgroundColor: '#93cbee'` → couleur Capturia

**Fichier: `client/src/index.scss`**
- [ ] Rechercher et remplacer les couleurs SkyOffice hardcodees
- [ ] Mettre a jour les couleurs de fond, texte, liens

**Composants React (styled-components)**
- [ ] Chercher toutes les occurrences de `#222639`, `#42eacb`, `#426dea`, `#000000a7` dans les fichiers `.tsx`
- [ ] Remplacer par les couleurs Capturia
- [ ] Fichiers concernes:
  - `client/src/components/RoomSelectionDialog.tsx`
  - `client/src/components/LoginDialog.tsx`
  - `client/src/components/Chat.tsx`
  - `client/src/components/HelperButtonGroup.tsx`
  - `client/src/components/VideoConnectionDialog.tsx`

### 1B.4 — Traduire RoomSelectionDialog (ecran d'accueil)
**Fichier: `client/src/components/RoomSelectionDialog.tsx`**
- [ ] "Welcome to SkyOffice" → "Bienvenue au Bureau Capturia"
- [ ] "Connect to public lobby" → "Entrer dans le bureau"
- [ ] "Create/find custom rooms" → Masquer ce bouton pour le MVP (ou "Salles privees")
- [ ] "Custom Rooms" → "Salles personnalisees"
- [ ] "Create Custom Room" → "Creer une salle"
- [ ] "Create new room" → "Nouvelle salle"
- [ ] "Trying to connect to server..." → "Connexion au serveur en cours..."
- [ ] "We update the results in realtime..." → "Les resultats se mettent a jour en temps reel..."
- [ ] Remplacer le logo SkyOffice par le logo Capturia
- [ ] Simplifier pour usage interne: un seul gros bouton "Entrer dans le bureau"

### 1B.5 — Traduire LoginDialog (choix avatar + nom)
**Fichier: `client/src/components/LoginDialog.tsx`**
- [ ] "Joining" → "Connexion a"
- [ ] "Select an avatar" → "Choisir un avatar"
- [ ] "Name" (label) → "Nom"
- [ ] "Name is required" (validation) → "Le nom est requis"
- [ ] "Warning" → "Attention"
- [ ] "No webcam/mic connected" → "Aucune webcam/micro connecte"
- [ ] "connect one for best experience!" → "connectez-en un pour une meilleure experience!"
- [ ] "Connect Webcam" → "Connecter la webcam"
- [ ] "Webcam connected!" → "Webcam connectee!"
- [ ] "Join" → "Rejoindre"
- [ ] Ajouter un champ texte "Role" (ex: "Ventes", "Dev", "Direction"):
  - Ajouter un TextField MUI apres le champ Nom
  - Sur soumission, appeler `network.updatePlayerRole(role)`

### 1B.6 — Traduire Chat
**Fichier: `client/src/components/Chat.tsx`**
- [ ] "Chat" (titre) → "Clavardage" ou garder "Chat"
- [ ] "Press Enter to chat" → "Appuyez sur Entree pour clavarder"
- [ ] Changer la locale de date: `'en'` → `'fr-CA'`

### 1B.7 — Traduire VideoConnectionDialog
**Fichier: `client/src/components/VideoConnectionDialog.tsx`**
- [ ] "Warning" → "Attention"
- [ ] "No webcam connected" → "Aucune webcam connectee"
- [ ] "connect one for full experience!" → "connectez-en une pour une experience complete!"
- [ ] "Connect Webcam" → "Connecter la webcam"

### 1B.8 — Traduire HelperButtonGroup (controles et aide)
**Fichier: `client/src/components/HelperButtonGroup.tsx`**
- [ ] "Controls" → "Controles"
- [ ] Toutes les instructions de controle:
  - "Arrow keys / WASD to move" → "Fleches / WASD pour se deplacer"
  - "Press E to sit" → "Appuyez sur E pour s'asseoir"
  - "Press R to use" → "Appuyez sur R pour utiliser"
  - (verifier toutes les instructions dans le fichier)
- [ ] "Room Info" → "Info de la salle"
- [ ] "Control Guide" → "Guide des controles"
- [ ] Supprimer "Visit Our GitHub" (lien SkyOffice)
- [ ] Supprimer "Follow Us on Twitter" (lien SkyOffice)
- [ ] "Switch Background Theme" → "Changer le theme de fond"
- [ ] Tous les tooltips

### 1B.9 — Traduire WebRTC (boutons video/audio)
**Fichier: `client/src/web/WebRTC.ts`**
- [ ] "Mute" → "Muet"
- [ ] "Unmute" → "Activer le micro"
- [ ] "Video off" → "Camera eteinte"
- [ ] "Video on" → "Camera activee"
- [ ] Tous les `alert()` messages en francais

### 1B.10 — Traduire les items interactifs
**Fichier: `client/src/items/Chair.ts`** (ou equivalent)
- [ ] "Press E to leave" → "Appuyez sur E pour quitter"

**Fichier: `client/src/items/Computer.ts`**
- [ ] "Press R to use computer" → "Appuyez sur R pour utiliser l'ordinateur"
- [ ] Autres textes de dialog

**Fichier: `client/src/items/Whiteboard.ts`**
- [ ] "Press R to use whiteboard" → "Appuyez sur R pour utiliser le tableau"

**Fichier: `client/src/items/VendingMachine.ts`**
- [ ] Textes d'interaction en francais

### 1B.11 — Traduire les messages du store
**Fichier: `client/src/stores/ChatStore.ts`**
- [ ] "joined the lobby" → "a rejoint le bureau"
- [ ] "left the lobby" → "a quitte le bureau"

### 1B.12 — Mettre a jour les identifiants du projet
**Fichier: `package.json` (racine)**
- [ ] `"name": "skyoffice"` → `"name": "capturia-office"`
- [ ] `"description"` → description en francais
- [ ] `"repository"` → URL du fork
- [ ] `"author"` → Capturia

**Fichier: `client/package.json`**
- [ ] `"name"` → `"capturia-office-client"`

**Fichier: `types/Rooms.ts`**
- [ ] `PUBLIC = 'skyoffice'` → `PUBLIC = 'capturia'`

**Fichier: `server/index.ts`**
- [ ] Nom de la room publique: `'Public Lobby'` → `'Bureau Capturia'`
- [ ] Description de la room en francais

### 1B.13 — Traduire CreateRoomForm et CustomRoomTable (optionnel MVP)
**Fichier: `client/src/components/CreateRoomForm.tsx`**
- [ ] Traduire les labels du formulaire (pour Phase 2, mais tant qu'on y est)

**Fichier: `client/src/components/CustomRoomTable.tsx`**
- [ ] Traduire les headers du tableau

### 1B.14 — Traduire ComputerDialog et WhiteboardDialog
**Fichier: `client/src/components/ComputerDialog.tsx`**
- [ ] Tous les textes UI en francais

**Fichier: `client/src/components/WhiteboardDialog.tsx`**
- [ ] Tous les textes UI en francais

### 1B.15 — Tests Phase 1B
- [ ] Parcours complet: Ecran d'accueil → Choix avatar → Nom → Rejoindre
- [ ] Verifier que TOUS les textes visibles sont en francais
- [ ] Verifier le logo Capturia sur l'ecran d'accueil
- [ ] Verifier le favicon dans l'onglet du navigateur
- [ ] Verifier les couleurs Capturia dans tous les dialogs
- [ ] Verifier les boutons WebRTC (Muet, Camera, etc.)
- [ ] Verifier les messages de chat systeme ("a rejoint le bureau")
- [ ] Verifier les interactions avec les items (textes en francais)

### 1B.16 — Commit Phase 1B
- [ ] `git add -A && git commit -m "feat: branding Capturia + traduction complete en francais"`
- [ ] `git push`

### Verification Phase 1B
- Logo Capturia visible sur l'ecran d'accueil
- Favicon Capturia dans l'onglet
- Couleurs Capturia dans tous les composants MUI
- 100% des textes visibles sont en francais
- Le champ "Role" est present dans le dialog de connexion

---

# ============================================================
# PHASE 1C — FONCTIONNALITES SPECIFIQUES AUX ROOMS
# ============================================================
# Objectif: Liste des utilisateurs en ligne, affichage role, labels de zones
# Duree estimee: 6-8 heures
# Prerequis: Phase 1B completee
# Fichiers principaux: UserListPanel.tsx (nouveau), UserStore.ts, Player.ts, Game.ts
# ============================================================

## To-dos Phase 1C

### 1C.1 — Ajouter le tracking des zones au Redux store
**Fichier: `client/src/stores/UserStore.ts`**
- [ ] Ajouter un nouveau champ a l'etat:
  ```typescript
  playerZoneMap: { [key: string]: string } // sessionId → zoneName
  ```
- [ ] Ajouter les reducers:
  ```typescript
  setPlayerZone: (state, action: PayloadAction<{ id: string; zone: string }>) => {
    state.playerZoneMap[action.payload.id] = action.payload.zone
  },
  removePlayerZone: (state, action: PayloadAction<string>) => {
    delete state.playerZoneMap[action.payload]
  },
  ```
- [ ] Ajouter un champ pour les roles:
  ```typescript
  playerRoleMap: { [key: string]: string } // sessionId → role
  ```
- [ ] Ajouter les reducers correspondants pour les roles

### 1C.2 — Dispatcher les changements de zone depuis Network
**Fichier: `client/src/services/Network.ts`**
- [ ] Dans la methode `initialize()` ou equivalent, quand un player change de zone:
  - Trouver ou les `player.onChange` sont ecoutes
  - Ajouter un dispatch pour `setPlayerZone` quand le champ `zone` change
  - Ajouter un dispatch pour `setPlayerRole` quand le champ `role` change
- [ ] Quand un joueur quitte, dispatcher `removePlayerZone`

### 1C.3 — Creer le composant UserListPanel
**Fichier: `client/src/components/UserListPanel.tsx`** (NOUVEAU)
- [ ] Creer un panneau lateral ou flottant qui affiche:
  - Titre: "Utilisateurs en ligne"
  - Sous-sections groupees par zone avec noms francais:
    - "Hall d'entree" / "Salle de ventes" / "Travail profond" / "Remue-meninges" / "Cafe" / "Salle de strategie"
  - Pour chaque utilisateur:
    - Mini icone de son avatar
    - Nom
    - Role (en gris, plus petit)
  - Compteur total en ligne
- [ ] Utiliser les selectors Redux:
  - `playerNameMap` (existant) pour les noms
  - `playerZoneMap` (nouveau) pour les zones
  - `playerRoleMap` (nouveau) pour les roles
- [ ] Style: panneau avec fond semi-transparent, scrollable si beaucoup d'utilisateurs
- [ ] Mapping des noms de zones internes vers les noms francais:
  ```typescript
  const zoneNames: Record<string, string> = {
    hall: "Hall d'entree",
    sales: "Salle de ventes",
    deep_work: "Travail profond",
    brainstorm: "Remue-meninges",
    cafe: "Cafe / Pause",
    war_room: "Salle de strategie",
  }
  ```

### 1C.4 — Ajouter le bouton pour ouvrir le UserListPanel
**Fichier: `client/src/components/HelperButtonGroup.tsx`** (ou un nouveau FAB)
- [ ] Ajouter un bouton "Utilisateurs" (icone People de MUI)
- [ ] Toggle l'affichage du UserListPanel
- [ ] Badge avec le nombre d'utilisateurs en ligne

### 1C.5 — Integrer le UserListPanel dans l'App
**Fichier: `client/src/App.tsx`** (ou le composant parent adequat)
- [ ] Importer et rendre le UserListPanel
- [ ] Gerer l'etat d'ouverture/fermeture

### 1C.6 — Afficher le role au-dessus de l'avatar dans le jeu
**Fichier: `client/src/characters/Player.ts`**
- [ ] Actuellement, le nom est affiche via un `Phaser.GameObjects.Text` au-dessus de l'avatar
- [ ] Ajouter un 2e texte SOUS le nom pour le role:
  ```typescript
  this.roleText = this.scene.add.text(0, 0, '', {
    fontSize: '10px',
    color: '#b0b0b0',
    fontFamily: 'Arial',
  }).setOrigin(0.5)
  ```
- [ ] Mettre a jour la position du roleText dans `update()` (sous le nameText)
- [ ] Ajouter methode `setPlayerRole(role: string)` qui met a jour le texte

**Fichier: `client/src/characters/MyPlayer.ts`**
- [ ] Appeler `setPlayerRole()` quand le joueur soumet le formulaire de connexion

**Fichier: `client/src/characters/OtherPlayer.ts`**
- [ ] Dans `updateOtherPlayer()`, ajouter le cas pour `'role'`:
  ```typescript
  case 'role':
    this.setPlayerRole(value as string)
    break
  ```

### 1C.7 — Ajouter des labels de zones flottants sur la carte
**Fichier: `client/src/scenes/Game.ts`**
- [ ] Dans `create()`, apres le chargement des zones, ajouter des textes Phaser:
  ```typescript
  for (const [name, rect] of this.zones) {
    const label = this.add.text(
      rect.x + rect.width / 2,
      rect.y + 20,
      zoneNames[name],
      { fontSize: '16px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold' }
    ).setOrigin(0.5).setDepth(1000).setAlpha(0.7)
  }
  ```
- [ ] Utiliser le meme mapping `zoneNames` que dans le UserListPanel
- [ ] Les labels doivent etre semi-transparents et en haut de chaque zone

### 1C.8 — Connecter le champ Role du LoginDialog au jeu
**Fichier: `client/src/components/LoginDialog.tsx`**
- [ ] Verifier que le champ Role ajoute en Phase 1B envoie bien la valeur:
  - Au `MyPlayer` via `game.myPlayer.setPlayerRole(role)`
  - Au serveur via `network.updatePlayerRole(role)`
- [ ] Le role doit etre envoye APRES la connexion au jeu (dans le handler de soumission)

### 1C.9 — Tests Phase 1C
- [ ] Ouvrir 3 onglets avec 3 utilisateurs differents (noms et roles differents)
- [ ] Verifier que le UserListPanel affiche les 3 utilisateurs
- [ ] Deplacer un utilisateur d'une zone a l'autre → verifier que la liste se met a jour en temps reel
- [ ] Verifier que le role s'affiche au-dessus de l'avatar dans le jeu
- [ ] Verifier que les labels de zones sont visibles sur la carte
- [ ] Verifier que le compteur d'utilisateurs en ligne est correct
- [ ] Deconnecter un utilisateur → verifier qu'il disparait de la liste
- [ ] Verifier que le role s'affiche dans le UserListPanel

### 1C.10 — Commit Phase 1C
- [ ] `git add -A && git commit -m "feat: liste utilisateurs en ligne + affichage role + labels de zones"`
- [ ] `git push`

### Verification Phase 1C
- Le UserListPanel affiche tous les utilisateurs groupes par zone
- Le role est visible au-dessus de chaque avatar
- Les labels de zones sont visibles sur la carte
- La liste se met a jour en temps reel quand les joueurs changent de zone
- Le bouton "Utilisateurs" ouvre/ferme le panneau

---

# ============================================================
# PHASE 1D — TESTS COMPLETS ET POLISH
# ============================================================
# Objectif: Tester tous les scenarios, corriger les bugs, polir l'experience
# Duree estimee: 4-6 heures
# Prerequis: Phase 1C completee
# ============================================================

## To-dos Phase 1D

### 1D.1 — Tests multi-utilisateurs exhaustifs
- [ ] Ouvrir 4+ onglets de navigateur
- [ ] Scenario 1: Tous dans le Hall → proximite video fonctionne
- [ ] Scenario 2: 2 dans le Cafe → appel persistant, meme en s'eloignant dans la zone
- [ ] Scenario 3: 1 dans le Deep Work, 1 s'approche → PAS d'appel auto
- [ ] Scenario 4: 2 dans la Sales Room → appel persistant
- [ ] Scenario 5: 2 dans le Brainstorm → proximite normale (pas persistant)
- [ ] Scenario 6: 1 quitte le Cafe pendant un appel → l'appel se termine
- [ ] Scenario 7: Transition rapide entre zones → pas de crash/bug

### 1D.2 — Tests de chat texte
- [ ] Envoyer un message depuis le Hall → visible par tous
- [ ] Verifier les emojis
- [ ] Verifier l'historique de chat (scroll)
- [ ] Verifier les messages systeme ("a rejoint/quitte le bureau")

### 1D.3 — Tests d'items interactifs
- [ ] S'asseoir sur chaque chaise → verifier l'animation sit
- [ ] Utiliser chaque ordinateur → verifier le dialog screen share
- [ ] Utiliser chaque tableau blanc → verifier le whiteboard
- [ ] Utiliser les machines distributrices → verifier l'interaction

### 1D.4 — Tests de performance
- [ ] Ouvrir 10+ onglets simultanement
- [ ] Verifier que le serveur ne plante pas
- [ ] Verifier l'utilisation memoire du navigateur
- [ ] Verifier qu'il n'y a pas de fuites memoire WebRTC (streams non fermes)

### 1D.5 — Tests mobile (optionnel pour MVP interne)
- [ ] Ouvrir sur iPhone/Android via le reseau local
- [ ] Verifier le joystick virtuel
- [ ] Verifier les permissions camera/micro
- [ ] Verifier le responsive de l'interface

### 1D.6 — Polish visuel de la carte
- [ ] Ajuster le zoom camera dans `Game.ts` si la carte 80x60 parait trop grande
- [ ] Verifier que toutes les portes sont navigables (pas de collision accidentelle)
- [ ] Verifier que les meubles sont bien places et esthetiques
- [ ] Ajouter des plantes, decorations dans les zones si necessaire
- [ ] Verifier le depth sorting (avatars derriere les meubles quand appropriate)

### 1D.7 — Polish de l'interface
- [ ] Verifier le responsive du LoginDialog
- [ ] Verifier le responsive du Chat
- [ ] Verifier le responsive du UserListPanel
- [ ] Tester avec des noms longs et des roles longs
- [ ] Verifier les hover states et les transitions CSS

### 1D.8 — Corriger tous les bugs trouves
- [ ] Lister tous les bugs decouverts pendant les tests
- [ ] Corriger chaque bug
- [ ] Re-tester apres correction

### 1D.9 — Commit et tag Phase 1D
- [ ] `git add -A && git commit -m "fix: corrections et polish post-tests"`
- [ ] `git tag v1.0.0-mvp`
- [ ] `git push --tags`

### Verification Phase 1D
- Zero bug critique
- Experience fluide pour 5-15 utilisateurs simultanement
- Interface 100% francaise sans texte anglais residuel
- Toutes les zones fonctionnent comme prevu

---

# ============================================================
# PHASE 2 — DEPLOIEMENT EN PRODUCTION
# ============================================================
# Objectif: Deployer le serveur sur Fly.io et le client sur Vercel
# Duree estimee: 3-4 heures
# Prerequis: Phase 1D completee, MVP stable
# ============================================================

## To-dos Phase 2

### 2.1 — Preparer le serveur pour le deploiement
- [ ] Creer `Dockerfile.server` a la racine:
  ```dockerfile
  FROM node:18-slim
  WORKDIR /app
  COPY package.json yarn.lock ./
  COPY types/ types/
  COPY server/ server/
  RUN yarn install --production
  RUN cd types && yarn install
  EXPOSE 2567
  CMD ["yarn", "start"]
  ```
- [ ] Tester le build Docker localement:
  ```bash
  docker build -f Dockerfile.server -t capturia-server .
  docker run -p 2567:2567 capturia-server
  ```

### 2.2 — Deployer le serveur sur Fly.io
- [ ] Installer flyctl: `brew install flyctl`
- [ ] `fly auth login`
- [ ] `fly launch --name capturia-office-server --region yul` (Montreal)
- [ ] Configurer `fly.toml`:
  ```toml
  [env]
    PORT = "2567"
  [services]
    internal_port = 2567
    protocol = "tcp"
    [[services.ports]]
      port = 443
      handlers = ["tls", "http"]
    [[services.ports]]
      port = 80
      handlers = ["http"]
  ```
- [ ] `fly deploy`
- [ ] Verifier que le serveur est accessible: `curl https://capturia-office-server.fly.dev`

### 2.3 — Configurer et deployer le client sur Vercel
- [ ] Creer `client/.env.production`:
  ```
  VITE_SERVER_URL=wss://capturia-office-server.fly.dev
  ```
- [ ] Installer Vercel CLI: `npm i -g vercel`
- [ ] `cd client && vercel --prod`
- [ ] Configurer la variable d'environnement `VITE_SERVER_URL` dans le dashboard Vercel
- [ ] Verifier le deploiement

### 2.4 — Tests en production
- [ ] Ouvrir l'URL Vercel dans 2 navigateurs/appareils differents
- [ ] Verifier la connexion WebSocket au serveur Fly.io
- [ ] Verifier la video de proximite (WebRTC a travers Internet)
- [ ] Verifier les latences
- [ ] Verifier le CORS (pas de blocage)

### 2.5 — Configurer un domaine personnalise (optionnel)
- [ ] bureau.capturia.ca ou office.capturia.ca
- [ ] Configurer DNS dans Vercel
- [ ] Mettre a jour VITE_SERVER_URL si necessaire

### 2.6 — Commit Phase 2
- [ ] `git add -A && git commit -m "chore: configuration de deploiement Fly.io + Vercel"`
- [ ] `git tag v1.0.0`
- [ ] `git push --tags`

### Verification Phase 2
- Serveur accessible sur Fly.io (wss://)
- Client accessible sur Vercel (https://)
- Connexion WebSocket stable
- Video/audio WebRTC fonctionne a travers Internet
- L'equipe Capturia peut se connecter et utiliser le bureau

---

# ============================================================
# PHASE 3 — FONCTIONNALITES POST-MVP (FUTUR)
# ============================================================
# Ces fonctionnalites seront implementees apres le lancement du MVP
# Chaque sous-phase est independante et peut etre faite dans n'importe quel ordre
# ============================================================

## To-dos Phase 3 (non priorisees)

### 3.1 — Statuts personnalises
- [ ] Ajouter un champ `status` au schema Player (serveur)
- [ ] Creer un selecteur de statut dans l'UI (dropdown ou boutons):
  - "Disponible" (vert)
  - "En appel" (rouge)
  - "Concentre" (jaune) — desactive la proximite video comme Deep Work
  - "Absent" (gris)
- [ ] Afficher l'icone de statut au-dessus de l'avatar
- [ ] Afficher le statut dans le UserListPanel
- [ ] "Concentre" desactive le chat vocal auto PARTOUT (pas juste dans Deep Work)

### 3.2 — Notifications sonores
- [ ] Jouer un son quand quelqu'un entre dans ta zone
- [ ] Jouer un son quand quelqu'un rejoint le bureau
- [ ] Utiliser `Phaser.Sound` ou HTML5 Audio API
- [ ] Option pour desactiver les sons

### 3.3 — Screen sharing ameliore
- [ ] SkyOffice a deja un mecanisme de screen sharing via les "ordinateurs" (ComputerDialog + ShareScreenManager)
- [ ] Ameliorer pour permettre le screen sharing en dehors des ordinateurs
- [ ] Bouton "Partager mon ecran" dans la barre d'outils

### 3.4 — Rooms privees avec mot de passe
- [ ] SkyOffice a deja le systeme de rooms custom avec password
- [ ] Reactiver et traduire en francais
- [ ] Permettre de creer des salles de reunion temporaires

### 3.5 — Avatars personnalises
- [ ] Commander de nouveaux spritesheets pixel art (32x48 par frame)
- [ ] Ou integrer un generateur d'avatar procedural
- [ ] Chaque avatar necessite: idle (24 frames), run (24 frames), sit (4 directions)
- [ ] Enregistrer dans `CharacterAnims.ts`
- [ ] Ajouter les previews dans le LoginDialog (95x136px)

### 3.6 — Integration GoHighLevel
- [ ] API polling pour les statuts de contacts/deals
- [ ] Panneau lateral avec les informations GHL
- [ ] Affichage du statut agent depuis GHL

### 3.7 — Historique de chat persistant
- [ ] Actuellement les messages sont en memoire (perdus au restart serveur)
- [ ] Ajouter PostgreSQL ou SQLite pour persister les messages
- [ ] Charger les derniers N messages a la connexion

### 3.8 — Authentification
- [ ] Actuellement pas d'auth (n'importe qui avec l'URL peut rejoindre)
- [ ] Ajouter un systeme simple: email/password ou SSO Google
- [ ] Ou un simple code d'acces partage

### 3.9 — Tableau blanc collaboratif ameliore
- [ ] SkyOffice utilise WBO (service externe) pour le whiteboard
- [ ] Evaluer si WBO suffit ou si on a besoin d'une solution custom
- [ ] Possibilite d'integrer Excalidraw ou tldraw

### 3.10 — Upgrade PeerJS vers LiveKit
- [ ] PeerJS est peer-to-peer (ne scale pas bien au-dela de ~10 personnes dans une meme zone)
- [ ] LiveKit est un SFU (Selective Forwarding Unit) qui gere mieux les groupes
- [ ] Migration majeure — a evaluer apres validation du MVP
