import { useState, useEffect, useMemo } from 'react'
import type { Participant } from '../types'
import { AGE_RANGES } from '../constants'
import { authenticate, fetchParticipants } from '../services/api'
import { getBirthDate, getPostalCode, calculateAge } from '../utils/helpers'

export const useParticipants = () => {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Charger les données
  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const token = await authenticate()
      setAccessToken(token)
      
      if (token) {
        const data = await fetchParticipants(token)
        setParticipants(data.participants || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  // Rafraîchir les données
  const refresh = async () => {
    setLoading(true)
    setError(null)
    
    try {
      let token = accessToken
      if (!token) {
        token = await authenticate()
        setAccessToken(token)
      }
      
      if (token) {
        const data = await fetchParticipants(token)
        setParticipants(data.participants || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  // Charger au démarrage
  useEffect(() => {
    loadData()
  }, [])

  // Liste unique des codes postaux
  const uniquePostalCodes = useMemo(() => {
    const codes = new Set<string>()
    participants.forEach(p => {
      const code = getPostalCode(p)
      if (code) codes.add(code)
    })
    return ['Tous', ...Array.from(codes).sort()]
  }, [participants])

  // Stats par département
  const statsByDepartment = useMemo(() => {
    const stats: Record<string, number> = {}
    participants.forEach(p => {
      const code = getPostalCode(p)
      if (code && code.length >= 2) {
        const dept = code.substring(0, 2)
        stats[dept] = (stats[dept] || 0) + 1
      }
    })
    return Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
  }, [participants])

  // Stats par tranche d'âge
  const statsByAge = useMemo(() => {
    const stats: Record<string, number> = {}
    AGE_RANGES.slice(1).forEach(range => {
      stats[range.label] = 0
    })
    
    participants.forEach(p => {
      const birthDate = getBirthDate(p)
      const age = calculateAge(birthDate)
      if (age !== null) {
        for (const range of AGE_RANGES.slice(1)) {
          if (age >= range.min && age <= range.max) {
            stats[range.label]++
            break
          }
        }
      }
    })
    return stats
  }, [participants])

  // Compteurs
  const counts = useMemo(() => ({
    total: participants.length,
    scanned: participants.filter(p => p.control_status?.status === '1').length,
    withPostalCode: participants.filter(p => getPostalCode(p)).length,
    withBirthDate: participants.filter(p => getBirthDate(p)).length,
  }), [participants])

  return {
    participants,
    loading,
    error,
    refresh,
    uniquePostalCodes,
    statsByDepartment,
    statsByAge,
    counts,
  }
}
