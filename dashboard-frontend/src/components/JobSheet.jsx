import { useState, useEffect } from 'react'
import { SimpleSheetContainer } from './sheets/SheetContainer'
import { SteppedEditor } from './sheets/SteppedEditor'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { User, Target, ListChecks, Paintbrush, X, Plus } from 'lucide-react'
import { toast } from 'sonner'

const POSITION_TYPES = [
  'Full-time',
  'Part-time',
  'Contract',
  'Freelance',
  'Project-based',
  'Temporary',
  'Internship',
  'Other',
]

const INTERVIEW_TYPES = [
  {
    id: 'standard',
    title: 'Standard interview',
    description:
      'This is a conversational interview to assess for any role (UX designer, filmmaker, art director, copywriter, and more)',
    icon: User,
  },
  {
    id: 'human_data',
    title: 'Design critique & feedback exercise',
    description:
      'This is a conversational interview and a design feedback/critique exercise to assess creative direction and feedback skills',
    icon: Target,
  },
  {
    id: 'custom_questions',
    title: 'Custom questions only',
    description:
      'In this interview, you get to add/edit up to 20 custom questions tailored to your role',
    icon: ListChecks,
  },
  {
    id: 'custom_exercise',
    title: 'Custom Creative Exercise',
    description:
      'Add a custom creative brief and get audio responses—AI evaluates creative thinking and problem-solving.',
    icon: Paintbrush,
  },
]

/**
 * Job creation/editing slide-over using SteppedEditor
 * Converts the previous modal-based JobForm to a slide-over panel
 */
export default function JobSheet({
  open,
  onOpenChange,
  job = null,
  onSubmit,
  onCancel,
  isWrapper = false,
}) {
  const isEditMode = job !== null

  const handleSubmit = async (formData) => {
    try {
      // Clean up data
      const submitData = { ...formData }

      // Remove empty optional fields
      if (submitData.skills?.length === 0) delete submitData.skills
      if (submitData.custom_questions?.length === 0)
        delete submitData.custom_questions
      if (!submitData.custom_exercise_prompt)
        delete submitData.custom_exercise_prompt

      // Convert pay_per_hour to number or remove if empty
      if (submitData.pay_per_hour) {
        submitData.pay_per_hour = parseFloat(submitData.pay_per_hour)
      } else {
        delete submitData.pay_per_hour
      }

      // Call parent submit handler (which will handle edit mode clearing)
      await onSubmit(submitData, isEditMode ? job.id : null)

      toast.success(
        isEditMode ? 'Job updated successfully' : 'Job created successfully'
      )

      // Only close the sheet if creating new job, parent handles edit mode swap
      if (!isEditMode) {
        onOpenChange(false)
      }
    } catch (error) {
      console.error(
        isEditMode ? 'Error updating job:' : 'Error creating job:',
        error
      )
      const errorMsg =
        error.response?.data?.detail ||
        `Failed to ${isEditMode ? 'update' : 'create'} job`
      toast.error(errorMsg)
      throw error
    }
  }

  const handleCancel = () => {
    // Use custom onCancel if provided (for edit mode), otherwise close sheet
    if (onCancel) {
      onCancel()
    } else {
      onOpenChange(false)
    }
  }

  const steps = [
    {
      id: 'job-details',
      title: 'Job Details',
      description: 'Basic job information and requirements',
      render: ({ formData, updateFormData }) => (
        <JobDetailsStep formData={formData} updateFormData={updateFormData} />
      ),
      validate: (data) => {
        if (!data.title?.trim()) {
          return { valid: false, error: 'Job title is required' }
        }
        if (!data.position_type) {
          return { valid: false, error: 'Position type is required' }
        }
        if (!data.description?.trim()) {
          return { valid: false, error: 'Job description is required' }
        }
        return { valid: true }
      },
    },
    {
      id: 'interview-type',
      title: 'Interview Type',
      description: 'Select interview format and requirements',
      render: ({ formData, updateFormData }) => (
        <InterviewTypeStep
          formData={formData}
          updateFormData={updateFormData}
        />
      ),
      validate: (data) => {
        if (!data.interview_type) {
          return { valid: false, error: 'Interview type is required' }
        }
        return { valid: true }
      },
    },
    {
      id: 'configuration',
      title: 'Configuration',
      description: 'Skills, questions, and custom settings',
      render: ({ formData, updateFormData }) => (
        <ConfigurationStep
          formData={formData}
          updateFormData={updateFormData}
        />
      ),
    },
  ]

  const initialData = job
    ? {
        title: job.title || '',
        description: job.description || '',
        position_type: job.position_type || '',
        pay_per_hour: job.pay_per_hour ? String(job.pay_per_hour) : '',
        availability: job.availability || '',
        interview_type: job.interview_type || 'standard',
        skills: job.skills || [],
        custom_questions: job.custom_questions || [],
        custom_exercise_prompt: job.custom_exercise_prompt || '',
      }
    : {
        title: '',
        description: '',
        position_type: '',
        pay_per_hour: '',
        availability: '',
        interview_type: 'standard',
        skills: [],
        custom_questions: [],
        custom_exercise_prompt: '',
      }

  const content = (
    <SteppedEditor
      steps={steps}
      initialData={initialData}
      onComplete={handleSubmit}
      onCancel={handleCancel}
      title={isEditMode ? 'Edit Job' : 'Create New Job'}
      subtitle={
        isEditMode
          ? 'Update job details and configuration'
          : 'Set up a new job posting'
      }
    />
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
      title={isEditMode ? 'Edit Job' : 'Create Job'}
    >
      {content}
    </SimpleSheetContainer>
  )
}

// ============================================================================
// STEP COMPONENTS
// ============================================================================

function JobDetailsStep({ formData, updateFormData }) {
  const [customPositionType, setCustomPositionType] = useState('')

  const handlePositionTypeChange = (value) => {
    if (value === 'Other') {
      updateFormData({ position_type: '' })
      setCustomPositionType('')
    } else {
      updateFormData({ position_type: value })
      setCustomPositionType('')
    }
  }

  const handleCustomPositionTypeChange = (e) => {
    const value = e.target.value
    setCustomPositionType(value)
    updateFormData({ position_type: value })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium">
          Job Title
        </Label>
        <Input
          id="title"
          value={formData.title || ''}
          onChange={(e) => updateFormData({ title: e.target.value })}
          placeholder="e.g. UX/UI Designer, Motion Graphic Artist, Creative Director"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="position_type" className="text-sm font-medium">
          Position Type
        </Label>
        <Select
          value={formData.position_type || undefined}
          onValueChange={handlePositionTypeChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select position type" />
          </SelectTrigger>
          <SelectContent>
            {POSITION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {formData.position_type === '' && customPositionType === '' && (
          <Input
            placeholder="Enter custom position type"
            value={customPositionType}
            onChange={handleCustomPositionTypeChange}
            className="mt-2"
          />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="pay_per_hour" className="text-sm font-medium">
          Pay Per Hour (optional)
        </Label>
        <Input
          id="pay_per_hour"
          type="number"
          step="0.01"
          min="0"
          value={formData.pay_per_hour || ''}
          onChange={(e) => updateFormData({ pay_per_hour: e.target.value })}
          placeholder="e.g. 75.00"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="availability" className="text-sm font-medium">
          Availability Requirements (optional)
        </Label>
        <Input
          id="availability"
          value={formData.availability || ''}
          onChange={(e) => updateFormData({ availability: e.target.value })}
          placeholder="e.g. Remote-friendly (US time zones), 40 hours/week, flexible schedule"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          Description
        </Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => updateFormData({ description: e.target.value })}
          placeholder="Describe the role, responsibilities, and requirements..."
          rows={5}
          required
          className="resize-none"
        />
      </div>
    </div>
  )
}

function InterviewTypeStep({ formData, updateFormData }) {
  const handleTypeSelect = (typeId) => {
    updateFormData({ interview_type: typeId })
  }

  return (
    <div className="space-y-3">
      {INTERVIEW_TYPES.map((type) => {
        const Icon = type.icon
        const isSelected = formData.interview_type === type.id
        return (
          <Card
            key={type.id}
            onClick={() => handleTypeSelect(type.id)}
            className={`p-4 cursor-pointer transition-all hover:shadow-md hover:border-brand-500 hover:bg-brand-50 ${
              isSelected
                ? 'border-2 border-brand-500 bg-brand-50'
                : 'border border-neutral-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg ${isSelected ? 'bg-brand-100' : 'bg-neutral-100'}`}
              >
                <Icon
                  className={`w-5 h-5 ${isSelected ? 'text-brand-600' : 'text-neutral-600'}`}
                />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">{type.title}</h4>
                <p className="text-xs text-neutral-600">{type.description}</p>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function ConfigurationStep({ formData, updateFormData }) {
  const [skillName, setSkillName] = useState('')
  const [skillDescription, setSkillDescription] = useState('')
  const [currentQuestion, setCurrentQuestion] = useState('')

  const addSkill = () => {
    if (skillName.trim() && (formData.skills || []).length < 5) {
      const newSkills = [
        ...(formData.skills || []),
        {
          name: skillName.trim(),
          description: skillDescription.trim() || null,
        },
      ]
      updateFormData({ skills: newSkills })
      setSkillName('')
      setSkillDescription('')
    }
  }

  const removeSkill = (index) => {
    const newSkills = (formData.skills || []).filter((_, i) => i !== index)
    updateFormData({ skills: newSkills })
  }

  const addQuestion = () => {
    if (
      currentQuestion.trim() &&
      (formData.custom_questions || []).length < 20
    ) {
      const newQuestions = [
        ...(formData.custom_questions || []),
        currentQuestion.trim(),
      ]
      updateFormData({ custom_questions: newQuestions })
      setCurrentQuestion('')
    }
  }

  const removeQuestion = (index) => {
    const newQuestions = (formData.custom_questions || []).filter(
      (_, i) => i !== index
    )
    updateFormData({ custom_questions: newQuestions })
  }

  return (
    <div className="space-y-6">
      {/* Skills */}
      {formData.interview_type !== 'custom_exercise' && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Skills to assess (optional, up to 5)
          </Label>
          <div className="space-y-2">
            {(formData.skills || []).map((skill, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-3 bg-neutral-50 rounded-lg border border-neutral-200"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{skill.name}</div>
                  {skill.description && (
                    <div className="text-xs text-neutral-600 mt-1">
                      {skill.description}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeSkill(index)}
                  className="text-neutral-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {(formData.skills || []).length < 5 && (
              <div className="space-y-2">
                <Input
                  placeholder="Skill name (e.g., Creative Direction)"
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && (e.preventDefault(), addSkill())
                  }
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={skillDescription}
                  onChange={(e) => setSkillDescription(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
                <Button
                  type="button"
                  onClick={addSkill}
                  disabled={!skillName.trim()}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Skill
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Questions */}
      {formData.interview_type === 'custom_questions' && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Custom Questions (up to 20)
          </Label>
          <div className="space-y-2">
            {(formData.custom_questions || []).map((question, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-3 bg-neutral-50 rounded-lg border border-neutral-200"
              >
                <span className="text-xs text-neutral-500 font-medium min-w-[20px]">
                  {index + 1}.
                </span>
                <p className="flex-1 text-sm">{question}</p>
                <button
                  type="button"
                  onClick={() => removeQuestion(index)}
                  className="text-neutral-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {(formData.custom_questions || []).length < 20 && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Enter a custom question..."
                  value={currentQuestion}
                  onChange={(e) => setCurrentQuestion(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <Button
                  type="button"
                  onClick={addQuestion}
                  disabled={!currentQuestion.trim()}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Exercise Prompt */}
      {formData.interview_type === 'custom_exercise' && (
        <div className="space-y-2">
          <Label
            htmlFor="custom_exercise_prompt"
            className="text-sm font-medium"
          >
            Custom Exercise Prompt
          </Label>
          <Textarea
            id="custom_exercise_prompt"
            value={formData.custom_exercise_prompt || ''}
            onChange={(e) =>
              updateFormData({ custom_exercise_prompt: e.target.value })
            }
            placeholder="Describe the creative exercise or brief..."
            rows={6}
            className="resize-none"
          />
          <p className="text-xs text-neutral-600">
            The AI will use this prompt to evaluate the candidate's creative
            thinking and problem-solving skills.
          </p>
        </div>
      )}
    </div>
  )
}
