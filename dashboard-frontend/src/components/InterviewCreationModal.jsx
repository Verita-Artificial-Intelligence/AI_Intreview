import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { User, FileText, Brain, Code, MessageSquare, Terminal, Wand2, CheckCircle, X, Plus, Trash2, Upload, AlertCircle, Target, AlignLeft } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cardStyles } from '@/components/ui/dialog'
import axios from 'axios'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API = `${BACKEND_URL}/api`

const INTERVIEW_TYPES = [
  {
    id: 'standard',
    title: 'Standard interview',
    description: 'This is a conversational interview to assess for any role (customer support, sales, marketing, and more)',
    icon: User,
  },
  {
    id: 'behavioral',
    title: 'Interview based on resume',
    description: 'This interview will be solely based on candidate\'s resume.',
    icon: FileText,
  },
  {
    id: 'technical',
    title: 'Human data interview',
    description: 'This is a conversational interview and a data annotation exercise to assess subject-matter experts for human data projects',
    icon: Brain,
  },
  {
    id: 'skills_based',
    title: 'Software engineer full interview',
    description: 'This is a conversational interview and a coding exercise to test software engineers of all types',
    icon: Code,
  },
]

const OTHER_INTERVIEW_TYPES = [
  {
    id: 'custom',
    title: 'Custom questions only',
    description: 'In this interview, you get to add/edit up to 20 custom questions',
    icon: MessageSquare,
  },
  {
    id: 'coding_exercise',
    title: 'Coding exercise only',
    description: 'This is a DSA style coding exercise that is 25 mins',
    icon: Terminal,
  },
  {
    id: 'custom_exercise',
    title: 'Custom exercise',
    description: 'Add a prompt (text or PDF) and get audio or text response—AI evaluates based on your custom task.',
    icon: Wand2,
  },
]

const InterviewCreationModal = ({ open, onClose, candidate, onSuccess }) => {
  const [step, setStep] = useState(1)
  const [jobs, setJobs] = useState([])
  const [selectedJob, setSelectedJob] = useState(null)
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [selectedType, setSelectedType] = useState('standard')
  const [showOtherTypes, setShowOtherTypes] = useState(false)
  const [skills, setSkills] = useState([
    { name: '', description: '' },
    { name: '', description: '' },
    { name: '', description: '' },
    { name: '', description: '' },
  ])
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
    }
  }, [open])

  const fetchJobs = async () => {
    try {
      setLoadingJobs(true)
      const response = await axios.get(`${API}/jobs`)
      setJobs(response.data.filter(job => job.status === 'open'))
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
      const filteredSkills = skills
        .filter((skill) => skill.name.trim() !== '')
        .map((skill) => ({
          name: skill.name,
          description: skill.description || null,
        }))

      const filteredQuestions = customQuestions.filter((q) => q.trim() !== '')

      const interviewData = {
        candidate_id: candidate.id,
        interview_type: selectedType,
        skills: filteredSkills.length > 0 ? filteredSkills : null,
        custom_questions:
          selectedType === 'custom' && filteredQuestions.length > 0
            ? filteredQuestions
            : null,
        custom_exercise_prompt:
          selectedType === 'custom_exercise' && customExercisePrompt.trim() !== ''
            ? customExercisePrompt
            : null,
        resume_text: selectedType === 'behavioral' && resumeText ? resumeText : null,
      }

      const response = await axios.post(`${API}/interviews`, interviewData)

      if (response.data) {
        onSuccess(response.data)
        onClose()
      }
    } catch (error) {
      console.error('Error creating interview:', error)
      alert('Failed to create interview. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const renderTypeSelection = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Select the interview type</h3>
        <p className="text-sm text-neutral-600">Choose the type of interview that best fits your needs</p>
      </div>

      <div className="space-y-3">
        {INTERVIEW_TYPES.map((type) => {
          const Icon = type.icon
          const isSelected = selectedType === type.id

          return (
            <Card
              key={type.id}
              onClick={() => handleTypeSelect(type.id)}
              className={`group p-5 cursor-pointer transition-all duration-250 ease-out border-2 ${
                isSelected 
                  ? 'border-brand-600 bg-gradient-to-br from-brand-50/50 to-white shadow-md' 
                  : 'border-neutral-200 bg-white hover:border-brand-400 hover:shadow-card-hover hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl transition-all duration-200 ${
                  isSelected 
                    ? 'bg-brand-600 text-white shadow-sm' 
                    : 'bg-neutral-100 text-neutral-600 group-hover:bg-brand-100 group-hover:text-brand-600'
                }`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <h4 className="font-semibold text-base text-neutral-900 leading-tight">{type.title}</h4>
                    {isSelected && (
                      <CheckCircle className="w-5 h-5 text-brand-600 flex-shrink-0 animate-scale-in" />
                    )}
                  </div>
                  <p className="text-sm text-neutral-600 leading-relaxed">{type.description}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <button
        onClick={() => setShowOtherTypes(!showOtherTypes)}
        className="w-full p-4 text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50 rounded-xl border-2 border-neutral-200 hover:border-brand-400 flex items-center justify-between transition-all duration-200 ease-out group"
      >
        <span className="group-hover:text-brand-600 transition-colors">Other interview type</span>
        <span className={`text-neutral-500 transition-transform duration-200 ${showOtherTypes ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {showOtherTypes && (
        <div className="space-y-3 animate-fade-in-up">
          {OTHER_INTERVIEW_TYPES.map((type) => {
            const Icon = type.icon
            const isSelected = selectedType === type.id

            return (
              <Card
                key={type.id}
                onClick={() => handleTypeSelect(type.id)}
                className={`group p-5 cursor-pointer transition-all duration-250 ease-out border-2 ${
                  isSelected 
                    ? 'border-brand-600 bg-gradient-to-br from-brand-50/50 to-white shadow-md' 
                    : 'border-neutral-200 bg-white hover:border-brand-400 hover:shadow-card-hover hover:-translate-y-0.5'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl transition-all duration-200 ${
                    isSelected 
                      ? 'bg-brand-600 text-white shadow-sm' 
                      : 'bg-neutral-100 text-neutral-600 group-hover:bg-brand-100 group-hover:text-brand-600'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <h4 className="font-semibold text-base text-neutral-900 leading-tight">{type.title}</h4>
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-brand-600 flex-shrink-0 animate-scale-in" />
                      )}
                    </div>
                    <p className="text-sm text-neutral-600 leading-relaxed">{type.description}</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button 
          onClick={onClose} 
          variant="outline" 
          className="px-6 py-2.5 rounded-xl border-2 hover:bg-neutral-50 transition-all duration-200"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleNext} 
          className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-button hover:shadow-button-hover hover:-translate-y-0.5 transition-all duration-200"
        >
          Next
        </Button>
      </div>
    </div>
  )

  const renderSkillDefinition = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Define skills & requirements</h3>
        <p className="text-sm text-neutral-600 leading-relaxed">
          {selectedType === 'custom' 
            ? 'Add custom questions to assess specific skills and capabilities.'
            : selectedType === 'custom_exercise'
            ? 'Describe the exercise or task for the candidate to complete.'
            : 'Define the skills you want to test candidates on. The optional description can be used to refine the questions.'}
        </p>
      </div>

      {/* Skills Section */}
      {selectedType !== 'custom' && selectedType !== 'custom_exercise' && selectedType !== 'behavioral' && (
        <div className="space-y-4">
          {skills.map((skill, index) => (
            <div key={index} className="space-y-3 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Target className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                  <Input
                    placeholder={`Skill ${index + 1}`}
                    value={skill.name}
                    onChange={(e) => updateSkill(index, 'name', e.target.value)}
                    className="pl-11 h-11 rounded-lg border-neutral-300 focus:border-brand-500 focus:ring-brand-500 transition-all duration-200"
                  />
                </div>
                {skills.length > 1 && (
                  <Button
                    onClick={() => removeSkill(index)}
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 flex-shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 hover:border-red-300 rounded-lg transition-all duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="relative">
                <AlignLeft className="absolute left-3.5 top-3.5 text-neutral-400 w-4 h-4" />
                <Textarea
                  placeholder="Optional: Describe this skill to tailor the questions"
                  value={skill.description}
                  onChange={(e) => updateSkill(index, 'description', e.target.value)}
                  className="pl-11 min-h-[80px] rounded-lg border-neutral-300 focus:border-brand-500 focus:ring-brand-500 resize-none transition-all duration-200"
                />
              </div>
            </div>
          ))}

          {skills.length < 5 && (
            <Button
              onClick={addSkill}
              variant="ghost"
              className="w-full py-3 text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg text-sm font-medium transition-all duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add another skill (up to {5 - skills.length} more)
            </Button>
          )}
        </div>
      )}

      {/* Resume Upload */}
      {selectedType === 'behavioral' && (
        <div className="p-6 bg-gradient-to-br from-neutral-50 to-white rounded-xl border-2 border-neutral-200">
          <label className="block text-sm font-semibold text-neutral-900 mb-2">
            Upload Resume <span className="text-red-500">*</span>
          </label>
          <p className="text-sm text-neutral-600 mb-4">
            Upload the candidate's resume. Supported: PDF, TXT, DOC, DOCX
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
                className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-neutral-300 rounded-xl cursor-pointer hover:border-brand-500 hover:bg-brand-50/50 transition-all duration-200 group"
              >
                <div className="p-3 bg-brand-100 rounded-full group-hover:bg-brand-200 transition-colors duration-200">
                  <Upload className="w-6 h-6 text-brand-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-neutral-900">
                    {uploadingResume ? 'Uploading...' : 'Click to upload resume'}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">PDF, TXT, DOC, or DOCX</p>
                </div>
              </label>
            </div>
          )}

          {resumeFile && resumeText && (
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border-2 border-green-200 animate-scale-in">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
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
                className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {resumeError && (
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border-2 border-red-200 mt-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{resumeError}</p>
            </div>
          )}
        </div>
      )}

      {/* Custom Questions */}
      {selectedType === 'custom' && (
        <div className="space-y-4">
          {customQuestions.map((question, index) => (
            <div key={index} className="flex items-start gap-3">
              <Textarea
                placeholder={`Question ${index + 1}`}
                value={question}
                onChange={(e) => updateQuestion(index, e.target.value)}
                className="flex-1 min-h-[80px] rounded-lg border-neutral-300 focus:border-brand-500 focus:ring-brand-500 resize-none transition-all duration-200"
                rows={2}
              />
              {customQuestions.length > 1 && (
                <Button
                  onClick={() => removeQuestion(index)}
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 flex-shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 hover:border-red-300 rounded-lg transition-all duration-200"
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
              className="w-full py-3 text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg text-sm font-medium transition-all duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add another question (up to {20 - customQuestions.length} more)
            </Button>
          )}
        </div>
      )}

      {/* Custom Exercise */}
      {selectedType === 'custom_exercise' && (
        <div>
          <label className="block text-sm font-semibold text-neutral-900 mb-3">Exercise Prompt</label>
          <Textarea
            placeholder="Describe the exercise or task for the candidate..."
            value={customExercisePrompt}
            onChange={(e) => setCustomExercisePrompt(e.target.value)}
            className="min-h-[160px] rounded-lg border-neutral-300 focus:border-brand-500 focus:ring-brand-500 resize-none transition-all duration-200"
          />
        </div>
      )}

      <div className="flex justify-between gap-3 pt-2 border-t border-neutral-200">
        <Button 
          onClick={handleBack} 
          variant="outline" 
          className="px-6 py-2.5 rounded-xl border-2 hover:bg-neutral-50 transition-all duration-200"
        >
          Back
        </Button>
        <div className="flex gap-3">
          <Button 
            onClick={onClose} 
            variant="outline" 
            className="px-6 py-2.5 rounded-xl border-2 hover:bg-neutral-50 transition-all duration-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || (selectedType === 'behavioral' && !resumeText)}
            className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white shadow-button hover:shadow-button-hover hover:-translate-y-0.5 transition-all duration-200 disabled:translate-y-0 disabled:shadow-none"
          >
            {creating ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </span>
            ) : (
              'Create Interview'
            )}
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar p-0">
        <div className="p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-display font-bold text-neutral-900">
              Create an interview
              {candidate && <span className="text-brand-600"> for {candidate.name}</span>}
            </DialogTitle>
          </DialogHeader>

          {step === 1 ? renderTypeSelection() : renderSkillDefinition()}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default InterviewCreationModal
