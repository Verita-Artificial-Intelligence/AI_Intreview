import { useState } from 'react'
import { ChevronDown, ChevronRight, Info } from 'lucide-react'

/**
 * Reusable section component for entity detail sheets
 *
 * Provides consistent styling, collapsible functionality, and placeholder support
 * for sections that are coming soon.
 */
export function SheetSection({
  title,
  description,
  children,
  collapsible = false,
  defaultCollapsed = false,
  comingSoon = false,
  comingSoonMessage,
  icon: Icon,
  actions,
  className = '',
}) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  const toggleCollapse = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed)
    }
  }

  return (
    <div className={`mb-6 ${className}`}>
      {/* Section Header */}
      <div
        className={`flex items-center justify-between mb-3 ${
          collapsible ? 'cursor-pointer select-none' : ''
        }`}
        onClick={toggleCollapse}
      >
        <div className="flex items-center gap-2">
          {collapsible && (
            <div className="text-neutral-400">
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          )}
          {Icon && <Icon className="h-5 w-5 text-neutral-600" />}
          <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
          {comingSoon && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-full border border-blue-200">
              Coming Soon
            </span>
          )}
        </div>
        {actions && !isCollapsed && (
          <div className="flex items-center gap-2">{actions}</div>
        )}
      </div>

      {/* Description (if provided) */}
      {description && !isCollapsed && (
        <p className="text-sm text-neutral-600 mb-3 ml-6">{description}</p>
      )}

      {/* Section Content */}
      {!isCollapsed && (
        <div>
          {comingSoon ? (
            <ComingSoonPlaceholder message={comingSoonMessage} />
          ) : (
            children
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Placeholder for coming soon sections
 */
function ComingSoonPlaceholder({ message }) {
  return (
    <div className="border border-dashed border-neutral-300 rounded-lg p-6 bg-neutral-50">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
          <Info className="h-6 w-6 text-blue-600" />
        </div>
        <h4 className="text-sm font-medium text-neutral-900 mb-1">
          Feature In Development
        </h4>
        <p className="text-sm text-neutral-600 max-w-md">
          {message ||
            'This section will be available soon with powerful insights and data visualization.'}
        </p>
      </div>
    </div>
  )
}

/**
 * Specialized section for displaying key-value pairs
 */
export function SheetInfoSection({
  title,
  items,
  columns = 2,
  className = '',
}) {
  return (
    <SheetSection title={title} className={className}>
      <div
        className={`grid gap-4 ${
          columns === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
        }`}
      >
        {items.map((item, index) => (
          <div key={index}>
            <dt className="text-xs font-medium text-neutral-500 mb-1">
              {item.label}
            </dt>
            <dd className="text-sm text-neutral-900">{item.value || '—'}</dd>
          </div>
        ))}
      </div>
    </SheetSection>
  )
}

/**
 * Specialized section for displaying lists of related entities
 */
export function SheetListSection({
  title,
  items,
  emptyMessage = 'No items to display',
  renderItem,
  className = '',
}) {
  return (
    <SheetSection title={title} className={className}>
      {items && items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index}>{renderItem(item, index)}</div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-neutral-500 italic">{emptyMessage}</div>
      )}
    </SheetSection>
  )
}
