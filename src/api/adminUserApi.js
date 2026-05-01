import axiosClient from './axiosClient'

export const getAdminUsers = (params = {}) => axiosClient.get('/api/admins', { params })

export const getAdminUserById = (id) => axiosClient.get(`/api/admins/${id}`)

export const createAdminUser = (data) => axiosClient.post('/api/admins', data)

export const updateAdminUser = (id, data) => axiosClient.put(`/api/admins/${id}`, data)

export const deleteAdminUser = (id) => axiosClient.delete(`/api/admins/${id}`)
