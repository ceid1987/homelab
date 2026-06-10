import { useState } from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import './WelcomeModal.css'

const STORAGE_KEY = 'homelab-web:welcomed'

const DESKTOP_MSG = 'Click and drag to move around. Click on a node or line to view its info.'
const MOBILE_MSG =
  'Tap and drag to move around. Tap on a node or line to view its info. For a better viewing experience, I recommend rotating your phone to landscape mode.'

/** First-visit welcome overlay. Shows once per browser (localStorage flag). */
export default function WelcomeModal() {
  const isMobile = useMediaQuery('(max-width: 640px), (max-height: 600px) and (orientation: landscape)')
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) == null
    } catch {
      return true
    }
  })

  if (!open) return null

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* storage unavailable (private mode) — just close for this session */
    }
    setOpen(false)
  }

  return (
    <div className="welcome-overlay" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="welcome-card">
        <h2 id="welcome-title" className="welcome-card__title">
          Welcome to the Homelab Web Demo
        </h2>
        <p className="welcome-card__msg">{isMobile ? MOBILE_MSG : DESKTOP_MSG}</p>
        <button type="button" className="welcome-card__btn" onClick={dismiss}>
          Got it
        </button>
      </div>
    </div>
  )
}
