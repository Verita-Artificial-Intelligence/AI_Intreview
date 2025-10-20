import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Users, Briefcase, Clock, CheckCircle, Trash2, ChevronRight, BarChart, Search } from 'lucide-react'
import InterviewCreationModal from '@/components/InterviewCreationModal'
import PageHeader from '@/components/PageHeader'
import {
  getStatusClass,
  getStatusLabel,
  pageContainer,
  searchBar,
} from '@/lib/design-system'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API = `${BACKEND_URL}/api`

const Dashboard = () => {
  const navigate = useNavigate()
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCandidateId, setSelectedCandidateId] = useState(null)
  const [interviewModalOpen, setInterviewModalOpen] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [interviewSearch, setInterviewSearch] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const interviewsRes = await axios.get(`${API}/interviews`)
      setInterviews(interviewsRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const displayedInterviews = (() => {
    let filtered = selectedCandidateId
      ? interviews.filter((i) => i.candidate_id === selectedCandidateId)
      : interviews

    if (interviewSearch.trim()) {
      const searchLower = interviewSearch.toLowerCase()
      filtered = filtered.filter(
        (interview) =>
          interview.candidate_name?.toLowerCase().includes(searchLower) ||
          interview.job_title?.toLowerCase().includes(searchLower) ||
          interview.position?.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  })()

  const handleInterviewCreated = (interview) => {
    fetchData()
    navigate(`/audio-interview/${interview.id}`, { state: { from: 'dashboard' } })
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

  const stats = [
    {
      icon: <Briefcase className="w-5 h-5" />,
      label: 'Total Interviews',
      value: interviews.length,
      bgClass: 'bg-brand-100 text-brand-600',
    },
    {
      icon: <Clock className="w-5 h-5" />,
      label: 'In Progress',
      value: interviews.filter((i) => i.status === 'in_progress').length,
      bgClass: 'bg-yellow-100 text-yellow-600',
    },
    {
      icon: <CheckCircle className="w-5 h-5" />,
      label: 'Completed',
      value: interviews.filter((i) => i.status === 'completed').length,
      bgClass: 'bg-green-100 text-green-600',
    },
  ]

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
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm bg-brand-600 text-white font-medium mb-2 shadow-sm transition-all duration-200"
          >
            <BarChart className="w-4 h-4" />
            <span>Dashboard</span>
            <ChevronRight className="w-4 h-4 ml-auto" />
          </a>
          <a
            href="/candidates"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-neutral-700 hover:bg-neutral-100 transition-all duration-200 mb-2"
          >
            <Users className="w-4 h-4" />
            <span>Candidates</span>
          </a>
          <a
            href="/interviews"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-neutral-700 hover:bg-neutral-100 transition-all duration-200 mb-2"
          >
            <Briefcase className="w-4 h-4" />
            <span>Interviews</span>
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
          title="Dashboard"
          subtitle="Discover and hire top creative talent with AI-powered interviews"
        />

        <div className={pageContainer.container}>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in-up">
            {stats.map((stat, index) => (
              <Card 
                key={index} 
                className="p-6 cursor-pointer group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${stat.bgClass} transition-transform duration-200 group-hover:scale-110`}>
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 font-medium mb-1">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-bold text-neutral-900">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Interviews Section */}
          <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-display font-bold text-neutral-900">
                {selectedCandidateId ? 'Candidate Interviews' : 'Recent Interviews'}
              </h2>
              {selectedCandidateId && (
                <Button
                  onClick={() => setSelectedCandidateId(null)}
                  variant="outline"
                  className="rounded-xl"
                >
                  Show All Interviews
                </Button>
              )}
            </div>

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

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
              </div>
            ) : displayedInterviews.length === 0 ? (
              <Card className="p-12 text-center border-2">
                <Briefcase className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                <p className="text-base text-neutral-600">
                  {selectedCandidateId
                    ? 'No interviews for this candidate yet.'
                    : 'No interviews yet. Create a job posting to start interviewing!'}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedInterviews.slice(0, selectedCandidateId ? 100 : 6).map((interview, index) => (
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

        <InterviewCreationModal
          open={interviewModalOpen}
          onClose={() => {
            setInterviewModalOpen(false)
            setSelectedCandidate(null)
          }}
          candidate={selectedCandidate}
          onSuccess={handleInterviewCreated}
        />
      </div>
    </div>
  )
}

export default Dashboard
