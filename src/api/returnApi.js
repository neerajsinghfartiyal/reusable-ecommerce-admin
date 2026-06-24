import axiosClient from './axiosClient'

export const getReturnRequests = (params = {}) =>
  axiosClient.get('/api/returns', { params })

export const getReturnRequestById = (id) => axiosClient.get(`/api/returns/${id}`)

export const createReturnRequest = (data) => axiosClient.post('/api/returns', data)

export const updateReturnRequestStatus = (id, data) =>
  axiosClient.put(`/api/returns/${id}/status`, data)

export const closeReturnRequest = (id) => axiosClient.delete(`/api/returns/${id}`)

export const createReplacementOrder = (id) =>
  axiosClient.post(`/api/returns/${id}/replacement-order`)

export const linkReplacementOrder = (id, replacementOrderId) =>
  axiosClient.put(`/api/returns/${id}/replacement-order`, { replacementOrderId })
