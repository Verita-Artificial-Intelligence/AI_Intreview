import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/utils/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Users,
  Mail,
  Award,
  PlayCircle,
  Trash2,
  MessagesSquare,
  MoreVertical,
  Eye,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import DataTable, {
  createColumn,
  columnRenderers,
} from '@/components/DataTable'
import InterviewCreationModal from '@/components/InterviewCreationModal'
import DashboardLayout from '@/components/DashboardLayout'
import { cardStyles, containers } from '@/lib/design-system'

const Candidates = () => {
  const navigate = useNavigate()
  const [candidates, setCandidates] = useState([])
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [candidateSearch, setCandidateSearch] = useState('')
  const [interviewModalOpen, setInterviewModalOpen] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState(null)

  const getInitials = (name) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase()
  }

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [candidatesRes, interviewsRes] = await Promise.all([
        api.get('/candidates'),
        api.get('/interviews'),
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
      candidate.skills.some((skill) =>
        skill.toLowerCase().includes(searchLower)
      )
    )
  })

  const handleCreateInterview = (candidate) => {
    setSelectedCandidate(candidate)
    setInterviewModalOpen(true)
  }

  const handleInterviewCreated = (interview) => {
    fetchData()
    navigate(`/audio-interview/${interview.id}`, {
      state: { from: 'candidates' },
    })
  }

  const handleViewInterviews = (candidateId) => {
    navigate(`/interviews?candidate=${candidateId}`)
  }

  // Table columns configuration
  const columns = [
    createColumn('name', 'Candidate', {
      render: (_, candidate) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-semibold text-neutral-900 bg-brand-200 flex-shrink-0">
            {getInitials(candidate.name)}
          </div>
          <div>
            <div className="font-semibold text-neutral-900">
              {candidate.name}
            </div>
            <div className="text-xs text-neutral-600 flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {candidate.email}
            </div>
          </div>
        </div>
      ),
    }),
    createColumn('position', 'Position', {
      render: (_, candidate) => (
        <span className="text-sm text-neutral-600">{candidate.position}</span>
      ),
    }),
    createColumn('experience', 'Experience', {
      render: (_, candidate) => (
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-neutral-500" />
          <span className="text-sm text-neutral-700">
            {candidate.experience_years} years
          </span>
        </div>
      ),
    }),
    createColumn('skills', 'Skills', {
      render: (_, candidate) => {
        if (!candidate.skills || candidate.skills.length === 0) {
          return <span className="text-sm text-gray-400">-</span>
        }

        return (
          <div className="flex flex-wrap gap-1">
            {candidate.skills.slice(0, 3).map((skill, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-neutral-100 text-neutral-700 text-xs font-medium rounded-full"
              >
                {skill}
              </span>
            ))}
            {candidate.skills.length > 3 && (
              <span className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-xs font-medium rounded-full">
                +{candidate.skills.length - 3}
              </span>
            )}
          </div>
        )
      },
    }),
    createColumn('bio', 'Bio', {
      render: (_, candidate) => {
        if (!candidate.bio)
          return <span className="text-sm text-gray-400">-</span>

        return (
          <div className="max-w-xs">
            <p className="text-sm text-neutral-700 line-clamp-2">
              {candidate.bio}
            </p>
          </div>
        )
      },
    }),
    createColumn('interviews', 'Interviews', {
      render: (_, candidate) => {
        const interviewCount = getCandidateInterviewCount(candidate.id)

        if (interviewCount === 0) {
          return <span className="text-sm text-gray-400">None</span>
        }

        return (
          <span className="text-sm text-neutral-600">
            {interviewCount} {interviewCount === 1 ? 'interview' : 'interviews'}
          </span>
        )
      },
    }),
    createColumn('actions', 'Actions', {
      className: 'text-right',
      render: (_, candidate) => {
        const interviewCount = getCandidateInterviewCount(candidate.id)

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleCreateInterview(candidate)}
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Create Interview
              </DropdownMenuItem>
              {interviewCount > 0 && (
                <DropdownMenuItem
                  onClick={() => handleViewInterviews(candidate.id)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View All Interviews
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    }),
  ]

  return (
    <DashboardLayout
      search={candidateSearch}
      onSearchChange={(e) => setCandidateSearch(e.target.value)}
      searchPlaceholder="Search by name, position, or skills..."
    >
      <div className="max-w-7xl mx-auto px-6 py-8">
        <DataTable
          columns={columns}
          data={filteredCandidates}
          loading={loading}
          emptyState={
            candidates.length === 0 ? (
              <div className="p-10 text-center bg-surface border border-neutral-200 rounded-xl shadow-card">
                <Users
                  className="w-10 h-10 mx-auto mb-3 text-gray-300"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-neutral-600 mb-3">
                  No candidates yet. Candidates will appear here when they apply
                  to your job postings
                </p>
                <Button
                  onClick={() => navigate('/jobs')}
                  variant="outline"
                  size="sm"
                  className="rounded-lg font-normal text-xs h-8 px-3"
                >
                  View Jobs
                </Button>
              </div>
            ) : (
              <div className="p-10 text-center bg-surface border border-neutral-200 rounded-xl shadow-card">
                <MessagesSquare
                  className="w-10 h-10 mx-auto mb-3 text-gray-300"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-neutral-600 mb-3">
                  No candidates match your search. Try different keywords
                </p>
                <Button
                  onClick={() => setCandidateSearch('')}
                  variant="outline"
                  size="sm"
                  className="rounded-lg font-normal text-xs h-8 px-3"
                >
                  Clear Search
                </Button>
              </div>
            )
          }
          size="md"
        />
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
    </DashboardLayout>
  )
}

export default Candidates
