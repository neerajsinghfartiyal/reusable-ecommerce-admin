import axiosClient from './axiosClient'

export const getRedirects = (params = {}) => axiosClient.get('/api/redirects', { params })

export const getRedirectById = (id) => axiosClient.get(`/api/redirects/${id}`)

export const createRedirect = (data) => axiosClient.post('/api/redirects', data)

export const updateRedirect = (id, data) => axiosClient.put(`/api/redirects/${id}`, data)

export const deleteRedirect = (id) => axiosClient.delete(`/api/redirects/${id}`)

export const lookupRedirect = (path) =>
  axiosClient.get('/api/redirects/lookup', { params: { path } })
