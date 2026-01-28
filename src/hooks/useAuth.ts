import { useState } from 'react'

const VALID_USER = 'paka'
const VALID_PASSWORD = 'paka'

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('paka-auth') === 'true'
  })
  const [error, setError] = useState<string | null>(null)

  const login = (username: string, password: string): boolean => {
    if (username === VALID_USER && password === VALID_PASSWORD) {
      sessionStorage.setItem('paka-auth', 'true')
      setIsAuthenticated(true)
      setError(null)
      return true
    } else {
      setError('Identifiants incorrects')
      return false
    }
  }

  const logout = () => {
    sessionStorage.removeItem('paka-auth')
    setIsAuthenticated(false)
  }

  return {
    isAuthenticated,
    login,
    logout,
    error,
  }
}
