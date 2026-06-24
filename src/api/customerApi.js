import axiosClient from './axiosClient'

export const getCustomers = (params = {}) =>
  axiosClient.get('/api/customers', { params })

export const getCustomerById = (id) => axiosClient.get(`/api/customers/${id}`)

export const createCustomer = (data) => axiosClient.post('/api/customers', data)

export const updateCustomer = (id, data) => axiosClient.put(`/api/customers/${id}`, data)

export const deleteCustomer = (id) => axiosClient.delete(`/api/customers/${id}`)
