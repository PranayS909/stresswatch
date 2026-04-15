import { useState, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

export default function JournalPanel({ userId }) {
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const debounceRef = useRef(null)
  const entryIdRef = useRef(null)

  const save = useCallback(async (text) => {
    if (!text.trim()) return
    setSaving(true)
    setSaved(false)

    const payload = { user_id: userId, content: text }

    if (entryIdRef.current) {
      await supabase.from('journal_entries')
        .update({ content: text })
        .eq('id', entryIdRef.current)
    } else {
      const { data } = await supabase.from('journal_entries')
        .insert(payload)
        .select('id')
        .single()
      if (data) entryIdRef.current = data.id
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [userId])

  const handleChange = e => {
    const val = e.target.value
    setContent(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => save(val), 2000)
  }

  const newEntry = () => {
    entryIdRef.current = null
    setContent('')
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <h3 style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Journal
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {saving && <span style={{ fontSize: '11px', color: 'var(--text3)' }}>Saving…</span>}
          {saved && <span style={{ fontSize: '11px', color: '#1fba7d' }}>Saved</span>}
          <button onClick={newEntry} style={{
            fontSize: '11px', color: 'var(--text3)',
            background: 'none', border: 'none', padding: '2px 8px',
            borderRadius: '4px',
          }}
            onMouseOver={e => e.target.style.color = 'var(--text)'}
            onMouseOut={e => e.target.style.color = 'var(--text3)'}
          >
            + New entry
          </button>
        </div>
      </div>

      <div className="card card-sm">
        <textarea
          value={content}
          onChange={handleChange}
          placeholder="Write freely — auto-saved every 2 seconds…"
          rows={5}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: 'var(--text)',
            fontSize: '14px',
            lineHeight: 1.7,
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'var(--font)',
          }}
        />
        <div style={{ borderTop: '1px solid var(--border)', marginTop: '8px', paddingTop: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
            {content.length > 0 ? `${content.split(/\s+/).filter(Boolean).length} words` : 'Start typing…'}
          </span>
        </div>
      </div>
    </div>
  )
}
