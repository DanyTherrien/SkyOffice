import React from 'react'
import styled from 'styled-components'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined'

import type { StickyNote as StickyNoteType } from '../stores/BrainstormStore'

// ─── Styled Components ──────────────────────────────────────────────────────

const Card = styled.div<{ $bg: string; $voted: boolean }>`
  background: ${({ $bg }) => $bg};
  border-radius: 8px;
  padding: 12px;
  min-height: 100px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.15s ease, transform 0.15s ease;
  cursor: default;
  border: ${({ $voted }) => ($voted ? '2px solid #3b82f6' : '2px solid transparent')};

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
    transform: translateY(-1px);
  }
`

const NoteText = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: #1e293b;
  word-break: break-word;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  flex: 1;
`

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  gap: 4px;
`

const AuthorName = styled.span`
  font-size: 11px;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 80px;
`

const VoteArea = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`

const VoteCount = styled.span<{ $hasVotes: boolean }>`
  font-size: 12px;
  font-weight: 600;
  color: ${({ $hasVotes }) => ($hasVotes ? '#3b82f6' : '#94a3b8')};
  min-width: 14px;
  text-align: center;
`

// ─── Props ──────────────────────────────────────────────────────────────────

interface StickyNoteProps {
  note: StickyNoteType
  isAuthor: boolean
  hasVoted: boolean
  onVote: (noteId: string) => void
  onDelete: (noteId: string) => void
}

// ─── Composant ──────────────────────────────────────────────────────────────

export default function StickyNote({
  note,
  isAuthor,
  hasVoted,
  onVote,
  onDelete,
}: StickyNoteProps): JSX.Element {
  return (
    <Card $bg={note.color} $voted={hasVoted}>
      <NoteText>{note.text}</NoteText>
      <Footer>
        <AuthorName title={note.authorName}>{note.authorName}</AuthorName>
        <VoteArea>
          <Tooltip title={hasVoted ? 'Retirer le vote' : 'Voter'} arrow>
            <IconButton
              size="small"
              onClick={() => onVote(note.id)}
              sx={{ padding: '2px', color: hasVoted ? '#3b82f6' : '#94a3b8' }}
            >
              {hasVoted ? (
                <ThumbUpIcon sx={{ fontSize: 16 }} />
              ) : (
                <ThumbUpOutlinedIcon sx={{ fontSize: 16 }} />
              )}
            </IconButton>
          </Tooltip>
          <VoteCount $hasVotes={note.votes > 0}>{note.votes}</VoteCount>
          {isAuthor && (
            <Tooltip title="Supprimer" arrow>
              <IconButton
                size="small"
                onClick={() => onDelete(note.id)}
                sx={{ padding: '2px', color: '#ef4444', marginLeft: '2px' }}
              >
                <DeleteOutlineIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </VoteArea>
      </Footer>
    </Card>
  )
}
