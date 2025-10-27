import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/utils/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Briefcase,
  Clock,
  CheckCircle,
  Plus,
  Trash2,
  Search,
  Eye,
  MessagesSquare,
  MoveUpRight,
} from 'lucide-react'
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
import Sidebar from '@/components/Sidebar'
import {
  cardStyles,
  iconBackgrounds,
  pageHeader,
  containers,
  getStatusClass,
  getStatusLabel,
} from '@/lib/design-system'

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
      const interviewsRes = await api.get('/interviews')
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
    navigate(`/audio-interview/${interview.id}`, {
      state: { from: 'dashboard' },
    })
  }

  const handleDeleteInterview = (interviewId, candidateName) => {
    setInterviewToDelete({ id: interviewId, name: candidateName })
    setShowDeleteDialog(true)
  }

  const confirmDeleteInterview = async () => {
    if (!interviewToDelete) return

    try {
      await api.delete(`/interviews/${interviewToDelete.id}`)
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
      icon: <Briefcase className="w-5 h-5" />,
      label: 'Total Interviews',
      value: interviews.length,
      bgClass: 'bg-neutral-100 border border-neutral-200',
    },
    {
      icon: <Clock className="w-5 h-5" />,
      label: 'In Progress',
      value: interviews.filter((i) => i.status === 'in_progress').length,
      bgClass: 'bg-neutral-100 border border-neutral-200',
    },
    {
      icon: <CheckCircle className="w-5 h-5" />,
      label: 'Completed',
      value: interviews.filter((i) => i.status === 'completed').length,
      bgClass: 'bg-neutral-100 border border-neutral-200',
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />

      {/* Main Content */}
      <main className="lg:ml-64 overflow-y-auto pb-16 lg:pb-0">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-neutral-900 mb-1">
                  Dashboard
                </h1>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {stats.map((stat, index) => (
              <Card
                key={index}
                className="bg-white border border-gray-200 rounded-lg shadow-sm p-6"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-2.5 rounded-lg ${stat.bgClass} flex-shrink-0`}
                  >
                    {stat.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-semibold text-neutral-900">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Interviews Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 mb-0.5">
                  {selectedCandidateId
                    ? 'Candidate Interviews'
                    : 'Recent Interviews'}
                </h2>
                <p className="text-sm text-gray-600">
                  View and manage candidate interview results
                </p>
              </div>
              {selectedCandidateId && (
                <Button
                  onClick={() => setSelectedCandidateId(null)}
                  variant="outline"
                  className="h-9 text-sm rounded-lg border-gray-300 hover:bg-gray-50"
                >
                  Show All Interviews
                </Button>
              )}
            </div>

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

            {loading ? (
              <p className="text-sm text-gray-600">Loading...</p>
            ) : displayedInterviews.length === 0 ? (
              <Card className="p-8 text-center bg-white border border-gray-200 rounded-lg shadow-sm">
                <MessagesSquare
                  className="w-10 h-10 mx-auto mb-3 text-gray-300"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-gray-600 mb-4">
                  {selectedCandidateId
                    ? 'No interviews for this candidate yet.'
                    : 'No interviews yet. Get started by creating a job posting'}
                </p>
                {!selectedCandidateId && (
                  <Button
                    onClick={() => navigate('/jobs')}
                    variant="outline"
                    size="sm"
                    className="rounded-lg font-normal text-xs h-8 px-3"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Create Job Posting
                  </Button>
                )}
              </Card>
            ) : (
              <Card className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Candidate
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Job/Position
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {displayedInterviews.map((interview) => (
                        <tr
                          key={interview.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-semibold text-neutral-900 bg-brand-200 flex-shrink-0">
                                {getInitials(interview.candidate_name)}
                              </div>
                              <span className="font-medium text-sm text-gray-900">
                                {interview.candidate_name || 'Unknown'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700">
                            {interview.job_title ||
                              interview.position ||
                              'General Interview'}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClass(interview.status)}`}
                            >
                              {getStatusLabel(interview.status)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {new Date(
                              interview.created_at
                            ).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {interview.status === 'completed' && (
                                <Button
                                  onClick={() =>
                                    navigate(`/admin/review/${interview.id}`)
                                  }
                                  variant="ghost"
                                  size="sm"
                                  className="h-9 px-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md text-sm"
                                >
                                  <Eye className="w-4 h-4 mr-1.5" />
                                  View
                                </Button>
                              )}
                              <button
                                onClick={() =>
                                  handleDeleteInterview(
                                    interview.id,
                                    interview.candidate_name
                                  )
                                }
                                className="p-1.5 text-gray-600 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                                title="Delete interview"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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
      </main>

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
              Are you sure you want to delete the interview for{' '}
              {interviewToDelete?.name || 'this candidate'}? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInterviewToDelete(null)}>
              Cancel
            </AlertDialogCancel>
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
  )
}

export default Dashboard
