import type { Participant } from '../types'

// Extraire la date de naissance des answers
export const getBirthDate = (participant: Participant): string | null => {
  const answers = participant.answers || []
  const birthAnswer = answers.find(a => 
    a.label?.toLowerCase().includes('naissance') || 
    a.label?.toLowerCase().includes('date_de_naissance')
  )
  return birthAnswer?.value || null
}

// Extraire le code postal des answers (participant ou buyer)
export const getPostalCode = (participant: Participant): string | null => {
  // D'abord chercher dans les answers du participant
  const answers = participant.answers || []
  let postalAnswer = answers.find(a => 
    a.label?.toLowerCase().includes('postal') || 
    a.label?.toLowerCase().includes('code_postal')
  )
  
  // Si pas trouvé, chercher dans buyer.answers
  if (!postalAnswer && participant.buyer?.answers) {
    postalAnswer = participant.buyer.answers.find(a => 
      a.label?.toLowerCase().includes('postal') || 
      a.label?.toLowerCase().includes('code_postal')
    )
  }
  
  return postalAnswer?.value || null
}

// Calculer l'âge à partir de la date de naissance
export const calculateAge = (birthDateStr: string | null): number | null => {
  if (!birthDateStr) return null
  
  // Format: DD/MM/YYYY
  const parts = birthDateStr.split('/')
  if (parts.length !== 3) return null
  
  const day = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  const year = parseInt(parts[2], 10)
  
  const birthDate = new Date(year, month, day)
  const today = new Date()
  
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age >= 0 ? age : null
}

// Formater la date
export const formatDate = (dateStr: string): string => {
  if (!dateStr || dateStr === '0000-00-00 00:00:00') return '-'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
