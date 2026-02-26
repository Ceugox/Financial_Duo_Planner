import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('auth-storage')
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      const token: string | undefined = parsed?.state?.token
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch {
      // ignore
    }
  }
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-storage')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)
