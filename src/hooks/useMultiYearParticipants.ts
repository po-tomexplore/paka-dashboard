import { useState, useCallback } from 'react'
import type { Participant } from '../types'
import { EVENTS, type EventYear } from '../constants'
import { fetchEventParticipants, triggerSyncEventIfMissing, fetchTarifNames } from '../services/firebase'

export type YearSelection = EventYear | 'both'

interface YearData {
  participants: Participant[]
  loading: boolean
  error: string | null
}

export const useMultiYearParticipants = () => {
  const [selectedYear, setSelectedYear] = useState<YearSelection>(2026)
  const [dataByYear, setDataByYear] = useState<Record<number, YearData>>({})
  const [tarifNamesByYear, setTarifNamesByYear] = useState<Record<number, Record<string, string>>>({})

  const loadYear = useCallback(async (year: EventYear) => {
    // Skip if already loaded or currently loading
    const existing = dataByYear[year]
    if (existing && (existing.loading || existing.participants.length > 0)) return

    const event = EVENTS.find(e => e.year === year)
    if (!event) return

    setDataByYear(prev => ({
      ...prev,
      [year]: { participants: [], loading: true, error: null }
    }))

    try {
      // Try reading from Firestore first
      let data = await fetchEventParticipants(event.id)

      if (!data) {
        // Not cached — trigger Cloud Function to fetch and cache
        await triggerSyncEventIfMissing(event.id)
        // Re-read from Firestore
        data = await fetchEventParticipants(event.id)
      }

      setDataByYear(prev => ({
        ...prev,
        [year]: {
          participants: data?.participants || [],
          loading: false,
          error: null
        }
      }))

      // Also fetch tarif names for this year
      fetchTarifNames(event.id).then(mapping => {
        setTarifNamesByYear(prev => ({ ...prev, [year]: mapping }))
      }).catch(() => {})
    } catch (err) {
      setDataByYear(prev => ({
        ...prev,
        [year]: {
          participants: [],
          loading: false,
          error: err instanceof Error ? err.message : 'Erreur inconnue'
        }
      }))
    }
  }, [dataByYear])

  const selectYear = useCallback((year: YearSelection) => {
    setSelectedYear(year)

    if (year === 'both') {
      // Load both years
      for (const event of EVENTS) {
        loadYear(event.year)
      }
    } else {
      loadYear(year)
    }
  }, [loadYear])

  return {
    selectedYear,
    selectYear,
    dataByYear,
    tarifNamesByYear,
  }
}
