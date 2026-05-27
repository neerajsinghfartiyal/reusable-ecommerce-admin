import axios from 'axios'
import axiosClient from './axiosClient'

export const getStoreSettings = () => axiosClient.get('/api/settings')

export const updateStoreSettings = (data) => axiosClient.put('/api/settings', data)

/** Public store identity for login branding (no auth required). */
export const getPublicStoreSettings = () => {
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
  return axios.get(`${baseURL.replace(/\/$/, '')}/api/public/settings`)
}
