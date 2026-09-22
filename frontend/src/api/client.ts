import axios from 'axios'
import { getAccessToken, setAccessToken } from './authSession'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

let isRefreshing = false
type QueueItem = { resolve: (token: string) => void; reject: (error: unknown) => void }
let failedQueue: QueueItem[] = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token!))
  failedQueue = []
}

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config
    if (!request || error.response?.status !== 401 || request._retry ||
        (request.url ?? '').startsWith('/auth/')) {
      return Promise.reject(error)
    }
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => failedQueue.push({ resolve, reject }))
        .then((token) => {
          request.headers.Authorization = `Bearer ${token}`
          return api(request)
        })
    }
    request._retry = true
    isRefreshing = true
    try {
      const response = await axios.post(
        `${BASE_URL}/api/v1/auth/refresh`, {}, { withCredentials: true },
      )
      const token: string = response.data.access_token
      setAccessToken(token)
      processQueue(null, token)
      request.headers.Authorization = `Bearer ${token}`
      return api(request)
    } catch (refreshError) {
      setAccessToken(null)
      processQueue(refreshError, null)
      window.location.assign('/login')
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)
