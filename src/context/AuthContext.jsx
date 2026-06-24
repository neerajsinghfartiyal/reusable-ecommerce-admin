import { useMemo, useState } from 'react'
import { loginAdmin } from '../api/authApi'
import { AuthContext } from './auth-context'

const getStoredAdmin = () => {
  const storedAdmin = localStorage.getItem('adminUser')

  if (!storedAdmin) return null

  try {
    return JSON.parse(storedAdmin)
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => getStoredAdmin())
  const [token, setToken] = useState(() => localStorage.getItem('adminToken') || '')

  const login = async (email, password) => {
    const response = await loginAdmin(email, password)
    const adminData = response?.data?.data?.admin
    const authToken = response?.data?.data?.token

    if (!adminData || !authToken) {
      throw new Error('Invalid login response from server.')
    }

    setAdmin(adminData)
    setToken(authToken)
    localStorage.setItem('adminToken', authToken)
    localStorage.setItem('adminUser', JSON.stringify(adminData))

    return adminData
  }

  const logout = () => {
    setAdmin(null)
    setToken('')
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
  }

  const value = useMemo(
    () => ({
      login,
      logout,
      admin,
      token,
      isAuthenticated: Boolean(token),
    }),
    [admin, token],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
