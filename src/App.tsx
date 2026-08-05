import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { CreateLeaguePage } from './pages/CreateLeaguePage'
import { DraftRoomPage } from './pages/DraftRoomPage'
import { LineupPage } from './pages/LineupPage'
import { SeasonDashboardPage } from './pages/SeasonDashboardPage'
import { WaiversPage } from './pages/WaiversPage'
import { TradesPage } from './pages/TradesPage'
import { EventLobbyPage } from './pages/EventLobbyPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreateLeaguePage />} />
        <Route path="/league/:leagueId/draft" element={<DraftRoomPage />} />
        <Route path="/league/:leagueId/lineup" element={<LineupPage />} />
        <Route path="/league/:leagueId/season" element={<SeasonDashboardPage />} />
        <Route path="/league/:leagueId/waivers" element={<WaiversPage />} />
        <Route path="/league/:leagueId/trades" element={<TradesPage />} />
        <Route path="/league/:leagueId/event" element={<EventLobbyPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
