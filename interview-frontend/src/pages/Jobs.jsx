import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Sidebar from '@/components/Sidebar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Briefcase,
  CheckCircle,
  Clock,
  ArrowRight,
  FileText,
  ArrowLeft,
  ChevronDown,
  Info,
  Calendar,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API = `${BACKEND_URL}/api`

export default function Jobs() {
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const [userInterviews, setUserInterviews] = useState([])
  const [annotationTasks, setAnnotationTasks] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState(null)
  const [activeTab, setActiveTab] = useState('active')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showEmailSentModal, setShowEmailSentModal] = useState(false)
  const [selectedDocId, setSelectedDocId] = useState(null)
  const [checkedDocs, setCheckedDocs] = useState({})
  const [onboardingExpanded, setOnboardingExpanded] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [interviewsRes, annotationsRes, jobsRes] = await Promise.all([
        axios.get(`${API}/interviews`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API}/annotations/user/${user?.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API}/jobs`),
      ])

      // Filter interviews for current user
      const myInterviews = interviewsRes.data.filter(
        (interview) => interview.candidate_id === user?.id
      )
      setUserInterviews(myInterviews)

      // Store annotation tasks
      setAnnotationTasks(annotationsRes.data || [])

      // Store jobs
      setJobs(jobsRes.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getJobStatus = (jobId) => {
    const job = jobs.find((j) => j.id === jobId)
    return job?.status || 'pending'
  }

  const getJobAnnotationTasks = (jobId) => {
    return annotationTasks.filter((task) => task.job_id === jobId)
  }

  const getStatusBadge = (status) => {
    const badges = {
      scheduled: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        label: 'Scheduled',
      },
      in_progress: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        label: 'In Progress',
      },
      completed: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        label: 'Completed',
      },
      pending: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Pending' },
    }
    return badges[status] || badges.pending
  }

  const getAnnotationStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Pending' },
      assigned: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Assigned' },
      in_progress: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        label: 'In Progress',
      },
      completed: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        label: 'Completed',
      },
      reviewed: {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        label: 'Reviewed',
      },
    }
    return badges[status] || badges.pending
  }

  // Only show interviews that have been accepted
  const acceptedInterviews = userInterviews.filter(
    (i) => i.acceptance_status === 'accepted'
  )

  // Active: accepted interviews with any active annotation tasks
  const activeInterviews = acceptedInterviews.filter((interview) => {
    const tasks = getJobAnnotationTasks(interview.job_id)
    const hasActiveTasks = tasks.some(
      (t) => t.status === 'assigned' || t.status === 'in_progress'
    )
    // Show in active if:
    // 1. There are active tasks, OR
    // 2. Interview is still in progress, OR
    // 3. No tasks have been created yet for this accepted candidate (waiting for admin to create tasks)
    return (
      hasActiveTasks ||
      interview.status === 'in_progress' ||
      interview.status === 'scheduled' ||
      tasks.length === 0
    )
  })

  // Completed: accepted interviews where all annotation tasks are completed
  const completedInterviews = acceptedInterviews.filter((interview) => {
    const tasks = getJobAnnotationTasks(interview.job_id)
    // Only show in completed if:
    // 1. Interview is completed, AND
    // 2. There ARE tasks (not just accepted with no tasks yet), AND
    // 3. All tasks are completed or reviewed
    const allTasksCompleted =
      tasks.length > 0 &&
      tasks.every((t) => t.status === 'completed' || t.status === 'reviewed')
    return interview.status === 'completed' && allTasksCompleted
  })

  const handleStartAnnotation = (taskId) => {
    navigate(`/annotate/${taskId}`)
  }

  const handleDocClick = (docId) => {
    setSelectedDocId(docId)
    setShowConfirmModal(true)
  }

  const handleConfirmSendEmail = () => {
    setShowConfirmModal(false)
    setShowEmailSentModal(true)
    setTimeout(() => {
      setCheckedDocs((prev) => ({ ...prev, [selectedDocId]: true }))
      setShowEmailSentModal(false)
      setSelectedDocId(null)
    }, 2000)
  }

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now - date
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInDays < 0) {
      return 'Received recently'
    } else if (diffInDays === 0) {
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
      if (diffInHours <= 0) {
        return 'Received just now'
      }
      return `Received ${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`
    } else if (diffInDays === 1) {
      return 'Received 1 day ago'
    } else if (diffInDays < 30) {
      return `Received ${diffInDays} days ago`
    } else {
      const diffInMonths = Math.floor(diffInDays / 30)
      return `Received ${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`
    }
  }

  // If a job is selected, show full-screen detail view
  if (selectedJob) {
    const tasks = getJobAnnotationTasks(selectedJob.job_id)
    const activeTasks = tasks.filter(
      (t) => t.status === 'assigned' || t.status === 'in_progress'
    )

    return (
      <div className="min-h-screen bg-white">
        <Sidebar />

        <main className="lg:ml-64 overflow-y-auto h-screen pb-16 lg:pb-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            {/* Back Button */}
            <button
              onClick={() => setSelectedJob(null)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back to Jobs</span>
            </button>

            {/* Two Column Layout */}
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              {/* Left Column - Main Content (70%) */}
              <div className="flex-1 space-y-6">
                {/* Company Name and Position */}
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900 mb-1">
                    Verita AI
                  </h1>
                  <p className="text-lg text-gray-600">
                    {selectedJob.job_title || selectedJob.position}
                  </p>
                </div>

                {/* Contract Type and Date */}
                <div className="flex items-center gap-4 text-sm text-gray-600 -mt-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Hourly contract</span>
                  </div>
                  <span className="text-gray-500">
                    {getTimeAgo(selectedJob.created_at)}
                  </span>
                </div>

                {/* Onboarding Document Section */}
                <div className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => setOnboardingExpanded(!onboardingExpanded)}
                    className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
                  >
                    <div className="text-left">
                      <h3 className="text-base font-semibold text-neutral-900">
                        Onboarding document
                      </h3>
                      <p className="text-sm text-gray-600 mt-0.5">
                        You are required to read the onboarding document before
                        starting work.
                      </p>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-600 transition-transform ${
                        onboardingExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {onboardingExpanded && (
                    <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-200">
                      <p className="text-sm text-gray-700 leading-relaxed mb-2">
                        We're excited to welcome you to Verita AI's Creative
                        Labeling Team. Please see below for your next steps:
                      </p>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex gap-2">
                          <span className="text-gray-500">•</span>
                          <span>
                            Visit our website – it includes everything you need
                            to know about Verita AI, our mission, and your role
                            in shaping the next generation of creative AI.
                          </span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-gray-500">•</span>
                          <span>
                            Review the creative labeling guidelines and quality
                            standards – these outline how to evaluate
                            aesthetics, tone, and originality.
                          </span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-gray-500">•</span>
                          <span>
                            Complete the onboarding and training modules before
                            beginning your first project.
                          </span>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* Payments Section */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-base font-semibold text-neutral-900 mb-1">
                    Payments
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    You will receive all payments via Stripe, less currency
                    conversion fees
                  </p>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">Hourly pay</span>
                      <span className="text-base font-semibold text-neutral-900">
                        $
                        {jobs.find((j) => j.id === selectedJob.job_id)
                          ?.pay_per_hour || '21.00'}{' '}
                        / hour
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">Weekly cap</span>
                      <span className="text-base font-semibold text-neutral-900">
                        40 hours
                      </span>
                    </div>
                  </div>

                  {/* Payout Table */}
                  <div className="border border-gray-200 rounded-lg overflow-x-auto">
                    <div className="min-w-[600px]">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <div className="grid grid-cols-6 gap-2 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <span>Payout Day</span>
                            <Info className="w-3 h-3" />
                          </div>
                          <div className="flex items-center gap-1">
                            <span>Payout Cycle</span>
                            <Info className="w-3 h-3" />
                          </div>
                          <div className="flex items-center gap-1">
                            <span>Type</span>
                            <Info className="w-3 h-3" />
                          </div>
                          <div className="flex items-center gap-1">
                            <span>Hours</span>
                            <Info className="w-3 h-3" />
                          </div>
                          <div className="flex items-center gap-1">
                            <span>Hours Max</span>
                            <Info className="w-3 h-3" />
                          </div>
                          <div className="flex items-center gap-1">
                            <span>Earned</span>
                            <Info className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                      <div className="divide-y divide-gray-200">
                        <div className="px-4 py-3 grid grid-cols-6 gap-2 text-sm">
                          <span className="text-gray-900">29 Oct 2025</span>
                          <span className="text-gray-600">18 Oct - 24 Oct</span>
                          <span className="text-gray-600">Contracts</span>
                          <span className="text-gray-900">0.00</span>
                          <span className="text-gray-900">40</span>
                          <span className="text-gray-900">-</span>
                        </div>
                        <div className="px-4 py-3 grid grid-cols-6 gap-2 text-sm bg-gray-50">
                          <span className="text-gray-900">22 Oct 2025</span>
                          <span className="text-gray-600">11 Oct - 17 Oct</span>
                          <span className="text-gray-600">Contracts</span>
                          <span className="text-gray-900">0.00</span>
                          <span className="text-gray-900">0</span>
                          <span className="text-gray-900">-</span>
                        </div>
                        <div className="px-4 py-3 grid grid-cols-6 gap-2 text-sm">
                          <span className="text-gray-900">15 Oct 2025</span>
                          <span className="text-gray-600">04 Oct - 10 Oct</span>
                          <span className="text-gray-600">Contracts</span>
                          <span className="text-gray-900">0.00</span>
                          <span className="text-gray-900">0</span>
                          <span className="text-gray-900">-</span>
                        </div>
                        <div className="px-4 py-3 grid grid-cols-6 gap-2 text-sm bg-gray-50">
                          <span className="text-gray-900">08 Oct 2025</span>
                          <span className="text-gray-600">27 Sep - 03 Oct</span>
                          <span className="text-gray-600">Contracts</span>
                          <span className="text-gray-900">0.00</span>
                          <span className="text-gray-900">0</span>
                          <span className="text-gray-900">-</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active Tasks Section (if any) */}
                {activeTasks.length > 0 && (
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                      Active Creative Tasks
                    </h3>
                    <div className="space-y-3">
                      {activeTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-white hover:shadow-sm transition-all"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600 flex-shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-neutral-900 truncate">
                                {task.data_to_annotate?.title ||
                                  'Creative Task'}
                              </p>
                              <p className="text-xs text-gray-600">
                                {task.data_to_annotate?.data_type || 'Unknown'}{' '}
                                • {task.id.slice(0, 8)}...
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:ml-4 flex-shrink-0">
                            <Badge
                              className={`${getAnnotationStatusBadge(task.status).bg} ${getAnnotationStatusBadge(task.status).text} text-xs font-medium px-2.5 py-1`}
                            >
                              {getAnnotationStatusBadge(task.status).label}
                            </Badge>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStartAnnotation(task.id)
                              }}
                              size="sm"
                              className="bg-brand-500 hover:bg-brand-600 text-white h-8 px-3 text-xs whitespace-nowrap rounded-lg flex-1 sm:flex-initial"
                            >
                              {task.status === 'in_progress'
                                ? 'Continue'
                                : 'Start'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Vertical Separator */}
              <div className="hidden lg:block w-px bg-gray-200 self-stretch mt-12"></div>

              {/* Right Column - Project Information (30%) */}
              <div className="w-full lg:w-[30%] space-y-6">
                <h3 className="text-lg font-semibold text-neutral-900">
                  View initial project information
                </h3>

                <div className="space-y-3">
                  {[
                    {
                      id: 'terms',
                      title: 'Sign Terms of Work Document',
                      description:
                        "You are required to sign Verita AI's Terms of Work to accept engagement offers.",
                    },
                    {
                      id: 'ciiaa',
                      title: 'Sign CIIAA Document',
                      description:
                        'You are required to sign a Confidential Information and Inventions Assignment Agreement (CIIAA).',
                    },
                    {
                      id: 'w9',
                      title: 'Sign W9 / W-8 BEN Form',
                      description:
                        'For tax reporting, complete a W9 if you are a United States citizen or resident alien. If you are from a country outside the United States, fill out the W-8 BEN.',
                    },
                    {
                      id: 'insightful',
                      title: 'Complete Insightful Setup',
                      description:
                        'Set up Insightful to track your working hours.',
                    },
                    {
                      id: 'payout',
                      title: 'Acknowledge Verita AI Payout Policies',
                      description:
                        'Please familiarize yourself with our payout policies and payout days.',
                    },
                    {
                      id: 'offer',
                      title: 'Sign your offer letter',
                      description:
                        'You are required to sign your offer letter to accept the contract',
                    },
                    {
                      id: 'payment',
                      title: 'Setup Payments',
                      description: 'Payment setup completed.',
                    },
                  ].map((doc) => (
                    <div
                      key={doc.id}
                      className={`rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                        checkedDocs[doc.id]
                          ? 'border-2 border-brand-500'
                          : 'border border-gray-200'
                      }`}
                      onClick={() => handleDocClick(doc.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-base font-semibold text-neutral-900 mb-1">
                            {doc.title}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {doc.description}
                          </p>
                        </div>
                        <div
                          className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ml-3 ${
                            checkedDocs[doc.id]
                              ? 'bg-brand-500'
                              : 'border-2 border-gray-300'
                          }`}
                        >
                          {checkedDocs[doc.id] && (
                            <svg
                              className="w-4 h-4 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Modals */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md mx-4 shadow-xl">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-neutral-900 mb-3">
                  Send Document Email
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  We will send an email to your address with the document to
                  sign. Do you want to proceed?
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => {
                      setShowConfirmModal(false)
                      setSelectedDocId(null)
                    }}
                    variant="outline"
                    className="px-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmSendEmail}
                    className="px-6 bg-brand-500 hover:bg-brand-600"
                  >
                    Send Email
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showEmailSentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md mx-4 shadow-xl">
              <div className="text-center">
                <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-brand-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                  Email Sent
                </h3>
                <p className="text-sm text-gray-600">
                  An email has been sent to your email address with the document
                  to sign. Please check your inbox.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Otherwise, show job list
  return (
    <div className="min-h-screen bg-white">
      <Sidebar />

      {/* Main Content */}
      <main className="lg:ml-64 overflow-y-auto pb-16 lg:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-neutral-900 mb-1">
              Your Jobs
            </h1>
            <p className="text-sm text-gray-500">
              Track active projects and complete creative tasks to earn
            </p>
          </div>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-4"
          >
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-transparent p-0 gap-2">
              <TabsTrigger
                value="active"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=inactive]:bg-transparent border border-gray-200 data-[state=active]:shadow-sm"
              >
                <Briefcase className="w-4 h-4" />
                Active Jobs ({activeInterviews.length})
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=inactive]:bg-transparent border border-gray-200 data-[state=active]:shadow-sm"
              >
                <CheckCircle className="w-4 h-4" />
                Completed ({completedInterviews.length})
              </TabsTrigger>
            </TabsList>

            {/* Active Jobs Tab */}
            <TabsContent value="active" className="space-y-4">
              {loading ? (
                <p className="text-sm text-gray-600">Loading jobs...</p>
              ) : activeInterviews.length === 0 ? (
                <Card className="p-8 text-center bg-white border border-gray-200 rounded-lg shadow-sm">
                  <Briefcase
                    className="w-10 h-10 mx-auto mb-3 text-gray-300"
                    strokeWidth={1.5}
                  />
                  <p className="text-sm text-gray-600 mb-4">
                    No active jobs yet
                  </p>
                  <Button
                    onClick={() => navigate('/')}
                    variant="outline"
                    size="sm"
                    className="rounded-lg h-8 px-3 text-xs"
                  >
                    Browse Opportunities
                    <ArrowRight className="w-3.5 h-3.5 ml-2" />
                  </Button>
                </Card>
              ) : (
                <div className="space-y-3">
                  {activeInterviews.map((interview) => {
                    const tasks = getJobAnnotationTasks(interview.job_id)
                    const activeTasks = tasks.filter(
                      (t) =>
                        t.status === 'assigned' || t.status === 'in_progress'
                    )
                    const job = jobs.find((j) => j.id === interview.job_id)

                    return (
                      <Card
                        key={interview.id}
                        className="p-5 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => setSelectedJob(interview)}
                      >
                        <div className="flex items-center gap-4">
                          {/* Icon */}
                          <div className="flex-shrink-0 p-2.5 rounded-lg bg-neutral-100 border border-neutral-200">
                            <Briefcase className="w-5 h-5 text-neutral-600" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base text-neutral-900 mb-1">
                              {interview.job_title || interview.position}
                            </h3>
                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                              {job?.pay_per_hour && (
                                <>
                                  <span className="font-medium text-neutral-700">
                                    ${job.pay_per_hour}/hr
                                  </span>
                                  <span className="text-gray-400">•</span>
                                </>
                              )}
                              <span>{getTimeAgo(interview.created_at)}</span>
                            </div>
                          </div>

                          {/* Right side - Status badges */}
                          <div className="flex items-center gap-2">
                            {tasks.length === 0 && (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs font-medium px-2.5 py-1 hover:bg-blue-100">
                                Tasks Being Prepared
                              </Badge>
                            )}
                            {activeTasks.length > 0 && (
                              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs font-medium px-2.5 py-1 hover:bg-yellow-100">
                                {activeTasks.length} Active Task
                                {activeTasks.length !== 1 ? 's' : ''}
                              </Badge>
                            )}
                            <Badge
                              className={`${getStatusBadge(interview.status).bg} ${getStatusBadge(interview.status).text} text-xs font-medium px-2.5 py-1`}
                            >
                              {getStatusBadge(interview.status).label}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            {/* Completed Jobs Tab */}
            <TabsContent value="completed" className="space-y-4">
              {completedInterviews.length === 0 ? (
                <Card className="p-8 text-center bg-white border border-gray-200 rounded-lg shadow-sm">
                  <CheckCircle
                    className="w-10 h-10 mx-auto mb-3 text-gray-300"
                    strokeWidth={1.5}
                  />
                  <p className="text-sm text-gray-600">No completed jobs yet</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {completedInterviews.map((interview) => {
                    const job = jobs.find((j) => j.id === interview.job_id)
                    return (
                      <Card
                        key={interview.id}
                        className="p-5 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => setSelectedJob(interview)}
                      >
                        <div className="flex items-center gap-4">
                          {/* Icon */}
                          <div className="flex-shrink-0 p-2.5 rounded-lg bg-neutral-100 border border-neutral-200">
                            <Briefcase className="w-5 h-5 text-neutral-600" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base text-neutral-900 mb-1">
                              {interview.job_title || interview.position}
                            </h3>
                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                              {job?.pay_per_hour && (
                                <>
                                  <span className="font-medium text-neutral-700">
                                    ${job.pay_per_hour}/hr
                                  </span>
                                  <span className="text-gray-400">•</span>
                                </>
                              )}
                              <span>
                                Completed on{' '}
                                {new Date(
                                  interview.completed_at
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          {/* Right side */}
                          <Badge className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1">
                            Completed
                          </Badge>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
