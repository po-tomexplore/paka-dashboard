import { useState } from 'react'
import { StatsDetails } from './StatsDetails'
import { FranceMap } from '../Map'
import { ParticipantGraph } from '../Graph'
import type { Participant } from '../../types'
import './StatsSection.css'

interface StatsSectionProps {
  statsByDepartment: [string, number][]
  statsByAge: Record<string, number>
  participantsWithBirthDate: number
  participants: Participant[]
}

type TabType = 'stats' | 'map' | 'graph'

export const StatsSection = ({
  statsByDepartment,
  statsByAge,
  participantsWithBirthDate,
  participants
}: StatsSectionProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('stats')

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
          <ParticipantGraph participants={participants} />
        )}
      </div>
    </div>
  )
}
