import { create } from 'zustand'
import { authApi, type UserResponse } from '@/api/auth'
import { setAccessToken } from '@/api/authSession'

interface AuthState {
  user: UserResponse | null
  isAuthenticated: boolean
  isCheckingSession: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  bootstrap: () => Promise<void>
  loadUser: () => Promise<void>
}

let bootstrapPromise: Promise<void> | null = null

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  isCheckingSession: true,

  login: async (email, password) => {
    const tokens = await authApi.login({ email, password })
    setAccessToken(tokens.access_token)
    const user = await authApi.me()
    set({ user, isAuthenticated: true, isCheckingSession: false })
  },

  logout: () => {
    setAccessToken(null)
    set({ user: null, isAuthenticated: false, isCheckingSession: false })
    void authApi.logout().catch(() => undefined).finally(() => window.location.assign('/login'))
  },

  bootstrap: () => {
    if (bootstrapPromise) return bootstrapPromise
    bootstrapPromise = (async () => {
      localStorage.removeItem('auth-storage')
      try {
        const tokens = await authApi.refresh()
        setAccessToken(tokens.access_token)
        const user = await authApi.me()
        set({ user, isAuthenticated: true })
      } catch {
        setAccessToken(null)
        set({ user: null, isAuthenticated: false })
      } finally {
        set({ isCheckingSession: false })
      }
    })()
    return bootstrapPromise
  },

  loadUser: async () => {
    if (!get().isAuthenticated) return
    try {
      set({ user: await authApi.me() })
    } catch {
      get().logout()
    }
  },
}))
