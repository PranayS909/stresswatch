import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const INTERVENTIONS = [
  {
    id: 'breathe',
    title: 'Box Breathing',
    desc: '4-4-4-4 guided breathing to help your body settle down.',
    icon: 'O',
    color: '#4f8ef7',
    action: 'Start exercise',
  },
  {
    id: 'music',
    title: 'Relaxation Audio',
    desc: 'Ambient sounds and calming audio that can help reduce tension.',
    icon: '~',
    color: '#1fba7d',
    action: 'Listen now',
    link: 'https://www.youtube.com/results?search_query=binaural+beats+stress+relief',
  },
  {
    id: 'quick',
    title: 'Quick Actions',
    desc: 'Step away, drink water, stretch, and lower stimulation for a few minutes.',
    icon: '>',
    color: '#f5a623',
    action: 'View tips',
  },
]

export default function InterventionsPanel({ scoreId, score, level }) {
  const navigate = useNavigate()
  const urgency = level === 'critical' ? 'critical' : score >= 60 ? 'high' : 'moderate'
  const urgencyLabel = {
    critical: 'Critical stress detected',
    high: 'High stress detected',
    moderate: 'Moderate stress',
  }

  const [analysis, setAnalysis] = useState(null)
  const [source, setSource] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadAnalysis() {
      if (!scoreId || !['high', 'critical'].includes(urgency)) {
        setAnalysis(null)
        setSource(null)
        return
      }

      setLoading(true)
      setError('')

      try {
        const res = await fetch(`/api/analysis/${scoreId}`)
        if (!res.ok) throw new Error(`Request failed: ${res.status}`)
        const payload = await res.json()
        if (!cancelled) {
          setAnalysis(payload.available ? payload.analysis : null)
          setSource(payload.source || null)
        }
      } catch (err) {
        if (!cancelled) {
          setAnalysis(null)
          setSource(null)
          setError('AI analysis is temporarily unavailable.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadAnalysis()
    return () => { cancelled = true }
  }, [scoreId, urgency])

  const handleAction = (intervention) => {
    if (intervention.id === 'breathe') navigate('/breathe')
    else if (intervention.link) window.open(intervention.link, '_blank')
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
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
        {source && (
          <span style={{
            fontSize: '10px',
            padding: '2px 8px',
            borderRadius: '10px',
            background: 'rgba(79,142,247,0.10)',
            color: 'var(--accent)',
            fontWeight: 500,
          }}>
            {source === 'groq' ? 'AI analysis' : 'Guided fallback'}
          </span>
        )}
      </div>

      {(loading || analysis || error) && (
        <div className="card card-sm" style={{
          marginBottom: '10px',
          borderLeft: `3px solid ${urgency === 'critical' ? 'var(--critical)' : 'var(--high)'}`,
          background: urgency === 'critical' ? 'rgba(232,64,64,0.06)' : 'rgba(240,112,64,0.06)',
        }}>
          {loading ? (
            <div style={{ fontSize: '13px', color: 'var(--text3)' }}>
              Analysing your latest stress event in plain language...
            </div>
          ) : error ? (
            <div style={{ fontSize: '13px', color: 'var(--text3)' }}>{error}</div>
          ) : analysis && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                  {analysis.headline}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '4px', lineHeight: 1.55 }}>
                  {analysis.summary}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                  Likely drivers
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {analysis.likely_drivers?.map((item, index) => (
                    <div key={index} style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.5 }}>
                      - {item}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                  What to do now
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {analysis.what_to_do_now?.map((item, index) => (
                    <div key={index} style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.5 }}>
                      {index + 1}. {item}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text3)', lineHeight: 1.5 }}>
                {analysis.why_this_matters}
              </div>

              <div style={{
                fontSize: '12px',
                color: urgency === 'critical' ? 'var(--critical)' : 'var(--high)',
                lineHeight: 1.55,
              }}>
                {analysis.when_to_get_help}
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text3)', lineHeight: 1.45 }}>
                {analysis.confidence_note}
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text3)', lineHeight: 1.45 }}>
                {analysis.disclaimer}
              </div>
            </div>
          )}
        </div>
      )}

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
