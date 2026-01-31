import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import type { Participant } from '../../types'
import { getBirthDate, getPostalCode, calculateAge } from '../../utils/helpers'
import { AGE_RANGES } from '../../constants'
import './ParticipantGraph.css'

interface ParticipantGraphProps {
  participants: Participant[]
}

type ChartType = 'evolution' | 'age' | 'department'

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7']

export const ParticipantGraph = ({ participants }: ParticipantGraphProps) => {
  const [chartType, setChartType] = useState<ChartType>('evolution')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  })
  const [selectedAgeRange, setSelectedAgeRange] = useState<string>('all')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')

  // Filtrer les participants selon les critères
  const filteredParticipants = useMemo(() => {
    return participants.filter(p => {
      // Filtre par date
      if (dateRange.start || dateRange.end) {
        const createDate = new Date(p.create_date)
        if (dateRange.start && createDate < new Date(dateRange.start)) return false
        if (dateRange.end && createDate > new Date(dateRange.end)) return false
      }

      // Filtre par âge
      if (selectedAgeRange !== 'all') {
        const birthDate = getBirthDate(p)
        if (!birthDate) return false
        const age = calculateAge(birthDate)
        const range = AGE_RANGES.find(r => r.label === selectedAgeRange)
        if (range && (age < range.min || age > range.max)) return false
      }

      // Filtre par département
      if (selectedDepartment !== 'all') {
        const postalCode = getPostalCode(p)
        if (!postalCode || !postalCode.startsWith(selectedDepartment)) return false
      }

      return true
    })
  }, [participants, dateRange, selectedAgeRange, selectedDepartment])

  // Données pour le graphique d'évolution jour par jour
  const evolutionData = useMemo(() => {
    const byDate: Record<string, number> = {}
    
    filteredParticipants.forEach(p => {
      const date = new Date(p.create_date).toISOString().split('T')[0]
      byDate[date] = (byDate[date] || 0) + 1
    })

    const sortedDates = Object.keys(byDate).sort()
    let cumulative = 0
    
    return sortedDates.map(date => {
      cumulative += byDate[date]
      return {
        date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        fullDate: date,
        nouveaux: byDate[date],
        cumul: cumulative
      }
    })
  }, [filteredParticipants])

  // Données pour le graphique par âge
  const ageData = useMemo(() => {
    const byAge: Record<string, number> = {}
    AGE_RANGES.forEach(range => {
      byAge[range.label] = 0
    })

    filteredParticipants.forEach(p => {
      const birthDate = getBirthDate(p)
      if (birthDate) {
        const age = calculateAge(birthDate)
        const range = AGE_RANGES.find(r => age >= r.min && age <= r.max)
        if (range) {
          byAge[range.label]++
        }
      }
    })

    return AGE_RANGES.map(range => ({
      name: range.label,
      value: byAge[range.label]
    }))
  }, [filteredParticipants])

  // Données pour le graphique par département
  const departmentData = useMemo(() => {
    const byDept: Record<string, number> = {}
    
    filteredParticipants.forEach(p => {
      const postalCode = getPostalCode(p)
      if (postalCode) {
        const dept = postalCode.substring(0, 2)
        byDept[dept] = (byDept[dept] || 0) + 1
      }
    })

    return Object.entries(byDept)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([dept, count]) => ({
        name: dept,
        value: count
      }))
  }, [filteredParticipants])

  // Liste des départements uniques pour le filtre
  const uniqueDepartments = useMemo(() => {
    const depts = new Set<string>()
    participants.forEach(p => {
      const postalCode = getPostalCode(p)
      if (postalCode) {
        depts.add(postalCode.substring(0, 2))
      }
    })
    return Array.from(depts).sort()
  }, [participants])

  // Dates min/max pour les filtres
  const dateMinMax = useMemo(() => {
    if (participants.length === 0) return { min: '', max: '' }
    const dates = participants.map(p => new Date(p.create_date).getTime())
    return {
      min: new Date(Math.min(...dates)).toISOString().split('T')[0],
      max: new Date(Math.max(...dates)).toISOString().split('T')[0]
    }
  }, [participants])

  return (
    <div className="participant-graph">
      <div className="graph-controls">
        <div className="chart-type-selector">
          <button
            className={chartType === 'evolution' ? 'active' : ''}
            onClick={() => setChartType('evolution')}
          >
            📈 Évolution
          </button>
          <button
            className={chartType === 'age' ? 'active' : ''}
            onClick={() => setChartType('age')}
          >
            👥 Par âge
          </button>
          <button
            className={chartType === 'department' ? 'active' : ''}
            onClick={() => setChartType('department')}
          >
            📍 Par département
          </button>
        </div>

        <div className="graph-filters">
          <div className="filter-group">
            <label>📅 Du</label>
            <input
              type="date"
              value={dateRange.start}
              min={dateMinMax.min}
              max={dateMinMax.max}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
          </div>
          <div className="filter-group">
            <label>Au</label>
            <input
              type="date"
              value={dateRange.end}
              min={dateMinMax.min}
              max={dateMinMax.max}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>
          <div className="filter-group">
            <label>👤 Âge</label>
            <select
              value={selectedAgeRange}
              onChange={(e) => setSelectedAgeRange(e.target.value)}
            >
              <option value="all">Tous</option>
              {AGE_RANGES.map(range => (
                <option key={range.label} value={range.label}>{range.label}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>📍 Dept</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              <option value="all">Tous</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <button
            className="reset-filters"
            onClick={() => {
              setDateRange({ start: '', end: '' })
              setSelectedAgeRange('all')
              setSelectedDepartment('all')
            }}
          >
            🔄 Reset
          </button>
        </div>
      </div>

      <div className="graph-stats-bar">
        <span>📊 {filteredParticipants.length} participants affichés</span>
        {filteredParticipants.length !== participants.length && (
          <span className="filtered-info">
            (sur {participants.length} total)
          </span>
        )}
      </div>

      <div className="graph-container">
        {chartType === 'evolution' && (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="date" 
                stroke="#888"
                tick={{ fill: '#888', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis stroke="#888" tick={{ fill: '#888' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(30, 30, 50, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="cumul"
                name="Total cumulé"
                stroke="#667eea"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="nouveaux"
                name="Nouveaux/jour"
                stroke="#f5576c"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {chartType === 'age' && (
          <div className="dual-chart">
            <ResponsiveContainer width="50%" height={400}>
              <BarChart data={ageData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" stroke="#888" tick={{ fill: '#888' }} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="#888" 
                  tick={{ fill: '#888' }}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(30, 30, 50, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="value" name="Participants" radius={[0, 4, 4, 0]}>
                  {ageData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="50%" height={400}>
              <PieChart>
                <Pie
                  data={ageData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={{ stroke: '#888' }}
                >
                  {ageData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(30, 30, 50, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartType === 'department' && (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={departmentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="name" 
                stroke="#888" 
                tick={{ fill: '#888' }}
              />
              <YAxis stroke="#888" tick={{ fill: '#888' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(30, 30, 50, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                formatter={(value: number) => [`${value} participants`, 'Total']}
              />
              <Bar dataKey="value" name="Participants" radius={[4, 4, 0, 0]}>
                {departmentData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
