import { useState, useEffect } from 'react'
import api from '@/utils/api'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, MessagesSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import DataTable, {
  createColumn,
  columnRenderers,
} from '@/components/DataTable'
import ColumnFilterDropdown from '@/components/ColumnFilterDropdown'
import DashboardLayout from '@/components/DashboardLayout'
import JobForm from '@/components/JobForm'

const Jobs = () => {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [filteredJobs, setFilteredJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showJobForm, setShowJobForm] = useState(false)
  const [editingJob, setEditingJob] = useState(null)

  // Column filters
  const [titleFilter, setTitleFilter] = useState('all')
  const [interviewTypeFilter, setInterviewTypeFilter] = useState('all')
  const [skillsFilter, setSkillsFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchJobs()
  }, [])

  useEffect(() => {
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
    }

    // Title filter
    if (titleFilter && titleFilter !== 'all') {
      filtered = filtered.filter((job) => job.id === titleFilter)
    }

    // Interview Type filter
    if (interviewTypeFilter && interviewTypeFilter !== 'all') {
      filtered = filtered.filter(
        (job) => job.interview_type === interviewTypeFilter
      )
    }

    // Skills filter
    if (skillsFilter && skillsFilter !== 'all') {
      filtered = filtered.filter((job) =>
        job.skills?.some((skill) => skill.name === skillsFilter)
      )
    }

    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter((job) => job.status === statusFilter)
    }

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
      if (jobId) {
        // Update existing job
        await api.put(`/jobs/${jobId}`, jobData)
      } else {
        // Create new job
        await api.post('/jobs', jobData)
      }
      fetchJobs()
      setShowJobForm(false)
      setEditingJob(null)
    } catch (error) {
      console.error(
        jobId ? 'Error updating job:' : 'Error creating job:',
        error
      )
      throw error
    }
  }

  const handleEditJob = (job) => {
    setEditingJob(job)
    setShowJobForm(true)
  }

  const handleCloseJobForm = () => {
    setShowJobForm(false)
    setEditingJob(null)
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
    handleEditJob(job)
  }

  return (
    <DashboardLayout
      search={searchQuery}
      onSearchChange={(e) => setSearchQuery(e.target.value)}
      searchPlaceholder="Search jobs by title, type, or description..."
      actionButton={
        <Button
          onClick={() => setShowJobForm(true)}
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
                onClick={() => setShowJobForm(true)}
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

      {/* Job Form Modal */}
      <JobForm
        open={showJobForm}
        onClose={handleCloseJobForm}
        onSubmit={handleSubmitJob}
        job={editingJob}
      />
    </DashboardLayout>
  )
}

export default Jobs
