import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import api from '@/utils/api'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import DataTable, {
  createColumn,
  columnRenderers,
} from '@/components/DataTable'
import ColumnFilterDropdown from '@/components/ColumnFilterDropdown'
import AnnotatorProfileSheetNew from '@/components/AnnotatorProfileSheetNew'
import { useSheetState } from '@/hooks/useSheetState'
import {
  RotateCcw,
  AlertCircle,
  FolderKanban,
  Search,
  ChevronDown,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import { toast } from 'sonner'

export default function Annotators() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isOpen, sheetType, entityId, openSheet, closeSheet } = useSheetState()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [jobFilter, setJobFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('score_desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('')
    setJobFilter('all')
    setStatusFilter('all')
    setPage(1)
  }

  // Check if any filters are active
  const hasActiveFiltersAnnotators =
    jobFilter !== 'all' || statusFilter !== 'all' || searchTerm.trim() !== ''

  // UI state
  const [retryDialogOpen, setRetryDialogOpen] = useState(false)
  const [selectedInterview, setSelectedInterview] = useState(null)
  const [retrying, setRetrying] = useState(false)

  // Selection and assignment state
  const [selectedAnnotators, setSelectedAnnotators] = useState([])
  const [showAssignUI, setShowAssignUI] = useState(false)
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignDropdownPosition, setAssignDropdownPosition] = useState({
    top: 0,
    left: 0,
  })
  const assignButtonRef = useRef(null)
  const assignDropdownRef = useRef(null)

  // Options for filters
  const [jobs, setJobs] = useState([])
  const [isDeepLink, setIsDeepLink] = useState(false)

  // Deep link support: Open sheet if annotator parameter is in URL on initial load
  useEffect(() => {
    const sheetParam = searchParams.get('sheet')
    const idParam = searchParams.get('id')

    // If there's a sheet and id param, this is a deep link
    if (sheetParam === 'annotator' && idParam) {
      setIsDeepLink(true)
      openSheet('annotator', idParam, { replace: true })
    }
  }, []) // Only run on mount

  const fetchAnnotators = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        page,
        page_size: pageSize,
        sort: sortBy,
      }

      if (searchTerm) params.query = searchTerm
      if (jobFilter !== 'all') params.jobId = jobFilter
      if (statusFilter !== 'all') params.status = statusFilter

      const response = await api.get('/annotators/accepted', { params })
      // Transform items to have id field for DataTable selection
      const transformedItems = (response.data.items || []).map((item) => ({
        ...item,
        id: item.candidateId,
      }))
      setItems(transformedItems)
      setTotal(response.data.total || 0)
      setTotalPages(response.data.totalPages || 0)
    } catch (error) {
      console.error('Failed to fetch annotators:', error)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, sortBy, searchTerm, jobFilter, statusFilter])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAnnotators()
    }, 250)
    return () => clearTimeout(timer)
  }, [fetchAnnotators])

  // Read URL params on mount and update filters
  useEffect(() => {
    const jobParam = searchParams.get('job')
    const statusParam = searchParams.get('status')

    if (jobParam) {
      setJobFilter(jobParam)
    }
    if (statusParam) {
      setStatusFilter(statusParam)
    }
  }, [searchParams]) // Run when searchParams changes

  // Fetch filter options and projects
  useEffect(() => {
    fetchFilterOptions()
    fetchProjects()
  }, [])

  // Sync URL params with filters (but don't run on mount to avoid overwriting URL params)
  useEffect(() => {
    // IMPORTANT: Start with existing params to preserve sheet state
    const next = new URLSearchParams(searchParams)

    // Update filter params
    if (jobFilter && jobFilter !== 'all') {
      next.set('job', jobFilter)
    } else {
      next.delete('job')
    }

    if (statusFilter && statusFilter !== 'all') {
      next.set('status', statusFilter)
    } else {
      next.delete('status')
    }

    setSearchParams(next, { replace: true })
  }, [jobFilter, statusFilter, searchParams, setSearchParams])

  // Update assignment dropdown position
  const updateAssignDropdownPosition = useCallback(() => {
    if (assignButtonRef.current) {
      const rect = assignButtonRef.current.getBoundingClientRect()
      setAssignDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
      })
    }
  }, [])

  // Click outside to close assign UI and position management
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is on a portaled SearchableSelect dropdown
      const isSearchableDropdown = event.target.closest(
        '[data-searchable-select-portal]'
      )

      if (
        showAssignUI &&
        !isSearchableDropdown &&
        assignDropdownRef.current &&
        !assignDropdownRef.current.contains(event.target) &&
        assignButtonRef.current &&
        !assignButtonRef.current.contains(event.target)
      ) {
        setShowAssignUI(false)
        setSelectedProject('')
      }
    }

    if (showAssignUI) {
      updateAssignDropdownPosition()
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('scroll', updateAssignDropdownPosition, true)
      window.addEventListener('resize', updateAssignDropdownPosition)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', updateAssignDropdownPosition, true)
      window.removeEventListener('resize', updateAssignDropdownPosition)
    }
  }, [showAssignUI, updateAssignDropdownPosition])

  const fetchFilterOptions = async () => {
    try {
      // Fetch jobs for filter dropdown
      const jobsRes = await api.get('/jobs')
      setJobs(jobsRes.data || [])
    } catch (error) {
      console.error('Failed to fetch filter options:', error)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects', {
        params: { status: 'active' },
      })
      setProjects(response.data.items || response.data || [])
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      toast.error('Failed to load projects')
    }
  }

  const handleBulkAssign = async () => {
    if (!selectedProject || selectedAnnotators.length === 0) return

    try {
      setAssigning(true)
      const assignments = selectedAnnotators.map((candidateId) => ({
        project_id: selectedProject,
        candidate_id: candidateId,
      }))
      await api.post(`/projects/${selectedProject}/assignments/bulk`, {
        assignments,
      })
      toast.success(
        `Successfully assigned ${selectedAnnotators.length} annotator(s) to project`
      )
      setShowAssignUI(false)
      setSelectedAnnotators([])
      setSelectedProject('')
      // Refresh annotators list
      fetchAnnotators()
    } catch (error) {
      console.error('Failed to assign annotators:', error)
      const errorMsg =
        error.response?.data?.detail || 'Failed to assign annotators'
      toast.error(errorMsg)
    } finally {
      setAssigning(false)
    }
  }

  const handleRetryScoringConfirm = async () => {
    if (!selectedInterview) return

    try {
      setRetrying(true)
      await api.post(`/interviews/${selectedInterview}/retry-scoring`)
      // Refresh list
      fetchAnnotators()
      setRetryDialogOpen(false)
      setSelectedInterview(null)
    } catch (error) {
      console.error('Failed to retry scoring:', error)
      alert('Failed to retry scoring. Please try again.')
    } finally {
      setRetrying(false)
    }
  }

  const handleRowClick = (item) => {
    openSheet('annotator', item.candidateId)
  }

  const renderScore = (item) => {
    if (item.scoreStatus === 'scored' && item.score !== null) {
      const isPassing = item.passStatus === 'pass'
      return (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-900">{item.score}</span>
          <span className={`badge ${isPassing ? 'badge-green' : 'badge-red'}`}>
            {isPassing ? 'Pass' : 'Fail'}
          </span>
        </div>
      )
    } else if (item.scoreStatus === 'pending') {
      return <span className="text-sm text-gray-500">Pending</span>
    } else if (item.scoreStatus === 'error') {
      return (
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-600">Error</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={() => {
              setSelectedInterview(item.interviewId)
              setRetryDialogOpen(true)
            }}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        </div>
      )
    }
    return <span className="text-sm text-gray-400">-</span>
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Table columns configuration
  const columns = [
    createColumn('name', 'Name', {
      frozen: true,
      width: 180,
      minWidth: 140,
      render: (_, item) => (
        <div className="font-medium text-neutral-900">{item.candidateName}</div>
      ),
    }),
    createColumn('email', 'Email', {
      width: 200,
      render: (_, item) => (
        <span className="text-sm text-neutral-600">{item.candidateEmail}</span>
      ),
    }),
    createColumn('job', 'Job Posting', {
      frozen: true,
      width: 180,
      minWidth: 140,
      className: 'text-left border-l border-gray-200',
      headerRender: () => (
        <ColumnFilterDropdown
          label="Job"
          value={jobFilter}
          options={[
            { value: 'all', label: 'All Jobs' },
            ...jobs.map((j) => ({ value: j.id, label: j.title })),
          ]}
          onChange={setJobFilter}
          searchable={true}
          placeholder="Search jobs..."
        />
      ),
      render: (_, item) => (
        <span className="text-sm">
          {item.jobTitle || item.job_title || '-'}
        </span>
      ),
    }),
    createColumn('projects', 'Projects', {
      width: 140,
      className: 'text-left border-l border-gray-200',
      render: (_, item) => {
        if (item.projectCount > 0) {
          return (
            <Badge
              variant="secondary"
              className="text-xs border-brand-200 text-brand-700 bg-brand-50"
            >
              {item.projectCount} project{item.projectCount !== 1 ? 's' : ''}
            </Badge>
          )
        }
        return <span className="text-neutral-400">Unassigned</span>
      },
    }),
    createColumn('score', 'AI Score', {
      width: 140,
      className: 'text-left border-l border-gray-200',
      headerRender: () => (
        <ColumnFilterDropdown
          label="AI Score"
          value={statusFilter}
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'pass', label: 'Pass' },
            { value: 'fail', label: 'Fail' },
          ]}
          onChange={setStatusFilter}
          searchable={false}
        />
      ),
      render: (_, item) => renderScore(item),
    }),
    createColumn('acceptedDate', 'Accepted Date', {
      width: 140,
      className: 'text-left border-l border-gray-200',
      render: (_, item) => (
        <span className="text-sm text-neutral-600">
          {formatDate(item.acceptedDate)}
        </span>
      ),
    }),
    createColumn('lastActivity', 'Last Activity', {
      width: 160,
      className: 'text-left border-l border-gray-200',
      headerRender: () => (
        <button
          onClick={() => {
            if (sortBy === 'activity_desc') {
              setSortBy('activity_asc')
            } else if (sortBy === 'activity_asc') {
              setSortBy('score_desc')
            } else {
              setSortBy('activity_desc')
            }
          }}
          className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors text-[11px] font-medium w-full"
        >
          <span>Last Activity</span>
          {sortBy === 'activity_desc' ? (
            <ArrowDown className="w-3 h-3" />
          ) : sortBy === 'activity_asc' ? (
            <ArrowUp className="w-3 h-3" />
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-50" />
          )}
        </button>
      ),
      render: (_, item) => (
        <span className="text-sm text-neutral-600">
          {formatDate(item.lastActivity)}
        </span>
      ),
    }),
  ]

  const paginationConfig = {
    page,
    totalPages,
    pageSize,
    total,
    onPageChange: setPage,
    onPageSizeChange: (newSize) => {
      setPageSize(newSize)
      setPage(1)
    },
  }

  return (
    <DashboardLayout
      search={searchTerm}
      onSearchChange={(e) => setSearchTerm(e.target.value)}
      searchPlaceholder="Search by name or email..."
      leftActions={
        <>
          <Button
            ref={assignButtonRef}
            onClick={() => setShowAssignUI(!showAssignUI)}
            disabled={selectedAnnotators.length === 0}
            className={
              selectedAnnotators.length > 0
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-200 text-gray-600 cursor-not-allowed border border-gray-300'
            }
          >
            <FolderKanban className="w-4 h-4 mr-2" />
            {selectedAnnotators.length > 0
              ? `Assign ${selectedAnnotators.length} to Project`
              : 'Assign to Project'}
          </Button>
          {hasActiveFiltersAnnotators && (
            <Button
              onClick={clearFilters}
              variant="outline"
              size="sm"
              className="text-xs h-9 border-gray-300 text-gray-700 hover:bg-gray-50 ml-2"
            >
              <X className="w-3.5 h-3.5 mr-1.5" />
              Clear Filters
            </Button>
          )}
        </>
      }
    >
      <DataTable
        columns={columns}
        data={items}
        onRowClick={handleRowClick}
        loading={loading}
        density="compact"
        selectable={true}
        selectedRows={selectedAnnotators}
        onSelectionChange={setSelectedAnnotators}
        frozenColumns={['name', 'job']}
        pagination={paginationConfig}
        emptyState={
          <div className="p-10 text-center bg-surface border border-neutral-200 rounded-xl shadow-card">
            <p className="text-sm text-neutral-600 mb-3">
              No accepted annotators found. Only candidates who have been
              explicitly accepted as annotators appear here.
            </p>
            <p className="text-xs text-neutral-500">
              Regular candidates (not yet accepted as annotators) are shown in
              the Candidates view.
            </p>
          </div>
        }
      />

      {/* Portaled Assignment UI */}
      {showAssignUI &&
        selectedAnnotators.length > 0 &&
        createPortal(
          <div
            ref={assignDropdownRef}
            className="fixed w-96 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-[10000]"
            style={{
              top: `${assignDropdownPosition.top}px`,
              left: `${assignDropdownPosition.left}px`,
            }}
          >
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 mb-1">
                  Assign to Project
                </h3>
                <p className="text-xs text-neutral-600 mb-3">
                  Assign {selectedAnnotators.length} selected annotator
                  {selectedAnnotators.length !== 1 ? 's' : ''} to a project.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-700 block">
                  Select Project
                </label>
                <SearchableSelect
                  value={selectedProject}
                  onChange={setSelectedProject}
                  options={projects.map((p) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                  placeholder="Choose a project..."
                  searchPlaceholder="Search projects..."
                  emptyMessage="No projects found"
                />
              </div>

              {projects.length === 0 && (
                <p className="text-xs text-neutral-500">
                  No active projects available. Create a project first.
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAssignUI(false)
                    setSelectedProject('')
                  }}
                  disabled={assigning}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleBulkAssign}
                  disabled={!selectedProject || assigning}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {assigning ? 'Assigning...' : 'Assign'}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Retry Scoring Dialog */}
      <AlertDialog open={retryDialogOpen} onOpenChange={setRetryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retry AI Scoring?</AlertDialogTitle>
            <AlertDialogDescription>
              This will re-run the AI analysis for this interview. The previous
              score will be replaced with the new result.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={retrying}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRetryScoringConfirm}
              disabled={retrying}
            >
              {retrying ? 'Retrying...' : 'Retry Scoring'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Annotator Profile Sheet - Read-only when viewing others' accounts */}
      <AnnotatorProfileSheetNew
        open={isOpen && sheetType === 'annotator'}
        onOpenChange={(open) => {
          if (!open) {
            closeSheet()
            setIsDeepLink(false)
          }
        }}
        candidateId={entityId}
        allowEdit={false}
      />
    </DashboardLayout>
  )
}

/**
 * Searchable Select Component
 * Opens a dropdown with search input inside for filtering options
 */
function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  })
  const containerRef = useRef(null)
  const portalRef = useRef(null)
  const buttonRef = useRef(null)
  const searchInputRef = useRef(null)

  const selectedOption = options.find((opt) => opt.value === value)
  const filteredOptions = searchQuery
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside both the button and the portaled dropdown
      const isOutsideButton =
        buttonRef.current && !buttonRef.current.contains(event.target)
      const isOutsidePortal =
        portalRef.current && !portalRef.current.contains(event.target)

      if (isOutsideButton && isOutsidePortal) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      updatePosition()
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen])

  const handleSelect = (optionValue) => {
    onChange(optionValue)
    setIsOpen(false)
    setSearchQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between h-10 px-3 text-sm border border-gray-200 rounded-md bg-white hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={portalRef}
            data-searchable-select-portal="true"
            className="fixed bg-white border border-gray-200 rounded-md shadow-xl overflow-hidden z-[10000]"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
            }}
          >
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
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

            <div className="max-h-64 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-gray-500">
                  {emptyMessage}
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleSelect(option.value)
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                    }}
                    className={`w-full px-3 py-3 text-left text-sm hover:bg-blue-50 active:bg-blue-100 transition-colors cursor-pointer select-none ${
                      value === option.value
                        ? 'bg-blue-100 font-medium text-blue-900'
                        : 'text-gray-700'
                    }`}
                    style={{ touchAction: 'manipulation' }}
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
