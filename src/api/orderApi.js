import axiosClient from './axiosClient'

export const getOrders = (params = {}) => axiosClient.get('/api/orders', { params })

export const getOrderById = (id) => axiosClient.get(`/api/orders/${id}`)

export const updateOrderStatus = (id, data) =>
  axiosClient.put(`/api/orders/${id}/status`, data)

export const updatePaymentStatus = (id, data) =>
  axiosClient.put(`/api/orders/${id}/payment-status`, data)
