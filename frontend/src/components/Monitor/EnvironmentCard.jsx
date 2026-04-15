const AQI_LABELS = ['', 'Good', 'Moderate', 'Unhealthy (sensitive)', 'Unhealthy', 'Very unhealthy', 'Hazardous']
const AQI_COLORS = ['', '#1fba7d', '#f5a623', '#f07040', '#e84040', '#9b4dca', '#7d1a1a']

export default function EnvironmentCard({ reading }) {
  const aqi = reading?.aqi_us_epa ?? null
  const temp = reading?.temperature ?? null
  const aqiColor = aqi ? AQI_COLORS[Math.min(aqi, 6)] : 'var(--text3)'
  const aqiLabel = aqi ? AQI_LABELS[Math.min(aqi, 6)] : 'No data'

  const pollutants = [
    { label: 'CO',    value: reading?.co,    unit: 'μg/m³' },
    { label: 'NO₂',   value: reading?.no2,   unit: 'μg/m³' },
    { label: 'O₃',    value: reading?.o3,    unit: 'μg/m³' },
    { label: 'PM2.5', value: reading?.pm2_5, unit: 'μg/m³' },
    { label: 'PM10',  value: reading?.pm10,  unit: 'μg/m³' },
  ]

  const tempStress = temp > 38 ? 'high' : temp > 32 ? 'moderate' : 'low'
  const tempColor  = tempStress === 'high' ? '#e84040' : tempStress === 'moderate' ? '#f5a623' : '#1fba7d'

  return (
    <div>
      <h3 style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
        Environment
      </h3>
      <div className="card card-sm">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {/* Temperature */}
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px' }}>Temperature</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '1.75rem', fontWeight: 400, color: tempColor }}>
                {temp != null ? Math.round(temp * 10) / 10 : '—'}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text3)' }}>°C</span>
            </div>
          </div>

          {/* AQI */}
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px' }}>US AQI Index</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '1.75rem', fontWeight: 400, color: aqiColor }}>
                {aqi ?? '—'}
              </span>
              <span style={{ fontSize: '11px', color: aqiColor }}>/6</span>
            </div>
            <div style={{ fontSize: '11px', color: aqiColor, marginTop: '2px' }}>{aqiLabel}</div>

            {/* AQI bar */}
            {aqi && (
              <div style={{ marginTop: '6px', height: '4px', borderRadius: '2px', background: 'var(--bg2)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${(aqi / 6) * 100}%`,
                  background: aqiColor, borderRadius: '2px',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            )}
          </div>
        </div>

        {/* Pollutants */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Pollutants
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
            {pollutants.map(p => (
              <div key={p.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text)' }}>
                  {p.value != null ? Math.round(p.value * 10) / 10 : '—'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '2px' }}>{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
