import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/utils/api'
import { SimpleSheetContainer } from './sheets/SheetContainer'
import { SheetHeader } from './sheets/SheetHeader'
import { SheetSection, SheetInfoSection } from './sheets/SheetSection'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  Briefcase,
  FileText,
  PlayCircle,
  ExternalLink,
  Plus,
  Minus,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useSheetState } from '@/hooks/useSheetState'
import { toast } from 'sonner'

/**
 * Refactored Interview Detail Sheet using new shared components
 */
export default function InterviewDetailSheet({
  open,
  onOpenChange,
  interviewId,
}) {
  const navigate = useNavigate()
  const { closeSheet } = useSheetState()
  const [interview, setInterview] = useState(null)
  const [candidate, setCandidate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false)
  const [showAcceptDialog, setShowAcceptDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)

  useEffect(() => {
    if (open && interviewId) {
      fetchInterviewDetails()
    } else if (!open) {
      // Reset state when sheet closes
      setInterview(null)
      setCandidate(null)
      setLoading(true)
      setIsSummaryExpanded(false)
      setShowAcceptDialog(false)
      setShowRejectDialog(false)
    }
  }, [open, interviewId])

  const fetchInterviewDetails = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/interviews/${interviewId}`)
      setInterview(response.data)

      // Fetch candidate bio if candidate_id exists
      if (response.data.candidate_id) {
        try {
          const candidateResponse = await api.get(
            `/candidates/${response.data.candidate_id}`
          )
          setCandidate(candidateResponse.data)
        } catch (err) {
          console.error('Error fetching candidate:', err)
        }
      }
    } catch (error) {
      console.error('Error fetching interview details:', error)
      toast.error('Failed to load interview details')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    try {
      await api.patch(`/interviews/${interviewId}/accept`)
      toast.success('Candidate accepted!')
      setShowAcceptDialog(false)
      fetchInterviewDetails()
    } catch (error) {
      console.error('Error accepting candidate:', error)
      toast.error('Failed to accept candidate')
    }
  }

  const handleReject = async () => {
    try {
      await api.patch(`/interviews/${interviewId}/reject`)
      toast.success('Candidate rejected')
      setShowRejectDialog(false)
      fetchInterviewDetails()
    } catch (error) {
      console.error('Error rejecting candidate:', error)
      toast.error('Failed to reject candidate')
    }
  }

  const handleViewJob = () => {
    if (interview?.job_id) {
      closeSheet()
      navigate(`/jobs?job=${interview.job_id}`)
    }
  }

  const handleViewCompetitors = () => {
    if (interview?.job_id) {
      closeSheet()
      navigate(`/pipeline?job=${interview.job_id}`)
    }
  }

  const getInitials = (name) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase()
  }

  return (
    <SimpleSheetContainer
      isOpen={open}
      onOpenChange={onOpenChange}
      title="Interview Details"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-gray-600">Loading interview...</p>
        </div>
      ) : interview ? (
        <>
          {/* Header */}
          <SheetHeader
            title={interview.candidate_name || 'Unknown Candidate'}
            subtitle={interview.job_title || 'No Job Title'}
            avatarFallback={getInitials(interview.candidate_name)}
            actions={
              interview.status === 'completed'
                ? [
                    {
                      label: 'Open Full Review',
                      icon: FileText,
                      variant: 'default',
                      onClick: () => {
                        onOpenChange(false)
                        setTimeout(
                          () => navigate(`/admin/review/${interviewId}`),
                          100
                        )
                      },
                    },
                  ]
                : []
            }
          />

          {/* Candidate Bio */}
          {candidate?.bio && (
            <SheetSection title="About Candidate">
              <p className="text-sm text-neutral-700 whitespace-pre-wrap">
                {candidate.bio}
              </p>
            </SheetSection>
          )}

          {/* Accept/Reject Actions */}
          {interview.acceptance_status === 'pending' && (
            <SheetSection title="Quick Decision">
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowAcceptDialog(true)}
                  variant="default"
                  className="flex-1"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Accept
                </Button>
                <Button
                  onClick={() => setShowRejectDialog(true)}
                  variant="outline"
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </SheetSection>
          )}

          {/* Acceptance Status Display */}
          {interview.acceptance_status === 'accepted' && (
            <Card className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">
                  Candidate Accepted
                </span>
              </div>
            </Card>
          )}

          {interview.acceptance_status === 'rejected' && (
            <Card className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg mb-6">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-neutral-600" />
                <span className="text-sm font-medium text-neutral-900">
                  Candidate Rejected
                </span>
              </div>
            </Card>
          )}

          {/* Interview Info */}
          <SheetInfoSection
            title="Interview Information"
            items={[
              {
                label: 'Created',
                value: new Date(interview.created_at).toLocaleDateString(
                  'en-US',
                  {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }
                ),
              },
              {
                label: 'Interview Type',
                value: interview.interview_type || 'Standard',
              },
              {
                label: 'Analysis Status',
                value: interview.analysis_status || 'Pending',
              },
              {
                label: 'Completed',
                value: interview.completed_at
                  ? new Date(interview.completed_at).toLocaleDateString(
                      'en-US',
                      {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      }
                    )
                  : 'Not completed',
              },
            ]}
          />

          {/* Summary */}
          {interview.summary && (
            <SheetSection title="Interview Summary" icon={FileText}>
              <ExpandableText
                text={interview.summary}
                isExpanded={isSummaryExpanded}
                onToggle={() => setIsSummaryExpanded(!isSummaryExpanded)}
              />
            </SheetSection>
          )}

          {/* Transcript */}
          {interview.transcript && interview.transcript.length > 0 && (
            <SheetSection title="Transcript">
              <Card className="p-4 border border-gray-200 rounded-lg bg-neutral-50 max-h-80 overflow-y-auto">
                <div className="space-y-3">
                  {interview.transcript.map((entry, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="font-semibold text-neutral-900">
                        {entry.speaker === 'interviewer'
                          ? 'Interviewer'
                          : 'Candidate'}
                        :
                      </span>{' '}
                      <span className="text-neutral-700">{entry.text}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </SheetSection>
          )}

          {/* Related Information */}
          {interview.job_id && (
            <SheetSection title="Related Information">
              <div className="space-y-2">
                <button
                  onClick={handleViewCompetitors}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-neutral-600" />
                      <span className="text-sm font-medium text-neutral-900">
                        View Competitors
                      </span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-brand-600 transition-colors" />
                  </div>
                  <p className="text-xs text-neutral-600 mt-1 ml-6">
                    See all candidates for this position
                  </p>
                </button>

                <button
                  onClick={handleViewJob}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-neutral-600" />
                      <span className="text-sm font-medium text-neutral-900">
                        View Job Details
                      </span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-brand-600 transition-colors" />
                  </div>
                  {interview.job_title && (
                    <p className="text-xs text-neutral-600 mt-1 ml-6">
                      {interview.job_title}
                    </p>
                  )}
                </button>
              </div>
            </SheetSection>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-gray-600">Interview not found</p>
        </div>
      )}

      {/* Accept Confirmation Dialog */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept Candidate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to accept this candidate? After accepting,
              you can create annotation tasks for them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAccept}>Accept</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Candidate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this candidate? This action will
              update their status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject}>Reject</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SimpleSheetContainer>
  )
}

/**
 * Expandable text with blur effect when collapsed
 */
function ExpandableText({ text, isExpanded, onToggle }) {
  const COLLAPSED_HEIGHT = 150
  const needsExpansion = text.length > 300

  return (
    <div className="relative">
      <div
        className={`text-sm text-neutral-700 whitespace-pre-wrap transition-all ${
          !isExpanded && needsExpansion ? 'overflow-hidden' : ''
        }`}
        style={{
          maxHeight:
            !isExpanded && needsExpansion ? `${COLLAPSED_HEIGHT}px` : 'none',
        }}
      >
        {text}
      </div>

      {!isExpanded && needsExpansion && (
        <div
          className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, transparent, rgb(249 250 251))',
          }}
        />
      )}

      {needsExpansion && (
        <div className="flex items-center gap-2 mt-4">
          <div className="flex-1 h-px bg-neutral-200" />
          <button
            onClick={onToggle}
            className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-brand-500 bg-white text-brand-600 hover:bg-brand-50 transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <Minus className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
          <div className="flex-1 h-px bg-neutral-200" />
        </div>
      )}
    </div>
  )
}
