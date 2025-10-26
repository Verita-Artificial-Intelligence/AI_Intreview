import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/contexts/AuthContext'
import { v4 as uuidv4 } from 'uuid'
import {
  Upload,
  CheckCircle2,
  Circle,
  FileText,
  ArrowLeft,
  ArrowRight,
  Video,
  CheckCircle,
  Loader2,
} from 'lucide-react'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API = `${BACKEND_URL}/api`

export default function JobApplicationOnboarding() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { user, token } = useAuth()

  const jobId = searchParams.get('jobId')

  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [profileData, setProfileData] = useState(null)
  const [job, setJob] = useState(null)

  const [formData, setFormData] = useState({
    // Step 1: Resume
    resume: null,
    resumeFileName: '',
    resumeUrl: '',

    // Step 2: Work Authorization
    workAuthorization: '',
    citizenship: '',

    // Step 3: Availability
    agreeToAvailability: false,
  })

  // Equipment check state
  const videoRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [micReady, setMicReady] = useState(false)
  const [requestingPermissions, setRequestingPermissions] = useState(false)

  // Determine which steps are needed
  const [stepsNeeded, setStepsNeeded] = useState([])

  useEffect(() => {
    fetchProfileAndJob()

    // Cleanup camera stream on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  useEffect(() => {
    if (profileData && job) {
      determineStepsNeeded()
    }
  }, [profileData, job])

  // Auto-request permissions when reaching equipment check step
  useEffect(() => {
    const currentStepData = stepsNeeded[currentStep - 1]
    if (currentStepData?.field === 'equipment' && !stream) {
      console.log(
        '[Equipment Check] Auto-requesting permissions for equipment step'
      )
      requestMediaPermissions()
    }
  }, [currentStep, stepsNeeded])

  const fetchProfileAndJob = async () => {
    try {
      const [profileRes, jobRes] = await Promise.all([
        axios.get(`${API}/profile/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API}/jobs/${jobId}`),
      ])

      setProfileData(profileRes.data)
      setJob(jobRes.data)

      // Pre-fill existing data
      setFormData((prev) => ({
        ...prev,
        resumeUrl: profileRes.data.resume_url || '',
        resumeFileName: profileRes.data.resume_url ? 'Existing Resume' : '',
        workAuthorization: profileRes.data.work_authorization || '',
        citizenship: profileRes.data.citizenship || '',
        agreeToAvailability: true, // Availability is always required but default to true
      }))
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load profile or job data')
    }
  }

  const determineStepsNeeded = () => {
    const steps = []

    // Always add resume step - mark as completed if exists
    steps.push({
      id: steps.length + 1,
      title: 'Upload Resume',
      description: 'Your professional background',
      field: 'resume',
      completed: !!profileData?.resume_url,
    })

    // Add work authorization if needed
    if (!profileData?.work_authorization) {
      steps.push({
        id: steps.length + 1,
        title: 'Work Authorization',
        description: 'Legal status',
        field: 'work_authorization',
        completed: false,
      })
    }

    // Always add availability step to confirm for each job
    steps.push({
      id: steps.length + 1,
      title: 'Availability',
      description: 'Confirm your availability',
      field: 'availability',
      completed: false,
    })

    // Always add equipment check as final step
    steps.push({
      id: steps.length + 1,
      title: 'Equipment Check',
      description: 'Camera & microphone setup',
      field: 'equipment',
      completed: false,
    })

    setStepsNeeded(steps)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError('')

    try {
      // Upload resume file to get file URL
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const uploadResponse = await axios.post(
        `${API}/files/upload`,
        uploadFormData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      if (uploadResponse.data.url) {
        setFormData((prev) => ({
          ...prev,
          resume: file,
          resumeFileName: file.name,
          resumeUrl: uploadResponse.data.url,
        }))
      } else {
        setError('Failed to upload resume')
      }
    } catch (error) {
      console.error('Error uploading resume:', error)
      setError('Failed to upload resume. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleNext = async () => {
    setError('')

    const currentStepData = stepsNeeded[currentStep - 1]

    // Validation - only validate if we need new data
    if (currentStepData.field === 'resume') {
      // Resume is valid if we have an existing URL OR a new upload
      if (!formData.resumeUrl && !formData.resume) {
        setError('Please upload your resume')
        return
      }
    }

    if (currentStepData.field === 'work_authorization') {
      if (!formData.workAuthorization) {
        setError('Please select work authorization status')
        return
      }
    }

    if (currentStepData.field === 'availability') {
      if (!formData.agreeToAvailability) {
        setError('Please confirm your availability')
        return
      }
    }

    if (currentStepData.field === 'equipment') {
      if (!cameraReady || !micReady) {
        setError('Please ensure your camera and microphone are working')
        return
      }
    }

    if (currentStep < stepsNeeded.length) {
      // Save profile data before equipment check
      if (currentStepData.field === 'availability') {
        try {
          await handleSubmit()
        } catch (err) {
          // Error already set in handleSubmit
          return
        }
      }
      setCurrentStep(currentStep + 1)
    } else {
      // Start the interview
      await handleStartInterview()
    }
  }

  const handleBack = () => {
    setError('')
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else {
      navigate('/')
    }
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)

      // Build complete profile data preserving ALL existing fields
      const completeProfileData = {
        // Required fields - always include from existing profile
        name: profileData.name,
        bio: profileData.bio || 'Creative professional',
        expertise: profileData.expertise || [],

        // Optional fields - preserve existing values
        position: profileData.position || undefined,
        skills: profileData.skills || undefined,
        experience_years: profileData.experience_years || undefined,
        education: profileData.education || undefined,
        work_experience: profileData.work_experience || undefined,
        projects: profileData.projects || undefined,
        publications: profileData.publications || undefined,
        certifications: profileData.certifications || undefined,

        // Resume - use new value if uploaded, otherwise keep existing
        resume_url: formData.resumeUrl || profileData.resume_url || undefined,

        // Work authorization - use new value if provided, otherwise keep existing
        work_authorization:
          formData.workAuthorization ||
          profileData.work_authorization ||
          undefined,
        citizenship:
          formData.citizenship || profileData.citizenship || undefined,
      }

      // Update profile with complete data
      await axios.put(`${API}/profile/complete`, completeProfileData, {
        headers: { Authorization: `Bearer ${token}` },
      })

      // Note: We don't create the interview here
      // The interview will be created by the RealtimeInterview component via WebSocket
      // when the user actually starts the interview (after equipment check)
      // The availability confirmation is implied by the user progressing to the interview
      console.log(
        'Profile updated successfully - availability confirmed by user progression'
      )

      setError('')
    } catch (err) {
      console.error('Error updating profile:', err)

      let errorMessage = 'Failed to update profile'

      if (err.response?.data) {
        const data = err.response.data
        if (Array.isArray(data.detail)) {
          const errors = data.detail
            .map((e) => e.msg || 'Validation error')
            .join(', ')
          errorMessage = `Validation error: ${errors}`
        } else if (typeof data.detail === 'string') {
          errorMessage = data.detail
        } else if (data.message) {
          errorMessage = data.message
        }
      } else if (err.message) {
        errorMessage = err.message
      }

      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const requestMediaPermissions = async () => {
    console.log('[Equipment Check] Requesting media permissions...')
    setRequestingPermissions(true)
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      console.log('[Equipment Check] Media stream obtained:', mediaStream)
      console.log(
        '[Equipment Check] Video tracks:',
        mediaStream.getVideoTracks()
      )
      console.log(
        '[Equipment Check] Audio tracks:',
        mediaStream.getAudioTracks()
      )

      setStream(mediaStream)

      if (videoRef.current) {
        console.log('[Equipment Check] Setting srcObject on videoRef')
        videoRef.current.srcObject = mediaStream
      } else {
        console.warn('[Equipment Check] videoRef.current is null!')
      }

      setCameraReady(true)
      setMicReady(true)
      setError('')
      console.log('[Equipment Check] Camera and mic marked as ready')
    } catch (err) {
      console.error('[Equipment Check] Media access error:', err)
      setError(
        'Unable to access camera/microphone. Please allow permissions and try again.'
      )
    } finally {
      setRequestingPermissions(false)
    }
  }

  const handleStartInterview = async () => {
    // Check for existing interview - only block if truly active/completed
    if (jobId && user?.id) {
      try {
        const response = await axios.get(`${API}/interviews`, {
          params: { job_id: jobId, candidate_id: user.id },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })

        // Only block if interview is truly in progress or completed
        // 'not_started' is okay - that's from availability confirmation
        const hasActiveOrCompletedInterview = response.data.some((interview) =>
          ['in_progress', 'completed', 'under_review', 'approved'].includes(
            interview.status
          )
        )

        if (hasActiveOrCompletedInterview) {
          setError(
            'You have already completed this interview. Visit your status page for updates.'
          )
          return
        }
      } catch (checkError) {
        console.error('Error checking existing interview:', checkError)
        setError(
          'Unable to verify your application status. Please refresh and try again.'
        )
        return
      }
    }

    // Clean up stream
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
    }

    // Generate new interview ID and navigate
    const interviewId = uuidv4()
    const url = jobId
      ? `/realtime-interview/${interviewId}?jobId=${jobId}`
      : `/realtime-interview/${interviewId}`
    navigate(url)
  }

  const progressPercent = stepsNeeded.length
    ? (currentStep / stepsNeeded.length) * 100
    : 0

  if (!profileData || !job || stepsNeeded.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <p className="text-neutral-600">Loading...</p>
      </div>
    )
  }

  const currentStepData = stepsNeeded[currentStep - 1]

  return (
    <div className="flex min-h-screen bg-neutral-50 flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-neutral-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <img
            src="/images/verita_ai_logo.jpeg"
            alt="Verita AI"
            className="w-8 h-8 rounded-md flex-shrink-0 object-cover"
          />
          <div>
            <h2 className="text-base font-display font-bold text-neutral-900">
              Complete Your Application
            </h2>
            <p className="text-xs text-neutral-600">
              for {job?.title || 'this position'}
            </p>
          </div>
        </div>
        {/* Mobile Progress */}
        <div>
          <div className="h-1 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <p className="text-xs text-neutral-600 mt-2 font-medium">
            Step {currentStep} of {stepsNeeded.length}:{' '}
            {stepsNeeded[currentStep - 1]?.title}
          </p>
        </div>
      </div>

      {/* Left Sidebar - Progress (Desktop only) */}
      <div className="hidden lg:flex lg:w-80 bg-white border-r border-neutral-200 p-8 flex-col">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <img
              src="/images/verita_ai_logo.jpeg"
              alt="Verita AI"
              className="w-10 h-10 rounded-md flex-shrink-0 object-cover"
            />
            <div>
              <h2 className="text-xl font-display font-bold text-neutral-900">
                Verita AI
              </h2>
            </div>
          </div>
          <h3 className="text-lg font-bold text-neutral-900 mb-1">
            Complete Your Application
          </h3>
          <p className="text-xs text-neutral-600">
            for {job?.title || 'this position'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-1 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <p className="text-xs text-neutral-600 mt-2 font-medium">
            {currentStep} of {stepsNeeded.length} complete
          </p>
        </div>

        {/* Steps */}
        <nav className="flex-1 space-y-2">
          {stepsNeeded.map((step, index) => {
            const isCompleted = step.completed || currentStep > step.id
            const isCurrent = currentStep === step.id
            const stepNumber = index + 1

            return (
              <button
                key={step.id}
                onClick={() => {
                  if (stepNumber < currentStep) {
                    setCurrentStep(stepNumber)
                  }
                }}
                disabled={stepNumber > currentStep}
                className={`w-full text-left p-4 rounded-lg transition-all ${
                  isCurrent
                    ? 'bg-blue-50 border border-blue-200 cursor-default'
                    : stepNumber < currentStep
                      ? 'bg-neutral-50 hover:bg-neutral-100 cursor-pointer'
                      : 'bg-neutral-50 cursor-default opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {isCompleted && !isCurrent ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle
                        className={`w-5 h-5 ${
                          isCurrent ? 'text-blue-500' : 'text-neutral-400'
                        }`}
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        isCurrent ? 'text-neutral-900' : 'text-neutral-700'
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-neutral-600 mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </nav>

        {/* Back to Marketplace */}
        <div className="mt-8 pt-6 border-t border-neutral-200">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            size="sm"
            className="w-full rounded-lg"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketplace
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
          {/* Step Content */}
          {currentStepData.field === 'resume' && (
            <StepResume
              formData={formData}
              handleFileUpload={handleFileUpload}
              loading={loading}
            />
          )}

          {currentStepData.field === 'work_authorization' && (
            <StepAuthorization
              formData={formData}
              handleInputChange={handleInputChange}
            />
          )}

          {currentStepData.field === 'availability' && (
            <StepAvailability
              formData={formData}
              setFormData={setFormData}
              job={job}
            />
          )}

          {currentStepData.field === 'equipment' && (
            <StepEquipment
              videoRef={videoRef}
              cameraReady={cameraReady}
              micReady={micReady}
              requestingPermissions={requestingPermissions}
              stream={stream}
              job={job}
            />
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8">
            <Button
              onClick={handleBack}
              variant="outline"
              className="border-neutral-300 font-semibold w-full sm:w-auto"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={
                loading ||
                (currentStepData.field === 'equipment' &&
                  (!cameraReady || !micReady))
              }
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold w-full sm:w-auto"
            >
              {loading
                ? 'Saving...'
                : currentStep === stepsNeeded.length
                  ? 'Start Interview'
                  : 'Next'}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepResume({ formData, handleFileUpload, loading }) {
  const hasExistingResume = formData.resumeUrl && !formData.resume

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">
          Upload Resume
        </h2>
        <p className="text-sm text-neutral-600">
          Your resume helps us understand your background and qualifications
        </p>
      </div>

      <Card className="p-6 border border-neutral-200">
        {hasExistingResume && (
          <div className="mb-4 p-4  border-2 border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-green-900 text-sm">
                Resume already on file
              </p>
              <p className="text-xs text-green-700">
                You can upload a new one below to replace it
              </p>
            </div>
          </div>
        )}

        <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
          <input
            type="file"
            id="resume-upload"
            accept=".pdf,.doc,.docx"
            onChange={handleFileUpload}
            disabled={loading}
            className="hidden"
          />
          <label htmlFor="resume-upload" className="cursor-pointer block">
            <Upload className="w-10 h-10 mx-auto mb-3 text-neutral-400" />
            <p className="text-base font-semibold text-neutral-900 mb-1">
              {formData.resume
                ? formData.resumeFileName
                : hasExistingResume
                  ? 'Click to upload a new resume'
                  : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-neutral-600">
              PDF, DOC, or DOCX (Max 10MB)
            </p>
          </label>
        </div>

        {formData.resume && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-900 text-sm">
                {formData.resumeFileName}
              </p>
              <p className="text-xs text-blue-700">
                New resume ready to upload
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

function StepAuthorization({ formData, handleInputChange }) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">
          Work Authorization
        </h2>
        <p className="text-sm text-neutral-600">
          Confirm your legal ability to work
        </p>
      </div>

      <Card className="p-6 border border-neutral-200 space-y-6">
        <div>
          <label className="block text-xs font-semibold text-neutral-600 tracking-wide mb-4">
            WORK AUTHORIZATION STATUS *
          </label>
          <div className="space-y-3">
            {[
              { value: 'citizen', label: 'Citizen/Permanent Resident' },
              { value: 'work_visa', label: 'Work visa/permit' },
              { value: 'need_sponsorship', label: 'Need sponsorship' },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="radio"
                  name="workAuthorization"
                  value={option.value}
                  checked={formData.workAuthorization === option.value}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm font-medium text-neutral-900">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-600 tracking-wide mb-2">
            CITIZENSHIP COUNTRY (Optional)
          </label>
          <Input
            name="citizenship"
            value={formData.citizenship}
            onChange={handleInputChange}
            className="text-sm border-neutral-300"
            placeholder="United States"
          />
        </div>

        <div className="p-4 border-2 border-blue-100 rounded-lg">
          <p className="text-sm text-blue-400">
            Your work authorization status helps us match you with opportunities
            you're eligible for.
          </p>
        </div>
      </Card>
    </div>
  )
}

function StepAvailability({ formData, setFormData, job }) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">
          Confirm Availability
        </h2>
        <p className="text-sm text-neutral-600">
          Review and confirm your availability for this position
        </p>
      </div>

      <Card className="p-6 border border-neutral-200 space-y-6">
        {/* Availability Requirement */}
        <div>
          <h4 className="text-sm font-semibold text-neutral-900 mb-3">
            Availability Requirement
          </h4>
          <p className="text-sm text-neutral-700 mb-4">
            {job.availability ||
              `Remote-friendly (US time zones); Geography restricted to US, UK, Canada. Expected commitment aligns with ${job.position_type} schedule.`}
          </p>
        </div>

        {/* Confirmation Checkbox */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Checkbox
            id="availability-agree"
            checked={formData.agreeToAvailability}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, agreeToAvailability: checked }))
            }
            className="mt-1"
          />
          <label
            htmlFor="availability-agree"
            className="text-sm text-neutral-900 cursor-pointer"
          >
            I confirm that I am available to work according to the requirements
            stated above and can commit to the expected schedule for this{' '}
            {job.position_type} position.
          </label>
        </div>
      </Card>
    </div>
  )
}

function StepEquipment({
  videoRef,
  cameraReady,
  micReady,
  requestingPermissions,
  stream,
  job,
}) {
  // CRITICAL: Attach stream to video element when component mounts
  useEffect(() => {
    console.log('[StepEquipment] Component mounted/updated')
    console.log('[StepEquipment] videoRef.current:', videoRef.current)
    console.log('[StepEquipment] stream:', stream)
    console.log('[StepEquipment] cameraReady:', cameraReady)
    console.log('[StepEquipment] micReady:', micReady)
    console.log('[StepEquipment] requestingPermissions:', requestingPermissions)

    // Attach the stream if it exists and video ref exists
    if (videoRef.current && stream) {
      console.log('[StepEquipment] Attaching stream to video element')
      videoRef.current.srcObject = stream

      // Log if the video element has the stream
      console.log(
        '[StepEquipment] Video srcObject after setting:',
        videoRef.current.srcObject
      )
    }
  }, [stream, cameraReady, micReady, requestingPermissions])

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">
          Equipment Check
        </h2>
        <p className="text-sm text-neutral-600">
          Make sure your camera and microphone are working before starting
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr,1fr] gap-6">
        {/* Left Column - Camera Preview */}
        <div>
          <div className="bg-white border border-neutral-200 overflow-hidden rounded-lg">
            <div className="aspect-video bg-neutral-900 relative">
              {requestingPermissions ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
                    <p className="text-white/90 text-sm">
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
                    <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Camera preview</p>
                  </div>
                </div>
              )}
            </div>

            {/* Status Row */}
            <div className="px-5 py-4 bg-neutral-50 border-t border-neutral-200">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  {cameraReady ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-neutral-300" />
                  )}
                  <span
                    className={`text-sm font-medium ${cameraReady ? 'text-neutral-900' : 'text-neutral-500'}`}
                  >
                    Camera working
                  </span>
                </div>
                <div className="w-px h-4 bg-neutral-300" />
                <div className="flex items-center gap-2">
                  {micReady ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-neutral-300" />
                  )}
                  <span
                    className={`text-sm font-medium ${micReady ? 'text-neutral-900' : 'text-neutral-500'}`}
                  >
                    Microphone working
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - What to Expect */}
        <div>
          <Card className="p-5 border border-neutral-200">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">
              What to Expect
            </h3>
            <div className="space-y-2.5 mb-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center mt-0.5">
                  <span className="text-white text-xs font-bold">1</span>
                </div>
                <div>
                  <p className="text-neutral-900 font-medium text-sm mb-0.5">
                    20-30 minute conversation
                  </p>
                  <p className="text-neutral-600 text-xs leading-relaxed">
                    Deep dive into your projects and creative experience
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center mt-0.5">
                  <span className="text-white text-xs font-bold">2</span>
                </div>
                <div>
                  <p className="text-neutral-900 font-medium text-sm mb-0.5">
                    Express your creative vision
                  </p>
                  <p className="text-neutral-600 text-xs leading-relaxed">
                    Be authentic about your artistic style and approach
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center mt-0.5">
                  <span className="text-white text-xs font-bold">3</span>
                </div>
                <div>
                  <p className="text-neutral-900 font-medium text-sm mb-0.5">
                    AI assessment
                  </p>
                  <p className="text-neutral-600 text-xs leading-relaxed">
                    Your responses evaluated to match with creative roles
                  </p>
                </div>
              </div>
            </div>

            {/* Tips for Success */}
            <div className="pt-3 border-t border-neutral-200">
              <h4 className="text-sm font-semibold text-neutral-900 mb-2">
                Tips for Success
              </h4>
              <ul className="space-y-1.5">
                <li className="flex items-start gap-2 text-xs text-neutral-700">
                  <span className="text-brand-500 mt-0.5">•</span>
                  <span>
                    Set up in good lighting with a professional background
                  </span>
                </li>
                <li className="flex items-start gap-2 text-xs text-neutral-700">
                  <span className="text-brand-500 mt-0.5">•</span>
                  <span>Have your portfolio accessible to reference</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-neutral-700">
                  <span className="text-brand-500 mt-0.5">•</span>
                  <span>Speak naturally about your creative process</span>
                </li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
