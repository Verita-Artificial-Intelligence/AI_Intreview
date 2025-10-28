import { useState, useEffect } from 'react'
import api from '@/utils/api'
import { SimpleSheetContainer } from './sheets/SheetContainer'
import { SheetHeader } from './sheets/SheetHeader'
import { SheetSection, SheetInfoSection } from './sheets/SheetSection'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useSheetState } from '@/hooks/useSheetState'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  FileText,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Edit,
  Plus,
  Minus,
} from 'lucide-react'
import { toast } from 'sonner'

/**
 * Job Detail Sheet with drill-down to applications and accepted annotators
 */
export default function JobDetailSheetNew({
  open,
  onOpenChange,
  jobId,
  onEdit,
  isWrapper = false,
  initialJob = null,
}) {
  const { replaceSheet, closeSheet } = useSheetState()
  const navigate = useNavigate()
  const [job, setJob] = useState(initialJob)
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(!initialJob)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)

  useEffect(() => {
    if (open && jobId) {
      // If we have initialJob from wrapper, use it
      if (initialJob) {
        setJob(initialJob)
        fetchInterviews()
      } else {
        fetchJobDetails()
      }
    } else if (!open) {
      // Reset state when sheet closes
      setIsDescriptionExpanded(false)
    }
  }, [open, jobId, initialJob])

  const fetchJobDetails = async () => {
    try {
      setLoading(true)
      const [jobRes, interviewsRes] = await Promise.all([
        api.get(`/jobs/${jobId}`),
        api.get('/interviews', { params: { job_id: jobId } }),
      ])
      setJob(jobRes.data)
      setInterviews(interviewsRes.data || [])
    } catch (error) {
      console.error('Error fetching job details:', error)
      toast.error('Failed to load job details')
    } finally {
      setLoading(false)
    }
  }

  const fetchInterviews = async () => {
    try {
      const interviewsRes = await api.get('/interviews', {
        params: { job_id: jobId },
      })
      setInterviews(interviewsRes.data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching interviews:', error)
      setLoading(false)
    }
  }

  const getApplicationStats = () => {
    const accepted = interviews.filter(
      (i) => i.acceptance_status === 'accepted'
    ).length
    const total = interviews.length
    return { total, accepted }
  }

  const stats = getApplicationStats()

  const handleEditJob = () => {
    if (onEdit && job) {
      onEdit(job)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const content = loading ? (
    <div className="flex items-center justify-center py-12">
      <p className="text-sm text-gray-600">Loading job details...</p>
    </div>
  ) : job ? (
    <>
      {/* Header */}
      <SheetHeader
        title={job.title}
        subtitle={job.position_type}
        actions={[
          {
            label: 'Edit',
            icon: Edit,
            variant: 'outline',
            onClick: handleEditJob,
          },
        ]}
      />

      {/* Application Stats */}
      <SheetSection title="Application Status">
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 border border-neutral-200 bg-white rounded-lg">
            <div className="text-2xl font-bold text-neutral-900">
              {stats.total}
            </div>
            <p className="text-xs text-neutral-600 mt-1">Total Applications</p>
          </Card>
          <Card
            className={
              stats.accepted === 0
                ? 'p-4 border border-yellow-200 bg-yellow-50 rounded-lg'
                : 'p-4 border border-green-200 bg-green-50 rounded-lg'
            }
          >
            <div className="flex items-center gap-2">
              {stats.accepted === 0 ? (
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              )}
              <div>
                <div
                  className={
                    stats.accepted === 0
                      ? 'text-2xl font-bold text-yellow-900'
                      : 'text-2xl font-bold text-green-900'
                  }
                >
                  {stats.accepted}
                </div>
                <p
                  className={
                    stats.accepted === 0
                      ? 'text-xs text-yellow-700 mt-1'
                      : 'text-xs text-green-700 mt-1'
                  }
                >
                  Accepted
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Drill-down Actions */}
        <div className="space-y-2 mt-4">
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-3 px-4"
            onClick={() => {
              closeSheet()
              navigate(`/pipeline?job=${jobId}`)
            }}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 text-left">
                <Users className="w-4 h-4 text-neutral-600" />
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    View All Candidates
                  </p>
                  <p className="text-xs text-neutral-600">
                    {stats.total} candidates in pipeline
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-neutral-400" />
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-auto py-3 px-4"
            onClick={() => {
              closeSheet()
              navigate(`/annotators?job=${jobId}`)
            }}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 text-left">
                {stats.accepted === 0 ? (
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                )}
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    View Accepted
                  </p>
                  <p className="text-xs text-neutral-600">
                    {stats.accepted} annotators accepted
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-neutral-400" />
            </div>
          </Button>
        </div>
      </SheetSection>

      {/* Job Details */}
      <SheetInfoSection
        title="Job Information"
        items={[
          {
            label: 'Position Type',
            value: job.position_type || '-',
          },
          {
            label: 'Status',
            value: (() => {
              const statusConfig = {
                pending: { bg: 'badge-blue', label: 'Pending' },
                in_progress: { bg: 'badge-yellow', label: 'In Progress' },
                completed: { bg: 'badge-green', label: 'Completed' },
                archived: { bg: 'badge-gray', label: 'Archived' },
              }
              const config = statusConfig[job.status] || statusConfig.pending
              return (
                <span className={`badge ${config.bg}`}>{config.label}</span>
              )
            })(),
          },
          {
            label: 'Interview Type',
            value: getInterviewTypeLabel(job.interview_type),
          },
          {
            label: 'Created',
            value: formatDate(job.created_at),
          },
          {
            label: 'Updated',
            value: formatDate(job.updated_at),
          },
        ]}
      />

      {/* Description */}
      {job.description && (
        <SheetSection title="Description">
          <ExpandableDescription
            description={job.description}
            isExpanded={isDescriptionExpanded}
            onToggle={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
          />
        </SheetSection>
      )}

      {/* Skills */}
      {job.skills && job.skills.length > 0 && (
        <SheetSection title="Required Skills">
          <div className="flex flex-wrap gap-2">
            {job.skills.map((skill, idx) => (
              <Badge key={idx} variant="outline">
                {typeof skill === 'string' ? skill : skill.name}
              </Badge>
            ))}
          </div>
        </SheetSection>
      )}

      {/* Custom Questions */}
      {job.custom_questions && job.custom_questions.length > 0 && (
        <SheetSection title="Custom Questions" collapsible defaultCollapsed>
          <div className="space-y-3">
            {job.custom_questions.map((question, idx) => (
              <div
                key={idx}
                className="p-3 bg-neutral-50 rounded-lg border border-neutral-200"
              >
                <p className="text-sm font-medium text-neutral-900">
                  Q{idx + 1}: {question}
                </p>
              </div>
            ))}
          </div>
        </SheetSection>
      )}
    </>
  ) : (
    <div className="flex items-center justify-center py-12">
      <p className="text-sm text-gray-600">Job not found</p>
    </div>
  )

  // If wrapped by parent, just return content
  if (isWrapper) {
    return content
  }

  // Otherwise wrap in SimpleSheetContainer
  return (
    <SimpleSheetContainer
      isOpen={open}
      onOpenChange={onOpenChange}
      title="Job Details"
    >
      {content}
    </SimpleSheetContainer>
  )
}

function getInterviewTypeLabel(type) {
  const labels = {
    standard: 'Standard interview',
    human_data: 'Design critique & feedback exercise',
    custom_questions: 'Custom questions only',
    custom_exercise: 'Custom Creative Exercise',
  }
  return labels[type] || type
}

/**
 * Expandable description with blur effect when collapsed
 */
function ExpandableDescription({ description, isExpanded, onToggle }) {
  const COLLAPSED_HEIGHT = 150 // pixels
  const needsExpansion = description.length > 300 // characters

  return (
    <div className="relative">
      {/* Description text */}
      <div
        className={`text-sm text-neutral-700 whitespace-pre-wrap transition-all ${
          !isExpanded && needsExpansion ? 'overflow-hidden' : ''
        }`}
        style={{
          maxHeight:
            !isExpanded && needsExpansion ? `${COLLAPSED_HEIGHT}px` : 'none',
        }}
      >
        {description}
      </div>

      {/* Blur overlay when collapsed */}
      {!isExpanded && needsExpansion && (
        <div
          className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, transparent, rgb(249 250 251))',
          }}
        />
      )}

      {/* Expand/Collapse button */}
      {needsExpansion && (
        <div
          className={`flex items-center gap-2 ${isExpanded ? 'mt-4' : 'absolute bottom-0 left-0 right-0'}`}
        >
          <div className="flex-1 h-px bg-neutral-200" />
          <button
            onClick={onToggle}
            className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-brand-500 bg-white text-brand-600 hover:bg-brand-50 transition-colors relative z-10"
            aria-label={
              isExpanded ? 'Collapse description' : 'Expand description'
            }
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
