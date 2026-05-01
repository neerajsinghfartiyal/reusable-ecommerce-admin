import axiosClient from './axiosClient'

export const getDashboardStats = () => axiosClient.get('/api/dashboard/stats')
