import { EVENT_ID } from '../../constants'
import './Header.css'

interface HeaderProps {
  onLogout?: () => void
}

export const Header = ({ onLogout }: HeaderProps) => {
  return (
    <header className="header">
      <div className="header-content">
        <h1>🎪 Paka Festival - Dashboard Participants</h1>
        <p className="event-id">Event ID: {EVENT_ID}</p>
      </div>
      {onLogout && (
        <button className="logout-btn" onClick={onLogout}>
          🚪 Déconnexion
        </button>
      )}
    </header>
  )
}
