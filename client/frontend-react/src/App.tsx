import { Navigate, Route, Routes } from 'react-router-dom'
import { Home } from '@/pages/Home'
import { PlayerEntry } from '@/pages/player/PlayerEntry'
import { PlayerLobby } from '@/pages/player/PlayerLobby'
import { PlayerGame } from '@/pages/player/PlayerGame'
import { AdminAuth } from '@/pages/admin/AdminAuth'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { HostLobby } from '@/pages/admin/HostLobby'
import { HostControl } from '@/pages/admin/HostControl'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/player" element={<PlayerEntry />} />
      <Route path="/player/lobby" element={<PlayerLobby />} />
      <Route path="/player/game" element={<PlayerGame />} />
      <Route path="/admin" element={<AdminAuth />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/host/:sessionId" element={<HostLobby />} />
      <Route path="/admin/host/:sessionId/control" element={<HostControl />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
