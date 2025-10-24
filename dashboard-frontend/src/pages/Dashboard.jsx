import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
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
  Users,
  Briefcase,
  Clock,
  CheckCircle,
  Plus,
  Trash2,
  Search,
  Eye,
  Star,
  MessagesSquare,
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
  const [annotatorStats, setAnnotatorStats] = useState([])
  const [annotatorSearch, setAnnotatorSearch] = useState('')
  const [completionFilter, setCompletionFilter] = useState('all')
  const [performanceFilter, setPerformanceFilter] = useState('all')
  const [annotatorLoading, setAnnotatorLoading] = useState(false)

  useEffect(() => {
    fetchData()
    fetchAnnotatorStats()
  }, [])

  useEffect(() => {
    fetchAnnotatorStats()
  }, [annotatorSearch, completionFilter, performanceFilter])

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

  const fetchAnnotatorStats = async () => {
    try {
      setAnnotatorLoading(true)
      const params = new URLSearchParams()
      if (annotatorSearch.trim()) params.append('search', annotatorSearch)
      if (completionFilter !== 'all')
        params.append('completion_filter', completionFilter)
      if (performanceFilter !== 'all')
        params.append('performance_filter', performanceFilter)

      const response = await axios.get(
        `${API}/annotations/annotators/stats?${params.toString()}`
      )
      setAnnotatorStats(response.data)
    } catch (error) {
      console.error('Error fetching annotator stats:', error)
    } finally {
      setAnnotatorLoading(false)
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
      <main className="ml-64 overflow-y-auto">
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
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white bg-gradient-to-br from-blue-400 to-blue-600 flex-shrink-0">
                                {interview.candidate_name
                                  ?.charAt(0)
                                  .toUpperCase() || 'U'}
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
                                  className="h-9 px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md text-sm"
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
                                className="p-1.5 text-red-600 hover:text-red-700 rounded hover:bg-red-50 transition-colors"
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

          {/* Annotator Performance Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 mb-0.5">
                  Annotator Performance
                </h2>
                <p className="text-sm text-gray-600">
                  Monitor annotator task completion and quality ratings
                </p>
              </div>
              <Button
                onClick={() => navigate('/annotators')}
                variant="outline"
                className="h-9 text-sm rounded-lg border-gray-300 hover:bg-gray-50"
              >
                View All Annotators
              </Button>
            </div>

            {/* Search and Filters */}
            <div className="mb-4 flex gap-3 flex-wrap">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search by annotator name..."
                    value={annotatorSearch}
                    onChange={(e) => setAnnotatorSearch(e.target.value)}
                    className="pl-9 h-10 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-sm"
                  />
                </div>
              </div>
              <Select
                value={completionFilter}
                onValueChange={setCompletionFilter}
              >
                <SelectTrigger className="w-40 h-10 rounded-lg text-sm">
                  <SelectValue placeholder="Completion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Completion</SelectItem>
                  <SelectItem value="100">100% Complete</SelectItem>
                  <SelectItem value="75">75% - 99%</SelectItem>
                  <SelectItem value="50">50% - 74%</SelectItem>
                  <SelectItem value="0">Below 50%</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={performanceFilter}
                onValueChange={setPerformanceFilter}
              >
                <SelectTrigger className="w-40 h-10 rounded-lg text-sm">
                  <SelectValue placeholder="Performance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Performance</SelectItem>
                  <SelectItem value="excellent">Excellent (4.5+)</SelectItem>
                  <SelectItem value="good">Good (3.5-4.5)</SelectItem>
                  <SelectItem value="fair">Fair (2.5-3.5)</SelectItem>
                  <SelectItem value="poor">Poor (&lt;2.5)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Annotator Stats Grid */}
            {annotatorLoading ? (
              <p className="text-sm text-gray-600">
                Loading annotator stats...
              </p>
            ) : annotatorStats.length === 0 ? (
              <Card className="p-8 text-center bg-white border border-gray-200 rounded-lg shadow-sm">
                <MessagesSquare
                  className="w-10 h-10 mx-auto mb-3 text-gray-300"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-gray-600 mb-4">
                  {annotatorSearch ||
                  completionFilter !== 'all' ||
                  performanceFilter !== 'all'
                    ? 'No annotators found matching your filters'
                    : 'No annotators yet. Get started by assigning annotation tasks'}
                </p>
                {!(
                  annotatorSearch ||
                  completionFilter !== 'all' ||
                  performanceFilter !== 'all'
                ) && (
                  <Button
                    onClick={() => navigate('/annotators')}
                    variant="outline"
                    size="sm"
                    className="rounded-lg font-normal text-xs h-8 px-3"
                  >
                    <Users className="w-3.5 h-3.5 mr-1.5" />
                    Manage Annotators
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {annotatorStats.map((annotator) => (
                  <Card
                    key={annotator.annotator_id}
                    className="p-5 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold text-white bg-gradient-to-br from-blue-400 to-blue-600 flex-shrink-0">
                        {annotator.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-gray-900 truncate">
                          {annotator.name}
                        </h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star
                            className={`w-3.5 h-3.5 ${annotator.avg_rating >= 4 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                          />
                          <span className="text-xs text-gray-600">
                            {annotator.avg_rating > 0
                              ? `${annotator.avg_rating}/5`
                              : 'No ratings'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tasks:</span>
                        <span className="font-medium text-gray-900">
                          {annotator.completed_tasks}/{annotator.total_tasks}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Completion:</span>
                        <span className="font-medium text-gray-900">
                          {annotator.completion_rate}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${annotator.completion_rate}%` }}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
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
