import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from './ui/button'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  LogOut,
  ChevronRight,
  Table,
} from 'lucide-react'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/candidates', icon: Users, label: 'Candidates' },
    { path: '/interviews', icon: Briefcase, label: 'Interviews' },
    { path: '/jobs', icon: Briefcase, label: 'Jobs' },
  ]

  const annotationItems = [
    { path: '/admin/data-explorer', icon: Table, label: 'Data Explorer' },
    { path: '/annotation-data', icon: FileText, label: 'Annotation Data' },
    { path: '/annotators', icon: Users, label: 'Annotators' },
  ]

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-neutral-200 overflow-y-auto flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-white tracking-wider">V</span>
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-neutral-900">Verita</h2>
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

        <div className="border-t border-neutral-200 my-3" />

        {annotationItems.map((item) => {
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
        <button
          onClick={() => {
            // Add logout logic here
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
