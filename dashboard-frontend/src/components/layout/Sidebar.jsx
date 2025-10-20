import { useLocation, useNavigate } from 'react-router-dom'
import { BarChart, Users, Briefcase, ChevronRight } from 'lucide-react'

const Sidebar = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const navItems = [
    {
      path: '/',
      icon: BarChart,
      label: 'Dashboard',
    },
    {
      path: '/candidates',
      icon: Users,
      label: 'Candidates',
    },
    {
      path: '/interviews',
      icon: Briefcase,
      label: 'Interviews',
    },
    {
      path: '/jobs',
      icon: Briefcase,
      label: 'Jobs',
    },
  ]

  const isActive = (path) => {
    return location.pathname === path
  }

  return (
    <aside className="w-64 bg-white border-r border-neutral-200 flex-shrink-0 flex flex-col">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-neutral-200">
        <h2 className="text-xl font-display font-bold text-neutral-900 mb-1">Verita</h2>
        <p className="text-xs text-neutral-600">AI Interview Platform</p>
      </div>

      {/* Navigation */}
      <nav className="p-4 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium mb-2 transition-all duration-200 ${
                active
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              {active && <ChevronRight className="w-4 h-4 ml-auto" />}
            </button>
          )
        })}
      </nav>

      {/* Footer (optional) */}
      <div className="p-4 border-t border-neutral-200">
        <p className="text-xs text-neutral-500 text-center">© 2025 Verita AI</p>
      </div>
    </aside>
  )
}

export default Sidebar
