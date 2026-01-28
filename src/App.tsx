import { useParticipants } from './hooks/useParticipants'
import { useFilters } from './hooks/useFilters'
import { useAuth } from './hooks/useAuth'
import {
  Header,
  Controls,
  Filters,
  StatsCards,
  StatsDetails,
  ParticipantsTable,
  Footer,
  ErrorMessage,
  Login,
} from './components'
import './App.css'

function App() {
  const { isAuthenticated, login, logout, error: authError } = useAuth()

  const {
    participants,
    loading,
    error,
    refresh,
    uniquePostalCodes,
    statsByDepartment,
    statsByAge,
    counts,
  } = useParticipants()

  const {
    searchTerm,
    setSearchTerm,
    selectedAgeRange,
    setSelectedAgeRange,
    selectedPostalCode,
    setSelectedPostalCode,
    filteredParticipants,
  } = useFilters(participants)

  const hasFilters = searchTerm !== '' || selectedAgeRange !== 'Tous' || selectedPostalCode !== 'Tous'

  // Afficher la page de login si non authentifié
  if (!isAuthenticated) {
    return <Login onLogin={login} error={authError} />
  }

  return (
    <div className="dashboard">
      <Header onLogout={logout} />

      <Controls
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onRefresh={refresh}
        loading={loading}
      />

      <Filters
        selectedAgeRange={selectedAgeRange}
        onAgeRangeChange={setSelectedAgeRange}
        selectedPostalCode={selectedPostalCode}
        onPostalCodeChange={setSelectedPostalCode}
        uniquePostalCodes={uniquePostalCodes}
        statsByAge={statsByAge}
      />

      {error && <ErrorMessage message={error} />}

      <StatsCards
        total={counts.total}
        scanned={counts.scanned}
        withPostalCode={counts.withPostalCode}
        filtered={filteredParticipants.length}
      />

      <StatsDetails
        statsByDepartment={statsByDepartment}
        statsByAge={statsByAge}
        participantsWithBirthDate={counts.withBirthDate}
      />

      <ParticipantsTable
        participants={filteredParticipants}
        loading={loading}
        hasFilters={hasFilters}
      />

      <Footer />
    </div>
  )
}

export default App
