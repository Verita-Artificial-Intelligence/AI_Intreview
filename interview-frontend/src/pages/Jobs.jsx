import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Sidebar from '@/components/Sidebar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Briefcase, CheckCircle, Clock, ArrowRight, FileText } from 'lucide-react'
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
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/annotations/user/${user?.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/jobs`)
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
    const job = jobs.find(j => j.id === jobId)
    return job?.status || 'pending'
  }

  const getJobAnnotationTasks = (jobId) => {
    return annotationTasks.filter((task) => task.job_id === jobId)
  }

  const getStatusBadge = (status) => {
    const badges = {
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Scheduled' },
      in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'In Progress' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      pending: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Pending' },
    }
    return badges[status] || badges.pending
  }

  const getAnnotationStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Pending' },
      assigned: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Assigned' },
      in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'In Progress' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      reviewed: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Reviewed' },
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
    return hasActiveTasks || interview.status === 'in_progress' || interview.status === 'scheduled' || tasks.length === 0
  })

  // Completed: accepted interviews where all annotation tasks are completed
  const completedInterviews = acceptedInterviews.filter((interview) => {
    const tasks = getJobAnnotationTasks(interview.job_id)
    // Only show in completed if:
    // 1. Interview is completed, AND
    // 2. There ARE tasks (not just accepted with no tasks yet), AND
    // 3. All tasks are completed or reviewed
    const allTasksCompleted = tasks.length > 0 && tasks.every(
      (t) => t.status === 'completed' || t.status === 'reviewed'
    )
    return interview.status === 'completed' && allTasksCompleted
  })

  const handleStartAnnotation = (taskId) => {
    navigate(`/annotate/${taskId}`)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-6xl mx-auto px-8 py-12">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-5xl font-bold text-neutral-900 mb-2 tracking-tight leading-tight">
              Your Jobs
            </h1>
            <p className="text-lg text-neutral-600 font-light">
              Track active projects and complete creative tasks to earn
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="active" className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Active Jobs ({activeInterviews.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Completed ({completedInterviews.length})
              </TabsTrigger>
            </TabsList>

            {/* Active Jobs Tab */}
            <TabsContent value="active" className="space-y-4">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-neutral-600">Loading jobs...</p>
                </div>
              ) : activeInterviews.length === 0 ? (
                <Card className="p-12 text-center">
                  <Briefcase className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-600 mb-4">No active jobs yet</p>
                  <Button
                    onClick={() => navigate('/')}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Browse Opportunities
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Card>
              ) : (
                <div className="space-y-6">
                  {activeInterviews.map((interview) => {
                    const tasks = getJobAnnotationTasks(interview.job_id)
                    const activeTasks = tasks.filter(
                      (t) => t.status === 'assigned' || t.status === 'in_progress'
                    )

                    return (
                      <Card key={interview.id} className="p-8 border border-neutral-200 hover:border-neutral-300 transition-all">
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-neutral-900 mb-2 tracking-tight">
                              {interview.job_title || interview.position}
                            </h3>
                            <p className="text-sm text-neutral-600">
                              {interview.job_id.slice(0, 8)}... • Created {new Date(interview.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={`${getStatusBadge(interview.status).bg} ${getStatusBadge(interview.status).text} font-medium`}>
                            {getStatusBadge(interview.status).label}
                          </Badge>
                        </div>

                        {/* Annotation Tasks */}
                        {(() => {
                          const jobStatus = getJobStatus(interview.job_id)
                          const isPending = jobStatus === 'pending'

                          // If job is pending and tasks exist, show "Starting Soon"
                          if (isPending && tasks.length > 0) {
                            return (
                              <div className="mt-8 pt-8 border-t border-neutral-200">
                                <div className="flex items-baseline gap-2 mb-6">
                                  <span className="text-3xl font-bold text-neutral-900">{tasks.length}</span>
                                  <p className="text-base font-medium text-neutral-600">Creative Task{tasks.length !== 1 ? 's' : ''} Assigned</p>
                                </div>
                                <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
                                  <Clock className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                                  <p className="text-sm font-medium text-blue-900 mb-1">Starting Soon</p>
                                  <p className="text-xs text-blue-700">
                                    Your tasks are ready! They will be available to start once the project enters the active phase.
                                  </p>
                                </div>
                              </div>
                            )
                          }

                          // If no tasks, show "Tasks Being Prepared"
                          if (tasks.length === 0) {
                            return (
                              <div className="mt-8 pt-8 border-t border-neutral-200">
                                <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
                                  <Clock className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                                  <p className="text-sm font-medium text-blue-900 mb-1">Tasks Being Prepared</p>
                                  <p className="text-xs text-blue-700">
                                    Your annotation tasks are being set up. Check back soon to start working!
                                  </p>
                                </div>
                              </div>
                            )
                          }

                          // Job is active (in_progress), show tasks normally
                          if (activeTasks.length > 0) {
                            return (
                              <div className="mt-8 pt-8 border-t border-neutral-200">
                                <div className="flex items-baseline gap-2 mb-6">
                                  <span className="text-3xl font-bold text-neutral-900">{activeTasks.length}</span>
                                  <p className="text-base font-medium text-neutral-600">Active Creative Task{activeTasks.length !== 1 ? 's' : ''}</p>
                                </div>
                                <div className="space-y-3">
                                  {activeTasks.map((task) => (
                                    <div
                                      key={task.id}
                                      className="flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-lg hover:border-neutral-300 hover:shadow-sm transition-all"
                                    >
                                      <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600 flex-shrink-0">
                                          <FileText className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-sm font-semibold text-neutral-900 truncate">
                                            {task.data_to_annotate?.title || 'Creative Task'}
                                          </p>
                                          <p className="text-xs text-neutral-600 mt-1">
                                            {task.data_to_annotate?.data_type || 'Unknown'} • {task.id.slice(0, 8)}...
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3 ml-4">
                                        <Badge className={`${getAnnotationStatusBadge(task.status).bg} ${getAnnotationStatusBadge(task.status).text} font-medium`}>
                                          {getAnnotationStatusBadge(task.status).label}
                                        </Badge>
                                        <Button
                                          onClick={() => handleStartAnnotation(task.id)}
                                          size="sm"
                                          className="bg-blue-500 hover:bg-blue-600 text-white font-medium whitespace-nowrap"
                                        >
                                          {task.status === 'in_progress' ? 'Continue' : 'Start'}
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
                <Card className="p-12 text-center">
                  <CheckCircle className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-600">No completed jobs yet</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {completedInterviews.map((interview) => (
                    <Card key={interview.id} className="p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold text-neutral-900">
                            {interview.job_title || interview.position}
                          </h3>
                          <p className="text-sm text-neutral-600 mt-1">
                            Completed on {new Date(interview.completed_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className="bg-green-100 text-green-800">Completed</Badge>
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
