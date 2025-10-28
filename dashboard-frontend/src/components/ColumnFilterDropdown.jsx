import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, X } from 'lucide-react'

/**
 * Custom dropdown filter for table column headers
 *
 * @param {Object} props
 * @param {string} props.label - Column label
 * @param {string} props.value - Current selected value
 * @param {Array} props.options - Array of {value, label} objects
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.searchable - Enable search input (default: false)
 * @param {string} props.placeholder - Search placeholder
 */
export default function ColumnFilterDropdown({
  label,
  value,
  options = [],
  onChange,
  searchable = false,
  placeholder = 'Search...',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  })
  const dropdownRef = useRef(null)
  const portalRef = useRef(null)
  const buttonRef = useRef(null)
  const searchInputRef = useRef(null)

  // Get display text for selected value
  const selectedOption = options.find((opt) => opt.value === value)
  const displayText =
    selectedOption && value !== 'all' ? `[${selectedOption.label}]` : ''

  // Update dropdown position when opened
  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const dropdownWidth = 256 // w-64 = 16rem = 256px
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right + window.scrollX - dropdownWidth,
        width: rect.width,
      })
    }
  }

  // Filter options based on search
  const filteredOptions =
    searchable && searchQuery
      ? options.filter((opt) =>
          opt.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : options

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      console.log('[ColumnFilterDropdown] Click outside check')
      const isClickInsideButton =
        dropdownRef.current && dropdownRef.current.contains(event.target)
      const isClickInsidePortal =
        portalRef.current && portalRef.current.contains(event.target)

      console.log('[ColumnFilterDropdown] Click locations:', {
        insideButton: isClickInsideButton,
        insidePortal: isClickInsidePortal,
        target: event.target.tagName,
      })

      if (!isClickInsideButton && !isClickInsidePortal) {
        console.log(
          '[ColumnFilterDropdown] Closing dropdown - click was outside'
        )
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      updatePosition()
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      // Focus search input when dropdown opens
      if (searchable && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 50)
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen, searchable])

  const handleSelect = (optionValue) => {
    console.log('[ColumnFilterDropdown] Selected:', {
      label,
      optionValue,
      currentValue: value,
    })
    // Always call onChange, even if selecting the same value (for reset behavior)
    if (onChange) {
      onChange(optionValue)
    } else {
      console.warn('[ColumnFilterDropdown] No onChange handler provided!')
    }
    setIsOpen(false)
    setSearchQuery('')
  }

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        ref={buttonRef}
        onClick={(e) => {
          console.log('[ColumnFilterDropdown] Header button clicked:', label)
          e.preventDefault()
          e.stopPropagation()
          setIsOpen(!isOpen)
          console.log('[ColumnFilterDropdown] isOpen will be:', !isOpen)
        }}
        className="flex items-center gap-1 w-full cursor-pointer hover:text-gray-900 transition-colors"
      >
        <span>{label}</span>
        {displayText && (
          <span className="text-gray-500 font-normal text-[10px]">
            {displayText}
          </span>
        )}
        <ChevronDown
          className={`w-3 h-3 text-gray-400 ml-auto transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={portalRef}
            className="fixed w-64 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              zIndex: 9999,
            }}
          >
            {searchable && (
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={placeholder}
                    className="w-full h-8 pl-8 pr-7 text-xs border border-gray-200 rounded focus:border-gray-900 focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {searchQuery && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSearchQuery('')
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="max-h-64 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-gray-500">
                  No results found
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={(e) => {
                      console.log(
                        '[ColumnFilterDropdown] Option clicked:',
                        option.label,
                        option.value
                      )
                      e.preventDefault()
                      e.stopPropagation()
                      handleSelect(option.value)
                    }}
                    onMouseDown={(e) => {
                      console.log(
                        '[ColumnFilterDropdown] Option mousedown:',
                        option.label
                      )
                    }}
                    className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-50 transition-colors ${
                      value === option.value
                        ? 'bg-gray-100 font-medium text-gray-900'
                        : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
