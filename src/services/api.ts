import { API_KEY, USERNAME, PASSWORD, EVENT_ID } from '../constants'
import type { ParticipantResponse } from '../types'

export const authenticate = async (): Promise<string | null> => {
  try {
    const formData = new URLSearchParams()
    formData.append('username', USERNAME)
    formData.append('password', PASSWORD)
    formData.append('api_key', API_KEY)

    const response = await fetch('https://api.weezevent.com/auth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    if (!response.ok) {
      throw new Error(`Erreur d'authentification: ${response.status}`)
    }

    const data = await response.json()
    console.log('🔐 Auth Response:', data)
    return data.accessToken
  } catch (err) {
    console.error('❌ Auth Error:', err)
    throw err
  }
}

export const fetchParticipants = async (token: string): Promise<ParticipantResponse> => {
  const url = `https://api.weezevent.com/participant/list?api_key=${API_KEY}&access_token=${token}&id_event[]=${EVENT_ID}&full=1`
  
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Erreur lors de la récupération: ${response.status}`)
  }

  const data: ParticipantResponse = await response.json()
  console.log('📋 Participants Response:', data)
  console.log('📊 Nombre total:', data.participants?.length)
  
  return data
}

export const fetchTickets = async (token: string) => {
  const url = `https://api.weezevent.com/tickets?api_key=${API_KEY}&access_token=${token}&id_event[]=${EVENT_ID}`
  const response = await fetch(url)
  const data = await response.json()
  console.log('🎫 Tickets/Catégories:', data)
  return data
}
