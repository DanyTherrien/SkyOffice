# Capturia Office — Bureau Virtuel 2D

## Description
Bureau virtuel 2D pixel art (style Gather.town) pour l'equipe interne de Capturia (5-15 personnes).
Base sur le projet open-source SkyOffice (MIT) — fork customise.

## Stack technique
- **Frontend**: React 18 + Redux Toolkit + Phaser 3.55 (TypeScript)
- **Backend**: Node.js + Express + Colyseus 0.14 (WebSocket)
- **Video/Audio**: PeerJS 1.3.2 (WebRTC, chat de proximite)
- **Build**: Vite 3.0.9
- **UI**: Material-UI 5 + Emotion + Styled Components
- **Carte**: Tiled Map Editor (.tmx → .json)
- **Package manager**: Yarn

## Comment lancer le projet
```bash
# Terminal 1 — Serveur (port 2567)
yarn start

# Terminal 2 — Client (port 5173)
cd client && yarn dev
```
Ouvrir http://localhost:5173

## Structure des fichiers cles

### Client (`client/src/`)
- `scenes/Game.ts` — Scene principale Phaser (carte, physique, zones, overlap)
- `scenes/Bootstrap.ts` — Chargement des assets et connexion reseau
- `characters/MyPlayer.ts` — Joueur local (mouvement, input)
- `characters/OtherPlayer.ts` — Autres joueurs (sync, proximite video)
- `characters/Player.ts` — Classe de base des joueurs
- `services/Network.ts` — Client Colyseus (connexion, messages)
- `web/WebRTC.ts` — Gestion des appels video PeerJS
- `components/` — Composants React (UI overlay, dont UserListPanel)
- `stores/` — Redux stores (User avec zone/role maps, Chat, Room, Computer, Whiteboard)
- `items/` — Items interactifs (Chair, Computer, Whiteboard, VendingMachine)
- `anims/CharacterAnims.ts` — Animations des avatars

### Serveur (`server/`)
- `index.ts` — Point d'entree Express + Colyseus
- `rooms/SkyOffice.ts` — Handler de la room principale
- `rooms/schema/OfficeState.ts` — Schema Colyseus (Player, Computer, Whiteboard)
- `rooms/commands/` — Commandes pour les mutations d'etat

### Types partages (`types/`)
- `IOfficeState.ts` — Interfaces TypeScript partagees
- `Messages.ts` — Enum des messages client-serveur
- `Rooms.ts` — Types de rooms Colyseus
- `Items.ts` — Enum des items

### Assets (`client/public/assets/`)
- `map/map.tmx` et `map.json` — Tilemap (source Tiled + export JSON)
- `map/FloorAndGround.png` — Tileset principal
- `tileset/` — Tilesets additionnels
- `character/` — Spritesheets des avatars (adam, ash, lucy, nancy)
- `items/` — Sprites des items interactifs

## Conventions de code
- TypeScript strict
- Commentaires en francais
- Interface utilisateur en francais
- Git: branche par feature, commits atomiques
- Branche principale: `capturia/main`

## Architecture
- Tilemap compacte (24x18 tiles, 768x576 px) avec 4 zones en grille 2x2
- Les 4 salles: Brainstorming (whiteboard), Meeting (reunion), Deep Work (focus), Sales ($$$)
- Vitesse joueur: 250 px/s, navigation rapide (~2s max entre zones)
- Zoom camera: molette souris et +/- (1.5x a 3.5x, defaut 2.0x)
- Les rooms Colyseus = instances serveur (lobby, public, custom)
- Chat de proximite: overlap detection Phaser → PeerJS WebRTC call
- Deep Work bloque les appels auto; Meeting et Sales ont des appels persistants
- Sync d'etat: Colyseus Schema (serveur) → Redux (client)

## Plan de travail
Voir `~/.claude/plans/replicated-growing-wigderson.md` pour le plan complet avec toutes les phases.

### Phases
- Phase 0: Initialisation (fork, clone, install) ← COMPLETEE
- Phase 1A: Nouvelle carte 6 zones + detection de zones ← COMPLETEE
- Phase 1B: Branding Capturia + traduction francaise ← COMPLETEE
- Phase 1C: Liste utilisateurs en ligne + roles + labels ← COMPLETEE
- Phase 1D: Tests complets et polish ← COMPLETEE
- Phase 2: Deploiement (Fly.io + Vercel) ← EN PRODUCTION
- Phase 3: Fonctionnalites post-MVP

## Deploiement (Phase 2)

### Serveur (Fly.io)
- `Dockerfile` — Image Docker du serveur (Node.js + ts-node + Colyseus)
- `fly.toml` — Config Fly.io (region yyz/Toronto, port 2567, health check /health)
- `.dockerignore` — Exclut le client (deploye separement)
- Script `yarn start:prod` — Demarre le serveur en mode production
- Deployer: `fly auth login && fly deploy`
- URL: `wss://capturia-office-server.fly.dev`

### Client (Vercel)
- `vercel.json` — Config Vercel (build command, output directory)
- `client/.env.production` — Variable VITE_SERVER_URL pour la connexion WebSocket
- Deployer: `vercel --prod` depuis la racine du projet
- Configurer `VITE_SERVER_URL` dans le dashboard Vercel

## Repo
- **Origin**: https://github.com/DanyTherrien/SkyOffice
- **Upstream**: https://github.com/kevinshen56714/SkyOffice
