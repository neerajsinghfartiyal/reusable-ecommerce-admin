import axiosClient from './axiosClient'

export const getAttributes = (params = {}) =>
  axiosClient.get('/api/attributes', { params })

export const getAttributeById = (id) => axiosClient.get(`/api/attributes/${id}`)

export const createAttribute = (data) => axiosClient.post('/api/attributes', data)

export const updateAttribute = (id, data) => axiosClient.put(`/api/attributes/${id}`, data)

export const deleteAttribute = (id) => axiosClient.delete(`/api/attributes/${id}`)
