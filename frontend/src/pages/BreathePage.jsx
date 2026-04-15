import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const PHASES = [
  { label: 'Inhale',    duration: 4, color: '#4f8ef7', scale: 1.35 },
  { label: 'Hold',      duration: 4, color: '#9b8ef7', scale: 1.35 },
  { label: 'Exhale',    duration: 4, color: '#1fba7d', scale: 0.75 },
  { label: 'Hold',      duration: 4, color: '#f5a623', scale: 0.75 },
]
const TOTAL_CYCLE = PHASES.reduce((s, p) => s + p.duration, 0)

export default function BreathePage() {
  const [running, setRunning] = useState(false)
  const [cycles, setCycles] = useState(0)
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [totalElapsed, setTotalElapsed] = useState(0)
  const navigate = useNavigate()
  const interval = useRef(null)
  const target = 4 // cycles

  useEffect(() => {
    if (!running) return
    interval.current = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 0.05
        if (next >= PHASES[phaseIdx].duration) {
          setPhaseIdx(pi => {
            const nextPhase = (pi + 1) % PHASES.length
            if (nextPhase === 0) setCycles(c => c + 1)
            return nextPhase
          })
          return 0
        }
        return next
      })
      setTotalElapsed(t => t + 0.05)
    }, 50)
    return () => clearInterval(interval.current)
  }, [running, phaseIdx])

  useEffect(() => {
    if (cycles >= target) {
      setRunning(false)
    }
  }, [cycles])

  const done = cycles >= target
  const phase = PHASES[phaseIdx]
  const phaseProgress = elapsed / phase.duration
  const circleScale = running
    ? PHASES[Math.max(0, phaseIdx - 1)]?.scale +
      (phase.scale - PHASES[Math.max(0, phaseIdx - 1)]?.scale) * phaseProgress
    : 1

  const formatTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '2rem',
      background: 'radial-gradient(ellipse at 50% 60%, rgba(79,142,247,0.06) 0%, transparent 65%)',
    }}>
      <button onClick={() => navigate(-1)} style={{
        position: 'fixed', top: '80px', left: '1.5rem',
        background: 'none', border: 'none',
        color: 'var(--text3)', fontSize: '13px',
        display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        ← Back
      </button>

      <h2 style={{
        fontFamily: 'var(--serif)', fontWeight: 400, fontSize: '1.6rem',
        color: 'var(--text)', marginBottom: '0.5rem', textAlign: 'center',
      }}>
        Box Breathing
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '3.5rem', textAlign: 'center' }}>
        {done ? 'Session complete — well done.' : `${target} cycles · 4 seconds each phase`}
      </p>

      {/* Animated circle */}
      <div style={{
        position: 'relative',
        width: '220px', height: '220px',
        marginBottom: '3rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Outer glow ring */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: `1px solid ${running ? phase.color : 'var(--border)'}22`,
          transform: `scale(${running ? circleScale * 1.2 : 1})`,
          transition: 'transform 0.05s linear, border-color 0.4s ease',
        }} />
        {/* Main circle */}
        <div style={{
          width: '140px', height: '140px', borderRadius: '50%',
          background: running ? `${phase.color}18` : 'var(--surface)',
          border: `2px solid ${running ? phase.color : 'var(--border2)'}`,
          transform: `scale(${running ? circleScale : 1})`,
          transition: 'transform 0.05s linear, background 0.4s ease, border-color 0.4s ease',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
        }}>
          {running && !done ? (
            <>
              <div style={{ fontSize: '1.5rem', fontWeight: 300, color: phase.color, fontFamily: 'var(--mono)' }}>
                {Math.ceil(phase.duration - elapsed)}
              </div>
              <div style={{ fontSize: '11px', color: phase.color, marginTop: '4px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {phase.label}
              </div>
            </>
          ) : (
            <div style={{ fontSize: '13px', color: 'var(--text3)', textAlign: 'center', padding: '0 1rem' }}>
              {done ? '✓ Done' : 'Press start'}
            </div>
          )}
        </div>
      </div>

      {/* Phase indicators */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '2.5rem' }}>
        {PHASES.map((p, i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: running && phaseIdx === i ? p.color : 'var(--surface2)',
              transition: 'background 0.3s',
            }} />
            <span style={{ fontSize: '10px', color: running && phaseIdx === i ? p.color : 'var(--text3)' }}>
              {p.label}
            </span>
          </div>
        ))}
      </div>

      {/* Cycle progress */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem' }}>
        {Array.from({ length: target }).map((_, i) => (
          <div key={i} style={{
            width: '24px', height: '4px', borderRadius: '2px',
            background: i < cycles ? '#1fba7d' : 'var(--surface2)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      {/* Controls */}
      {!done ? (
        <button onClick={() => setRunning(r => !r)} style={{
          padding: '12px 36px',
          borderRadius: '24px',
          border: '1px solid var(--border2)',
          background: running ? 'var(--surface)' : 'var(--accent)',
          color: '#fff',
          fontSize: '14px', fontWeight: 500,
          transition: 'all 0.2s',
        }}>
          {running ? 'Pause' : 'Start'}
        </button>
      ) : (
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => {
            setCycles(0); setPhaseIdx(0); setElapsed(0); setTotalElapsed(0)
          }} style={{
            padding: '12px 28px', borderRadius: '24px',
            border: '1px solid var(--border2)', background: 'transparent',
            color: 'var(--text2)', fontSize: '14px',
          }}>
            Again
          </button>
          <button onClick={() => navigate(-1)} style={{
            padding: '12px 28px', borderRadius: '24px',
            border: 'none', background: '#1fba7d',
            color: '#fff', fontSize: '14px', fontWeight: 500,
          }}>
            Done
          </button>
        </div>
      )}

      {(running || totalElapsed > 0) && (
        <p style={{ marginTop: '1.5rem', fontSize: '12px', color: 'var(--text3)' }}>
          Session: {formatTime(totalElapsed)}
        </p>
      )}
    </div>
  )
}
