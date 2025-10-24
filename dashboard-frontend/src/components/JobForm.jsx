import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { User, Target, ListChecks, Paintbrush, X, Plus } from 'lucide-react'

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

const JobForm = ({ open, onClose, onSubmit }) => {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    position_type: '',
    pay_per_hour: '',
    availability: '',
    interview_type: 'standard',
    skills: [],
    custom_questions: [],
    custom_exercise_prompt: '',
  })
  const [loading, setLoading] = useState(false)
  const [customPositionType, setCustomPositionType] = useState('')

  // Skills state
  const [skillName, setSkillName] = useState('')
  const [skillDescription, setSkillDescription] = useState('')

  // Custom questions state
  const [currentQuestion, setCurrentQuestion] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePositionTypeChange = (value) => {
    if (value === 'Other') {
      setFormData((prev) => ({ ...prev, position_type: '' }))
      setCustomPositionType('')
    } else {
      setFormData((prev) => ({ ...prev, position_type: value }))
      setCustomPositionType('')
    }
  }

  const handleCustomPositionTypeChange = (e) => {
    const value = e.target.value
    setCustomPositionType(value)
    setFormData((prev) => ({ ...prev, position_type: value }))
  }

  const handleTypeSelect = (typeId) => {
    setFormData((prev) => ({ ...prev, interview_type: typeId }))
  }

  const addSkill = () => {
    if (skillName.trim() && formData.skills.length < 5) {
      setFormData((prev) => ({
        ...prev,
        skills: [
          ...prev.skills,
          {
            name: skillName.trim(),
            description: skillDescription.trim() || null,
          },
        ],
      }))
      setSkillName('')
      setSkillDescription('')
    }
  }

  const removeSkill = (index) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }))
  }

  const addQuestion = () => {
    if (currentQuestion.trim() && formData.custom_questions.length < 20) {
      setFormData((prev) => ({
        ...prev,
        custom_questions: [...prev.custom_questions, currentQuestion.trim()],
      }))
      setCurrentQuestion('')
    }
  }

  const removeQuestion = (index) => {
    setFormData((prev) => ({
      ...prev,
      custom_questions: prev.custom_questions.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Remove empty optional fields
      const submitData = { ...formData }
      if (submitData.skills.length === 0) delete submitData.skills
      if (submitData.custom_questions.length === 0)
        delete submitData.custom_questions
      if (!submitData.custom_exercise_prompt)
        delete submitData.custom_exercise_prompt

      // Convert pay_per_hour to number or remove if empty
      if (submitData.pay_per_hour) {
        submitData.pay_per_hour = parseFloat(submitData.pay_per_hour)
      } else {
        delete submitData.pay_per_hour
      }

      await onSubmit(submitData)
      // Reset form
      setFormData({
        title: '',
        description: '',
        position_type: '',
        pay_per_hour: '',
        availability: '',
        interview_type: 'standard',
        skills: [],
        custom_questions: [],
        custom_exercise_prompt: '',
      })
      setCustomPositionType('')
      setStep(1)
      onClose()
    } catch (error) {
      console.error('Error creating job:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setStep(1)
  }

  const renderJobDetails = () => (
    <>
      <div className="space-y-4 pt-2 pb-4">
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-medium">
            Job Title
          </Label>
          <Input
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. UX/UI Designer, Motion Graphic Artist, Creative Director"
            required
            className="w-full"
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
            <SelectTrigger className="w-full h-10 rounded-lg text-sm">
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
          {formData.position_type === 'Other' && (
            <Input
              id="custom_position_type"
              name="custom_position_type"
              value={customPositionType}
              onChange={handleCustomPositionTypeChange}
              placeholder="Enter custom position type"
              required
              className="w-full mt-2"
            />
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="pay_per_hour" className="text-sm font-medium">
            Pay Per Hour (optional)
          </Label>
          <Input
            id="pay_per_hour"
            name="pay_per_hour"
            type="number"
            step="0.01"
            min="0"
            value={formData.pay_per_hour}
            onChange={handleChange}
            placeholder="e.g. 75.00"
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="availability" className="text-sm font-medium">
            Availability Requirements (optional)
          </Label>
          <Input
            id="availability"
            name="availability"
            value={formData.availability}
            onChange={handleChange}
            placeholder="e.g. Remote-friendly (US time zones), 40 hours/week, flexible schedule"
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">
            Description
          </Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe the role, responsibilities, and requirements..."
            rows={5}
            required
            className="w-full resize-none"
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={loading}
          className="rounded-lg"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => setStep(2)}
          disabled={
            !formData.title || !formData.position_type || !formData.description
          }
          className="rounded-lg bg-brand-500 hover:bg-brand-600 text-white"
        >
          Next: Interview Type
        </Button>
      </DialogFooter>
    </>
  )

  const renderTypeSelection = () => (
    <>
      <div className="py-4">
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
          {INTERVIEW_TYPES.map((type) => {
            const Icon = type.icon
            const isSelected = formData.interview_type === type.id
            return (
              <Card
                key={type.id}
                onClick={() => handleTypeSelect(type.id)}
                className={`p-4 cursor-pointer transition-all hover:shadow-md hover:border-brand-500 hover:bg-brand-50 ${
                  isSelected
                    ? 'border border-brand-500 bg-brand-50'
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
                    <p className="text-xs text-neutral-600">
                      {type.description}
                    </p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={loading}
          className="rounded-lg"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={() => setStep(3)}
          disabled={!formData.interview_type}
          className="rounded-lg bg-brand-500 hover:bg-brand-600 text-white"
        >
          Next: Configure Interview
        </Button>
      </DialogFooter>
    </>
  )

  const renderConfiguration = () => (
    <>
      <div className="py-4 space-y-6 max-h-[500px] overflow-y-auto pr-2">
        {/* Skills */}
        {formData.interview_type !== 'custom_exercise' && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Skills to assess (optional, up to 5)
            </Label>
            <div className="space-y-2">
              {formData.skills.map((skill, index) => (
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
              {formData.skills.length < 5 && (
                <div className="space-y-2">
                  <Input
                    placeholder="Skill name (e.g., Creative Direction)"
                    value={skillName}
                    onChange={(e) => setSkillName(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && (e.preventDefault(), addSkill())
                    }
                    className="w-full"
                  />
                  <Textarea
                    placeholder="Description (optional)"
                    value={skillDescription}
                    onChange={(e) => setSkillDescription(e.target.value)}
                    rows={2}
                    className="w-full resize-none"
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
              {formData.custom_questions.map((question, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-3 bg-neutral-50 rounded-lg"
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
              {formData.custom_questions.length < 20 && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Enter your question..."
                    value={currentQuestion}
                    onChange={(e) => setCurrentQuestion(e.target.value)}
                    rows={3}
                    className="w-full resize-none"
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
          <div className="space-y-3">
            <Label
              htmlFor="custom_exercise_prompt"
              className="text-sm font-medium"
            >
              Custom Exercise Prompt
            </Label>
            <Textarea
              id="custom_exercise_prompt"
              name="custom_exercise_prompt"
              value={formData.custom_exercise_prompt}
              onChange={handleChange}
              placeholder="Describe the creative exercise or portfolio evaluation criteria..."
              rows={6}
              className="w-full resize-none"
            />
          </div>
        )}
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep(2)}
          disabled={loading}
          className="rounded-lg"
        >
          Back
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-500 hover:bg-brand-600 text-white"
        >
          {loading ? 'Creating...' : 'Create Job'}
        </Button>
      </DialogFooter>
    </>
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-display font-bold">
            {step === 1
              ? 'Create New Job'
              : step === 2
                ? 'Select Interview Type'
                : 'Configure Interview'}
          </DialogTitle>
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map((stepNum) => (
              <div
                key={stepNum}
                className={`h-1 flex-1 rounded-full ${
                  step >= stepNum ? 'bg-brand-500' : 'bg-neutral-200'
                }`}
              />
            ))}
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {step === 1 && renderJobDetails()}
          {step === 2 && renderTypeSelection()}
          {step === 3 && renderConfiguration()}
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default JobForm
