import axiosClient from './axiosClient'

export const getBrands = (params = {}) => axiosClient.get('/api/brands', { params })

export const createBrand = (data) => axiosClient.post('/api/brands', data)

export const updateBrand = (id, data) => axiosClient.put(`/api/brands/${id}`, data)

export const deleteBrand = (id) => axiosClient.delete(`/api/brands/${id}`)
