import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Users, Briefcase, Clock, CheckCircle, Plus, Trash2, Search, Eye } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import InterviewCreationModal from '@/components/InterviewCreationModal'
import AdminSidebar from '@/components/AdminSidebar'
import {
  cardStyles,
  iconBackgrounds,
  pageHeader,
  containers,
  getStatusClass,
  getStatusLabel,
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [interviewToDelete, setInterviewToDelete] = useState(null)

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

  const handleDeleteInterview = (interviewId, candidateName) => {
    setInterviewToDelete({ id: interviewId, name: candidateName })
    setShowDeleteDialog(true)
  }

  const confirmDeleteInterview = async () => {
    if (!interviewToDelete) return

    try {
      await axios.delete(`${API}/interviews/${interviewToDelete.id}`)
      setShowDeleteDialog(false)
      setInterviewToDelete(null)
      fetchData()
    } catch (error) {
      console.error('Error deleting interview:', error)
      alert('Failed to delete interview. Please try again.')
    }
  }

  const stats = [
    {
      icon: <Briefcase className="w-4 h-4" />,
      label: 'Total Interviews',
      value: interviews.length,
      bgClass: iconBackgrounds.brand,
    },
    {
      icon: <Clock className="w-4 h-4" />,
      label: 'In Progress',
      value: interviews.filter((i) => i.status === 'in_progress').length,
      bgClass: iconBackgrounds.yellow,
    },
    {
      icon: <CheckCircle className="w-4 h-4" />,
      label: 'Completed',
      value: interviews.filter((i) => i.status === 'completed').length,
      bgClass: iconBackgrounds.blue,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />

      {/* Main Content */}
      <div className="ml-64 overflow-auto">
        {/* Header */}
        <div className={pageHeader.wrapper}>
          <div className={`${containers.lg} ${pageHeader.container}`}>
            <div>
              <h1 className={pageHeader.title}>Verita</h1>
              <p className={pageHeader.subtitle}>
                Discover and hire top creative talent with AI-powered interviews
              </p>
            </div>
            <Button
              onClick={() => navigate('/jobs')}
              data-testid="view-jobs-button"
              className="rounded-lg font-medium bg-brand-500 hover:bg-brand-600 text-white"
            >
              <Briefcase className="w-4 h-4 mr-2" />
              View Jobs
            </Button>
          </div>
        </div>

        <div className={`${containers.lg} mx-auto px-5 py-5`}>
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, index) => (
            <Card key={index} className={`p-4 ${cardStyles.default}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgClass}`}>
                  <div className="w-4 h-4">{stat.icon}</div>
                </div>
                <div>
                  <p className="text-xs text-neutral-600 font-medium">
                    {stat.label}
                  </p>
                  <p className="text-xl font-bold mt-0.5 text-neutral-900">
                    {stat.value}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Interviews Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-display font-bold text-neutral-900">
              {selectedCandidateId ? 'Candidate Interviews' : 'Recent Interviews'}
            </h2>
            {selectedCandidateId && (
              <Button
                onClick={() => setSelectedCandidateId(null)}
                variant="outline"
                className="h-8 text-xs rounded-lg"
              >
                Show All Interviews
              </Button>
            )}
          </div>

          {interviews.length > 0 && (
            <div className="mb-4">
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

          {loading ? (
            <p className="text-sm text-neutral-600">Loading...</p>
          ) : displayedInterviews.length === 0 ? (
            <Card className={`p-6 text-center ${cardStyles.default}`}>
              <Briefcase className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
              <p className="text-sm text-neutral-600">
                {selectedCandidateId
                  ? 'No interviews for this candidate yet.'
                  : 'No interviews yet. Create a job posting to start interviewing!'}
              </p>
            </Card>
          ) : (
            <Card className={cardStyles.default}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-neutral-700">Candidate</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-neutral-700">Job/Position</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-neutral-700">Status</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-neutral-700">Date</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-neutral-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedInterviews.map((interview) => (
                      <tr key={interview.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-brand-400 to-brand-600 flex-shrink-0">
                              {interview.candidate_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <span className="font-medium text-sm text-neutral-900">
                              {interview.candidate_name || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-sm text-neutral-700">
                          {interview.job_title || interview.position || 'General Interview'}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusClass(interview.status)}`}>
                            {getStatusLabel(interview.status)}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-xs text-neutral-600">
                          {new Date(interview.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            {interview.status === 'completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/admin/review/${interview.id}`)}
                                className="h-7 text-xs border-brand-500 text-brand-600 hover:bg-brand-50"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteInterview(interview.id, interview.candidate_name)}
                              className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
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

        {/* Delete Interview Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Interview</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the interview for {interviewToDelete?.name || 'this candidate'}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setInterviewToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteInterview}
                className="bg-red-500 hover:bg-red-600"
              >
                Delete Interview
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

export default Dashboard
