# Phase 4 — Fully Functional Virtual Office

**Date:** 2026-02-18
**Goal:** Make Capturia Office a reliable daily workspace for the 5-15 person team
**Approach:** LiveKit self-hosted + Google SSO + SQLite persistence + Slack-like status

---

## Context

Phases 0-3 delivered the core virtual office: 6-zone map, 32 avatars, chat, sticky notes, knock system, observer mode, pomodoro, badges, meeting tools, and more. Deployed on Fly.io (server) + Vercel (client).

**Problem:** The office isn't usable as a daily tool because:
1. Video/audio (PeerJS) is unreliable — calls don't connect, cameras aren't auto-selected
2. No authentication — anyone with the URL can join
3. No persistence — chat and notes are lost on server restart
4. Status/presence UX is basic

---

## Design

### 4A — LiveKit Migration (Video/Audio)

**Replace PeerJS with LiveKit (open-source SFU), self-hosted on Fly.io.**

Architecture:
- LiveKit server runs as a separate Fly.io app (`capturia-livekit`)
- One LiveKit room per active zone (brainstorm, meeting, sales, one_on_one)
- Deep Work and AFK zones have no calls
- Ad-hoc rooms for booth invites (1-on-1 private calls)

Flow:
1. Player enters a zone → Colyseus detects zone change (existing)
2. Server generates a LiveKit access token for that zone's room
3. Client receives token, connects to LiveKit room automatically
4. Player leaves zone → client disconnects from LiveKit room
5. LiveKit handles all media negotiation, ICE, TURN

UX improvements:
- Media preview dialog on first join (camera + mic test before entering)
- Device preferences saved in localStorage
- Persistent mic/camera toggle in bottom bar (always visible)
- Screen sharing button in bottom bar when in a call zone
- MediaSettingsDialog (existing) wired to LiveKit device APIs

Deployment:
- LiveKit on Fly.io: ~512MB RAM, 1 shared CPU
- Estimated cost: $5-10/month
- LiveKit config via environment variables

Files affected:
- DELETE: `client/src/web/WebRTC.ts`
- NEW: `client/src/web/LiveKitService.ts`
- NEW: `server/services/LiveKitTokenService.ts`
- MODIFY: `client/src/scenes/Game.ts` (zone change → LiveKit connect)
- MODIFY: `client/src/components/MediaSettingsDialog.tsx`
- MODIFY: `client/src/components/` (bottom bar controls)
- MODIFY: `server/rooms/SkyOffice.ts` (token generation on zone change)
- MODIFY: `package.json` files (add livekit-client, livekit-server-sdk, remove peerjs)

### 4B — Authentication (Google SSO)

**Google OAuth 2.0 with domain/email restriction.**

Flow:
1. User visits app → login page with "Sign in with Google" button
2. Google OAuth redirect → server validates token
3. If email is on allowed list → issue JWT, redirect to office
4. If not → "Access denied" message
5. JWT in localStorage, auto-login on return (7-day expiry)

Access control:
- Env variable `ALLOWED_DOMAIN` (e.g., `capturia.com`) or `ALLOWED_EMAILS` (comma-separated whitelist)
- Admin page at `/admin` (protected by master password env var) to manage whitelist

User identity:
- Google email = unique user ID
- Profile (name, avatar, role) stored in SQLite, keyed by email
- Returning users get their settings back automatically

Files affected:
- NEW: `server/auth/googleAuth.ts`
- NEW: `server/auth/jwtMiddleware.ts`
- NEW: `client/src/components/LoginPage.tsx`
- MODIFY: `server/index.ts` (auth routes, middleware)
- MODIFY: `client/src/services/Network.ts` (send JWT on connect)
- MODIFY: `server/rooms/SkyOffice.ts` (verify JWT on room join)

### 4C — Persistence (SQLite)

**SQLite via better-sqlite3, stored on Fly.io volume.**

Tables:
- `messages` (id, zone, sender_email, sender_name, content, created_at)
- `sticky_notes` (id, zone, author_email, author_name, content, votes_json, created_at)
- `user_preferences` (email PK, display_name, avatar, role, last_zone, status_preset, status_custom, updated_at)

Behavior:
- On server start: create tables if not exist
- On player join: send last 100 messages for their zone, load their preferences
- On message/note create: save to DB immediately
- On preference change: update DB

NOT persisted (intentionally):
- Player positions (transient, Colyseus handles)
- Meeting state (transient)
- Analytics data (future consideration)

Files affected:
- NEW: `server/database/db.ts` (init, migrations)
- NEW: `server/database/messages.ts`
- NEW: `server/database/stickyNotes.ts`
- NEW: `server/database/userPreferences.ts`
- MODIFY: `server/rooms/SkyOffice.ts` (load/save on events)
- MODIFY: `Dockerfile` (volume mount)
- MODIFY: `fly.toml` (volume config)

### 4D — Status & Presence

**Slack-like status presets with DND mode.**

Presets:
- Available (green dot)
- In a meeting (calendar emoji) — auto-set in meeting zone
- Focusing (headphones emoji) — auto-set in deep work zone
- On a call (phone emoji) — auto-set when in LiveKit room
- Be right back (coffee emoji) — manual
- Out sick (sick emoji) — manual
- Working remotely (house emoji) — manual
- Custom (user picks emoji + text) — manual

Do Not Disturb:
- Toggle in UI
- Blocks auto-join calls in all zones
- Red indicator on avatar and in user list
- Others see "X is in DND mode" if they try to knock

Auto-detection:
- Zone changes set status automatically (meeting zone → In a meeting)
- Entering a LiveKit call → On a call
- Manual statuses override auto-detection until manually cleared

Display:
- Emoji + colored dot next to name in user list panel
- Emoji bubble above avatar in game world
- Status persisted in SQLite (survives reconnects)

Files affected:
- NEW: `client/src/components/StatusPicker.tsx`
- MODIFY: `client/src/components/UserListPanel.tsx`
- MODIFY: `client/src/stores/UserStore.ts`
- MODIFY: `server/rooms/schema/OfficeState.ts` (status fields on Player)
- MODIFY: `types/IOfficeState.ts`
- MODIFY: `client/src/characters/Player.ts` (status emoji above head)

---

## Implementation Order

1. **4A — LiveKit** (highest impact, unblocks daily use)
2. **4B — Auth** (security, required before sharing with team)
3. **4C — Persistence** (reliability, data doesn't disappear)
4. **4D — Status** (quality of life, polish)

## Cost Estimate

| Service | Monthly cost |
|---------|-------------|
| Fly.io server (existing) | ~$5 |
| Fly.io LiveKit | ~$5-10 |
| Fly.io volume (1GB SQLite) | ~$0.15 |
| Vercel (existing) | Free |
| Google OAuth | Free |
| **Total** | **~$10-15/month** |

## Out of Scope (Future)

- Calendar integration (Google Calendar / Outlook)
- GoHighLevel CRM integration
- Multi-tenancy / productization
- Advanced analytics
- Mobile-optimized layout
- Automated testing / CI/CD
