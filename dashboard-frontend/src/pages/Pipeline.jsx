import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '@/utils/api'
import Sidebar from '@/components/Sidebar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Users,
  MessagesSquare,
  Search,
  Filter,
  X,
  Briefcase,
  Trash2,
  Calendar,
} from 'lucide-react'
import { getStatusClass, getStatusLabel } from '@/lib/design-system'

const Pipeline = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [candidates, setCandidates] = useState([])
  const [jobs, setJobs] = useState([])
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get('status') || ''
  )
  const [candidateFilter, setCandidateFilter] = useState(
    searchParams.get('candidate') || ''
  )
  const [jobFilter, setJobFilter] = useState(searchParams.get('job') || '')

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
    if (statusFilter) {
      list = list.filter((i) => (i.status || '').toLowerCase() === statusFilter)
    }

    // Apply candidate filter
    if (candidateFilter) {
      list = list.filter((i) => i.candidate_id === candidateFilter)
    }

    // Apply job filter
    if (jobFilter) {
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
    setStatusFilter('')
    setCandidateFilter('')
    setJobFilter('')
    setSearch('')
    setSearchParams({})
  }

  const hasActiveFilters =
    statusFilter || candidateFilter || jobFilter || search

  // Sync URL params with filters
  useEffect(() => {
    const next = new URLSearchParams()
    if (statusFilter) next.set('status', statusFilter)
    if (candidateFilter) next.set('candidate', candidateFilter)
    if (jobFilter) next.set('job', jobFilter)
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

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <main className="lg:ml-64 overflow-y-auto pb-16 lg:pb-0">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900 mb-1">
                Pipeline
              </h1>
              <p className="text-sm text-gray-500">
                {filteredInterviews.length} interview
                {filteredInterviews.length !== 1 ? 's' : ''}
                {hasActiveFilters && ' (filtered)'}
              </p>
            </div>
            {hasActiveFilters && (
              <Button
                onClick={clearFilters}
                variant="outline"
                className="h-9 text-sm rounded-lg border-gray-300 hover:bg-gray-50"
              >
                <X className="w-4 h-4 mr-2" /> Clear Filters
              </Button>
            )}
          </div>

          {/* Filters Bar - Linear Style */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search interviews..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-sm"
              />
            </div>

            {/* Status Filter */}
            <select
              className="h-9 rounded-lg border border-gray-300 text-sm px-3 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Status: All</option>
              <option value="completed">Status: Completed</option>
              <option value="in_progress">Status: In Progress</option>
              <option value="scheduled">Status: Scheduled</option>
              <option value="pending">Status: Pending</option>
            </select>

            {/* Candidate Filter */}
            <select
              className="h-9 rounded-lg border border-gray-300 text-sm px-3 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
              value={candidateFilter}
              onChange={(e) => setCandidateFilter(e.target.value)}
            >
              <option value="">Candidate: All</option>
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </select>

            {/* Job Filter */}
            <select
              className="h-9 rounded-lg border border-gray-300 text-sm px-3 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
            >
              <option value="">Job: All</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>

          {/* Active Filters Pills */}
          {hasActiveFilters && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {statusFilter && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                  Status: {getStatusLabel(statusFilter)}
                  <button
                    onClick={() => setStatusFilter('')}
                    className="hover:bg-blue-100 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {candidateFilter && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
                  Candidate: {getCandidateName(candidateFilter)}
                  <button
                    onClick={() => setCandidateFilter('')}
                    className="hover:bg-purple-100 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {jobFilter && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                  Job: {getJobTitle(jobFilter)}
                  <button
                    onClick={() => setJobFilter('')}
                    className="hover:bg-green-100 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Interviews List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-gray-600">Loading interviews...</p>
            </div>
          ) : filteredInterviews.length === 0 ? (
            <Card className="p-12 text-center bg-white border border-gray-200 rounded-lg shadow-sm">
              <MessagesSquare
                className="w-12 h-12 mx-auto mb-4 text-gray-300"
                strokeWidth={1.5}
              />
              <p className="text-sm text-gray-600 mb-2">
                {hasActiveFilters
                  ? 'No interviews match your filters'
                  : 'No interviews yet'}
              </p>
              {hasActiveFilters && (
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-lg font-normal text-xs h-8 px-3"
                >
                  Clear Filters
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredInterviews.map((interview) => (
                <Card
                  key={interview.id}
                  className="p-4 bg-white border border-gray-200 rounded-lg hover:border-brand-300 hover:shadow-sm transition-all cursor-pointer group relative"
                  onClick={() => {
                    if (interview.status === 'completed') {
                      navigate(`/admin/review/${interview.id}`)
                    } else {
                      navigate(`/interview/${interview.id}`)
                    }
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteInterview(interview.id)
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Delete interview"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-md flex items-center justify-center text-sm font-bold text-neutral-900 bg-brand-200 flex-shrink-0">
                      {getInitials(interview.candidate_name)}
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base text-neutral-900 truncate mb-1">
                            {interview.candidate_name || 'Unknown Candidate'}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-neutral-600">
                            {interview.job_title && (
                              <span className="flex items-center gap-1">
                                <Briefcase className="w-3.5 h-3.5" />
                                {interview.job_title}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(
                                interview.created_at
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusClass(
                            interview.status
                          )}`}
                        >
                          {getStatusLabel(interview.status)}
                        </span>
                      </div>

                      {/* Summary (if completed) */}
                      {interview.status === 'completed' &&
                        interview.summary && (
                          <p className="text-sm text-neutral-700 line-clamp-2 mt-2">
                            {interview.summary}
                          </p>
                        )}

                      {/* Acceptance Status (if exists) */}
                      {interview.acceptance_status && (
                        <div className="mt-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              interview.acceptance_status === 'accepted'
                                ? 'bg-green-50 text-green-700'
                                : interview.acceptance_status === 'rejected'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {interview.acceptance_status === 'accepted'
                              ? 'Accepted'
                              : interview.acceptance_status === 'rejected'
                                ? 'Rejected'
                                : 'Pending Review'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default Pipeline
