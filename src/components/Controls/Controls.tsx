import { useState } from 'react'
import { triggerManualSnapshot } from '../../services/firebase'
import './Controls.css'

interface ControlsProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  onRefresh: () => void
  loading: boolean
  lastSyncedAt?: string | null
}

export const Controls = ({ searchTerm, onSearchChange, onRefresh, loading, lastSyncedAt }: ControlsProps) => {
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [snapshotMessage, setSnapshotMessage] = useState<string | null>(null)

  const formatSyncDate = (isoDate: string) => {
    const date = new Date(isoDate)
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleSnapshot = async () => {
    setSnapshotLoading(true)
    setSnapshotMessage(null)
    
    try {
      const result = await triggerManualSnapshot()
      setSnapshotMessage(`✅ Snapshot réussi: ${result.count} participants`)
      // Rafraîchir les données après le snapshot
      setTimeout(() => {
        onRefresh()
        setSnapshotMessage(null)
      }, 2000)
    } catch (error) {
      setSnapshotMessage(`❌ ${error instanceof Error ? error.message : 'Erreur'}`)
      setTimeout(() => setSnapshotMessage(null), 5000)
    } finally {
      setSnapshotLoading(false)
    }
  }

  return (
    <div className="controls">
      <div className="search-box">
        <input
          type="text"
          placeholder="🔍 Rechercher par nom, email, code-barre ou code postal..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="controls-right">
        {lastSyncedAt && (
          <span className="sync-info">
            📅 Sync: {formatSyncDate(lastSyncedAt)}
          </span>
        )}
        {snapshotMessage && (
          <span className="snapshot-message">{snapshotMessage}</span>
        )}
        <button 
          onClick={handleSnapshot} 
          disabled={snapshotLoading || loading} 
          className="snapshot-btn"
          title="Déclencher un nouveau snapshot depuis l'API Weezevent"
        >
          {snapshotLoading ? '⏳ Sync...' : '📸 Snapshot'}
        </button>
        <button onClick={onRefresh} disabled={loading} className="refresh-btn">
          {loading ? '⏳ Chargement...' : '🔄 Rafraîchir'}
        </button>
      </div>
    </div>
  )
}
