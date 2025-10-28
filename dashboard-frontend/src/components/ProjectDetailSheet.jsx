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
  Briefcase,
  Users,
  Calendar,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { getStatusClass, getStatusLabel } from '@/lib/design-system'
import AnnotatorProfileSheet from './AnnotatorProfileSheet'

export default function ProjectDetailSheet({ open, onOpenChange, projectId }) {
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)

  // Annotator modal
  const [annotatorModalOpen, setAnnotatorModalOpen] = useState(false)
  const [selectedAnnotatorId, setSelectedAnnotatorId] = useState(null)

  useEffect(() => {
    if (open && projectId) {
      fetchProjectDetails()
    }
  }, [open, projectId])

  const fetchProjectDetails = async () => {
    try {
      setLoading(true)
      const [projectRes, assignmentsRes, candidatesRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/assignments`),
        api.get('/candidates'),
      ])
      setProject(projectRes.data)
      setAssignments(assignmentsRes.data || [])
      setCandidates(candidatesRes.data || [])
    } catch (error) {
      console.error('Error fetching project details:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCandidateName = (candidateId) => {
    if (!candidateId) return 'Unknown'
    const candidate = candidates.find((c) => c.id === candidateId)
    console.log(
      'Looking for candidate:',
      candidateId,
      'Found:',
      candidate?.name,
      'From list:',
      candidates.map((c) => ({ id: c.id, name: c.name }))
    )
    return candidate?.name || 'Unknown'
  }

  const handleAnnotatorClick = (candidateId) => {
    setSelectedAnnotatorId(candidateId)
    setAnnotatorModalOpen(true)
  }

  if (!open) return null

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-neutral-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-600">Loading project...</p>
            </div>
          ) : project ? (
            <>
              <SheetHeader className="mb-6">
                <div className="flex items-start justify-between gap-4 pr-8">
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-2xl font-semibold mb-2">
                      {project.name}
                    </SheetTitle>
                    {project.description && (
                      <SheetDescription className="text-sm text-neutral-600">
                        {project.description}
                      </SheetDescription>
                    )}
                  </div>
                  <Badge
                    className={`${getStatusClass(project.status)} px-3 py-1 flex-shrink-0`}
                  >
                    {getStatusLabel(project.status)}
                  </Badge>
                </div>
              </SheetHeader>

              {/* Project Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 text-neutral-600 mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-medium">Assigned</span>
                  </div>
                  <p className="text-2xl font-semibold text-neutral-900">
                    {assignments.filter((a) => a.status === 'active').length}
                  </p>
                </Card>
                <Card className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 text-neutral-600 mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-medium">Capacity</span>
                  </div>
                  <p className="text-2xl font-semibold text-neutral-900">
                    {assignments.filter((a) => a.status === 'active').length} /{' '}
                    {project.capacity || 0}
                  </p>
                </Card>
                <Card className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 text-neutral-600 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-medium">Created</span>
                  </div>
                  <p className="text-sm font-semibold text-neutral-900">
                    {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </Card>
              </div>

              {/* Assignments List */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-neutral-900">
                    Team Assignments
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigate(`/annotators`)
                      onOpenChange(false)
                    }}
                    className="rounded-lg"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View All Annotators
                  </Button>
                </div>

                {assignments.length === 0 ? (
                  <Card className="p-8 text-center border border-gray-200 rounded-lg">
                    <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-gray-600">
                      No team members assigned to this project yet
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {assignments.map((assignment) => (
                      <Card
                        key={assignment.id}
                        className="p-4 border border-gray-200 rounded-lg hover:border-brand-300 hover:shadow-sm transition-all cursor-pointer group"
                        onClick={() =>
                          handleAnnotatorClick(
                            assignment.candidate_id || assignment.candidateId
                          )
                        }
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-base text-neutral-900 truncate mb-1">
                              {getCandidateName(
                                assignment.candidate_id ||
                                  assignment.candidateId
                              )}
                            </h4>
                            <div className="flex items-center gap-2">
                              {assignment.role && (
                                <span className="text-sm text-neutral-600">
                                  {assignment.role}
                                </span>
                              )}
                              <Badge
                                className={`text-xs ${
                                  assignment.status === 'active'
                                    ? 'bg-green-50 text-green-700'
                                    : assignment.status === 'completed'
                                      ? 'bg-blue-50 text-blue-700'
                                      : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {assignment.status}
                              </Badge>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-brand-500 transition-colors" />
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-600">Project not found</p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Annotator Profile Sheet */}
      <AnnotatorProfileSheet
        open={annotatorModalOpen}
        onOpenChange={setAnnotatorModalOpen}
        candidateId={selectedAnnotatorId}
      />
    </>
  )
}
