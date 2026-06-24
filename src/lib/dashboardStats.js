const getNumberValue = (...values) => {
  for (const value of values) {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return 0
}

const extractList = (value) => (Array.isArray(value) ? value : [])

/**
 * Canonical dashboard stats shape returned by GET /api/dashboard/stats.
 */
export const EMPTY_DASHBOARD_STATS = {
  totalProducts: 0,
  totalCustomers: 0,
  totalOrders: 0,
  revenue: 0,
  pendingOrders: 0,
  processingOrders: 0,
  shippedOrders: 0,
  returnRequests: 0,
  lowStockCount: 0,
  lowStockThreshold: 10,
  recentOrders: [],
  lowStockProducts: [],
  recentActivity: [],
}

export const parseDashboardStats = (response) => {
  const payload = response?.data?.data || response?.data || {}

  return {
    totalProducts: getNumberValue(payload.totalProducts),
    totalCustomers: getNumberValue(payload.totalCustomers),
    totalOrders: getNumberValue(payload.totalOrders),
    revenue: getNumberValue(payload.revenue, payload.totalRevenue),
    pendingOrders: getNumberValue(payload.pendingOrders),
    processingOrders: getNumberValue(payload.processingOrders),
    shippedOrders: getNumberValue(payload.shippedOrders),
    returnRequests: getNumberValue(payload.returnRequests, payload.returnRequestsCount),
    lowStockCount: getNumberValue(payload.lowStockCount),
    lowStockThreshold: getNumberValue(payload.lowStockThreshold, 10),
    recentOrders: extractList(payload.recentOrders).slice(0, 5),
    lowStockProducts: extractList(payload.lowStockProducts).slice(0, 5),
    recentActivity: extractList(payload.recentActivity).slice(0, 5),
  }
}
