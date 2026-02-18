import { keyframes } from 'styled-components'

// ─── 4A — Systeme d'animations global ──────────────────────────────────────

export const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

export const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`

export const slideUp = keyframes`
  from { transform: translateY(16px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`

export const slideDown = keyframes`
  from { transform: translateY(-16px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`

export const scaleIn = keyframes`
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
`

export const bounceIn = keyframes`
  0% { transform: scale(0.8); opacity: 0; }
  60% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
`

export const slideInRight = keyframes`
  from { transform: translateX(120%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`

export const slideOutRight = keyframes`
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(120%); opacity: 0; }
`

export const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 4px rgba(20, 184, 166, 0.3); }
  50% { box-shadow: 0 0 12px rgba(20, 184, 166, 0.6); }
`
