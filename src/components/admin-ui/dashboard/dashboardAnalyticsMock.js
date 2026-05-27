/** Frontend demo analytics — replace with API series when reporting endpoints exist. */

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_LABELS = ['W1', 'W2', 'W3', 'W4']

export const getRevenueSeries = (range = 'weekly') => {
  if (range === 'monthly') {
    return {
      labels: MONTH_LABELS,
      values: [12400, 15800, 14200, 18900],
      growthPercent: 14.2,
      totalLabel: '$61.3k',
    }
  }
  return {
    labels: WEEK_LABELS,
    values: [2100, 2450, 1980, 3120, 2890, 3340, 3680],
    growthPercent: 12.4,
    totalLabel: '$19.6k',
  }
}

export const getOrdersSeries = (range = 'weekly') => {
  if (range === 'monthly') {
    return {
      labels: MONTH_LABELS,
      completed: [42, 51, 48, 63],
      pending: [8, 6, 11, 9],
      growthPercent: 8.1,
    }
  }
  return {
    labels: WEEK_LABELS,
    completed: [12, 15, 11, 18, 16, 21, 24],
    pending: [3, 2, 4, 5, 3, 4, 2],
    growthPercent: 6.8,
  }
}
