import { useState } from 'react'
import { StatsDetails } from './StatsDetails'
import { FranceMap } from '../Map'
import { ParticipantGraph } from '../Graph'
import type { Participant } from '../../types'
import { useMultiYearParticipants, type YearSelection } from '../../hooks/useMultiYearParticipants'
import { EVENTS } from '../../constants'
import './StatsSection.css'

interface StatsSectionProps {
  statsByDepartment: [string, number][]
  statsByAge: Record<string, number>
  participantsWithBirthDate: number
  participants: Participant[]
}

type TabType = 'stats' | 'map' | 'graph'

const YEAR_OPTIONS: { value: YearSelection; label: string }[] = [
  ...EVENTS.map(e => ({ value: e.year as YearSelection, label: String(e.year) })),
  { value: 'both', label: 'Comparaison' },
]

export const StatsSection = ({
  statsByDepartment,
  statsByAge,
  participantsWithBirthDate,
  participants
}: StatsSectionProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('stats')
  const { selectedYear, selectYear, dataByYear } = useMultiYearParticipants()

  const isLoading = selectedYear === 'both'
    ? EVENTS.some(e => dataByYear[e.year]?.loading)
    : dataByYear[selectedYear as number]?.loading

  const yearError = selectedYear === 'both'
    ? EVENTS.map(e => dataByYear[e.year]?.error).find(Boolean) || null
    : dataByYear[selectedYear as number]?.error || null

  return (
    <div className="stats-section-container">
      <div className="stats-tabs">
        <button
          className={`stats-tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Statistiques
        </button>
        <button
          className={`stats-tab ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          🗺️ Carte
        </button>
        <button
          className={`stats-tab ${activeTab === 'graph' ? 'active' : ''}`}
          onClick={() => setActiveTab('graph')}
        >
          📈 Graphiques
        </button>
      </div>

      <div className="stats-content">
        {activeTab === 'stats' && (
          <StatsDetails
            statsByDepartment={statsByDepartment}
            statsByAge={statsByAge}
            participantsWithBirthDate={participantsWithBirthDate}
          />
        )}
        {activeTab === 'map' && (
          <FranceMap participants={participants} />
        )}
        {activeTab === 'graph' && (
          <>
            <div className="year-selector">
              {YEAR_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`year-btn ${selectedYear === opt.value ? 'active' : ''}`}
                  onClick={() => selectYear(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {isLoading && (
              <div className="year-loading">
                Chargement des données...
              </div>
            )}
            {yearError && (
              <div className="year-error">
                {yearError}
              </div>
            )}
            <ParticipantGraph
              participants={participants}
              selectedYear={selectedYear}
              dataByYear={dataByYear}
            />
          </>
        )}
      </div>
    </div>
  )
}
