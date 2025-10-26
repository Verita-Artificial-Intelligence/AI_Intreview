import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './ui/button'
import { Briefcase, Search, FileText, ChevronRight, LogOut } from 'lucide-react'

export default function CandidateSidebar({ showAnnotationTasks = false }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const isActive = (path) => {
    return location.pathname === path
  }

  const navItems = [
    { path: '/candidate/portal', icon: Briefcase, label: 'Active Jobs' },
    { path: '/candidate/opportunities', icon: Search, label: 'Opportunities' },
  ]

  return (
    <aside className="w-64 bg-white border-r border-neutral-200 flex-shrink-0">
      <div className="p-6">
        <h2 className="text-xl font-display font-bold text-neutral-900 mb-1">
          Verita
        </h2>
        <p className="text-xs text-neutral-600">Candidate Portal</p>
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

        {showAnnotationTasks && (
          <>
            <div className="border-t border-neutral-200 my-3" />

            <a
              href="/candidate/annotation-tasks"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
                isActive('/candidate/annotation-tasks') ||
                location.pathname.startsWith('/candidate/annotate')
                  ? 'bg-brand-50 text-brand-600 font-medium'
                  : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Annotation Tasks</span>
              {(isActive('/candidate/annotation-tasks') ||
                location.pathname.startsWith('/candidate/annotate')) && (
                <ChevronRight className="w-4 h-4 ml-auto" />
              )}
            </a>
          </>
        )}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-neutral-200 bg-white">
        <div className="px-3 py-2 mb-2">
          <p className="text-xs text-neutral-600 mb-1">Signed in as</p>
          <p className="text-sm font-medium text-neutral-900 truncate">
            {user?.name || user?.email}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            logout()
            navigate('/candidate/login')
          }}
          className="w-full justify-start"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </aside>
  )
}
