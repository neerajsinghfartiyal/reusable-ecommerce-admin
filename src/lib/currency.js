import { extractSettingsPayload } from '@/components/admin-shell/branding-config'

export const DEFAULT_CURRENCY_CONFIG = {
  currency: 'USD',
  currencySymbol: '$',
  locale: 'en-US',
}

const CURRENCY_LOCALE_MAP = {
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  INR: 'en-IN',
  CAD: 'en-CA',
  AUD: 'en-AU',
  JPY: 'ja-JP',
  CNY: 'zh-CN',
  CHF: 'de-CH',
  SEK: 'sv-SE',
  NOK: 'nb-NO',
  DKK: 'da-DK',
  SGD: 'en-SG',
  HKD: 'zh-HK',
  NZD: 'en-NZ',
  MXN: 'es-MX',
  BRL: 'pt-BR',
  ZAR: 'en-ZA',
  AED: 'ar-AE',
  SAR: 'ar-SA',
}

const getNumberValue = (...values) => {
  for (const value of values) {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) return parsed
  }

  return 0
}

export const resolveLocaleForCurrency = (currencyCode) => {
  const code = String(currencyCode || DEFAULT_CURRENCY_CONFIG.currency).toUpperCase()
  return CURRENCY_LOCALE_MAP[code] || 'en-US'
}

export const createCurrencyFormatter = (config = DEFAULT_CURRENCY_CONFIG) => {
  const currency = String(config.currency || DEFAULT_CURRENCY_CONFIG.currency).toUpperCase()
  const currencySymbol = config.currencySymbol || DEFAULT_CURRENCY_CONFIG.currencySymbol
  const locale = config.locale || resolveLocaleForCurrency(currency)

  let intlFormatter = null

  try {
    intlFormatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    })
    intlFormatter.format(0)
  } catch {
    intlFormatter = null
  }

  return (value) => {
    const amount = getNumberValue(value)

    if (intlFormatter) {
      try {
        return intlFormatter.format(amount)
      } catch {
        // Fall through to symbol prefix formatting.
      }
    }

    return `${currencySymbol}${amount.toFixed(2)}`
  }
}

let currencySnapshot = { ...DEFAULT_CURRENCY_CONFIG }
const currencyListeners = new Set()

const notifyCurrencyListeners = () => {
  currencyListeners.forEach((listener) => listener())
}

export const getCurrencySnapshot = () => currencySnapshot

export const subscribeCurrency = (listener) => {
  currencyListeners.add(listener)
  return () => currencyListeners.delete(listener)
}

export const applyCurrencyFromSettings = (settings) => {
  const currency = String(settings?.currency || DEFAULT_CURRENCY_CONFIG.currency).toUpperCase()

  currencySnapshot = {
    currency,
    currencySymbol: settings?.currencySymbol || DEFAULT_CURRENCY_CONFIG.currencySymbol,
    locale: resolveLocaleForCurrency(currency),
  }

  notifyCurrencyListeners()
}

export const refreshCurrencyFromApi = async (fetchSettings) => {
  try {
    const response = await fetchSettings()
    applyCurrencyFromSettings(extractSettingsPayload(response))
  } catch {
    // Keep the current snapshot (defaults or last successful load).
  }

  return currencySnapshot
}

export const formatCurrency = (value) => createCurrencyFormatter(currencySnapshot)(value)
