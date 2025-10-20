import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Users, Search, Mail, Award, PlayCircle, Trash2 } from 'lucide-react'
import InterviewCreationModal from '@/components/InterviewCreationModal'
import AdminSidebar from '@/components/AdminSidebar'
import { cardStyles, containers } from '@/lib/design-system'

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
    <div className="min-h-screen bg-background">
      <AdminSidebar />

      {/* Main Content */}
      <div className="ml-64 overflow-auto">
        <div className={`${containers.lg} mx-auto px-6 py-6`}>
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-display font-bold text-neutral-900 mb-2">
              Candidate Marketplace
            </h1>
            <p className="text-sm text-neutral-600">
              Browse and manage your candidate pool
            </p>
          </div>

          {/* Search */}
          {candidates.length > 0 && (
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by name, position, or skills..."
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  className="pl-10 h-10 rounded-lg border-neutral-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                />
              </div>
            </div>
          )}

          {/* Candidates Grid */}
          {loading ? (
            <p className="text-sm text-neutral-600">Loading candidates...</p>
          ) : candidates.length === 0 ? (
            <Card className={`p-8 text-center ${cardStyles.default}`}>
              <Users className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
              <h3 className="text-lg font-display font-semibold mb-2 text-neutral-900">
                No Candidates Yet
              </h3>
              <p className="text-sm text-neutral-600">
                Candidates will appear here when they apply to your job postings.
              </p>
            </Card>
          ) : filteredCandidates.length === 0 ? (
            <Card className={`p-8 text-center ${cardStyles.default}`}>
              <Search className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
              <h3 className="text-lg font-display font-semibold mb-2 text-neutral-900">
                No Results Found
              </h3>
              <p className="text-sm text-neutral-600 mb-3">
                No candidates match your search. Try different keywords!
              </p>
              <Button
                onClick={() => setCandidateSearch('')}
                variant="outline"
                className="rounded-lg"
              >
                Clear Search
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCandidates.map((candidate) => {
                const interviewCount = getCandidateInterviewCount(candidate.id)

                return (
                  <Card key={candidate.id} className={`p-5 ${cardStyles.default} flex flex-col`}>
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white bg-gradient-to-br from-brand-400 to-brand-600 flex-shrink-0">
                        {candidate.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <h3 className="font-display font-semibold text-base text-neutral-900 truncate">
                          {candidate.name}
                        </h3>
                        <p className="text-sm text-neutral-600 mb-1">
                          {candidate.position}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-neutral-500">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{candidate.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4 flex-1">
                      <div className="flex items-center gap-2 mb-2">
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
                              className="px-2 py-1 bg-neutral-100 text-neutral-700 text-[10px] font-medium rounded-full"
                            >
                              {skill}
                            </span>
                          ))}
                          {candidate.skills.length > 3 && (
                            <span className="px-2 py-1 bg-neutral-100 text-neutral-600 text-[10px] font-medium rounded-full">
                              +{candidate.skills.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {candidate.bio && (
                      <p className="text-sm text-neutral-700 mb-4 line-clamp-2">
                        {candidate.bio}
                      </p>
                    )}

                    {interviewCount > 0 && (
                      <div className="flex flex-col gap-2">
                        <span className="text-xs text-neutral-600">
                          {interviewCount} {interviewCount === 1 ? 'interview' : 'interviews'}
                        </span>
                        <Button
                          onClick={() => handleViewInterviews(candidate.id)}
                          variant="outline"
                          className="w-full h-8 text-xs rounded-lg font-medium border border-brand-500 text-brand-600 hover:bg-brand-50"
                        >
                          View All
                        </Button>
                      </div>
                    )}
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
