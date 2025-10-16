import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Mic, MicOff, Volume2, CheckCircle, Loader2, User } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AudioInterviewPage = () => {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  const [persona, setPersona] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completing, setCompleting] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(new Audio());
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchInterview();
    fetchMessages();
    fetchPersona();
  }, [interviewId]);

  const fetchPersona = async () => {
    try {
      const response = await axios.get(`${API}/audio/persona`);
      setPersona(response.data);
    } catch (error) {
      console.error('Error fetching persona:', error);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API}/interviews/${interviewId}/messages`);
      setMessages(response.data);
      
      // Auto-play the first AI message
      if (response.data.length > 0 && response.data[0].role === 'assistant') {
        playAudio(response.data[0].content);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const playAudio = async (text) => {
    try {
      setIsPlaying(true);
      const response = await axios.post(`${API}/audio/tts`, {
        text: text,
        voice_id: '21m00Tcm4TlvDq8ikWAM', // Default professional voice
        stability: 0.5,
        similarity_boost: 0.75
      });

      audioRef.current.src = response.data.audio_url;
      audioRef.current.onended = () => setIsPlaying(false);
      await audioRef.current.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudioResponse(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudioResponse = async (audioBlob) => {
    setIsProcessing(true);
    
    try {
      // Transcribe audio
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.webm');
      
      const sttResponse = await axios.post(`${API}/audio/stt`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const transcribedText = sttResponse.data.transcribed_text;

      // Add user message
      const userMsg = {
        id: Date.now().toString(),
        role: 'user',
        content: transcribedText,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMsg]);

      // Get AI response
      const chatResponse = await axios.post(`${API}/chat`, {
        interview_id: interviewId,
        message: transcribedText
      });

      // Add AI response
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: chatResponse.data.message,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMsg]);

      // Play AI response
      await playAudio(chatResponse.data.message);
    } catch (error) {
      console.error('Error processing audio:', error);
      alert('Failed to process audio');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteInterview = async () => {
    if (!window.confirm('Are you sure you want to complete this interview?')) return;
    
    setCompleting(true);
    try {
      await axios.post(`${API}/interviews/${interviewId}/complete`);
      alert('Interview completed successfully!');
      navigate('/');
    } catch (error) {
      console.error('Error completing interview:', error);
      alert('Failed to complete interview');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading interview...</p>
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

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#fafafa' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                size="sm"
                className="rounded-lg"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-4">
                {persona && (
                  <div className="flex items-center gap-3 pr-4 border-r border-gray-300">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                      {persona.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{persona.name}</p>
                      <p className="text-xs text-gray-600">{persona.title}</p>
                    </div>
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold" style={{ color: '#2c3e50' }}>
                    Voice Interview with {interview.candidate_name}
                  </h1>
                  <p className="text-sm text-gray-600">{interview.position}</p>
                </div>
              </div>
            </div>
            {interview.status !== 'completed' && (
              <Button
                onClick={handleCompleteInterview}
                data-testid="complete-interview-button"
                disabled={completing}
                className="rounded-lg font-medium"
                style={{ background: 'linear-gradient(135deg, #48dbfb 0%, #0abde3 100%)' }}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {completing ? 'Completing...' : 'Complete Interview'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={message.id || index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-5 py-3 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white'
                    : 'bg-white text-gray-800 shadow-md border border-gray-100'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-1">
                    <Volume2 className="w-4 h-4" style={{ color: '#667eea' }} />
                    <p className="text-xs font-medium" style={{ color: '#667eea' }}>AI Interviewer</p>
                  </div>
                )}
                {message.role === 'user' && (
                  <div className="flex items-center gap-2 mb-1">
                    <Mic className="w-4 h-4" />
                    <p className="text-xs font-medium">You</p>
                  </div>
                )}
                <p className="text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
                <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-white/70' : 'text-gray-500'}`}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Recording Controls */}
      {interview.status !== 'completed' && (
        <div className="bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-5xl mx-auto px-6 py-6">
            <Card className="p-6 bg-gradient-to-br from-gray-50 to-white border-0 shadow-lg">
              <div className="flex flex-col items-center gap-4">
                {isProcessing ? (
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin" style={{ color: '#667eea' }} />
                    <p className="text-lg font-medium" style={{ color: '#2c3e50' }}>Processing your response...</p>
                    <p className="text-sm text-gray-600">Transcribing and generating AI response</p>
                  </div>
                ) : isPlaying ? (
                  <div className="text-center">
                    <Volume2 className="w-12 h-12 mx-auto mb-3 animate-pulse" style={{ color: '#667eea' }} />
                    <p className="text-lg font-medium" style={{ color: '#2c3e50' }}>AI is speaking...</p>
                    <p className="text-sm text-gray-600">Please listen carefully</p>
                  </div>
                ) : (
                  <div className="text-center w-full">
                    <Button
                      onClick={isRecording ? stopRecording : startRecording}
                      data-testid={isRecording ? "stop-recording-button" : "start-recording-button"}
                      className={`w-32 h-32 rounded-full font-medium text-lg shadow-2xl ${
                        isRecording ? 'animate-pulse' : ''
                      }`}
                      style={{
                        background: isRecording 
                          ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)'
                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      }}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="w-12 h-12" />
                        </>
                      ) : (
                        <>
                          <Mic className="w-12 h-12" />
                        </>
                      )}
                    </Button>
                    <p className="text-lg font-semibold mt-4" style={{ color: '#2c3e50' }}>
                      {isRecording ? 'Tap to stop recording' : 'Tap to start speaking'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {isRecording ? 'Recording your answer...' : 'Press the button and answer the question'}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {interview.status === 'completed' && (
        <div className="bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-5xl mx-auto px-6 py-6 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: '#48dbfb' }} />
            <p className="text-lg font-semibold mb-2" style={{ color: '#2c3e50' }}>Interview Completed</p>
            <p className="text-gray-600">This voice interview has been completed.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioInterviewPage;
