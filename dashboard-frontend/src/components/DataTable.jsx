import { useState, useEffect, useRef } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'
import { Button } from './ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Checkbox } from './ui/checkbox'
import '../styles/tokens.css'

/**
 * Production-grade DataTable component with dense layout and advanced features
 *
 * @param {Object} props
 * @param {Array} props.columns - Array of column definitions: { key, label, render?, className?, sortable?, frozen?, width? }
 * @param {Array} props.data - Array of data objects
 * @param {Function} props.onRowClick - Optional row click handler
 * @param {Object} props.pagination - Pagination config: { page, totalPages, pageSize, total, onPageChange, onPageSizeChange }
 * @param {boolean} props.loading - Loading state
 * @param {React.ReactNode} props.emptyState - Custom empty state component
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.hoverable - Enable hover effects (default: true)
 * @param {string} props.density - Table density: 'comfortable' | 'compact' (default: 'comfortable')
 * @param {boolean} props.selectable - Enable row selection (default: false)
 * @param {Array} props.selectedRows - Array of selected row IDs
 * @param {Function} props.onSelectionChange - Selection change handler
 * @param {boolean} props.stickyHeader - Enable sticky header (default: true)
 * @param {Array} props.frozenColumns - Array of column keys to freeze (default: [])
 */
export default function DataTable({
  columns = [],
  data = [],
  onRowClick,
  pagination,
  loading = false,
  emptyState,
  className = '',
  hoverable = true,
  density = 'compact',
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  stickyHeader = true,
  frozenColumns = [],
}) {
  const headerRef = useRef(null)
  const bodyRef = useRef(null)
  const [scrollbarWidth, setScrollbarWidth] = useState(0)

  // Merge checkbox column if selectable
  const effectiveColumns = selectable
    ? [
        {
          key: '__selection__',
          label: '',
          width: 48,
          minWidth: 48,
          frozen: true,
        },
        ...columns,
      ]
    : columns

  const [columnWidths, setColumnWidths] = useState(() => {
    const widths = {}
    effectiveColumns.forEach((col) => {
      widths[col.key] = col.width || 160
    })
    return widths
  })
  const resizingRef = useRef(null)

  // Selection handlers
  const handleSelectAll = (checked) => {
    if (!onSelectionChange) return
    if (checked) {
      // Select all rows on current page
      const allIds = data.map((row) => row.id).filter(Boolean)
      onSelectionChange(allIds)
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectRow = (rowId, checked) => {
    if (!onSelectionChange) return
    if (checked) {
      onSelectionChange([...selectedRows, rowId])
    } else {
      onSelectionChange(selectedRows.filter((id) => id !== rowId))
    }
  }

  const isAllSelected =
    data.length > 0 && data.every((row) => selectedRows.includes(row.id))
  const isSomeSelected =
    data.some((row) => selectedRows.includes(row.id)) && !isAllSelected

  // Handle column resizing
  const handleMouseDown = (columnKey, e) => {
    e.preventDefault()
    resizingRef.current = {
      columnKey,
      startX: e.pageX,
      startWidth: columnWidths[columnKey],
    }
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!resizingRef.current) return

      const { columnKey, startX, startWidth } = resizingRef.current
      const diff = e.pageX - startX
      const newWidth = Math.max(60, startWidth + diff)

      setColumnWidths((prev) => ({
        ...prev,
        [columnKey]: newWidth,
      }))
    }

    const handleMouseUp = () => {
      resizingRef.current = null
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // Sync horizontal scroll between header and body, and calculate scrollbar width
  useEffect(() => {
    const headerEl = headerRef.current
    const bodyEl = bodyRef.current
    if (!headerEl || !bodyEl) return

    // Calculate scrollbar width
    const updateScrollbarWidth = () => {
      const width = bodyEl.offsetWidth - bodyEl.clientWidth
      setScrollbarWidth(width)
    }

    updateScrollbarWidth()
    window.addEventListener('resize', updateScrollbarWidth)

    const syncScroll = (e) => {
      const target = e.target
      const other = target === headerEl ? bodyEl : headerEl
      if (other.scrollLeft !== target.scrollLeft) {
        other.scrollLeft = target.scrollLeft
      }
    }

    headerEl.addEventListener('scroll', syncScroll)
    bodyEl.addEventListener('scroll', syncScroll)

    return () => {
      window.removeEventListener('resize', updateScrollbarWidth)
      headerEl.removeEventListener('scroll', syncScroll)
      bodyEl.removeEventListener('scroll', syncScroll)
    }
  }, [])

  // Calculate frozen column positions
  const getFrozenColumnStyle = (columnIndex, isHeader = false) => {
    const columnKey = effectiveColumns[columnIndex]?.key

    // Selection column is always frozen if present
    if (columnKey === '__selection__') {
      const zIndex = isHeader ? 50 : 10
      return {
        position: 'sticky',
        left: '0px',
        ...(isHeader ? { backgroundColor: '#fff' } : {}),
        zIndex,
        borderRight: '1px solid var(--gray-200)',
      }
    }

    if (!frozenColumns.length) return {}

    const frozenIndex = frozenColumns.indexOf(columnKey)

    if (frozenIndex === -1) return {}

    let leftPosition = 0

    // Add width of selection column if present
    if (selectable) {
      leftPosition += columnWidths['__selection__'] || 48
    }

    // Add widths of previous frozen columns
    for (let i = 0; i < frozenIndex; i++) {
      const prevColumnKey = frozenColumns[i]
      leftPosition += columnWidths[prevColumnKey] || 160
    }

    // Higher z-index for header cells to ensure they appear above sticky header background (z-index: 30)
    const zIndex = isHeader ? 50 : frozenIndex === 0 ? 10 : 9

    return {
      position: 'sticky',
      left: `${leftPosition}px`,
      // Only set background color for headers, not body cells (to allow hover effect)
      ...(isHeader ? { backgroundColor: '#fff' } : {}),
      zIndex,
      borderRight: '1px solid var(--gray-200)',
    }
  }

  if (loading) {
    return (
      <div className={`w-full bg-white ${className}`}>
        <div className="p-8 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-600">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            Loading...
          </div>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className={`w-full bg-white ${className}`}>
        {emptyState || (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-600">No data available</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`w-full flex flex-col flex-1 bg-white ${className}`}>
      {/* Fixed table header */}
      <div
        ref={headerRef}
        className="w-full overflow-x-auto border-b border-gray-200"
        style={{
          position: 'sticky',
          top: '73px',
          zIndex: 30,
          backgroundColor: '#fff',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          paddingRight: scrollbarWidth ? `${scrollbarWidth}px` : 0,
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style>{`
          .header-container::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <Table
          className={`w-full text-[13px] leading-relaxed ${density === 'compact' ? 'table-compact' : 'table-dense'}`}
          style={{ tableLayout: 'fixed' }}
        >
          <colgroup>
            {effectiveColumns.map((column) => (
              <col
                key={`header-${column.key}`}
                style={{
                  width: `${columnWidths[column.key]}px`,
                  minWidth: column.minWidth ? `${column.minWidth}px` : '60px',
                }}
              />
            ))}
          </colgroup>
          <TableHeader>
            <TableRow className="bg-white">
              {effectiveColumns.map((column, index) => (
                <TableHead
                  key={column.key}
                  className={`font-medium text-gray-600 text-[11px] bg-white relative ${column.className || ''}`}
                  style={{
                    width: `${columnWidths[column.key]}px`,
                    minWidth: column.minWidth ? `${column.minWidth}px` : '60px',
                    ...getFrozenColumnStyle(index, true),
                  }}
                >
                  {column.key === '__selection__' ? (
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        className="checkbox-black"
                        aria-label="Select all rows"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        {column.headerRender
                          ? column.headerRender()
                          : column.label}
                      </div>
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 hover:opacity-50"
                        onMouseDown={(e) => handleMouseDown(column.key, e)}
                      />
                    </div>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        </Table>
      </div>

      {/* Scrollable table body */}
      <div ref={bodyRef} className="w-full flex-1 overflow-auto">
        <Table
          className={`w-full text-[13px] leading-relaxed ${density === 'compact' ? 'table-compact' : 'table-dense'}`}
          style={{ tableLayout: 'fixed' }}
        >
          <colgroup>
            {effectiveColumns.map((column) => (
              <col
                key={`body-${column.key}`}
                style={{
                  width: `${columnWidths[column.key]}px`,
                  minWidth: column.minWidth ? `${column.minWidth}px` : '60px',
                }}
              />
            ))}
          </colgroup>
          <TableBody>
            {data.map((row, rowIndex) => {
              const isRowSelected = selectedRows.includes(row.id)
              return (
                <TableRow
                  key={row.id || rowIndex}
                  className={`
                    group
                    transition-colors duration-100
                    ${hoverable ? 'hover:bg-gray-50/90' : ''}
                    ${onRowClick ? 'cursor-pointer' : ''}
                    ${isRowSelected ? 'bg-blue-50/50' : ''}
                  `}
                  onClick={(e) => {
                    // Don't trigger row click when clicking checkbox
                    if (e.target.closest('[data-checkbox]')) return
                    onRowClick?.(row, rowIndex)
                  }}
                >
                  {effectiveColumns.map((column, colIndex) => {
                    const isFrozenColumn =
                      column.key === '__selection__' ||
                      frozenColumns.includes(column.key)
                    return (
                      <TableCell
                        key={column.key}
                        className={`${column.className || ''} ${isFrozenColumn ? 'bg-white group-hover:bg-gray-50/90' : ''} ${isRowSelected && isFrozenColumn ? 'bg-blue-50/50 group-hover:bg-blue-50/50' : ''}`}
                        style={{
                          ...getFrozenColumnStyle(colIndex),
                        }}
                      >
                        {column.key === '__selection__' ? (
                          <div
                            className="flex items-center justify-center"
                            data-checkbox
                          >
                            <Checkbox
                              checked={isRowSelected}
                              onCheckedChange={(checked) =>
                                handleSelectRow(row.id, checked)
                              }
                              className="checkbox-black"
                              aria-label={`Select row ${rowIndex + 1}`}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        ) : column.render ? (
                          column.render(row[column.key], row, rowIndex)
                        ) : (
                          row[column.key]
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="pagination-footer">
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-600">
              Showing {(pagination.page - 1) * pagination.pageSize + 1}–
              {Math.min(
                pagination.page * pagination.pageSize,
                pagination.total
              )}{' '}
              of {pagination.total}
            </span>

            {pagination.onPageSizeChange && (
              <Select
                value={pagination.pageSize.toString()}
                onValueChange={(val) =>
                  pagination.onPageSizeChange(parseInt(val))
                }
              >
                <SelectTrigger className="select-compact w-24 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="h-7 w-7 p-0 text-xs"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>

            <span className="text-xs text-gray-600 px-2 min-w-[60px] text-center">
              {pagination.page} of {pagination.totalPages}
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="h-7 w-7 p-0 text-xs"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Helper function to create column definitions
 */
export const createColumn = (key, label, options = {}) => ({
  key,
  label,
  ...options,
})

/**
 * Common column renderers
 */
export const columnRenderers = {
  // Render a badge with status styling
  status: (value, statusConfig = {}) => {
    const config = {
      completed: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        label: 'Completed',
      },
      in_progress: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        label: 'In Progress',
      },
      pending: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Pending' },
      scheduled: {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        label: 'Scheduled',
      },
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
      archived: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Archived' },
      ...statusConfig,
    }

    const style = config[value] || config.pending
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
      >
        {style.label}
      </span>
    )
  },

  // Render a date in a consistent format
  date: (value) => {
    if (!value) return '-'
    const date = new Date(value)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  },

  // Render user initials in a circle
  avatar: (name) => {
    if (!name) return <div className="w-8 h-8 rounded-full bg-gray-200"></div>
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

    return (
      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-semibold">
        {initials}
      </div>
    )
  },

  // Render a progress bar
  progress: (current, total, options = {}) => {
    const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0
    const { showText = true, color = 'blue' } = options

    return (
      <div className="flex items-center gap-2">
        {showText && (
          <span className="text-sm font-medium text-gray-900 min-w-[3rem]">
            {current} / {total}
          </span>
        )}
        <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[4rem]">
          <div
            className={`bg-${color}-500 h-2 rounded-full transition-all`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    )
  },

  // Render truncated text with tooltip
  truncate: (text, maxLength = 50) => {
    if (!text) return '-'
    if (text.length <= maxLength) return text

    return (
      <span title={text} className="cursor-help">
        {text.slice(0, maxLength)}...
      </span>
    )
  },
}
