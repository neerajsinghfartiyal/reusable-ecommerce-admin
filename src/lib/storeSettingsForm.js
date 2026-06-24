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

export const extractStoreSettings = (response) =>
  response?.data?.data ||
  response?.data?.settings ||
  response?.data ||
  response?.settings ||
  {}

export const buildStoreSettingsForm = (settings = {}) => {
  const address = settings?.address || {}
  const seo = settings?.seo || {}
  const social = settings?.social || {}

  return {
    storeName: getTextValue(settings?.storeName),
    storeTagline: getTextValue(settings?.storeTagline),
    logoUrl: getTextValue(settings?.logoUrl, settings?.logo),
    faviconUrl: getTextValue(settings?.faviconUrl, settings?.favicon),

    email: getTextValue(settings?.storeEmail),
    phone: getTextValue(settings?.storePhone),
    addressLine1: getTextValue(address?.street, address?.line1),
    addressLine2: getTextValue(address?.line2),
    city: getTextValue(address?.city),
    state: getTextValue(address?.state),
    country: getTextValue(address?.country),
    postalCode: getTextValue(address?.postalCode),

    currency: getTextValue(settings?.currency, 'USD'),
    currencySymbol: getTextValue(settings?.currencySymbol, '$'),
    taxEnabled: Boolean(settings?.taxEnabled),
    defaultTaxRate: getTextValue(String(getNumberValue(settings?.taxPercentage, 0))),
    shippingEnabled: Boolean(settings?.shippingEnabled),
    freeShippingThreshold: getTextValue(
      String(getNumberValue(settings?.freeShippingThreshold, settings?.shippingCharge, 0)),
    ),
    maintenanceMode: Boolean(settings?.maintenanceMode),

    seoTitle: getTextValue(seo?.title),
    seoDescription: getTextValue(seo?.description),
    seoKeywords: Array.isArray(seo?.keywords) ? seo.keywords.join(', ') : '',

    facebook: getTextValue(social?.facebook),
    instagram: getTextValue(social?.instagram),
    linkedin: getTextValue(social?.linkedin),
    twitter: getTextValue(social?.twitter),
    youtube: getTextValue(social?.youtube),
  }
}

export const buildStoreSettingsPayload = (form = {}) => ({
  storeName: form.storeName?.trim() || '',
  storeTagline: form.storeTagline?.trim() || '',
  storeEmail: form.email?.trim() || '',
  storePhone: form.phone?.trim() || '',
  currency: form.currency?.trim() || 'USD',
  currencySymbol: form.currencySymbol?.trim() || '$',
  logo: form.logoUrl?.trim() || '',
  favicon: form.faviconUrl?.trim() || '',
  address: {
    street: form.addressLine1?.trim() || '',
    line2: form.addressLine2?.trim() || '',
    city: form.city?.trim() || '',
    state: form.state?.trim() || '',
    postalCode: form.postalCode?.trim() || '',
    country: form.country?.trim() || '',
  },
  taxEnabled: Boolean(form.taxEnabled),
  taxPercentage: form.taxEnabled ? getNumberValue(form.defaultTaxRate, 0) : 0,
  shippingEnabled: Boolean(form.shippingEnabled),
  freeShippingThreshold: form.shippingEnabled ? getNumberValue(form.freeShippingThreshold, 0) : 0,
  maintenanceMode: Boolean(form.maintenanceMode),
  seo: {
    title: form.seoTitle?.trim() || '',
    description: form.seoDescription?.trim() || '',
    keywords: String(form.seoKeywords || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  },
  social: {
    facebook: form.facebook?.trim() || '',
    instagram: form.instagram?.trim() || '',
    linkedin: form.linkedin?.trim() || '',
    twitter: form.twitter?.trim() || '',
    youtube: form.youtube?.trim() || '',
  },
})

export const EMPTY_STORE_SETTINGS_FORM = buildStoreSettingsForm({})
