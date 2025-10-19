import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Search, Briefcase, Mail, Award } from 'lucide-react'
import { cardStyles, pageHeader, containers } from '@/lib/design-system'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API = `${BACKEND_URL}/api`

const Marketplace = () => {
  const navigate = useNavigate()
  const [candidates, setCandidates] = useState([])
  const [filteredCandidates, setFilteredCandidates] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [showDialog, setShowDialog] = useState(false)
  const [interviewType, setInterviewType] = useState('text') // 'text' or 'audio'
  const [startingInterview, setStartingInterview] = useState(false)

  useEffect(() => {
    fetchCandidates()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      const filtered = candidates.filter(
        (c) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.skills.some((s) =>
            s.toLowerCase().includes(searchTerm.toLowerCase())
          )
      )
      setFilteredCandidates(filtered)
    } else {
      setFilteredCandidates(candidates)
    }
  }, [searchTerm, candidates])

  const fetchCandidates = async () => {
    try {
      const response = await axios.get(`${API}/candidates`)
      setCandidates(response.data)
      setFilteredCandidates(response.data)
    } catch (error) {
      console.error('Error fetching candidates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartInterview = async () => {
    if (!selectedCandidate) return
    setStartingInterview(true)

    try {
      const response = await axios.post(`${API}/interviews`, {
        candidate_id: selectedCandidate.id,
      })

      // Navigate to prep page with interview type in state
      navigate(`/interview-prep/${response.data.id}`, {
        state: { interviewType },
      })
    } catch (error) {
      console.error('Error starting interview:', error)
      alert('Failed to start interview')
    } finally {
      setStartingInterview(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className={pageHeader.wrapper}>
        <div className={`${containers.lg} ${pageHeader.container}`}>
          <div>
            <h1 className={pageHeader.title}>Candidate Marketplace</h1>
            <p className={pageHeader.subtitle}>Find and interview top talent</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="rounded-lg border-neutral-300 hover:bg-neutral-50"
            >
              Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className={`${containers.lg} mx-auto px-5 py-5`}>
        {/* Search */}
        <div className="mb-5">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
            <Input
              type="text"
              data-testid="candidate-search-input"
              placeholder="Search by name, position, or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-8 text-sm rounded-lg border-neutral-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            />
          </div>
        </div>

        {/* Candidates Grid */}
        {loading ? (
          <p className="text-sm text-neutral-600">Loading candidates...</p>
        ) : filteredCandidates.length === 0 ? (
          <Card className={`p-8 text-center ${cardStyles.default}`}>
            <Search className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
            <p className="text-sm text-neutral-600">No candidates found</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCandidates.map((candidate) => (
              <Card key={candidate.id} className={`p-4 ${cardStyles.default}`}>
                <div className="mb-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center mb-2 text-base font-bold text-white bg-gradient-to-br from-brand-400 to-brand-600">
                    {candidate.name.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="font-bold text-base mb-0.5 text-neutral-900">
                    {candidate.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-600 mb-1">
                    <Briefcase className="w-3 h-3" />
                    <span>{candidate.position}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-600 mb-2">
                    <Award className="w-3 h-3" />
                    <span>{candidate.experience_years} years experience</span>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-neutral-700 line-clamp-2 mb-2">
                    {candidate.bio}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.slice(0, 4).map((skill, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand-50 text-brand-600 border border-brand-200"
                      >
                        {skill}
                      </span>
                    ))}
                    {candidate.skills.length > 4 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
                        +{candidate.skills.length - 4}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setSelectedCandidate(candidate)
                      setInterviewType('text')
                      setShowDialog(true)
                    }}
                    data-testid={`start-text-interview-${candidate.id}`}
                    className="flex-1 h-7 rounded-lg font-medium text-xs bg-brand-500 hover:bg-brand-600 text-white"
                  >
                    Text
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedCandidate(candidate)
                      setInterviewType('audio')
                      setShowDialog(true)
                    }}
                    data-testid={`start-audio-interview-${candidate.id}`}
                    className="flex-1 h-7 rounded-lg font-medium text-xs border-2 border-brand-500 text-brand-600 hover:bg-brand-50 bg-white"
                  >
                    Voice
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Interview Confirmation Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-neutral-900">
              Start {interviewType === 'audio' ? 'Voice' : 'Text'} Interview
            </DialogTitle>
            <DialogDescription className="text-neutral-600">
              {interviewType === 'audio'
                ? "You're about to start a voice-based AI interview. Make sure your microphone is working."
                : "You're about to start a text-based AI interview with this candidate."}
            </DialogDescription>
          </DialogHeader>
          {selectedCandidate && (
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm font-medium text-neutral-700">
                  Candidate
                </p>
                <p className="text-lg font-semibold text-neutral-900">
                  {selectedCandidate.name}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-700">Position</p>
                <p className="text-base text-neutral-900">
                  {selectedCandidate.position}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-700 mb-2">
                  Skills
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedCandidate.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-brand-50 text-brand-600 border border-brand-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-700 mb-2">
                  Interview Type
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setInterviewType('text')}
                    variant={interviewType === 'text' ? 'default' : 'outline'}
                    className={`flex-1 rounded-lg ${interviewType === 'text' ? 'bg-brand-500 hover:bg-brand-600 text-white' : 'border-neutral-300'}`}
                  >
                    Text Chat
                  </Button>
                  <Button
                    onClick={() => setInterviewType('audio')}
                    variant={interviewType === 'audio' ? 'default' : 'outline'}
                    className={`flex-1 rounded-lg ${interviewType === 'audio' ? 'border-2 border-brand-500 text-brand-600 hover:bg-brand-50 bg-white' : 'border-neutral-300'}`}
                  >
                    Voice Call
                  </Button>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowDialog(false)}
                  variant="outline"
                  className="flex-1 rounded-lg border-neutral-300 hover:bg-neutral-50"
                  disabled={startingInterview}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStartInterview}
                  data-testid="confirm-start-interview-button"
                  disabled={startingInterview}
                  className="flex-1 rounded-lg font-medium bg-brand-500 hover:bg-brand-600 text-white"
                >
                  {startingInterview ? 'Starting...' : 'Start Interview'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Marketplace
