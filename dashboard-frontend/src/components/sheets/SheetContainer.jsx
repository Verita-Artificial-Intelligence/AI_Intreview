import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetTitle } from '../ui/sheet'
import { useSheetState } from '../../hooks/useSheetState'
import { SheetBreadcrumbs } from './SheetBreadcrumbs'
import { Loader2, AlertCircle } from 'lucide-react'
import { Button } from '../ui/button'
import { VisuallyHidden } from '../ui/visually-hidden'

/**
 * Main container for entity detail sheets
 *
 * Handles:
 * - URL state management
 * - Keyboard shortcuts (Esc to close)
 * - Breadcrumb navigation
 * - Loading and error states
 * - Sheet open/close lifecycle
 */
export function SheetContainer({
  entityType,
  entityId,
  isOpen,
  onOpenChange,
  children,
  fetchData,
  title,
  className = '',
}) {
  const { breadcrumbs, navigateBack, closeSheet } = useSheetState()
  const [entity, setEntity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch entity data when sheet opens
  useEffect(() => {
    if (isOpen && entityId) {
      loadEntityData()
    } else {
      // Reset state when closed
      setEntity(null)
      setLoading(true)
      setError(null)
    }
  }, [isOpen, entityId])

  const loadEntityData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchData(entityId)
      setEntity(data)
    } catch (err) {
      console.error(`Error fetching ${entityType}:`, err)
      setError(err.message || `Failed to load ${entityType} details`)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    closeSheet()
    if (onOpenChange) {
      onOpenChange(false)
    }
  }

  const handleBreadcrumbNavigate = (crumb) => {
    // Navigation is handled by useSheetState via navigateBack
    navigateBack()
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={`sm:max-w-2xl w-full overflow-y-auto bg-neutral-50 ${className}`}
        disableAnimations={breadcrumbs.length > 0}
        aria-describedby={undefined}
      >
        <SheetTitle className="sr-only">
          {title || `${entityType} details`}
        </SheetTitle>
        <div className="h-full flex flex-col">
          {/* Breadcrumb Navigation */}
          {breadcrumbs.length > 1 && (
            <SheetBreadcrumbs
              breadcrumbs={breadcrumbs}
              onNavigate={handleBreadcrumbNavigate}
            />
          )}

          {/* Content Area */}
          <div className="flex-1">
            {loading && <LoadingState />}
            {error && <ErrorState error={error} onRetry={loadEntityData} />}
            {!loading &&
              !error &&
              entity &&
              children({ entity, refetch: loadEntityData })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/**
 * Loading state component
 */
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-brand-600 mb-4" />
      <p className="text-sm text-neutral-600">Loading details...</p>
    </div>
  )
}

/**
 * Error state component
 */
function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <AlertCircle className="h-6 w-6 text-red-600" />
      </div>
      <h3 className="text-sm font-medium text-neutral-900 mb-1">
        Failed to Load
      </h3>
      <p className="text-sm text-neutral-600 mb-4 text-center max-w-sm">
        {error}
      </p>
      <Button variant="outline" onClick={onRetry}>
        Try Again
      </Button>
    </div>
  )
}

/**
 * Simplified sheet wrapper with breadcrumb support
 */
export function SimpleSheetContainer({
  isOpen,
  onOpenChange,
  children,
  title,
  className = '',
  customBreadcrumbs = null,
  onBreadcrumbNavigate = null,
  disableAnimations = false,
}) {
  const { breadcrumbs: defaultBreadcrumbs, navigateBack } = useSheetState()
  const breadcrumbs = customBreadcrumbs || defaultBreadcrumbs

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onOpenChange) {
        onOpenChange(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onOpenChange])

  const handleBreadcrumbNavigate = (crumb) => {
    if (onBreadcrumbNavigate) {
      onBreadcrumbNavigate(crumb)
    } else {
      navigateBack()
    }
  }

  // Disable animations if there are any breadcrumbs OR if it's a deep link
  // Use > 0 instead of > 1 to prevent animation when navigating back via breadcrumbs
  const shouldDisableAnimations = disableAnimations || breadcrumbs.length > 0

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={`sm:max-w-2xl w-full overflow-y-auto bg-neutral-50 ${className}`}
        disableAnimations={shouldDisableAnimations}
        aria-describedby={undefined}
      >
        <SheetTitle className="sr-only">{title || 'Details'}</SheetTitle>
        <div className="h-full flex flex-col">
          {/* Breadcrumb Navigation */}
          {breadcrumbs.length > 1 && (
            <SheetBreadcrumbs
              breadcrumbs={breadcrumbs}
              onNavigate={handleBreadcrumbNavigate}
            />
          )}

          {/* Content Area */}
          <div className="flex-1">{children}</div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/**
 * Loading skeleton for sheet content
 */
export function SheetSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header skeleton */}
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 bg-neutral-200 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="h-6 bg-neutral-200 rounded w-3/4" />
          <div className="h-4 bg-neutral-200 rounded w-1/2" />
        </div>
      </div>

      {/* Section skeletons */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3">
          <div className="h-4 bg-neutral-200 rounded w-1/4" />
          <div className="h-20 bg-neutral-200 rounded" />
        </div>
      ))}
    </div>
  )
}
