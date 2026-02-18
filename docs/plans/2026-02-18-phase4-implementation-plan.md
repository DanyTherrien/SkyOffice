# Phase 4 — Fully Functional Office Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Capturia Office a reliable daily workspace by replacing PeerJS with LiveKit, adding Google SSO, SQLite persistence, and Slack-like status.

**Architecture:** LiveKit SFU self-hosted on Fly.io replaces PeerJS mesh. Colyseus remains for game state sync. Server generates LiveKit tokens when players enter call-enabled zones. Google OAuth protects access. SQLite on a Fly.io volume persists chat/notes/preferences.

**Tech Stack:** LiveKit (livekit-server-sdk + livekit-client), Google OAuth 2.0 (google-auth-library), better-sqlite3, JWT (jsonwebtoken), existing Colyseus + Phaser + React + Redux stack.

---

## Phase 4A — LiveKit Migration

### Task 1: Add LiveKit dependencies

**Files:**
- Modify: `client/package.json`
- Modify: `package.json` (root/server)

**Step 1: Install LiveKit client SDK**

Run: `cd /Users/dany/Desktop/Reunions_Capturia/client && yarn add livekit-client`

**Step 2: Install LiveKit server SDK**

Run: `cd /Users/dany/Desktop/Reunions_Capturia && yarn add livekit-server-sdk`

**Step 3: Remove PeerJS**

Run: `cd /Users/dany/Desktop/Reunions_Capturia/client && yarn remove peerjs`

**Step 4: Add environment variables for LiveKit**

Create: `client/.env.development`
```
VITE_SERVER_URL=ws://localhost:2567
VITE_LIVEKIT_URL=ws://localhost:7880
```

Modify: `client/.env.production` — add LiveKit URL:
```
VITE_SERVER_URL=wss://capturia-office-server.fly.dev
VITE_LIVEKIT_URL=wss://capturia-livekit.fly.dev
```

Add to `server/index.ts` environment (or `.env`):
```
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret
LIVEKIT_URL=ws://localhost:7880
```

**Step 5: Commit**

```bash
git add client/package.json package.json yarn.lock client/yarn.lock client/.env.development client/.env.production
git commit -m "chore: add livekit-client + livekit-server-sdk, remove peerjs"
```

---

### Task 2: Create LiveKit token service on server

**Files:**
- Create: `server/services/LiveKitTokenService.ts`
- Modify: `types/Messages.ts` — add LIVEKIT_TOKEN message

**Step 1: Add LiveKit token message types**

In `types/Messages.ts`, add to the enum:
```typescript
// LiveKit
REQUEST_LIVEKIT_TOKEN = 'request_livekit_token',
LIVEKIT_TOKEN = 'livekit_token',
```

**Step 2: Create the token service**

Create `server/services/LiveKitTokenService.ts`:
```typescript
import { AccessToken } from 'livekit-server-sdk'

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey'
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'devsecret'

// Zones that have video calls
const CALL_ZONES = new Set(['brainstorm', 'meeting', 'sales', 'one_on_one'])

export function isCallZone(zone: string): boolean {
  return CALL_ZONES.has(zone)
}

export async function generateToken(
  playerName: string,
  sessionId: string,
  zone: string
): Promise<string> {
  const roomName = `zone-${zone}`
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: sessionId,
    name: playerName,
  })
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  })
  return await at.toJwt()
}

export function generateBoothToken(
  playerName: string,
  sessionId: string,
  boothId: string
): Promise<string> {
  const roomName = `booth-${boothId}`
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: sessionId,
    name: playerName,
  })
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  })
  return at.toJwt()
}
```

**Step 3: Commit**

```bash
git add server/services/LiveKitTokenService.ts types/Messages.ts
git commit -m "feat: add LiveKit token service and message types"
```

---

### Task 3: Wire token generation into SkyOffice room

**Files:**
- Modify: `server/rooms/SkyOffice.ts` — handle token requests and auto-send on zone change

**Step 1: Import and use LiveKitTokenService**

At the top of `server/rooms/SkyOffice.ts`, add:
```typescript
import { generateToken, isCallZone } from '../services/LiveKitTokenService'
```

**Step 2: Add handler for REQUEST_LIVEKIT_TOKEN**

In the `onCreate()` method, add a new message handler:
```typescript
this.onMessage(Message.REQUEST_LIVEKIT_TOKEN, async (client, message: { zone: string }) => {
  const player = this.state.players.get(client.sessionId)
  if (!player) return
  const zone = message.zone || player.zone
  if (!isCallZone(zone)) return
  try {
    const token = await generateToken(player.name, client.sessionId, zone)
    client.send(Message.LIVEKIT_TOKEN, { token, zone })
  } catch (err) {
    console.error('LiveKit token error:', err)
  }
})
```

**Step 3: Auto-send token when player changes to a call zone**

Find the existing zone change handler (where `UPDATE_PLAYER_ZONE` is processed). After the zone is updated, add:
```typescript
// After player.zone = message.zone
if (isCallZone(message.zone)) {
  generateToken(player.name, client.sessionId, message.zone)
    .then((token) => {
      client.send(Message.LIVEKIT_TOKEN, { token, zone: message.zone })
    })
    .catch((err) => console.error('LiveKit token error:', err))
}
```

**Step 4: Commit**

```bash
git add server/rooms/SkyOffice.ts
git commit -m "feat: wire LiveKit token generation into zone changes"
```

---

### Task 4: Create LiveKit client service

**Files:**
- Create: `client/src/web/LiveKitService.ts`

**Step 1: Create the LiveKit client wrapper**

Create `client/src/web/LiveKitService.ts`:
```typescript
import {
  Room,
  RoomEvent,
  Track,
  RemoteParticipant,
  RemoteTrackPublication,
  LocalParticipant,
  VideoPresets,
  ConnectionState,
  createLocalTracks,
  LocalTrack,
} from 'livekit-client'
import { store } from '../stores'
import {
  setJoined,
  setParticipants,
  addParticipant,
  removeParticipant,
  setLocalStream,
  clearMeeting,
} from '../stores/MeetingStore'

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'ws://localhost:7880'

class LiveKitService {
  private room: Room | null = null
  private currentZone: string | null = null
  private screenShareTrack: LocalTrack | null = null

  async connect(token: string, zone: string): Promise<void> {
    // Disconnect from previous room if any
    if (this.room && this.currentZone !== zone) {
      await this.disconnect()
    }
    if (this.room?.state === ConnectionState.Connected && this.currentZone === zone) {
      return // Already connected to this zone
    }

    this.currentZone = zone
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h540.resolution,
      },
    })

    this.setupEventHandlers()

    // Get saved device preferences
    const mediaSettings = store.getState().mediaSettings
    const audioDeviceId = mediaSettings.selectedMicrophoneId || undefined
    const videoDeviceId = mediaSettings.selectedCameraId || undefined

    await this.room.connect(LIVEKIT_URL, token)

    // Publish local tracks
    await this.room.localParticipant.enableCameraAndMicrophone()

    // Apply saved device selections if any
    if (audioDeviceId) {
      await this.room.switchActiveDevice('audioinput', audioDeviceId)
    }
    if (videoDeviceId) {
      await this.room.switchActiveDevice('videoinput', videoDeviceId)
    }

    store.dispatch(setJoined(true))
    this.updateParticipantList()
  }

  async disconnect(): Promise<void> {
    if (this.screenShareTrack) {
      await this.room?.localParticipant.unpublishTrack(this.screenShareTrack)
      this.screenShareTrack.stop()
      this.screenShareTrack = null
    }
    await this.room?.disconnect()
    this.room = null
    this.currentZone = null
    store.dispatch(clearMeeting())
  }

  async toggleMicrophone(): Promise<boolean> {
    if (!this.room) return false
    const enabled = this.room.localParticipant.isMicrophoneEnabled
    await this.room.localParticipant.setMicrophoneEnabled(!enabled)
    return !enabled
  }

  async toggleCamera(): Promise<boolean> {
    if (!this.room) return false
    const enabled = this.room.localParticipant.isCameraEnabled
    await this.room.localParticipant.setCameraEnabled(!enabled)
    return !enabled
  }

  async startScreenShare(): Promise<void> {
    if (!this.room) return
    await this.room.localParticipant.setScreenShareEnabled(true)
  }

  async stopScreenShare(): Promise<void> {
    if (!this.room) return
    await this.room.localParticipant.setScreenShareEnabled(false)
  }

  async switchAudioDevice(deviceId: string): Promise<void> {
    if (!this.room) return
    await this.room.switchActiveDevice('audioinput', deviceId)
  }

  async switchVideoDevice(deviceId: string): Promise<void> {
    if (!this.room) return
    await this.room.switchActiveDevice('videoinput', deviceId)
  }

  getRoom(): Room | null {
    return this.room
  }

  isConnected(): boolean {
    return this.room?.state === ConnectionState.Connected
  }

  private setupEventHandlers(): void {
    if (!this.room) return

    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      store.dispatch(addParticipant({
        id: participant.identity,
        name: participant.name || participant.identity,
      }))
    })

    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      store.dispatch(removeParticipant(participant.identity))
    })

    this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      // Attach remote tracks to DOM — handled by React components
    })

    this.room.on(RoomEvent.Disconnected, () => {
      store.dispatch(clearMeeting())
    })

    this.room.on(RoomEvent.ConnectionStateChanged, (state) => {
      if (state === ConnectionState.Disconnected) {
        store.dispatch(clearMeeting())
      }
    })
  }

  private updateParticipantList(): void {
    if (!this.room) return
    const participants = Array.from(this.room.remoteParticipants.values()).map((p) => ({
      id: p.identity,
      name: p.name || p.identity,
    }))
    store.dispatch(setParticipants(participants))
  }
}

// Singleton
export const liveKitService = new LiveKitService()
```

**Step 2: Commit**

```bash
git add client/src/web/LiveKitService.ts
git commit -m "feat: create LiveKit client service wrapper"
```

---

### Task 5: Update MeetingStore for LiveKit

**Files:**
- Modify: `client/src/stores/MeetingStore.ts`

**Step 1: Read the current MeetingStore**

Read `client/src/stores/MeetingStore.ts` to understand current state shape.

**Step 2: Update state and reducers for LiveKit**

The MeetingStore needs to track:
- `joined: boolean` — whether we're in a LiveKit room
- `participants: Array<{ id: string; name: string }>` — remote participants
- `micEnabled: boolean`
- `cameraEnabled: boolean`
- `screenShareEnabled: boolean`

Add/update reducers:
- `setJoined(boolean)`
- `setParticipants(Array)`
- `addParticipant({ id, name })`
- `removeParticipant(id)`
- `setMicEnabled(boolean)`
- `setCameraEnabled(boolean)`
- `setScreenShareEnabled(boolean)`
- `clearMeeting()` — reset all state

Remove any PeerJS-specific state (peer IDs, connection states, etc).

**Step 3: Commit**

```bash
git add client/src/stores/MeetingStore.ts
git commit -m "feat: update MeetingStore for LiveKit participant tracking"
```

---

### Task 6: Wire LiveKit into Network.ts

**Files:**
- Modify: `client/src/services/Network.ts`

**Step 1: Read Network.ts to find where ZoneMeetingManager is used**

Key locations:
- ZoneMeetingManager instantiation (~line 145)
- ZONE_MEMBERS_UPDATE handler (~line 388)
- Zone change sends (~line 752)

**Step 2: Import LiveKitService and handle LIVEKIT_TOKEN message**

Add import:
```typescript
import { liveKitService } from '../web/LiveKitService'
```

In `initialize()`, add handler for the LiveKit token:
```typescript
this.room.onMessage(Message.LIVEKIT_TOKEN, async (message: { token: string; zone: string }) => {
  try {
    await liveKitService.connect(message.token, message.zone)
  } catch (err) {
    console.error('LiveKit connect error:', err)
  }
})
```

**Step 3: Handle zone leave — disconnect from LiveKit**

Find where zone change is detected and add disconnect logic. When a player moves to a non-call zone (deep_work, afk) or changes zones, disconnect:
```typescript
// Before sending the new zone update, disconnect from current LiveKit room
if (liveKitService.isConnected()) {
  await liveKitService.disconnect()
}
```

**Step 4: Remove ZoneMeetingManager instantiation**

Remove or comment out the ZoneMeetingManager creation and all references. The LiveKit token flow replaces it entirely:
- Server auto-sends token on zone change
- Client connects when token arrives
- Client disconnects when leaving zone

**Step 5: Commit**

```bash
git add client/src/services/Network.ts
git commit -m "feat: wire LiveKit token handling into Network service"
```

---

### Task 7: Replace ZoneMeetingManager with LiveKit

**Files:**
- Delete: `client/src/web/ZoneMeetingManager.ts` (or rename to `.bak` initially)
- Modify: any imports of ZoneMeetingManager

**Step 1: Search for all ZoneMeetingManager imports**

Run: `grep -rn "ZoneMeetingManager" client/src/`

**Step 2: Remove all imports and usages**

Replace each usage with the equivalent LiveKitService call. Key replacements:
- `zoneMeetingManager.joinZone(zone)` → handled automatically by token flow
- `zoneMeetingManager.leaveZone()` → `liveKitService.disconnect()`
- `zoneMeetingManager.startScreenShare()` → `liveKitService.startScreenShare()`
- `zoneMeetingManager.stopScreenShare()` → `liveKitService.stopScreenShare()`
- `zoneMeetingManager.toggleMic()` → `liveKitService.toggleMicrophone()`
- `zoneMeetingManager.toggleCamera()` → `liveKitService.toggleCamera()`

**Step 3: Delete ZoneMeetingManager.ts**

```bash
rm client/src/web/ZoneMeetingManager.ts
```

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove ZoneMeetingManager, replace with LiveKit service"
```

---

### Task 8: Update video UI components for LiveKit

**Files:**
- Modify: `client/src/components/Video.tsx`
- Modify: `client/src/components/meeting/VideoTileGrid.tsx`
- Modify: `client/src/components/meeting/MeetingToolbar.tsx`
- Modify: `client/src/components/meeting/ScreenShareArea.tsx`
- Modify: `client/src/components/ZoneMeetingOverlay.tsx`

**Step 1: Update Video.tsx to render LiveKit tracks**

LiveKit provides track objects. Update the Video component to use LiveKit's track attachment:
```typescript
import { Track, RemoteTrackPublication } from 'livekit-client'

// Use track.attach() to get an HTMLVideoElement or HTMLAudioElement
// LiveKit handles all track lifecycle
```

**Step 2: Update VideoTileGrid.tsx**

Read participants from MeetingStore (which LiveKitService updates). Render a Video tile for each participant. Use LiveKit Room's `remoteParticipants` map to get track publications.

**Step 3: Update MeetingToolbar.tsx**

Wire mic/camera/screenshare buttons to LiveKitService:
```typescript
const handleToggleMic = () => liveKitService.toggleMicrophone()
const handleToggleCamera = () => liveKitService.toggleCamera()
const handleScreenShare = () => {
  if (screenShareEnabled) liveKitService.stopScreenShare()
  else liveKitService.startScreenShare()
}
```

**Step 4: Update ZoneMeetingOverlay.tsx**

This is the main meeting UI container. Wire it to MeetingStore's `joined` state:
- Show overlay when `joined === true`
- Hide when `joined === false`
- Render VideoTileGrid + MeetingToolbar + ScreenShareArea inside

**Step 5: Commit**

```bash
git add client/src/components/Video.tsx client/src/components/meeting/ client/src/components/ZoneMeetingOverlay.tsx
git commit -m "feat: update video UI components to use LiveKit tracks"
```

---

### Task 9: Add media preview dialog on first join

**Files:**
- Modify: `client/src/components/MediaSettingsDialog.tsx`
- Modify: `client/src/components/LoginDialog.tsx` or `App.tsx`

**Step 1: Update MediaSettingsDialog to show camera/mic preview**

Add a live preview section to MediaSettingsDialog:
- Enumerate available devices using `navigator.mediaDevices.enumerateDevices()`
- Show a live video preview from the selected camera
- Show a mic level indicator from the selected microphone
- Save selections to MediaSettingsStore (already wired to localStorage)

**Step 2: Show media preview before first zone entry**

After login (LoginDialog), before the player enters a call zone for the first time, show the MediaSettingsDialog in "setup" mode. Store a `mediaSetupDone` flag in localStorage.

Alternatively, show it automatically when the first LIVEKIT_TOKEN arrives and `mediaSetupDone` is not set.

**Step 3: Commit**

```bash
git add client/src/components/MediaSettingsDialog.tsx client/src/App.tsx
git commit -m "feat: add media preview dialog for device setup on first join"
```

---

### Task 10: Add persistent bottom bar controls

**Files:**
- Modify: `client/src/components/HelperButtonGroup.tsx` (or create a new `BottomBar.tsx`)
- Modify: `client/src/App.tsx`

**Step 1: Add mic/camera/screenshare toggles to the bottom bar**

When the player is in a call zone and `MeetingStore.joined === true`, show:
- Mic toggle button (with muted/unmuted icon)
- Camera toggle button (with on/off icon)
- Screen share button
- Leave call button
- Settings gear (opens MediaSettingsDialog)

Wire each button to LiveKitService methods.

**Step 2: Style the bottom bar**

Position fixed at the bottom center. Use MUI IconButtons with tooltips. Show/hide based on meeting state.

**Step 3: Commit**

```bash
git add client/src/components/HelperButtonGroup.tsx client/src/App.tsx
git commit -m "feat: add persistent mic/camera/screenshare controls in bottom bar"
```

---

### Task 11: Delete old WebRTC.ts and clean up PeerJS references

**Files:**
- Delete: `client/src/web/WebRTC.ts`
- Search and clean: any remaining `peerjs` or `Peer` imports

**Step 1: Search for all PeerJS references**

Run: `grep -rn "peerjs\|PeerJS\|new Peer\|from 'peerjs'" client/src/`

**Step 2: Remove all PeerJS references**

Delete `client/src/web/WebRTC.ts` and remove all imports referencing it.

**Step 3: Verify build**

Run: `cd client && yarn build`

Fix any remaining compilation errors from removed references.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove all PeerJS references and old WebRTC.ts"
```

---

### Task 12: LiveKit local development setup

**Files:**
- Create: `docker-compose.yml` (for local LiveKit server)

**Step 1: Create docker-compose for local dev**

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  livekit:
    image: livekit/livekit-server:latest
    ports:
      - "7880:7880"
      - "7881:7881"
      - "7882:7882/udp"
    environment:
      - LIVEKIT_KEYS=devkey:devsecret
    command: --dev --bind 0.0.0.0
```

**Step 2: Document how to run locally**

Update CLAUDE.md with:
```
# Terminal 1 — LiveKit (port 7880)
docker compose up livekit

# Terminal 2 — Serveur (port 2567)
yarn start

# Terminal 3 — Client (port 5173)
cd client && yarn dev
```

**Step 3: Test locally**

1. Start LiveKit: `docker compose up livekit`
2. Start server: `yarn start`
3. Start client: `cd client && yarn dev`
4. Open two browser tabs, join the office, enter the same zone
5. Verify video/audio connection works

**Step 4: Commit**

```bash
git add docker-compose.yml CLAUDE.md
git commit -m "chore: add docker-compose for local LiveKit dev server"
```

---

### Task 13: Deploy LiveKit to Fly.io

**Files:**
- Create: `livekit/fly.toml`
- Modify: `fly.toml` (server — add LiveKit env vars)

**Step 1: Create Fly.io app for LiveKit**

```bash
cd /Users/dany/Desktop/Reunions_Capturia
mkdir -p livekit
```

Create `livekit/fly.toml`:
```toml
app = "capturia-livekit"
primary_region = "yyz"

[build]
  image = "livekit/livekit-server:latest"

[env]
  LIVEKIT_KEYS = "prodkey:GENERATE_A_STRONG_SECRET_HERE"

[[services]]
  internal_port = 7880
  protocol = "tcp"

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [[services.ports]]
    port = 7881
    handlers = ["tls"]

[[services]]
  internal_port = 7882
  protocol = "udp"

  [[services.ports]]
    port = 7882
    handlers = []

[vm]
  memory = "512mb"
  cpu_kind = "shared"
  cpus = 1
```

**Step 2: Deploy LiveKit**

```bash
cd livekit && fly launch --no-deploy
fly secrets set LIVEKIT_KEYS="prodkey:$(openssl rand -base64 32)"
fly deploy
```

**Step 3: Update server env vars on Fly.io**

```bash
fly secrets set LIVEKIT_API_KEY=prodkey LIVEKIT_API_SECRET=<the-secret-from-above> LIVEKIT_URL=wss://capturia-livekit.fly.dev -a capturia-office-server
```

**Step 4: Update client production env**

In `client/.env.production`:
```
VITE_LIVEKIT_URL=wss://capturia-livekit.fly.dev
```

**Step 5: Redeploy server and client**

```bash
fly deploy -a capturia-office-server
cd client && vercel --prod
```

**Step 6: Commit**

```bash
git add livekit/ client/.env.production
git commit -m "feat: deploy LiveKit to Fly.io production"
```

---

## Phase 4B — Google SSO Authentication

### Task 14: Add auth dependencies

**Files:**
- Modify: `package.json` (root/server)

**Step 1: Install dependencies**

```bash
cd /Users/dany/Desktop/Reunions_Capturia
yarn add google-auth-library jsonwebtoken
yarn add -D @types/jsonwebtoken
```

**Step 2: Commit**

```bash
git add package.json yarn.lock
git commit -m "chore: add google-auth-library and jsonwebtoken"
```

---

### Task 15: Create Google OAuth server routes

**Files:**
- Create: `server/auth/googleAuth.ts`
- Create: `server/auth/jwtMiddleware.ts`
- Modify: `server/index.ts` — mount auth routes

**Step 1: Create Google auth handler**

Create `server/auth/googleAuth.ts`:
```typescript
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod'
const ALLOWED_DOMAIN = process.env.ALLOWED_DOMAIN || ''
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '').split(',').filter(Boolean)

const client = new OAuth2Client(GOOGLE_CLIENT_ID)

export async function verifyGoogleToken(idToken: string) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  })
  const payload = ticket.getPayload()
  if (!payload || !payload.email) throw new Error('Invalid token')

  // Check domain or email whitelist
  const email = payload.email
  if (ALLOWED_DOMAIN && !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    throw new Error('Email domain not allowed')
  }
  if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(email)) {
    throw new Error('Email not in whitelist')
  }

  return {
    email: payload.email,
    name: payload.name || '',
    picture: payload.picture || '',
  }
}

export function issueJwt(email: string, name: string): string {
  return jwt.sign({ email, name }, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyJwt(token: string): { email: string; name: string } {
  return jwt.verify(token, JWT_SECRET) as { email: string; name: string }
}
```

**Step 2: Create JWT middleware**

Create `server/auth/jwtMiddleware.ts`:
```typescript
import { Request, Response, NextFunction } from 'express'
import { verifyJwt } from './googleAuth'

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }
  try {
    const token = authHeader.split(' ')[1]
    const payload = verifyJwt(token)
    ;(req as any).user = payload
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
```

**Step 3: Mount auth routes in server/index.ts**

Add to `server/index.ts`:
```typescript
import { verifyGoogleToken, issueJwt } from './auth/googleAuth'

app.post('/auth/google', async (req, res) => {
  try {
    const { idToken } = req.body
    const user = await verifyGoogleToken(idToken)
    const jwt = issueJwt(user.email, user.name)
    res.json({ token: jwt, email: user.email, name: user.name })
  } catch (err: any) {
    res.status(401).json({ error: err.message })
  }
})
```

**Step 4: Commit**

```bash
git add server/auth/ server/index.ts
git commit -m "feat: add Google OAuth verification and JWT auth routes"
```

---

### Task 16: Protect Colyseus room with JWT

**Files:**
- Modify: `server/rooms/SkyOffice.ts` — verify JWT on join

**Step 1: Add auth check in onAuth or onJoin**

In `SkyOffice.ts`, override `onAuth`:
```typescript
import { verifyJwt } from '../auth/googleAuth'

async onAuth(client: any, options: any) {
  if (process.env.NODE_ENV === 'production') {
    if (!options.token) throw new Error('No auth token')
    const payload = verifyJwt(options.token)
    return payload // Returned value is available as client.auth
  }
  return true // Skip auth in dev
}
```

**Step 2: Commit**

```bash
git add server/rooms/SkyOffice.ts
git commit -m "feat: protect Colyseus room join with JWT verification"
```

---

### Task 17: Create login page on client

**Files:**
- Create: `client/src/components/GoogleLoginPage.tsx`
- Modify: `client/src/App.tsx` — show login page before room selection
- Modify: `client/src/stores/UserStore.ts` — add auth state

**Step 1: Add auth state to UserStore**

Add to UserStore:
```typescript
// State
authToken: string | null  // JWT token
authEmail: string | null
authName: string | null

// Reducers
setAuth(state, action: { token: string; email: string; name: string })
clearAuth(state)
```

Load token from localStorage on init. Save on login.

**Step 2: Create GoogleLoginPage component**

Create `client/src/components/GoogleLoginPage.tsx`:
- Render a centered card with Capturia logo
- "Connexion avec Google" button
- Use Google Identity Services (GSI) library to show Google sign-in
- On success: POST idToken to `/auth/google`, receive JWT, dispatch `setAuth()`
- On error: show "Acces refuse" message

Add the Google GSI script tag to `client/index.html`:
```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

**Step 3: Update App.tsx flow**

Current flow: RoomSelectionDialog → LoginDialog → Game
New flow: GoogleLoginPage → RoomSelectionDialog → LoginDialog (name/avatar only) → Game

In App.tsx, add a check:
```typescript
const authToken = useAppSelector((state) => state.user.authToken)

if (!authToken) {
  return <GoogleLoginPage />
}
// ... existing flow
```

**Step 4: Pass JWT to Colyseus on connect**

In `Network.ts`, include the auth token when joining the room:
```typescript
const authToken = store.getState().user.authToken
this.room = await this.client.joinOrCreate(RoomType.PUBLIC, { token: authToken })
```

**Step 5: Commit**

```bash
git add client/src/components/GoogleLoginPage.tsx client/src/App.tsx client/src/stores/UserStore.ts client/src/services/Network.ts client/index.html
git commit -m "feat: add Google SSO login page and auth flow"
```

---

### Task 18: Set up Google OAuth credentials

**Step 1: Create Google Cloud project and OAuth credentials**

1. Go to https://console.cloud.google.com
2. Create project "Capturia Office"
3. Enable "Google Identity" API
4. Create OAuth 2.0 Client ID (Web application)
5. Add authorized origins: `http://localhost:5173`, `https://your-vercel-domain.vercel.app`
6. Copy Client ID

**Step 2: Set environment variables**

Local dev:
```bash
export GOOGLE_CLIENT_ID=your-client-id
export JWT_SECRET=your-jwt-secret
```

Production (Fly.io):
```bash
fly secrets set GOOGLE_CLIENT_ID=your-client-id JWT_SECRET=$(openssl rand -base64 32) ALLOWED_DOMAIN=capturia.com -a capturia-office-server
```

Add `VITE_GOOGLE_CLIENT_ID` to Vercel environment variables.

**Step 3: Test locally and deploy**

---

## Phase 4C — SQLite Persistence

### Task 19: Add SQLite dependency and create database module

**Files:**
- Modify: `package.json`
- Create: `server/database/db.ts`

**Step 1: Install better-sqlite3**

```bash
cd /Users/dany/Desktop/Reunions_Capturia
yarn add better-sqlite3
yarn add -D @types/better-sqlite3
```

**Step 2: Create database initialization**

Create `server/database/db.ts`:
```typescript
import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/capturia.db')

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    initTables()
  }
  return db
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone TEXT NOT NULL,
      sender_email TEXT,
      sender_name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sticky_notes (
      id TEXT PRIMARY KEY,
      zone TEXT NOT NULL,
      author_email TEXT,
      author_name TEXT NOT NULL,
      content TEXT NOT NULL,
      votes_json TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      email TEXT PRIMARY KEY,
      display_name TEXT,
      avatar TEXT,
      role TEXT,
      last_zone TEXT,
      status_preset TEXT,
      status_custom TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_messages_zone ON messages(zone);
    CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_sticky_notes_zone ON sticky_notes(zone);
  `)
}
```

**Step 3: Commit**

```bash
git add package.json yarn.lock server/database/db.ts
git commit -m "feat: add SQLite database with messages, sticky_notes, user_preferences tables"
```

---

### Task 20: Create message persistence

**Files:**
- Create: `server/database/messages.ts`
- Modify: `server/rooms/SkyOffice.ts` — save and load messages

**Step 1: Create messages repository**

Create `server/database/messages.ts`:
```typescript
import { getDb } from './db'

export interface DbMessage {
  id: number
  zone: string
  sender_email: string | null
  sender_name: string
  content: string
  created_at: string
}

export function saveMessage(zone: string, senderEmail: string | null, senderName: string, content: string): DbMessage {
  const db = getDb()
  const stmt = db.prepare(
    'INSERT INTO messages (zone, sender_email, sender_name, content) VALUES (?, ?, ?, ?)'
  )
  const result = stmt.run(zone, senderEmail, senderName, content)
  return {
    id: result.lastInsertRowid as number,
    zone,
    sender_email: senderEmail,
    sender_name: senderName,
    content,
    created_at: new Date().toISOString(),
  }
}

export function getRecentMessages(zone: string, limit = 100): DbMessage[] {
  const db = getDb()
  return db
    .prepare('SELECT * FROM messages WHERE zone = ? ORDER BY created_at DESC LIMIT ?')
    .all(zone, limit) as DbMessage[]
}
```

**Step 2: Wire into SkyOffice.ts**

In the chat message handler (`ADD_CHAT_MESSAGE` and `ADD_ZONE_CHAT_MESSAGE`), call `saveMessage()`.

On player join, send recent messages for the player's zone:
```typescript
const recentMessages = getRecentMessages(player.zone)
client.send('CHAT_HISTORY', { messages: recentMessages.reverse() })
```

**Step 3: Commit**

```bash
git add server/database/messages.ts server/rooms/SkyOffice.ts
git commit -m "feat: persist chat messages to SQLite and load on join"
```

---

### Task 21: Create sticky note persistence

**Files:**
- Create: `server/database/stickyNotes.ts`
- Modify: `server/rooms/SkyOffice.ts` — save and load sticky notes

**Step 1: Create sticky notes repository**

Create `server/database/stickyNotes.ts` with `saveStickyNote()`, `deleteStickyNote()`, `getStickyNotes(zone)`, `updateVotes()`.

**Step 2: Wire into SkyOffice.ts**

Save sticky notes on create, load on player join, delete on clear.

**Step 3: Commit**

```bash
git add server/database/stickyNotes.ts server/rooms/SkyOffice.ts
git commit -m "feat: persist sticky notes to SQLite"
```

---

### Task 22: Create user preferences persistence

**Files:**
- Create: `server/database/userPreferences.ts`
- Modify: `server/rooms/SkyOffice.ts` — load/save preferences

**Step 1: Create preferences repository**

Create `server/database/userPreferences.ts` with `getPreferences(email)`, `savePreferences(email, prefs)`.

**Step 2: Wire into SkyOffice.ts**

On join with auth, load preferences and send to client. On preference changes (avatar, role, name), save to DB.

**Step 3: Commit**

```bash
git add server/database/userPreferences.ts server/rooms/SkyOffice.ts
git commit -m "feat: persist user preferences to SQLite"
```

---

### Task 23: Add Fly.io volume for SQLite

**Files:**
- Modify: `fly.toml`
- Modify: `Dockerfile`

**Step 1: Create volume on Fly.io**

```bash
fly volumes create capturia_data --region yyz --size 1 -a capturia-office-server
```

**Step 2: Update fly.toml**

Add mounts section:
```toml
[mounts]
  source = "capturia_data"
  destination = "/data"
```

**Step 3: Set DB_PATH env**

```bash
fly secrets set DB_PATH=/data/capturia.db -a capturia-office-server
```

**Step 4: Commit and deploy**

```bash
git add fly.toml
git commit -m "feat: add Fly.io volume mount for SQLite persistence"
fly deploy -a capturia-office-server
```

---

## Phase 4D — Status & Presence

### Task 24: Add status fields to Colyseus schema

**Files:**
- Modify: `server/rooms/schema/OfficeState.ts` — add status fields to Player
- Modify: `types/IOfficeState.ts` — update IPlayer interface
- Modify: `types/Messages.ts` — add status messages

**Step 1: Add fields to Player schema**

In `OfficeState.ts`, add to Player class:
```typescript
@type('string') statusPreset: string = 'available'
@type('string') statusCustom: string = ''
@type('boolean') dnd: boolean = false
```

**Step 2: Add to IPlayer interface**

**Step 3: Add message types**

```typescript
UPDATE_STATUS = 'update_status',
```

**Step 4: Add handler in SkyOffice.ts**

```typescript
this.onMessage(Message.UPDATE_STATUS, (client, message: { preset: string; custom: string; dnd: boolean }) => {
  const player = this.state.players.get(client.sessionId)
  if (!player) return
  player.statusPreset = message.preset
  player.statusCustom = message.custom
  player.dnd = message.dnd
})
```

**Step 5: Commit**

```bash
git add server/rooms/schema/OfficeState.ts types/IOfficeState.ts types/Messages.ts server/rooms/SkyOffice.ts
git commit -m "feat: add status preset, custom message, and DND to player schema"
```

---

### Task 25: Create StatusPicker component

**Files:**
- Create: `client/src/components/StatusPicker.tsx`
- Modify: `client/src/stores/UserStore.ts` — track local status

**Step 1: Create the status picker UI**

Create `client/src/components/StatusPicker.tsx`:
- Dropdown/popover triggered from user list or bottom bar
- List of preset statuses with emojis (in French):
  - Disponible (green)
  - En reunion (calendar)
  - Concentre (headphones)
  - En appel (phone)
  - De retour bientot (coffee)
  - Malade (sick)
  - Teletravail (house)
  - Personnalise... (opens custom input)
- DND toggle at the bottom
- Selecting a status dispatches to UserStore and sends UPDATE_STATUS to server

**Step 2: Commit**

```bash
git add client/src/components/StatusPicker.tsx client/src/stores/UserStore.ts
git commit -m "feat: add StatusPicker component with presets and DND toggle"
```

---

### Task 26: Auto-detect status from zones and calls

**Files:**
- Modify: `client/src/services/Network.ts` — auto-set status on zone/call changes

**Step 1: Auto-set status on zone change**

When player enters a zone, auto-update status:
- meeting zone → "En reunion"
- deep_work zone → "Concentre"
- afk zone → keep current (AFK system handles this separately)
- other zones → "Disponible" (unless manually set)

When LiveKit call connects → "En appel"
When LiveKit call disconnects → revert to zone-based status

Only override if current status is auto-detected (not manually set).

**Step 2: Commit**

```bash
git add client/src/services/Network.ts
git commit -m "feat: auto-detect status from zone changes and call state"
```

---

### Task 27: Update UserListPanel for status display

**Files:**
- Modify: `client/src/components/UserListPanel.tsx`

**Step 1: Show emoji and status text**

For each player in the list, show:
- Status emoji next to their name
- Custom status text below name (if set)
- DND indicator (red border or icon)
- Status dot color based on preset

**Step 2: Show "in a call" indicator**

When a player is in a LiveKit room, show a phone icon or "En appel" badge.

**Step 3: Commit**

```bash
git add client/src/components/UserListPanel.tsx
git commit -m "feat: display status emoji, DND indicator, and call state in user list"
```

---

### Task 28: Display status above avatars in game

**Files:**
- Modify: `client/src/characters/Player.ts` or `OtherPlayer.ts`

**Step 1: Add status emoji as text above player**

Use Phaser's text rendering to show the status emoji above the player's name tag. Update when status changes via Colyseus state sync.

**Step 2: Show DND visual indicator**

When DND is active, show a red circle/border or a "do not disturb" icon on the avatar.

**Step 3: Commit**

```bash
git add client/src/characters/
git commit -m "feat: display status emoji and DND indicator above player avatars"
```

---

### Task 29: Block auto-join calls when DND is active

**Files:**
- Modify: `client/src/web/LiveKitService.ts` or `client/src/services/Network.ts`

**Step 1: Check DND before connecting to LiveKit**

When a LIVEKIT_TOKEN arrives, check if the local player has DND enabled. If so, skip the connection:
```typescript
const userState = store.getState().user
if (userState.dnd) {
  // Don't auto-join, show a toast "Mode Ne pas deranger actif"
  return
}
```

**Step 2: Show knock feedback for DND players**

When someone tries to knock a DND player, show "X est en mode Ne pas deranger".

**Step 3: Commit**

```bash
git add client/src/services/Network.ts client/src/web/LiveKitService.ts
git commit -m "feat: block auto-join calls when DND mode is active"
```

---

### Task 30: Final integration test and cleanup

**Step 1: Full local test**

1. Start LiveKit, server, client
2. Open 2-3 browser tabs
3. Test: login → enter zone → video connects → mic/camera toggles → screen share → leave zone → disconnect
4. Test: set status → see it in other tabs → set DND → verify auto-join blocked
5. Test: send chat messages → restart server → messages still there
6. Test: create sticky notes → restart server → notes still there

**Step 2: Fix any issues found**

**Step 3: Deploy to production**

```bash
fly deploy -a capturia-office-server
cd client && vercel --prod
```

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: phase 4 complete — LiveKit, Google SSO, SQLite, status system"
```
