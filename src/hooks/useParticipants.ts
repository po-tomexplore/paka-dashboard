import { useState, useEffect, useMemo } from 'react'
import type { Participant } from '../types'
import { AGE_RANGES } from '../constants'
import { fetchParticipantsFromFirestore, fetchTarifNames } from '../services/firebase'
import { EVENT_ID } from '../constants'
import { getBirthDate, getPostalCode, calculateAge } from '../utils/helpers'

export const useParticipants = () => {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [tarifNames, setTarifNames] = useState<Record<string, string>>({})

  // Charger les données depuis Firestore
  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await fetchParticipantsFromFirestore()
      setParticipants(data.participants || [])
      setLastSyncedAt(data.syncedAt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  // Rafraîchir les données depuis Firestore
  const refresh = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await fetchParticipantsFromFirestore()
      setParticipants(data.participants || [])
      setLastSyncedAt(data.syncedAt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  // Charger au démarrage
  useEffect(() => {
    loadData()
    console.log('🎫 useParticipants: fetching tarif names for EVENT_ID =', EVENT_ID)
    fetchTarifNames(EVENT_ID).then(names => {
      console.log('🎫 useParticipants: got tarif names =', names)
      setTarifNames(names)
    }).catch(err => {
      console.error('🎫 useParticipants: error fetching tarif names', err)
    })
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

  // Liste unique des tarifs (id_ticket) + stats
  const uniqueTarifs = useMemo(() => {
    const ids = new Set<string>()
    participants.forEach(p => {
      if (p.id_ticket) ids.add(p.id_ticket)
    })
    return ['Tous', ...Array.from(ids).sort()]
  }, [participants])

  const statsByTarif = useMemo(() => {
    const stats: Record<string, number> = {}
    participants.forEach(p => {
      if (p.id_ticket) {
        stats[p.id_ticket] = (stats[p.id_ticket] || 0) + 1
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
    uniqueTarifs,
    statsByDepartment,
    statsByAge,
    statsByTarif,
    tarifNames,
    counts,
    lastSyncedAt,
  }
}
