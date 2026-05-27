import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2,
  Lock,
  Mail,
  Moon,
  Shield,
  Sparkles,
  Sun,
  Users,
} from 'lucide-react'
import { getPublicStoreSettings } from '../api/storeSettingApi'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import BrandMark from '@/components/admin-shell/BrandMark'
import { refreshBrandingFromApi, useBranding } from '@/components/admin-shell/branding-config'
import { cn } from '@/lib/utils'

const isDevEnvironment = import.meta.env.DEV

const LOGIN_FEATURES = [
  { icon: Sparkles, label: 'Catalog & order operations' },
  { icon: Shield, label: 'Role-based admin access' },
  { icon: Users, label: 'Built for modern commerce teams' },
]

const LOGIN_TRUST_ITEMS = [
  'Secure admin workspace',
  'Role-based access controls',
  'Built for modern commerce operations',
]

function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const branding = useBranding()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    refreshBrandingFromApi(getPublicStoreSettings)
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      const message =
        err?.response?.data?.message || 'Login failed. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page-shell">
      <div className="login-ambient login-ambient-a" aria-hidden />
      <div className="login-ambient login-ambient-b" aria-hidden />

      <button
        type="button"
        className="login-theme-toggle"
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <div className="login-page-layout">
        <section className="login-brand-panel" aria-label="Store branding">
          <div className="login-brand-panel-inner">
            <div className="login-brand-hero">
              <BrandMark branding={branding} size="md" showInitials className="login-brand-logo" />
              <div className="min-w-0">
                <p className="login-brand-title">{branding.brandName}</p>
                <p className="login-brand-subtitle">{branding.brandSubtitle}</p>
              </div>
            </div>

            <p className="login-brand-tagline hidden sm:block">{branding.tagline}</p>

            <div className="login-brand-chips hidden lg:flex" aria-label="Platform highlights">
              {LOGIN_FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} className="login-brand-chip">
                  <span className="login-brand-chip-icon" aria-hidden>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="login-auth-panel">
          <div className="login-auth-card">
            <div className="login-auth-mobile-brand lg:hidden">
              <BrandMark branding={branding} size="md" showInitials />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {branding.brandName}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {branding.brandSubtitle}
                </p>
              </div>
            </div>

            <div className="login-auth-header">
              <h1 className="login-auth-title">{branding.loginHeadline}</h1>
              <p className="login-auth-subtitle">{branding.loginSupportingCopy}</p>
            </div>

            <form onSubmit={handleSubmit} className="login-auth-form" noValidate>
              <div className="login-field">
                <label htmlFor="email" className="login-label">
                  Email address
                </label>
                <div className="login-input-wrap">
                  <Mail className="login-input-icon" aria-hidden />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    className="login-input login-input-with-icon"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@company.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="password" className="login-label">
                  Password
                </label>
                <div className="login-input-wrap">
                  <Lock className="login-input-icon" aria-hidden />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    className="login-input login-input-with-icon"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {error ? (
                <p className="login-error" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                className={cn('login-submit', loading && 'login-submit-loading')}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Signing in…
                  </>
                ) : (
                  'Sign in to dashboard'
                )}
              </button>
            </form>

            <footer className="login-trust-footer" aria-label="Trust and security">
              <ul className="login-trust-list">
                {LOGIN_TRUST_ITEMS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </footer>

            {isDevEnvironment ? (
              <details className="login-dev-hint">
                <summary>Development sign-in</summary>
                <p className="login-dev-hint-text">
                  Local defaults (if seeded): <code>admin@example.com</code> /{' '}
                  <code>admin123</code>
                </p>
              </details>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}

export default Login
