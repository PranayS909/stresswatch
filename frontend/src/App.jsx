import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Nav from './components/shared/Nav'
import MonitorPage from './pages/MonitorPage'
import HistoryPage from './pages/HistoryPage'
import InsightsPage from './pages/InsightsPage'
import BreathePage from './pages/BreathePage'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--text2)' }}>Loading…</div>
  return user ? children : <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--text)' }}>Authentication failed. Ensure Supabase is configured.</div>
}

function AppShell() {
  const { user } = useAuth()
  return (
    <>
      {user && <Nav />}
      <main style={{ flex: 1, paddingTop: user ? 'var(--nav-height)' : 0 }}>
        <Routes>
          <Route path="/" element={<PrivateRoute><MonitorPage /></PrivateRoute>} />
          <Route path="/history" element={<PrivateRoute><HistoryPage /></PrivateRoute>} />
          <Route path="/insights" element={<PrivateRoute><InsightsPage /></PrivateRoute>} />
          <Route path="/breathe" element={<PrivateRoute><BreathePage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  )
}
