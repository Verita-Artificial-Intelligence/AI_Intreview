import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Users, Search, Mail, Award, PlayCircle, Trash2, ChevronRight, Briefcase, BarChart } from 'lucide-react'
import InterviewCreationModal from '@/components/InterviewCreationModal'
import PageHeader from '@/components/PageHeader'
import { cardStyles, pageContainer, searchBar } from '@/lib/design-system'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API = `${BACKEND_URL}/api`

const Candidates = () => {
  const navigate = useNavigate()
  const [candidates, setCandidates] = useState([])
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [candidateSearch, setCandidateSearch] = useState('')
  const [interviewModalOpen, setInterviewModalOpen] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [candidatesRes, interviewsRes] = await Promise.all([
        axios.get(`${API}/candidates`),
        axios.get(`${API}/interviews`),
      ])
      setCandidates(candidatesRes.data)
      setInterviews(interviewsRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCandidateInterviewCount = (candidateId) => {
    return interviews.filter((i) => i.candidate_id === candidateId).length
  }

  const filteredCandidates = candidates.filter((candidate) => {
    if (!candidateSearch) return true
    const searchLower = candidateSearch.toLowerCase()
    return (
      candidate.name.toLowerCase().includes(searchLower) ||
      candidate.position.toLowerCase().includes(searchLower) ||
      candidate.skills.some((skill) => skill.toLowerCase().includes(searchLower))
    )
  })

  const handleCreateInterview = (candidate) => {
    setSelectedCandidate(candidate)
    setInterviewModalOpen(true)
  }

  const handleInterviewCreated = (interview) => {
    fetchData()
    navigate(`/audio-interview/${interview.id}`, { state: { from: 'candidates' } })
  }

  const handleViewInterviews = (candidateId) => {
    navigate(`/interviews?candidate=${candidateId}`)
  }

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
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm bg-brand-600 text-white font-medium mb-2 shadow-sm transition-all duration-200"
          >
            <Users className="w-4 h-4" />
            <span>Candidates</span>
            <ChevronRight className="w-4 h-4 ml-auto" />
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
          title="Candidate Marketplace"
          subtitle="Browse and manage your candidate pool"
        />

        <div className={pageContainer.container}>
          {/* Search */}
          {candidates.length > 0 && (
            <div className={searchBar.wrapper}>
              <div className={searchBar.container}>
                <Search className={searchBar.icon} />
                <Input
                  type="text"
                  placeholder="Search by name, position, or skills..."
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  className={searchBar.input}
                />
              </div>
            </div>
          )}

          {/* Candidates Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            </div>
          ) : candidates.length === 0 ? (
            <Card className="p-12 text-center border-2">
              <Users className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
              <p className="text-base text-neutral-600">
                No candidates yet. Candidates will appear here when they apply to your job postings.
              </p>
            </Card>
          ) : filteredCandidates.length === 0 ? (
            <Card className="p-12 text-center border-2">
              <Search className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
              <h3 className="text-lg font-display font-semibold mb-2 text-neutral-900">
                No Results Found
              </h3>
              <p className="text-sm text-neutral-600 mb-3">
                No candidates match your search. Try different keywords!
              </p>
              <Button
                onClick={() => setCandidateSearch('')}
                variant="outline"
                className="rounded-xl"
              >
                Clear Search
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCandidates.map((candidate, index) => {
                const interviewCount = getCandidateInterviewCount(candidate.id)

                return (
                  <Card 
                    key={candidate.id} 
                    className="p-6 relative group flex flex-col animate-fade-in-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start gap-4 mb-4 flex-1">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold text-white bg-gradient-to-br from-brand-500 to-brand-600 shadow-sm flex-shrink-0">
                        {candidate.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base text-neutral-900 truncate mb-1">
                          {candidate.name}
                        </h3>
                        <p className="text-sm text-neutral-600 truncate">
                          {candidate.position}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{candidate.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4 flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <Award className="w-4 h-4 text-neutral-500" />
                        <span className="text-xs font-medium text-neutral-700">
                          {candidate.experience_years} years experience
                        </span>
                      </div>
                      {candidate.skills && candidate.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills.slice(0, 3).map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs font-medium rounded-full"
                            >
                              {skill}
                            </span>
                          ))}
                          {candidate.skills.length > 3 && (
                            <span className="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs font-medium rounded-full">
                              +{candidate.skills.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {candidate.bio && (
                      <div className="mt-2 p-3 bg-neutral-50 rounded-lg mb-4">
                        <p className="text-xs text-neutral-700 line-clamp-3">
                          {candidate.bio}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-xs text-neutral-600">
                        {interviewCount} {interviewCount === 1 ? 'interview' : 'interviews'}
                      </span>
                      <div className="flex gap-2">
                        {interviewCount > 0 && (
                          <Button
                            onClick={() => handleViewInterviews(candidate.id)}
                            variant="outline"
                            className="h-8 text-xs rounded-xl font-medium border border-brand-500 text-brand-600 hover:bg-brand-50"
                          >
                            View All
                          </Button>
                        )}
                        <Button
                          onClick={() => handleCreateInterview(candidate)}
                          className="h-8 text-xs rounded-xl font-medium bg-brand-600 hover:bg-brand-700"
                        >
                          <PlayCircle className="w-3 h-3 mr-1" />
                          Interview
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
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
  )
}

export default Candidates