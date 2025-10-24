import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { User, FileText, Brain, Code, MessageSquare, Terminal, Wand2, CheckCircle, X, Plus, Trash2, Upload, AlertCircle, Briefcase } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cardStyles } from '@/lib/design-system'
import axios from 'axios'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API = `${BACKEND_URL}/api`

// CENTRALIZED INTERVIEW TYPE DEFINITIONS
// These definitions match backend/config/interview_type_definitions.py exactly
const INTERVIEW_TYPES = [
  {
    id: 'standard',
    title: 'Standard interview',
    description: 'This is a conversational interview to assess for any role (UX designer, filmmaker, art director, copywriter, and more)',
    icon: User,
  },
  {
    id: 'human_data',
    title: 'Design critique & feedback exercise',
    description: 'This is a conversational interview and a design feedback/critique exercise to assess creative direction and feedback skills',
    icon: Brain,
  },
  {
    id: 'custom_questions',
    title: 'Custom questions only',
    description: 'In this interview, you get to add/edit up to 20 custom questions tailored to your role',
    icon: MessageSquare,
  },
  {
    id: 'custom_exercise',
    title: 'Custom Creative Exercise',
    description: 'Add a custom creative brief and get audio responses—AI evaluates creative thinking and problem-solving.',
    icon: Wand2,
  },
]

const createEmptySkills = () => [
  { name: '', description: '' },
  { name: '', description: '' },
  { name: '', description: '' },
  { name: '', description: '' },
]

const InterviewCreationModal = ({ open, onClose, candidate, onSuccess }) => {
  const [step, setStep] = useState(1) // 1: Job selection, 2: Type selection, 3: Skills definition
  const [jobs, setJobs] = useState([])
  const [selectedJob, setSelectedJob] = useState(null)
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [selectedType, setSelectedType] = useState('standard')
  const [skills, setSkills] = useState(createEmptySkills)
  const [customQuestions, setCustomQuestions] = useState([''])
  const [customExercisePrompt, setCustomExercisePrompt] = useState('')
  const [resumeText, setResumeText] = useState('')
  const [resumeFile, setResumeFile] = useState(null)
  const [uploadingResume, setUploadingResume] = useState(false)
  const [resumeError, setResumeError] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (open) {
      fetchJobs()
    } else {
      setStep(1)
      setSelectedJob(null)
      setResumeText('')
      setResumeFile(null)
      setResumeError('')
    }
  }, [open])

  useEffect(() => {
    if (!selectedJob) {
      setSelectedType('standard')
      setSkills(createEmptySkills())
      setCustomQuestions([''])
      setCustomExercisePrompt('')
      return
    }

    const jobType = selectedJob.interview_type || 'standard'
    setSelectedType(jobType)

    if (Array.isArray(selectedJob.skills) && selectedJob.skills.length > 0) {
      const mappedSkills = selectedJob.skills.map((skill) => ({
        name: skill?.name || '',
        description: skill?.description || '',
      }))
      setSkills(mappedSkills)
    } else {
      setSkills(createEmptySkills())
    }

    const jobQuestions = Array.isArray(selectedJob.custom_questions)
      ? selectedJob.custom_questions.filter((q) => typeof q === 'string' && q.trim() !== '')
      : []
    setCustomQuestions(jobQuestions.length ? jobQuestions : [''])

    setCustomExercisePrompt(selectedJob.custom_exercise_prompt || '')
  }, [selectedJob])

  const fetchJobs = async () => {
    try {
      setLoadingJobs(true)
      const response = await axios.get(`${API}/jobs`)
      const availableJobs = response.data.filter((job) =>
        ['pending', 'in_progress'].includes(job.status)
      )
      setJobs(availableJobs)
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoadingJobs(false)
    }
  }

  const handleTypeSelect = (typeId) => {
    setSelectedType(typeId)
  }

  const handleNext = () => {
    if (step === 1) {
      if (!selectedJob) return
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    }
  }

  const handleBack = () => {
    if (step === 2) {
      setStep(1)
    } else if (step === 3) {
      setStep(2)
    }
  }

  const addSkill = () => {
    if (skills.length < 5) {
      setSkills([...skills, { name: '', description: '' }])
    }
  }

  const removeSkill = (index) => {
    setSkills(skills.filter((_, i) => i !== index))
  }

  const updateSkill = (index, field, value) => {
    const newSkills = [...skills]
    newSkills[index][field] = value
    setSkills(newSkills)
  }

  const addQuestion = () => {
    if (customQuestions.length < 20) {
      setCustomQuestions([...customQuestions, ''])
    }
  }

  const removeQuestion = (index) => {
    setCustomQuestions(customQuestions.filter((_, i) => i !== index))
  }

  const updateQuestion = (index, value) => {
    const newQuestions = [...customQuestions]
    newQuestions[index] = value
    setCustomQuestions(newQuestions)
  }

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setResumeFile(file)
    setUploadingResume(true)
    setResumeError('')

    try {
      const formData = new FormData()
      formData.append('resume', file)

      const response = await axios.post(`${API}/interviews/upload/resume`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.data.success) {
        setResumeText(response.data.resume_text)
      } else {
        setResumeError(response.data.error || 'Failed to extract text from resume')
        setResumeFile(null)
      }
    } catch (error) {
      console.error('Error uploading resume:', error)
      setResumeError('Failed to upload resume. Please try again.')
      setResumeFile(null)
    } finally {
      setUploadingResume(false)
    }
  }

  const handleCreate = async () => {
    setCreating(true)

    try {
      if (!selectedJob) {
        alert('Please select a job before creating an interview.')
        setCreating(false)
        return
      }

      // Filter out empty skills
      const filteredSkills = skills
        .filter((skill) => skill.name.trim() !== '')
        .map((skill) => ({
          name: skill.name,
          description: skill.description || null,
        }))

      // Filter out empty questions
      const filteredQuestions = customQuestions.filter((q) => q.trim() !== '')

      const interviewData = {
        candidate_id: candidate.id,
        job_id: selectedJob.id,
        interview_type: selectedType,
        skills: filteredSkills.length > 0 ? filteredSkills : null,
        custom_questions:
          selectedType === 'custom_questions' && filteredQuestions.length > 0
            ? filteredQuestions
            : null,
        custom_exercise_prompt:
          selectedType === 'custom_exercise' && customExercisePrompt.trim() !== ''
            ? customExercisePrompt
            : null,
        resume_text: selectedType === 'resume_based' && resumeText ? resumeText : null,
      }

      const response = await axios.post(`${API}/interviews`, interviewData)

      if (response.data) {
        onSuccess(response.data)
        setSelectedJob(null)
        setSelectedType('standard')
        setSkills(createEmptySkills())
        setCustomQuestions([''])
        setCustomExercisePrompt('')
        setResumeText('')
        setResumeFile(null)
        setResumeError('')
        setStep(1)
        onClose()
      }
    } catch (error) {
      console.error('Error creating interview:', error)
      alert('Failed to create interview. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const renderJobSelection = () => (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-neutral-900">Select a job</h3>
      <p className="text-xs text-neutral-600">
        Interviews inherit their configuration and title from jobs. Choose an active job so the AI introduces the correct role to the candidate.
      </p>

      {loadingJobs ? (
        <div className="p-6 text-center border border-dashed border-neutral-200 rounded-lg text-sm text-neutral-600">
          Loading jobs...
        </div>
      ) : jobs.length === 0 ? (
        <Card className={`p-6 text-center ${cardStyles.default}`}>
          <p className="text-sm text-neutral-600">
            No active jobs available. Create a job first, then return to schedule the interview.
          </p>
        </Card>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {jobs.map((job) => {
            const isSelected = selectedJob?.id === job.id

            return (
              <Card
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`p-4 cursor-pointer transition-all ${cardStyles.default} ${
                  isSelected ? 'border-2 border-brand-500 bg-brand-50' : 'hover:border-brand-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-brand-100 text-brand-600' : 'bg-neutral-100 text-neutral-600'}`}>
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-sm text-neutral-900">{job.title}</h4>
                        <p className="text-xs text-neutral-600 mt-1 line-clamp-2">{job.description}</p>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">
                        {job.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    {job.position_type && (
                      <p className="text-xs text-neutral-500 mt-2">{job.position_type}</p>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <div className="flex justify-between gap-2 pt-4">
        <Button onClick={onClose} variant="outline" className="rounded-lg">
          Cancel
        </Button>
        <Button
          onClick={handleNext}
          disabled={!selectedJob}
          className="rounded-lg bg-brand-500 hover:bg-brand-600 text-white"
        >
          Next: Interview Type
        </Button>
      </div>
    </div>
  )

  const renderJobSummary = () => (
    selectedJob && (
      <div className="p-4 rounded-lg border border-brand-200 bg-brand-50">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-brand-100 text-brand-600">
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-neutral-900">{selectedJob.title}</p>
            {selectedJob.position_type && (
              <p className="text-xs text-neutral-600">{selectedJob.position_type}</p>
            )}
          </div>
        </div>
      </div>
    )
  )

  const renderTypeSelection = () => (
    <div className="space-y-4">
      {renderJobSummary()}

      <h3 className="text-base font-semibold text-neutral-900">Select the interview type</h3>

      <div className="space-y-3">
        {INTERVIEW_TYPES.map((type) => {
          const Icon = type.icon
          const isSelected = selectedType === type.id

          return (
            <Card
              key={type.id}
              onClick={() => handleTypeSelect(type.id)}
              className={`p-4 cursor-pointer transition-all ${cardStyles.default} ${
                isSelected ? 'border-2 border-brand-500 bg-brand-50' : 'hover:border-brand-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-brand-100 text-brand-600' : 'bg-neutral-100 text-neutral-600'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm text-neutral-900">{type.title}</h4>
                    {isSelected && <CheckCircle className="w-5 h-5 text-brand-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-neutral-600 mt-1">{type.description}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="flex justify-between gap-2 pt-4">
        <Button onClick={handleBack} variant="outline" className="rounded-lg">
          Back
        </Button>
        <div className="flex gap-2">
          <Button onClick={onClose} variant="outline" className="rounded-lg">
            Cancel
          </Button>
          <Button
            onClick={handleNext}
            className="rounded-lg bg-brand-500 hover:bg-brand-600 text-white"
          >
            Next: Configure interview
          </Button>
        </div>
      </div>
    </div>
  )

  const renderSkillDefinition = () => (
    <div className="space-y-4">
      {renderJobSummary()}

      <div>
        <h3 className="text-base font-semibold text-neutral-900 mb-1">Defined skills</h3>
        <p className="text-xs text-neutral-600">
          Define the skills you want to test candidates on. It can be any skill from sales negotiation to react.js and beyond.
          The optional description can be used to refine the questions or avoid certain areas within the skill.
        </p>
      </div>

      {/* Skills */}
      {selectedType !== 'custom_questions' && selectedType !== 'custom_exercise' && (
        <div className="space-y-3">
          {skills.map((skill, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                  <Input
                    placeholder={`Enter skill #${index + 1}`}
                    value={skill.name}
                    onChange={(e) => updateSkill(index, 'name', e.target.value)}
                    className="pl-10"
                  />
                </div>
                {skills.length > 1 && (
                  <Button
                    onClick={() => removeSkill(index)}
                    variant="outline"
                    size="icon"
                    className="flex-shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="relative">
                <AlignLeft className="absolute left-3 top-3 text-neutral-400 w-4 h-4" />
                <Textarea
                  placeholder="Feel free to describe the skill in 1-2 sentences to further tailor the questions (optional)"
                  value={skill.description}
                  onChange={(e) => updateSkill(index, 'description', e.target.value)}
                  className="pl-10 min-h-[60px]"
                />
              </div>
            </div>
          ))}

          {skills.length < 5 && (
            <Button
              onClick={addSkill}
              variant="ghost"
              className="text-brand-600 hover:text-brand-700 hover:bg-brand-50 text-sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add another skill (up to {5 - skills.length} more)
            </Button>
          )}
        </div>
      )}

      {/* Resume Upload for resume_based type */}
      {selectedType === 'resume_based' && (
        <div className="mt-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
          <label className="block text-sm font-medium text-neutral-900 mb-2">
            Upload Resume (Required)
          </label>
          <p className="text-xs text-neutral-600 mb-3">
            Upload the candidate's resume. Supported formats: PDF, TXT, DOC, DOCX
          </p>

          {!resumeFile && !resumeText && (
            <div className="relative">
              <input
                type="file"
                accept=".pdf,.txt,.doc,.docx"
                onChange={handleResumeUpload}
                className="hidden"
                id="resume-upload"
                disabled={uploadingResume}
              />
              <label
                htmlFor="resume-upload"
                className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-neutral-300 rounded-lg cursor-pointer hover:border-brand-500 hover:bg-brand-50 transition-colors"
              >
                <Upload className="w-5 h-5 text-neutral-500" />
                <span className="text-sm text-neutral-600">
                  {uploadingResume ? 'Uploading...' : 'Click to upload resume'}
                </span>
              </label>
            </div>
          )}

          {resumeFile && resumeText && (
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-neutral-900">{resumeFile.name}</p>
                  <p className="text-xs text-neutral-600">{resumeText.length} characters extracted</p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setResumeFile(null)
                  setResumeText('')
                }}
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {resumeError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200 mt-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-600">{resumeError}</p>
            </div>
          )}
        </div>
      )}

      {/* Custom Questions */}
      {selectedType === 'custom_questions' && (
        <div className="space-y-3">
          {customQuestions.map((question, index) => (
            <div key={index} className="flex items-start gap-2">
              <Textarea
                placeholder={`Question #${index + 1}`}
                value={question}
                onChange={(e) => updateQuestion(index, e.target.value)}
                className="flex-1"
                rows={2}
              />
              {customQuestions.length > 1 && (
                <Button
                  onClick={() => removeQuestion(index)}
                  variant="outline"
                  size="icon"
                  className="flex-shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}

          {customQuestions.length < 20 && (
            <Button
              onClick={addQuestion}
              variant="ghost"
              className="text-brand-600 hover:text-brand-700 hover:bg-brand-50 text-sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add another question (up to {20 - customQuestions.length} more)
            </Button>
          )}
        </div>
      )}

      {/* Custom Exercise Prompt */}
      {selectedType === 'custom_exercise' && (
        <div>
          <label className="block text-sm font-medium text-neutral-900 mb-2">Exercise Prompt</label>
          <Textarea
            placeholder="Describe the exercise or task for the candidate..."
            value={customExercisePrompt}
            onChange={(e) => setCustomExercisePrompt(e.target.value)}
            className="min-h-[120px]"
          />
        </div>
      )}

      <div className="flex justify-between gap-2 pt-4">
        <Button onClick={handleBack} variant="outline" className="rounded-lg">
          Back
        </Button>
        <div className="flex gap-2">
          <Button onClick={onClose} variant="outline" className="rounded-lg">
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || (selectedType === 'resume_based' && !resumeText)}
            className="rounded-lg bg-brand-500 hover:bg-brand-600 text-white"
          >
            {creating ? 'Creating...' : 'Create Interview'}
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display font-bold text-neutral-900">
            Create an interview
            {candidate && <span className="text-brand-600"> for {candidate.name}</span>}
          </DialogTitle>
        </DialogHeader>

        {step === 1
          ? renderJobSelection()
          : step === 2
          ? renderTypeSelection()
          : renderSkillDefinition()}
      </DialogContent>
    </Dialog>
  )
}

// Missing icon imports
import { Target, AlignLeft } from 'lucide-react'

export default InterviewCreationModal
