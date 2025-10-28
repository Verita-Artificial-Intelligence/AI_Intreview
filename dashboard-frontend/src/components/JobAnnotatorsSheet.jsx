import { useState, useEffect } from 'react'
import api from '@/utils/api'
import { SimpleSheetContainer } from './sheets/SheetContainer'
import { SheetHeader } from './sheets/SheetHeader'
import { SheetSection } from './sheets/SheetSection'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useSheetState } from '@/hooks/useSheetState'
import { CheckCircle2, ExternalLink, Users } from 'lucide-react'
import { toast } from 'sonner'

/**
 * Job Annotators Sheet - displays only accepted candidates for a job
 */
export default function JobAnnotatorsSheet({ open, onOpenChange, jobId }) {
  const { replaceSheet } = useSheetState()
  const [job, setJob] = useState(null)
  const [acceptedInterviews, setAcceptedInterviews] = useState([])
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
      // Filter only accepted interviews
      const accepted = (interviewsRes.data || []).filter(
        (i) => i.acceptance_status === 'accepted'
      )
      setAcceptedInterviews(accepted)
    } catch (error) {
      console.error('Error fetching annotators:', error)
      toast.error('Failed to load annotators')
    } finally {
      setLoading(false)
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
      title="Job Annotators"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-gray-600">Loading annotators...</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <SheetHeader title={job?.title} subtitle="Accepted annotators" />

          {/* Annotators List */}
          <SheetSection
            title={`${acceptedInterviews.length} Annotator${acceptedInterviews.length !== 1 ? 's' : ''}`}
          >
            {acceptedInterviews.length === 0 ? (
              <Card className="p-8 text-center border border-neutral-200">
                <Users className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-sm text-neutral-600">
                  No accepted annotators yet
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {acceptedInterviews.map((interview) => (
                  <Card
                    key={interview.id}
                    className="p-3 border border-green-200 bg-green-50 hover:border-green-300 hover:bg-green-100 transition-all cursor-pointer"
                    onClick={() => replaceSheet('interview', interview.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded bg-green-200 flex items-center justify-center text-xs font-medium text-green-800 flex-shrink-0">
                          {getInitials(interview.candidate_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium text-neutral-900 truncate">
                              {interview.candidate_name || 'Unknown Candidate'}
                            </h4>
                            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                          </div>
                          <div className="text-xs text-neutral-600 mt-1">
                            Accepted on{' '}
                            {new Date(interview.updated_at).toLocaleDateString(
                              'en-US',
                              {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              }
                            )}
                          </div>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-green-600 flex-shrink-0" />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </SheetSection>

          {/* Summary */}
          {acceptedInterviews.length > 0 && (
            <SheetSection title="Summary">
              <Card className="p-4 border border-green-200 bg-green-50">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold text-green-900">
                      {acceptedInterviews.length}
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      {acceptedInterviews.length === 1
                        ? 'Annotator'
                        : 'Annotators'}{' '}
                      assigned to this job
                    </p>
                  </div>
                </div>
              </Card>
            </SheetSection>
          )}
        </>
      )}
    </SimpleSheetContainer>
  )
}
