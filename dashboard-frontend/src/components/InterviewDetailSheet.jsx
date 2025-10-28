import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/utils/api'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Users,
  Briefcase,
  Calendar,
  Clock,
  FileText,
  ExternalLink,
  CheckCircle2,
  XCircle,
  PlayCircle,
} from 'lucide-react'
import { getStatusClass, getStatusLabel } from '@/lib/design-system'

export default function InterviewDetailSheet({
  open,
  onOpenChange,
  interviewId,
}) {
  const navigate = useNavigate()
  const [interview, setInterview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [updatingAcceptance, setUpdatingAcceptance] = useState(false)

  useEffect(() => {
    if (open && interviewId) {
      fetchInterviewDetails()
    }
  }, [open, interviewId])

  const fetchInterviewDetails = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/interviews/${interviewId}`)
      setInterview(response.data)
    } catch (error) {
      console.error('Error fetching interview details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    if (!interview) return
    try {
      setUpdatingStatus(true)
      await api.patch(`/interviews/${interviewId}`, { status: newStatus })
      setInterview({ ...interview, status: newStatus })
    } catch (error) {
      console.error('Error updating interview status:', error)
      alert('Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleAcceptanceChange = async (newAcceptance) => {
    if (!interview) return
    try {
      setUpdatingAcceptance(true)
      await api.patch(`/interviews/${interviewId}`, {
        acceptance_status: newAcceptance,
      })
      setInterview({ ...interview, acceptance_status: newAcceptance })
    } catch (error) {
      console.error('Error updating acceptance status:', error)
      alert('Failed to update acceptance status')
    } finally {
      setUpdatingAcceptance(false)
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

  const getAcceptanceIcon = (status) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  if (!open) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-neutral-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-600">Loading interview...</p>
          </div>
        ) : interview ? (
          <>
            <SheetHeader className="mb-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-lg flex items-center justify-center text-lg font-bold text-neutral-900 bg-brand-200 flex-shrink-0">
                  {getInitials(interview.candidate_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-2xl font-semibold mb-1">
                    {interview.candidate_name || 'Unknown Candidate'}
                  </SheetTitle>
                  {interview.job_title && (
                    <SheetDescription className="text-sm text-neutral-600 flex items-center gap-1">
                      <Briefcase className="w-4 h-4" />
                      {interview.job_title}
                    </SheetDescription>
                  )}
                </div>
              </div>

              {/* Status Controls */}
              <div className="flex flex-wrap gap-3">
                {/* Interview Status */}
                <div className="flex-1 min-w-[140px]">
                  <label className="text-xs font-medium text-neutral-600 mb-1 block">
                    Status
                  </label>
                  <Select
                    value={interview.status}
                    onValueChange={handleStatusChange}
                    disabled={updatingStatus}
                  >
                    <SelectTrigger className="w-full h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Acceptance Status */}
                {interview.status === 'completed' && (
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-xs font-medium text-neutral-600 mb-1 block">
                      Decision
                    </label>
                    <Select
                      value={interview.acceptance_status || 'pending'}
                      onValueChange={handleAcceptanceChange}
                      disabled={updatingAcceptance}
                    >
                      <SelectTrigger className="w-full h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending Review</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </SheetHeader>

            {/* Interview Info Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 text-neutral-600 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-medium">Created</span>
                </div>
                <p className="text-sm font-semibold text-neutral-900">
                  {new Date(interview.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </Card>

              {interview.acceptance_status && (
                <Card className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 text-neutral-600 mb-1">
                    {getAcceptanceIcon(interview.acceptance_status)}
                    <span className="text-xs font-medium">Decision</span>
                  </div>
                  <p className="text-sm font-semibold text-neutral-900 capitalize">
                    {interview.acceptance_status || 'Pending'}
                  </p>
                </Card>
              )}
            </div>

            {/* Summary Section */}
            {interview.summary && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Interview Summary
                </h3>
                <Card className="p-4 border border-gray-200 rounded-lg bg-neutral-50">
                  <p className="text-sm text-neutral-700 whitespace-pre-wrap">
                    {interview.summary}
                  </p>
                </Card>
              </div>
            )}

            {/* Transcript Section */}
            {interview.transcript && interview.transcript.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-neutral-900 mb-3">
                  Transcript
                </h3>
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
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              {interview.status === 'completed' ? (
                <Button
                  onClick={() => {
                    navigate(`/admin/review/${interviewId}`)
                    onOpenChange(false)
                  }}
                  className="flex-1 rounded-lg"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Full Review
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    navigate(`/interview/${interviewId}`)
                    onOpenChange(false)
                  }}
                  className="flex-1 rounded-lg"
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Open Interview
                </Button>
              )}

              {interview.candidate_id && (
                <Button
                  variant="outline"
                  onClick={() => {
                    navigate(`/pipeline?candidate=${interview.candidate_id}`)
                    onOpenChange(false)
                  }}
                  className="flex-1 rounded-lg"
                >
                  <Users className="w-4 h-4 mr-2" />
                  View Candidate
                </Button>
              )}
            </div>

            {/* Related Info */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-3">
                Related
              </h3>
              <div className="space-y-2">
                {interview.job_id && (
                  <button
                    onClick={() => {
                      navigate(`/pipeline?job=${interview.job_id}`)
                      onOpenChange(false)
                    }}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-neutral-600" />
                      <span className="text-sm font-medium text-neutral-900">
                        View all interviews for this job
                      </span>
                    </div>
                  </button>
                )}
                {interview.candidate_id && (
                  <button
                    onClick={() => {
                      navigate(`/pipeline?candidate=${interview.candidate_id}`)
                      onOpenChange(false)
                    }}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-neutral-600" />
                      <span className="text-sm font-medium text-neutral-900">
                        View all interviews for this candidate
                      </span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-600">Interview not found</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
