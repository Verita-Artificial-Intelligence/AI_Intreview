import { ChevronRight } from 'lucide-react'

/**
 * Breadcrumb navigation for entity drill-down in slide-over panels
 *
 * Displays the navigation trail when users click through related entities
 * (e.g., Job > Interview > Candidate)
 */
export function SheetBreadcrumbs({ breadcrumbs, onNavigate }) {
  if (!breadcrumbs || breadcrumbs.length === 0) {
    return null
  }

  return (
    <nav className="flex items-center space-x-1 text-sm mb-4 overflow-x-auto">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1
        const isCurrent = crumb.isCurrent

        return (
          <div key={`${crumb.type}-${crumb.id}`} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-neutral-400 mx-1 flex-shrink-0" />
            )}
            {isCurrent ? (
              <span className="font-medium text-neutral-900">
                {crumb.label}
              </span>
            ) : (
              <button
                onClick={() => onNavigate && onNavigate(crumb)}
                className="text-neutral-600 hover:text-brand-600 hover:underline transition-colors whitespace-nowrap"
              >
                {crumb.label}
              </button>
            )}
          </div>
        )
      })}
    </nav>
  )
}
