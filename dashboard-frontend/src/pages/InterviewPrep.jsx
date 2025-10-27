import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import api from '@/utils/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Mic,
  Volume2,
  Video,
  AlertCircle,
  Upload,
  FileText,
  CheckCircle,
  X,
  GraduationCap,
  User,
} from 'lucide-react'
import {
  pageHeader,
  containers,
  cardStyles,
  cssGradients,
} from '@/lib/design-system'

const InterviewPrep = () => {
  const { interviewId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [interview, setInterview] = useState(null)
  const [candidate, setCandidate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1)

  // Step 1: Education & Background
  const [education, setEducation] = useState('')
  const [savingEducation, setSavingEducation] = useState(false)

  // Step 2/3: Camera & Audio
  const [cameraPermission, setCameraPermission] = useState(false)
  const [micPermission, setMicPermission] = useState(false)
  const [testingMic, setTestingMic] = useState(false)
  const [testingSpeaker, setTestingSpeaker] = useState(false)
  const [interviewType, setInterviewType] = useState(
    location.state?.interviewType || 'text'
  )
  const [audioDevices, setAudioDevices] = useState({
    speakers: [],
    microphones: [],
  })
  const [selectedSpeaker, setSelectedSpeaker] = useState('default')
  const [selectedMicrophone, setSelectedMicrophone] = useState('default')

  // Resume upload state (Step 2 for resume_based)
  const [resumeUploaded, setResumeUploaded] = useState(false)
  const [uploadingResume, setUploadingResume] = useState(false)
  const [resumeError, setResumeError] = useState('')
  const [resumeFile, setResumeFile] = useState(null)

  const videoRef = useRef(null)
  const audioContextRef = useRef(null)

  useEffect(() => {
    fetchInterview()
    loadAudioDevices()

    // Cleanup camera stream on unmount
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks()
        tracks.forEach((track) => track.stop())
      }
    }
  }, [interviewId])

  const loadAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const speakers = devices.filter((device) => device.kind === 'audiooutput')
      const microphones = devices.filter(
        (device) => device.kind === 'audioinput'
      )

      setAudioDevices({
        speakers:
          speakers.length > 0
            ? speakers
            : [{ deviceId: 'default', label: 'Default Speakers' }],
        microphones:
          microphones.length > 0
            ? microphones
            : [{ deviceId: 'default', label: 'Default Microphone' }],
      })

      if (speakers.length > 0) {
        setSelectedSpeaker(speakers[0].deviceId)
      }
      if (microphones.length > 0) {
        setSelectedMicrophone(microphones[0].deviceId)
      }
    } catch (error) {
      console.error('Error loading audio devices:', error)
      setAudioDevices({
        speakers: [{ deviceId: 'default', label: 'Default Speakers' }],
        microphones: [{ deviceId: 'default', label: 'Default Microphone' }],
      })
    }
  }

  const fetchInterview = async () => {
    try {
      const response = await api.get(`/interviews/${interviewId}`)
      setInterview(response.data)

      // Fetch candidate data
      const candidateResponse = await api.get(
        `/candidates/${response.data.candidate_id}`
      )
      setCandidate(candidateResponse.data)
      setEducation(candidateResponse.data.education || '')

      // Check if resume already uploaded
      if (response.data.resume_text) {
        setResumeUploaded(true)
      }
    } catch (error) {
      console.error('Error fetching interview:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveEducation = async () => {
    if (!candidate) return

    setSavingEducation(true)
    try {
      await api.patch(`/candidates/${candidate.id}/education`, {
        education: education,
      })

      // Move to next step
      nextStep()
    } catch (error) {
      console.error('Error saving education:', error)
      alert('Failed to save education information. Please try again.')
    } finally {
      setSavingEducation(false)
    }
  }

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        try {
          await videoRef.current.play()
        } catch (playError) {
          console.log('Auto-play prevented, waiting for user interaction')
        }
      }
      setCameraPermission(true)
    } catch (error) {
      console.error('Camera permission denied:', error)
      alert(
        'Camera permission is required for video interviews. Please allow camera access in your browser settings.'
      )
    }
  }

  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setMicPermission(true)
      stream.getTracks().forEach((track) => track.stop())
    } catch (error) {
      console.error('Microphone permission denied:', error)
      alert(
        'Microphone permission is required. Please allow microphone access in your browser settings.'
      )
    }
  }

  const testMicrophone = async () => {
    setTestingMic(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      const analyser = audioContextRef.current.createAnalyser()
      source.connect(analyser)

      setTimeout(() => {
        stream.getTracks().forEach((track) => track.stop())
        setTestingMic(false)
        alert('Microphone test completed successfully!')
      }, 2000)
    } catch (error) {
      setTestingMic(false)
      alert('Microphone test failed. Please check your microphone.')
    }
  }

  const testSpeakers = async () => {
    setTestingSpeaker(true)
    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 440
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1)
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1.9)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 2)

      setTimeout(() => {
        setTestingSpeaker(false)
        audioContext.close()
      }, 2000)
    } catch (error) {
      console.error('Error testing speakers:', error)
      setTestingSpeaker(false)
      alert('Unable to test speakers. Please check your audio output device.')
    }
  }

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setResumeFile(file)
    setUploadingResume(true)
    setResumeError('')

    try {
      const formData = new FormData()
      formData.append('resume', file)

      const uploadResponse = await api.post(
        '/interviews/upload/resume',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      )

      if (uploadResponse.data.success) {
        const resumeText = uploadResponse.data.resume_text

        const updateResponse = await api.patch(
          `/interviews/${interviewId}/resume`,
          {
            resume_text: resumeText,
          }
        )

        if (updateResponse.data.success) {
          setResumeUploaded(true)
          setResumeError('')
        } else {
          setResumeError(updateResponse.data.error || 'Failed to save resume')
          setResumeFile(null)
        }
      } else {
        setResumeError(
          uploadResponse.data.error || 'Failed to extract text from resume'
        )
        setResumeFile(null)
      }
    } catch (error) {
      console.error('Error uploading resume:', error)
      setResumeError('Failed to upload resume. Please try again.')
      setResumeFile(null)
    } finally {
      setUploadingResume(false)
    }
  }

  const removeResume = () => {
    setResumeFile(null)
    setResumeUploaded(false)
    setResumeError('')
  }

  const startInterview = () => {
    if (interviewType === 'audio') {
      navigate(`/audio-interview/${interviewId}`)
    } else {
      navigate(`/interview/${interviewId}`)
    }
  }

  const isResumeBasedInterview = interview?.interview_type === 'resume_based'

  // Determine total steps based on interview type
  const getTotalSteps = () => {
    return isResumeBasedInterview ? 4 : 3
  }

  const nextStep = () => {
    const totalSteps = getTotalSteps()

    // Skip resume step if not resume_based interview
    if (step === 1 && !isResumeBasedInterview) {
      setStep(3) // Skip to camera/audio setup
    } else if (step < totalSteps) {
      setStep(step + 1)
    }
  }

  const previousStep = () => {
    // Skip resume step when going back if not resume_based
    if (step === 3 && !isResumeBasedInterview) {
      setStep(1)
    } else if (step > 1) {
      setStep(step - 1)
    }
  }

  const canProceedFromStep = () => {
    if (step === 1) return education.trim().length > 0
    if (step === 2 && isResumeBasedInterview) return resumeUploaded
    if (step === 3 || (step === 2 && !isResumeBasedInterview))
      return cameraPermission && micPermission
    return true
  }

  // Get current step number for display (accounts for skipped steps)
  const getDisplayStep = () => {
    if (!isResumeBasedInterview && step >= 3) {
      return step - 1
    }
    return step
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-600">Loading...</p>
      </div>
    )
  }

  if (!interview || !candidate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-600">Interview not found</p>
      </div>
    )
  }

  const totalSteps = getTotalSteps()
  const displayStep = getDisplayStep()

  return (
    <div className="flex min-h-screen bg-background">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className={pageHeader.wrapper}>
          <div className={`${containers.lg} ${pageHeader.container}`}>
            <Button
              onClick={() => navigate('/candidate/portal')}
              variant="outline"
              size="sm"
              className="rounded-lg"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go back
            </Button>
          </div>
        </div>

        <div className={`${containers.lg} mx-auto px-6 py-8`}>
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between max-w-3xl mx-auto">
              <div className="flex-1">
                <div className="flex items-center">
                  {Array.from({ length: totalSteps }).map((_, index) => {
                    const stepNum = index + 1
                    const isCompleted = step > stepNum
                    const isCurrent = step === stepNum
                    const isLast = stepNum === totalSteps

                    return (
                      <div key={stepNum} className="flex items-center flex-1">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                              isCompleted
                                ? 'bg-brand-500 text-white'
                                : isCurrent
                                  ? 'bg-brand-500 text-white ring-4 ring-brand-100'
                                  : 'bg-neutral-200 text-neutral-500'
                            }`}
                          >
                            {isCompleted ? (
                              <Check className="w-5 h-5" />
                            ) : (
                              stepNum
                            )}
                          </div>
                          <p
                            className={`text-xs mt-2 font-medium ${isCurrent ? 'text-brand-600' : 'text-neutral-500'}`}
                          >
                            {stepNum === 1 && 'Background'}
                            {stepNum === 2 &&
                              isResumeBasedInterview &&
                              'Resume'}
                            {stepNum === 2 &&
                              !isResumeBasedInterview &&
                              'Setup'}
                            {stepNum === 3 && isResumeBasedInterview && 'Setup'}
                            {stepNum === 3 &&
                              !isResumeBasedInterview &&
                              'Ready'}
                            {stepNum === 4 && 'Ready'}
                          </p>
                        </div>
                        {!isLast && (
                          <div
                            className={`flex-1 h-1 mx-4 rounded ${isCompleted ? 'bg-brand-500' : 'bg-neutral-200'}`}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="max-w-3xl mx-auto">
            {/* Step 1: Education & Background */}
            {step === 1 && (
              <Card className={`p-8 ${cardStyles.default}`}>
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-brand-100 rounded-lg">
                      <GraduationCap className="w-6 h-6 text-brand-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-neutral-900">
                      Tell us about your background
                    </h2>
                  </div>
                  <p className="text-neutral-600 ml-14">
                    Help us understand your educational background and
                    experience
                  </p>
                </div>

                <div className="space-y-6 ml-14">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Candidate Name
                    </label>
                    <Input
                      value={candidate.name}
                      disabled
                      className="bg-neutral-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Position
                    </label>
                    <Input
                      value={candidate.position}
                      disabled
                      className="bg-neutral-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Education
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <Textarea
                      value={education}
                      onChange={(e) => setEducation(e.target.value)}
                      placeholder="e.g., Bachelor's in Computer Science from Stanford University, Master's in Design from RISD..."
                      rows={4}
                      className="resize-none"
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      Include your degrees, certifications, and relevant
                      coursework
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-8 ml-14">
                  <Button
                    onClick={handleSaveEducation}
                    disabled={!canProceedFromStep() || savingEducation}
                    className="rounded-lg px-8"
                    style={{
                      background: canProceedFromStep()
                        ? cssGradients.purple
                        : '#ccc',
                    }}
                  >
                    {savingEducation ? 'Saving...' : 'Next'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </Card>
            )}

            {/* Step 2: Resume Upload (only for resume_based) */}
            {step === 2 && isResumeBasedInterview && (
              <Card className={`p-8 ${cardStyles.default}`}>
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-brand-100 rounded-lg">
                      <FileText className="w-6 h-6 text-brand-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-neutral-900">
                      Upload Your Resume
                    </h2>
                  </div>
                  <p className="text-neutral-600 ml-14">
                    Your resume helps the AI ask relevant questions about your
                    experience
                  </p>
                </div>

                <div className="ml-14">
                  {resumeUploaded ? (
                    <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-8 h-8 text-green-600" />
                          <div>
                            <p className="font-semibold text-green-900 text-lg">
                              Resume uploaded successfully!
                            </p>
                            <p className="text-sm text-green-700 mt-1">
                              {resumeFile?.name ||
                                'Your resume has been processed'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={removeResume}
                          className="text-green-600 hover:text-green-800 transition-colors"
                          title="Remove and upload different resume"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-blue-900">
                              Resume Required
                            </p>
                            <p className="text-sm text-blue-700 mt-1">
                              This interview is based on your portfolio and
                              experience. Please upload your resume.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border-2 border-dashed border-neutral-300 rounded-lg p-12 text-center hover:border-brand-400 transition-colors">
                        <input
                          type="file"
                          id="resume-upload"
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={handleResumeUpload}
                          disabled={uploadingResume}
                          className="hidden"
                        />
                        <label
                          htmlFor="resume-upload"
                          className={`cursor-pointer ${uploadingResume ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <Upload className="w-16 h-16 mx-auto mb-4 text-neutral-400" />
                          <p className="font-semibold text-lg text-neutral-900 mb-2">
                            {uploadingResume
                              ? 'Processing resume...'
                              : 'Click to upload your resume'}
                          </p>
                          <p className="text-sm text-neutral-600">
                            Supports PDF, DOC, DOCX, and TXT files
                          </p>
                        </label>
                      </div>

                      {resumeError && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-700">{resumeError}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between gap-3 mt-8">
                    <Button
                      onClick={previousStep}
                      variant="outline"
                      className="rounded-lg px-6"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={nextStep}
                      disabled={!canProceedFromStep()}
                      className="rounded-lg px-8"
                      style={{
                        background: canProceedFromStep()
                          ? cssGradients.purple
                          : '#ccc',
                      }}
                    >
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Step 3 (or 2 for non-resume): Camera & Audio Setup */}
            {(step === 3 || (step === 2 && !isResumeBasedInterview)) && (
              <div className="space-y-6">
                <Card className={`p-6 ${cardStyles.default}`}>
                  <h3 className="text-lg font-bold mb-4 text-neutral-900 flex items-center gap-2">
                    <Video className="w-5 h-5" />
                    Camera Setup
                  </h3>
                  <div
                    className="relative bg-black rounded-lg overflow-hidden"
                    style={{ aspectRatio: '16/9' }}
                  >
                    {cameraPermission ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                        <Video className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-xl font-semibold mb-2">
                          Camera permission required
                        </p>
                        <p className="text-sm mb-4 opacity-75 max-w-md text-center px-4">
                          Enable camera access to verify your setup
                        </p>
                        <Button
                          onClick={requestCameraPermission}
                          className="rounded-lg font-medium"
                          style={{ background: cssGradients.purple }}
                        >
                          Enable Camera
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>

                <Card className={`p-6 ${cardStyles.default}`}>
                  <h3 className="text-lg font-bold mb-4 text-neutral-900 flex items-center gap-2">
                    <Mic className="w-5 h-5" />
                    Audio Setup
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-neutral-50 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <Mic className="w-5 h-5 text-neutral-600" />
                        <p className="font-medium text-neutral-900">
                          Microphone
                        </p>
                      </div>
                      <select
                        value={selectedMicrophone}
                        onChange={(e) => setSelectedMicrophone(e.target.value)}
                        className="w-full mb-3 p-2 border border-neutral-300 rounded-lg text-sm"
                      >
                        {audioDevices.microphones.map((mic) => (
                          <option key={mic.deviceId} value={mic.deviceId}>
                            {mic.label ||
                              'Microphone ' + mic.deviceId.slice(0, 8)}
                          </option>
                        ))}
                      </select>
                      <Button
                        onClick={
                          micPermission ? testMicrophone : requestMicPermission
                        }
                        variant="outline"
                        size="sm"
                        disabled={testingMic}
                        className="rounded-lg w-full"
                      >
                        {testingMic
                          ? 'Testing...'
                          : micPermission
                            ? 'Test Microphone'
                            : 'Enable Microphone'}
                      </Button>
                    </div>

                    <div className="p-4 bg-neutral-50 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <Volume2 className="w-5 h-5 text-neutral-600" />
                        <p className="font-medium text-neutral-900">Speakers</p>
                      </div>
                      <select
                        value={selectedSpeaker}
                        onChange={(e) => setSelectedSpeaker(e.target.value)}
                        className="w-full mb-3 p-2 border border-neutral-300 rounded-lg text-sm"
                      >
                        {audioDevices.speakers.map((speaker) => (
                          <option
                            key={speaker.deviceId}
                            value={speaker.deviceId}
                          >
                            {speaker.label ||
                              'Speaker ' + speaker.deviceId.slice(0, 8)}
                          </option>
                        ))}
                      </select>
                      <Button
                        onClick={testSpeakers}
                        variant="outline"
                        size="sm"
                        disabled={testingSpeaker}
                        className="rounded-lg w-full"
                      >
                        {testingSpeaker
                          ? 'Playing test tone...'
                          : 'Play Test Sound'}
                      </Button>
                    </div>
                  </div>
                </Card>

                <div className="flex justify-between gap-3">
                  <Button
                    onClick={previousStep}
                    variant="outline"
                    className="rounded-lg px-6"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={nextStep}
                    disabled={!canProceedFromStep()}
                    className="rounded-lg px-8"
                    style={{
                      background: canProceedFromStep()
                        ? cssGradients.purple
                        : '#ccc',
                    }}
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4 (or 3 for non-resume): Ready to Start */}
            {(step === 4 || (step === 3 && !isResumeBasedInterview)) && (
              <Card className={`p-8 ${cardStyles.default}`}>
                <div className="text-center mb-8">
                  <div className="inline-flex p-4 bg-green-100 rounded-full mb-4">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-neutral-900 mb-2">
                    You're all set!
                  </h2>
                  <p className="text-neutral-600">
                    Ready to begin your interview with{' '}
                    {interview.candidate_name}
                  </p>
                </div>

                <div className="bg-neutral-50 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold text-neutral-900 mb-4">
                    Interview Details
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Position:</span>
                      <span className="font-medium text-neutral-900">
                        {interview.position}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Type:</span>
                      <span className="font-medium text-neutral-900">
                        {interviewType === 'audio'
                          ? 'Voice Interview'
                          : 'AI Interview'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Duration:</span>
                      <span className="font-medium text-neutral-900">
                        ~25 minutes
                      </span>
                    </div>
                    {isResumeBasedInterview && (
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Resume:</span>
                        <span className="font-medium text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Uploaded
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <Card className="p-6 bg-blue-50 border border-blue-200 mb-6">
                  <h3 className="font-semibold text-blue-900 mb-3">
                    Things to remember
                  </h3>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li className="flex gap-2">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      Take your time and provide thoughtful responses
                    </li>
                    <li className="flex gap-2">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      The AI interviewer can help clarify questions if needed
                    </li>
                    <li className="flex gap-2">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      Your responses are confidential and never used to train AI
                      models
                    </li>
                  </ul>
                </Card>

                <div className="flex justify-between gap-3">
                  <Button
                    onClick={previousStep}
                    variant="outline"
                    className="rounded-lg px-6"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={startInterview}
                    className="rounded-lg px-8 font-semibold"
                    style={{ background: cssGradients.purple }}
                  >
                    Start Interview
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default InterviewPrep
