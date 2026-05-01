import axiosClient from './axiosClient'

export const getPaymentMethods = (params = {}) =>
  axiosClient.get('/api/payment-methods', { params })

export const getPaymentMethodById = (id) => axiosClient.get(`/api/payment-methods/${id}`)

export const createPaymentMethod = (data) => axiosClient.post('/api/payment-methods', data)

export const updatePaymentMethod = (id, data) =>
  axiosClient.put(`/api/payment-methods/${id}`, data)

export const deletePaymentMethod = (id) => axiosClient.delete(`/api/payment-methods/${id}`)
