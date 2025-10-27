import { useState } from 'react'
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
  MessagesSquare,
  Layers,
  User,
} from 'lucide-react'
import AccountModal from './AccountModal'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [accountModalOpen, setAccountModalOpen] = useState(false)

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  const navItems = [
    { path: '/', icon: Layers, label: 'Dashboard' },
    { path: '/candidates', icon: Users, label: 'Candidates' },
    { path: '/interviews', icon: MessagesSquare, label: 'Interviews' },
    { path: '/jobs', icon: Briefcase, label: 'Jobs' },
  ]

  const annotationItems = [
    // { path: '/admin/data-explorer', icon: Table, label: 'Data Explorer' },
    // { path: '/annotation-data', icon: FileText, label: 'Annotation Data' },
    { path: '/annotators', icon: Users, label: 'Annotators' },
  ]

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-white border-r border-neutral-200 overflow-y-auto flex-col">
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

        <div className="p-4 border-t border-neutral-200 space-y-1">
          <button
            onClick={() => setAccountModalOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            <User className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">Account</span>
          </button>
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

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 px-2 py-2 z-50">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  active ? 'text-brand-600' : 'text-neutral-600'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'stroke-2' : ''}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            )
          })}
          <button
            onClick={() => setAccountModalOpen(true)}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-neutral-600 transition-colors"
          >
            <User className="w-5 h-5" />
            <span className="text-xs font-medium">Account</span>
          </button>
        </div>
      </nav>

      {/* Account Modal */}
      <AccountModal
        open={accountModalOpen}
        onOpenChange={setAccountModalOpen}
      />
    </>
  )
}
