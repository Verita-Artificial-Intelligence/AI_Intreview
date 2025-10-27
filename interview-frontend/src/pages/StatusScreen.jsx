import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  ArrowLeft,
  Briefcase,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import api from '@/utils/api'
import { cardStyles } from '@/lib/design-system'

const StatusScreen = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedInterviewId = searchParams.get('interviewId')
  const { fetchInterviewStatus, user, token } = useAuth()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [interviews, setInterviews] = useState([])
  const [selectedInterview, setSelectedInterview] = useState(null)

  // Extract first name from full name
  const firstName = user?.name?.split(' ')[0] || ''

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    // If there's a selected interview ID, show that one
    if (selectedInterviewId && interviews.length > 0) {
      const interview = interviews.find((i) => i.id === selectedInterviewId)
      if (interview) {
        setSelectedInterview(interview)
        setStatus(interview.status)
      }
    }
  }, [selectedInterviewId, interviews])

  const loadData = async () => {
    try {
      // Fetch user's interviews
      const response = await api.get(`/interviews`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const userInterviews = response.data.filter(
        (interview) => interview.candidate_id === user?.id
      )
      setInterviews(userInterviews)

      // If no specific interview selected, use the most recent
      if (!selectedInterviewId && userInterviews.length > 0) {
        const mostRecent = userInterviews[0]
        setSelectedInterview(mostRecent)
        setStatus(mostRecent.status)
      } else if (selectedInterviewId) {
        const interview = userInterviews.find(
          (i) => i.id === selectedInterviewId
        )
        if (interview) {
          setSelectedInterview(interview)
          setStatus(interview.status)
        }
      } else {
        // Fallback to old method if no interviews
        const statusData = await fetchInterviewStatus()
        setStatus(statusData?.status)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      // Fallback to old method
      try {
        const statusData = await fetchInterviewStatus()
        setStatus(statusData?.status)
      } catch (err) {
        console.error('Error loading status:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSelectInterview = (interview) => {
    navigate(`/status?interviewId=${interview.id}`)
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'not_started':
        return {
          icon: Clock,
          iconColor: 'text-brand-600',
          iconBg: 'bg-brand-50',
          accentColor: 'border-brand-200',
          title: 'Interview ready to begin',
          subtitle: 'Your interview is waiting for you',
          message:
            'Your interview has been created and is ready to begin. Please check your email for the interview link or navigate to the interview page when you are ready.',
          showTimeline: false,
        }
      case 'completed':
      case 'under_review':
        return {
          icon: Clock,
          iconColor: 'text-brand-600',
          iconBg: 'bg-brand-50',
          accentColor: 'border-brand-200',
          title: 'Your interview is under review',
          subtitle: 'We are analyzing your responses',
          message:
            'Our AI system is currently analyzing your interview responses. A human reviewer will validate the assessment, and you will receive a decision via email within 24-48 hours.',
          showTimeline: true,
        }
      case 'approved':
        return {
          icon: CheckCircle,
          iconColor: 'text-green-600',
          iconBg: 'bg-green-50',
          accentColor: 'border-green-200',
          title: 'Congratulations!',
          subtitle: 'Your interview has been approved',
          message:
            'We are excited to move forward with you. A member of our team will reach out shortly with detailed information about the next steps in the process.',
          showTimeline: false,
        }
      case 'rejected':
        return {
          icon: XCircle,
          iconColor: 'text-red-600',
          iconBg: 'bg-red-50',
          accentColor: 'border-red-200',
          title: 'Interview complete',
          subtitle: 'Thank you for your time',
          message:
            'We have decided to move forward with other candidates at this time. We appreciate your interest and wish you the best. If you have questions, contact info@verita-ai.com',
          showTimeline: false,
        }
      default:
        return {
          icon: Clock,
          iconColor: 'text-neutral-600',
          iconBg: 'bg-neutral-50',
          accentColor: 'border-neutral-200',
          title: 'Status unavailable',
          subtitle: 'Unable to retrieve interview status',
          message: 'Please contact info@verita-ai.com if this issue persists.',
          showTimeline: false,
        }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-neutral-600">
            Loading your interview status...
          </p>
        </div>
      </div>
    )
  }

  const config = getStatusConfig()
  const StatusIcon = config.icon

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-2xl mx-auto px-6 py-5">
          <div className="mb-4">
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              className="rounded-lg text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Opportunities
            </Button>
          </div>
          <div className="flex items-start gap-3">
            <div
              className={`flex-shrink-0 w-11 h-11 ${config.iconBg} flex items-center justify-center border-2 ${config.accentColor}`}
            >
              <StatusIcon className={`w-5 h-5 ${config.iconColor}`} />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-display font-bold text-neutral-900 mb-0.5">
                {firstName
                  ? `${firstName}, ${config.title.toLowerCase()}`
                  : config.title}
              </h1>
              <p className="text-base text-neutral-600">{config.subtitle}</p>
              {selectedInterview?.job_title && (
                <p className="text-sm text-neutral-500 mt-1">
                  Position: {selectedInterview.job_title}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-5">
        {/* Message */}
        <div className="mb-6">
          <p className="text-sm text-neutral-700 leading-relaxed max-w-md">
            {config.message}
          </p>
        </div>

        {/* Timeline for under review */}
        {config.showTimeline && (
          <div className="border-l-2 border-brand-500 pl-5 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                <h3 className="text-sm font-semibold text-neutral-900">
                  AI system analyzes your responses
                </h3>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Our AI evaluates your technical skills, communication, and
                creative process
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                <h3 className="text-sm font-semibold text-neutral-900">
                  Human reviewer validates assessment
                </h3>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                A team member reviews the AI analysis to ensure accuracy and
                fairness
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                <h3 className="text-sm font-semibold text-neutral-900">
                  You receive a decision via email
                </h3>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Typically within 24-48 hours, you will get a notification about
                next steps
              </p>
            </div>
          </div>
        )}

        {/* Approved next steps */}
        {status === 'approved' && (
          <div className="border-l-2 border-green-500 pl-5 py-1">
            <h3 className="text-sm font-semibold text-neutral-900 mb-1">
              Next Steps
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Check your email for detailed information about the next phase of
              the hiring process.
            </p>
          </div>
        )}

        {/* My Applications */}
        {interviews.length > 0 && (
          <div className="mt-8 pt-6 border-t border-neutral-200">
            <h2 className="text-base font-display font-bold mb-3 text-neutral-900">
              My Applications
            </h2>
            <div className="space-y-3">
              {interviews.map((interview) => (
                <Card
                  key={interview.id}
                  onClick={() => handleSelectInterview(interview)}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedInterview?.id === interview.id
                      ? 'border-2 border-brand-500 bg-brand-50/30'
                      : cardStyles.default
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-brand-50 text-brand-500">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-sm text-neutral-900 truncate">
                          {interview.job_title ||
                            interview.position ||
                            'General Interview'}
                        </h3>
                        <Badge
                          className={`text-[10px] ${
                            interview.status === 'completed' ||
                            interview.status === 'under_review'
                              ? 'bg-brand-50 text-brand-600 border-brand-200'
                              : interview.status === 'approved'
                                ? 'bg-green-50 text-green-600 border-green-200'
                                : interview.status === 'rejected'
                                  ? 'bg-red-50 text-red-600 border-red-200'
                                  : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                          }`}
                        >
                          {interview.status === 'in_progress'
                            ? 'In Progress'
                            : interview.status === 'completed'
                              ? 'Under Review'
                              : interview.status === 'under_review'
                                ? 'Under Review'
                                : interview.status === 'approved'
                                  ? 'Approved'
                                  : interview.status === 'rejected'
                                    ? 'Not Selected'
                                    : 'Pending'}
                        </Badge>
                      </div>
                      <p className="text-xs text-neutral-500">
                        Interviewed{' '}
                        {new Date(interview.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Contact support */}
        {config.showTimeline && (
          <div className="mt-8 pt-5 border-t border-neutral-200">
            <p className="text-xs text-neutral-500">
              Questions? Contact{' '}
              <a
                href="mailto:info@verita-ai.com"
                className="text-brand-500 hover:text-brand-600 underline font-medium"
              >
                info@verita-ai.com
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default StatusScreen
