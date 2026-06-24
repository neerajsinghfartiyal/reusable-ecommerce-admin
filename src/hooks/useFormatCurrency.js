import { useMemo, useSyncExternalStore } from 'react'
import {
  createCurrencyFormatter,
  getCurrencySnapshot,
  subscribeCurrency,
} from '@/lib/currency'

export function useFormatCurrency() {
  const config = useSyncExternalStore(
    subscribeCurrency,
    getCurrencySnapshot,
    getCurrencySnapshot,
  )

  return useMemo(
    () => createCurrencyFormatter(config),
    [config.currency, config.currencySymbol, config.locale],
  )
}

export function useStoreCurrency() {
  return useSyncExternalStore(subscribeCurrency, getCurrencySnapshot, getCurrencySnapshot)
}
