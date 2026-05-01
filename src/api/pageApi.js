import axiosClient from './axiosClient'

export const getPages = (params = {}) => axiosClient.get('/api/pages', { params })

export const getPageById = (id) => axiosClient.get(`/api/pages/${id}`)

export const createPage = (data) => axiosClient.post('/api/pages', data)

export const updatePage = (id, data) => axiosClient.put(`/api/pages/${id}`, data)

export const deletePage = (id) => axiosClient.delete(`/api/pages/${id}`)
