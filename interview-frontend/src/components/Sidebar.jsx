import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from './ui/button'
import {
  Home,
  Briefcase,
  DollarSign,
  User,
  LogOut,
  ChevronRight,
} from 'lucide-react'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const isActive = (path) => {
    return location.pathname === path
  }

  const navItems = [
    { path: '/', icon: Home, label: 'Opportunities' },
    { path: '/jobs', icon: Briefcase, label: 'Jobs' },
    { path: '/earnings', icon: DollarSign, label: 'Earnings' },
    { path: '/profile', icon: User, label: 'Profile' },
  ]

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-neutral-200 overflow-y-auto flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-1">
          <img
            src="/images/verita_ai_logo.jpeg"
            alt="Verita AI"
            className="w-10 h-10 rounded-md flex-shrink-0 object-cover"
          />
          <div>
            <h2 className="text-xl font-display font-bold text-neutral-900">
              Verita AI
            </h2>
          </div>
        </div>
      </div>

      <nav className="px-3 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mb-1 ${
                active
                  ? 'bg-brand-50 text-brand-600 font-medium'
                  : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {active && <ChevronRight className="w-4 h-4" />}
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-neutral-200">
        {user && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-neutral-50">
            <div className="text-xs font-medium text-neutral-500 mb-1">
              Logged in as
            </div>
            <div className="text-sm font-medium text-neutral-900">
              {user.name || 'User'}
            </div>
          </div>
        )}
        <button
          onClick={() => {
            logout()
            navigate('/login')
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-neutral-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
