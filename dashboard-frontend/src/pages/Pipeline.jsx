import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '@/utils/api'
import Sidebar from '@/components/Sidebar'
import DataTable, {
  createColumn,
  columnRenderers,
} from '@/components/DataTable'
import CompactToolbar, { createActiveFilter } from '@/components/CompactToolbar'
import ColumnFilterDropdown from '@/components/ColumnFilterDropdown'
import {
  MessagesSquare,
  Briefcase,
  Clock,
  ChevronRight,
  Search,
} from 'lucide-react'
import { getStatusLabel } from '@/lib/design-system'

const Pipeline = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [candidates, setCandidates] = useState([])
  const [jobs, setJobs] = useState([])
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const statusParam = searchParams.get('status')
  const candidateParam = searchParams.get('candidate')
  const jobParam = searchParams.get('job')

  const [statusFilter, setStatusFilter] = useState(statusParam || 'all')
  const [candidateFilter, setCandidateFilter] = useState(
    candidateParam || 'all'
  )
  const [jobFilter, setJobFilter] = useState(jobParam || 'all')
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

    // Apply candidate filter
    if (candidateFilter && candidateFilter !== 'all') {
      list = list.filter((i) => i.candidate_id === candidateFilter)
    }

    // Apply job filter
    if (jobFilter && jobFilter !== 'all') {
      list = list.filter((i) => i.job_id === jobFilter)
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
  }, [interviews, search, statusFilter, candidateFilter, jobFilter])

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
    setCandidateFilter('all')
    setJobFilter('all')
    setSearch('')
    setSearchParams({})
  }

  const hasActiveFilters =
    (statusFilter && statusFilter !== 'all') ||
    (candidateFilter && candidateFilter !== 'all') ||
    (jobFilter && jobFilter !== 'all') ||
    Boolean(search)

  // Sync URL params with filters
  useEffect(() => {
    const next = new URLSearchParams()
    if (statusFilter && statusFilter !== 'all') next.set('status', statusFilter)
    if (candidateFilter && candidateFilter !== 'all')
      next.set('candidate', candidateFilter)
    if (jobFilter && jobFilter !== 'all') next.set('job', jobFilter)
    setSearchParams(next)
  }, [statusFilter, candidateFilter, jobFilter, setSearchParams])

  // Get candidate and job names for display
  const getCandidateName = (candidateId) => {
    const candidate = candidates.find((c) => c.id === candidateId)
    return candidate?.name || 'Unknown'
  }

  const getJobTitle = (jobId) => {
    const job = jobs.find((j) => j.id === jobId)
    return job?.title || 'Unknown'
  }

  const onDeleteInterview = async (id) => {
    if (!window.confirm('Delete this interview?')) return
    try {
      await api.delete(`/interviews/${id}`)
      fetchData()
    } catch (e) {
      console.error('Delete failed', e)
      alert('Failed to delete interview. Please try again.')
    }
  }

  // Production table columns - optimized order and layout
  const columns = [
    createColumn('candidate', 'Candidate', {
      frozen: true,
      width: 220,
      minWidth: 180,
      headerRender: () => (
        <ColumnFilterDropdown
          label="Candidate"
          value={candidateFilter}
          options={[
            { value: 'all', label: 'All Candidates' },
            ...candidates.map((c) => ({ value: c.id, label: c.name })),
          ]}
          onChange={setCandidateFilter}
          searchable={true}
          placeholder="Search candidates..."
        />
      ),
      render: (_, interview) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-800 flex-shrink-0">
            {getInitials(interview.candidate_name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900 text-truncate">
              {interview.candidate_name || 'Unknown'}
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {columnRenderers.date(interview.created_at)}
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
      className: 'text-center',
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
      className: 'text-center',
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
      className: 'text-right',
      render: (_, interview) => (
        <span
          className="text-xs text-gray-500"
          title={new Date(interview.created_at).toLocaleString()}
        >
          {columnRenderers.date(interview.created_at)}
        </span>
      ),
    }),
    createColumn('actions', '', {
      width: 44,
      className: 'text-right pr-4',
      render: () => (
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
      ),
    }),
  ]

  const handleRowClick = (interview) => {
    setCandidateFilter(interview.candidate_id || 'all')
    setJobFilter(interview.job_id || 'all')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:ml-[212px] flex min-h-screen max-h-screen flex-col overflow-hidden bg-white">
        <div className="sticky top-0 z-40 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between px-6 lg:px-8 py-4">
            <div className="space-y-1">
              <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                Interviews
              </div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-[22px] font-semibold text-gray-900">
                  Pipeline
                </h1>
                <span className="text-sm text-gray-500">
                  {filteredInterviews.length} result
                  {filteredInterviews.length !== 1 ? 's' : ''}
                  {hasActiveFilters && ' • filtered'}
                </span>
              </div>
            </div>
            <div className="flex-1 px-8">
              <div className="relative mx-auto w-full max-w-2xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ask anything about candidates, jobs, or interviews..."
                  className="w-full h-11 rounded-full border border-gray-200 bg-white pl-12 pr-14 text-sm text-gray-800 placeholder:text-gray-400 shadow-sm transition-all focus:border-gray-900 focus:shadow-md focus:outline-none"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-gray-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow hover:bg-gray-800 transition-colors">
                  Generate
                </button>
              </div>
            </div>
            <div className="hidden text-xs text-gray-500 md:block">
              Compact view
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <DataTable
            columns={columns}
            data={filteredInterviews}
            onRowClick={handleRowClick}
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
        </div>
      </main>
    </div>
  )
}

export default Pipeline
