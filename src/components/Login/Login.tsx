import { useState, type FormEvent } from 'react'
import './Login.css'

interface LoginProps {
  onLogin: (username: string, password: string) => boolean
  error: string | null
}

export const Login = ({ onLogin, error }: LoginProps) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [shake, setShake] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const success = onLogin(username, password)
    if (!success) {
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div className="login-container">
      <div className={`login-card ${shake ? 'shake' : ''}`}>
        <div className="login-header">
          <h1>🎪</h1>
          <h2>Paka Festival</h2>
          <p>Dashboard Participants</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="username">Utilisateur</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Entrez votre identifiant"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Entrez votre mot de passe"
              autoComplete="current-password"
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-btn">
            Se connecter
          </button>
        </form>
      </div>
    </div>
  )
}
