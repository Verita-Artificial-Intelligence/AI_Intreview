import { useState, useEffect } from 'react'
import { CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const StatusScreen = () => {
  const { fetchInterviewStatus, user } = useAuth()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  // Extract first name from full name
  const firstName = user?.name?.split(' ')[0] || ''

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const statusData = await fetchInterviewStatus()
        setStatus(statusData?.status)
      } catch (error) {
        console.error('Error loading status:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStatus()
  }, [])

  const getStatusConfig = () => {
    switch (status) {
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
