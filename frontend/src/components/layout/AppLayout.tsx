import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import Sidebar from './Sidebar'

export default function AppLayout() {
  const { token } = useAuthStore()

  if (!token) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-screen bg-[#080c14]">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}