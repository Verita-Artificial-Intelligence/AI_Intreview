import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import {
  Upload,
  ChevronDown,
  Plus,
  X,
  CheckCircle2,
  Circle,
  FileText,
} from 'lucide-react'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API = `${BACKEND_URL}/api`

const STEPS = [
  { id: 1, title: 'Upload Resume', description: 'Your professional background' },
  { id: 2, title: 'General PCA', description: 'Personal & contact info' },
  { id: 3, title: 'General Interview', description: 'Experience & expertise' },
  { id: 4, title: 'Work Authorization', description: 'Legal status' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { user, token, completeProfile } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    // Step 1: Resume
    resume: null,
    resumeFileName: '',

    // Step 2: Personal Info
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    city: '',
    country: '',
    linkedinUrl: '',
    hasLinkedin: true,
    summary: '',

    // Step 3: Experience
    bio: '',
    expertise: [],
    education: [],
    workExperience: [],
    projects: [],
    publications: [],
    certifications: [],

    // Step 4: Authorization
    workAuthorized: '',
    citizenship: '',
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData((prev) => ({
        ...prev,
        resume: file,
        resumeFileName: file.name,
      }))
    }
  }

  const addExpertise = (expertise) => {
    if (expertise.trim() && !formData.expertise.includes(expertise.trim())) {
      setFormData((prev) => ({
        ...prev,
        expertise: [...prev.expertise, expertise.trim()],
      }))
    }
  }

  const removeExpertise = (expertise) => {
    setFormData((prev) => ({
      ...prev,
      expertise: prev.expertise.filter((e) => e !== expertise),
    }))
  }

  // Add/Remove for optional sections
  const addEducation = () => {
    setFormData((prev) => ({
      ...prev,
      education: [...prev.education, { school: '', degree: '', field: '', year: '' }],
    }))
  }

  const removeEducation = (index) => {
    setFormData((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }))
  }

  const updateEducation = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      education: prev.education.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  const addWorkExperience = () => {
    setFormData((prev) => ({
      ...prev,
      workExperience: [...prev.workExperience, { company: '', title: '', startDate: '', endDate: '', description: '' }],
    }))
  }

  const removeWorkExperience = (index) => {
    setFormData((prev) => ({
      ...prev,
      workExperience: prev.workExperience.filter((_, i) => i !== index),
    }))
  }

  const updateWorkExperience = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      workExperience: prev.workExperience.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  const addProject = () => {
    setFormData((prev) => ({
      ...prev,
      projects: [...prev.projects, { name: '', description: '', url: '' }],
    }))
  }

  const removeProject = (index) => {
    setFormData((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }))
  }

  const updateProject = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      projects: prev.projects.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  const addPublication = () => {
    setFormData((prev) => ({
      ...prev,
      publications: [...prev.publications, { title: '', publisher: '', year: '', url: '' }],
    }))
  }

  const removePublication = (index) => {
    setFormData((prev) => ({
      ...prev,
      publications: prev.publications.filter((_, i) => i !== index),
    }))
  }

  const updatePublication = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      publications: prev.publications.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  const addCertification = () => {
    setFormData((prev) => ({
      ...prev,
      certifications: [...prev.certifications, { name: '', issuer: '', year: '' }],
    }))
  }

  const removeCertification = (index) => {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }))
  }

  const updateCertification = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  const handleNext = async () => {
    setError('')

    // Validation only for moving forward
    if (currentStep === 1 && !formData.resume) {
      setError('Please upload your resume')
      return
    }

    if (currentStep === 2) {
      if (!formData.firstName || !formData.lastName || !formData.email) {
        setError('Please fill in all required fields')
        return
      }
    }

    if (currentStep === 3) {
      if (!formData.bio || formData.expertise.length === 0) {
        setError('Please provide bio and at least one expertise area')
        return
      }
    }

    if (currentStep === 4) {
      if (!formData.workAuthorized) {
        setError('Please select work authorization status')
        return
      }
    }

    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    } else {
      // Submit
      await handleSubmit()
    }
  }

  const handleBack = () => {
    setError('')
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Handle step navigation from sidebar - allow going to any previously visited step
  const handleStepClick = (stepId) => {
    setError('')
    if (stepId <= currentStep) {
      setCurrentStep(stepId)
    }
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)

      // Helper function to check if an entry has meaningful data
      const hasData = (obj) => {
        return Object.values(obj).some(val => {
          if (!val) return false
          const str = val.toString().trim()
          // Exclude common placeholder values
          return str !== '' && str.toLowerCase() !== 'none' && str.toLowerCase() !== 'n/a'
        })
      }

      // Prepare profile data - only include optional fields if they have content
      const profileData = {
        name: `${formData.firstName} ${formData.lastName}`,
        bio: formData.bio,
        expertise: formData.expertise,
      }

      // Filter and add optional fields only if they have meaningful data
      if (formData.education && formData.education.length > 0) {
        const validEducation = formData.education.filter(hasData)
        if (validEducation.length > 0) {
          profileData.education = validEducation
        }
      }

      if (formData.workExperience && formData.workExperience.length > 0) {
        const validWorkExperience = formData.workExperience.filter(hasData)
        if (validWorkExperience.length > 0) {
          profileData.work_experience = validWorkExperience
        }
      }

      if (formData.projects && formData.projects.length > 0) {
        const validProjects = formData.projects.filter(hasData)
        if (validProjects.length > 0) {
          profileData.projects = validProjects
        }
      }

      if (formData.publications && formData.publications.length > 0) {
        const validPublications = formData.publications.filter(hasData)
        if (validPublications.length > 0) {
          profileData.publications = validPublications
        }
      }

      if (formData.certifications && formData.certifications.length > 0) {
        const validCertifications = formData.certifications.filter(hasData)
        if (validCertifications.length > 0) {
          profileData.certifications = validCertifications
        }
      }

      // Call completeProfile
      await completeProfile(profileData)

      navigate('/')
    } catch (err) {
      console.error('Error completing onboarding:', err)

      // Handle different error response formats
      let errorMessage = 'Failed to complete onboarding'

      if (err.response?.data) {
        const data = err.response.data

        // If detail is an array (Pydantic validation errors)
        if (Array.isArray(data.detail)) {
          const errors = data.detail.map(e => e.msg || 'Validation error').join(', ')
          errorMessage = `Validation error: ${errors}`
        }
        // If detail is a string
        else if (typeof data.detail === 'string') {
          errorMessage = data.detail
        }
        // If there's a message field
        else if (data.message) {
          errorMessage = data.message
        }
      } else if (err.message) {
        errorMessage = err.message
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const progressPercent = (currentStep / STEPS.length) * 100

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Left Sidebar - Progress */}
      <div className="w-80 bg-white border-r border-neutral-200 p-8 flex flex-col">
        {/* Header */}
        <div className="mb-8">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center mb-4">
            <span className="text-lg font-bold text-white tracking-wider">V</span>
          </div>
          <h2 className="text-lg font-bold text-neutral-900 mb-1">
            Verita Application
          </h2>
          <p className="text-xs text-neutral-600">Complete your profile</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-1 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <p className="text-xs text-neutral-600 mt-2 font-medium">
            {currentStep} of {STEPS.length} complete
          </p>
        </div>

        {/* Steps */}
        <nav className="flex-1 space-y-2">
          {STEPS.map((step) => {
            const isCompleted = currentStep > step.id
            const isCurrent = currentStep === step.id
            const isVisited = step.id <= currentStep
            const canClick = isVisited

            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(step.id)}
                disabled={!canClick}
                className={`w-full text-left p-4 rounded-lg transition-all ${
                  isCurrent
                    ? 'bg-brand-50 border border-brand-200 cursor-default'
                    : canClick
                      ? 'bg-neutral-50 hover:bg-neutral-100 cursor-pointer'
                      : 'bg-neutral-50 cursor-default opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-brand-500" />
                    ) : (
                      <Circle
                        className={`w-5 h-5 ${
                          isCurrent ? 'text-brand-500' : 'text-neutral-400'
                        }`}
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${
                      isCurrent ? 'text-neutral-900' : 'text-neutral-700'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-neutral-600 mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-12">
          {/* Step Content */}
          {currentStep === 1 && (
            <StepResume
              formData={formData}
              handleFileUpload={handleFileUpload}
            />
          )}

          {currentStep === 2 && (
            <StepPersonalInfo
              formData={formData}
              handleInputChange={handleInputChange}
            />
          )}

          {currentStep === 3 && (
            <StepExperience
              formData={formData}
              handleInputChange={handleInputChange}
              addExpertise={addExpertise}
              removeExpertise={removeExpertise}
              addEducation={addEducation}
              removeEducation={removeEducation}
              updateEducation={updateEducation}
              addWorkExperience={addWorkExperience}
              removeWorkExperience={removeWorkExperience}
              updateWorkExperience={updateWorkExperience}
              addProject={addProject}
              removeProject={removeProject}
              updateProject={updateProject}
              addPublication={addPublication}
              removePublication={removePublication}
              updatePublication={updatePublication}
              addCertification={addCertification}
              removeCertification={removeCertification}
              updateCertification={updateCertification}
            />
          )}

          {currentStep === 4 && (
            <StepAuthorization
              formData={formData}
              handleInputChange={handleInputChange}
            />
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-4 mt-8">
            <Button
              onClick={handleBack}
              disabled={currentStep === 1}
              variant="outline"
              className="flex-1 border-neutral-300 font-semibold"
            >
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={loading}
              className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold"
            >
              {loading ? 'Saving...' : currentStep === STEPS.length ? 'Complete' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepResume({ formData, handleFileUpload }) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Upload resume</h1>
        <p className="text-lg text-neutral-600 font-light">
          Your resume helps us understand your background and match you with opportunities
        </p>
      </div>

      <Card className="p-8 border border-neutral-200">
        <div className="border-2 border-dashed border-neutral-300 rounded-lg p-12 text-center hover:border-brand-400 transition-colors">
          <input
            type="file"
            id="resume-upload"
            accept=".pdf,.doc,.docx"
            onChange={handleFileUpload}
            className="hidden"
          />
          <label htmlFor="resume-upload" className="cursor-pointer block">
            <Upload className="w-12 h-12 mx-auto mb-3 text-neutral-400" />
            <p className="text-lg font-semibold text-neutral-900 mb-1">
              {formData.resumeFileName || 'Click to upload or drag and drop'}
            </p>
            <p className="text-sm text-neutral-600">
              PDF, DOC, or DOCX (Max 10MB)
            </p>
          </label>
        </div>

        {formData.resumeFileName && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <FileText className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-900">{formData.resumeFileName}</p>
              <p className="text-sm text-green-700">Ready to upload</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

function StepPersonalInfo({ formData, handleInputChange }) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Personal information</h1>
        <p className="text-lg text-neutral-600 font-light">
          Help us contact you about opportunities
        </p>
      </div>

      <Card className="p-8 border border-neutral-200 space-y-6">
        {/* Name Row */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 tracking-wide mb-2">
              FIRST NAME *
            </label>
            <Input
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              className="text-sm border-neutral-300"
              placeholder="First"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 tracking-wide mb-2">
              LAST NAME *
            </label>
            <Input
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              className="text-sm border-neutral-300"
              placeholder="Last"
            />
          </div>
        </div>

        {/* Contact Row */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 tracking-wide mb-2">
              EMAIL *
            </label>
            <Input
              name="email"
              type="email"
              value={formData.email}
              disabled
              className="text-sm bg-neutral-50 border-neutral-200 cursor-default"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 tracking-wide mb-2">
              PHONE
            </label>
            <Input
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="text-sm border-neutral-300"
              placeholder="+1 (555) 000-0000"
            />
          </div>
        </div>

        {/* Location Row */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 tracking-wide mb-2">
              CITY
            </label>
            <Input
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              className="text-sm border-neutral-300"
              placeholder="San Francisco"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 tracking-wide mb-2">
              COUNTRY
            </label>
            <Input
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              className="text-sm border-neutral-300"
              placeholder="United States"
            />
          </div>
        </div>

        {/* LinkedIn */}
        <div>
          <label className="block text-xs font-semibold text-neutral-600 tracking-wide mb-2">
            LINKEDIN URL
          </label>
          <Input
            name="linkedinUrl"
            value={formData.linkedinUrl}
            onChange={handleInputChange}
            className="text-sm border-neutral-300"
            placeholder="https://linkedin.com/in/yourprofile"
          />
        </div>

        {/* Summary */}
        <div>
          <label className="block text-xs font-semibold text-neutral-600 tracking-wide mb-2">
            PROFESSIONAL SUMMARY
          </label>
          <Textarea
            name="summary"
            value={formData.summary}
            onChange={handleInputChange}
            className="text-sm resize-none min-h-20 border-neutral-300"
            placeholder="Brief overview of your professional background and interests..."
          />
        </div>
      </Card>
    </div>
  )
}

function StepExperience({
  formData,
  handleInputChange,
  addExpertise,
  removeExpertise,
  addEducation,
  removeEducation,
  updateEducation,
  addWorkExperience,
  removeWorkExperience,
  updateWorkExperience,
  addProject,
  removeProject,
  updateProject,
  addPublication,
  removePublication,
  updatePublication,
  addCertification,
  removeCertification,
  updateCertification,
}) {
  const [expertiseInput, setExpertiseInput] = useState('')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Experience & expertise</h1>
        <p className="text-lg text-neutral-600 font-light">
          Tell us about your professional background
        </p>
      </div>

      <div className="space-y-4">
        {/* Bio */}
        <Card className="p-6 border border-neutral-200">
          <label className="block text-xs font-semibold text-neutral-600 tracking-wide mb-3">
            CREATIVE BIO *
          </label>
          <Textarea
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            className="text-sm resize-none min-h-24 border-neutral-300"
            placeholder="Tell us about your creative style, notable projects, and what inspires your work..."
          />
        </Card>

        {/* Expertise */}
        <Card className="p-6 border border-neutral-200">
          <label className="block text-xs font-semibold text-neutral-600 tracking-wide mb-3">
            CREATIVE SKILLS & SPECIALTIES *
          </label>
          <div className="flex gap-2 mb-4">
            <Input
              value={expertiseInput}
              onChange={(e) => setExpertiseInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addExpertise(expertiseInput)
                  setExpertiseInput('')
                }
              }}
              className="text-sm flex-1 border-neutral-300"
              placeholder="e.g., Illustration, UI Design, Motion Graphics"
            />
            <Button
              onClick={() => {
                addExpertise(expertiseInput)
                setExpertiseInput('')
              }}
              size="sm"
              className="bg-brand-500 hover:bg-brand-600 text-white"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {formData.expertise.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.expertise.map((exp) => (
                <div
                  key={exp}
                  className="flex items-center gap-2 px-3 py-1 bg-brand-100 text-brand-600 rounded-lg text-sm font-medium"
                >
                  {exp}
                  <button
                    onClick={() => removeExpertise(exp)}
                    className="hover:text-brand-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Education Section */}
        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-4 tracking-tight">Education</h2>
          {formData.education.map((edu, index) => (
            <Card key={index} className="p-6 border border-neutral-200 mb-4">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-semibold text-neutral-700">Education {index + 1}</p>
                <button
                  onClick={() => removeEducation(index)}
                  className="text-neutral-500 hover:text-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="School/University"
                  value={edu.school}
                  onChange={(e) => updateEducation(index, 'school', e.target.value)}
                  className="text-sm border-neutral-300"
                />
                <Input
                  placeholder="Degree"
                  value={edu.degree}
                  onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                  className="text-sm border-neutral-300"
                />
                <Input
                  placeholder="Field of Study"
                  value={edu.field}
                  onChange={(e) => updateEducation(index, 'field', e.target.value)}
                  className="text-sm border-neutral-300"
                />
                <Input
                  placeholder="Year"
                  value={edu.year}
                  onChange={(e) => updateEducation(index, 'year', e.target.value)}
                  className="text-sm border-neutral-300"
                />
              </div>
            </Card>
          ))}
          <Button onClick={addEducation} variant="outline" className="border-neutral-300 text-brand-600 hover:text-brand-700 mb-8">
            <Plus className="w-4 h-4 mr-2" />
            Add Education
          </Button>
        </div>

        {/* Work Experience Section */}
        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-4 tracking-tight">Work Experience</h2>
          {formData.workExperience.map((exp, index) => (
            <Card key={index} className="p-6 border border-neutral-200 mb-4">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-semibold text-neutral-700">Experience {index + 1}</p>
                <button
                  onClick={() => removeWorkExperience(index)}
                  className="text-neutral-500 hover:text-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Company"
                    value={exp.company}
                    onChange={(e) => updateWorkExperience(index, 'company', e.target.value)}
                    className="text-sm border-neutral-300"
                  />
                  <Input
                    placeholder="Job Title"
                    value={exp.title}
                    onChange={(e) => updateWorkExperience(index, 'title', e.target.value)}
                    className="text-sm border-neutral-300"
                  />
                  <Input
                    placeholder="Start Date"
                    value={exp.startDate}
                    onChange={(e) => updateWorkExperience(index, 'startDate', e.target.value)}
                    className="text-sm border-neutral-300"
                  />
                  <Input
                    placeholder="End Date (or Present)"
                    value={exp.endDate}
                    onChange={(e) => updateWorkExperience(index, 'endDate', e.target.value)}
                    className="text-sm border-neutral-300"
                  />
                </div>
                <Textarea
                  placeholder="Description"
                  value={exp.description}
                  onChange={(e) => updateWorkExperience(index, 'description', e.target.value)}
                  className="text-sm resize-none min-h-20 border-neutral-300"
                />
              </div>
            </Card>
          ))}
          <Button onClick={addWorkExperience} variant="outline" className="border-neutral-300 text-brand-600 hover:text-brand-700 mb-8">
            <Plus className="w-4 h-4 mr-2" />
            Add Work Experience
          </Button>
        </div>

        {/* Projects Section */}
        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-4 tracking-tight">Projects</h2>
          {formData.projects.map((project, index) => (
            <Card key={index} className="p-6 border border-neutral-200 mb-4">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-semibold text-neutral-700">Project {index + 1}</p>
                <button
                  onClick={() => removeProject(index)}
                  className="text-neutral-500 hover:text-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                <Input
                  placeholder="Project Name"
                  value={project.name}
                  onChange={(e) => updateProject(index, 'name', e.target.value)}
                  className="text-sm border-neutral-300"
                />
                <Textarea
                  placeholder="Description"
                  value={project.description}
                  onChange={(e) => updateProject(index, 'description', e.target.value)}
                  className="text-sm resize-none min-h-20 border-neutral-300"
                />
                <Input
                  placeholder="Project URL (optional)"
                  value={project.url}
                  onChange={(e) => updateProject(index, 'url', e.target.value)}
                  className="text-sm border-neutral-300"
                />
              </div>
            </Card>
          ))}
          <Button onClick={addProject} variant="outline" className="border-neutral-300 text-brand-600 hover:text-brand-700 mb-8">
            <Plus className="w-4 h-4 mr-2" />
            Add Project
          </Button>
        </div>

        {/* Publications Section */}
        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-4 tracking-tight">Publications</h2>
          {formData.publications.map((pub, index) => (
            <Card key={index} className="p-6 border border-neutral-200 mb-4">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-semibold text-neutral-700">Publication {index + 1}</p>
                <button
                  onClick={() => removePublication(index)}
                  className="text-neutral-500 hover:text-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Title"
                  value={pub.title}
                  onChange={(e) => updatePublication(index, 'title', e.target.value)}
                  className="text-sm border-neutral-300 col-span-2"
                />
                <Input
                  placeholder="Publisher/Venue"
                  value={pub.publisher}
                  onChange={(e) => updatePublication(index, 'publisher', e.target.value)}
                  className="text-sm border-neutral-300"
                />
                <Input
                  placeholder="Year"
                  value={pub.year}
                  onChange={(e) => updatePublication(index, 'year', e.target.value)}
                  className="text-sm border-neutral-300"
                />
                <Input
                  placeholder="URL (optional)"
                  value={pub.url}
                  onChange={(e) => updatePublication(index, 'url', e.target.value)}
                  className="text-sm border-neutral-300 col-span-2"
                />
              </div>
            </Card>
          ))}
          <Button onClick={addPublication} variant="outline" className="border-neutral-300 text-brand-600 hover:text-brand-700 mb-8">
            <Plus className="w-4 h-4 mr-2" />
            Add Publication
          </Button>
        </div>

        {/* Certifications Section */}
        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-4 tracking-tight">Certifications</h2>
          {formData.certifications.map((cert, index) => (
            <Card key={index} className="p-6 border border-neutral-200 mb-4">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-semibold text-neutral-700">Certification {index + 1}</p>
                <button
                  onClick={() => removeCertification(index)}
                  className="text-neutral-500 hover:text-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  placeholder="Certification Name"
                  value={cert.name}
                  onChange={(e) => updateCertification(index, 'name', e.target.value)}
                  className="text-sm border-neutral-300 col-span-2"
                />
                <Input
                  placeholder="Year"
                  value={cert.year}
                  onChange={(e) => updateCertification(index, 'year', e.target.value)}
                  className="text-sm border-neutral-300"
                />
                <Input
                  placeholder="Issuing Organization"
                  value={cert.issuer}
                  onChange={(e) => updateCertification(index, 'issuer', e.target.value)}
                  className="text-sm border-neutral-300 col-span-3"
                />
              </div>
            </Card>
          ))}
          <Button onClick={addCertification} variant="outline" className="border-neutral-300 text-brand-600 hover:text-brand-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Certification
          </Button>
        </div>
      </div>
    </div>
  )
}

function StepAuthorization({ formData, handleInputChange }) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Work authorization</h1>
        <p className="text-lg text-neutral-600 font-light">
          Confirm your legal ability to work
        </p>
      </div>

      <Card className="p-8 border border-neutral-200 space-y-6">
        <div>
          <label className="block text-xs font-semibold text-neutral-600 tracking-wide mb-4">
            WORK AUTHORIZATION STATUS *
          </label>
          <div className="space-y-3">
            {[
              { value: 'citizen', label: 'Citizen/Permanent Resident' },
              { value: 'work_visa', label: 'Work visa/permit' },
              { value: 'need_sponsorship', label: 'Need sponsorship' },
            ].map((option) => (
              <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="workAuthorized"
                  value={option.value}
                  checked={formData.workAuthorized === option.value}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-brand-600"
                />
                <span className="text-sm font-medium text-neutral-900">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-600 tracking-wide mb-2">
            CITIZENSHIP COUNTRY
          </label>
          <Input
            name="citizenship"
            value={formData.citizenship}
            onChange={handleInputChange}
            className="text-sm border-neutral-300"
            placeholder="United States"
          />
        </div>

        <div className="p-4 bg-brand-50 border border-brand-100 rounded-lg">
          <p className="text-sm text-brand-600">
            Your work authorization status helps us match you with opportunities you're eligible for.
          </p>
        </div>
      </Card>
    </div>
  )
}
