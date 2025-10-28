import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '@/utils/api'
import DashboardLayout from '@/components/DashboardLayout'
import DataTable, {
  createColumn,
  columnRenderers,
} from '@/components/DataTable'
import ColumnFilterDropdown from '@/components/ColumnFilterDropdown'
import { MessagesSquare } from 'lucide-react'

const Pipeline = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [candidates, setCandidates] = useState([])
  const [jobs, setJobs] = useState([])
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const statusParam = searchParams.get('status')
  const jobParam = searchParams.get('job')
  const resultParam = searchParams.get('result')

  const [statusFilter, setStatusFilter] = useState(statusParam || 'all')
  const [jobFilter, setJobFilter] = useState(jobParam || 'all')
  const [resultFilter, setResultFilter] = useState(resultParam || 'all')
  const [density] = useState('compact')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [candidatesRes, jobsRes, interviewsRes] = await Promise.all([
        api.get('/candidates'),
        api.get('/jobs'),
        api.get('/interviews'),
      ])
      setCandidates(candidatesRes.data)
      setJobs(jobsRes.data)
      setInterviews(interviewsRes.data)
    } catch (err) {
      console.error('Error loading pipeline:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredInterviews = useMemo(() => {
    let list = [...interviews]

    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
      list = list.filter((i) => (i.status || '').toLowerCase() === statusFilter)
    }

    // Apply job filter
    if (jobFilter && jobFilter !== 'all') {
      list = list.filter((i) => i.job_id === jobFilter)
    }

    // Apply result filter
    if (resultFilter && resultFilter !== 'all') {
      list = list.filter(
        (i) => (i.acceptance_status || '').toLowerCase() === resultFilter
      )
    }

    // Apply search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (i) =>
          i.candidate_name?.toLowerCase().includes(q) ||
          i.job_title?.toLowerCase().includes(q) ||
          i.position?.toLowerCase().includes(q)
      )
    }

    return list
  }, [interviews, search, statusFilter, jobFilter, resultFilter])

  const getInitials = (name) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase()
  }

  const clearFilters = () => {
    setStatusFilter('all')
    setJobFilter('all')
    setResultFilter('all')
    setSearch('')
    setSearchParams({})
  }

  const hasActiveFilters =
    (statusFilter && statusFilter !== 'all') ||
    (jobFilter && jobFilter !== 'all') ||
    (resultFilter && resultFilter !== 'all') ||
    Boolean(search)

  // Sync URL params with filters
  useEffect(() => {
    const next = new URLSearchParams()
    if (statusFilter && statusFilter !== 'all') next.set('status', statusFilter)
    if (jobFilter && jobFilter !== 'all') next.set('job', jobFilter)
    if (resultFilter && resultFilter !== 'all') next.set('result', resultFilter)
    setSearchParams(next)
  }, [statusFilter, jobFilter, resultFilter, setSearchParams])

  // Production table columns - optimized order and layout
  const columns = [
    createColumn('candidate', 'Candidate', {
      frozen: true,
      width: 220,
      minWidth: 180,
      render: (_, interview) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-800 flex-shrink-0">
            {getInitials(interview.candidate_name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900 text-truncate">
              {interview.candidate_name || 'Unknown'}
            </div>
          </div>
        </div>
      ),
    }),
    createColumn('job', 'Job', {
      frozen: true,
      width: 180,
      minWidth: 140,
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
      render: (_, interview) => (
        <div
          className="text-sm text-gray-900 text-truncate"
          title={interview.job_title}
        >
          {interview.job_title || 'Unknown'}
        </div>
      ),
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
            { value: 'completed', label: 'Completed' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'pending', label: 'Pending' },
          ]}
          onChange={setStatusFilter}
          searchable={false}
        />
      ),
      render: (_, interview) => {
        const statusConfig = {
          completed: { bg: 'badge-green', text: '', label: 'Completed' },
          in_progress: { bg: 'badge-yellow', text: '', label: 'In Progress' },
          scheduled: { bg: 'badge-blue', text: '', label: 'Scheduled' },
          pending: { bg: 'badge-gray', text: '', label: 'Pending' },
        }
        const config = statusConfig[interview.status] || statusConfig.pending
        return <span className={`badge ${config.bg}`}>{config.label}</span>
      },
    }),
    createColumn('result', 'Result', {
      width: 120,
      className: 'text-left border-l border-gray-200',
      headerRender: () => (
        <ColumnFilterDropdown
          label="Result"
          value={resultFilter}
          options={[
            { value: 'all', label: 'All Results' },
            { value: 'accepted', label: 'Accepted' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'pending', label: 'Pending' },
          ]}
          onChange={setResultFilter}
          searchable={false}
        />
      ),
      render: (_, interview) => {
        if (!interview.acceptance_status)
          return <span className="text-xs text-gray-400">—</span>

        const resultConfig = {
          accepted: { class: 'badge-green', label: 'Accepted' },
          rejected: { class: 'badge-red', label: 'Rejected' },
          pending: { class: 'badge-gray', label: 'Pending' },
        }

        const config =
          resultConfig[interview.acceptance_status] || resultConfig.pending
        return <span className={`badge ${config.class}`}>{config.label}</span>
      },
    }),
    createColumn('updated', 'Updated', {
      width: 100,
      className: 'text-left border-l border-gray-200',
      render: (_, interview) => (
        <span
          className="text-xs text-gray-500"
          title={new Date(interview.created_at).toLocaleString()}
        >
          {columnRenderers.date(interview.created_at)}
        </span>
      ),
    }),
  ]

  return (
    <DashboardLayout
      search={search}
      onSearchChange={(e) => setSearch(e.target.value)}
      searchPlaceholder="Ask anything about candidates, jobs, or interviews..."
    >
      <DataTable
        columns={columns}
        data={filteredInterviews}
        loading={loading}
        density={density}
        frozenColumns={['candidate', 'job']}
        emptyState={
          <div className="py-20 text-center text-sm text-gray-500">
            <MessagesSquare className="w-8 h-8 mx-auto mb-3 text-gray-300" />
            {hasActiveFilters
              ? 'No interviews match your filters'
              : 'No interviews yet'}
          </div>
        }
      />
    </DashboardLayout>
  )
}

export default Pipeline
