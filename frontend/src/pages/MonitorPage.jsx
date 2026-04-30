import { useAuth } from '../lib/AuthContext'
import { useMonitor } from '../hooks/useMonitor'
import StressGauge from '../components/Monitor/StressGauge'
import VitalsSection from '../components/Monitor/VitalsSection'
import EnvironmentCard from '../components/Monitor/EnvironmentCard'
import SelfReportPanel from '../components/Monitor/SelfReportPanel'
import JournalPanel from '../components/Monitor/JournalPanel'
import InterventionsPanel from '../components/Monitor/InterventionsPanel'

export default function MonitorPage() {
  const { user } = useAuth()
  const { data, loading, connected } = useMonitor(user?.id)

  const score   = data?.score ?? 0
  const level   = data?.level ?? 'low'
  const sensor  = data?.sensor_readings ?? null
  const env     = data?.env_readings ?? null
  const factor  = data?.dominant_factor ?? null

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 400, fontFamily: 'var(--serif)', color: 'var(--text)' }}>
            Live Monitor
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '2px' }}>
            {data?.scored_at
              ? `Last updated ${new Date(data.scored_at).toLocaleTimeString()}`
              : 'Waiting for sensor data…'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: connected ? '#1fba7d' : '#e84040',
            boxShadow: connected ? '0 0 6px #1fba7d88' : 'none',
            animation: connected ? 'pulse-ring 2s ease infinite' : 'none',
          }} />
          <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
            {connected ? 'Live' : 'Connecting…'}
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text3)' }}>
          <div style={{ fontSize: '14px' }}>Loading sensor data…</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="fade-up">

          {/* Gauge card */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, var(--surface) 0%, var(--bg2) 100%)',
            padding: '2rem 1.5rem',
          }}>
            <StressGauge score={score} level={level} dominantFactor={factor} />
          </div>

          <VitalsSection reading={sensor} />
          <EnvironmentCard reading={env} />

          {score > 60 && (
            <InterventionsPanel
              scoreId={data?.id}
              score={score}
              level={level}
            />
          )}

          <SelfReportPanel userId={user.id} />
          <JournalPanel userId={user.id} />
        </div>
      )}
    </div>
  )
}
