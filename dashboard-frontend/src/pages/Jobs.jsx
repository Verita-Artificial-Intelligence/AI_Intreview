import { useState, useEffect } from 'react'
import api from '@/utils/api'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, FileText, MessagesSquare, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import DataTable, {
  createColumn,
  columnRenderers,
} from '@/components/DataTable'
import ColumnFilterDropdown from '@/components/ColumnFilterDropdown'
import DashboardLayout from '@/components/DashboardLayout'
import JobSheet from '@/components/JobSheet'
import JobDetailSheetNew from '@/components/JobDetailSheetNew'
import JobApplicationsSheet from '@/components/JobApplicationsSheet'
import { SimpleSheetContainer } from '@/components/sheets/SheetContainer'
import { useSheetState } from '@/hooks/useSheetState'

const Jobs = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isOpen, sheetType, entityId, openSheet, closeSheet } = useSheetState()
  const [jobs, setJobs] = useState([])
  const [filteredJobs, setFilteredJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingJob, setEditingJob] = useState(null)
  const [isDeepLink, setIsDeepLink] = useState(false)

  // Column filters
  const [titleFilter, setTitleFilter] = useState('all')
  const [interviewTypeFilter, setInterviewTypeFilter] = useState('all')
  const [skillsFilter, setSkillsFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Clear all filters
  const clearFilters = () => {
    setTitleFilter('all')
    setInterviewTypeFilter('all')
    setSkillsFilter('all')
    setStatusFilter('all')
    setSearchQuery('')
  }

  // Check if any filters are active
  const hasActiveFilters =
    titleFilter !== 'all' ||
    interviewTypeFilter !== 'all' ||
    skillsFilter !== 'all' ||
    statusFilter !== 'all' ||
    searchQuery.trim() !== ''

  // Deep link support: Open sheet if job parameter is in URL on initial load
  useEffect(() => {
    const jobParam = searchParams.get('job')
    const hasSheetParam = searchParams.get('sheet')

    // If there's a job param but no sheet param, this is a deep link
    if (jobParam && !hasSheetParam) {
      setIsDeepLink(true)
      setTitleFilter(jobParam)
      // Open the sheet for this job without animation
      openSheet('job', jobParam, { replace: true })
    }
  }, []) // Only run on mount

  // Read URL params on mount and update filters
  useEffect(() => {
    const jobParam = searchParams.get('job')
    if (jobParam) {
      setTitleFilter(jobParam)
    }
  }, [searchParams]) // Run when searchParams changes

  useEffect(() => {
    fetchJobs()
  }, [])

  // Sync URL params with filters (preserving sheet state)
  useEffect(() => {
    // IMPORTANT: Start with existing params to preserve sheet state
    const next = new URLSearchParams(searchParams)

    // Update job filter param
    if (titleFilter && titleFilter !== 'all') {
      next.set('job', titleFilter)
    } else {
      next.delete('job')
    }

    setSearchParams(next, { replace: true })
  }, [titleFilter, searchParams, setSearchParams])

  useEffect(() => {
    console.log('[Jobs Filter] Running filter effect', {
      titleFilter,
      interviewTypeFilter,
      skillsFilter,
      statusFilter,
      searchQuery,
      totalJobs: jobs.length,
    })

    let filtered = [...jobs]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(query) ||
          job.position_type.toLowerCase().includes(query) ||
          job.description.toLowerCase().includes(query)
      )
      console.log('[Jobs Filter] After search:', filtered.length)
    }

    // Title filter
    if (titleFilter && titleFilter !== 'all') {
      console.log('[Jobs Filter] Applying title filter:', titleFilter)
      console.log(
        '[Jobs Filter] Sample job IDs:',
        jobs.slice(0, 3).map((j) => ({ id: j.id, type: typeof j.id }))
      )
      filtered = filtered.filter((job) => job.id === titleFilter)
      console.log('[Jobs Filter] After title filter:', filtered.length)
    }

    // Interview Type filter
    if (interviewTypeFilter && interviewTypeFilter !== 'all') {
      console.log(
        '[Jobs Filter] Applying interview type filter:',
        interviewTypeFilter
      )
      filtered = filtered.filter(
        (job) => job.interview_type === interviewTypeFilter
      )
      console.log('[Jobs Filter] After interview type filter:', filtered.length)
    }

    // Skills filter
    if (skillsFilter && skillsFilter !== 'all') {
      console.log('[Jobs Filter] Applying skills filter:', skillsFilter)
      filtered = filtered.filter((job) =>
        job.skills?.some((skill) => skill.name === skillsFilter)
      )
      console.log('[Jobs Filter] After skills filter:', filtered.length)
    }

    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      console.log('[Jobs Filter] Applying status filter:', statusFilter)
      filtered = filtered.filter((job) => job.status === statusFilter)
      console.log('[Jobs Filter] After status filter:', filtered.length)
    }

    console.log('[Jobs Filter] Final filtered count:', filtered.length)
    setFilteredJobs(filtered)
  }, [
    searchQuery,
    jobs,
    titleFilter,
    interviewTypeFilter,
    skillsFilter,
    statusFilter,
  ])

  const fetchJobs = async () => {
    try {
      setLoading(true)
      const response = await api.get('/jobs')
      setJobs(response.data)
      setFilteredJobs(response.data)
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitJob = async (jobData, jobId = null) => {
    try {
      if (jobId && jobId !== 'new') {
        // Update existing job
        await api.put(`/jobs/${jobId}`, jobData)
        // Clear edit mode to show view mode
        setEditingJob(null)
        // Clear edit mode from URL
        const newParams = new URLSearchParams(window.location.search)
        newParams.delete('mode')
        window.history.replaceState(
          {},
          '',
          `${window.location.pathname}?${newParams.toString()}`
        )
      } else {
        // Create new job
        await api.post('/jobs', jobData)
      }
      fetchJobs()
    } catch (error) {
      console.error(
        jobId ? 'Error updating job:' : 'Error creating job:',
        error
      )
      throw error
    }
  }

  // Centralized interview type labels (matching backend/config/interview_type_definitions.py)
  const getInterviewTypeLabel = (type) => {
    const labels = {
      standard: 'Standard interview',
      human_data: 'Design critique & feedback exercise',
      custom_questions: 'Custom questions only',
      custom_exercise: 'Custom Creative Exercise',
    }
    return labels[type] || type
  }

  // Get unique values for filters
  const uniqueInterviewTypes = [
    ...new Set(jobs.map((j) => j.interview_type)),
  ].filter(Boolean)
  const uniqueSkills = [
    ...new Set(jobs.flatMap((j) => j.skills?.map((s) => s.name) || [])),
  ].filter(Boolean)

  // Table columns configuration
  const columns = [
    createColumn('title', 'Job Title', {
      frozen: true,
      width: 220,
      minWidth: 180,
      headerRender: () => (
        <ColumnFilterDropdown
          label="Job Title"
          value={titleFilter}
          options={[
            { value: 'all', label: 'All Jobs' },
            ...jobs.map((j) => ({ value: j.id, label: j.title })),
          ]}
          onChange={setTitleFilter}
          searchable={true}
          placeholder="Search jobs..."
        />
      ),
      render: (_, job) => (
        <div>
          <div className="font-semibold text-neutral-900">{job.title}</div>
          <div className="text-xs text-neutral-600 mt-1">
            {job.position_type}
          </div>
        </div>
      ),
    }),
    createColumn('description', 'Description', {
      render: (_, job) => (
        <div className="max-w-xs">
          <p className="text-sm text-neutral-600 line-clamp-2">
            {job.description}
          </p>
        </div>
      ),
    }),
    createColumn('interview_type', 'Interview Type', {
      width: 220,
      className: 'text-left border-l border-gray-200',
      headerRender: () => (
        <ColumnFilterDropdown
          label="Interview Type"
          value={interviewTypeFilter}
          options={[
            { value: 'all', label: 'All Types' },
            ...uniqueInterviewTypes.map((type) => ({
              value: type,
              label: getInterviewTypeLabel(type),
            })),
          ]}
          onChange={setInterviewTypeFilter}
          searchable={false}
        />
      ),
      render: (_, job) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-neutral-400" />
          <span className="text-xs text-neutral-600">
            {getInterviewTypeLabel(job.interview_type)}
          </span>
        </div>
      ),
    }),
    createColumn('skills', 'Skills', {
      width: 200,
      className: 'text-left border-l border-gray-200',
      headerRender: () => (
        <ColumnFilterDropdown
          label="Skills"
          value={skillsFilter}
          options={[
            { value: 'all', label: 'All Skills' },
            ...uniqueSkills.map((skill) => ({ value: skill, label: skill })),
          ]}
          onChange={setSkillsFilter}
          searchable={true}
          placeholder="Search skills..."
        />
      ),
      render: (_, job) => {
        if (!job.skills || job.skills.length === 0) {
          return <span className="text-sm text-gray-400">-</span>
        }

        return (
          <div className="flex flex-wrap gap-1">
            {job.skills.slice(0, 2).map((skill, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-neutral-100 text-neutral-700 rounded text-xs"
              >
                {skill.name}
              </span>
            ))}
            {job.skills.length > 2 && (
              <span className="px-2 py-1 bg-neutral-100 text-neutral-700 rounded text-xs">
                +{job.skills.length - 2} more
              </span>
            )}
          </div>
        )
      },
    }),
    createColumn('status', 'Status', {
      width: 140,
      className: 'text-left border-l border-gray-200',
      headerRender: () => (
        <ColumnFilterDropdown
          label="Status"
          value={statusFilter}
          options={[
            { value: 'all', label: 'All Statuses' },
            { value: 'pending', label: 'Pending' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'archived', label: 'Archived' },
          ]}
          onChange={setStatusFilter}
          searchable={false}
        />
      ),
      render: (_, job) => {
        const statusConfig = {
          pending: { bg: 'badge-blue', label: 'Pending' },
          in_progress: { bg: 'badge-yellow', label: 'In Progress' },
          completed: { bg: 'badge-green', label: 'Completed' },
          archived: { bg: 'badge-gray', label: 'Archived' },
        }
        const config = statusConfig[job.status] || statusConfig.pending
        return <span className={`badge ${config.bg}`}>{config.label}</span>
      },
    }),
  ]

  const handleRowClick = (job) => {
    setEditingJob(null) // Clear edit mode when opening a different job
    openSheet('job', job.id)
  }

  const handleEditJob = (job) => {
    setEditingJob(job)
    // Update URL to show edit mode
    const newParams = new URLSearchParams(window.location.search)
    newParams.set('mode', 'edit')
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}?${newParams.toString()}`
    )
  }

  const handleCancelEdit = () => {
    setEditingJob(null)
    // Clear edit mode from URL
    const newParams = new URLSearchParams(window.location.search)
    newParams.delete('mode')
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}?${newParams.toString()}`
    )
  }

  // Reset edit mode when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setEditingJob(null)
      // Clear edit mode from URL
      const newParams = new URLSearchParams(window.location.search)
      if (newParams.has('mode')) {
        newParams.delete('mode')
        window.history.replaceState(
          {},
          '',
          `${window.location.pathname}?${newParams.toString()}`
        )
      }
    }
  }, [isOpen])

  // Sync edit mode with URL on mount/change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const mode = params.get('mode')
    if (mode === 'edit' && entityId && entityId !== 'new' && !editingJob) {
      const job = jobs.find((j) => j.id === entityId)
      if (job) {
        setEditingJob(job)
      }
    }
  }, [entityId, jobs, editingJob])

  return (
    <DashboardLayout
      search={searchQuery}
      onSearchChange={(e) => setSearchQuery(e.target.value)}
      searchPlaceholder="Search jobs by title, type, or description..."
      leftActions={
        hasActiveFilters && (
          <Button
            onClick={clearFilters}
            variant="outline"
            size="sm"
            className="text-xs h-9 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <X className="w-3.5 h-3.5 mr-1.5" />
            Clear Filters
          </Button>
        )
      }
      actionButton={
        <Button
          onClick={() => openSheet('job', 'new')}
          type="button"
          className="rounded-lg bg-brand-500 hover:bg-brand-600 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Job
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={filteredJobs}
        onRowClick={handleRowClick}
        loading={loading}
        density="compact"
        frozenColumns={['title']}
        emptyState={
          <div className="p-10 text-center bg-surface border border-neutral-200 rounded-xl shadow-card">
            <MessagesSquare
              className="w-10 h-10 mx-auto mb-3 text-gray-300"
              strokeWidth={1.5}
            />
            <p className="text-sm text-neutral-600 mb-3">
              {searchQuery
                ? 'No jobs found matching your search'
                : 'No jobs yet. Create your first job posting to get started'}
            </p>
            {!searchQuery ? (
              <Button
                onClick={() => openSheet('job', 'new')}
                variant="outline"
                size="sm"
                className="rounded-lg font-normal text-xs h-8 px-3"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Create Your First Job
              </Button>
            ) : (
              <Button
                onClick={() => setSearchQuery('')}
                variant="outline"
                size="sm"
                className="rounded-lg font-normal text-xs h-8 px-3"
              >
                Clear Search
              </Button>
            )}
          </div>
        }
      />

      {/* Job Sheet - unified wrapper */}
      <JobSheetWrapper
        isOpen={isOpen && sheetType === 'job'}
        onOpenChange={(open) => {
          if (!open) {
            closeSheet()
            setIsDeepLink(false) // Reset deep link flag when closing
          }
        }}
        entityId={entityId}
        editingJob={editingJob}
        onEdit={handleEditJob}
        onSubmit={handleSubmitJob}
        onCancelEdit={handleCancelEdit}
        isDeepLink={isDeepLink}
      />

      {/* Job Applications Sheet - Drill-down */}
      <JobApplicationsSheet
        open={isOpen && sheetType === 'job-applications'}
        onOpenChange={(open) => {
          if (!open) closeSheet()
        }}
        jobId={entityId}
      />
    </DashboardLayout>
  )
}

/**
 * Unified wrapper that keeps a single Sheet instance and swaps content
 * This prevents the jarring animation when switching between view and edit modes
 */
function JobSheetWrapper({
  isOpen,
  onOpenChange,
  entityId,
  editingJob,
  onEdit,
  onSubmit,
  onCancelEdit,
  isDeepLink,
}) {
  const { breadcrumbs, navigateBack } = useSheetState()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && entityId && entityId !== 'new') {
      fetchJobData()
    }
  }, [isOpen, entityId])

  const fetchJobData = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/jobs/${entityId}`)
      setJob(response.data)
    } catch (error) {
      console.error('Error fetching job:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (jobData, jobId) => {
    await onSubmit(jobData, jobId)
    // Refetch job data to show updated values
    if (jobId) {
      await fetchJobData()
    }
  }

  // Determine which content to show
  const isEditMode = entityId === 'new' || editingJob
  const title =
    entityId === 'new' ? 'Create Job' : editingJob ? 'Edit Job' : 'Job Details'

  // Add edit mode breadcrumb manually if in edit mode
  const displayBreadcrumbs = editingJob
    ? [
        ...breadcrumbs.filter((b) => !b.isCurrent),
        // Add the current job breadcrumb but mark it as NOT current (so it's clickable)
        { ...breadcrumbs.find((b) => b.isCurrent), isCurrent: false },
        // Add edit breadcrumb as current
        { type: 'edit', label: 'Edit', isCurrent: true },
      ]
    : breadcrumbs

  const handleBreadcrumbClick = (crumb) => {
    if (crumb.type === 'edit') {
      // Clicking Edit breadcrumb (shouldn't happen as it's current)
      return
    } else if (editingJob) {
      // In edit mode, clicking Job breadcrumb goes back to view mode
      onCancelEdit()
    } else {
      // Use default breadcrumb navigation for drill-downs
      navigateBack()
    }
  }

  return (
    <SimpleSheetContainer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      customBreadcrumbs={
        displayBreadcrumbs.length > 0 ? displayBreadcrumbs : null
      }
      onBreadcrumbNavigate={handleBreadcrumbClick}
      disableAnimations={isDeepLink}
    >
      {isEditMode ? (
        <JobSheet
          open={isOpen}
          onOpenChange={onOpenChange}
          job={editingJob}
          onSubmit={handleSubmit}
          onCancel={editingJob ? onCancelEdit : undefined}
          isWrapper={true}
        />
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-gray-600">Loading job details...</p>
        </div>
      ) : job ? (
        <JobDetailSheetNew
          open={isOpen}
          onOpenChange={onOpenChange}
          jobId={entityId}
          onEdit={onEdit}
          isWrapper={true}
          initialJob={job}
        />
      ) : (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-gray-600">Job not found</p>
        </div>
      )}
    </SimpleSheetContainer>
  )
}

export default Jobs
