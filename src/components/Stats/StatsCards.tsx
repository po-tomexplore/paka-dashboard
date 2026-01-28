import './StatsCards.css'

interface StatsCardsProps {
  total: number
  scanned: number
  withPostalCode: number
  filtered: number
}

export const StatsCards = ({ total, scanned, withPostalCode, filtered }: StatsCardsProps) => {
  return (
    <div className="stats">
      <div className="stat-card">
        <span className="stat-number">{total}</span>
        <span className="stat-label">Total participants</span>
      </div>
      <div className="stat-card">
        <span className="stat-number">{scanned}</span>
        <span className="stat-label">Scannés</span>
      </div>
      <div className="stat-card">
        <span className="stat-number">{withPostalCode}</span>
        <span className="stat-label">Avec code postal</span>
      </div>
      <div className="stat-card">
        <span className="stat-number">{filtered}</span>
        <span className="stat-label">Résultats filtrés</span>
      </div>
    </div>
  )
}
