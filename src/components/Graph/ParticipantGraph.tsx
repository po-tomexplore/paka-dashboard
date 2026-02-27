import { useState, useMemo, useEffect } from 'react'
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
  Cell,
  ReferenceLine,
  Brush
} from 'recharts'
import type { Participant } from '../../types'
import { getBirthDate, getPostalCode, calculateAge } from '../../utils/helpers'
import { AGE_RANGES, EVENTS } from '../../constants'
import { fetchGraphEvents, addGraphEvent, deleteGraphEvent, type GraphEvent } from '../../services/firebase'
import type { YearSelection } from '../../hooks/useMultiYearParticipants'
import './ParticipantGraph.css'

interface YearData {
  participants: Participant[]
  loading: boolean
  error: string | null
}

interface ParticipantGraphProps {
  participants: Participant[]
  selectedYear: YearSelection
  dataByYear: Record<number, YearData>
}

type ChartType = 'evolution' | 'age' | 'department'

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7']
const YEAR_COLORS: Record<number, string> = { 2025: '#f5576c', 2026: '#667eea' }

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(30, 30, 50, 0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#fff'
}

// Helper: get participants for a given year from dataByYear, fallback to props.participants for current event
function getParticipantsForYear(
  year: number,
  dataByYear: Record<number, YearData>,
  fallbackParticipants: Participant[]
): Participant[] {
  const currentEventYear = EVENTS[EVENTS.length - 1].year
  if (dataByYear[year]?.participants.length > 0) {
    return dataByYear[year].participants
  }
  // Fallback: use main participants prop for the current year
  if (year === currentEventYear) {
    return fallbackParticipants
  }
  return []
}

// Helper: filter participants with given criteria
function filterParticipants(
  participants: Participant[],
  dateRange: { start: string; end: string },
  selectedAgeRange: string,
  selectedDepartment: string,
  selectedTarif: string = 'all'
): Participant[] {
  return participants.filter(p => {
    if (dateRange.start || dateRange.end) {
      const createDate = new Date(p.create_date)
      if (dateRange.start && createDate < new Date(dateRange.start)) return false
      if (dateRange.end && createDate > new Date(dateRange.end)) return false
    }
    if (selectedAgeRange !== 'all') {
      const birthDate = getBirthDate(p)
      if (!birthDate) return false
      const age = calculateAge(birthDate)
      if (age === null) return false
      const range = AGE_RANGES.find(r => r.label === selectedAgeRange)
      if (range && (age < range.min || age > range.max)) return false
    }
    if (selectedDepartment !== 'all') {
      const postalCode = getPostalCode(p)
      if (!postalCode || !postalCode.startsWith(selectedDepartment)) return false
    }
    if (selectedTarif !== 'all') {
      if (p.id_ticket !== selectedTarif) return false
    }
    return true
  })
}

// Helper: build evolution data (cumulative + daily new) from participants
function buildEvolutionData(participants: Participant[]) {
  const byDate: Record<string, number> = {}
  participants.forEach(p => {
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
}

// Helper: build age data from participants
function buildAgeData(participants: Participant[]) {
  const ageRangesForGraph = AGE_RANGES.filter(r => r.label !== 'Tous')
  const byAge: Record<string, number> = {}
  ageRangesForGraph.forEach(range => { byAge[range.label] = 0 })

  participants.forEach(p => {
    const birthDate = getBirthDate(p)
    if (birthDate) {
      const age = calculateAge(birthDate)
      if (age === null) return
      const range = ageRangesForGraph.find(r => age >= r.min && age <= r.max)
      if (range) byAge[range.label]++
    }
  })

  return ageRangesForGraph.map(range => ({
    name: range.label,
    value: byAge[range.label]
  }))
}

// Helper: build department data from participants
function buildDepartmentData(participants: Participant[]) {
  const byDept: Record<string, number> = {}
  participants.forEach(p => {
    const postalCode = getPostalCode(p)
    if (postalCode) {
      const dept = postalCode.substring(0, 2)
      byDept[dept] = (byDept[dept] || 0) + 1
    }
  })
  return Object.entries(byDept)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([dept, count]) => ({ name: dept, value: count }))
}

export const ParticipantGraph = ({ participants, selectedYear, dataByYear }: ParticipantGraphProps) => {
  const [chartType, setChartType] = useState<ChartType>('evolution')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [selectedAgeRange, setSelectedAgeRange] = useState<string>('all')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [selectedTarif, setSelectedTarif] = useState<string>('all')

  // Graph events (Firestore)
  const [events, setEvents] = useState<GraphEvent[]>([])
  const [showEventForm, setShowEventForm] = useState(false)
  const [newEventDate, setNewEventDate] = useState('')
  const [newEventLabel, setNewEventLabel] = useState('')

  const isComparison = selectedYear === 'both'

  // Brush zoom state
  const [brushRange, setBrushRange] = useState<{ startIndex?: number; endIndex?: number }>({})
  const [activePeriod, setActivePeriod] = useState<string>('all')

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const firestoreEvents = await fetchGraphEvents()
        setEvents(firestoreEvents)
      } catch (error) {
        console.error('Erreur chargement événements:', error)
      }
    }
    loadEvents()
  }, [])

  const addEvent = async () => {
    if (!newEventDate || !newEventLabel.trim()) return
    try {
      const newEvent = await addGraphEvent({ date: newEventDate, label: newEventLabel.trim() })
      setEvents(prev => [...prev, newEvent])
      setNewEventDate('')
      setNewEventLabel('')
      setShowEventForm(false)
    } catch (error) {
      console.error('Erreur ajout événement:', error)
    }
  }

  const removeEvent = async (id: string) => {
    try {
      await deleteGraphEvent(id)
      setEvents(prev => prev.filter(e => e.id !== id))
    } catch (error) {
      console.error('Erreur suppression événement:', error)
    }
  }

  // Resolve which participants to use for single-year mode
  const activeParticipants = useMemo(() => {
    if (isComparison) return participants // fallback, not used directly in comparison
    return getParticipantsForYear(selectedYear as number, dataByYear, participants)
  }, [isComparison, selectedYear, dataByYear, participants])

  // Filtered participants (single-year mode)
  const filteredParticipants = useMemo(() => {
    return filterParticipants(activeParticipants, dateRange, selectedAgeRange, selectedDepartment, selectedTarif)
  }, [activeParticipants, dateRange, selectedAgeRange, selectedDepartment, selectedTarif])

  // Single-year data
  const evolutionData = useMemo(() => buildEvolutionData(filteredParticipants), [filteredParticipants])
  const ageData = useMemo(() => buildAgeData(filteredParticipants), [filteredParticipants])
  const departmentData = useMemo(() => buildDepartmentData(filteredParticipants), [filteredParticipants])

  // Comparison data
  const comparisonEvolutionData = useMemo(() => {
    if (!isComparison) return []

    const yearDataMap: Record<number, ReturnType<typeof buildEvolutionData>> = {}
    for (const event of EVENTS) {
      const yearParticipants = getParticipantsForYear(event.year, dataByYear, participants)
      const filtered = filterParticipants(yearParticipants, { start: '', end: '' }, selectedAgeRange, selectedDepartment, selectedTarif)
      yearDataMap[event.year] = buildEvolutionData(filtered)
    }

    // Normalize to J+N (days since first registration)
    const maxDays = Math.max(...Object.values(yearDataMap).map(d => d.length))
    const result: Record<string, string | number>[] = []
    for (let i = 0; i < maxDays; i++) {
      const row: Record<string, string | number> = { day: `J+${i}` }
      for (const event of EVENTS) {
        const d = yearDataMap[event.year]
        if (i < d.length) {
          row[`cumul_${event.year}`] = d[i].cumul
          row[`nouveaux_${event.year}`] = d[i].nouveaux
        }
      }
      result.push(row)
    }
    return result
  }, [isComparison, dataByYear, participants, selectedAgeRange, selectedDepartment, selectedTarif])

  const comparisonAgeData = useMemo(() => {
    if (!isComparison) return []
    const ageRangesForGraph = AGE_RANGES.filter(r => r.label !== 'Tous')
    return ageRangesForGraph.map(range => {
      const row: Record<string, string | number> = { name: range.label }
      for (const event of EVENTS) {
        const yearParticipants = getParticipantsForYear(event.year, dataByYear, participants)
        const ageDataForYear = buildAgeData(yearParticipants)
        const match = ageDataForYear.find(d => d.name === range.label)
        row[String(event.year)] = match?.value ?? 0
      }
      return row
    })
  }, [isComparison, dataByYear, participants])

  const comparisonDeptData = useMemo(() => {
    if (!isComparison) return []

    // Collect all departments across both years, sorted by total
    const allDepts: Record<string, Record<number, number>> = {}
    for (const event of EVENTS) {
      const yearParticipants = getParticipantsForYear(event.year, dataByYear, participants)
      const deptData = buildDepartmentData(yearParticipants)
      for (const { name, value } of deptData) {
        if (!allDepts[name]) allDepts[name] = {}
        allDepts[name][event.year] = value
      }
    }

    return Object.entries(allDepts)
      .map(([dept, years]) => {
        const total = Object.values(years).reduce((s, v) => s + v, 0)
        const row: Record<string, string | number> = { name: dept }
        for (const event of EVENTS) {
          row[String(event.year)] = years[event.year] ?? 0
        }
        return { row, total }
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 15)
      .map(({ row }) => row)
  }, [isComparison, dataByYear, participants])

  // Unique tarifs for filter
  const uniqueTarifs = useMemo(() => {
    const ids = new Set<string>()
    activeParticipants.forEach(p => {
      if (p.id_ticket) ids.add(p.id_ticket)
    })
    return Array.from(ids).sort()
  }, [activeParticipants])

  // Unique departments for filter
  const uniqueDepartments = useMemo(() => {
    const depts = new Set<string>()
    activeParticipants.forEach(p => {
      const postalCode = getPostalCode(p)
      if (postalCode) depts.add(postalCode.substring(0, 2))
    })
    return Array.from(depts).sort()
  }, [activeParticipants])

  // Current evolution data length (for brush)
  const currentEvoLength = isComparison ? comparisonEvolutionData.length : evolutionData.length

  // Quick period selection handler
  const selectPeriod = (period: string, dataLength: number) => {
    setActivePeriod(period)
    if (period === 'all') {
      setBrushRange({})
      return
    }
    const days = parseInt(period)
    const endIndex = dataLength - 1
    const startIndex = Math.max(0, endIndex - days)
    setBrushRange({ startIndex, endIndex })
  }

  // Reset brush when switching chart type or year
  useEffect(() => {
    setBrushRange({})
    setActivePeriod('all')
  }, [chartType, selectedYear])

  // Date min/max for filters
  const dateMinMax = useMemo(() => {
    if (activeParticipants.length === 0) return { min: '', max: '' }
    const dates = activeParticipants.map(p => new Date(p.create_date).getTime())
    return {
      min: new Date(Math.min(...dates)).toISOString().split('T')[0],
      max: new Date(Math.max(...dates)).toISOString().split('T')[0]
    }
  }, [activeParticipants])

  return (
    <div className="participant-graph">
      <div className="graph-controls">
        <div className="chart-type-selector">
          <button className={chartType === 'evolution' ? 'active' : ''} onClick={() => setChartType('evolution')}>
            📈 Évolution
          </button>
          <button className={chartType === 'age' ? 'active' : ''} onClick={() => setChartType('age')}>
            👥 Par âge
          </button>
          <button className={chartType === 'department' ? 'active' : ''} onClick={() => setChartType('department')}>
            📍 Par département
          </button>
        </div>

        {!isComparison && (
          <div className="graph-filters">
            <div className="filter-group">
              <label>📅 Du</label>
              <input type="date" value={dateRange.start} min={dateMinMax.min} max={dateMinMax.max}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} />
            </div>
            <div className="filter-group">
              <label>Au</label>
              <input type="date" value={dateRange.end} min={dateMinMax.min} max={dateMinMax.max}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} />
            </div>
            <div className="filter-group">
              <label>👤 Âge</label>
              <select value={selectedAgeRange} onChange={(e) => setSelectedAgeRange(e.target.value)}>
                <option value="all">Tous</option>
                {AGE_RANGES.map(range => (
                  <option key={range.label} value={range.label}>{range.label}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>📍 Dept</label>
              <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}>
                <option value="all">Tous</option>
                {uniqueDepartments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>🎫 Tarif</label>
              <select value={selectedTarif} onChange={(e) => setSelectedTarif(e.target.value)}>
                <option value="all">Tous</option>
                {uniqueTarifs.map(t => (
                  <option key={t} value={t}>#{t}</option>
                ))}
              </select>
            </div>
            <button className="reset-filters" onClick={() => {
              setDateRange({ start: '', end: '' })
              setSelectedAgeRange('all')
              setSelectedDepartment('all')
              setSelectedTarif('all')
            }}>
              🔄 Reset
            </button>
          </div>
        )}
      </div>

      {!isComparison && (
        <div className="graph-stats-bar">
          <span>📊 {filteredParticipants.length} participants affichés</span>
          {filteredParticipants.length !== activeParticipants.length && (
            <span className="filtered-info">(sur {activeParticipants.length} total)</span>
          )}
        </div>
      )}

      {isComparison && (
        <div className="graph-stats-bar comparison-stats-bar">
          {EVENTS.map(event => {
            const count = getParticipantsForYear(event.year, dataByYear, participants).length
            return (
              <span key={event.year} className="year-count" style={{ color: YEAR_COLORS[event.year] }}>
                {event.year}: {count} participants
              </span>
            )
          })}
        </div>
      )}

      {chartType === 'evolution' && !isComparison && (
        <div className="events-section">
          <div className="events-header">
            <span>🎯 Événements ({events.length})</span>
            <button className="add-event-btn" onClick={() => setShowEventForm(!showEventForm)}>
              {showEventForm ? '✕ Annuler' : '+ Ajouter'}
            </button>
          </div>
          {showEventForm && (
            <div className="event-form">
              <input type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)}
                min={dateMinMax.min} max={dateMinMax.max} />
              <input type="text" placeholder="Nom de l'événement..." value={newEventLabel}
                onChange={(e) => setNewEventLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addEvent()} />
              <button onClick={addEvent}>✓</button>
            </div>
          )}
          {events.length > 0 && (
            <div className="events-list">
              {events.map(event => (
                <div key={event.id} className="event-tag">
                  <span className="event-date">
                    {new Date(event.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                  </span>
                  <span className="event-label">{event.label}</span>
                  <button onClick={() => removeEvent(event.id)}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {chartType === 'evolution' && currentEvoLength > 0 && (
        <div className="period-selector">
          {[
            { key: '30', label: '30j' },
            { key: '90', label: '90j' },
            { key: '180', label: '180j' },
            { key: 'all', label: 'Tout' },
          ].map(p => (
            <button
              key={p.key}
              className={`period-btn ${activePeriod === p.key ? 'active' : ''}`}
              onClick={() => selectPeriod(p.key, currentEvoLength)}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="graph-container">
        {/* ========== SINGLE-YEAR: EVOLUTION ========== */}
        {chartType === 'evolution' && !isComparison && (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="#888" tick={{ fill: '#888', fontSize: 12 }}
                angle={-45} textAnchor="end" height={60} />
              <YAxis stroke="#888" tick={{ fill: '#888' }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
              <Line type="monotone" dataKey="cumul" name="Total cumulé" stroke="#667eea"
                strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="nouveaux" name="Nouveaux/jour" stroke="#f5576c"
                strokeWidth={2} dot={false} />
              <Brush
                dataKey="date"
                height={30}
                stroke="#667eea"
                fill="rgba(255,255,255,0.03)"
                tickFormatter={() => ''}
                startIndex={brushRange.startIndex}
                endIndex={brushRange.endIndex}
                onChange={(range) => {
                  setBrushRange(range)
                  setActivePeriod('')
                }}
              />
              {events.map(event => {
                const formattedDate = new Date(event.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
                return (
                  <ReferenceLine key={event.id} x={formattedDate} stroke="#43e97b"
                    strokeWidth={2} strokeDasharray="5 5"
                    label={{ value: event.label, position: 'top', fill: '#43e97b', fontSize: 11 }} />
                )
              })}
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* ========== COMPARISON: EVOLUTION (J+N aligned) ========== */}
        {chartType === 'evolution' && isComparison && (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={comparisonEvolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="day" stroke="#888" tick={{ fill: '#888', fontSize: 12 }}
                angle={-45} textAnchor="end" height={60} />
              <YAxis stroke="#888" tick={{ fill: '#888' }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
              {EVENTS.map(event => (
                <Line key={`cumul_${event.year}`} type="monotone"
                  dataKey={`cumul_${event.year}`} name={`Cumulé ${event.year}`}
                  stroke={YEAR_COLORS[event.year]} strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              ))}
              {EVENTS.map(event => (
                <Line key={`nouveaux_${event.year}`} type="monotone"
                  dataKey={`nouveaux_${event.year}`} name={`Nouveaux/jour ${event.year}`}
                  stroke={YEAR_COLORS[event.year]} strokeWidth={1.5} dot={false}
                  strokeDasharray="5 5" opacity={0.6} />
              ))}
              <Brush
                dataKey="day"
                height={30}
                stroke="#667eea"
                fill="rgba(255,255,255,0.03)"
                tickFormatter={() => ''}
                startIndex={brushRange.startIndex}
                endIndex={brushRange.endIndex}
                onChange={(range) => {
                  setBrushRange(range)
                  setActivePeriod('')
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* ========== SINGLE-YEAR: AGE ========== */}
        {chartType === 'age' && !isComparison && (
          <div className="dual-chart">
            <ResponsiveContainer width="50%" height={400}>
              <BarChart data={ageData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" stroke="#888" tick={{ fill: '#888' }} />
                <YAxis type="category" dataKey="name" stroke="#888" tick={{ fill: '#888' }} width={80} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="value" name="Participants" radius={[0, 4, 4, 0]}>
                  {ageData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="50%" height={400}>
              <PieChart>
                <Pie data={ageData.filter(d => d.value > 0)} cx="50%" cy="50%"
                  innerRadius={60} outerRadius={120} paddingAngle={2} dataKey="value"
                  label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                  labelLine={{ stroke: '#888' }}>
                  {ageData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ========== COMPARISON: AGE (grouped bars) ========== */}
        {chartType === 'age' && isComparison && (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={comparisonAgeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis type="number" stroke="#888" tick={{ fill: '#888' }} />
              <YAxis type="category" dataKey="name" stroke="#888" tick={{ fill: '#888' }} width={80} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
              {EVENTS.map(event => (
                <Bar key={event.year} dataKey={String(event.year)} name={String(event.year)}
                  fill={YEAR_COLORS[event.year]} radius={[0, 4, 4, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* ========== SINGLE-YEAR: DEPARTMENT ========== */}
        {chartType === 'department' && !isComparison && (
          <div className="dual-chart">
            <ResponsiveContainer width="50%" height={400}>
              <BarChart data={departmentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" stroke="#888" tick={{ fill: '#888' }} />
                <YAxis type="category" dataKey="name" stroke="#888" tick={{ fill: '#888' }} width={50} />
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => [`${value} participants`, 'Total']} />
                <Bar dataKey="value" name="Participants" radius={[0, 4, 4, 0]}>
                  {departmentData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="50%" height={400}>
              <PieChart>
                <Pie data={departmentData.filter(d => d.value > 0)} cx="50%" cy="50%"
                  innerRadius={60} outerRadius={120} paddingAngle={2} dataKey="value"
                  label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                  labelLine={{ stroke: '#888' }}>
                  {departmentData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => [`${value} participants`, 'Total']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ========== COMPARISON: DEPARTMENT (grouped bars) ========== */}
        {chartType === 'department' && isComparison && (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={comparisonDeptData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis type="number" stroke="#888" tick={{ fill: '#888' }} />
              <YAxis type="category" dataKey="name" stroke="#888" tick={{ fill: '#888' }} width={50} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
              {EVENTS.map(event => (
                <Bar key={event.year} dataKey={String(event.year)} name={String(event.year)}
                  fill={YEAR_COLORS[event.year]} radius={[0, 4, 4, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
