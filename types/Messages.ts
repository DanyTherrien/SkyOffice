export enum Message {
  UPDATE_PLAYER,
  UPDATE_PLAYER_NAME,
  READY_TO_CONNECT,
  DISCONNECT_STREAM,
  CONNECT_TO_COMPUTER,
  DISCONNECT_FROM_COMPUTER,
  STOP_SCREEN_SHARE,
  CONNECT_TO_WHITEBOARD,
  DISCONNECT_FROM_WHITEBOARD,
  VIDEO_CONNECTED,
  ADD_CHAT_MESSAGE,
  SEND_ROOM_DATA,
  UPDATE_PLAYER_ZONE,
  UPDATE_PLAYER_ROLE,

  UPDATE_PLAYER_STATUS,

  // Messages pour les reunions par zone (Phase 3)
  ZONE_MEMBERS_UPDATE,
  ADD_ZONE_CHAT_MESSAGE,
  ZONE_CHAT_MESSAGE,
  STOP_ZONE_SCREEN_SHARE,
  ZONE_SCREEN_SHARE_STOPPED,

  // Reactions emoji (Phase 5)
  EMOJI_REACTION,

  // Presence sociale (Phase 3)
  TYPING_STATUS,
  AFK_STATUS,
  UPDATE_PLAYER_AFK_REASON,

  // Capacite des zones (Phase 4)
  ZONE_FULL,

  // Sales Glass Room — statut d'activite des reps
  UPDATE_SALES_STATUS,

  // Systeme de Knock (Sales Room)
  KNOCK_REQUEST,      // Client -> Server: {targetId: string, message?: string}
  KNOCK_RESPONSE,     // Client -> Server: {knockerId: string, response: 'accept' | 'refuse' | 'later'}
  KNOCK_RECEIVED,     // Server -> Client: {knockerId: string, knockerName: string, message?: string}
  KNOCK_RESULT,       // Server -> Client: {targetId: string, targetName: string, response: 'accept' | 'refuse' | 'later'}

  // Observation / Shadow mode (Sales)
  START_OBSERVING,     // Client -> Server: {targetId: string}
  STOP_OBSERVING,      // Client -> Server: {}
  OBSERVER_ADDED,      // Server -> Client: {observerId: string, observerName: string}
  OBSERVER_REMOVED,    // Server -> Client: {observerId: string}

  // Invitations 1-on-1 booth
  INVITE_TO_BOOTH,         // Client -> Server: {targetId: string}
  BOOTH_INVITE_RECEIVED,   // Server -> Client: {inviterId: string, inviterName: string}
  BOOTH_INVITE_RESPONSE,   // Client -> Server: {inviterId: string, accepted: boolean}
  BOOTH_INVITE_RESULT,     // Server -> Client: {targetId: string, targetName: string, accepted: boolean}

  // Enregistrement audio des reunions
  START_RECORDING,         // Client -> Server: {} (notifie tous les membres de la zone)
  STOP_RECORDING,          // Client -> Server: {}
  RECORDING_STARTED,       // Server -> Client: {recorderName: string}
  RECORDING_STOPPED,       // Server -> Client: {recorderName: string}

  // Outils de reunion structuree (Meeting Room)
  MEETING_TIMER_START,     // Client -> Server: {duration?: number}
  MEETING_TIMER_STOP,      // Client -> Server: {}
  MEETING_TIMER_SYNC,      // Server -> Client: {running: boolean, startTime: number, duration?: number}
  MEETING_AGENDA_UPDATE,   // Client <-> Server: {agenda: string}
  MEETING_NOTES_UPDATE,    // Client <-> Server: {notes: string}

  // Bot IA Brainstorm (Crea)
  AI_BOT_MESSAGE,          // Server -> Client: {content: string, zone: string}
  AI_BOT_THINKING,         // Server -> Client: {zone: string} (indicateur de saisie)
  AI_BOT_REQUEST,          // Client -> Server: {prompt: string} (requete explicite @Crea)

  // Outils de brainstorm — sticky notes + votes
  ADD_STICKY_NOTE,         // Client -> Server: {text: string, color: string}
  REMOVE_STICKY_NOTE,      // Client -> Server: {noteId: string}
  STICKY_NOTE_ADDED,       // Server -> Client: {noteId, text, color, authorName, authorId}
  STICKY_NOTE_REMOVED,     // Server -> Client: {noteId: string}
  VOTE_NOTE,               // Client -> Server: {noteId: string}
  UNVOTE_NOTE,             // Client -> Server: {noteId: string}
  VOTE_UPDATED,            // Server -> Client: {noteId, votes, voters}
  CLEAR_BOARD,             // Client -> Server: {}
  BOARD_CLEARED,           // Server -> Client: {}
  SYNC_BOARD,              // Server -> Client: {notes: StickyNote[]}

  // LiveKit video/audio
  REQUEST_LIVEKIT_TOKEN = 'request_livekit_token',
  LIVEKIT_TOKEN = 'livekit_token',
}
