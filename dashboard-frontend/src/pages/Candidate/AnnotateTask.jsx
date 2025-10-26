import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/card'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog'
import { Star } from 'lucide-react'
import CandidateSidebar from '../../components/CandidateSidebar'
import { toast } from 'sonner'

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : 'http://localhost:8000/api'

export default function AnnotateTask() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    fetchTask()
  }, [taskId])

  const fetchTask = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API}/annotations/${taskId}`)
      setTask(response.data)

      // If task status is 'assigned', mark it as 'in_progress'
      if (response.data.status === 'assigned') {
        await axios.post(`${API}/annotations/${taskId}/start`)
      }
    } catch (error) {
      console.error('Failed to fetch task:', error)
      toast.error('Failed to load task')
      navigate('/candidate/portal')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a quality rating')
      return
    }

    try {
      setSubmitting(true)
      await axios.post(`${API}/annotations/${taskId}/submit`, {
        quality_rating: rating,
        feedback_notes: feedback || null,
      })
      toast.success('Annotation submitted successfully!')
      navigate('/candidate/annotation-tasks')
    } catch (error) {
      console.error('Failed to submit annotation:', error)
      toast.error('Failed to submit annotation')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-neutral-600">Loading task...</p>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-neutral-600">Task not found</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <CandidateSidebar showAnnotationTasks={true} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          {/* Task Info */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Task Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-neutral-600 uppercase font-semibold mb-1">
                    Task ID
                  </p>
                  <p className="font-mono text-sm">{task.id.slice(0, 12)}...</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-600 uppercase font-semibold mb-1">
                    Status
                  </p>
                  <Badge className="bg-blue-100 text-blue-800">
                    In Progress
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-neutral-600 uppercase font-semibold mb-1">
                    Started
                  </p>
                  <p className="text-sm">
                    {task.started_at
                      ? new Date(task.started_at).toLocaleDateString()
                      : 'Just now'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Preview */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Data to Annotate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Title and Description */}
                {task.data_to_annotate?.title && (
                  <div>
                    <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                      {task.data_to_annotate.title}
                    </h3>
                    {task.data_to_annotate.description && (
                      <p className="text-sm text-neutral-600 mb-4">
                        {task.data_to_annotate.description}
                      </p>
                    )}
                    <Badge className="bg-neutral-100 text-neutral-700">
                      Type: {task.data_to_annotate.data_type}
                    </Badge>
                  </div>
                )}

                {/* Text Content */}
                {task.data_to_annotate?.data_type === 'text' &&
                  task.data_to_annotate?.data_content?.text && (
                    <div>
                      <h4 className="font-semibold text-neutral-900 mb-3">
                        Text Content
                      </h4>
                      <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 max-h-96 overflow-y-auto">
                        <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">
                          {task.data_to_annotate.data_content.text}
                        </p>
                      </div>
                    </div>
                  )}

                {/* Image */}
                {task.data_to_annotate?.data_type === 'image' &&
                  task.data_to_annotate?.data_url && (
                    <div>
                      <h4 className="font-semibold text-neutral-900 mb-3">
                        Image
                      </h4>
                      <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                        <img
                          src={task.data_to_annotate.data_url}
                          alt="Annotation data"
                          className="max-w-full h-auto rounded"
                        />
                      </div>
                    </div>
                  )}

                {/* Video */}
                {task.data_to_annotate?.data_type === 'video' &&
                  task.data_to_annotate?.data_url && (
                    <div>
                      <h4 className="font-semibold text-neutral-900 mb-3">
                        Video
                      </h4>
                      <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                        <video
                          src={task.data_to_annotate.data_url}
                          controls
                          className="max-w-full h-auto rounded"
                        />
                      </div>
                    </div>
                  )}

                {/* Audio */}
                {task.data_to_annotate?.data_type === 'audio' &&
                  task.data_to_annotate?.data_url && (
                    <div>
                      <h4 className="font-semibold text-neutral-900 mb-3">
                        Audio
                      </h4>
                      <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                        <audio
                          src={task.data_to_annotate.data_url}
                          controls
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}

                {/* Document */}
                {task.data_to_annotate?.data_type === 'document' &&
                  task.data_to_annotate?.data_url && (
                    <div>
                      <h4 className="font-semibold text-neutral-900 mb-3">
                        Document
                      </h4>
                      <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                        <a
                          href={task.data_to_annotate.data_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-600 hover:text-brand-700 break-all"
                        >
                          View Document
                        </a>
                      </div>
                    </div>
                  )}

                {/* Fallback for legacy interview data */}
                {!task.data_to_annotate?.data_type &&
                  task.data_to_annotate?.transcript && (
                    <div>
                      <h4 className="font-semibold text-neutral-900 mb-3">
                        Transcript
                      </h4>
                      <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 max-h-64 overflow-y-auto">
                        <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">
                          {Array.isArray(task.data_to_annotate.transcript)
                            ? task.data_to_annotate.transcript
                                .map((t) => `${t.speaker}: ${t.text}`)
                                .join('\n\n')
                            : task.data_to_annotate.transcript}
                        </p>
                      </div>
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>

          {/* Annotation Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quality Rating */}
              <div>
                <label className="block text-sm font-semibold text-neutral-900 mb-4">
                  Creative Rating *
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      onClick={() => setRating(i)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-10 h-10 ${
                          i <= rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-neutral-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-sm text-neutral-600">
                  {rating > 0 && (
                    <p>
                      Rating: <span className="font-semibold">{rating}/5</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Feedback Notes */}
              <div>
                <label className="block text-sm font-semibold text-neutral-900 mb-2">
                  Feedback Notes (Optional)
                </label>
                <Textarea
                  placeholder="Add any additional notes or observations..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="min-h-32"
                />
                <p className="text-xs text-neutral-500 mt-2">
                  Max 1000 characters
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  onClick={() => navigate('/candidate/annotation-tasks')}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setShowConfirm(true)}
                  disabled={submitting || rating === 0}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 text-white"
                >
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Confirmation Dialog */}
          <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Submit Your Feedback?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to submit your feedback? You cannot
                  change it after submission.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="bg-neutral-50 p-4 rounded-lg mb-4">
                <div className="flex gap-2 mb-2">
                  <span className="text-sm font-semibold text-neutral-700">
                    Rating:
                  </span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i <= rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-neutral-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {feedback && (
                  <div>
                    <p className="text-xs text-neutral-600 mb-1">Feedback:</p>
                    <p className="text-sm text-neutral-700">{feedback}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleSubmit}
                  className="bg-brand-500 hover:bg-brand-600"
                >
                  Confirm Submit
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
    </div>
  )
}
