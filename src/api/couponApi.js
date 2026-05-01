import axiosClient from './axiosClient'

export const getCoupons = (params = {}) => axiosClient.get('/api/coupons', { params })

export const getCouponById = (id) => axiosClient.get(`/api/coupons/${id}`)

export const createCoupon = (data) => axiosClient.post('/api/coupons', data)

export const updateCoupon = (id, data) => axiosClient.put(`/api/coupons/${id}`, data)

export const deleteCoupon = (id) => axiosClient.delete(`/api/coupons/${id}`)
