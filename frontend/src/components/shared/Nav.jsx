import { NavLink } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'

const links = [
  { to: '/',         label: 'Monitor' },
  { to: '/history',  label: 'History' },
  { to: '/insights', label: 'Insights' },
]

export default function Nav() {
  const { profile } = useAuth()

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: 'var(--nav-height)',
      background: 'rgba(13,15,20,0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 1.5rem',
    }}>
      <span style={{
        fontFamily: 'var(--serif)',
        fontSize: '1.1rem',
        fontWeight: 400,
        color: 'var(--text)',
        marginRight: '2.5rem',
        letterSpacing: '-0.01em',
      }}>
        StressWatch
      </span>

      <nav style={{ display: 'flex', gap: '0.25rem', flex: 1 }}>
        {links.map(l => (
          <NavLink key={l.to} to={l.to} end={l.to === '/'} style={({ isActive }) => ({
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            fontWeight: 500,
            textDecoration: 'none',
            color: isActive ? 'var(--text)' : 'var(--text2)',
            background: isActive ? 'var(--surface)' : 'transparent',
            transition: 'all 0.15s',
          })}>
            {l.label}
          </NavLink>
        ))}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {profile?.role && (
          <span style={{
            fontSize: '11px', color: 'var(--text3)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {profile.role}
          </span>
        )}
      </div>
    </header>
  )
}
