import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  CheckCircle,
  Mic,
  Video,
  AlertCircle,
  Loader2,
  Briefcase,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { v4 as uuidv4 } from 'uuid'
import api from '@/utils/api'

const NewInterviewPrep = () => {
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const [searchParams] = useSearchParams()
  const jobId = searchParams.get('jobId')
  const videoRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [micReady, setMicReady] = useState(false)
  const [error, setError] = useState('')
  const [requestingPermissions, setRequestingPermissions] = useState(false)
  const [job, setJob] = useState(null)
  const [loadingJob, setLoadingJob] = useState(false)

  // Extract first name from full name
  const firstName = user?.name?.split(' ')[0] || ''

  // Fetch job details if jobId is present
  useEffect(() => {
    if (jobId) {
      fetchJob()
    }
  }, [jobId])

  // Auto-request permissions on mount
  useEffect(() => {
    requestMediaPermissions()

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const fetchJob = async () => {
    setLoadingJob(true)
    try {
      const response = await api.get(`/jobs/${jobId}`)
      setJob(response.data)
    } catch (error) {
      console.error('Error fetching job:', error)
    } finally {
      setLoadingJob(false)
    }
  }

  const requestMediaPermissions = async () => {
    setRequestingPermissions(true)
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setCameraReady(true)
      setMicReady(true)
      setError('')
    } catch (err) {
      setError(
        'Unable to access camera/microphone. Please allow permissions and refresh the page.'
      )
      console.error('Media access error:', err)
    } finally {
      setRequestingPermissions(false)
    }
  }

  const handleStartInterview = async () => {
    if (jobId && user?.id) {
      try {
        const response = await api.get(`/interviews`, {
          params: { job_id: jobId, candidate_id: user.id },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })

        const hasActiveOrCompletedInterview = response.data.some((interview) =>
          ['in_progress', 'completed', 'under_review', 'approved'].includes(
            interview.status
          )
        )

        if (hasActiveOrCompletedInterview) {
          setError(
            'You have already completed this interview. Visit your status page for updates instead of reapplying.'
          )
          return
        }
      } catch (checkError) {
        console.error('Error checking existing interview:', checkError)
        setError(
          'Unable to verify your application status right now. Please refresh and try again.'
        )
        return
      }
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
    }
    setError('')
    // Always generate a NEW interview ID for each job application
    // This ensures each job has its own separate interview record
    const interviewId = uuidv4()
    // Pass jobId as query parameter if available
    const url = jobId
      ? `/realtime-interview/${interviewId}?jobId=${jobId}`
      : `/realtime-interview/${interviewId}`
    navigate(url)
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Job Info Banner */}
      {job && (
        <div className="bg-brand-50 border-b border-brand-200">
          <div className="max-w-3xl mx-auto px-6 py-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-brand-500 text-white">
                <Briefcase className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h2 className="font-display font-semibold text-base text-neutral-900 mb-0.5">
                  {job.title}
                </h2>
                <p className="text-sm text-neutral-700 mb-1">
                  {job.position_type}
                </p>
                <p className="text-xs text-neutral-600 line-clamp-2">
                  {job.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <h1 className="text-2xl font-display font-bold text-neutral-900 mb-1">
            Let's get you set up{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="text-base text-neutral-600">
            Make sure your setup's ready, then we'll begin
          </p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="max-w-3xl mx-auto px-6 py-6">
        <div className="grid lg:grid-cols-[1.2fr,1fr] gap-10">
          {/* Left Column - Technical Setup */}
          <div className="space-y-3">
            <h2 className="text-lg font-display font-semibold text-neutral-900">
              Equipment Check
            </h2>

            {/* Camera Preview */}
            <div className="bg-white border border-neutral-200 overflow-hidden">
              <div className="aspect-video bg-neutral-900 relative">
                {requestingPermissions ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
                      <p className="text-white/90 text-xs">
                        Requesting camera access...
                      </p>
                    </div>
                  </div>
                ) : cameraReady ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-neutral-400">
                      <Video className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">Camera preview</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Compact Status Row */}
              <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-200">
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-1.5">
                    {cameraReady ? (
                      <CheckCircle className="w-3 h-3 text-green-600" />
                    ) : (
                      <div className="w-3 h-3 rounded-full border-2 border-neutral-300" />
                    )}
                    <span
                      className={`text-xs ${cameraReady ? 'text-neutral-900' : 'text-neutral-500'}`}
                    >
                      Camera working
                    </span>
                  </div>
                  <div className="w-px h-3 bg-neutral-300" />
                  <div className="flex items-center gap-1.5">
                    {micReady ? (
                      <CheckCircle className="w-3 h-3 text-green-600" />
                    ) : (
                      <div className="w-3 h-3 rounded-full border-2 border-neutral-300" />
                    )}
                    <span
                      className={`text-xs ${micReady ? 'text-neutral-900' : 'text-neutral-500'}`}
                    >
                      Mic working
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-red-700 mb-0.5">{error}</p>
                  <p className="text-[10px] text-red-600">
                    Need help? Contact{' '}
                    <a
                      href="mailto:info@verita-ai.com"
                      className="underline font-medium"
                    >
                      info@verita-ai.com
                    </a>
                  </p>
                </div>
              </div>
            )}

            {/* Start Button */}
            <Button
              onClick={handleStartInterview}
              disabled={!cameraReady || !micReady}
              className="w-full h-8 text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-md"
            >
              {cameraReady && micReady
                ? 'Start Interview'
                : 'Checking equipment...'}
            </Button>
          </div>

          {/* Right Column - Content */}
          <div className="space-y-5">
            {/* What to Expect */}
            <div>
              <h2 className="text-lg font-display font-semibold text-neutral-900 mb-3">
                What to Expect
              </h2>
              <div className="space-y-2.5">
                <div className="flex gap-2">
                  <div className="flex-shrink-0 w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center mt-0.5">
                    <span className="text-white text-[10px] font-bold">1</span>
                  </div>
                  <div>
                    <p className="text-neutral-900 font-medium text-sm mb-0.5">
                      Discuss your creative portfolio
                    </p>
                    <p className="text-neutral-600 text-xs leading-relaxed">
                      Share your best work, creative process, and
                      design/creative approach
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="flex-shrink-0 w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center mt-0.5">
                    <span className="text-white text-[10px] font-bold">2</span>
                  </div>
                  <div>
                    <p className="text-neutral-900 font-medium text-sm mb-0.5">
                      20-30 minute conversation
                    </p>
                    <p className="text-neutral-600 text-xs leading-relaxed">
                      Deep dive into your projects, inspiration, and creative
                      experience
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="flex-shrink-0 w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center mt-0.5">
                    <span className="text-white text-[10px] font-bold">3</span>
                  </div>
                  <div>
                    <p className="text-neutral-900 font-medium text-sm mb-0.5">
                      Express your creative vision
                    </p>
                    <p className="text-neutral-600 text-xs leading-relaxed">
                      Be authentic about your artistic style and the projects
                      you're proud of
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="flex-shrink-0 w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center mt-0.5">
                    <span className="text-white text-[10px] font-bold">4</span>
                  </div>
                  <div>
                    <p className="text-neutral-900 font-medium text-sm mb-0.5">
                      AI assessment
                    </p>
                    <p className="text-neutral-600 text-xs leading-relaxed">
                      Your work and responses evaluated to match with creative
                      roles
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips - Clean text block */}
            <div className="pt-4 border-t border-neutral-200">
              <h3 className="text-sm font-semibold text-neutral-900 mb-2.5">
                Tips for Success
              </h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-brand-500 text-xs mt-0.5">•</span>
                  <p className="text-xs text-neutral-700 leading-relaxed">
                    Set up in good lighting with a professional background
                  </p>
                </div>
                <div className="w-full h-px bg-neutral-200" />
                <div className="flex items-start gap-2">
                  <span className="text-brand-500 text-xs mt-0.5">•</span>
                  <p className="text-xs text-neutral-700 leading-relaxed">
                    Have your portfolio or key projects accessible to reference
                  </p>
                </div>
                <div className="w-full h-px bg-neutral-200" />
                <div className="flex items-start gap-2">
                  <span className="text-brand-500 text-xs mt-0.5">•</span>
                  <p className="text-xs text-neutral-700 leading-relaxed">
                    Speak naturally about your creative process and inspiration
                  </p>
                </div>
                <div className="w-full h-px bg-neutral-200" />
                <div className="flex items-start gap-2">
                  <span className="text-brand-500 text-xs mt-0.5">•</span>
                  <p className="text-xs text-neutral-700 leading-relaxed">
                    Share the design tools and software you specialize in
                  </p>
                </div>
                <div className="w-full h-px bg-neutral-200" />
                <div className="flex items-start gap-2">
                  <span className="text-brand-500 text-xs mt-0.5">•</span>
                  <p className="text-xs text-neutral-700 leading-relaxed">
                    Let your passion and authentic creative vision shine through
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NewInterviewPrep
