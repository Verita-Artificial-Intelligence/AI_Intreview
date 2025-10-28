import React from 'react'
import { Search, X, Download, Filter, ChevronDown, Plus } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

/**
 * Compact, production-grade toolbar for data tables
 *
 * @param {Object} props
 * @param {string} props.searchValue - Current search value
 * @param {Function} props.onSearchChange - Search change handler
 * @param {string} props.searchPlaceholder - Search input placeholder
 * @param {Array} props.filters - Array of filter objects: { key, label, value, options, onChange }
 * @param {Array} props.activeFilters - Array of active filter chips: { key, label, value, onRemove }
 * @param {Function} props.onClearAll - Clear all filters handler
 * @param {Function} props.onExport - Export handler
 * @param {string} props.density - Current density: 'comfortable' | 'compact'
 * @param {Function} props.onDensityChange - Density change handler
 * @param {string} props.className - Additional CSS classes
 */
export default function CompactToolbar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  activeFilters = [],
  onClearAll,
  onExport,
  className = '',
}) {
  return (
    <div className={`toolbar ${className}`}>
      <div className="flex flex-wrap gap-4 items-center w-full py-3">
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500 block mb-1">
            Search
          </span>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-600 w-4 h-4" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-9 pr-3 h-10 border-0 border-b border-gray-200 rounded-none focus-visible:ring-0 focus:border-gray-900"
            />
          </div>
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          {filters.map((filter) => (
            <div key={filter.key} className="min-w-[140px]">
              <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500 block mb-1">
                {filter.label}
              </span>
              <Select value={filter.value} onValueChange={filter.onChange}>
                <SelectTrigger className="h-10 border-gray-200 text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2 text-left">
                    <Filter className="w-3 h-3 text-gray-400" />
                    <SelectValue placeholder={`All ${filter.label}`} />
                  </div>
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </SelectTrigger>
                <SelectContent className="min-w-[220px]">
                  {filter.options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full border border-gray-300 ${option.color || ''}`}
                          ></span>
                          <span>{option.label}</span>
                        </div>
                        {option.label !== 'All Statuses' &&
                          option.label !== 'All Candidates' &&
                          option.label !== 'All Jobs' && (
                            <span className="text-[11px] uppercase tracking-wide text-gray-400">
                              Enter
                            </span>
                          )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          <div className="flex items-center gap-2">
            {onExport && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onExport}
                className="h-9 px-3 text-sm text-gray-600 hover:text-gray-900"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="h-9 px-3 text-sm text-gray-600 hover:text-gray-900"
            >
              Clear
            </Button>

            <Button
              variant="default"
              size="sm"
              className="h-9 px-3 bg-gray-900 hover:bg-gray-800 text-white text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              New
            </Button>
          </div>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {activeFilters.map((filter) => (
            <div
              key={`${filter.key}-${filter.value}`}
              className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-gray-700 border border-gray-200 shadow-sm"
            >
              <span className="font-medium text-gray-600 uppercase tracking-wide text-[10px]">
                {filter.label}
              </span>
              <span>{filter.displayValue || filter.value}</span>
              <button
                onClick={() => filter.onRemove?.(filter.key)}
                className="w-4 h-4 flex items-center justify-center rounded-full bg-transparent text-gray-500 hover:bg-gray-200"
                aria-label={`Remove ${filter.label} filter`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Helper function to create filter objects
 */
export const createFilter = (key, label, value, options, onChange) => ({
  key,
  label,
  value,
  options,
  onChange,
})

/**
 * Helper function to create active filter chips
 */
export const createActiveFilter = (
  key,
  label,
  value,
  displayValue,
  onRemove
) => ({
  key,
  label,
  value,
  displayValue,
  onRemove,
})
