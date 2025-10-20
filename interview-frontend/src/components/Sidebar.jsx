import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from './ui/button'
import {
  Home,
  Briefcase,
  DollarSign,
  User,
  LogOut,
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
    <aside className="w-56 bg-white border-r border-neutral-200 flex flex-col min-h-screen py-6">
      {/* Logo */}
      <div className="mb-10 px-6">
        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
          <span className="text-lg font-bold text-white tracking-wider">V</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-2 w-full px-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                active
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
              title={item.label}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* User Section */}
      <div className="flex flex-col items-center gap-3 pt-6 border-t border-neutral-200 px-6">
        <button
          onClick={() => navigate('/profile')}
          className="w-full h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm hover:shadow-md transition-shadow"
          title={user?.name || 'Profile'}
        >
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </button>

        <button
          onClick={() => {
            logout()
            navigate('/login')
          }}
          className="w-full h-12 rounded-lg text-neutral-600 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center justify-center"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </aside>
  )
}
