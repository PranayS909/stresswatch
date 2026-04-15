export default function VitalsSection({ reading }) {
  const vitals = [
    {
      key: 'bpm',
      label: 'Heart Rate',
      value: reading?.bpm,
      unit: 'bpm',
      normal: [60, 90],
      icon: '♥',
      iconColor: '#e84040',
    },
    {
      key: 'spo2',
      label: 'SpO₂',
      value: reading?.spo2,
      unit: '%',
      normal: [95, 100],
      icon: '◉',
      iconColor: '#4f8ef7',
      lowerIsBad: true,
    },
    {
      key: 'hrv_rmssd',
      label: 'HRV (RMSSD)',
      value: reading?.hrv_rmssd,
      unit: 'ms',
      normal: [20, 60],
      icon: '⟿',
      iconColor: '#1fba7d',
    },
  ]

  function getStatus(vital) {
    if (!vital.value) return 'neutral'
    const v = vital.value
    if (vital.lowerIsBad) {
      return v >= vital.normal[0] ? 'good' : v >= vital.normal[0] - 3 ? 'warn' : 'bad'
    }
    if (v < vital.normal[0]) return vital.key === 'hrv_rmssd' ? 'bad' : 'warn'
    if (v > vital.normal[1]) return vital.key === 'hrv_rmssd' ? 'good' : 'bad'
    return 'good'
  }

  const statusColor = s => ({ good: '#1fba7d', warn: '#f5a623', bad: '#e84040', neutral: 'var(--text3)' }[s])

  return (
    <div>
      <h3 style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
        Physiological
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {vitals.map(v => {
          const status = getStatus(v)
          const color = statusColor(status)
          return (
            <div key={v.key} className="card card-sm" style={{ textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                background: color, opacity: 0.7,
              }} />
              <div style={{ fontSize: '16px', marginBottom: '6px', color: v.iconColor }}>{v.icon}</div>
              <div style={{
                fontFamily: 'var(--mono)',
                fontSize: '1.5rem', fontWeight: 400,
                color: 'var(--text)',
                letterSpacing: '-0.02em',
              }}>
                {v.value != null ? Math.round(v.value * 10) / 10 : '—'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '2px' }}>{v.unit}</div>
              <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '4px' }}>{v.label}</div>
              <div style={{
                marginTop: '6px', fontSize: '10px',
                color, fontWeight: 500,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {v.value != null ? status : 'no data'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
