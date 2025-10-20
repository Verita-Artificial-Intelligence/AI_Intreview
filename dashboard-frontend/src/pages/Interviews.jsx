import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Briefcase, Trash2, ChevronRight, Users, BarChart, X, Search } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { cardStyles, pageContainer, searchBar, getStatusClass, getStatusLabel } from '@/lib/design-system'

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

  const filteredCandidate = candidateFilter && candidateFilter !== 'null' ? getCandidate(candidateFilter) : null
  const filteredJob = jobFilter && jobFilter !== 'null' ? getJob(jobFilter) : null

  const getPageTitle = () => {
    return 'All Interviews'
  }

  const getPageDescription = () => {
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
    <div className="flex min-h-screen bg-neutral-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-neutral-200 flex-shrink-0">
        <div className="px-6 py-6 border-b border-neutral-100/60 shadow-sm">
          <h2 className="text-xl font-display font-bold text-neutral-900 mb-1">Verita</h2>
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">AI Interview Platform</p>
        </div>

        <nav className="p-4">
          <a
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-neutral-700 hover:bg-neutral-100 transition-all duration-200 mb-2"
          >
            <BarChart className="w-4 h-4" />
            <span>Dashboard</span>
          </a>
          <a
            href="/candidates"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-neutral-700 hover:bg-neutral-100 transition-all duration-200"
          >
            <Users className="w-4 h-4" />
            <span>Candidates</span>
          </a>
          <a
            href="/interviews"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm bg-brand-600 text-white font-medium mb-2 shadow-sm transition-all duration-200"
          >
            <Briefcase className="w-4 h-4" />
            <span>Interviews</span>
            <ChevronRight className="w-4 h-4 ml-auto" />
          </a>
          <a
            href="/jobs"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-neutral-700 hover:bg-neutral-100 transition-all duration-200"
          >
            <Briefcase className="w-4 h-4" />
            <span>Jobs</span>
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <div className={pageContainer.wrapper}>
        {/* Header */}
        <PageHeader
          variant="boxed"
          title={getPageTitle()}
          subtitle={getPageDescription()}
          action={(candidateFilter || jobFilter) && (
            <Button
              onClick={clearFilter}
              variant="outline"
              className="rounded-xl"
            >
              <X className="w-4 h-4 mr-1" />
              Clear Filter
            </Button>
          )}
        />

        <div className={pageContainer.container}>
          {/* Search Bar */}
          {interviews.length > 0 && (
            <div className={searchBar.wrapper}>
              <div className={searchBar.container}>
                <Search className={searchBar.icon} />
                <Input
                  type="text"
                  placeholder="Search by candidate, job title, or position..."
                  value={interviewSearch}
                  onChange={(e) => setInterviewSearch(e.target.value)}
                  className={searchBar.input}
                />
              </div>
            </div>
          )}

          {/* Interviews Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            </div>
          ) : interviews.length === 0 ? (
            <Card className="p-12 text-center border-2">
              <Briefcase className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
              <p className="text-base text-neutral-600">
                {filteredCandidate
                  ? `No interviews have been conducted with ${filteredCandidate.name} yet.`
                  : filteredJob
                  ? `No interviews have been conducted for the ${filteredJob.title} position yet.`
                  : 'Start creating interviews from the candidates page.'}
              </p>
            </Card>
          ) : displayedInterviews.length === 0 ? (
            <Card className="p-12 text-center border-2">
              <Search className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
              <h3 className="text-lg font-display font-semibold mb-2 text-neutral-900">
                No Results Found
              </h3>
              <p className="text-sm text-neutral-600 mb-3">
                No interviews match your search. Try different keywords!
              </p>
              <Button
                onClick={() => setInterviewSearch('')}
                variant="outline"
                className="rounded-xl"
              >
                Clear Search
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedInterviews.map((interview, index) => (
                <Card
                  key={interview.id}
                  className="p-6 relative group flex flex-col animate-fade-in-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <button
                    onClick={() => handleDeleteInterview(interview.id)}
                    className="absolute top-4 right-4 p-2 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                    title="Delete interview"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-start gap-4 mb-4 flex-1">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold text-white bg-gradient-to-br from-brand-500 to-brand-600 shadow-sm flex-shrink-0">
                      {interview.candidate_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base text-neutral-900 truncate mb-1">
                        {interview.candidate_name || 'Unknown'}
                      </h3>
                      <p className="text-sm text-neutral-600 truncate">
                        {interview.job_title || interview.position || 'General Interview'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(interview.status)}`}
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
                        <div className="mt-2 p-3 bg-neutral-50 rounded-lg mb-3">
                          <p className="text-xs text-neutral-700 line-clamp-3">
                            {interview.summary}
                          </p>
                        </div>
                      )}
                      <Button
                        onClick={() => navigate(`/admin/review/${interview.id}`)}
                        data-testid={`view-results-${interview.id}`}
                        variant="outline"
                        className="w-full rounded-xl font-medium border-2 border-brand-600 text-brand-600 hover:bg-brand-50"
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