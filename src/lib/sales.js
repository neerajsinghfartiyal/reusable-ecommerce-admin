export const ORDER_STATUS_OPTIONS = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]

export const PAYMENT_STATUS_OPTIONS = [
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
  'cod_pending',
]

export const FULFILLMENT_STATUS_OPTIONS = [
  'unfulfilled',
  'processing',
  'packed',
  'shipped',
  'delivered',
  'returned',
]

export const TRACKING_FILTER_OPTIONS = ['all', 'tracked', 'untracked']

export const RETURN_REQUEST_TYPES = ['return', 'exchange']

export const RETURN_STATUS_OPTIONS = [
  'requested',
  'approved',
  'rejected',
  'received',
  'refunded',
  'exchanged',
  'closed',
]

export const CUSTOMER_STATUS_OPTIONS = ['active', 'inactive']

export const getNumberValue = (...values) => {
  for (const value of values) {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) return parsed
  }

  return 0
}

export const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(getNumberValue(value))

export const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

export const formatFilterOptionLabel = (value, allLabel) => {
  if (value === 'all') return allLabel

  return String(value)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export const extractPayloadData = (response) =>
  response?.data?.data ?? response?.data ?? response ?? {}

export const extractFirstArray = (...candidates) => {
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
  }

  return []
}

export const extractList = (response, keys = []) => {
  const payload = extractPayloadData(response)

  return extractFirstArray(
    ...keys.map((key) => payload?.[key]),
    payload?.items,
    payload,
    response?.data?.items,
    response?.items,
    response?.data,
    response,
  )
}

export const extractPagination = (response) => {
  const payload = extractPayloadData(response)

  return payload?.pagination || response?.data?.pagination || response?.pagination || {}
}

export const extractEntity = (response, keys = []) => {
  const payload = extractPayloadData(response)

  for (const key of keys) {
    if (payload?.[key] && typeof payload[key] === 'object') {
      return payload[key]
    }
  }

  return payload && typeof payload === 'object' ? payload : {}
}

export const getCustomerDisplayName = (customer = {}, ...fallbacks) =>
  `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() ||
  customer?.name ||
  customer?.email ||
  fallbacks.find((value) => typeof value === 'string' && value.trim()) ||
  'Customer'

export const getCustomerStatus = (customer = {}) => {
  if (typeof customer?.status === 'string') return customer.status.toLowerCase()
  if (typeof customer?.isActive === 'boolean') return customer.isActive ? 'active' : 'inactive'
  return 'active'
}

export const getOrderDisplayNumber = (order = {}, fallback = '-') =>
  order?.orderNumber || order?.invoiceNumber || order?._id || order?.id || fallback

export const deriveLegacyFulfillmentStatus = (orderStatus) => {
  const normalized = String(orderStatus || '').toLowerCase()

  if (normalized === 'processing') return 'processing'
  if (normalized === 'shipped') return 'shipped'
  if (normalized === 'delivered') return 'delivered'

  return 'unfulfilled'
}

export const getOrderFulfillment = (order = {}) => {
  const fulfillment =
    order?.fulfillment && typeof order.fulfillment === 'object' ? order.fulfillment : {}

  return {
    status: fulfillment?.status || deriveLegacyFulfillmentStatus(order?.orderStatus),
    carrier: fulfillment?.carrier || '',
    trackingNumber: fulfillment?.trackingNumber || '',
    trackingUrl: fulfillment?.trackingUrl || '',
    shippedAt: fulfillment?.shippedAt || null,
    deliveredAt: fulfillment?.deliveredAt || null,
    notes: fulfillment?.notes || '',
  }
}

export const hasOrderTracking = (order = {}) =>
  Boolean(String(getOrderFulfillment(order)?.trackingNumber || '').trim())

export const getOrderShipmentAddress = (order = {}) =>
  order?.shippingAddressSnapshot || order?.customer?.address || {}
