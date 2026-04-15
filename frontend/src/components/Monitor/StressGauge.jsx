import { useEffect, useRef } from 'react'

const LEVEL_COLORS = {
  low:      '#1fba7d',
  moderate: '#f5a623',
  high:     '#f07040',
  critical: '#e84040',
}

const LEVEL_LABELS = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  critical: 'Critical',
}

export default function StressGauge({ score = 0, level = 'low', dominantFactor }) {
  const canvasRef = useRef()
  const animRef = useRef()
  const prevScore = useRef(score)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    canvas.width = 260 * dpr
    canvas.height = 150 * dpr
    canvas.style.width = '260px'
    canvas.style.height = '150px'
    ctx.scale(dpr, dpr)

    const cx = 130, cy = 138, r = 100, lw = 14
    const color = LEVEL_COLORS[level] || LEVEL_COLORS.low
    const startAngle = Math.PI
    const targetScore = score
    const startScore = prevScore.current

    let startTime = null
    const duration = 700

    function draw(currentScore) {
      ctx.clearRect(0, 0, 260, 150)

      // Zone segments
      const zones = [
        { from: 0,  to: 35,  color: 'rgba(31,186,125,0.15)' },
        { from: 35, to: 60,  color: 'rgba(245,166,35,0.15)' },
        { from: 60, to: 80,  color: 'rgba(240,112,64,0.15)' },
        { from: 80, to: 100, color: 'rgba(232,64,64,0.15)' },
      ]
      zones.forEach(z => {
        const aStart = Math.PI + (z.from / 100) * Math.PI
        const aEnd   = Math.PI + (z.to   / 100) * Math.PI
        ctx.beginPath()
        ctx.arc(cx, cy, r, aStart, aEnd)
        ctx.strokeStyle = z.color
        ctx.lineWidth = lw + 4
        ctx.lineCap = 'butt'
        ctx.stroke()
      })

      // Track
      ctx.beginPath()
      ctx.arc(cx, cy, r, Math.PI, 0)
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = lw
      ctx.lineCap = 'round'
      ctx.stroke()

      // Fill arc
      const fillEnd = Math.PI + (Math.max(currentScore, 1) / 100) * Math.PI
      ctx.beginPath()
      ctx.arc(cx, cy, r, startAngle, fillEnd)
      ctx.strokeStyle = color
      ctx.lineWidth = lw
      ctx.lineCap = 'round'
      ctx.stroke()

      // Needle dot at tip
      const angle = startAngle + (currentScore / 100) * Math.PI
      const nx = cx + r * Math.cos(angle)
      const ny = cy + r * Math.sin(angle)
      ctx.beginPath()
      ctx.arc(nx, ny, 5, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()

      // Tick marks
      for (let i = 0; i <= 10; i++) {
        const a = Math.PI + (i / 10) * Math.PI
        const inner = r - 10
        const outer = r + 4
        ctx.beginPath()
        ctx.moveTo(cx + inner * Math.cos(a), cy + inner * Math.sin(a))
        ctx.lineTo(cx + outer * Math.cos(a), cy + outer * Math.sin(a))
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }

    function animate(ts) {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease out cubic
      const current = startScore + (targetScore - startScore) * eased
      draw(current)
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        prevScore.current = targetScore
      }
    }

    cancelAnimationFrame(animRef.current)
    animRef.current = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animRef.current)
  }, [score, level])

  const color = LEVEL_COLORS[level] || LEVEL_COLORS.low

  return (
    <div style={{ textAlign: 'center', position: 'relative' }}>
      <canvas ref={canvasRef} style={{ display: 'block', margin: '0 auto' }} />

      <div style={{ marginTop: '-28px' }}>
        <div style={{
          fontSize: '3.5rem', fontWeight: 300, lineHeight: 1,
          color: 'var(--text)', fontFamily: 'var(--mono)',
          letterSpacing: '-0.02em',
        }}>
          {Math.round(score)}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>out of 100</div>
      </div>

      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        marginTop: '14px', padding: '5px 14px',
        borderRadius: '20px',
        border: `1px solid ${color}33`,
        background: `${color}11`,
      }}>
        <span style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: color, flexShrink: 0,
        }} />
        <span style={{ fontSize: '12px', fontWeight: 500, color, letterSpacing: '0.04em' }}>
          {LEVEL_LABELS[level] || 'Unknown'} stress
        </span>
      </div>

      {dominantFactor && (
        <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text3)' }}>
          Primary driver: <span style={{ color: 'var(--text2)' }}>{dominantFactor}</span>
        </p>
      )}
    </div>
  )
}
