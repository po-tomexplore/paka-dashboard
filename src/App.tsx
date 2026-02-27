import { useParticipants } from './hooks/useParticipants'
import { useFilters } from './hooks/useFilters'
import { useAuth } from './hooks/useAuth'
import {
  Header,
  Controls,
  Filters,
  StatsCards,
  StatsSection,
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
    uniqueTarifs,
    statsByDepartment,
    statsByAge,
    statsByTarif,
    tarifNames,
    counts,
    lastSyncedAt,
  } = useParticipants()

  const {
    searchTerm,
    setSearchTerm,
    selectedAgeRange,
    setSelectedAgeRange,
    selectedPostalCode,
    setSelectedPostalCode,
    selectedTarif,
    setSelectedTarif,
    filteredParticipants,
  } = useFilters(participants)

  const hasFilters = searchTerm !== '' || selectedAgeRange !== 'Tous' || selectedPostalCode !== 'Tous' || selectedTarif !== 'Tous'

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
        lastSyncedAt={lastSyncedAt}
      />

      <Filters
        selectedAgeRange={selectedAgeRange}
        onAgeRangeChange={setSelectedAgeRange}
        selectedPostalCode={selectedPostalCode}
        onPostalCodeChange={setSelectedPostalCode}
        uniquePostalCodes={uniquePostalCodes}
        statsByAge={statsByAge}
        selectedTarif={selectedTarif}
        onTarifChange={setSelectedTarif}
        uniqueTarifs={uniqueTarifs}
        statsByTarif={statsByTarif}
        tarifNames={tarifNames}
      />

      {error && <ErrorMessage message={error} />}

      <StatsCards
        total={counts.total}
        scanned={counts.scanned}
        withPostalCode={counts.withPostalCode}
        filtered={filteredParticipants.length}
      />

      <StatsSection
        statsByDepartment={statsByDepartment}
        statsByAge={statsByAge}
        participantsWithBirthDate={counts.withBirthDate}
        participants={participants}
        tarifNames={tarifNames}
      />

      <ParticipantsTable
        participants={filteredParticipants}
        loading={loading}
        hasFilters={hasFilters}
        tarifNames={tarifNames}
      />

      <Footer />
    </div>
  )
}

export default App
