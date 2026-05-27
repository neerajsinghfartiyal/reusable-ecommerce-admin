import axiosClient from './axiosClient'

export const getProducts = (params = {}) =>
  axiosClient.get('/api/products', { params })

export const getProductById = (id) => axiosClient.get(`/api/products/${id}`)

export const createProduct = (data) => axiosClient.post('/api/products', data)

export const updateProduct = (id, data) =>
  axiosClient.put(`/api/products/${id}`, data)

export const deleteProduct = (id) => axiosClient.delete(`/api/products/${id}`)

export const bulkUpdateProducts = (payload) =>
  axiosClient.patch('/api/products/bulk', payload)
