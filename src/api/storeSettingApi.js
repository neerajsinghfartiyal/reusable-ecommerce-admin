import axiosClient from './axiosClient'

export const getStoreSettings = () => axiosClient.get('/api/settings')

export const updateStoreSettings = (data) => axiosClient.put('/api/settings', data)
