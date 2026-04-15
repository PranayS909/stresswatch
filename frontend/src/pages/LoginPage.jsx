import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export default function LoginPage() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('individual')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const handle = async e => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const err = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password, role)
    setLoading(false)
    if (err) setError(err.message)
    else navigate('/')
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '1rem',
      background: 'radial-gradient(ellipse at 60% 40%, rgba(79,142,247,0.06) 0%, transparent 60%)',
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{
            fontFamily: 'var(--serif)',
            fontSize: '2rem', fontWeight: 400,
            color: 'var(--text)',
            marginBottom: '0.5rem',
          }}>StressWatch</h1>
          <p style={{ color: 'var(--text3)', fontSize: '14px' }}>
            Real-time stress monitoring & management
          </p>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '1.75rem' }}>
            {['signin','signup'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: mode === m ? 'var(--surface2)' : 'transparent',
                color: mode === m ? 'var(--text)' : 'var(--text2)',
                fontSize: '13px', fontWeight: 500,
                transition: 'all 0.15s',
              }}>
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text3)', display: 'block', marginBottom: '6px' }}>
                Email
              </label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: '100%', padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border2)',
                  background: 'var(--bg2)',
                  color: 'var(--text)', fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text3)', display: 'block', marginBottom: '6px' }}>
                Password
              </label>
              <input
                type="password" required value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border2)',
                  background: 'var(--bg2)',
                  color: 'var(--text)', fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text3)', display: 'block', marginBottom: '6px' }}>
                  Role
                </label>
                <select value={role} onChange={e => setRole(e.target.value)} style={{
                  width: '100%', padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border2)',
                  background: 'var(--bg2)',
                  color: 'var(--text)', fontSize: '14px',
                  outline: 'none',
                }}>
                  <option value="individual">Individual</option>
                  <option value="professional">Mental Health Professional</option>
                </select>
              </div>
            )}

            {error && (
              <p style={{ fontSize: '13px', color: 'var(--critical)', padding: '8px 12px', background: 'var(--critical-bg)', borderRadius: 'var(--radius-sm)' }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} style={{
              marginTop: '8px',
              padding: '11px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: '14px', fontWeight: 500,
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.15s',
            }}>
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
