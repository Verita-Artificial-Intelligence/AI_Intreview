import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/utils/api'
import { SimpleSheetContainer } from './sheets/SheetContainer'
import { SheetHeader, SheetEditHeader } from './sheets/SheetHeader'
import {
  SheetSection,
  SheetInfoSection,
  SheetListSection,
} from './sheets/SheetSection'
import { SteppedEditor } from './sheets/SteppedEditor'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  User,
  Briefcase,
  GraduationCap,
  FileText,
  Award,
  TrendingUp,
  Shield,
  ExternalLink,
  Edit,
  Save,
  X,
  Plus,
  Minus,
} from 'lucide-react'
import { useSheetState } from '@/hooks/useSheetState'
import { toast } from 'sonner'
import { getVisibleSections } from '@/lib/entitySections'

/**
 * Unified Annotator/Candidate Profile Sheet with configurable sections
 *
 * Displays comprehensive profile information with support for:
 * - Core identity & portfolio
 * - Skills & experience
 * - Interview summary
 * - Recommendations & insights (coming soon)
 * - Performance metrics (coming soon)
 * - Projects & assignments
 * - Activity log
 *
 * @param {boolean} allowEdit - Whether to show edit controls (default: false for admin view)
 */
export default function AnnotatorProfileSheet({
  open,
  onOpenChange,
  candidateId,
  allowEdit = false,
}) {
  const navigate = useNavigate()
  const { replaceSheet } = useSheetState()
  const [candidate, setCandidate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [assignments, setAssignments] = useState([])
  const [interviews, setInterviews] = useState([])
  const [resetKey, setResetKey] = useState(0)

  useEffect(() => {
    if (open && candidateId) {
      fetchCandidateDetails()
      fetchRelatedData()
      // Increment reset key to force remount of child components
      setResetKey((prev) => prev + 1)
    } else if (!open) {
      // Reset state when sheet closes
      setEditMode(false)
    }
  }, [open, candidateId])

  const fetchCandidateDetails = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/candidates/${candidateId}`)
      setCandidate(response.data)
    } catch (error) {
      console.error('Error fetching candidate details:', error)
      toast.error('Failed to load candidate profile')
    } finally {
      setLoading(false)
    }
  }

  const fetchRelatedData = async () => {
    try {
      // Fetch assignments
      const assignmentsResponse = await api.get(`/projects/assignments`, {
        params: { candidate_id: candidateId },
      })
      setAssignments(assignmentsResponse.data || [])

      // Fetch interviews
      const interviewsResponse = await api.get(`/interviews`, {
        params: { candidate_id: candidateId },
      })
      setInterviews(interviewsResponse.data || [])
    } catch (error) {
      console.error('Error fetching related data:', error)
    }
  }

  const handleSaveProfile = async (formData) => {
    try {
      await api.patch(`/candidates/${candidateId}`, formData)
      toast.success('Profile updated successfully')
      setEditMode(false)
      await fetchCandidateDetails()
    } catch (error) {
      console.error('Error updating profile:', error)
      const errorMsg =
        error.response?.data?.detail || 'Failed to update profile'
      toast.error(errorMsg)
      throw error
    }
  }

  const handleViewInterview = (interviewId) => {
    replaceSheet('interview', interviewId)
  }

  const handleViewProject = (projectId) => {
    replaceSheet('project', projectId)
  }

  const getInitials = (name) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase()
  }

  // Build entity data for section visibility checks
  const entityData = candidate
    ? {
        ...candidate,
        assignments,
        interviews,
        interview_id: interviews.length > 0 ? interviews[0].id : null,
        summary: interviews.find((i) => i.summary)?.summary,
      }
    : null

  // Get visible sections based on available data
  const visibleSections = entityData
    ? getVisibleSections('annotator', entityData, { showComingSoon: true })
    : []

  if (!open) return null

  return (
    <SimpleSheetContainer
      isOpen={open}
      onOpenChange={onOpenChange}
      title="Candidate Profile"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-gray-600">Loading profile...</p>
        </div>
      ) : candidate ? (
        <>
          {editMode ? (
            <ProfileEditMode
              candidate={candidate}
              onSave={handleSaveProfile}
              onCancel={() => setEditMode(false)}
            />
          ) : (
            <>
              {/* Header */}
              <SheetHeader
                title={candidate.name}
                subtitle={candidate.position}
                avatarFallback={getInitials(candidate.name)}
                actions={[
                  ...(allowEdit
                    ? [
                        {
                          label: 'Edit Profile',
                          icon: Edit,
                          variant: 'outline',
                          onClick: () => setEditMode(true),
                        },
                      ]
                    : []),
                ]}
              />

              {/* Render all visible sections */}
              {visibleSections.map((section) => {
                switch (section.id) {
                  case 'core-identity':
                    return (
                      <CoreIdentitySection
                        key={section.id}
                        candidate={candidate}
                      />
                    )

                  case 'skills-experience':
                    return (
                      <SkillsExperienceSection
                        key={section.id}
                        candidate={candidate}
                      />
                    )

                  case 'portfolio':
                    return (
                      <PortfolioSection
                        key={section.id}
                        candidate={candidate}
                      />
                    )

                  case 'interview-summary':
                    return (
                      <InterviewSummarySection
                        key={`${section.id}-${resetKey}`}
                        interviews={interviews}
                        onViewInterview={handleViewInterview}
                      />
                    )

                  case 'recommendations':
                    return (
                      <SheetSection
                        key={section.id}
                        title={section.title}
                        description={section.description}
                        icon={TrendingUp}
                        comingSoon
                        comingSoonMessage="AI-powered talent fit scores, suggested roles, and performance predictions will appear here."
                      />
                    )

                  case 'verification':
                    return (
                      <SheetSection
                        key={section.id}
                        title={section.title}
                        description={section.description}
                        icon={Shield}
                        comingSoon
                        comingSoonMessage="Identity verification, trust scores, and integrity checks will appear here."
                      />
                    )

                  case 'performance':
                    return (
                      <SheetSection
                        key={section.id}
                        title={section.title}
                        description={section.description}
                        icon={Award}
                        comingSoon
                        comingSoonMessage="Quality scores, accuracy rates, and reliability trends will appear here."
                      />
                    )

                  case 'projects-assignments':
                    return (
                      <ProjectsAssignmentsSection
                        key={section.id}
                        assignments={assignments}
                        onViewProject={handleViewProject}
                      />
                    )

                  case 'activity-log':
                    return (
                      <ActivityLogSection
                        key={section.id}
                        candidate={candidate}
                      />
                    )

                  default:
                    return null
                }
              })}
            </>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-gray-600">Candidate not found</p>
        </div>
      )}
    </SimpleSheetContainer>
  )
}

// ============================================================================
// SECTION COMPONENTS
// ============================================================================

function CoreIdentitySection({ candidate }) {
  return (
    <SheetInfoSection
      title="Core Identity & Contact"
      icon={User}
      items={[
        { label: 'Name', value: candidate.name },
        { label: 'Email', value: candidate.email },
        { label: 'Position', value: candidate.position },
        {
          label: 'Member Since',
          value: new Date(candidate.created_at).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          }),
        },
      ]}
    />
  )
}

function SkillsExperienceSection({ candidate }) {
  return (
    <SheetSection title="Skills & Experience" icon={Briefcase}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-neutral-500 mb-2 block">
            Experience Level
          </label>
          <p className="text-sm text-neutral-900">
            {candidate.experience_years}{' '}
            {candidate.experience_years === 1 ? 'year' : 'years'}
          </p>
        </div>

        {candidate.skills && candidate.skills.length > 0 && (
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-2 block">
              Skills
            </label>
            <div className="flex flex-wrap gap-2">
              {candidate.skills.map((skill, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="bg-blue-50 text-blue-600 border-blue-200"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {candidate.bio && (
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-2 block">
              Bio
            </label>
            <Card className="p-4 border border-gray-200 rounded-lg bg-neutral-50">
              <p className="text-sm text-neutral-700 whitespace-pre-wrap">
                {candidate.bio}
              </p>
            </Card>
          </div>
        )}
      </div>
    </SheetSection>
  )
}

function PortfolioSection({ candidate }) {
  return (
    <SheetSection title="Portfolio & Background" icon={GraduationCap}>
      <div className="space-y-4">
        {candidate.education && (
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-2 block">
              Education
            </label>
            <Card className="p-4 border border-gray-200 rounded-lg bg-neutral-50">
              <p className="text-sm text-neutral-700">{candidate.education}</p>
            </Card>
          </div>
        )}

        {candidate.resume_url && (
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-2 block">
              Resume
            </label>
            <a
              href={candidate.resume_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 hover:underline"
            >
              <FileText className="w-4 h-4" />
              View Resume
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </SheetSection>
  )
}

function InterviewSummarySection({ interviews, onViewInterview }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const completedInterview = interviews.find((i) => i.summary)

  if (!completedInterview) {
    return null
  }

  return (
    <SheetSection title="Interview Summary" icon={FileText}>
      <ExpandableTextWithAction
        text={completedInterview.summary}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewInterview(completedInterview.id)}
            className="mt-3"
          >
            View Full Interview
          </Button>
        }
      />
    </SheetSection>
  )
}

/**
 * Expandable text with blur effect and optional action button
 */
function ExpandableTextWithAction({ text, isExpanded, onToggle, action }) {
  const COLLAPSED_HEIGHT = 150
  const needsExpansion = text.length > 300

  return (
    <div>
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

      {action}
    </div>
  )
}

function ProjectsAssignmentsSection({ assignments, onViewProject }) {
  return (
    <SheetListSection
      title="Projects & Assignments"
      icon={Briefcase}
      items={assignments}
      emptyMessage="No active assignments"
      renderItem={(assignment) => (
        <button
          onClick={() => onViewProject(assignment.project_id)}
          className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-neutral-900 block">
                {assignment.project_name || 'Project'}
              </span>
              <span className="text-xs text-neutral-600">
                Status: {assignment.status}
              </span>
            </div>
            <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-brand-600 transition-colors" />
          </div>
        </button>
      )}
    />
  )
}

function ActivityLogSection({ candidate }) {
  return (
    <SheetInfoSection
      title="Activity & Audit Log"
      columns={1}
      items={[
        {
          label: 'Profile Created',
          value: new Date(candidate.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        },
        {
          label: 'Last Updated',
          value: candidate.updated_at
            ? new Date(candidate.updated_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Not available',
        },
      ]}
    />
  )
}

// ============================================================================
// EDIT MODE COMPONENT
// ============================================================================

function ProfileEditMode({ candidate, onSave, onCancel }) {
  const steps = [
    {
      id: 'basic-info',
      title: 'Basic Information',
      description: 'Update name, email, and position',
      render: ({ formData, updateFormData }) => (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-700 mb-1 block">
              Name
            </label>
            <Input
              value={formData.name || ''}
              onChange={(e) => updateFormData({ name: e.target.value })}
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 mb-1 block">
              Email
            </label>
            <Input
              type="email"
              value={formData.email || ''}
              onChange={(e) => updateFormData({ email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 mb-1 block">
              Position
            </label>
            <Input
              value={formData.position || ''}
              onChange={(e) => updateFormData({ position: e.target.value })}
              placeholder="Job title or role"
            />
          </div>
        </div>
      ),
      validate: (data) => {
        if (!data.name || data.name.trim().length === 0) {
          return { valid: false, error: 'Name is required' }
        }
        if (!data.email || !data.email.includes('@')) {
          return { valid: false, error: 'Valid email is required' }
        }
        return { valid: true }
      },
    },
    {
      id: 'skills-experience',
      title: 'Skills & Experience',
      description: 'Update skills and experience level',
      render: ({ formData, updateFormData }) => (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-700 mb-1 block">
              Skills (comma-separated)
            </label>
            <Input
              value={
                Array.isArray(formData.skills) ? formData.skills.join(', ') : ''
              }
              onChange={(e) => {
                const skillsArray = e.target.value
                  .split(',')
                  .map((s) => s.trim())
                updateFormData({ skills: skillsArray })
              }}
              placeholder="JavaScript, React, Design..."
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 mb-1 block">
              Years of Experience
            </label>
            <Input
              type="number"
              value={formData.experience_years || 0}
              onChange={(e) =>
                updateFormData({
                  experience_years: parseInt(e.target.value, 10),
                })
              }
              min="0"
              max="50"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 mb-1 block">
              Bio
            </label>
            <Textarea
              value={formData.bio || ''}
              onChange={(e) => updateFormData({ bio: e.target.value })}
              placeholder="Brief professional bio..."
              rows={4}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'portfolio',
      title: 'Portfolio & Background',
      description: 'Update education and portfolio information',
      render: ({ formData, updateFormData }) => (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-700 mb-1 block">
              Education
            </label>
            <Textarea
              value={formData.education || ''}
              onChange={(e) => updateFormData({ education: e.target.value })}
              placeholder="Degree, institution, field of study..."
              rows={3}
            />
          </div>
        </div>
      ),
    },
  ]

  return (
    <SteppedEditor
      steps={steps}
      initialData={candidate}
      onComplete={onSave}
      onCancel={onCancel}
      title="Edit Profile"
      subtitle="Update your profile information"
    />
  )
}
