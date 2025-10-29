import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api, { BACKEND_URL } from '@/utils/api'
import Sidebar from '@/components/Sidebar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeft,
  FileText,
  Image,
  Video,
  Music,
  File as FileIcon,
  Check,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function Annotate() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const [task, setTask] = useState(null)
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    fetchTask()
  }, [taskId])

  const fetchTask = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/annotations/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setTask(response.data)

      // Fetch job status
      const jobResponse = await api.get(`/jobs/${response.data.job_id}`)
      setJob(jobResponse.data)

      // Check if job is in correct status
      if (jobResponse.data.status === 'pending') {
        // Job is still pending, show message and redirect
        alert(
          'This task is not yet available. Tasks can only be started when the project enters the active phase.'
        )
        navigate('/jobs')
        return
      }

      if (
        jobResponse.data.status === 'completed' ||
        jobResponse.data.status === 'archived'
      ) {
        // Job has ended
        alert(
          `This project has ${jobResponse.data.status === 'completed' ? 'ended' : 'been archived'}.`
        )
        navigate('/jobs')
        return
      }

      // Mark as started if not already (job must be in_progress here)
      if (response.data.status === 'assigned') {
        await api.post(
          `/annotations/${taskId}/start`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
      }
    } catch (error) {
      console.error('Failed to fetch task:', error)
      if (error.response?.status === 400) {
        alert(error.response.data.detail || 'Cannot start this task')
      }
      navigate('/jobs')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Please provide a quality rating')
      return
    }

    if (!notes || notes.trim().length === 0) {
      alert('Please provide feedback notes')
      return
    }

    try {
      setSubmitting(true)
      await api.post(
        `/annotations/${taskId}/submit`,
        {
          quality_rating: rating,
          feedback_notes: notes,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      navigate('/jobs')
    } catch (error) {
      console.error('Failed to submit annotation:', error)
      alert('Failed to submit annotation')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-neutral-600">Loading your creative task...</p>
        </main>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-neutral-600">Task not found</p>
        </main>
      </div>
    )
  }

  const data = task.data_to_annotate || {}
  const dataType = data.data_type || 'unknown'

  const getDataIcon = () => {
    switch (dataType) {
      case 'text':
        return <FileText className="w-5 h-5" />
      case 'image':
        return <Image className="w-5 h-5" />
      case 'video':
        return <Video className="w-5 h-5" />
      case 'audio':
        return <Music className="w-5 h-5" />
      case 'document':
        return <FileIcon className="w-5 h-5" />
      default:
        return <FileIcon className="w-5 h-5" />
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-7xl mx-auto px-8 py-12">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <Button
                onClick={() => navigate('/jobs')}
                variant="outline"
                size="sm"
                className="border-neutral-300 hover:bg-neutral-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Jobs
              </Button>
              <Badge className="bg-yellow-100 text-yellow-800 font-medium px-3 py-1">
                In Progress
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-3">
                Creative Task
              </p>
              <h1 className="text-5xl font-bold text-neutral-900 tracking-tight leading-tight mb-3 truncate">
                {task?.task_name || 'Annotation Task'}
              </h1>
              {task?.task_description && (
                <p className="text-lg text-neutral-600 font-light leading-relaxed">
                  {task.task_description}
                </p>
              )}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Data Preview - 2/3 width */}
            <div className="lg:col-span-2 space-y-8">
              {/* Data Header */}
              <Card className="p-8 border border-neutral-200">
                <div className="flex items-start gap-6">
                  <div className="p-3 bg-blue-100 rounded-lg text-blue-600 flex-shrink-0">
                    {getDataIcon()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold text-neutral-900 mb-2 tracking-tight truncate">
                      {data.title || 'Creative Work'}
                    </h2>
                    {data.description && (
                      <p className="text-neutral-700 text-base leading-relaxed mb-3 font-light">
                        {data.description}
                      </p>
                    )}
                    <div className="inline-block">
                      <span className="text-sm font-medium text-neutral-600">
                        Type:
                      </span>
                      <span className="text-sm font-bold text-neutral-900 ml-2 capitalize">
                        {dataType}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Data Preview */}
              <Card className="p-8 border border-neutral-200">
                <h3 className="text-base font-bold text-neutral-900 mb-6 tracking-wide uppercase">
                  Content Preview
                </h3>

                {/* Text Data */}
                {dataType === 'text' && data.data_content?.text && (
                  <div className="bg-neutral-50 p-6 rounded-lg border border-neutral-200 max-h-96 overflow-y-auto">
                    <p className="text-neutral-700 whitespace-pre-wrap leading-relaxed font-mono text-sm">
                      {data.data_content.text}
                    </p>
                  </div>
                )}

                {/* Image Data */}
                {dataType === 'image' && data.data_url && (
                  <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                    <img
                      src={
                        data.data_url.startsWith('http')
                          ? data.data_url
                          : `${BACKEND_URL}${data.data_url}`
                      }
                      alt="Annotation data"
                      className="max-w-full h-auto rounded max-h-96 object-contain"
                      onError={(e) => {
                        console.error(
                          'Failed to load image from:',
                          data.data_url
                        )
                        console.error('Attempted URL:', e.target.src)
                        e.target.style.display = 'none'
                        const errorMsg = document.createElement('div')
                        errorMsg.className = 'text-center py-8'
                        errorMsg.innerHTML = `
                          <svg class="w-16 h-16 text-neutral-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p class="text-sm text-neutral-600 mb-1">Image not available</p>
                          <p class="text-xs text-neutral-500">File may have been moved or deleted</p>
                        `
                        e.target.parentElement.appendChild(errorMsg)
                      }}
                    />
                  </div>
                )}

                {/* Video Data */}
                {dataType === 'video' && data.data_url && (
                  <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                    <video
                      src={
                        data.data_url.startsWith('http')
                          ? data.data_url
                          : `${BACKEND_URL}${data.data_url}`
                      }
                      controls
                      className="max-w-full h-auto rounded max-h-96"
                    />
                  </div>
                )}

                {/* Audio Data */}
                {dataType === 'audio' && data.data_url && (
                  <div className="bg-neutral-50 p-6 rounded-lg border border-neutral-200">
                    <audio
                      src={
                        data.data_url.startsWith('http')
                          ? data.data_url
                          : `${BACKEND_URL}${data.data_url}`
                      }
                      controls
                      className="w-full"
                    />
                  </div>
                )}

                {/* Document Data */}
                {dataType === 'document' && data.data_url && (
                  <div className="bg-neutral-50 p-6 rounded-lg border border-neutral-200 text-center">
                    <FileIcon className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                    <a
                      href={
                        data.data_url.startsWith('http')
                          ? data.data_url
                          : `${BACKEND_URL}${data.data_url}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 font-medium break-all"
                    >
                      Open Document
                    </a>
                  </div>
                )}

                {/* Fallback for legacy data */}
                {!dataType && data.transcript && (
                  <div className="bg-neutral-50 p-6 rounded-lg border border-neutral-200 max-h-96 overflow-y-auto">
                    <p className="text-neutral-700 whitespace-pre-wrap leading-relaxed text-sm">
                      {Array.isArray(data.transcript)
                        ? data.transcript
                            .map((t) => `${t.speaker}: ${t.text}`)
                            .join('\n\n')
                        : data.transcript}
                    </p>
                  </div>
                )}
              </Card>
            </div>

            {/* Annotation Form - 1/3 width */}
            <div className="lg:col-span-1">
              <Card className="p-8 sticky top-8 space-y-8 bg-gradient-to-br from-white to-blue-50 border border-neutral-200">
                {/* Instructions */}
                <div className="pb-6 border-b border-neutral-200">
                  <h3 className="text-base font-bold text-neutral-900 mb-2 tracking-wide uppercase">
                    Instructions
                  </h3>
                  <p className="text-sm text-neutral-700 leading-relaxed">
                    {task?.instructions}
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-bold text-neutral-900 mb-1 tracking-wide uppercase">
                    Creative Rating
                  </h3>
                  <p className="text-sm text-neutral-600 mb-6 font-light">
                    Rate the creativity and execution of this work
                  </p>

                  {/* Slider Container */}
                  <div className="space-y-6">
                    <div className="relative px-2 py-3">
                      {/* Slider Track Background */}
                      <div className="absolute top-1/2 -translate-y-1/2 left-2 right-2 h-2 bg-gradient-to-r from-red-200 via-yellow-200 via-blue-200 to-green-200 rounded-full pointer-events-none" />

                      {/* Slider Input */}
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="1"
                        value={rating}
                        onChange={(e) => setRating(parseInt(e.target.value))}
                        className="relative w-full appearance-none bg-transparent cursor-pointer z-10"
                        style={{
                          WebkitAppearance: 'none',
                          height: '24px',
                        }}
                      />

                      {/* Custom Slider Styles */}
                      <style>{`
                        input[type="range"]::-webkit-slider-thumb {
                          appearance: none;
                          width: 24px;
                          height: 24px;
                          border-radius: 50%;
                          background: white;
                          border: 3px solid ${rating === 0 ? '#d1d5db' : rating <= 2 ? '#ef4444' : rating === 3 ? '#f59e0b' : rating === 4 ? '#3b82f6' : '#10b981'};
                          cursor: pointer;
                          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                          transition: all 0.2s;
                        }
                        input[type="range"]::-webkit-slider-thumb:hover {
                          transform: scale(1.15);
                          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
                        }
                        input[type="range"]::-moz-range-thumb {
                          width: 24px;
                          height: 24px;
                          border-radius: 50%;
                          background: white;
                          border: 3px solid ${rating === 0 ? '#d1d5db' : rating <= 2 ? '#ef4444' : rating === 3 ? '#f59e0b' : rating === 4 ? '#3b82f6' : '#10b981'};
                          cursor: pointer;
                          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                          transition: all 0.2s;
                        }
                        input[type="range"]::-moz-range-thumb:hover {
                          transform: scale(1.15);
                          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
                        }
                      `}</style>

                      {/* Value Markers */}
                      <div className="flex justify-between mt-3 px-1">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <button
                            key={i}
                            onClick={() => setRating(i)}
                            className={`text-xs font-medium transition-all ${
                              rating === i
                                ? 'text-neutral-900 scale-110'
                                : 'text-neutral-400 hover:text-neutral-600'
                            }`}
                          >
                            {i}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Rating Display */}
                    {rating > 0 && (
                      <div
                        className={`p-4 rounded-lg border-2 transition-all ${
                          rating <= 2
                            ? 'bg-red-50 border-red-200'
                            : rating === 3
                              ? 'bg-yellow-50 border-yellow-200'
                              : rating === 4
                                ? 'bg-blue-50 border-blue-200'
                                : 'bg-green-50 border-green-200'
                        }`}
                      >
                        <div className="flex items-baseline gap-2 mb-2">
                          <p
                            className={`text-3xl font-bold ${
                              rating <= 2
                                ? 'text-red-600'
                                : rating === 3
                                  ? 'text-yellow-600'
                                  : rating === 4
                                    ? 'text-blue-600'
                                    : 'text-green-600'
                            }`}
                          >
                            {rating}
                          </p>
                          <span className="text-xl text-neutral-400">/5</span>
                        </div>
                        <p
                          className={`text-sm font-medium ${
                            rating <= 2
                              ? 'text-red-700'
                              : rating === 3
                                ? 'text-yellow-700'
                                : rating === 4
                                  ? 'text-blue-700'
                                  : 'text-green-700'
                          }`}
                        >
                          {rating === 1 && 'Poor Quality'}
                          {rating === 2 && 'Needs Improvement'}
                          {rating === 3 && 'Good Foundation'}
                          {rating === 4 && 'Strong Execution'}
                          {rating === 5 && 'Exceptional Work'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-neutral-200 pt-8">
                  <h3 className="text-base font-bold text-neutral-900 mb-1 tracking-wide uppercase">
                    Feedback
                  </h3>
                  <p className="text-sm text-neutral-600 mb-3 font-light">
                    Share your thoughts and observations about this work
                  </p>
                  <Textarea
                    placeholder="Add any notes or observations about this content..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-32 resize-none"
                    required
                  />
                  <p className="text-xs text-neutral-500 mt-2">
                    Max 1000 characters
                  </p>
                </div>

                <div className="border-t border-neutral-200 pt-8 space-y-3">
                  <Button
                    onClick={() => setShowConfirm(true)}
                    disabled={
                      submitting ||
                      rating === 0 ||
                      !notes ||
                      notes.trim().length === 0
                    }
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 h-auto text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-5 h-5 mr-2" />
                    {submitting ? 'Submitting...' : 'Submit Feedback'}
                  </Button>
                  <Button
                    onClick={() => navigate('/jobs')}
                    variant="outline"
                    className="w-full border-neutral-300 font-medium py-3 h-auto text-base"
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Your Feedback?</AlertDialogTitle>
            <AlertDialogDescription>
              You're about to submit your creative feedback. You won't be able
              to edit it after submission.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="bg-neutral-50 p-4 rounded-lg my-4 space-y-3">
            <div>
              <span className="text-sm font-medium text-neutral-700 mb-2 block">
                Creative Rating:
              </span>
              <div
                className={`inline-flex items-baseline gap-2 px-4 py-2 rounded-lg ${
                  rating <= 2
                    ? 'bg-red-100'
                    : rating === 3
                      ? 'bg-yellow-100'
                      : rating === 4
                        ? 'bg-blue-100'
                        : 'bg-green-100'
                }`}
              >
                <p
                  className={`text-2xl font-bold ${
                    rating <= 2
                      ? 'text-red-600'
                      : rating === 3
                        ? 'text-yellow-600'
                        : rating === 4
                          ? 'text-blue-600'
                          : 'text-green-600'
                  }`}
                >
                  {rating}
                </p>
                <span className="text-lg text-neutral-400">/5</span>
                <span
                  className={`text-sm font-medium ml-2 ${
                    rating <= 2
                      ? 'text-red-700'
                      : rating === 3
                        ? 'text-yellow-700'
                        : rating === 4
                          ? 'text-blue-700'
                          : 'text-green-700'
                  }`}
                >
                  {rating === 1 && 'Poor Quality'}
                  {rating === 2 && 'Needs Improvement'}
                  {rating === 3 && 'Good Foundation'}
                  {rating === 4 && 'Strong Execution'}
                  {rating === 5 && 'Exceptional Work'}
                </span>
              </div>
            </div>
            {notes && (
              <div>
                <p className="text-xs text-neutral-600 mb-1">Your Notes:</p>
                <p className="text-sm text-neutral-700 whitespace-pre-wrap">
                  {notes}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmit}
              className="bg-blue-500 hover:bg-blue-600"
            >
              Submit Feedback
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
