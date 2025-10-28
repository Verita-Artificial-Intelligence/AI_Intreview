import { useState, useEffect } from 'react'
import api from '@/utils/api'
import { SimpleSheetContainer } from './sheets/SheetContainer'
import { SheetHeader } from './sheets/SheetHeader'
import { SheetSection } from './sheets/SheetSection'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useSheetState } from '@/hooks/useSheetState'
import { Users, ExternalLink, CheckCircle2, AlertCircle, X } from 'lucide-react'
import { toast } from 'sonner'

/**
 * Job Applications Sheet - displays all interviews (applications) for a job
 */
export default function JobApplicationsSheet({ open, onOpenChange, jobId }) {
  const { replaceSheet } = useSheetState()
  const [job, setJob] = useState(null)
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open && jobId) {
      fetchData()
    }
  }, [open, jobId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [jobRes, interviewsRes] = await Promise.all([
        api.get(`/jobs/${jobId}`),
        api.get('/interviews', { params: { job_id: jobId } }),
      ])
      setJob(jobRes.data)
      setInterviews(interviewsRes.data || [])
    } catch (error) {
      console.error('Error fetching applications:', error)
      toast.error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status, acceptanceStatus) => {
    if (acceptanceStatus === 'accepted') {
      return <Badge className="bg-green-100 text-green-800">Accepted</Badge>
    }
    if (acceptanceStatus === 'rejected') {
      return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
    }

    const statusConfig = {
      completed: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        label: 'Completed',
      },
      in_progress: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        label: 'In Progress',
      },
      scheduled: {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        label: 'Scheduled',
      },
      pending: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Pending' },
    }

    const config = statusConfig[status] || statusConfig.pending
    return (
      <Badge className={`${config.bg} ${config.text}`}>{config.label}</Badge>
    )
  }

  return (
    <SimpleSheetContainer
      isOpen={open}
      onOpenChange={onOpenChange}
      title="Job Applications"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-gray-600">Loading applications...</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <SheetHeader title={job?.title} subtitle="All applications" />

          {/* Applications List */}
          <SheetSection
            title={`${interviews.length} Application${interviews.length !== 1 ? 's' : ''}`}
          >
            {interviews.length === 0 ? (
              <Card className="p-8 text-center border border-neutral-200">
                <Users className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-sm text-neutral-600">No applications yet</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {interviews.map((interview) => (
                  <Card
                    key={interview.id}
                    className="p-3 border border-neutral-200 hover:border-brand-300 hover:bg-brand-50 transition-all cursor-pointer"
                    onClick={() => replaceSheet('interview', interview.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-neutral-900 truncate">
                            {interview.candidate_name || 'Unknown Candidate'}
                          </h4>
                          {getStatusBadge(
                            interview.status,
                            interview.acceptance_status
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-neutral-600">
                          <span>
                            {interview.status === 'completed'
                              ? 'Completed'
                              : 'Pending'}
                          </span>
                          {interview.completed_at && (
                            <span>
                              •{' '}
                              {new Date(
                                interview.completed_at
                              ).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </SheetSection>

          {/* Summary Stats */}
          <SheetSection title="Summary">
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 border border-neutral-200 bg-neutral-50">
                <div className="text-lg font-bold text-neutral-900">
                  {interviews.length}
                </div>
                <p className="text-xs text-neutral-600 mt-1">Total</p>
              </Card>
              <Card
                className={
                  interviews.filter((i) => i.acceptance_status === 'accepted')
                    .length === 0
                    ? 'p-3 border border-yellow-200 bg-yellow-50'
                    : 'p-3 border border-green-200 bg-green-50'
                }
              >
                <div
                  className={
                    interviews.filter((i) => i.acceptance_status === 'accepted')
                      .length === 0
                      ? 'text-lg font-bold text-yellow-900'
                      : 'text-lg font-bold text-green-900'
                  }
                >
                  {
                    interviews.filter((i) => i.acceptance_status === 'accepted')
                      .length
                  }
                </div>
                <p
                  className={
                    interviews.filter((i) => i.acceptance_status === 'accepted')
                      .length === 0
                      ? 'text-xs text-yellow-700 mt-1'
                      : 'text-xs text-green-700 mt-1'
                  }
                >
                  Accepted
                </p>
              </Card>
              <Card className="p-3 border border-blue-200 bg-blue-50">
                <div className="text-lg font-bold text-blue-900">
                  {interviews.filter((i) => i.status === 'completed').length}
                </div>
                <p className="text-xs text-blue-700 mt-1">Completed</p>
              </Card>
            </div>
          </SheetSection>
        </>
      )}
    </SimpleSheetContainer>
  )
}
