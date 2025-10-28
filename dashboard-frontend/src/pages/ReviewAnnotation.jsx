import React, { useState, useEffect } from 'react'
import api from '@/utils/api'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { ArrowLeft, Star } from 'lucide-react'
import { toast } from 'sonner'
import Sidebar from '../components/Sidebar'

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
      const response = await api.get(`/annotations/${taskId}`)
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
              i <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-neutral-300'
            }`}
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Task not found
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />

      {/* Main Content */}
      <main className="lg:ml-64 overflow-y-auto bg-white pb-16 lg:pb-0">
        <div className="max-w-7xl mx-auto px-8 py-12">
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
                  <p className="text-sm text-neutral-600 mt-2 font-mono">
                    {task.id}
                  </p>
                </div>
                <Badge className={getStatusColor(task.status)}>
                  {task.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-neutral-600 mb-1">Job ID</p>
                  <p className="font-mono text-sm">
                    {task.job_id.slice(0, 8)}...
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-600 mb-1">Annotator</p>
                  <p className="font-mono text-sm">
                    {task.annotator_id
                      ? task.annotator_id.slice(0, 8) + '...'
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-600 mb-1">Created</p>
                  <p className="text-sm">
                    {new Date(task.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-600 mb-1">Completed</p>
                  <p className="text-sm">
                    {task.completed_at
                      ? new Date(task.completed_at).toLocaleDateString()
                      : '-'}
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
                    <h4 className="font-semibold text-neutral-900 mb-2">
                      Transcript
                    </h4>
                    <div className="bg-neutral-50 p-4 rounded-lg max-h-48 overflow-y-auto">
                      <p className="text-sm text-neutral-700 whitespace-pre-wrap">
                        {task.data_to_annotate.transcript}
                      </p>
                    </div>
                  </div>
                )}
                {task.data_to_annotate?.video_url && (
                  <div>
                    <h4 className="font-semibold text-neutral-900 mb-2">
                      Video
                    </h4>
                    <p className="text-sm text-neutral-600 font-mono break-all">
                      {task.data_to_annotate.video_url}
                    </p>
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
                  <p className="text-sm text-neutral-600 mb-3">
                    Quality Rating
                  </p>
                  <div className="flex items-center gap-4">
                    {task.quality_rating ? (
                      <>
                        {renderStars(task.quality_rating)}
                        <span className="text-lg font-bold text-neutral-900">
                          {task.quality_rating}/5
                        </span>
                      </>
                    ) : (
                      <p className="text-neutral-600">No rating submitted</p>
                    )}
                  </div>
                </div>

                {task.feedback_notes && (
                  <div>
                    <p className="text-sm text-neutral-600 mb-2">
                      Feedback Notes
                    </p>
                    <div className="bg-neutral-50 p-4 rounded-lg">
                      <p className="text-sm text-neutral-700">
                        {task.feedback_notes}
                      </p>
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
