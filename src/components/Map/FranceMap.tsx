import { useEffect, useRef, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'
import { useCommunes } from '../../hooks/useCommunes'
import type { Commune } from '../../hooks/useCommunes'
import type { Participant } from '../../types'
import { getPostalCode } from '../../utils/helpers'
import './FranceMap.css'

interface FranceMapProps {
  participants: Participant[]
}

// France bounds
const FRANCE_BOUNDS: L.LatLngBoundsExpression = [
  [41.3, -5.2], // Sud-Ouest
  [51.1, 9.6]   // Nord-Est
]

const FRANCE_CENTER: L.LatLngExpression = [46.6, 2.3]

export const FranceMap = ({ participants }: FranceMapProps) => {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any>(null)

  // Extraire les codes postaux uniques des participants
  const postalCodes = useMemo(() => {
    const codes = new Set<string>()
    participants.forEach(p => {
      const code = getPostalCode(p)
      if (code && code.length === 5) {
        codes.add(code)
      }
    })
    return Array.from(codes)
  }, [participants])

  // Compter les participants par code postal
  const countsByPostalCode = useMemo(() => {
    const counts: Record<string, number> = {}
    participants.forEach(p => {
      const code = getPostalCode(p)
      if (code && code.length === 5) {
        counts[code] = (counts[code] || 0) + 1
      }
    })
    return counts
  }, [participants])

  // Récupérer les coordonnées des communes
  const { communes, loading } = useCommunes(postalCodes)

  // Initialiser la carte
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: FRANCE_CENTER,
      zoom: 6,
      minZoom: 5,
      maxZoom: 18,
      maxBounds: FRANCE_BOUNDS,
      maxBoundsViscosity: 1.0
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map)

    // Créer le groupe de clusters
    const markers = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      iconCreateFunction: (cluster) => {
        const childCount = cluster.getAllChildMarkers().reduce((sum, marker) => {
          const count = (marker as L.Marker & { options: { count?: number } }).options.count || 1
          return sum + count
        }, 0)
        
        let className = 'marker-cluster-small'
        if (childCount >= 100) {
          className = 'marker-cluster-large'
        } else if (childCount >= 10) {
          className = 'marker-cluster-medium'
        }
        
        return L.divIcon({
          html: `<div><span>${childCount}</span></div>`,
          className: `marker-cluster ${className}`,
          iconSize: L.point(40, 40)
        })
      }
    })

    map.addLayer(markers)
    markersRef.current = markers
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current = null
    }
  }, [])

  // Mettre à jour les markers quand les communes changent
  useEffect(() => {
    if (!markersRef.current || loading) return

    markersRef.current.clearLayers()

    communes.forEach((commune: Commune) => {
      const count = countsByPostalCode[commune.codePostal] || 0
      if (count > 0 && commune.lat && commune.lon) {
        const marker = L.marker([commune.lat, commune.lon], {
          count: count
        } as L.MarkerOptions & { count: number })

        marker.bindPopup(`
          <div class="map-popup">
            <strong>${commune.nom}</strong><br/>
            <span class="popup-code">${commune.codePostal}</span><br/>
            <span class="popup-count">${count} participant${count > 1 ? 's' : ''}</span>
          </div>
        `)

        markersRef.current?.addLayer(marker)
      }
    })
  }, [communes, countsByPostalCode, loading])

  const totalOnMap = Object.values(countsByPostalCode).reduce((a, b) => a + b, 0)
  const communesCount = communes.length

  return (
    <div className="france-map-container">
      {loading && (
        <div className="map-loading">
          <div className="loading-spinner" />
          <span>Chargement des communes...</span>
        </div>
      )}
      <div ref={mapContainerRef} className="france-map" />
      
      <div className="map-legend">
        <h4>🗺️ Légende</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-dot small" />
            <span>1-9 participants</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot medium" />
            <span>10-99 participants</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot large" />
            <span>100+ participants</span>
          </div>
        </div>
        <div className="legend-stats">
          <span>{totalOnMap} participants</span>
          <span>{communesCount} communes</span>
        </div>
      </div>
    </div>
  )
}
