import './Controls.css'

interface ControlsProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  onRefresh: () => void
  loading: boolean
}

export const Controls = ({ searchTerm, onSearchChange, onRefresh, loading }: ControlsProps) => {
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
      <button onClick={onRefresh} disabled={loading} className="refresh-btn">
        {loading ? '⏳ Chargement...' : '🔄 Rafraîchir'}
      </button>
    </div>
  )
}
