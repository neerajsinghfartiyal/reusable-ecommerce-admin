import { useEffect, useState } from 'react'
import { getStoreSettings, updateStoreSettings } from '../api/storeSettingApi'
import PageHeader from '../components/ui/PageHeader'
import AdminCard from '../components/ui/AdminCard'
import ActionButton from '../components/ui/ActionButton'

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
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load store settings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
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
      await updateStoreSettings(payload)
      setSuccessMessage('Store settings updated successfully.')
      await loadSettings()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update store settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <PageHeader
        title="Store Settings"
        subtitle="Manage store identity, contact details, commerce settings, and SEO defaults."
      />

      {loading ? (
        <div className="status-card">
          <p className="status-text">Loading store settings...</p>
        </div>
      ) : null}

      {error ? (
        <div className="status-card status-card-error">
          <p className="status-text">{error}</p>
        </div>
      ) : null}

      {successMessage ? (
        <div className="info-alert">
          <p className="status-text">{successMessage}</p>
        </div>
      ) : null}

      {!loading ? (
        <form onSubmit={handleSave} className="store-settings-form">
          <AdminCard title="Store Identity" className="store-settings-card">
            <div className="product-form-grid">
              <div className="field-group">
                <label className="field-label">Store Name</label>
                <input
                  type="text"
                  className="field-input"
                  value={form.storeName}
                  onChange={(event) => handleFieldChange('storeName', event.target.value)}
                />
              </div>
              <div className="field-group">
                <label className="field-label">Store Tagline</label>
                <input
                  type="text"
                  className="field-input"
                  value={form.storeTagline}
                  onChange={(event) => handleFieldChange('storeTagline', event.target.value)}
                />
              </div>
              <div className="field-group">
                <label className="field-label">Logo URL</label>
                <input
                  type="text"
                  className="field-input"
                  value={form.logoUrl}
                  onChange={(event) => handleFieldChange('logoUrl', event.target.value)}
                />
              </div>
              <div className="field-group">
                <label className="field-label">Favicon URL</label>
                <input
                  type="text"
                  className="field-input"
                  value={form.faviconUrl}
                  onChange={(event) => handleFieldChange('faviconUrl', event.target.value)}
                />
              </div>
            </div>
          </AdminCard>

          <AdminCard title="Contact Information" className="store-settings-card">
            <div className="product-form-grid">
              <div className="field-group">
                <label className="field-label">Email</label>
                <input
                  type="email"
                  className="field-input"
                  value={form.email}
                  onChange={(event) => handleFieldChange('email', event.target.value)}
                />
              </div>
              <div className="field-group">
                <label className="field-label">Phone</label>
                <input
                  type="text"
                  className="field-input"
                  value={form.phone}
                  onChange={(event) => handleFieldChange('phone', event.target.value)}
                />
              </div>
              <div className="field-group">
                <label className="field-label">Address Line 1</label>
                <input
                  type="text"
                  className="field-input"
                  value={form.addressLine1}
                  onChange={(event) => handleFieldChange('addressLine1', event.target.value)}
                />
              </div>
              <div className="field-group">
                <label className="field-label">Address Line 2</label>
                <input
                  type="text"
                  className="field-input"
                  value={form.addressLine2}
                  onChange={(event) => handleFieldChange('addressLine2', event.target.value)}
                />
              </div>
              <div className="field-group">
                <label className="field-label">City</label>
                <input
                  type="text"
                  className="field-input"
                  value={form.city}
                  onChange={(event) => handleFieldChange('city', event.target.value)}
                />
              </div>
              <div className="field-group">
                <label className="field-label">State</label>
                <input
                  type="text"
                  className="field-input"
                  value={form.state}
                  onChange={(event) => handleFieldChange('state', event.target.value)}
                />
              </div>
              <div className="field-group">
                <label className="field-label">Country</label>
                <input
                  type="text"
                  className="field-input"
                  value={form.country}
                  onChange={(event) => handleFieldChange('country', event.target.value)}
                />
              </div>
              <div className="field-group">
                <label className="field-label">Postal Code</label>
                <input
                  type="text"
                  className="field-input"
                  value={form.postalCode}
                  onChange={(event) => handleFieldChange('postalCode', event.target.value)}
                />
              </div>
            </div>
          </AdminCard>

          <AdminCard title="Commerce Settings" className="store-settings-card">
            <div className="product-form-grid">
              <div className="field-group">
                <label className="field-label">Currency</label>
                <input
                  type="text"
                  className="field-input"
                  value={form.currency}
                  onChange={(event) => handleFieldChange('currency', event.target.value)}
                />
              </div>
              <div className="field-group">
                <label className="field-label">Currency Symbol</label>
                <input
                  type="text"
                  className="field-input"
                  value={form.currencySymbol}
                  onChange={(event) => handleFieldChange('currencySymbol', event.target.value)}
                />
              </div>
              <div className="field-group field-group-full">
                <label className="setup-checkbox">
                  <input
                    type="checkbox"
                    checked={form.taxEnabled}
                    onChange={(event) => handleFieldChange('taxEnabled', event.target.checked)}
                  />
                  Tax Enabled
                </label>
              </div>
              <div className="field-group">
                <label className="field-label">Default Tax Rate</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="field-input"
                  value={form.defaultTaxRate}
                  onChange={(event) => handleFieldChange('defaultTaxRate', event.target.value)}
                />
              </div>
              <div className="field-group field-group-full">
                <label className="setup-checkbox">
                  <input
                    type="checkbox"
                    checked={form.shippingEnabled}
                    onChange={(event) =>
                      handleFieldChange('shippingEnabled', event.target.checked)
                    }
                  />
                  Shipping Enabled
                </label>
              </div>
              <div className="field-group">
                <label className="field-label">Free Shipping Threshold</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="field-input"
                  value={form.freeShippingThreshold}
                  onChange={(event) =>
                    handleFieldChange('freeShippingThreshold', event.target.value)
                  }
                />
              </div>
            </div>
          </AdminCard>

          <AdminCard title="SEO Defaults" className="store-settings-card">
            <div className="product-form-grid">
              <div className="field-group field-group-full">
                <label className="field-label">SEO Title</label>
                <input
                  type="text"
                  className="field-input"
                  value={form.seoTitle}
                  onChange={(event) => handleFieldChange('seoTitle', event.target.value)}
                />
              </div>
              <div className="field-group field-group-full">
                <label className="field-label">SEO Description</label>
                <textarea
                  className="field-input field-textarea"
                  rows={3}
                  value={form.seoDescription}
                  onChange={(event) => handleFieldChange('seoDescription', event.target.value)}
                />
              </div>
              <div className="field-group field-group-full">
                <label className="field-label">SEO Keywords</label>
                <input
                  type="text"
                  className="field-input"
                  value={form.seoKeywords}
                  onChange={(event) => handleFieldChange('seoKeywords', event.target.value)}
                  placeholder="keyword1, keyword2"
                />
              </div>
            </div>
          </AdminCard>

          <AdminCard title="Social Links" className="store-settings-card">
            <div className="product-form-grid">
              <div className="field-group">
                <label className="field-label">Facebook</label>
                <input
                  type="text"
                  className="field-input"
                  value={form.facebook}
                  onChange={(event) => handleFieldChange('facebook', event.target.value)}
                />
              </div>
              <div className="field-group">
                <label className="field-label">Instagram</label>
                <input
                  type="text"
                  className="field-input"
                  value={form.instagram}
                  onChange={(event) => handleFieldChange('instagram', event.target.value)}
                />
              </div>
              <div className="field-group">
                <label className="field-label">LinkedIn</label>
                <input
                  type="text"
                  className="field-input"
                  value={form.linkedin}
                  onChange={(event) => handleFieldChange('linkedin', event.target.value)}
                />
              </div>
              <div className="field-group">
                <label className="field-label">Twitter</label>
                <input
                  type="text"
                  className="field-input"
                  value={form.twitter}
                  onChange={(event) => handleFieldChange('twitter', event.target.value)}
                />
              </div>
              <div className="field-group">
                <label className="field-label">YouTube</label>
                <input
                  type="text"
                  className="field-input"
                  value={form.youtube}
                  onChange={(event) => handleFieldChange('youtube', event.target.value)}
                />
              </div>
            </div>
          </AdminCard>

          <div className="form-actions">
            <ActionButton type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </ActionButton>
          </div>
        </form>
      ) : null}
    </section>
  )
}

export default StoreSettings
