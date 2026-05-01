import axiosClient from './axiosClient'

export const loginAdmin = (email, password) =>
  axiosClient.post('/api/auth/login', { email, password })
