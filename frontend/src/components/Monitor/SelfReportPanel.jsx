import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const TRIGGERS = ['Work', 'Exams', 'Sleep', 'Relationships', 'Finance', 'Health', 'Social', 'Traffic']

const MOOD_LABELS = ['', 'Very stressed', 'Stressed', 'Neutral', 'Calm', 'Relaxed']
const MOOD_COLORS = ['', '#e84040', '#f07040', '#f5a623', '#4f8ef7', '#1fba7d']

export default function SelfReportPanel({ userId }) {
  const [mood, setMood] = useState(3)
  const [selectedTriggers, setSelectedTriggers] = useState([])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const toggleTrigger = t => {
    setSelectedTriggers(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    )
  }

  const handleSubmit = async () => {
    setLoading(true)
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

    const { data: existing } = await supabase
      .from('self_reports')
      .select('id')
      .eq('user_id', userId)
      .gte('reported_at', thirtyMinsAgo)
      .single()

    const payload = {
      user_id: userId,
      mood_score: mood,
      triggers: selectedTriggers,
      notes,
    }

    if (existing) {
      await supabase.from('self_reports').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('self_reports').insert(payload)
    }

    // Trigger rescoring
    try {
      await fetch('/api/rescore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
    } catch (e) {
      console.warn('Rescore failed:', e)
    }

    setLoading(false)
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  const moodColor = MOOD_COLORS[mood]

  return (
    <div>
      <h3 style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
        Mood check-in
      </h3>
      <div className="card card-sm">
        {/* Mood slider */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text2)' }}>How are you feeling?</span>
            <span style={{ fontSize: '12px', fontWeight: 500, color: moodColor }}>{MOOD_LABELS[mood]}</span>
          </div>
          <input
            type="range" min="1" max="5" step="1" value={mood}
            onChange={e => setMood(Number(e.target.value))}
            style={{ width: '100%', accentColor: moodColor }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            {[1,2,3,4,5].map(n => (
              <span key={n} style={{
                width: '20px', textAlign: 'center',
                fontSize: '11px',
                color: mood === n ? moodColor : 'var(--text3)',
                fontWeight: mood === n ? 500 : 400,
              }}>
                {n}
              </span>
            ))}
          </div>
        </div>

        {/* Triggers */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '8px' }}>Active stressors</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {TRIGGERS.map(t => {
              const active = selectedTriggers.includes(t)
              return (
                <button key={t} onClick={() => toggleTrigger(t)} style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  background: active ? 'rgba(79,142,247,0.12)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text2)',
                  fontSize: '12px', fontWeight: 500,
                  transition: 'all 0.15s',
                }}>
                  {t}
                </button>
              )
            })}
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '6px' }}>Notes (optional)</div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Anything on your mind…"
            rows={2}
            style={{
              width: '100%', padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'var(--bg2)',
              color: 'var(--text)', fontSize: '13px',
              resize: 'vertical', outline: 'none',
            }}
          />
        </div>

        <button onClick={handleSubmit} disabled={loading || submitted} style={{
          width: '100%', padding: '10px',
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          background: submitted ? '#1fba7d22' : 'var(--surface2)',
          color: submitted ? '#1fba7d' : 'var(--text)',
          fontSize: '13px', fontWeight: 500,
          border: `1px solid ${submitted ? '#1fba7d44' : 'var(--border)'}`,
          transition: 'all 0.2s',
        }}>
          {submitted ? '✓ Saved' : loading ? 'Saving…' : 'Submit check-in'}
        </button>
      </div>
    </div>
  )
}
