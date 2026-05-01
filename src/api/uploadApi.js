import axiosClient from './axiosClient'

export const uploadProductImages = (formData) =>
  axiosClient.post('/api/uploads/products', formData)
