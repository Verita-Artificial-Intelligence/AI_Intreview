import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Plus, Search, FileText, MessagesSquare } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
import Sidebar from '@/components/Sidebar'
import JobForm from '@/components/JobForm'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API = `${BACKEND_URL}/api`

const Jobs = () => {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [filteredJobs, setFilteredJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showJobForm, setShowJobForm] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [statusTransition, setStatusTransition] = useState(null)

  useEffect(() => {
    fetchJobs()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredJobs(jobs)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredJobs(
        jobs.filter(
          (job) =>
            job.title.toLowerCase().includes(query) ||
            job.position_type.toLowerCase().includes(query) ||
            job.description.toLowerCase().includes(query)
        )
      )
    }
  }, [searchQuery, jobs])

  const fetchJobs = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API}/jobs`)
      // Filter out completed and archived jobs - only show active jobs
      const activeJobs = response.data.filter(
        (job) => job.status === 'pending' || job.status === 'in_progress'
      )
      setJobs(activeJobs)
      setFilteredJobs(activeJobs)
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateJob = async (jobData) => {
    try {
      await axios.post(`${API}/jobs`, jobData)
      fetchJobs()
      setShowJobForm(false)
    } catch (error) {
      console.error('Error creating job:', error)
      throw error
    }
  }

  const handleViewInterviews = (jobId) => {
    navigate(`/interviews?job=${jobId}`)
  }

  // Centralized interview type labels (matching backend/config/interview_type_definitions.py)
  const getInterviewTypeLabel = (type) => {
    const labels = {
      standard: 'Standard interview',
      human_data: 'Design critique & feedback exercise',
      custom_questions: 'Custom questions only',
      custom_exercise: 'Custom Creative Exercise',
    }
    return labels[type] || type
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Pending' },
      in_progress: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        label: 'In Progress',
      },
      archived: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Archived' },
    }
    return badges[status] || badges.pending
  }

  const getNextStatus = (currentStatus) => {
    const transitions = {
      pending: 'in_progress',
      in_progress: 'completed',
      completed: 'archived',
      archived: null,
    }
    return transitions[currentStatus]
  }

  const getNextStatusLabel = (currentStatus) => {
    const labels = {
      pending: 'Move to In Progress',
      in_progress: 'Mark as Completed',
      completed: 'Archive Job',
      archived: null,
    }
    return labels[currentStatus]
  }

  const getStatusTransitionMessage = (currentStatus, nextStatus) => {
    const messages = {
      in_progress: {
        title: 'Move Job to In Progress?',
        message:
          'You will no longer be able to add new annotation data. Annotators will be able to start working on assigned tasks. Are you sure?',
      },
      completed: {
        title: 'Mark Job as Completed?',
        message:
          'All annotation work for this job will be marked as complete. Make sure all tasks are finished.',
      },
      archived: {
        title: 'Archive This Job?',
        message:
          'This job will be moved to archived jobs. You can view it later in the archived section.',
      },
    }
    return (
      messages[nextStatus] || {
        title: 'Change Status?',
        message: 'Are you sure?',
      }
    )
  }

  const handleStatusChange = async (job) => {
    const nextStatus = getNextStatus(job.status)
    if (!nextStatus) return

    // If moving to completed, check if all tasks are done
    if (nextStatus === 'completed') {
      try {
        const response = await axios.get(`${API}/jobs/${job.id}/can-complete`)
        if (!response.data.can_complete) {
          alert(`Cannot mark as completed: ${response.data.reason}`)
          return
        }
      } catch (error) {
        console.error('Error checking job completion:', error)
        alert('Failed to check if job can be completed')
        return
      }
    }

    setStatusTransition({
      job,
      nextStatus,
      ...getStatusTransitionMessage(job.status, nextStatus),
    })
    setShowStatusDialog(true)
  }

  const confirmStatusChange = async () => {
    if (!statusTransition) return

    try {
      await axios.put(`${API}/jobs/${statusTransition.job.id}/status`, {
        status: statusTransition.nextStatus,
      })
      setShowStatusDialog(false)
      setStatusTransition(null)
      fetchJobs()
    } catch (error) {
      console.error('Error updating job status:', error)
      alert(error.response?.data?.detail || 'Failed to update job status')
    }
  }

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
                  Jobs
                </h1>
                <p className="text-sm text-gray-500">
                  Manage your open positions and interview configurations
                </p>
              </div>
              <Button
                onClick={() => setShowJobForm(true)}
                type="button"
                className="rounded-lg bg-brand-500 hover:bg-brand-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Job
              </Button>
            </div>
          </div>

          {/* Search */}
          {jobs.length > 0 && (
            <div className="mb-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search jobs by title, type, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-sm"
                />
              </div>
            </div>
          )}

          {/* Jobs Grid */}
          {loading ? (
            <p className="text-sm text-gray-600">Loading jobs...</p>
          ) : filteredJobs.length === 0 ? (
            <Card className="p-8 text-center bg-white border border-gray-200 rounded-lg shadow-sm">
              <MessagesSquare
                className="w-10 h-10 mx-auto mb-3 text-gray-300"
                strokeWidth={1.5}
              />
              <p className="text-sm text-gray-600 mb-4">
                {searchQuery
                  ? 'No jobs found matching your search'
                  : 'No jobs yet. Create your first job posting to get started'}
              </p>
              {!searchQuery ? (
                <Button
                  onClick={() => setShowJobForm(true)}
                  variant="outline"
                  size="sm"
                  className="rounded-lg font-normal text-xs h-8 px-3"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Create Your First Job
                </Button>
              ) : (
                <Button
                  onClick={() => setSearchQuery('')}
                  variant="outline"
                  size="sm"
                  className="rounded-lg font-normal text-xs h-8 px-3"
                >
                  Clear Search
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredJobs.map((job) => (
                <Card
                  key={job.id}
                  className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow relative flex flex-col"
                >
                  {/* Job Details */}
                  <div className="mb-3 flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2.5 bg-neutral-100 border border-neutral-200 rounded-lg flex-shrink-0">
                        <Briefcase className="w-5 h-5 text-neutral-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-lg text-neutral-900">
                            {job.title}
                          </h3>
                          {(() => {
                            const badge = getStatusBadge(job.status)
                            return (
                              <span
                                className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text} flex-shrink-0`}
                              >
                                {badge.label}
                              </span>
                            )
                          })()}
                        </div>
                        <p className="text-sm text-neutral-600">
                          {job.position_type}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-neutral-600 line-clamp-3 mb-4">
                      {job.description}
                    </p>

                    {/* Interview Type Badge */}
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-4 h-4 text-neutral-400" />
                      <span className="text-xs text-neutral-600">
                        {getInterviewTypeLabel(job.interview_type)}
                      </span>
                    </div>

                    {/* Skills */}
                    {job.skills && job.skills.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-neutral-700 mb-2">
                          Skills to assess:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {job.skills.slice(0, 3).map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-neutral-100 text-neutral-700 rounded text-xs"
                            >
                              {skill.name}
                            </span>
                          ))}
                          {job.skills.length > 3 && (
                            <span className="px-2 py-1 bg-neutral-100 text-neutral-700 rounded text-xs">
                              +{job.skills.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleViewInterviews(job.id)}
                      variant="outline"
                      size="sm"
                      className="w-full rounded-lg"
                    >
                      View Interviews
                    </Button>
                    {getNextStatus(job.status) && (
                      <Button
                        onClick={() => handleStatusChange(job)}
                        size="sm"
                        className="w-full rounded-lg bg-brand-500 hover:bg-brand-600 text-white"
                      >
                        {getNextStatusLabel(job.status)}
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Job Form Modal */}
      <JobForm
        open={showJobForm}
        onClose={() => setShowJobForm(false)}
        onSubmit={handleCreateJob}
      />

      {/* Status Transition Dialog */}
      <AlertDialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{statusTransition?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {statusTransition?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStatusTransition(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusChange}
              className="bg-brand-500 hover:bg-brand-600"
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default Jobs
