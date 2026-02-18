import React, { useEffect, useState, useRef } from 'react'
import styled from 'styled-components'
import { useAppDispatch } from '../hooks'
import { setAuth } from '../stores/UserStore'

declare global {
  interface Window {
    google?: any
  }
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100vw;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  color: #e0e0e0;
  font-family: 'Roboto', sans-serif;
`

const Card = styled.div`
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 48px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-width: 400px;
  width: 90%;
`

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin: 0;
  color: #ffffff;
  text-align: center;
`

const Subtitle = styled.p`
  font-size: 14px;
  color: #aaaacc;
  margin: 0;
  text-align: center;
`

const ErrorMessage = styled.div`
  background: rgba(255, 82, 82, 0.15);
  border: 1px solid rgba(255, 82, 82, 0.4);
  border-radius: 8px;
  padding: 12px 16px;
  color: #ff5252;
  font-size: 14px;
  text-align: center;
  width: 100%;
`

const GoogleBtnContainer = styled.div`
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
`

const FallbackInfo = styled.p`
  font-size: 12px;
  color: #888;
  margin: 0;
  text-align: center;
`

export default function GoogleLoginPage() {
  const dispatch = useAppDispatch()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const btnRef = useRef<HTMLDivElement>(null)
  const initRef = useRef(false)

  const handleCredentialResponse = async (response: any) => {
    setError(null)
    setLoading(true)
    try {
      const serverUrl =
        (import.meta.env.VITE_SERVER_URL as string)
          ?.replace('wss://', 'https://')
          .replace('ws://', 'http://') || 'http://localhost:2567'
      const res = await fetch(`${serverUrl}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      dispatch(setAuth({ token: data.token, email: data.email, name: data.name }))
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initRef.current) return
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
    if (!clientId || !window.google) return

    initRef.current = true
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
    })
    if (btnRef.current) {
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: 'filled_blue',
        size: 'large',
        text: 'signin_with',
        locale: 'fr',
      })
    }
  }, [])

  // Retenter l'init si le script GSI met du temps a charger
  useEffect(() => {
    if (initRef.current) return
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
    if (!clientId) return

    const interval = setInterval(() => {
      if (window.google && !initRef.current) {
        initRef.current = true
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
        })
        if (btnRef.current) {
          window.google.accounts.id.renderButton(btnRef.current, {
            theme: 'filled_blue',
            size: 'large',
            text: 'signin_with',
            locale: 'fr',
          })
        }
        clearInterval(interval)
      }
    }, 200)
    return () => clearInterval(interval)
  }, [])

  return (
    <Wrapper>
      <Card>
        <Title>Capturia Office</Title>
        <Subtitle>Bureau virtuel de l'equipe Capturia</Subtitle>
        <Subtitle>Connectez-vous avec votre compte Google pour acceder au bureau.</Subtitle>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <GoogleBtnContainer ref={btnRef} id="google-signin-btn" />

        {loading && <FallbackInfo>Connexion en cours...</FallbackInfo>}
      </Card>
    </Wrapper>
  )
}
