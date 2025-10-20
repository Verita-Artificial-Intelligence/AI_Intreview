import { useNavigate, useLocation } from 'react-router-dom'
import { Users, Briefcase, BarChart, ChevronRight } from 'lucide-react'

const DashboardLayout = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    {
      path: '/',
      label: 'Dashboard',
      icon: BarChart,
    },
    {
      path: '/candidates',
      label: 'Candidates',
      icon: Users,
    },
    {
      path: '/interviews',
      label: 'Interviews',
      icon: Briefcase,
    },
    {
      path: '/jobs',
      label: 'Jobs',
      icon: Briefcase,
    },
  ]

  const isActivePath = (path) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-neutral-200 flex-shrink-0 fixed h-full">
        <div className="p-6 border-b border-neutral-200">
          <h2 className="text-xl font-display font-bold text-neutral-900 mb-1">Verita</h2>
          <p className="text-xs text-neutral-600">AI Interview Platform</p>
        </div>

        <nav className="p-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = isActivePath(item.path)
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium mb-2 transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-64 overflow-auto custom-scrollbar">
        {children}
      </div>
    </div>
  )
}

export default DashboardLayout
