import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { BottomNav } from './BottomNav'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--cream)' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main area — desktop offset by sidebar width */}
      <div className="app-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="app-main">
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  )
}
