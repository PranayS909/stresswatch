import { useNavigate } from 'react-router-dom'

const INTERVENTIONS = [
  {
    id: 'breathe',
    title: 'Box Breathing',
    desc: '4-4-4-4 guided breathing to activate your parasympathetic system',
    icon: '◎',
    color: '#4f8ef7',
    action: 'Start exercise',
  },
  {
    id: 'music',
    title: 'Relaxation Audio',
    desc: 'Binaural beats and ambient soundscapes for stress relief',
    icon: '♪',
    color: '#1fba7d',
    action: 'Listen now',
    link: 'https://www.youtube.com/results?search_query=binaural+beats+stress+relief',
  },
  {
    id: 'quick',
    title: 'Quick Actions',
    desc: 'Step away, drink water, stretch for 2 minutes',
    icon: '→',
    color: '#f5a623',
    action: 'View tips',
  },
]

export default function InterventionsPanel({ score }) {
  const navigate = useNavigate()
  const urgency = score >= 80 ? 'critical' : score >= 60 ? 'high' : 'moderate'
  const urgencyLabel = { critical: 'Your stress is critical', high: 'Elevated stress detected', moderate: 'Moderate stress' }

  const handleAction = (intervention) => {
    if (intervention.id === 'breathe') navigate('/breathe')
    else if (intervention.link) window.open(intervention.link, '_blank')
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <h3 style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Interventions
        </h3>
        <span style={{
          fontSize: '10px', padding: '2px 8px', borderRadius: '10px',
          background: urgency === 'critical' ? 'var(--critical-bg)' : urgency === 'high' ? 'var(--high-bg)' : 'var(--moderate-bg)',
          color: urgency === 'critical' ? 'var(--critical)' : urgency === 'high' ? 'var(--high)' : 'var(--moderate)',
          fontWeight: 500,
        }}>
          {urgencyLabel[urgency]}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {INTERVENTIONS.map(iv => (
          <div key={iv.id} className="card card-sm" style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
            borderLeft: `3px solid ${iv.color}`,
          }}>
            <div style={{
              width: '36px', height: '36px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 'var(--radius-sm)',
              background: `${iv.color}15`,
              fontSize: '16px', color: iv.color,
            }}>
              {iv.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{iv.title}</div>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px', lineHeight: 1.4 }}>{iv.desc}</div>
            </div>
            <button onClick={() => handleAction(iv)} style={{
              flexShrink: 0, padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${iv.color}44`,
              background: `${iv.color}10`,
              color: iv.color,
              fontSize: '12px', fontWeight: 500,
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}>
              {iv.action}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
