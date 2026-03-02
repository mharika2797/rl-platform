import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const isResearcher = user?.role === 'researcher' || user?.role === 'admin'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-all duration-150
     ${isActive
       ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
       : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
     }`

  return (
    <aside className="w-56 min-h-screen bg-[#0d1422] border-r border-[#1e2d45] flex flex-col">
      <div className="px-5 py-5 border-b border-[#1e2d45]">
        <span className="font-mono text-xs text-cyan-400 tracking-widest uppercase">⬡ RL Platform</span>
      </div>

      <nav className="flex-1 p-3 flex flex-col gap-1">
        {isResearcher ? (
          <>
            <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
            <NavLink to="/tasks" className={linkClass}>Tasks</NavLink>
          </>
        ) : (
          <NavLink to="/queue" className={linkClass}>My Queue</NavLink>
        )}
      </nav>

      <div className="p-3 border-t border-[#1e2d45]">
        <div className="px-3 py-2 mb-1">
          <p className="text-xs text-slate-300 font-medium truncate">{user?.email}</p>
          <p className="text-xs text-slate-600 font-mono mt-0.5">{user?.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all duration-150"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}