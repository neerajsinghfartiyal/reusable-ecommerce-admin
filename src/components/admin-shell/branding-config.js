/**
 * Admin branding defaults + runtime merge from Store Settings (Branding-2).
 * Persisted on server today: storeName, logo (via PUT /api/settings).
 * Planned: storeTagline, favicon, darkLogoUrl, Media Library logo picker sync.
 */

import { useSyncExternalStore } from 'react'

export const DEFAULT_BRANDING = {
  brandName: 'Reusable Admin',
  brandSubtitle: 'Ecommerce CMS',
  tagline: 'Manage catalog, orders, and store operations in one place.',
  logoUrl: '',
  darkLogoUrl: '',
  iconFallback: 'store',
  initials: 'RA',
  loginHeadline: 'Sign in to your workspace',
  loginSupportingCopy: 'Use your admin credentials to access the dashboard.',
}

/** @deprecated Use DEFAULT_BRANDING or useBranding() */
export const BRANDING = DEFAULT_BRANDING

export const STORE_SETTINGS_PATH = '/settings'

const getTextValue = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

export const extractSettingsPayload = (response) =>
  response?.data?.data ||
  response?.data?.settings ||
  response?.data ||
  response?.settings ||
  response ||
  {}

export const getBrandInitials = (brandName, fallback = DEFAULT_BRANDING.initials) => {
  const parts = String(brandName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (!parts.length) {
    return fallback
  }

  return (
    parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || fallback
  )
}

/**
 * Merge API store settings into display branding (safe fallbacks).
 * @param {object|null|undefined} settings
 */
export const resolveBrandingFromSettings = (settings) => {
  const storeName = getTextValue(settings?.storeName, settings?.name)
  const logoUrl = getTextValue(settings?.logoUrl, settings?.logo)
  const brandName = storeName || DEFAULT_BRANDING.brandName

  return {
    ...DEFAULT_BRANDING,
    brandName,
    brandSubtitle: DEFAULT_BRANDING.brandSubtitle,
    logoUrl,
    darkLogoUrl: getTextValue(settings?.darkLogoUrl) || '',
    initials: getBrandInitials(brandName, DEFAULT_BRANDING.initials),
    tagline: storeName
      ? `Manage ${storeName} catalog, orders, and store operations in one place.`
      : DEFAULT_BRANDING.tagline,
  }
}

let brandingSnapshot = resolveBrandingFromSettings(null)
const brandingListeners = new Set()

const notifyBrandingListeners = () => {
  brandingListeners.forEach((listener) => listener())
}

export const getBrandingSnapshot = () => brandingSnapshot

export const subscribeBranding = (listener) => {
  brandingListeners.add(listener)
  return () => brandingListeners.delete(listener)
}

export const applyBrandingFromSettings = (settings) => {
  brandingSnapshot = resolveBrandingFromSettings(settings)
  notifyBrandingListeners()
}

/**
 * @param {() => Promise<unknown>} fetchSettings
 */
export const refreshBrandingFromApi = async (fetchSettings) => {
  try {
    const response = await fetchSettings()
    applyBrandingFromSettings(extractSettingsPayload(response))
  } catch {
    // Keep current snapshot (defaults or last successful load).
  }
  return brandingSnapshot
}

export const useBranding = () =>
  useSyncExternalStore(subscribeBranding, getBrandingSnapshot, getBrandingSnapshot)

/**
 * @param {boolean} isDark
 * @param {{ logoUrl?: string, darkLogoUrl?: string }} [branding]
 */
export const getBrandLogoUrl = (isDark, branding = brandingSnapshot) => {
  if (isDark && branding?.darkLogoUrl) {
    return branding.darkLogoUrl
  }
  return branding?.logoUrl || ''
}

/**
 * @param {string} url
 */
export const resolveBrandAssetUrl = (url) => {
  const trimmed = String(url || '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
  return `${baseUrl}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`
}
