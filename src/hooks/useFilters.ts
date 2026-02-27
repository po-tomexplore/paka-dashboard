import { useState, useMemo } from 'react'
import type { Participant } from '../types'
import { AGE_RANGES } from '../constants'
import { getBirthDate, getPostalCode, calculateAge } from '../utils/helpers'

export const useFilters = (participants: Participant[]) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAgeRange, setSelectedAgeRange] = useState('Tous')
  const [selectedPostalCode, setSelectedPostalCode] = useState('Tous')
  const [selectedTarif, setSelectedTarif] = useState('Tous')

  const filteredParticipants = useMemo(() => {
    return participants.filter(p => {
      // Filtre recherche texte
      const search = searchTerm.toLowerCase()
      const postalCode = getPostalCode(p) || ''
      const matchesSearch = !search || 
        p.owner?.first_name?.toLowerCase().includes(search) ||
        p.owner?.last_name?.toLowerCase().includes(search) ||
        p.owner?.email?.toLowerCase().includes(search) ||
        p.barcode?.toLowerCase().includes(search) ||
        postalCode.toLowerCase().includes(search)
      
      if (!matchesSearch) return false
      
      // Filtre tranche d'âge
      if (selectedAgeRange !== 'Tous') {
        const range = AGE_RANGES.find(r => r.label === selectedAgeRange)
        if (range) {
          const birthDate = getBirthDate(p)
          const age = calculateAge(birthDate)
          if (age === null || age < range.min || age > range.max) {
            return false
          }
        }
      }
      
      // Filtre code postal
      if (selectedPostalCode !== 'Tous') {
        const code = getPostalCode(p)
        if (code !== selectedPostalCode) {
          return false
        }
      }

      // Filtre tarif
      if (selectedTarif !== 'Tous') {
        if (p.id_ticket !== selectedTarif) {
          return false
        }
      }

      return true
    })
  }, [participants, searchTerm, selectedAgeRange, selectedPostalCode, selectedTarif])

  return {
    searchTerm,
    setSearchTerm,
    selectedAgeRange,
    setSelectedAgeRange,
    selectedPostalCode,
    setSelectedPostalCode,
    selectedTarif,
    setSelectedTarif,
    filteredParticipants,
  }
}
