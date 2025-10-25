import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Briefcase, CheckSquare, Clock, CheckCircle, PlayCircle, Calendar } from 'lucide-react'
import CandidateSidebar from '../../components/CandidateSidebar'
import { toast } from 'sonner'

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : 'http://localhost:8000/api'

export default function CandidatePortal() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [interviews, setInterviews] = useState([])
  const [annotationTasks, setAnnotationTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id) {
      fetchInterviews()
      fetchAnnotationTasks()
    }
  }, [user])

  const fetchInterviews = async () => {
    try {
      const response = await axios.get(`${API}/interviews/candidate/${user.id}`)
      setInterviews(response.data || [])
    } catch (error) {
      console.error('Failed to fetch interviews:', error)
    }
  }

  const fetchAnnotationTasks = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API}/annotations/user/${user.id}`)
      setAnnotationTasks(response.data || [])
    } catch (error) {
      console.error('Failed to fetch annotation tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-gray-100 text-gray-800',
      assigned: 'bg-blue-100 text-blue-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getAcceptanceStatus = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  // Separate annotation tasks by status
  const pendingTasks = annotationTasks.filter(t => t.status === 'assigned')
  const activeTasks = annotationTasks.filter(t => t.status === 'in_progress')
  const completedTasks = annotationTasks.filter(t => t.status === 'completed' || t.status === 'reviewed')

  return (
    <div className="flex min-h-screen bg-background">
      <CandidateSidebar showAnnotationTasks={annotationTasks.length > 0} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600">Total Interviews</p>
                  <p className="text-3xl font-bold text-neutral-900 mt-1">{interviews.length}</p>
                </div>
                <Briefcase className="w-10 h-10 text-brand-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600">Creative Tasks</p>
                  <p className="text-3xl font-bold text-neutral-900 mt-1">{annotationTasks.length}</p>
                </div>
                <CheckSquare className="w-10 h-10 text-brand-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600">Completed Tasks</p>
                  <p className="text-3xl font-bold text-neutral-900 mt-1">{completedTasks.length}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Creative Tasks Section */}
        {annotationTasks.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  My Creative Tasks
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/candidate/annotation-tasks')}
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Pending Tasks */}
                {pendingTasks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-700 mb-2">Ready to Start ({pendingTasks.length})</h3>
                    {pendingTasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-neutral-50 rounded-lg mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">Task {task.id.slice(0, 8)}...</p>
                          <p className="text-xs text-neutral-600">Created {new Date(task.created_at).toLocaleDateString()}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => navigate(`/candidate/annotate/${task.id}`)}
                          className="bg-brand-500 hover:bg-brand-600 text-white w-full sm:w-auto sm:ml-3 flex-shrink-0"
                        >
                          <PlayCircle className="w-4 h-4 mr-1" />
                          Start
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Active Tasks */}
                {activeTasks.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-neutral-700 mb-2">In Progress ({activeTasks.length})</h3>
                    {activeTasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-yellow-50 rounded-lg mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">Task {task.id.slice(0, 8)}...</p>
                          <Badge className="bg-yellow-100 text-yellow-800 mt-1">In Progress</Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/candidate/annotate/${task.id}`)}
                          className="w-full sm:w-auto sm:ml-3 flex-shrink-0"
                        >
                          Continue
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Interviews Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              My Interview Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-neutral-600 text-center py-8">Loading interviews...</p>
            ) : interviews.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                <p className="text-neutral-600">No interviews yet</p>
                <p className="text-sm text-neutral-500 mt-1">Apply for jobs to get started with interviews</p>
              </div>
            ) : (
              <div className="space-y-3">
                {interviews.map((interview) => (
                  <div key={interview.id} className="p-4 border border-neutral-200 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-base font-semibold text-neutral-900">
                            {interview.job_title || interview.position || 'Interview'}
                          </h3>
                          <Badge className={getStatusColor(interview.status)}>
                            {interview.status}
                          </Badge>
                          {interview.acceptance_status && (
                            <Badge className={getAcceptanceStatus(interview.acceptance_status)}>
                              {interview.acceptance_status}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-neutral-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(interview.scheduled_time || interview.created_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {interview.duration || 'N/A'} min
                          </span>
                        </div>
                      </div>
                      {interview.status === 'scheduled' && (
                        <Button
                          onClick={() => navigate(`/interview-prep/${interview.id}`)}
                          className="bg-brand-500 hover:bg-brand-600 text-white"
                        >
                          Start Interview
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </main>
    </div>
  )
}
