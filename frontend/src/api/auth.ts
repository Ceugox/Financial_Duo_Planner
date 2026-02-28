import { api } from './client'

export interface LoginPayload {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface UserResponse {
  id: number
  email: string
  name: string
  is_active: boolean
}

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<TokenResponse>('/auth/login', payload).then((r) => r.data),

  me: () => api.get<UserResponse>('/auth/me').then((r) => r.data),

  users: () => api.get<UserResponse[]>('/auth/users').then((r) => r.data),
}
