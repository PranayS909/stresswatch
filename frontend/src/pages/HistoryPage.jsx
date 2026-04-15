import { useState, useEffect } from 'react'
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { CSVLink } from 'react-csv'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { format, subDays, subWeeks, subMonths, subYears, parseISO } from 'date-fns'

const RANGES = [
  { label: 'Day',   key: 'day',   fn: () => subDays(new Date(), 1),    fmt: 'HH:mm' },
  { label: 'Week',  key: 'week',  fn: () => subWeeks(new Date(), 1),   fmt: 'EEE dd' },
  { label: 'Month', key: 'month', fn: () => subMonths(new Date(), 1),  fmt: 'dd MMM' },
  { label: 'Year',  key: 'year',  fn: () => subYears(new Date(), 1),   fmt: 'MMM yy' },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)', padding: '10px 14px',
    }}>
      <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '6px' }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ fontSize: '12px', color: p.color, marginBottom: '2px' }}>
          {p.name}: <strong>{typeof p.value === 'number' ? Math.round(p.value * 10) / 10 : p.value}</strong>
        </div>
      ))}
    </div>
  )
}

export default function HistoryPage() {
  const { user } = useAuth()
  const [range, setRange] = useState('week')
  const [scores, setScores] = useState([])
  const [rawRows, setRawRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const PER_PAGE = 15

  const rangeConfig = RANGES.find(r => r.key === range)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    const since = rangeConfig.fn().toISOString()

    supabase
      .from('stress_scores')
      .select(`
        scored_at, score, level, dominant_factor,
        sensor_readings ( bpm, spo2, hrv_rmssd ),
        env_readings ( temperature, aqi_us_epa )
      `)
      .eq('user_id', user.id)
      .gte('scored_at', since)
      .order('scored_at', { ascending: true })
      .then(({ data }) => {
        if (!data) { setScores([]); setRawRows([]); setLoading(false); return }

        const chart = data.map(d => ({
          time: format(parseISO(d.scored_at), rangeConfig.fmt),
          score: Math.round(d.score),
          bpm: d.sensor_readings?.bpm ? Math.round(d.sensor_readings.bpm) : null,
          hrv: d.sensor_readings?.hrv_rmssd ? Math.round(d.sensor_readings.hrv_rmssd * 10) / 10 : null,
          spo2: d.sensor_readings?.spo2 ? Math.round(d.sensor_readings.spo2 * 10) / 10 : null,
        }))

        const raw = data.map(d => ({
          Timestamp: d.scored_at,
          'Stress Score': d.score,
          Level: d.level,
          'Dominant Factor': d.dominant_factor,
          BPM: d.sensor_readings?.bpm,
          SpO2: d.sensor_readings?.spo2,
          'HRV (ms)': d.sensor_readings?.hrv_rmssd,
          'Temp (°C)': d.env_readings?.temperature,
          'AQI': d.env_readings?.aqi_us_epa,
        }))

        setScores(chart)
        setRawRows(raw)
        setLoading(false)
      })
  }, [user, range])

  const avgScore = scores.length
    ? Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length)
    : null
  const maxScore = scores.length ? Math.max(...scores.map(r => r.score)) : null
  const minScore = scores.length ? Math.min(...scores.map(r => r.score)) : null

  const pageRows = rawRows.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
  const totalPages = Math.ceil(rawRows.length / PER_PAGE)

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 400, fontFamily: 'var(--serif)', color: 'var(--text)' }}>History</h1>
          <p style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '2px' }}>Stress trends over time</p>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {RANGES.map(r => (
            <button key={r.key} onClick={() => { setRange(r.key); setPage(0) }} style={{
              padding: '6px 14px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: range === r.key ? 'var(--surface2)' : 'transparent',
              color: range === r.key ? 'var(--text)' : 'var(--text2)',
              fontSize: '13px', fontWeight: 500,
              transition: 'all 0.15s',
            }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '1.5rem' }}>
        {[
          { label: 'Average score', value: avgScore },
          { label: 'Peak score',    value: maxScore },
          { label: 'Lowest score',  value: minScore },
        ].map(s => (
          <div key={s.label} className="card card-sm" style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '2rem', fontWeight: 300, color: 'var(--text)' }}>
              {s.value ?? '—'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Stress score + vitals
        </div>
        {loading ? (
          <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>
            Loading…
          </div>
        ) : scores.length === 0 ? (
          <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: '14px' }}>
            No data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={scores} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--text3)', paddingTop: '8px' }} />
              <Area type="monotone" dataKey="score" name="Stress" fill="rgba(79,142,247,0.08)" stroke="#4f8ef7" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="bpm" name="BPM" stroke="#e84040" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              <Line type="monotone" dataKey="hrv" name="HRV (ms)" stroke="#1fba7d" strokeWidth={1.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Raw data table */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ fontSize: '12px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Raw data ({rawRows.length} rows)
          </div>
          {rawRows.length > 0 && (
            <CSVLink
              data={rawRows}
              filename={`stresswatch_${range}_${new Date().toISOString().split('T')[0]}.csv`}
              style={{
                padding: '6px 14px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text2)', fontSize: '12px', textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              ↓ Download CSV
            </CSVLink>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                {['Timestamp', 'Score', 'Level', 'BPM', 'SpO₂', 'HRV', 'Temp', 'AQI', 'Driver'].map(h => (
                  <th key={h} style={{
                    padding: '8px 10px', textAlign: 'left',
                    color: 'var(--text3)', fontWeight: 500,
                    borderBottom: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>
                    No data
                  </td>
                </tr>
              ) : pageRows.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '8px 10px', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: '11px' }}>
                    {row.Timestamp ? format(parseISO(row.Timestamp), 'dd MMM HH:mm') : '—'}
                  </td>
                  <td style={{ padding: '8px 10px', fontFamily: 'var(--mono)', fontWeight: 500, color: 'var(--text)' }}>
                    {row['Stress Score'] ? Math.round(row['Stress Score']) : '—'}
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <span className={`tag tag-${row.Level}`}>{row.Level}</span>
                  </td>
                  {['BPM','SpO2','HRV (ms)','Temp (°C)','AQI'].map(col => (
                    <td key={col} style={{ padding: '8px 10px', color: 'var(--text2)', fontFamily: 'var(--mono)' }}>
                      {row[col] != null ? Math.round(row[col] * 10) / 10 : '—'}
                    </td>
                  ))}
                  <td style={{ padding: '8px 10px', color: 'var(--text3)', fontSize: '11px' }}>
                    {row['Dominant Factor'] || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '1rem' }}>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{
              padding: '5px 12px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text2)', fontSize: '12px',
              opacity: page === 0 ? 0.4 : 1,
            }}>
              ←
            </button>
            <span style={{ fontSize: '12px', color: 'var(--text3)' }}>
              {page + 1} / {totalPages}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} style={{
              padding: '5px 12px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text2)', fontSize: '12px',
              opacity: page === totalPages - 1 ? 0.4 : 1,
            }}>
              →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
