import { Search } from 'lucide-react'
import Sidebar from './Sidebar'

/**
 * Consistent layout component for dashboard pages
 * Includes sidebar and unified search bar header
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Main content area
 * @param {string} props.search - Search input value
 * @param {Function} props.onSearchChange - Search input change handler
 * @param {string} props.searchPlaceholder - Placeholder text for search input
 * @param {React.ReactNode} props.actionButton - Optional action button (e.g., Create Job, Create Project)
 * @param {string} props.className - Additional classes for main content area
 */
export default function DashboardLayout({
  children,
  search = '',
  onSearchChange,
  searchPlaceholder = 'Ask anything...',
  actionButton,
  className = '',
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:ml-[212px] flex min-h-screen max-h-screen flex-col overflow-y-auto bg-white">
        {/* Unified search header */}
        <div className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
          <div className="relative flex items-center justify-center px-6 lg:px-8 py-4">
            <div className="relative w-full max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={search}
                onChange={onSearchChange}
                placeholder={searchPlaceholder}
                className="w-full h-11 rounded-full border border-gray-200 bg-white pl-12 pr-14 text-sm text-gray-800 placeholder:text-gray-400 shadow-sm transition-all focus:border-gray-900 focus:shadow-md focus:outline-none"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-gray-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow hover:bg-gray-800 transition-colors">
                Generate
              </button>
            </div>

            {/* Optional action button slot - positioned absolutely on the right */}
            {actionButton && (
              <div className="absolute right-6 lg:right-8 flex-shrink-0">
                {actionButton}
              </div>
            )}
          </div>
        </div>

        {/* Main content area */}
        <div className={`flex-1 ${className}`}>{children}</div>
      </main>
    </div>
  )
}
