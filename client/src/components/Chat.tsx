import React, { useRef, useState, useEffect } from 'react'
import styled from 'styled-components'
import Box from '@mui/material/Box'
import Fab from '@mui/material/Fab'
import Badge from '@mui/material/Badge'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import InputBase from '@mui/material/InputBase'
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import CloseIcon from '@mui/icons-material/Close'
import 'emoji-mart/css/emoji-mart.css'
import { Picker } from 'emoji-mart'

import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'

import { getColorByString } from '../util'
import { useAppDispatch, useAppSelector } from '../hooks'
import { MessageType, setFocused, setShowChat, setChatTab } from '../stores/ChatStore'
import { ZONE_NAMES } from '../constants'

const Backdrop = styled.div`
  position: fixed;
  bottom: 60px;
  left: 0;
  height: 400px;
  width: 500px;
  max-height: 50%;
  max-width: 100%;
`

const Wrapper = styled.div`
  position: relative;
  height: 100%;
  padding: 16px;
  display: flex;
  flex-direction: column;
`

const FabWrapper = styled.div`
  margin-top: auto;
`

const ChatHeader = styled.div`
  position: relative;
  height: 35px;
  background: #000000a7;
  border-radius: 10px 10px 0px 0px;

  h3 {
    color: #fff;
    margin: 7px;
    font-size: 17px;
    text-align: center;
  }

  .close {
    position: absolute;
    top: 0;
    right: 0;
  }
`

const TabBar = styled.div`
  display: flex;
  background: #1a1a2e;
  border-left: 1px solid #00000029;
  border-right: 1px solid #00000029;
`

const TabButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 6px 12px;
  border: none;
  background: ${({ $active }) => ($active ? '#2c2c2c' : 'transparent')};
  color: ${({ $active }) => ($active ? '#14B8A6' : '#999')};
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 'bold' : 'normal')};
  cursor: pointer;
  border-bottom: 2px solid ${({ $active }) => ($active ? '#14B8A6' : 'transparent')};
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  &:hover {
    color: #eee;
  }
`

const UnreadBadge = styled.span`
  background: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: bold;
  padding: 1px 5px;
  border-radius: 8px;
  min-width: 16px;
  text-align: center;
`

const ChatBox = styled(Box)`
  height: 100%;
  width: 100%;
  overflow: auto;
  background: #2c2c2c;
  border: 1px solid #00000029;
`

const MessageWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  padding: 0px 2px;

  p {
    margin: 3px;
    text-shadow: 0.3px 0.3px black;
    font-size: 15px;
    font-weight: bold;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }

  span {
    color: white;
    font-weight: normal;
  }

  .notification {
    color: grey;
    font-weight: normal;
  }

  :hover {
    background: #3a3a3a;
  }
`

const InputWrapper = styled.form`
  box-shadow: 10px 10px 10px #00000018;
  border: 1px solid #14B8A6;
  border-radius: 0px 0px 10px 10px;
  display: flex;
  flex-direction: row;
  background: linear-gradient(180deg, #000000c1, #242424c0);
`

const InputTextField = styled(InputBase)`
  border-radius: 0px 0px 10px 10px;
  input {
    padding: 5px;
  }
`

const EmojiPickerWrapper = styled.div`
  position: absolute;
  bottom: 54px;
  right: 16px;
`

const dateFormatter = new Intl.DateTimeFormat('fr-CA', {
  timeStyle: 'short',
  dateStyle: 'short',
})


const Message = ({ chatMessage, messageType }) => {
  const [tooltipOpen, setTooltipOpen] = useState(false)

  return (
    <MessageWrapper
      onMouseEnter={() => {
        setTooltipOpen(true)
      }}
      onMouseLeave={() => {
        setTooltipOpen(false)
      }}
    >
      <Tooltip
        open={tooltipOpen}
        title={dateFormatter.format(chatMessage.createdAt)}
        placement="right"
        arrow
      >
        {messageType === MessageType.REGULAR_MESSAGE ? (
          <p
            style={{
              color: getColorByString(chatMessage.author),
            }}
          >
            {chatMessage.author}: <span>{chatMessage.content}</span>
          </p>
        ) : (
          <p className="notification">
            {chatMessage.author} {chatMessage.content}
          </p>
        )}
      </Tooltip>
    </MessageWrapper>
  )
}

export default function Chat() {
  const [inputValue, setInputValue] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [readyToSubmit, setReadyToSubmit] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const allMessages = useAppSelector((state) => state.chat.chatMessages)
  const activeZone = useAppSelector((state) => state.meeting.activeZone)
  const focused = useAppSelector((state) => state.chat.focused)
  const showChat = useAppSelector((state) => state.chat.showChat)
  const chatTab = useAppSelector((state) => state.chat.chatTab)
  const unreadGeneralCount = useAppSelector((state) => state.chat.unreadGeneralCount)
  const unreadZoneCount = useAppSelector((state) => state.chat.unreadZoneCount)

  // Determiner la zone courante du joueur (peut etre hors meeting)
  const currentZone = (() => {
    try {
      const game = phaserGame.scene.keys.game as Game
      return game?.myPlayer?.currentZone || ''
    } catch {
      return activeZone || ''
    }
  })()

  // Filtrer les messages selon l'onglet actif
  const chatMessages = allMessages.filter((msg) => {
    if (chatTab === 'general') {
      // Onglet general: messages globaux (zone vide) + join/leave bureau
      return msg.zone === ''
    }
    // Onglet zone: messages de la zone courante + notifications systeme de cette zone
    return (
      msg.zone === currentZone ||
      msg.zone === '' ||
      msg.messageType !== MessageType.REGULAR_MESSAGE
    )
  })

  const dispatch = useAppDispatch()
  const game = phaserGame.scene.keys.game as Game

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      // move focus back to the game
      inputRef.current?.blur()
      dispatch(setShowChat(false))
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    // this is added because without this, 2 things happen at the same
    // time when Enter is pressed, (1) the inputRef gets focus (from
    // useEffect) and (2) the form gets submitted (right after the input
    // gets focused)
    if (!readyToSubmit) {
      setReadyToSubmit(true)
      return
    }
    // move focus back to the game
    inputRef.current?.blur()

    const val = inputValue.trim()
    setInputValue('')
    if (val) {
      if (chatTab === 'general') {
        // Envoyer en broadcast global
        game.network.addChatMessage(val)
      } else {
        // Envoyer scope a la zone
        game.network.addZoneChatMessage(val)
      }
      game.myPlayer.updateDialogBubble(val)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (focused) {
      inputRef.current?.focus()
    }
  }, [focused])

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages, showChat])

  return (
    <Backdrop>
      <Wrapper>
        {showChat ? (
          <>
            <ChatHeader>
              <h3>Chat</h3>
              <IconButton
                aria-label="close dialog"
                className="close"
                onClick={() => dispatch(setShowChat(false))}
                size="small"
              >
                <CloseIcon />
              </IconButton>
            </ChatHeader>
            <TabBar>
              <TabButton
                $active={chatTab === 'zone'}
                onClick={() => dispatch(setChatTab('zone'))}
              >
                {ZONE_NAMES[currentZone] || 'Zone'}
                {unreadZoneCount > 0 && (
                  <UnreadBadge>{unreadZoneCount > 99 ? '99+' : unreadZoneCount}</UnreadBadge>
                )}
              </TabButton>
              <TabButton
                $active={chatTab === 'general'}
                onClick={() => dispatch(setChatTab('general'))}
              >
                General
                {unreadGeneralCount > 0 && (
                  <UnreadBadge>{unreadGeneralCount > 99 ? '99+' : unreadGeneralCount}</UnreadBadge>
                )}
              </TabButton>
            </TabBar>
            <ChatBox>
              {chatMessages.map(({ messageType, chatMessage }, index) => (
                <Message chatMessage={chatMessage} messageType={messageType} key={index} />
              ))}
              <div ref={messagesEndRef} />
              {showEmojiPicker && (
                <EmojiPickerWrapper>
                  <Picker
                    theme="dark"
                    showSkinTones={false}
                    showPreview={false}
                    onSelect={(emoji) => {
                      setInputValue(inputValue + emoji.native)
                      setShowEmojiPicker(!showEmojiPicker)
                      dispatch(setFocused(true))
                    }}
                    exclude={['recent', 'flags']}
                  />
                </EmojiPickerWrapper>
              )}
            </ChatBox>
            <InputWrapper onSubmit={handleSubmit}>
              <InputTextField
                inputRef={inputRef}
                autoFocus={focused}
                fullWidth
                placeholder={
                  chatTab === 'general'
                    ? 'Message a tous...'
                    : 'Appuyez sur Entree pour clavarder'
                }
                value={inputValue}
                onKeyDown={handleKeyDown}
                onChange={handleChange}
                onFocus={() => {
                  if (!focused) {
                    dispatch(setFocused(true))
                    setReadyToSubmit(true)
                  }
                }}
                onBlur={() => {
                  dispatch(setFocused(false))
                  setReadyToSubmit(false)
                }}
              />
              <IconButton aria-label="emoji" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                <InsertEmoticonIcon />
              </IconButton>
            </InputWrapper>
          </>
        ) : (
          <FabWrapper>
            <Fab
              color="secondary"
              aria-label="showChat"
              onClick={() => {
                dispatch(setShowChat(true))
                dispatch(setFocused(true))
              }}
            >
              <ChatBubbleOutlineIcon />
            </Fab>
          </FabWrapper>
        )}
      </Wrapper>
    </Backdrop>
  )
}
