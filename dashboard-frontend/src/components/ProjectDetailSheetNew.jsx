import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/utils/api'
import { SimpleSheetContainer } from './sheets/SheetContainer'
import { SheetHeader } from './sheets/SheetHeader'
import {
  SheetSection,
  SheetInfoSection,
  SheetListSection,
} from './sheets/SheetSection'
import { StatusSelect } from './sheets/StatusSelect'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FolderKanban, Users, ExternalLink } from 'lucide-react'
import { useSheetState } from '@/hooks/useSheetState'
import { toast } from 'sonner'

/**
 * Enhanced Project Detail Sheet using new shared components
 */
export default function ProjectDetailSheet({ open, onOpenChange, projectId }) {
  const navigate = useNavigate()
  const { replaceSheet } = useSheetState()
  const [project, setProject] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)

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
      toast.error('Failed to load project details')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    if (!project) return
    try {
      await api.patch(`/projects/${projectId}`, { status: newStatus })
      setProject({ ...project, status: newStatus })

      // Show cascade message
      if (newStatus === 'completed') {
        toast.success('Project completed. All assignments updated.')
      } else if (newStatus === 'archived') {
        toast.success('Project archived. All assignments removed.')
      } else {
        toast.success('Project status updated')
      }
    } catch (error) {
      console.error('Error updating project status:', error)
      const errorMsg = error.response?.data?.detail || 'Failed to update status'
      toast.error(errorMsg)
    }
  }

  const getCandidateName = (candidateId) => {
    if (!candidateId) return 'Unknown'
    const candidate = candidates.find((c) => c.id === candidateId)
    return candidate?.name || 'Unknown'
  }

  const handleAnnotatorClick = (candidateId) => {
    replaceSheet('annotator', candidateId)
  }

  const activeAssignments = assignments.filter((a) => a.status === 'active')

  return (
    <SimpleSheetContainer
      isOpen={open}
      onOpenChange={onOpenChange}
      title="Project Details"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-gray-600">Loading project...</p>
        </div>
      ) : project ? (
        <>
          {/* Header */}
          <SheetHeader title={project.name} subtitle={project.description} />

          {/* Status Management */}
          <SheetSection title="Project Status">
            <StatusSelect
              workflowType="project"
              currentStatus={project.status}
              onChange={handleStatusChange}
            />
          </SheetSection>

          {/* Project Stats */}
          <SheetInfoSection
            title="Project Overview"
            icon={FolderKanban}
            items={[
              {
                label: 'Active Assignments',
                value: `${activeAssignments.length} / ${project.capacity || 0}`,
              },
              {
                label: 'Total Assignments',
                value: assignments.length,
              },
              {
                label: 'Created',
                value: new Date(project.created_at).toLocaleDateString(
                  'en-US',
                  {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }
                ),
              },
              {
                label: 'Last Updated',
                value: project.updated_at
                  ? new Date(project.updated_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'N/A',
              },
            ]}
          />

          {/* Role Definitions */}
          {project.roles && project.roles.length > 0 && (
            <SheetSection title="Role Definitions" collapsible defaultCollapsed>
              <div className="space-y-2">
                {project.roles.map((role, index) => (
                  <Card
                    key={index}
                    className="p-3 border border-gray-200 rounded-lg bg-neutral-50"
                  >
                    <div className="font-medium text-sm text-neutral-900 mb-1">
                      {role.title}
                    </div>
                    {role.description && (
                      <p className="text-xs text-neutral-600">
                        {role.description}
                      </p>
                    )}
                    {role.required_skills &&
                      role.required_skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {role.required_skills.map((skill, skillIdx) => (
                            <Badge
                              key={skillIdx}
                              variant="outline"
                              className="text-xs bg-blue-50 text-blue-600 border-blue-200"
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}
                  </Card>
                ))}
              </div>
            </SheetSection>
          )}

          {/* Team Assignments */}
          <SheetListSection
            title="Team Assignments"
            icon={Users}
            items={assignments}
            emptyMessage="No team members assigned to this project yet"
            renderItem={(assignment) => (
              <button
                onClick={() =>
                  handleAnnotatorClick(
                    assignment.candidate_id || assignment.candidateId
                  )
                }
                className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-brand-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-base text-neutral-900 truncate mb-1">
                      {getCandidateName(
                        assignment.candidate_id || assignment.candidateId
                      )}
                    </h4>
                    <div className="flex items-center gap-2">
                      {assignment.role && (
                        <span className="text-sm text-neutral-600">
                          {assignment.role}
                        </span>
                      )}
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          assignment.status === 'active'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : assignment.status === 'completed'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        {assignment.status === 'active'
                          ? 'Active'
                          : assignment.status === 'completed'
                            ? 'Completed'
                            : assignment.status}
                      </Badge>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-brand-600 transition-colors" />
                </div>
              </button>
            )}
          />
        </>
      ) : (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-gray-600">Project not found</p>
        </div>
      )}
    </SimpleSheetContainer>
  )
}
