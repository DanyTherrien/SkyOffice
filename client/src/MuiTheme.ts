import { createTheme } from '@mui/material/styles'

// ─── 4D — Micro-interactions sur boutons via override global MUI ────────────

const muiTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3B82F6',
    },
    secondary: {
      main: '#14B8A6',
    },
  },
  components: {
    MuiButtonBase: {
      styleOverrides: {
        root: {
          transition: 'transform 0.12s ease, box-shadow 0.12s ease',
          '&:hover': {
            transform: 'scale(1.02)',
          },
          '&:active': {
            transform: 'scale(0.97)',
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: '0 0 0 3px rgba(20, 184, 166, 0.4)',
            borderRadius: '8px',
          },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          transition: 'transform 0.12s ease, box-shadow 0.15s ease, background-color 0.15s',
          '&:hover': {
            transform: 'scale(1.05)',
          },
          '&:active': {
            transform: 'scale(0.95)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          transition: 'transform 0.12s ease, box-shadow 0.15s ease, background-color 0.15s',
          '&:hover': {
            transform: 'scale(1.02)',
          },
          '&:active': {
            transform: 'scale(0.97)',
          },
          '&:focus-visible': {
            boxShadow: '0 0 0 3px rgba(20, 184, 166, 0.4)',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'transform 0.12s ease, background-color 0.15s',
          '&:hover': {
            transform: 'scale(1.08)',
          },
          '&:active': {
            transform: 'scale(0.92)',
          },
          '&:focus-visible': {
            boxShadow: '0 0 0 3px rgba(20, 184, 166, 0.4)',
          },
        },
      },
    },
  },
})

export default muiTheme
