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
  MessagesSquare,
  Users,
  Calendar,
  ChevronRight,
  ExternalLink,
  Briefcase,
} from 'lucide-react'
import { getStatusClass, getStatusLabel } from '@/lib/design-system'
import InterviewDetailSheet from './InterviewDetailSheet'

export default function JobDetailSheet({ open, onOpenChange, jobId }) {
  const navigate = useNavigate()
  const [job, setJob] = useState(null)
  const [interviews, setInterviews] = useState([])
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Interview detail sheet
  const [selectedInterviewId, setSelectedInterviewId] = useState(null)
  const [interviewSheetOpen, setInterviewSheetOpen] = useState(false)

  useEffect(() => {
    if (open && jobId) {
      fetchJobDetails()
    }
  }, [open, jobId])

  const fetchJobDetails = async () => {
    try {
      setLoading(true)
      const [jobRes, interviewsRes, candidatesRes] = await Promise.all([
        api.get(`/jobs/${jobId}`),
        api.get(`/interviews?job_id=${jobId}`),
        api.get('/candidates'),
      ])
      setJob(jobRes.data)
      setInterviews(interviewsRes.data)
      setCandidates(candidatesRes.data)
    } catch (error) {
      console.error('Error fetching job details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    if (!job) return
    try {
      setUpdatingStatus(true)
      await api.patch(`/jobs/${jobId}`, { status: newStatus })
      setJob({ ...job, status: newStatus })
    } catch (error) {
      console.error('Error updating job status:', error)
      alert('Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleInterviewClick = (interviewId) => {
    setSelectedInterviewId(interviewId)
    setInterviewSheetOpen(true)
  }

  const getCandidateName = (candidateId) => {
    const candidate = candidates.find((c) => c.id === candidateId)
    return candidate?.name || 'Unknown'
  }

  const getInitials = (name) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase()
  }

  const statusCounts = {
    completed: interviews.filter((i) => i.status === 'completed').length,
    in_progress: interviews.filter((i) => i.status === 'in_progress').length,
    scheduled: interviews.filter((i) => i.status === 'scheduled').length,
    pending: interviews.filter((i) => i.status === 'pending').length,
  }

  if (!open) return null

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-neutral-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-600">Loading job...</p>
            </div>
          ) : job ? (
            <>
              <SheetHeader className="mb-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-2xl font-semibold mb-2">
                      {job.title}
                    </SheetTitle>
                    {job.description && (
                      <SheetDescription className="text-sm text-neutral-600">
                        {job.description}
                      </SheetDescription>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {/* Status Dropdown */}
                    <Select
                      value={job.status}
                      onValueChange={handleStatusChange}
                      disabled={updatingStatus}
                    >
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </SheetHeader>

              {/* Job Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Card className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 text-neutral-600 mb-1">
                    <MessagesSquare className="w-4 h-4" />
                    <span className="text-xs font-medium">
                      Total Interviews
                    </span>
                  </div>
                  <p className="text-2xl font-semibold text-neutral-900">
                    {interviews.length}
                  </p>
                </Card>
                <Card className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 text-neutral-600 mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-medium">
                      Unique Candidates
                    </span>
                  </div>
                  <p className="text-2xl font-semibold text-neutral-900">
                    {new Set(interviews.map((i) => i.candidate_id)).size}
                  </p>
                </Card>
              </div>

              {/* Interview Status Breakdown */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-neutral-900 mb-3">
                  Interview Status
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(statusCounts).map(([status, count]) => (
                    <Card
                      key={status}
                      className="p-3 border border-gray-200 rounded-lg text-center"
                    >
                      <p className="text-xs text-neutral-600 mb-1">
                        {getStatusLabel(status)}
                      </p>
                      <p className="text-xl font-semibold text-neutral-900">
                        {count}
                      </p>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Pipeline Entries */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-neutral-900">
                    Pipeline Entries
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigate(`/pipeline?job=${jobId}`)
                      onOpenChange(false)
                    }}
                    className="rounded-lg"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View in Pipeline
                  </Button>
                </div>

                {interviews.length === 0 ? (
                  <Card className="p-8 text-center border border-gray-200 rounded-lg">
                    <MessagesSquare className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-gray-600">
                      No interviews for this job yet
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {interviews.map((interview) => (
                      <Card
                        key={interview.id}
                        className="p-4 border border-gray-200 rounded-lg hover:border-brand-300 hover:shadow-sm transition-all cursor-pointer group"
                        onClick={() => handleInterviewClick(interview.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md flex items-center justify-center text-sm font-bold text-neutral-900 bg-brand-200 flex-shrink-0">
                            {getInitials(interview.candidate_name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-semibold text-base text-neutral-900 truncate">
                                {interview.candidate_name || 'Unknown'}
                              </h4>
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={`${getStatusClass(interview.status)} text-xs whitespace-nowrap`}
                                >
                                  {getStatusLabel(interview.status)}
                                </Badge>
                                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-brand-500 transition-colors flex-shrink-0" />
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-neutral-600 mt-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(
                                interview.created_at
                              ).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        {interview.summary && (
                          <p className="text-sm text-neutral-700 line-clamp-2 mt-3">
                            {interview.summary}
                          </p>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-600">Job not found</p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Nested Interview Detail Sheet */}
      <InterviewDetailSheet
        open={interviewSheetOpen}
        onOpenChange={(open) => {
          setInterviewSheetOpen(open)
          if (!open) {
            // Refresh interviews when closing nested sheet
            fetchJobDetails()
          }
        }}
        interviewId={selectedInterviewId}
      />
    </>
  )
}
