import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Briefcase, Trash2, X, Search, MessagesSquare } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import {
  cardStyles,
  containers,
  getStatusClass,
  getStatusLabel,
} from '@/lib/design-system'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API = `${BACKEND_URL}/api`

const Interviews = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [interviews, setInterviews] = useState([])
  const [candidates, setCandidates] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [interviewSearch, setInterviewSearch] = useState('')

  const candidateFilter = searchParams.get('candidate')
  const jobFilter = searchParams.get('job')

  useEffect(() => {
    fetchData()
  }, [candidateFilter, jobFilter])

  const fetchData = async () => {
    try {
      // Build query params
      const params = new URLSearchParams()
      if (candidateFilter) params.append('candidate_id', candidateFilter)
      if (jobFilter) params.append('job_id', jobFilter)
      const queryString = params.toString() ? `?${params.toString()}` : ''

      const [interviewsRes, candidatesRes, jobsRes] = await Promise.all([
        axios.get(`${API}/interviews${queryString}`),
        axios.get(`${API}/candidates`),
        axios.get(`${API}/jobs`),
      ])
      setInterviews(interviewsRes.data)
      setCandidates(candidatesRes.data)
      setJobs(jobsRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCandidate = (candidateId) => {
    return candidates.find((c) => c.id === candidateId)
  }

  const getJob = (jobId) => {
    return jobs.find((j) => j.id === jobId)
  }

  const handleDeleteInterview = async (interviewId) => {
    if (!window.confirm('Are you sure you want to delete this interview?')) {
      return
    }

    try {
      await axios.delete(`${API}/interviews/${interviewId}`)
      fetchData()
    } catch (error) {
      console.error('Error deleting interview:', error)
      alert('Failed to delete interview. Please try again.')
    }
  }

  const clearFilter = () => {
    setSearchParams({})
  }

  const filteredCandidate = candidateFilter
    ? getCandidate(candidateFilter)
    : null
  const filteredJob = jobFilter ? getJob(jobFilter) : null

  const getPageTitle = () => {
    if (filteredCandidate) return `Interviews - ${filteredCandidate.name}`
    if (filteredJob) return `Interviews - ${filteredJob.title}`
    return 'All Interviews'
  }

  const getPageDescription = () => {
    if (filteredCandidate)
      return `Showing all interviews for ${filteredCandidate.name}`
    if (filteredJob)
      return `Showing all interviews for ${filteredJob.title} position`
    return 'View and manage all candidate interviews'
  }

  const displayedInterviews = (() => {
    if (!interviewSearch.trim()) return interviews
    const searchLower = interviewSearch.toLowerCase()
    return interviews.filter(
      (interview) =>
        interview.candidate_name?.toLowerCase().includes(searchLower) ||
        interview.job_title?.toLowerCase().includes(searchLower) ||
        interview.position?.toLowerCase().includes(searchLower)
    )
  })()

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />

      {/* Main Content */}
      <main className="ml-64 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-neutral-900 mb-1">
                  {getPageTitle()}
                </h1>
                <p className="text-sm text-gray-500">{getPageDescription()}</p>
              </div>
              {(candidateFilter || jobFilter) && (
                <Button
                  onClick={clearFilter}
                  variant="outline"
                  className="h-9 text-sm rounded-lg border-gray-300 hover:bg-gray-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Filter
                </Button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          {interviews.length > 0 && (
            <div className="mb-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by candidate, job title, or position..."
                  value={interviewSearch}
                  onChange={(e) => setInterviewSearch(e.target.value)}
                  className="pl-9 h-10 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-sm"
                />
              </div>
            </div>
          )}

          {/* Interviews Grid */}
          {loading ? (
            <p className="text-sm text-gray-600">Loading interviews...</p>
          ) : interviews.length === 0 ? (
            <Card className="p-8 text-center bg-white border border-gray-200 rounded-lg shadow-sm">
              <MessagesSquare
                className="w-10 h-10 mx-auto mb-3 text-gray-300"
                strokeWidth={1.5}
              />
              <p className="text-sm text-gray-600 mb-4">
                {filteredCandidate
                  ? `No interviews have been conducted with ${filteredCandidate.name} yet`
                  : filteredJob
                    ? `No interviews have been conducted for the ${filteredJob.title} position yet`
                    : 'No interviews yet. Start creating interviews from the candidates page'}
              </p>
              {!filteredCandidate && !filteredJob && (
                <Button
                  onClick={() => navigate('/candidates')}
                  variant="outline"
                  size="sm"
                  className="rounded-lg font-normal text-xs h-8 px-3"
                >
                  View Candidates
                </Button>
              )}
            </Card>
          ) : displayedInterviews.length === 0 ? (
            <Card className="p-8 text-center bg-white border border-gray-200 rounded-lg shadow-sm">
              <MessagesSquare
                className="w-10 h-10 mx-auto mb-3 text-gray-300"
                strokeWidth={1.5}
              />
              <p className="text-sm text-gray-600 mb-4">
                No interviews match your search. Try different keywords
              </p>
              <Button
                onClick={() => setInterviewSearch('')}
                variant="outline"
                size="sm"
                className="rounded-lg font-normal text-xs h-8 px-3"
              >
                Clear Search
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedInterviews.map((interview) => (
                <Card
                  key={interview.id}
                  className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow relative group flex flex-col"
                >
                  <button
                    onClick={() => handleDeleteInterview(interview.id)}
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Delete interview"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-start gap-3 mb-4 flex-1">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br from-brand-400 to-brand-600 flex-shrink-0">
                      {interview.candidate_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base text-neutral-900 truncate mb-1">
                            {interview.candidate_name || 'Unknown'}
                          </h3>
                          <p className="text-sm text-neutral-600 truncate">
                            {interview.job_title ||
                              interview.position ||
                              'General Interview'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusClass(interview.status)}`}
                      >
                        {getStatusLabel(interview.status)}
                      </span>
                      {interview.acceptance_status && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            interview.acceptance_status === 'accepted'
                              ? 'bg-green-100 text-green-700'
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
                      )}
                    </div>
                    <p className="text-xs text-neutral-500">
                      {new Date(interview.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {interview.status === 'completed' && (
                    <>
                      {interview.summary && (
                        <div className="mt-2 p-2 bg-neutral-50 rounded-lg mb-2">
                          <p className="text-[10px] text-neutral-700 line-clamp-3">
                            {interview.summary}
                          </p>
                        </div>
                      )}
                      <Button
                        onClick={() =>
                          navigate(`/admin/review/${interview.id}`)
                        }
                        data-testid={`view-results-${interview.id}`}
                        size="sm"
                        className="w-full rounded-lg bg-brand-500 hover:bg-brand-600 text-white"
                      >
                        View Results
                      </Button>
                    </>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default Interviews
