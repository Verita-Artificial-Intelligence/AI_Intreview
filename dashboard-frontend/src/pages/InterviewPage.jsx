import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Send, ArrowLeft, CheckCircle } from 'lucide-react'
import { pageHeader, containers, cssGradients } from '@/lib/design-system'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API = `${BACKEND_URL}/api`

const InterviewPage = () => {
  const { interviewId } = useParams()
  const navigate = useNavigate()
  const [interview, setInterview] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [completing, setCompleting] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    fetchInterview()
    fetchMessages()
  }, [interviewId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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

  const fetchMessages = async () => {
    try {
      const response = await axios.get(
        `${API}/interviews/${interviewId}/messages`
      )
      setMessages(response.data)
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputMessage.trim() || sending) return

    const userMsg = inputMessage
    setInputMessage('')
    setSending(true)

    // Add user message optimistically
    const tempUserMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: userMsg,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      const response = await axios.post(`${API}/chat`, {
        interview_id: interviewId,
        message: userMsg,
      })

      // Add AI response
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleCompleteInterview = async () => {
    if (!window.confirm('Are you sure you want to complete this interview?'))
      return

    setCompleting(true)
    try {
      await axios.post(`${API}/interviews/${interviewId}/complete`)
      alert('Interview completed successfully!')
      navigate('/')
    } catch (error) {
      console.error('Error completing interview:', error)
      alert('Failed to complete interview')
    } finally {
      setCompleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-600">Loading interview...</p>
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className={pageHeader.wrapper}>
        <div className={`${containers.md} ${pageHeader.container}`}>
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
              <div>
                <h1 className="text-xl font-bold text-neutral-900">
                  Interview with {interview.candidate_name}
                </h1>
                <p className={pageHeader.subtitle}>{interview.position}</p>
              </div>
            </div>
            {interview.status !== 'completed' && (
              <Button
                onClick={handleCompleteInterview}
                data-testid="complete-interview-button"
                disabled={completing}
                className="rounded-lg font-medium"
                style={{ background: cssGradients.info }}
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
        <div className={`${containers.md} mx-auto px-6 py-6 space-y-4`}>
          {messages.map((message, index) => (
            <div
              key={message.id || index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-5 py-3 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white'
                    : 'bg-surface text-neutral-800 shadow-md border border-neutral-100'
                }`}
              >
                {message.role === 'assistant' && (
                  <p className="text-xs font-medium mb-1 text-purple-500">
                    AI Interviewer
                  </p>
                )}
                <p className="text-base leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
                <p
                  className={`text-xs mt-2 ${message.role === 'user' ? 'text-white/70' : 'text-neutral-500'}`}
                >
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      {interview.status !== 'completed' && (
        <div className="bg-surface border-t border-neutral-200 shadow-lg">
          <div className={`${containers.md} mx-auto px-6 py-4`}>
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <Input
                type="text"
                data-testid="chat-message-input"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your response..."
                disabled={sending}
                className="flex-1 h-12 rounded-lg border-neutral-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base"
              />
              <Button
                type="submit"
                data-testid="send-message-button"
                disabled={sending || !inputMessage.trim()}
                className="h-12 px-6 rounded-lg font-medium"
                style={{ background: cssGradients.purple }}
              >
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </div>
        </div>
      )}

      {interview.status === 'completed' && (
        <div className="bg-surface border-t border-neutral-200 shadow-lg">
          <div className={`${containers.md} mx-auto px-6 py-6 text-center`}>
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-blue-400" />
            <p className="text-lg font-semibold mb-2 text-neutral-900">
              Interview Completed
            </p>
            <p className="text-neutral-600">
              This interview has been completed and can no longer accept
              messages.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default InterviewPage
