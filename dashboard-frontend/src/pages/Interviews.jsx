import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Briefcase, Trash2, ChevronRight, Users, BarChart, X, Search } from 'lucide-react'
import { cardStyles, containers, getStatusClass, getStatusLabel } from '@/lib/design-system'

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

  const filteredCandidate = candidateFilter ? getCandidate(candidateFilter) : null
  const filteredJob = jobFilter ? getJob(jobFilter) : null

  const getPageTitle = () => {
    if (filteredCandidate) return `Interviews - ${filteredCandidate.name}`
    if (filteredJob) return `Interviews - ${filteredJob.title}`
    return 'All Interviews'
  }

  const getPageDescription = () => {
    if (filteredCandidate) return `Showing all interviews for ${filteredCandidate.name}`
    if (filteredJob) return `Showing all interviews for ${filteredJob.title} position`
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
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-neutral-200 flex-shrink-0">
        <div className="p-6">
          <h2 className="text-xl font-display font-bold text-neutral-900 mb-1">Verita</h2>
          <p className="text-xs text-neutral-600">AI Interview Platform</p>
        </div>

        <nav className="px-3">
          <a
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors mb-1"
          >
            <BarChart className="w-4 h-4" />
            <span>Dashboard</span>
          </a>
          <a
            href="/candidates"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors mb-1"
          >
            <Users className="w-4 h-4" />
            <span>Candidates</span>
          </a>
          <a
            href="/interviews"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-brand-50 text-brand-600 font-medium mb-1"
          >
            <Briefcase className="w-4 h-4" />
            <span>Interviews</span>
            <ChevronRight className="w-4 h-4 ml-auto" />
          </a>
          <a
            href="/jobs"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors mb-1"
          >
            <Briefcase className="w-4 h-4" />
            <span>Jobs</span>
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className={`${containers.lg} mx-auto px-6 py-6`}>
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-display font-bold text-neutral-900">
                {getPageTitle()}
              </h1>
              {(candidateFilter || jobFilter) && (
                <Button
                  onClick={clearFilter}
                  variant="outline"
                  className="h-8 text-xs rounded-lg"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear Filter
                </Button>
              )}
            </div>
            <p className="text-sm text-neutral-600">
              {getPageDescription()}
            </p>
          </div>

          {/* Search Bar */}
          {interviews.length > 0 && (
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by candidate, job title, or position..."
                  value={interviewSearch}
                  onChange={(e) => setInterviewSearch(e.target.value)}
                  className="pl-10 h-10 rounded-lg border-neutral-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                />
              </div>
            </div>
          )}

          {/* Interviews Grid */}
          {loading ? (
            <p className="text-sm text-neutral-600">Loading interviews...</p>
          ) : interviews.length === 0 ? (
            <Card className={`p-8 text-center ${cardStyles.default}`}>
              <Briefcase className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
              <h3 className="text-lg font-display font-semibold mb-2 text-neutral-900">
                No Interviews Yet
              </h3>
              <p className="text-sm text-neutral-600">
                {filteredCandidate
                  ? `No interviews have been conducted with ${filteredCandidate.name} yet.`
                  : filteredJob
                  ? `No interviews have been conducted for the ${filteredJob.title} position yet.`
                  : 'Start creating interviews from the candidates page.'}
              </p>
            </Card>
          ) : displayedInterviews.length === 0 ? (
            <Card className={`p-8 text-center ${cardStyles.default}`}>
              <Search className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
              <h3 className="text-lg font-display font-semibold mb-2 text-neutral-900">
                No Results Found
              </h3>
              <p className="text-sm text-neutral-600 mb-3">
                No interviews match your search. Try different keywords!
              </p>
              <Button
                onClick={() => setInterviewSearch('')}
                variant="outline"
                className="rounded-lg"
              >
                Clear Search
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedInterviews.map((interview) => (
                <Card
                  key={interview.id}
                  className="p-6 hover:shadow-lg transition-shadow relative group flex flex-col"
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
                            {interview.job_title || interview.position || 'General Interview'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusClass(interview.status)}`}
                    >
                      {getStatusLabel(interview.status)}
                    </span>
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
                        className="w-full h-7 text-xs rounded-lg font-medium border-2 border-brand-500 text-brand-600 hover:bg-brand-50 bg-white"
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
      </div>
    </div>
  )
}

export default Interviews
