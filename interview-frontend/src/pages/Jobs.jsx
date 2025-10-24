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
  const [selectedJobId, setSelectedJobId] = useState(null)
  const [activeTab, setActiveTab] = useState('active')

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

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />

      {/* Main Content */}
      <main className="ml-64 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
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
                <div className="space-y-4">
                  {activeInterviews.map((interview) => {
                    const tasks = getJobAnnotationTasks(interview.job_id)
                    const activeTasks = tasks.filter(
                      (t) =>
                        t.status === 'assigned' || t.status === 'in_progress'
                    )

                    return (
                      <Card
                        key={interview.id}
                        className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                              {interview.job_title || interview.position}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {interview.job_id.slice(0, 8)}... • Created{' '}
                              {new Date(
                                interview.created_at
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge
                            className={`${getStatusBadge(interview.status).bg} ${getStatusBadge(interview.status).text} text-xs font-medium px-2.5 py-1`}
                          >
                            {getStatusBadge(interview.status).label}
                          </Badge>
                        </div>

                        {/* Annotation Tasks */}
                        {(() => {
                          // If no tasks, show "Tasks Being Prepared"
                          if (tasks.length === 0) {
                            return (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                                  <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                                  <p className="text-sm font-medium text-blue-900 mb-0.5">
                                    Tasks Being Prepared
                                  </p>
                                  <p className="text-xs text-blue-700">
                                    Your annotation tasks are being set up.
                                    Check back soon to start working!
                                  </p>
                                </div>
                              </div>
                            )
                          }

                          // Show active tasks (assigned or in_progress)
                          if (activeTasks.length > 0) {
                            return (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="flex items-baseline gap-2 mb-3">
                                  <span className="text-xl font-semibold text-neutral-900">
                                    {activeTasks.length}
                                  </span>
                                  <p className="text-sm font-medium text-gray-600">
                                    Active Creative Task
                                    {activeTasks.length !== 1 ? 's' : ''}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  {activeTasks.map((task) => (
                                    <div
                                      key={task.id}
                                      className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-white hover:shadow-sm transition-all"
                                    >
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600 flex-shrink-0">
                                          <FileText className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-sm font-medium text-neutral-900 truncate">
                                            {task.data_to_annotate?.title ||
                                              'Creative Task'}
                                          </p>
                                          <p className="text-xs text-gray-600">
                                            {task.data_to_annotate?.data_type ||
                                              'Unknown'}{' '}
                                            • {task.id.slice(0, 8)}...
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 ml-4">
                                        <Badge
                                          className={`${getAnnotationStatusBadge(task.status).bg} ${getAnnotationStatusBadge(task.status).text} text-xs font-medium px-2.5 py-1`}
                                        >
                                          {
                                            getAnnotationStatusBadge(
                                              task.status
                                            ).label
                                          }
                                        </Badge>
                                        <Button
                                          onClick={() =>
                                            handleStartAnnotation(task.id)
                                          }
                                          size="sm"
                                          className="bg-brand-500 hover:bg-brand-600 text-white h-8 px-3 text-xs whitespace-nowrap rounded-lg"
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
                            )
                          }
                          return null
                        })()}
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
                  {completedInterviews.map((interview) => (
                    <Card
                      key={interview.id}
                      className="p-5 bg-white border border-gray-200 rounded-lg shadow-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-base font-semibold text-neutral-900 mb-1">
                            {interview.job_title || interview.position}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Completed on{' '}
                            {new Date(
                              interview.completed_at
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1">
                          Completed
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
