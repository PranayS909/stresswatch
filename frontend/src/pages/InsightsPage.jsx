import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { subDays, subMonths, parseISO, getHours, getDay } from 'date-fns'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 24 }, (_, i) => {
  if (i === 0) return '12a'
  if (i === 12) return '12p'
  return i < 12 ? `${i}a` : `${i - 12}p`
})

function scoreToColor(v, max) {
  if (!v) return 'var(--surface)'
  const norm = v / (max || 1)
  if (norm < 0.3) return 'rgba(31,186,125,0.3)'
  if (norm < 0.6) return 'rgba(245,166,35,0.35)'
  if (norm < 0.8) return 'rgba(240,112,64,0.4)'
  return 'rgba(232,64,64,0.5)'
}

export default function InsightsPage() {
  const { user } = useAuth()
  const [triggerData, setTriggerData] = useState([])
  const [heatmap, setHeatmap] = useState({})
  const [avgByLevel, setAvgByLevel] = useState({})
  const [topTrigger, setTopTrigger] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const since = subMonths(new Date(), 1).toISOString()

    Promise.all([
      supabase.from('self_reports')
        .select('triggers, mood_score')
        .eq('user_id', user.id)
        .gte('reported_at', since),

      supabase.from('stress_scores')
        .select('scored_at, score, level')
        .eq('user_id', user.id)
        .gte('scored_at', since),
    ]).then(([reports, scores]) => {
      // Trigger frequency
      const triggerCount = {}
      reports.data?.forEach(r => {
        r.triggers?.forEach(t => {
          triggerCount[t] = (triggerCount[t] || 0) + 1
        })
      })
      const triggerArr = Object.entries(triggerCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
      setTriggerData(triggerArr)
      if (triggerArr.length) setTopTrigger(triggerArr[0].name)

      // Heatmap: hour of day × day of week → avg score
      const grid = {}
      scores.data?.forEach(s => {
        const d = parseISO(s.scored_at)
        const h = getHours(d)
        const day = getDay(d)
        const key = `${day}-${h}`
        if (!grid[key]) grid[key] = []
        grid[key].push(s.score)
      })
      const averaged = {}
      Object.entries(grid).forEach(([key, arr]) => {
        averaged[key] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
      })
      setHeatmap(averaged)

      // Level breakdown
      const levelCount = { low: 0, moderate: 0, high: 0, critical: 0 }
      scores.data?.forEach(s => { if (s.level in levelCount) levelCount[s.level]++ })
      const total = scores.data?.length || 1
      setAvgByLevel(Object.fromEntries(
        Object.entries(levelCount).map(([k, v]) => [k, Math.round((v / total) * 100)])
      ))

      setLoading(false)
    })
  }, [user])

  const heatmaxVal = Math.max(...Object.values(heatmap), 1)

  const LEVEL_COLORS = { low: '#1fba7d', moderate: '#f5a623', high: '#f07040', critical: '#e84040' }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 400, fontFamily: 'var(--serif)', color: 'var(--text)' }}>Insights</h1>
        <p style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '2px' }}>Last 30 days · patterns & recommendations</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text3)' }}>Analysing your data…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="fade-up">

          {/* Top insight callout */}
          {topTrigger && (
            <div className="card" style={{
              borderLeft: '3px solid #4f8ef7',
              background: 'rgba(79,142,247,0.05)',
              display: 'flex', alignItems: 'flex-start', gap: '1rem',
            }}>
              <div style={{ fontSize: '24px', marginTop: '2px' }}>◈</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>
                  Your top stressor this month is <span style={{ color: '#4f8ef7' }}>{topTrigger}</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '4px', lineHeight: 1.5 }}>
                  Consider scheduling dedicated time to address this stressor or explore coping strategies in the interventions panel.
                </div>
              </div>
            </div>
          )}

          {/* Level breakdown */}
          <div>
            <h3 style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              Stress level breakdown
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {Object.entries(avgByLevel).map(([level, pct]) => (
                <div key={level} className="card card-sm" style={{ textAlign: 'center' }}>
                  <div style={{
                    fontFamily: 'var(--mono)', fontSize: '1.75rem', fontWeight: 300,
                    color: LEVEL_COLORS[level],
                  }}>
                    {pct}%
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px', textTransform: 'capitalize' }}>
                    {level}
                  </div>
                  <div style={{
                    marginTop: '8px', height: '3px', borderRadius: '2px',
                    background: 'var(--bg2)', overflow: 'hidden',
                  }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: LEVEL_COLORS[level], borderRadius: '2px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trigger frequency bar chart */}
          {triggerData.length > 0 && (
            <div>
              <h3 style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                Stressor frequency (last 30 days)
              </h3>
              <div className="card" style={{ padding: '1.5rem' }}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={triggerData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" name="Reports" radius={[4, 4, 0, 0]}>
                      {triggerData.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? '#4f8ef7' : 'rgba(79,142,247,0.4)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Heatmap */}
          {Object.keys(heatmap).length > 0 && (
            <div>
              <h3 style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                Stress pattern — hour of day × day of week
              </h3>
              <div className="card" style={{ padding: '1.25rem', overflowX: 'auto' }}>
                {/* Hour labels */}
                <div style={{ display: 'grid', gridTemplateColumns: '36px repeat(24, 1fr)', gap: '2px', marginBottom: '2px' }}>
                  <div />
                  {HOURS.map((h, i) => (
                    <div key={i} style={{ fontSize: '8px', color: 'var(--text3)', textAlign: 'center' }}>{i % 3 === 0 ? h : ''}</div>
                  ))}
                </div>
                {/* Rows */}
                {DAYS.map((day, di) => (
                  <div key={di} style={{ display: 'grid', gridTemplateColumns: '36px repeat(24, 1fr)', gap: '2px', marginBottom: '2px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text3)', display: 'flex', alignItems: 'center' }}>{day}</div>
                    {Array.from({ length: 24 }, (_, hi) => {
                      const val = heatmap[`${di}-${hi}`]
                      return (
                        <div key={hi} title={val ? `Avg stress: ${val}` : 'No data'} style={{
                          height: '18px', borderRadius: '2px',
                          background: scoreToColor(val, heatmaxVal),
                        }} />
                      )
                    })}
                  </div>
                ))}
                {/* Legend */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text3)' }}>Low</span>
                  {['rgba(31,186,125,0.3)', 'rgba(245,166,35,0.35)', 'rgba(240,112,64,0.4)', 'rgba(232,64,64,0.5)'].map((c, i) => (
                    <div key={i} style={{ width: '18px', height: '10px', borderRadius: '2px', background: c }} />
                  ))}
                  <span style={{ fontSize: '10px', color: 'var(--text3)' }}>High</span>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div>
            <h3 style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              Recommendations
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { icon: '◎', color: '#4f8ef7', title: 'Practice box breathing daily', desc: 'Even a single 4-cycle session lowers cortisol and improves HRV within minutes.' },
                { icon: '◑', color: '#1fba7d', title: 'Monitor HRV trends weekly', desc: 'A rising HRV baseline over weeks is the clearest sign that your interventions are working.' },
                { icon: '◈', color: '#f5a623', title: 'Log stressors consistently', desc: 'The more check-ins you submit, the more personalised and accurate your stress model becomes.' },
              ].map((r, i) => (
                <div key={i} className="card card-sm" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '18px', color: r.color, flexShrink: 0, marginTop: '1px' }}>{r.icon}</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '3px' }}>{r.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)', lineHeight: 1.5 }}>{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
