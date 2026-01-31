import { useState, useEffect } from 'react'

export interface Commune {
  nom: string
  codePostal: string
  lat: number
  lon: number
}

interface GeoApiCommune {
  nom: string
  codesPostaux: string[]
  centre?: {
    type: string
    coordinates: [number, number] // [lon, lat]
  }
}

export const useCommunes = (postalCodes: string[]) => {
  const [communes, setCommunes] = useState<Commune[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (postalCodes.length === 0) {
      setCommunes([])
      return
    }

    const fetchCommunes = async () => {
      setLoading(true)
      const results: Commune[] = []
      const uniqueCodes = [...new Set(postalCodes)]
      
      // Batch requests to avoid overwhelming the API
      const batchSize = 10
      for (let i = 0; i < uniqueCodes.length; i += batchSize) {
        const batch = uniqueCodes.slice(i, i + batchSize)
        
        const promises = batch.map(async (code) => {
          try {
            const response = await fetch(
              `https://geo.api.gouv.fr/communes?codePostal=${code}&fields=nom,codesPostaux,centre`
            )
            if (!response.ok) return null
            
            const data: GeoApiCommune[] = await response.json()
            if (data.length > 0 && data[0].centre) {
              const commune = data[0]
              return {
                nom: commune.nom,
                codePostal: code,
                lon: commune.centre!.coordinates[0],
                lat: commune.centre!.coordinates[1]
              }
            }
            return null
          } catch {
            return null
          }
        })

        const batchResults = await Promise.all(promises)
        results.push(...batchResults.filter((r): r is Commune => r !== null))
        
        // Small delay between batches to be nice to the API
        if (i + batchSize < uniqueCodes.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      setCommunes(results)
      setLoading(false)
    }

    fetchCommunes()
  }, [postalCodes.join(',')])

  return { communes, loading }
}
