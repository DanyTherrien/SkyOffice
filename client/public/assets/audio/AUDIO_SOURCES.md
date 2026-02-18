# Assets audio pour Capturia Office

Les fichiers audio doivent etre places dans ce dossier au format MP3.
L'AudioManager verifie l'existence de chaque fichier avant de le jouer,
donc les fichiers manquants sont ignores sans erreur.

## Boucles ambiantes (30-60 secondes, boucle sans coupure)

| Fichier | Description | Source recommandee |
|---------|------------|-------------------|
| `ambient_brainstorm.mp3` | Typing/clavier doux + chatter creatif subtil | freesound.org: "office typing ambient" (ID 531947, 456058) |
| `ambient_meeting.mp3` | Murmure de salle de conference, voix lointaines | freesound.org: "conference room ambience" (ID 364929) |
| `ambient_deepwork.mp3` | Pluie douce / white noise apaisant | freesound.org: "soft rain" (ID 531953, 346642) |
| `ambient_sales.mp3` | Buzz energique, clavier rapide, activite de bureau | freesound.org: "busy office" (ID 385943, 209779) |

## Effets sonores (courts, < 2 secondes)

| Fichier | Description | Source recommandee |
|---------|------------|-------------------|
| `sfx_zone_chime.mp3` | Chime melodieux a l'entree d'une zone | freesound.org: "chime notification" (ID 536420) |
| `sfx_chat_pop.mp3` | Pop/bulle pour message chat | freesound.org: "pop bubble" (ID 256116) |
| `sfx_player_join.mp3` | Ding positif — joueur rejoint | freesound.org: "positive ding" (ID 341695) |
| `sfx_player_leave.mp3` | Ding descendant — joueur part | freesound.org: "disconnect tone" (ID 445978) |
| `sfx_meeting_start.mp3` | Beep de debut de meeting | freesound.org: "meeting start beep" (ID 434754) |
| `sfx_ui_click.mp3` | Click UI leger | freesound.org: "ui click" (ID 406) |
| `sfx_notification.mp3` | Son de notification douce | freesound.org: "notification" (ID 527847) |

## Instructions

1. Telecharger chaque fichier depuis freesound.org ou opengameart.org
2. Convertir en MP3 (128-192 kbps) si necessaire
3. Renommer selon les noms ci-dessus
4. Placer dans ce dossier (`client/public/assets/audio/`)
5. Les boucles ambiantes doivent etre seamless (debut = fin pour un loop parfait)
6. Redemarrer le client (`cd client && yarn dev`) pour charger les nouveaux fichiers
