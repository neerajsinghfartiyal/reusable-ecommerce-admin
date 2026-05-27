import axiosClient from './axiosClient'

export const getOrders = (params = {}) => axiosClient.get('/api/orders', { params })

export const getOrderById = (id) => axiosClient.get(`/api/orders/${id}`)

export const updateOrderStatus = (id, data) =>
  axiosClient.put(`/api/orders/${id}/status`, data)

export const updatePaymentStatus = (id, data) =>
  axiosClient.put(`/api/orders/${id}/payment-status`, data)

export const updateOrderFulfillment = (id, data) =>
  axiosClient.put(`/api/orders/${id}/fulfillment`, data)

export const syncOrderOperations = async (
  id,
  {
    currentOrderStatus,
    nextOrderStatus,
    currentPaymentStatus,
    nextPaymentStatus,
    notes = '',
    paymentMethod,
    paymentReference,
  } = {},
) => {
  const requests = []

  if (nextOrderStatus && nextOrderStatus !== currentOrderStatus) {
    requests.push(updateOrderStatus(id, { orderStatus: nextOrderStatus, notes }))
  }

  const paymentChanged =
    nextPaymentStatus !== undefined &&
    (nextPaymentStatus !== currentPaymentStatus ||
      paymentMethod !== undefined ||
      paymentReference !== undefined)

  if (paymentChanged) {
    requests.push(
      updatePaymentStatus(id, {
        paymentStatus: nextPaymentStatus,
        paymentMethod,
        paymentReference,
        notes,
      }),
    )
  }

  if (requests.length === 0 && notes.trim()) {
    requests.push(updateOrderStatus(id, { notes }))
  }

  if (requests.length === 0) {
    return null
  }

  const responses = await Promise.all(requests)
  return responses[responses.length - 1]
}
