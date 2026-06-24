import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { KeyRound, Settings, Shield, Store } from 'lucide-react'
import { getAdminProfile } from '../api/authApi'
import { useAuth } from '../context/useAuth'
import { STORE_SETTINGS_PATH } from '@/components/admin-shell/branding-config'
import AdminAlert from '@/components/admin-ui/AdminAlert'
import AdminPage from '@/components/admin-ui/AdminPage'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import ModuleStatusBadge from '@/components/admin-ui/ModuleStatusBadge'
import PageLoading from '@/components/admin-ui/PageLoading'
import QuickActionCard from '@/components/admin-ui/dashboard/QuickActionCard'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export const PROFILE_PATH = '/profile'

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  editor: 'Editor',
}

const getTextValue = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

const formatRole = (role) => {
  const normalized = getTextValue(role).toLowerCase()
  return ROLE_LABELS[normalized] || getTextValue(role) || '—'
}

const formatDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

const extractAdminProfile = (response) =>
  response?.data?.data?.admin ||
  response?.data?.admin ||
  response?.data?.data ||
  null

const mergeProfile = (contextAdmin, apiAdmin) => {
  const source = apiAdmin || contextAdmin || {}
  const id = source?._id || source?.id || contextAdmin?.id || ''
  const isActive =
    typeof source?.isActive === 'boolean'
      ? source.isActive
      : typeof contextAdmin?.isActive === 'boolean'
        ? contextAdmin.isActive
        : true

  return {
    id: String(id || ''),
    name: getTextValue(source?.name, contextAdmin?.name) || 'Admin User',
    email: getTextValue(source?.email, contextAdmin?.email) || '—',
    role: getTextValue(source?.role, contextAdmin?.role) || 'admin',
    isActive,
    createdAt: source?.createdAt || contextAdmin?.createdAt || null,
    updatedAt: source?.updatedAt || contextAdmin?.updatedAt || null,
  }
}

function ProfileField({ label, value, children }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      {children ? (
        children
      ) : (
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{value}</p>
      )}
    </div>
  )
}

function SecurityRow({ icon: Icon, label, value, detail }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 py-3 last:border-b-0 dark:border-slate-800/80">
      <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200/90 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100">{value}</p>
        {detail ? (
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {detail}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function Profile() {
  const { admin: contextAdmin } = useAuth()
  const location = useLocation()
  const accountSettingsRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState(() => mergeProfile(contextAdmin, null))

  useEffect(() => {
    let cancelled = false

    const loadProfile = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await getAdminProfile()
        if (cancelled) return
        const apiAdmin = extractAdminProfile(response)
        setProfile(mergeProfile(contextAdmin, apiAdmin))
      } catch (err) {
        if (cancelled) return
        setProfile(mergeProfile(contextAdmin, null))
        setError(
          err?.response?.data?.message ||
            'Could not refresh account details. Showing your saved session profile.',
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (location.hash !== '#account-settings' || !accountSettingsRef.current) {
      return
    }
    accountSettingsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash, loading])

  const initials = useMemo(
    () =>
      profile.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('') || 'AD',
    [profile.name],
  )

  if (loading && !contextAdmin) {
    return (
      <AdminPage title="Account" description="Your admin profile and workspace access.">
        <PageLoading message="Loading account details..." />
      </AdminPage>
    )
  }

  return (
    <AdminPage
      title="Account"
      description="Your signed-in admin profile, access level, and workspace shortcuts."
    >
      {error ? (
        <AdminAlert type="warning" title="Limited profile data">
          {error}
        </AdminAlert>
      ) : null}

      <ModuleCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border border-slate-200 dark:border-slate-700">
              <AvatarFallback className="bg-slate-100 text-base font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-1">
              <p className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                {profile.name}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{profile.email}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <ModuleStatusBadge status={profile.role.replace(/_/g, ' ')} type="role" />
                <ModuleStatusBadge
                  status={profile.isActive ? 'active' : 'inactive'}
                  type="account"
                />
              </div>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200/90 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
            <Shield className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
            <span>Signed in to admin workspace</span>
          </div>
        </div>
      </ModuleCard>

      <div className="grid gap-5 lg:grid-cols-3">
        <ModuleCard
          title="Profile information"
          description="Details for your current admin session."
          className="lg:col-span-1"
        >
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <ProfileField label="Display name" value={profile.name} />
            <ProfileField label="Email address" value={profile.email} />
            <ProfileField label="Role" value={formatRole(profile.role)} />
            <ProfileField
              label="Account status"
              value={profile.isActive ? 'Active' : 'Inactive'}
            />
            <ProfileField label="Member since" value={formatDateTime(profile.createdAt)} />
            <ProfileField label="Last updated" value={formatDateTime(profile.updatedAt)} />
          </div>
        </ModuleCard>

        <div
          ref={accountSettingsRef}
          id="account-settings"
          className={cn('scroll-mt-24 lg:col-span-1')}
        >
          <ModuleCard
            title="Security & access"
            description="Sign-in identity and credential management."
          >
            <div className="mt-2">
              <SecurityRow
                icon={Shield}
                label="Sign-in email"
                value={profile.email}
              />
              <SecurityRow
                icon={Settings}
                label="Display name"
                value={profile.name}
              />
              <SecurityRow
                icon={KeyRound}
                label="Password"
                value="Protected"
                detail="Contact a super admin if you need a credential reset."
              />
            </div>
          </ModuleCard>
        </div>

        <ModuleCard
          title="Admin workspace"
          description="Shortcuts for store operations outside your personal account."
          className="lg:col-span-1"
        >
          <div className="mt-4 space-y-3">
            <QuickActionCard
              title="Store Settings"
              description="Branding, contact details, tax, and shipping defaults"
              icon={Store}
              to={STORE_SETTINGS_PATH}
            />
            <QuickActionCard
              title="Admin Users"
              description="Manage team access and roles"
              icon={Shield}
              to="/admin-users"
            />
            <ButtonLinkRow to="/dashboard" label="Back to dashboard" />
          </div>
        </ModuleCard>
      </div>

      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        Profile editing and password changes will be available in a future release.
      </p>
    </AdminPage>
  )
}

function ButtonLinkRow({ to, label }) {
  return (
    <Link
      to={to}
      className="inline-flex text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-100"
    >
      {label}
    </Link>
  )
}

export default Profile
