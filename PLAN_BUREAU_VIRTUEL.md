# Capturia Office — Plan Complet Bureau Virtuel 2D

## Vision
Créer un bureau virtuel où **ta position = ton intention**. Chaque salle impose des comportements par son design. L'objectif : bâtir une culture où tout le monde est toujours au bureau, visible, avec des règles sociales intégrées dans l'outil.

## Les 6 salles

| Salle | Vibe | Règle sociale |
|-------|------|---------------|
| **Sales** | Salle de verre | Observable, interruptible seulement sur demande ("knock") |
| **Meeting** | Salle de conf | Structurée, enregistrable, formelle |
| **Brainstorm** | Lab créatif | Libre, assisté par un bot IA |
| **Deep Work** | Bunker | Visible mais intouchable (DND automatique) |
| **1-on-1** | Bureau fermé | Privé, max 2 personnes, aucune observation |
| **AFK** | Lounge | Absent assumé, aucun jugement, aucune communication |

---

## Phase 4 — Nouvelle carte 6 salles + moteur de règles

### Objectif
Passer de 4 à 6 salles et créer le système qui permet à chaque salle d'avoir ses propres règles.

### 4A — Redesign de la carte
- [ ] Concevoir le layout 6 salles dans Tiled (agrandir la tilemap si nécessaire)
- [ ] Sales : grande salle avec postes d'ordinateur individuels (6-8 postes)
- [ ] Meeting : table centrale, écran de projection, sièges autour
- [ ] Brainstorm : espace ouvert, tableau, ambiance informelle
- [ ] Deep Work : cubicles individuels, ambiance calme
- [ ] 1-on-1 : 2-3 petits booths fermés (cabines privées)
- [ ] AFK : lounge avec sofas, machine à café, plantes
- [ ] Couloir/hub central pour naviguer entre les salles
- [ ] Exporter le nouveau map.json

### 4B — Moteur de règles par salle (Room Behavior Engine)
- [ ] Créer un système de configuration par zone :
  ```
  {
    zone: "sales",
    maxCapacity: null,
    allowObservation: true,
    allowKnock: true,
    autoVideo: true,
    autoDND: false,
    allowRecording: false,
    private: false,
    aiBot: false
  }
  ```
- [ ] Appliquer les règles automatiquement quand un joueur entre/sort d'une zone
- [ ] Mettre à jour le serveur Colyseus pour synchroniser les règles de zone
- [ ] UI : afficher les règles actives de la salle courante (petit badge/icône)

### 4C — Indicateur de présence global
- [ ] Panel latéral montrant qui est dans quelle salle en temps réel
- [ ] Icônes de statut par salle (visible au survol du nom)
- [ ] Compteur de personnes par salle sur la carte

### Livrable
Carte fonctionnelle à 6 salles, chaque salle applique ses règles de base automatiquement.

---

## Phase 5 — Sales Room : La Salle de Verre

### Objectif
Permettre l'observation transparente des reps en action + système de demande d'interruption.

### 5A — Postes d'ordinateur individuels
- [ ] Chaque rep s'assoit à un poste (comme les Computer existants)
- [ ] Quand un rep est "à son poste", son statut passe à "En appel" / "Disponible" / "En préparation"
- [ ] Indicateur visuel au-dessus de l'avatar (icône téléphone, point vert, etc.)

### 5B — Mode Observation (Shadow)
- [ ] Un manager/collègue peut cliquer sur un rep pour "observer"
- [ ] L'observateur entend l'audio du rep (one-way audio stream)
- [ ] Option : voir l'écran partagé du rep (si le rep partage)
- [ ] Le rep voit un indicateur discret qu'il est observé (petit œil)
- [ ] L'observateur ne peut PAS parler — c'est du listen-only
- [ ] Possibilité de "chuchoter" au rep (audio one-way vers le rep seulement, pas vers le client)

### 5C — Système de Knock (demande d'interruption)
- [ ] Bouton "Frapper" quand on s'approche d'un rep occupé
- [ ] Le rep reçoit une notification non-intrusive (popup discrète)
- [ ] Le rep peut : Accepter (ouvre la comm) / Refuser / "Dans 5 min"
- [ ] Si refusé, le demandeur reçoit le feedback
- [ ] Historique des knocks (pour que le rep n'oublie pas de rappeler)

### 5D — Dashboard Sales (optionnel avancé)
- [ ] Vue d'ensemble : qui est en call, depuis combien de temps
- [ ] Stats : nombre d'appels aujourd'hui, temps moyen par call
- [ ] Intégration future possible avec CRM

### Livrable
Un manager peut ouvrir l'app, voir tous ses reps, écouter un call en cours, et frapper pour parler quand c'est le bon moment.

---

## Phase 6 — Meeting Room : La Salle de Conférence

### Objectif
Transformer la salle de meeting en vrai outil de réunion avec enregistrement, whiteboard, et partage d'écran.

### 6A — Enregistrement de réunion
- [ ] Bouton "Record" dans la toolbar de meeting
- [ ] Capture audio de tous les participants (MediaRecorder API)
- [ ] Option : capture vidéo aussi (plus lourd)
- [ ] Sauvegarde locale (download) ou vers un storage (S3, Google Drive)
- [ ] Indicateur visuel "Enregistrement en cours" pour tous les participants
- [ ] Consentement : notification à tous quand l'enregistrement démarre

### 6B — Whiteboard amélioré
- [ ] Whiteboard collaboratif en temps réel (le système existant comme base)
- [ ] Outils : dessin libre, formes, texte, sticky notes, flèches
- [ ] Export du whiteboard en image/PDF
- [ ] Historique des whiteboards (sauvegarde par session)

### 6C — Partage d'écran
- [ ] Bouton "Partager mon écran" (getDisplayMedia API)
- [ ] L'écran partagé est visible par tous dans la salle
- [ ] Un seul partage actif à la fois (ou mode galerie)
- [ ] Possibilité de "prendre le contrôle" du partage (passer au suivant)

### 6D — Structure de réunion (optionnel avancé)
- [ ] Timer de réunion visible par tous
- [ ] Champ "Ordre du jour" à l'entrée de la salle
- [ ] Notes collaboratives en temps réel
- [ ] Résumé automatique post-meeting (via IA, transcription → résumé)

### Livrable
Une vraie salle de conférence virtuelle : on entre, on lance le meeting, on record, on whiteboard, on partage son écran, on ressort avec un compte-rendu.

---

## Phase 7 — Brainstorm Room : Le Lab Créatif

### Objectif
Créer un espace d'idéation assisté par un bot IA qui participe activement au brainstorming.

### 7A — Bot IA présent dans la salle
- [ ] Avatar IA visible dans la salle (personnage permanent, toujours "assis" dans la salle)
- [ ] Le bot a un nom et une personnalité (ex: "Crea", l'assistant créatif)
- [ ] Le bot est un participant du chat textuel de la salle

### 7B — Interactions avec le bot
- [ ] Les participants peuvent parler au bot via le chat (mention @Crea ou commande /ask)
- [ ] Le bot peut :
  - Générer des idées à partir d'un thème
  - Faire du "Yes, and..." (technique d'impro)
  - Jouer le devil's advocate
  - Structurer les idées en catégories
  - Faire des mind maps textuelles
  - Proposer des analogies et métaphores
  - Résumer la session de brainstorm
- [ ] Mode "brainstorm structuré" :
  1. Définir le problème
  2. Divergence (générer un max d'idées, le bot aide)
  3. Convergence (le bot aide à trier/prioriser)
  4. Plan d'action

### 7C — Outils de brainstorm
- [ ] Sticky notes virtuels (chaque participant peut en créer)
- [ ] Tableau de vote (dot voting sur les idées)
- [ ] Timer pour les sessions timeboxées
- [ ] Export de la session (toutes les idées + votes + résumé IA)

### 7D — Ambiance
- [ ] Musique d'ambiance optionnelle (lo-fi, nature sounds)
- [ ] Visuels dynamiques (particules créatives, couleurs changeantes)
- [ ] Pas de règles formelles — l'espace encourage le chaos créatif

### Livrable
Une salle où tu entres avec un problème et tu ressors avec des idées structurées, assisté par une IA créative.

---

## Phase 8 — Deep Work : Le Bunker

### Objectif
Un espace sacré de concentration. Tu es visible mais personne ne peut te déranger.

### 8A — Do Not Disturb automatique
- [ ] En entrant dans la zone, le DND s'active automatiquement
- [ ] Aucun appel audio/vidéo entrant
- [ ] Aucune notification de chat (les messages sont en file d'attente)
- [ ] Aucun "knock" possible (contrairement à Sales)
- [ ] En sortant de la zone, le DND se désactive et les messages en attente arrivent

### 8B — Présence visible
- [ ] L'avatar est visible sur la carte pour tous
- [ ] Dans le panel utilisateurs : statut "Deep Work 🔇" avec le temps passé
- [ ] Les collègues peuvent voir QUI est en deep work sans les déranger

### 8C — Ambiance focus
- [ ] Ambiance visuelle calme (lumière tamisée, pas de particules)
- [ ] Option : musique focus intégrée (lo-fi, bruit blanc, nature)
- [ ] Timer Pomodoro optionnel (25 min focus / 5 min pause)
- [ ] À la fin du Pomodoro : suggestion de prendre une pause (aller en AFK)

### 8D — Message différé
- [ ] Les collègues peuvent laisser un message pour quand tu sors du Deep Work
- [ ] "Quand tu sors, rappelle-moi" — le message t'attend à la sortie
- [ ] Pas de notification immédiate, juste une file d'attente

### Livrable
Entrer en Deep Work = signal clair à toute l'équipe. Zéro distraction, focus total, mais tu fais partie du bureau.

---

## Phase 9 — 1-on-1 Booths : Le Bureau Fermé

### Objectif
Des cabines privées pour les conversations confidentielles entre 2 personnes.

### 9A — Booths privés
- [ ] 2-3 petites salles sur la carte (comme des phone booths)
- [ ] Capacité max : 2 personnes par booth
- [ ] Si un booth est occupé (2 personnes), personne d'autre ne peut entrer
- [ ] Indicateur visuel : porte ouverte (libre) / porte fermée (occupé)

### 9B — Confidentialité totale
- [ ] Audio/vidéo uniquement entre les 2 occupants
- [ ] PAS de mode observation (contrairement à Sales)
- [ ] PAS d'enregistrement possible (contrairement à Meeting)
- [ ] Les noms des occupants sont visibles ("X est en 1-on-1 avec Y") mais pas le contenu

### 9C — Inviter quelqu'un
- [ ] Tu peux "inviter" quelqu'un dans un booth depuis le panel utilisateurs
- [ ] La personne reçoit une notification : "X t'invite pour un 1-on-1"
- [ ] Accepter → téléportation dans le booth
- [ ] Refuser → feedback à l'invitant

### Livrable
Un espace pour les conversations privées — feedback, coaching, sujets sensibles — sans oreilles indiscrètes.

---

## Phase 10 — AFK Room : Le Lounge

### Objectif
Normaliser les pauses. Quand tu es AFK, tout le monde le sait et personne ne te cherche.

### 10A — Comportement AFK
- [ ] Aucun audio/vidéo actif
- [ ] Avatar affiché dans le lounge (peut-être une animation "relax")
- [ ] Statut automatique : "AFK" dans le panel utilisateurs
- [ ] Aucune notification reçue (tout est en file d'attente)

### 10B — Statut personnalisé (optionnel)
- [ ] En entrant, option de choisir un sous-statut :
  - ☕ Pause café
  - 🍽️ Lunch
  - 🚶 Parti en commission
  - 🧘 Pause bien-être
  - ⏰ De retour à [heure]
- [ ] Le sous-statut est visible par tous dans le panel

### 10C — Retour au travail
- [ ] Quand tu quittes l'AFK, tu reçois un résumé :
  - Messages en attente
  - Knocks manqués (Sales)
  - Invitations 1-on-1 manquées
  - Résumé des meetings terminés pendant ton absence

### Livrable
Pas de "il est où lui?" — la réponse est toujours claire. Et au retour, rien n'est perdu.

---

## Phase 11 — Dashboard Manager & Culture Layer

### Objectif
Vue d'ensemble pour les managers + outils qui renforcent la culture d'équipe.

### 11A — Dashboard temps réel
- [ ] Vue bird's-eye : qui est où, en un coup d'œil
- [ ] Heatmap des salles (quelles salles sont les plus utilisées)
- [ ] Timeline de la journée (qui est arrivé quand, flux entre les salles)

### 11B — Analytics (optionnel)
- [ ] Temps passé par salle par personne (par jour/semaine)
- [ ] Ratio Deep Work vs Meetings vs Sales
- [ ] Patterns d'équipe (à quelle heure les gens sont le plus en Deep Work ?)
- [ ] Aucun tracking intrusif — données agrégées, pas de surveillance

### 11C — Rituels d'équipe
- [ ] "Standup spot" — un endroit sur la carte où l'équipe se retrouve chaque matin
- [ ] "End of day" — passage par le lounge avant de déconnecter
- [ ] Badges/achievements fun (ex: "100h de Deep Work", "10 brainstorms")

### Livrable
L'outil devient un miroir de la culture d'équipe. Le manager voit la santé de son équipe sans micro-manager.

---

## Ordre de priorité recommandé

| Priorité | Phase | Raison |
|----------|-------|--------|
| 🔴 1 | Phase 4 (Carte + Moteur de règles) | Fondation de tout le reste |
| 🔴 2 | Phase 8 (Deep Work) | Le plus simple à implémenter, valeur immédiate |
| 🔴 3 | Phase 10 (AFK) | Très simple, complète le Deep Work |
| 🟡 4 | Phase 5 (Sales) | Feature signature, différenciateur clé |
| 🟡 5 | Phase 9 (1-on-1) | Petit scope, haute valeur |
| 🟡 6 | Phase 6 (Meeting) | Amélioration progressive de l'existant |
| 🟢 7 | Phase 7 (Brainstorm + IA) | Le plus ambitieux techniquement |
| 🟢 8 | Phase 11 (Dashboard) | Polish et culture, après que le reste fonctionne |

---

## Notes techniques transversales

### WebRTC / PeerJS
- Le mode observation (Sales) nécessite des streams one-way
- Le screen share utilise `getDisplayMedia()` — déjà supporté par les navigateurs modernes
- L'enregistrement utilise `MediaRecorder API` côté client

### Bot IA (Brainstorm)
- Backend : API Claude/OpenAI appelée depuis le serveur Colyseus
- Le bot est un "joueur virtuel" dans le schema Colyseus (pas un vrai client WebSocket)
- Les messages du bot transitent par le même système de chat

### Colyseus Schema
- Ajouter les nouvelles propriétés de zone (rules, capacity, occupants)
- Ajouter les états spécifiques (knock queue, recording status, DND status)
- Synchronisation automatique vers tous les clients

### Carte Tiled
- Agrandir la tilemap pour accommoder 6 salles + couloirs
- Utiliser les object layers pour définir les zones et les items interactifs
- Chaque salle a sa propre palette visuelle pour une identité claire

---

*Ce plan est conçu pour être exécuté phase par phase, chaque phase dans une conversation séparée. Chaque phase est autonome et testable indépendamment.*
