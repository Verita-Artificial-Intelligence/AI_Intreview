import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Check, Mic, Volume2, Video, Monitor, AlertCircle, Play } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const InterviewPrep = () => {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cameraPermission, setCameraPermission] = useState(false);
  const [micPermission, setMicPermission] = useState(false);
  const [testingMic, setTestingMic] = useState(false);
  const [testingSpeaker, setTestingSpeaker] = useState(false);
  const [interviewType, setInterviewType] = useState(location.state?.interviewType || 'text');
  
  const videoRef = useRef(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    fetchInterview();
    
    // Cleanup camera stream on unmount
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [interviewId]);

  const fetchInterview = async () => {
    try {
      const response = await axios.get(`${API}/interviews/${interviewId}`);
      setInterview(response.data);
    } catch (error) {
      console.error('Error fetching interview:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure video plays after stream is set
        try {
          await videoRef.current.play();
        } catch (playError) {
          console.log('Auto-play prevented, waiting for user interaction');
        }
      }
      setCameraPermission(true);
    } catch (error) {
      console.error('Camera permission denied:', error);
      alert('Camera permission is required for video interviews. Please allow camera access in your browser settings.');
    }
  };

  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission(true);
      // Stop the stream after permission check
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Microphone permission denied:', error);
      alert('Microphone permission is required. Please allow microphone access in your browser settings.');
    }
  };

  const testMicrophone = async () => {
    setTestingMic(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      source.connect(analyser);
      
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        setTestingMic(false);
        alert('Microphone test completed successfully!');
      }, 2000);
    } catch (error) {
      setTestingMic(false);
      alert('Microphone test failed. Please check your microphone.');
    }
  };

  const testSpeakers = () => {
    setTestingSpeaker(true);
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzGH0fPTgjMGHm7A7+OZXRIMO5Xx8LBZGwc+jNn0y4A2BSlxy/Daizsff');
    audio.play();
    setTimeout(() => setTestingSpeaker(false), 2000);
  };

  const startInterview = () => {
    if (interviewType === 'audio') {
      navigate(`/audio-interview/${interviewId}`);
    } else {
      navigate(`/interview/${interviewId}`);
    }
  };

  const applicationSteps = [
    { name: 'Application Submitted', completed: true },
    { name: 'AI Interview', completed: false, current: true },
    { name: 'Final Review', completed: false },
    { name: 'Decision', completed: false }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Interview not found</p>
      </div>
    );
  }

  const allPermissionsGranted = cameraPermission && micPermission;

  return (
    <div className="min-h-screen" style={{ background: '#fafafa' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
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
            onClick={() => navigate('/marketplace')}
            variant="outline"
            size="sm"
            className="rounded-lg"
          >
            View listing
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Progress */}
          <div className="lg:col-span-1">
            <Card className="p-6 bg-white rounded-xl border-0 shadow-md">
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-1" style={{ color: '#2c3e50' }}>
                  Interview with {interview.candidate_name}
                </h3>
                <p className="text-sm text-gray-600">{interview.position}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm font-medium text-gray-700">25%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="h-2 rounded-full" style={{ width: '25%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}></div>
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
                      <p className={`text-sm font-medium ${step.completed || step.current ? 'text-gray-900' : 'text-gray-500'}`}>
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
            <Card className="p-6 bg-white rounded-xl border-0 shadow-md">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2" style={{ color: '#2c3e50' }}>
                    {interviewType === 'audio' ? '🎙️ Voice Interview' : '💬 AI Interview'}
                  </h2>
                  <p className="text-gray-600">
                    {interviewType === 'audio' 
                      ? 'Conduct a voice-based interview with AI'
                      : 'Have a conversation with our AI interviewer'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Estimated time</p>
                  <p className="text-2xl font-bold" style={{ color: '#667eea' }}>~25 min</p>
                </div>
              </div>
            </Card>

            {/* Camera/Video Setup */}
            <Card className="p-6 bg-white rounded-xl border-0 shadow-md">
              <h3 className="text-lg font-bold mb-4" style={{ color: '#2c3e50' }}>Camera Setup</h3>
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
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
                    <p className="text-xl font-semibold mb-2">Camera permission required</p>
                    <p className="text-sm mb-4 opacity-75 max-w-md text-center px-4">Enable camera access to verify your setup before the interview</p>
                    <Button
                      onClick={requestCameraPermission}
                      data-testid="enable-camera-button"
                      className="rounded-lg font-medium"
                      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                    >
                      Enable Camera
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Audio Setup */}
            <Card className="p-6 bg-white rounded-xl border-0 shadow-md">
              <h3 className="text-lg font-bold mb-4" style={{ color: '#2c3e50' }}>Audio Setup</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mic className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">Microphone</p>
                      <p className="text-sm text-gray-600">Default Microphone</p>
                    </div>
                  </div>
                  <Button
                    onClick={micPermission ? testMicrophone : requestMicPermission}
                    variant="outline"
                    size="sm"
                    disabled={testingMic}
                    className="rounded-lg"
                  >
                    {testingMic ? 'Testing...' : micPermission ? 'Test mic' : 'Enable'}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">Speakers</p>
                      <p className="text-sm text-gray-600">Default Speakers</p>
                    </div>
                  </div>
                  <Button
                    onClick={testSpeakers}
                    variant="outline"
                    size="sm"
                    disabled={testingSpeaker}
                    className="rounded-lg"
                  >
                    {testingSpeaker ? 'Playing...' : 'Play test sound'}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Things to Know */}
            <Card className="p-6 bg-white rounded-xl border-0 shadow-md">
              <h3 className="text-lg font-bold mb-4" style={{ color: '#2c3e50' }}>Things to know before starting</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Expect to spend ~25 minutes</p>
                    <p className="text-sm text-gray-600">Take your time and provide thoughtful responses</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Need assistance? Just ask</p>
                    <p className="text-sm text-gray-600">The AI interviewer can help clarify questions</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Your data is in your control</p>
                    <p className="text-sm text-gray-600">Responses are used only to assess your candidacy and are never used to train AI models</p>
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
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : '#ccc',
                  cursor: allPermissionsGranted ? 'pointer' : 'not-allowed'
                }}
              >
                {allPermissionsGranted ? 'Start Interview' : 'Complete Setup First'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewPrep;
