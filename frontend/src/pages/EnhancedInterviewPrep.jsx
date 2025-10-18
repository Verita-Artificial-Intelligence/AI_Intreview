import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { ArrowLeft, Mic, Video, CheckCircle, Volume2, Sparkles } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const EnhancedInterviewPrep = () => {
  const { interviewId } = useParams();
  const navigate = useNavigate();

  // State
  const [step, setStep] = useState(0); // 0: welcome, 1: mic test, 2: camera check, 3: ready
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [micTested, setMicTested] = useState(false);
  const [cameraTested, setCameraTested] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    fetchInterview();
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

  const testMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      microphone.connect(analyser);
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      setIsRecording(true);

      const checkLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average);
        animationFrameRef.current = requestAnimationFrame(checkLevel);
      };
      checkLevel();

      // Auto-stop after 3 seconds
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        setIsRecording(false);
        setMicTested(true);
        setAudioLevel(0);
      }, 3000);
    } catch (error) {
      console.error('Microphone access denied:', error);
      alert('Please allow microphone access to continue');
    }
  };

  const enableCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraTested(true);
    } catch (error) {
      console.error('Camera access denied:', error);
      alert('Please allow camera access to continue');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleContinue = () => {
    if (step === 0) {
      setStep(1);
    } else if (step === 1 && micTested) {
      setStep(2);
    } else if (step === 2 && cameraTested) {
      setStep(3);
    } else if (step === 3 && agreedToTerms) {
      navigate(`/audio-interview/${interviewId}`);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      if (step === 2) stopCamera();
      setStep(step - 1);
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading interview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <div className="relative z-10">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 pb-12">
        <AnimatePresence mode="wait">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center min-h-[70vh]"
            >
              <div className="max-w-2xl text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Welcome to your AI Creative Interview
                </h1>
                <p className="text-lg text-gray-700 mb-8">
                  You'll be speaking with <strong>Elena Rivers</strong>, our Creative Talent Director.
                  This interview will focus on your artistic vision, creative process, and portfolio depth.
                </p>
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/50 mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Before starting the interview</h2>
                  <div className="text-left space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm flex-shrink-0">1</div>
                      <p className="text-gray-700">
                        Please note that your AI interview will be <strong>recorded and available</strong> in your profile.
                        Make sure you're in a professional setting for the interview.
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm flex-shrink-0">2</div>
                      <p className="text-gray-700">
                        This interview is <strong>proctored</strong>. Please stay on the same tab and don't use any external tools.
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm flex-shrink-0">3</div>
                      <p className="text-gray-700">
                        Feel free to <strong>ask clarifying questions</strong> throughout the interview.
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleContinue}
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-lg font-semibold rounded-full hover:from-purple-700 hover:to-blue-700 transition shadow-lg"
                >
                  Continue to setup
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 1: Mic Test */}
          {step === 1 && (
            <motion.div
              key="mic-test"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center min-h-[70vh]"
            >
              <div className="max-w-xl w-full">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Test your mic</h2>
                  <p className="text-gray-700">
                    Let's make sure your mic is working — please follow the steps below to test it.
                  </p>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-white/50">
                  <div className="flex flex-col items-center">
                    {/* Mic visualization */}
                    <div className="relative w-40 h-40 mb-6">
                      <div
                        className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center transition-all duration-100"
                        style={{
                          transform: `scale(${1 + (audioLevel / 255) * 0.3})`,
                          boxShadow: `0 0 ${40 + audioLevel}px rgba(124, 58, 237, ${0.3 + (audioLevel / 255) * 0.4})`
                        }}
                      >
                        <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center">
                          <span className="text-4xl font-bold text-gray-800">m.</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50 rounded-2xl p-4 w-full mb-6">
                      <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                        <Mic size={16} />
                        <span className="font-medium">System microphone</span>
                      </div>
                      <p className="text-xs text-gray-600">Default audio input device</p>
                    </div>

                    <div className="bg-blue-50 rounded-2xl p-6 w-full mb-6 text-center">
                      <p className="font-medium text-gray-900 mb-2">
                        {isRecording ? "Recording..." : "Click 'Speak' button and read the line below out loud."}
                      </p>
                      <p className="text-2xl font-semibold text-gray-800 mb-4">
                        Testing. Do you hear me {interview?.candidate_name?.split(' ')[0] || 'there'}?
                      </p>
                      {/* Audio level bars */}
                      {isRecording && (
                        <div className="flex items-center justify-center gap-1 h-12">
                          {Array.from({ length: 20 }).map((_, i) => (
                            <div
                              key={i}
                              className="w-1 bg-purple-500 rounded-full transition-all duration-75"
                              style={{
                                height: `${Math.max(4, Math.min(48, (audioLevel / 255) * 48 * (0.5 + Math.random() * 0.5)))}px`
                              }}
                            ></div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={!micTested ? testMicrophone : handleContinue}
                      disabled={isRecording}
                      className={`w-full py-3 rounded-full font-semibold text-white transition shadow-lg ${
                        micTested
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                          : isRecording
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600'
                      }`}
                    >
                      {micTested ? 'Continue' : isRecording ? 'Listening...' : 'Speak'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Camera Check */}
          {step === 2 && (
            <motion.div
              key="camera-check"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center min-h-[70vh]"
            >
              <div className="max-w-xl w-full">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Check your camera</h2>
                  <p className="text-gray-700">
                    Your camera will record the interview for assessment and proctoring.
                    Please be ready to appear on video in a professional setting.
                  </p>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-white/50">
                  <div className="flex flex-col items-center">
                    {/* Camera preview */}
                    <div className="w-full mb-6">
                      <div className="bg-purple-50 rounded-2xl p-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Video size={16} />
                          <span className="font-medium">System webcam</span>
                        </div>
                      </div>

                      <div className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-video">
                        {cameraTested ? (
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                            <Video className="w-16 h-16 mb-4 opacity-50" />
                            <p className="text-sm">Camera not enabled yet</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={cameraTested ? handleContinue : enableCamera}
                      className="w-full py-3 rounded-full font-semibold text-white transition shadow-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      {cameraTested ? 'Continue' : 'Enable Camera'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Ready to Start */}
          {step === 3 && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center min-h-[70vh]"
            >
              <div className="max-w-2xl w-full">
                <div className="text-center mb-8">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 via-purple-600 to-blue-500 flex items-center justify-center mx-auto mb-6 relative">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 animate-ping opacity-20"></div>
                    <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center relative z-10">
                      <span className="text-5xl font-bold text-gray-800">m.</span>
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Before starting the interview,</h2>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-white/50 mb-8">
                  <div className="space-y-4 text-left">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm flex-shrink-0 mt-0.5">1</div>
                      <p className="text-gray-700">
                        Please note that your AI interview will be <strong>recorded and available</strong> in your profile.
                        Make sure you're in a professional setting for the interview.
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm flex-shrink-0 mt-0.5">2</div>
                      <p className="text-gray-700">
                        This interview is <strong>proctored</strong>. Please stay on the same tab and don't use any external tools.
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm flex-shrink-0 mt-0.5">3</div>
                      <p className="text-gray-700">
                        Feel free to <strong>ask clarifying questions</strong> throughout the interview.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">
                        I agree to all <a href="#" className="text-purple-600 hover:text-purple-700 underline">terms & privacy policies</a>
                      </span>
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleContinue}
                  disabled={!agreedToTerms}
                  className={`w-full py-4 rounded-full font-semibold text-white text-lg transition shadow-lg ${
                    agreedToTerms
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  Sounds good, start interview
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EnhancedInterviewPrep;
