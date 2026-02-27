import { AGE_RANGES } from '../../constants'
import './Filters.css'

interface FiltersProps {
  selectedAgeRange: string
  onAgeRangeChange: (value: string) => void
  selectedPostalCode: string
  onPostalCodeChange: (value: string) => void
  uniquePostalCodes: string[]
  statsByAge: Record<string, number>
  selectedTarif: string
  onTarifChange: (value: string) => void
  uniqueTarifs: string[]
  statsByTarif: Record<string, number>
  tarifNames: Record<string, string>
}

export const Filters = ({
  selectedAgeRange,
  onAgeRangeChange,
  selectedPostalCode,
  onPostalCodeChange,
  uniquePostalCodes,
  statsByAge,
  selectedTarif,
  onTarifChange,
  uniqueTarifs,
  statsByTarif,
  tarifNames,
}: FiltersProps) => {
  return (
    <div className="filters">
      <div className="filter-group">
        <label>🎂 Tranche d'âge:</label>
        <select
          value={selectedAgeRange}
          onChange={(e) => onAgeRangeChange(e.target.value)}
        >
          {AGE_RANGES.map(range => (
            <option key={range.label} value={range.label}>
              {range.label} {range.label !== 'Tous' && `(${statsByAge[range.label] || 0})`}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>📍 Code postal:</label>
        <select
          value={selectedPostalCode}
          onChange={(e) => onPostalCodeChange(e.target.value)}
        >
          {uniquePostalCodes.map(code => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>🎫 Tarif:</label>
        <select
          value={selectedTarif}
          onChange={(e) => onTarifChange(e.target.value)}
        >
          {uniqueTarifs.map(tarif => (
            <option key={tarif} value={tarif}>
              {tarif === 'Tous' ? 'Tous' : `${tarifNames[tarif] || `#${tarif}`} (${statsByTarif[tarif] || 0})`}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
