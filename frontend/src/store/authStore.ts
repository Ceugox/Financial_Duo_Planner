import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi, type UserResponse } from '@/api/auth'

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: UserResponse | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  loadUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const tokens = await authApi.login({ email, password })
        set({
          token: tokens.access_token,
          refreshToken: tokens.refresh_token,
          isAuthenticated: true,
        })
        const user = await authApi.me()
        set({ user })
      },

      logout: () => {
        set({ token: null, refreshToken: null, user: null, isAuthenticated: false })
      },

      loadUser: async () => {
        if (get().token && !get().user) {
          try {
            const user = await authApi.me()
            set({ user, isAuthenticated: true })
          } catch {
            get().logout()
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
