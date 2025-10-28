import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'

/**
 * Custom hook for managing sheet (slide-over) state via URL query parameters
 *
 * Supports:
 * - Deep linking: ?sheet=annotator&id=123
 * - Navigation history: ?sheet=candidate&id=456&from=interview:123
 * - Browser back/forward navigation
 *
 * @returns {Object} Sheet state and control functions
 */
export function useSheetState() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()

  // Parse current sheet state from URL
  const sheetType = searchParams.get('sheet')
  const entityId = searchParams.get('id')
  const fromHistory = searchParams.get('from')

  // Track if a sheet is currently open
  const isOpen = Boolean(sheetType && entityId)

  // Parse navigation history breadcrumbs from 'from' param
  // Format: "interview:123,job:789" → [{type: 'interview', id: '123'}, {type: 'job', id: '789'}]
  const navigationHistory = fromHistory
    ? fromHistory.split(',').map((item) => {
        const [type, id] = item.split(':')
        return { type, id }
      })
    : []

  /**
   * Opens a sheet and updates URL
   * @param {string} type - Entity type (e.g., 'annotator', 'job', 'interview')
   * @param {string} id - Entity ID
   * @param {Object} options - Additional options
   * @param {boolean} options.replace - Replace current URL instead of push
   * @param {boolean} options.keepHistory - Keep existing navigation history
   */
  const openSheet = useCallback(
    (type, id, options = {}) => {
      const { replace = false, keepHistory = false } = options

      const newParams = new URLSearchParams(location.search)

      // Set new sheet parameters
      newParams.set('sheet', type)
      newParams.set('id', id)

      // Handle navigation history for breadcrumbs
      if (!keepHistory) {
        // Add current sheet to history if we're navigating from an open sheet
        if (isOpen && sheetType && entityId) {
          const currentHistory = fromHistory || ''
          const newHistory = currentHistory
            ? `${currentHistory},${sheetType}:${entityId}`
            : `${sheetType}:${entityId}`
          newParams.set('from', newHistory)
        }
      } else if (fromHistory) {
        // Keep existing history
        newParams.set('from', fromHistory)
      }

      // Navigate to new URL
      const newPath = `${location.pathname}?${newParams.toString()}`
      if (replace) {
        navigate(newPath, { replace: true })
      } else {
        navigate(newPath)
      }
    },
    [location, navigate, isOpen, sheetType, entityId, fromHistory]
  )

  /**
   * Closes the sheet and clears URL parameters
   * @param {Object} options - Additional options
   * @param {boolean} options.clearHistory - Clear navigation history (default: true)
   */
  const closeSheet = useCallback(
    (options = {}) => {
      const { clearHistory = true } = options

      const newParams = new URLSearchParams(location.search)
      newParams.delete('sheet')
      newParams.delete('id')

      // Always clear history when closing to prevent breadcrumb stacking
      newParams.delete('from')

      // If no params left, navigate to clean path
      const paramsString = newParams.toString()
      const newPath = paramsString
        ? `${location.pathname}?${paramsString}`
        : location.pathname

      navigate(newPath)
    },
    [location, navigate]
  )

  /**
   * Navigates back through the navigation history
   * Goes to the previous entity in the breadcrumb trail
   */
  const navigateBack = useCallback(() => {
    if (navigationHistory.length === 0) {
      // No history, just close the sheet
      closeSheet()
      return
    }

    // Get the last item from history
    const previousEntity = navigationHistory[navigationHistory.length - 1]

    // Remove the last item from history
    const newHistory = navigationHistory.slice(0, -1)
    const newHistoryString = newHistory
      .map((item) => `${item.type}:${item.id}`)
      .join(',')

    const newParams = new URLSearchParams(location.search)
    newParams.set('sheet', previousEntity.type)
    newParams.set('id', previousEntity.id)

    if (newHistoryString) {
      newParams.set('from', newHistoryString)
    } else {
      newParams.delete('from')
    }

    navigate(`${location.pathname}?${newParams.toString()}`)
  }, [navigationHistory, location, navigate, closeSheet])

  /**
   * Replaces the current sheet with a new entity (for related entity navigation)
   * Maintains navigation history for breadcrumbs
   */
  const replaceSheet = useCallback(
    (type, id) => {
      openSheet(type, id, { replace: false, keepHistory: false })
    },
    [openSheet]
  )

  /**
   * Updates the entity ID without changing the sheet type
   * Useful for navigating between entities of the same type
   */
  const updateEntityId = useCallback(
    (id) => {
      if (!sheetType) return
      openSheet(sheetType, id, { replace: true, keepHistory: true })
    },
    [sheetType, openSheet]
  )

  // Build breadcrumb trail for UI display
  // Format: [{type: 'job', id: '789', label: 'Job'}, {type: 'interview', id: '123', label: 'Interview'}]
  // Only build breadcrumbs if a sheet is actually open
  const breadcrumbs = isOpen
    ? [
        ...navigationHistory.map((item) => ({
          type: item.type,
          id: item.id,
          label: formatEntityTypeLabel(item.type),
        })),
        {
          type: sheetType,
          id: entityId,
          label: formatEntityTypeLabel(sheetType),
          isCurrent: true,
        },
      ]
    : []

  // Clean up URL params if sheet is closed but params remain (safety check)
  // Removed the automatic cleanup effect to prevent race conditions
  // The closeSheet function already handles parameter cleanup properly

  return {
    // State
    isOpen,
    sheetType,
    entityId,
    navigationHistory,
    breadcrumbs,

    // Actions
    openSheet,
    closeSheet,
    replaceSheet,
    navigateBack,
    updateEntityId,
  }
}

/**
 * Formats entity type for display in breadcrumbs
 * @param {string} type - Entity type (e.g., 'annotator', 'job')
 * @returns {string} Formatted label (e.g., 'Annotator', 'Job')
 */
function formatEntityTypeLabel(type) {
  const labels = {
    annotator: 'Annotator',
    candidate: 'Candidate',
    job: 'Job',
    interview: 'Interview',
    project: 'Project',
    assignment: 'Assignment',
  }

  return labels[type] || type.charAt(0).toUpperCase() + type.slice(1)
}
