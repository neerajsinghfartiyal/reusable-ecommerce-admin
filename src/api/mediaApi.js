import axiosClient from './axiosClient'

export const getMedia = (params = {}) => axiosClient.get('/api/media', { params })

export const getMediaById = (id) => axiosClient.get(`/api/media/${id}`)

export const getMediaUsage = (id) => axiosClient.get(`/api/media/${id}/usage`)

export const uploadMedia = (formData) => axiosClient.post('/api/media/upload', formData)

export const updateMedia = (id, data) => axiosClient.put(`/api/media/${id}`, data)

export const deleteMedia = (id) => axiosClient.delete(`/api/media/${id}`)
