import axiosClient from './axiosClient'

export const getShippingMethods = (params = {}) =>
  axiosClient.get('/api/shipping-methods', { params })

export const getShippingMethodById = (id) => axiosClient.get(`/api/shipping-methods/${id}`)

export const createShippingMethod = (data) => axiosClient.post('/api/shipping-methods', data)

export const updateShippingMethod = (id, data) =>
  axiosClient.put(`/api/shipping-methods/${id}`, data)

export const deleteShippingMethod = (id) => axiosClient.delete(`/api/shipping-methods/${id}`)
