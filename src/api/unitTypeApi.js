import axiosClient from './axiosClient'

export const getUnitTypes = (params = {}) =>
  axiosClient.get('/api/unit-types', { params })

export const createUnitType = (data) => axiosClient.post('/api/unit-types', data)

export const updateUnitType = (id, data) =>
  axiosClient.put(`/api/unit-types/${id}`, data)

export const deleteUnitType = (id) => axiosClient.delete(`/api/unit-types/${id}`)
