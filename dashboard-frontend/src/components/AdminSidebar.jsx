import { useLocation } from 'react-router-dom'
import {
  Users,
  Briefcase,
  BarChart,
  FileText,
  Table,
  ChevronRight,
} from 'lucide-react'

export default function AdminSidebar() {
  const location = useLocation()

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  const navItems = [
    { path: '/', icon: BarChart, label: 'Dashboard' },
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
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-neutral-200 overflow-y-auto">
      <div className="p-6">
        <h2 className="text-xl font-display font-bold text-neutral-900 mb-1">
          Verita
        </h2>
        <p className="text-xs text-neutral-600">AI Interview Platform</p>
      </div>

      <nav className="px-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)

          return (
            <a
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
                active
                  ? 'bg-brand-50 text-brand-600 font-medium'
                  : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              {active && <ChevronRight className="w-4 h-4 ml-auto" />}
            </a>
          )
        })}

        <div className="border-t border-neutral-200 my-3" />

        {annotationItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)

          return (
            <a
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
                active
                  ? 'bg-brand-50 text-brand-600 font-medium'
                  : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              {active && <ChevronRight className="w-4 h-4 ml-auto" />}
            </a>
          )
        })}
      </nav>
    </aside>
  )
}
