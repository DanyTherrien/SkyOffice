import React, { useState } from 'react'
import styled from 'styled-components'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'

const Backdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
`

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  padding: 16px;
  position: relative;
  display: flex;
  flex-direction: column;
`

export default function VideoConnectionDialog() {
  const [connectionWarning, setConnectionWarning] = useState(true)
  return (
    <Backdrop>
      <Wrapper>
        {connectionWarning && (
          <Alert
            severity="warning"
            onClose={() => {
              setConnectionWarning(!connectionWarning)
            }}
          >
            <AlertTitle>Attention</AlertTitle>
            La webcam et le micro seront activés automatiquement en entrant dans une salle de réunion.
          </Alert>
        )}
      </Wrapper>
    </Backdrop>
  )
}
