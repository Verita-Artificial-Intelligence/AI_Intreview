import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { ArrowLeft, Star, BarChart, Briefcase, CheckSquare, Users, ChevronRight, Upload } from 'lucide-react'
import { toast } from 'sonner'

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : 'http://localhost:8000/api'

export default function ReviewAnnotation() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTask()
  }, [taskId])

  const fetchTask = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API}/annotations/${taskId}`)
      setTask(response.data)
    } catch (error) {
      console.error('Failed to fetch task:', error)
      toast.error('Failed to load task')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-800',
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      reviewed: 'bg-purple-100 text-purple-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const renderStars = (rating) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`w-5 h-5 ${
              i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-neutral-300'
            }`}
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!task) {
    return <div className="flex items-center justify-center min-h-screen">Task not found</div>
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-neutral-200 flex-shrink-0">
        <div className="p-6">
          <h2 className="text-xl font-display font-bold text-neutral-900 mb-1">Verita</h2>
          <p className="text-xs text-neutral-600">AI Interview Platform</p>
        </div>

        <nav className="px-3">
          <a
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors mb-1"
          >
            <BarChart className="w-4 h-4" />
            <span>Dashboard</span>
          </a>
          <a
            href="/candidates"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors mb-1"
          >
            <Users className="w-4 h-4" />
            <span>Candidates</span>
          </a>
          <a
            href="/interviews"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors mb-1"
          >
            <Briefcase className="w-4 h-4" />
            <span>Interviews</span>
          </a>
          <a
            href="/jobs"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors mb-1"
          >
            <Briefcase className="w-4 h-4" />
            <span>Jobs</span>
          </a>

          <div className="border-t border-neutral-200 my-3" />

          <a
            href="/annotation-data"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors mb-1"
          >
            <Upload className="w-4 h-4" />
            <span>Annotation Data</span>
          </a>
          <a
            href="/annotation-tasks"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-brand-50 text-brand-600 font-medium mb-1"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Annotation Tasks</span>
            <ChevronRight className="w-4 h-4 ml-auto" />
          </a>
          <a
            href="/annotators"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors mb-1"
          >
            <Users className="w-4 h-4" />
            <span>Annotators</span>
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {/* Back Button */}
          <button
            onClick={() => navigate('/annotation-tasks')}
            className="flex items-center gap-2 text-brand-600 hover:text-brand-700 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Tasks
          </button>

          {/* Task Header */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Task Review</CardTitle>
                  <p className="text-sm text-neutral-600 mt-2 font-mono">{task.id}</p>
                </div>
                <Badge className={getStatusColor(task.status)}>{task.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-neutral-600 mb-1">Job ID</p>
                  <p className="font-mono text-sm">{task.job_id.slice(0, 8)}...</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-600 mb-1">Annotator</p>
                  <p className="font-mono text-sm">{task.annotator_id ? task.annotator_id.slice(0, 8) + '...' : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-600 mb-1">Created</p>
                  <p className="text-sm">{new Date(task.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-600 mb-1">Completed</p>
                  <p className="text-sm">
                    {task.completed_at ? new Date(task.completed_at).toLocaleDateString() : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Preview */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Data to Annotate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {task.data_to_annotate?.transcript && (
                  <div>
                    <h4 className="font-semibold text-neutral-900 mb-2">Transcript</h4>
                    <div className="bg-neutral-50 p-4 rounded-lg max-h-48 overflow-y-auto">
                      <p className="text-sm text-neutral-700 whitespace-pre-wrap">
                        {task.data_to_annotate.transcript}
                      </p>
                    </div>
                  </div>
                )}
                {task.data_to_annotate?.video_url && (
                  <div>
                    <h4 className="font-semibold text-neutral-900 mb-2">Video</h4>
                    <p className="text-sm text-neutral-600 font-mono break-all">{task.data_to_annotate.video_url}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Annotation Results */}
          <Card>
            <CardHeader>
              <CardTitle>Annotation Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-neutral-600 mb-3">Quality Rating</p>
                  <div className="flex items-center gap-4">
                    {task.quality_rating ? (
                      <>
                        {renderStars(task.quality_rating)}
                        <span className="text-lg font-bold text-neutral-900">{task.quality_rating}/5</span>
                      </>
                    ) : (
                      <p className="text-neutral-600">No rating submitted</p>
                    )}
                  </div>
                </div>

                {task.feedback_notes && (
                  <div>
                    <p className="text-sm text-neutral-600 mb-2">Feedback Notes</p>
                    <div className="bg-neutral-50 p-4 rounded-lg">
                      <p className="text-sm text-neutral-700">{task.feedback_notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

function NavLink({ to, label, icon: Icon, active }) {
  return (
    <a
      href={to}
      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
        active
          ? 'bg-brand-50 text-brand-600 font-medium'
          : 'text-neutral-700 hover:bg-neutral-50'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </a>
  )
}
