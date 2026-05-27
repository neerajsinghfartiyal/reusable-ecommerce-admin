import { useEffect, useMemo, useState } from 'react'
import { getStoreSettings, updateStoreSettings } from '../api/storeSettingApi'
import { applyBrandingFromSettings, extractSettingsPayload } from '@/components/admin-shell/branding-config'
import {
  assetFromPickerSelection,
  featuredMediaFromUrl,
  MediaPickerModal,
  SelectedImagePreview,
} from '@/components/media-picker'
import AdminAlert from '@/components/admin-ui/AdminAlert'
import AdminField from '@/components/admin-ui/AdminField'
import AdminPage from '@/components/admin-ui/AdminPage'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import ModuleActions from '@/components/admin-ui/ModuleActions'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import ModuleFormGrid from '@/components/admin-ui/ModuleFormGrid'

const getNumberValue = (...values) => {
  for (const value of values) {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return 0
}

const getTextValue = (...values) => {
  for (const value of values) {
    if (typeof value === 'string') return value
  }
  return ''
}

const extractSettings = (response) =>
  response?.data?.data ||
  response?.data?.settings ||
  response?.data ||
  response?.settings ||
  {}

const buildFormFromSettings = (settings) => {
  const address = settings?.address || {}
  const seo = settings?.seo || settings?.seoDefaults || {}
  const social = settings?.social || settings?.socialLinks || {}
  const contact = settings?.contact || {}
  const commerce = settings?.commerce || {}

  return {
    storeName: getTextValue(settings?.storeName, settings?.name),
    storeTagline: getTextValue(settings?.storeTagline, settings?.tagline),
    logoUrl: getTextValue(settings?.logoUrl, settings?.logo),
    faviconUrl: getTextValue(settings?.faviconUrl, settings?.favicon),

    email: getTextValue(settings?.storeEmail, contact?.email, settings?.email),
    phone: getTextValue(settings?.storePhone, contact?.phone, settings?.phone),
    addressLine1: getTextValue(address?.line1, address?.street, settings?.addressLine1),
    addressLine2: getTextValue(address?.line2, settings?.addressLine2),
    city: getTextValue(address?.city, settings?.city),
    state: getTextValue(address?.state, settings?.state),
    country: getTextValue(address?.country, settings?.country),
    postalCode: getTextValue(address?.postalCode, address?.zip, settings?.postalCode),

    currency: getTextValue(settings?.currency, commerce?.currency, 'USD'),
    currencySymbol: getTextValue(settings?.currencySymbol, commerce?.currencySymbol, '$'),
    taxEnabled:
      typeof settings?.taxEnabled === 'boolean'
        ? settings.taxEnabled
        : getNumberValue(settings?.taxPercentage, commerce?.defaultTaxRate, 0) > 0,
    defaultTaxRate: getTextValue(
      String(getNumberValue(settings?.taxPercentage, commerce?.defaultTaxRate, 0)),
    ),
    shippingEnabled:
      typeof settings?.shippingEnabled === 'boolean'
        ? settings.shippingEnabled
        : getNumberValue(settings?.shippingCharge, commerce?.freeShippingThreshold, 0) > 0,
    freeShippingThreshold: getTextValue(
      String(getNumberValue(settings?.shippingCharge, commerce?.freeShippingThreshold, 0)),
    ),

    seoTitle: getTextValue(seo?.title, settings?.seoTitle),
    seoDescription: getTextValue(seo?.description, settings?.seoDescription),
    seoKeywords: Array.isArray(seo?.keywords)
      ? seo.keywords.join(', ')
      : getTextValue(seo?.keywords, settings?.seoKeywords),

    facebook: getTextValue(social?.facebook),
    instagram: getTextValue(social?.instagram),
    linkedin: getTextValue(social?.linkedin),
    twitter: getTextValue(social?.twitter),
    youtube: getTextValue(social?.youtube),
  }
}

function StoreSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [logoPickerOpen, setLogoPickerOpen] = useState(false)
  const [logoPickerTab, setLogoPickerTab] = useState('library')
  const [logoPickerSnapshot, setLogoPickerSnapshot] = useState([])
  const [form, setForm] = useState({
    storeName: '',
    storeTagline: '',
    logoUrl: '',
    faviconUrl: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    currency: 'USD',
    currencySymbol: '$',
    taxEnabled: false,
    defaultTaxRate: '0',
    shippingEnabled: false,
    freeShippingThreshold: '0',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    facebook: '',
    instagram: '',
    linkedin: '',
    twitter: '',
    youtube: '',
  })

  const loadSettings = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await getStoreSettings()
      const settings = extractSettings(response)
      setForm(buildFormFromSettings(settings))
      applyBrandingFromSettings(settings)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load store settings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const logoPreview = useMemo(
    () => featuredMediaFromUrl(form.logoUrl),
    [form.logoUrl],
  )

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const openLogoPicker = (tab) => {
    setLogoPickerSnapshot(logoPreview ? [logoPreview] : [])
    setLogoPickerTab(tab)
    setLogoPickerOpen(true)
  }

  const handleLogoPickerConfirm = (assets) => {
    const selected = Array.isArray(assets) ? assets[0] : assets
    const asset = assetFromPickerSelection(selected)
    if (!asset?.url) return
    handleFieldChange('logoUrl', asset.url)
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    const payload = {
      storeName: form.storeName.trim(),
      storeEmail: form.email.trim(),
      storePhone: form.phone.trim(),
      currency: form.currency.trim(),
      logo: form.logoUrl.trim(),
      address: {
        street: form.addressLine1.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        postalCode: form.postalCode.trim(),
        country: form.country.trim(),
      },
      taxPercentage: form.taxEnabled ? getNumberValue(form.defaultTaxRate, 0) : 0,
      shippingCharge: form.shippingEnabled ? getNumberValue(form.freeShippingThreshold, 0) : 0,

      // Kept for broader compatibility if backend later supports these keys.
      storeTagline: form.storeTagline.trim(),
      faviconUrl: form.faviconUrl.trim(),
      addressLine2: form.addressLine2.trim(),
      currencySymbol: form.currencySymbol.trim(),
      seo: {
        title: form.seoTitle.trim(),
        description: form.seoDescription.trim(),
        keywords: form.seoKeywords
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      },
      social: {
        facebook: form.facebook.trim(),
        instagram: form.instagram.trim(),
        linkedin: form.linkedin.trim(),
        twitter: form.twitter.trim(),
        youtube: form.youtube.trim(),
      },
    }

    setSaving(true)
    try {
      const response = await updateStoreSettings(payload)
      const saved = extractSettingsPayload(response)
      applyBrandingFromSettings({
        ...saved,
        storeName: payload.storeName,
        logo: payload.logo,
      })
      setSuccessMessage('Store settings updated successfully.')
      await loadSettings()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update store settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminPage
      headerMode="compact"
      title="Store Settings"
      description="Manage store identity, contact details, ecommerce preferences, and operational configuration."
    >
      {loading ? (
        <ModuleCard>
          <AdminAlert type="info" title="Loading">
            Loading store settings...
          </AdminAlert>
        </ModuleCard>
      ) : null}

      {error ? (
        <AdminAlert type="error" title="Request failed">
          {error}
        </AdminAlert>
      ) : null}

      {successMessage ? (
        <AdminAlert type="success" title="Success">
          {successMessage}
        </AdminAlert>
      ) : null}

      {!loading ? (
        <form onSubmit={handleSave} className="space-y-4 md:space-y-5">
          <ModuleCard title="Store Identity & Admin Branding">
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              Store name and logo update the admin sidebar and login screen. Admin panel
              subtitle uses the default until the API supports a dedicated field.
            </p>
            <ModuleFormGrid columns={2}>
              <AdminField
                label="Store Name"
                description="Shown in the admin sidebar, login page, and storefront."
              >
                <Input
                  type="text"
                  value={form.storeName}
                  onChange={(event) => handleFieldChange('storeName', event.target.value)}
                />
              </AdminField>

              <AdminField
                label="Store Tagline"
                description="Storefront copy only; not persisted by the API yet (planned)."
              >
                <Input
                  type="text"
                  value={form.storeTagline}
                  onChange={(event) => handleFieldChange('storeTagline', event.target.value)}
                />
              </AdminField>

              <AdminField
                label="Admin Logo"
                description="Used in the sidebar and login. Choose from the media library or paste a URL."
                className="md:col-span-2"
              >
                <div className="space-y-4">
                  <SelectedImagePreview
                    asset={logoPreview}
                    onRemove={() => handleFieldChange('logoUrl', '')}
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button type="button" variant="default" onClick={() => openLogoPicker('library')}>
                      Choose from Media Library
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => openLogoPicker('upload')}>
                      Upload New
                    </Button>
                  </div>
                  <Input
                    type="text"
                    value={form.logoUrl}
                    placeholder="/uploads/media/your-logo.png"
                    onChange={(event) => handleFieldChange('logoUrl', event.target.value)}
                  />
                </div>
                <MediaPickerModal
                  open={logoPickerOpen}
                  onOpenChange={setLogoPickerOpen}
                  mode="single"
                  mediaType="image"
                  maxSelection={1}
                  initialTab={logoPickerTab}
                  selectedAssets={logoPickerSnapshot}
                  onConfirm={handleLogoPickerConfirm}
                  uploadAccept="image/*"
                  defaultFolder="general"
                  title="Store logo"
                  description="Select one image for admin and store branding."
                />
              </AdminField>

              <AdminField
                label="Favicon URL"
                description="Browser tab icon; not used in admin branding yet."
              >
                <Input
                  type="text"
                  value={form.faviconUrl}
                  onChange={(event) => handleFieldChange('faviconUrl', event.target.value)}
                />
              </AdminField>
            </ModuleFormGrid>
          </ModuleCard>

          <ModuleCard title="Contact Information">
            <ModuleFormGrid columns={2}>
              <AdminField label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => handleFieldChange('email', event.target.value)}
                />
              </AdminField>

              <AdminField label="Phone">
                <Input
                  type="text"
                  value={form.phone}
                  onChange={(event) => handleFieldChange('phone', event.target.value)}
                />
              </AdminField>

              <AdminField label="Address Line 1">
                <Input
                  type="text"
                  value={form.addressLine1}
                  onChange={(event) => handleFieldChange('addressLine1', event.target.value)}
                />
              </AdminField>

              <AdminField label="Address Line 2">
                <Input
                  type="text"
                  value={form.addressLine2}
                  onChange={(event) => handleFieldChange('addressLine2', event.target.value)}
                />
              </AdminField>

              <AdminField label="City">
                <Input
                  type="text"
                  value={form.city}
                  onChange={(event) => handleFieldChange('city', event.target.value)}
                />
              </AdminField>

              <AdminField label="State">
                <Input
                  type="text"
                  value={form.state}
                  onChange={(event) => handleFieldChange('state', event.target.value)}
                />
              </AdminField>

              <AdminField label="Country">
                <Input
                  type="text"
                  value={form.country}
                  onChange={(event) => handleFieldChange('country', event.target.value)}
                />
              </AdminField>

              <AdminField label="Postal Code">
                <Input
                  type="text"
                  value={form.postalCode}
                  onChange={(event) => handleFieldChange('postalCode', event.target.value)}
                />
              </AdminField>
            </ModuleFormGrid>
          </ModuleCard>

          <ModuleCard title="Commerce Settings">
            <ModuleFormGrid columns={2}>
              <AdminField label="Currency">
                <Input
                  type="text"
                  value={form.currency}
                  onChange={(event) => handleFieldChange('currency', event.target.value)}
                />
              </AdminField>

              <AdminField label="Currency Symbol">
                <Input
                  type="text"
                  value={form.currencySymbol}
                  onChange={(event) => handleFieldChange('currencySymbol', event.target.value)}
                />
              </AdminField>

              <AdminField label="Tax Enabled" className="md:col-span-2">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Checkbox
                    checked={form.taxEnabled}
                    onCheckedChange={(checked) =>
                      handleFieldChange('taxEnabled', checked === true)
                    }
                  />
                  Tax Enabled
                </label>
              </AdminField>

              <AdminField label="Default Tax Rate">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.defaultTaxRate}
                  onChange={(event) => handleFieldChange('defaultTaxRate', event.target.value)}
                />
              </AdminField>

              <AdminField label="Shipping Enabled" className="md:col-span-2">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Checkbox
                    checked={form.shippingEnabled}
                    onCheckedChange={(checked) =>
                      handleFieldChange('shippingEnabled', checked === true)
                    }
                  />
                  Shipping Enabled
                </label>
              </AdminField>

              <AdminField label="Free Shipping Threshold">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.freeShippingThreshold}
                  onChange={(event) =>
                    handleFieldChange('freeShippingThreshold', event.target.value)
                  }
                />
              </AdminField>
            </ModuleFormGrid>
          </ModuleCard>

          <ModuleCard title="SEO Defaults">
            <ModuleFormGrid columns={2}>
              <AdminField label="SEO Title" className="md:col-span-2">
                <Input
                  type="text"
                  value={form.seoTitle}
                  onChange={(event) => handleFieldChange('seoTitle', event.target.value)}
                />
              </AdminField>

              <AdminField label="SEO Description" className="md:col-span-2">
                <Textarea
                  rows={3}
                  value={form.seoDescription}
                  onChange={(event) => handleFieldChange('seoDescription', event.target.value)}
                />
              </AdminField>

              <AdminField
                label="SEO Keywords"
                description="Comma separated"
                className="md:col-span-2"
              >
                <Input
                  type="text"
                  value={form.seoKeywords}
                  onChange={(event) => handleFieldChange('seoKeywords', event.target.value)}
                  placeholder="keyword1, keyword2"
                />
              </AdminField>
            </ModuleFormGrid>
          </ModuleCard>

          <ModuleCard title="Social Links">
            <ModuleFormGrid columns={2}>
              <AdminField label="Facebook">
                <Input
                  type="text"
                  value={form.facebook}
                  onChange={(event) => handleFieldChange('facebook', event.target.value)}
                />
              </AdminField>

              <AdminField label="Instagram">
                <Input
                  type="text"
                  value={form.instagram}
                  onChange={(event) => handleFieldChange('instagram', event.target.value)}
                />
              </AdminField>

              <AdminField label="LinkedIn">
                <Input
                  type="text"
                  value={form.linkedin}
                  onChange={(event) => handleFieldChange('linkedin', event.target.value)}
                />
              </AdminField>

              <AdminField label="Twitter">
                <Input
                  type="text"
                  value={form.twitter}
                  onChange={(event) => handleFieldChange('twitter', event.target.value)}
                />
              </AdminField>

              <AdminField label="YouTube">
                <Input
                  type="text"
                  value={form.youtube}
                  onChange={(event) => handleFieldChange('youtube', event.target.value)}
                />
              </AdminField>
            </ModuleFormGrid>
          </ModuleCard>

          <ModuleActions className="justify-end">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </ModuleActions>
        </form>
      ) : null}
    </AdminPage>
  )
}

export default StoreSettings
