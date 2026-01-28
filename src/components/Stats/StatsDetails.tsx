import { AGE_RANGES } from '../../constants'
import './StatsDetails.css'

interface StatsDetailsProps {
  statsByDepartment: [string, number][]
  statsByAge: Record<string, number>
  participantsWithBirthDate: number
}

export const StatsDetails = ({ 
  statsByDepartment, 
  statsByAge, 
  participantsWithBirthDate 
}: StatsDetailsProps) => {
  const maxAgeCount = Math.max(...Object.values(statsByAge))

  return (
    <div className="stats-details">
      <div className="stats-section">
        <h3>📍 Top 10 Départements</h3>
        <div className="stats-bars">
          {statsByDepartment.map(([dept, count]) => (
            <div key={dept} className="stat-bar-item">
              <span className="stat-bar-label">{dept}</span>
              <div className="stat-bar-container">
                <div 
                  className="stat-bar-fill"
                  style={{ 
                    width: `${(count / (statsByDepartment[0]?.[1] || 1)) * 100}%` 
                  }}
                />
              </div>
              <span className="stat-bar-count">{count}</span>
            </div>
          ))}
          {statsByDepartment.length === 0 && (
            <p className="no-stats">Aucune donnée de code postal</p>
          )}
        </div>
      </div>
      
      <div className="stats-section">
        <h3>🎂 Répartition par âge</h3>
        <div className="stats-bars">
          {AGE_RANGES.slice(1).map(range => {
            const count = statsByAge[range.label] || 0
            return (
              <div key={range.label} className="stat-bar-item">
                <span className="stat-bar-label">{range.label}</span>
                <div className="stat-bar-container">
                  <div 
                    className="stat-bar-fill age"
                    style={{ 
                      width: `${maxAgeCount > 0 ? (count / maxAgeCount) * 100 : 0}%` 
                    }}
                  />
                </div>
                <span className="stat-bar-count">{count}</span>
              </div>
            )
          })}
        </div>
        <p className="stats-note">
          {participantsWithBirthDate} participants avec date de naissance renseignée
        </p>
      </div>
    </div>
  )
}
