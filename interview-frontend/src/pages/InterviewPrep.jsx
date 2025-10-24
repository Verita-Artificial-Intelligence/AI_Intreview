import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  ArrowLeft,
  Check,
  Mic,
  Volume2,
  Video,
  AlertCircle,
} from 'lucide-react'
import {
  pageHeader,
  containers,
  cardStyles,
  cssGradients,
} from '@/lib/design-system'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API = `${BACKEND_URL}/api`

const InterviewPrep = () => {
  const { interviewId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [interview, setInterview] = useState(null)
  const [loading, setLoading] = useState(true)
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

      // Set default selections
      if (speakers.length > 0) {
        setSelectedSpeaker(speakers[0].deviceId)
      }
      if (microphones.length > 0) {
        setSelectedMicrophone(microphones[0].deviceId)
      }
    } catch (error) {
      console.error('Error loading audio devices:', error)
      // Fallback to default
      setAudioDevices({
        speakers: [{ deviceId: 'default', label: 'Default Speakers' }],
        microphones: [{ deviceId: 'default', label: 'Default Microphone' }],
      })
    }
  }

  const fetchInterview = async () => {
    try {
      const response = await axios.get(`${API}/interviews/${interviewId}`)
      setInterview(response.data)
    } catch (error) {
      console.error('Error fetching interview:', error)
    } finally {
      setLoading(false)
    }
  }

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // Ensure video plays after stream is set
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
      // Stop the stream after permission check
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
      // Create a proper test tone using Web Audio API
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Create a pleasant test tone (middle C = 261.63 Hz)
      oscillator.frequency.value = 440 // A4 note
      oscillator.type = 'sine'

      // Fade in and out
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

  const startInterview = () => {
    if (interviewType === 'audio') {
      navigate(`/audio-interview/${interviewId}`)
    } else {
      navigate(`/interview/${interviewId}`)
    }
  }

  const applicationSteps = [
    { name: 'Application Submitted', completed: true },
    { name: 'AI Interview', completed: false, current: true },
    { name: 'Final Review', completed: false },
    { name: 'Decision', completed: false },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-600">Loading...</p>
      </div>
    )
  }

  if (!interview) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-600">Interview not found</p>
      </div>
    )
  }

  const allPermissionsGranted = cameraPermission && micPermission

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className={pageHeader.wrapper}>
        <div className={`${containers.lg} ${pageHeader.container}`}>
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            size="sm"
            className="rounded-lg"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go back
          </Button>
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            size="sm"
            className="rounded-lg"
          >
            View listing
          </Button>
        </div>
      </div>

      <div className={`${containers.lg} mx-auto px-6 py-8`}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Progress */}
          <div className="lg:col-span-1">
            <Card className={`p-6 ${cardStyles.default}`}>
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-1 text-neutral-900">
                  Interview with {interview.candidate_name}
                </h3>
                <p className="text-sm text-neutral-600">{interview.position}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-700">
                    Progress
                  </span>
                  <span className="text-sm font-medium text-neutral-700">
                    25%
                  </span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600"
                    style={{ width: '25%' }}
                  ></div>
                </div>
              </div>

              <div className="space-y-3">
                {applicationSteps.map((step, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      step.current ? 'bg-blue-50 border border-blue-200' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        step.completed
                          ? 'bg-green-500'
                          : step.current
                            ? 'bg-blue-500'
                            : 'bg-gray-300'
                      }`}
                    >
                      {step.completed ? (
                        <Check className="w-4 h-4 text-white" />
                      ) : (
                        <span className="text-white text-sm">{index + 1}</span>
                      )}
                    </div>
                    <div>
                      <p
                        className={`text-sm font-medium ${step.completed || step.current ? 'text-neutral-900' : 'text-neutral-500'}`}
                      >
                        {step.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Middle Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Interview Details */}
            <Card className={`p-6 ${cardStyles.default}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2 text-neutral-900">
                    {interviewType === 'audio'
                      ? '🎙️ Voice Interview'
                      : '💬 AI Interview'}
                  </h2>
                  <p className="text-neutral-600">
                    {interviewType === 'audio'
                      ? 'Conduct a voice-based interview with AI'
                      : 'Have a conversation with our AI interviewer'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-neutral-600">Estimated time</p>
                  <p className="text-2xl font-bold text-purple-500">~25 min</p>
                </div>
              </div>
            </Card>

            {/* Camera/Video Setup */}
            <Card className={`p-6 ${cardStyles.default}`}>
              <h3 className="text-lg font-bold mb-4 text-neutral-900">
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
                      Enable camera access to verify your setup before the
                      interview
                    </p>
                    <Button
                      onClick={requestCameraPermission}
                      data-testid="enable-camera-button"
                      className="rounded-lg font-medium"
                      style={{ background: cssGradients.purple }}
                    >
                      Enable Camera
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Audio Setup */}
            <Card className={`p-6 ${cardStyles.default}`}>
              <h3 className="text-lg font-bold mb-4 text-neutral-900">
                Audio Setup
              </h3>
              <div className="space-y-4">
                {/* Microphone Selection */}
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Mic className="w-5 h-5 text-neutral-600" />
                    <p className="font-medium text-neutral-900">Microphone</p>
                  </div>
                  <select
                    value={selectedMicrophone}
                    onChange={(e) => setSelectedMicrophone(e.target.value)}
                    className="w-full mb-3 p-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="microphone-select"
                  >
                    {audioDevices.microphones.map((mic) => (
                      <option key={mic.deviceId} value={mic.deviceId}>
                        {mic.label || 'Microphone ' + mic.deviceId.slice(0, 8)}
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
                    data-testid="test-microphone-button"
                  >
                    {testingMic
                      ? 'Testing...'
                      : micPermission
                        ? 'Test Microphone'
                        : 'Enable Microphone'}
                  </Button>
                </div>

                {/* Speaker Selection */}
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Volume2 className="w-5 h-5 text-neutral-600" />
                    <p className="font-medium text-neutral-900">Speakers</p>
                  </div>
                  <select
                    value={selectedSpeaker}
                    onChange={(e) => setSelectedSpeaker(e.target.value)}
                    className="w-full mb-3 p-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="speaker-select"
                  >
                    {audioDevices.speakers.map((speaker) => (
                      <option key={speaker.deviceId} value={speaker.deviceId}>
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
                    data-testid="test-speaker-button"
                  >
                    {testingSpeaker
                      ? 'Playing test tone...'
                      : 'Play Test Sound'}
                  </Button>
                  {testingSpeaker && (
                    <p className="text-xs text-neutral-600 mt-2 text-center">
                      🔊 You should hear a tone through your selected speakers
                    </p>
                  )}
                </div>
              </div>
            </Card>

            {/* Things to Know */}
            <Card className={`p-6 ${cardStyles.default}`}>
              <h3 className="text-lg font-bold mb-4 text-neutral-900">
                Things to know before starting
              </h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-neutral-900">
                      Expect to spend ~25 minutes
                    </p>
                    <p className="text-sm text-neutral-600">
                      Take your time and provide thoughtful responses
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-neutral-900">
                      Need assistance? Just ask
                    </p>
                    <p className="text-sm text-neutral-600">
                      The AI interviewer can help clarify questions
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-neutral-900">
                      Your data is in your control
                    </p>
                    <p className="text-sm text-neutral-600">
                      Responses are used only to assess your candidacy and are
                      never used to train AI models
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Start Interview Button */}
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="rounded-lg px-8"
              >
                Cancel
              </Button>
              <Button
                onClick={startInterview}
                disabled={!allPermissionsGranted}
                data-testid="start-interview-button"
                className="rounded-lg px-8 font-medium"
                style={{
                  background: allPermissionsGranted
                    ? cssGradients.purple
                    : '#ccc',
                  cursor: allPermissionsGranted ? 'pointer' : 'not-allowed',
                }}
              >
                {allPermissionsGranted
                  ? 'Start Interview'
                  : 'Complete Setup First'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InterviewPrep
