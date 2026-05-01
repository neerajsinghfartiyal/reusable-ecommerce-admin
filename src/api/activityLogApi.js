import axiosClient from './axiosClient'

export const getActivityLogs = (params = {}) =>
  axiosClient.get('/api/activity-logs', { params })

export const getActivityLogById = (id) => axiosClient.get(`/api/activity-logs/${id}`)
