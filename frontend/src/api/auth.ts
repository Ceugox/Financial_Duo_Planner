import axios from 'axios'
import { api } from './client'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export interface LoginPayload { email: string; password: string }
export interface TokenResponse { access_token: string; token_type: string }
export interface UserResponse { id: number; email: string; name: string; is_active: boolean }

export const authApi = {
  login: (payload: LoginPayload) => api.post<TokenResponse>('/auth/login', payload).then((r) => r.data),
  refresh: () => axios.post<TokenResponse>(`${BASE_URL}/api/v1/auth/refresh`, {}, { withCredentials: true }).then((r) => r.data),
  logout: () => api.post('/auth/logout').then(() => undefined),
  me: () => api.get<UserResponse>('/auth/me').then((r) => r.data),
  users: () => api.get<UserResponse[]>('/auth/users').then((r) => r.data),
}
