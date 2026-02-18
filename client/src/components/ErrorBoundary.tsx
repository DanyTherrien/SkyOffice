import React, { Component, ErrorInfo, ReactNode } from 'react'
import styled from 'styled-components'
import Button from '@mui/material/Button'
import RefreshIcon from '@mui/icons-material/Refresh'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'

// ─── 5C — Error boundary React ────────────────────────────────────────────

const Container = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #1a1e30;
  color: #eee;
  z-index: 9999;
  padding: 32px;
  text-align: center;
`

const ErrorIcon = styled(ErrorOutlineIcon)`
  font-size: 64px !important;
  color: #ef4444;
  margin-bottom: 16px;
`

const Title = styled.h2`
  font-size: 22px;
  margin: 0 0 8px 0;
  color: #fff;
`

const Message = styled.p`
  font-size: 14px;
  color: #999;
  max-width: 400px;
  margin: 0 0 24px 0;
  line-height: 1.5;
`

const ReloadButton = styled(Button)`
  color: #fff !important;
  border-color: #14b8a6 !important;
  &:hover {
    background: rgba(20, 184, 166, 0.1) !important;
  }
`

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReload = (): void => {
    window.location.reload()
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <Container>
          <ErrorIcon />
          <Title>Quelque chose s'est mal passe</Title>
          <Message>
            Une erreur inattendue est survenue. Rechargez la page pour revenir au bureau virtuel.
          </Message>
          <ReloadButton
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={this.handleReload}
          >
            Recharger la page
          </ReloadButton>
        </Container>
      )
    }

    return this.props.children
  }
}
