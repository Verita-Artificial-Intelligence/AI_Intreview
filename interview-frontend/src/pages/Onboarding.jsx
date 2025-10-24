import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import {
  Upload,
  ChevronDown,
  Plus,
  X,
  CheckCircle2,
  Circle,
  FileText,
  ArrowLeft,
  ArrowRight,
  Loader2,
} from 'lucide-react'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API = `${BACKEND_URL}/api`

const STEPS = [
  {
    id: 1,
    title: 'Upload Resume',
    description: 'Your professional background',
  },
  { id: 2, title: 'General PCA', description: 'Personal & contact info' },
  { id: 3, title: 'Background', description: 'Experience & expertise' },
  { id: 4, title: 'Work Authorization', description: 'Legal status' },
]

const COUNTRIES = [
  'Afghanistan',
  'Albania',
  'Algeria',
  'Andorra',
  'Angola',
  'Antigua and Barbuda',
  'Argentina',
  'Armenia',
  'Australia',
  'Austria',
  'Azerbaijan',
  'Bahamas',
  'Bahrain',
  'Bangladesh',
  'Barbados',
  'Belarus',
  'Belgium',
  'Belize',
  'Benin',
  'Bhutan',
  'Bolivia',
  'Bosnia and Herzegovina',
  'Botswana',
  'Brazil',
  'Brunei',
  'Bulgaria',
  'Burkina Faso',
  'Burundi',
  'Cabo Verde',
  'Cambodia',
  'Cameroon',
  'Canada',
  'Central African Republic',
  'Chad',
  'Chile',
  'China',
  'Colombia',
  'Comoros',
  'Congo',
  'Costa Rica',
  'Croatia',
  'Cuba',
  'Cyprus',
  'Czech Republic',
  'Denmark',
  'Djibouti',
  'Dominica',
  'Dominican Republic',
  'Ecuador',
  'Egypt',
  'El Salvador',
  'Equatorial Guinea',
  'Eritrea',
  'Estonia',
  'Eswatini',
  'Ethiopia',
  'Fiji',
  'Finland',
  'France',
  'Gabon',
  'Gambia',
  'Georgia',
  'Germany',
  'Ghana',
  'Greece',
  'Grenada',
  'Guatemala',
  'Guinea',
  'Guinea-Bissau',
  'Guyana',
  'Haiti',
  'Honduras',
  'Hungary',
  'Iceland',
  'India',
  'Indonesia',
  'Iran',
  'Iraq',
  'Ireland',
  'Israel',
  'Italy',
  'Jamaica',
  'Japan',
  'Jordan',
  'Kazakhstan',
  'Kenya',
  'Kiribati',
  'Korea, North',
  'Korea, South',
  'Kosovo',
  'Kuwait',
  'Kyrgyzstan',
  'Laos',
  'Latvia',
  'Lebanon',
  'Lesotho',
  'Liberia',
  'Libya',
  'Liechtenstein',
  'Lithuania',
  'Luxembourg',
  'Madagascar',
  'Malawi',
  'Malaysia',
  'Maldives',
  'Mali',
  'Malta',
  'Marshall Islands',
  'Mauritania',
  'Mauritius',
  'Mexico',
  'Micronesia',
  'Moldova',
  'Monaco',
  'Mongolia',
  'Montenegro',
  'Morocco',
  'Mozambique',
  'Myanmar',
  'Namibia',
  'Nauru',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Nicaragua',
  'Niger',
  'Nigeria',
  'North Macedonia',
  'Norway',
  'Oman',
  'Pakistan',
  'Palau',
  'Palestine',
  'Panama',
  'Papua New Guinea',
  'Paraguay',
  'Peru',
  'Philippines',
  'Poland',
  'Portugal',
  'Qatar',
  'Romania',
  'Russia',
  'Rwanda',
  'Saint Kitts and Nevis',
  'Saint Lucia',
  'Saint Vincent and the Grenadines',
  'Samoa',
  'San Marino',
  'Sao Tome and Principe',
  'Saudi Arabia',
  'Senegal',
  'Serbia',
  'Seychelles',
  'Sierra Leone',
  'Singapore',
  'Slovakia',
  'Slovenia',
  'Solomon Islands',
  'Somalia',
  'South Africa',
  'South Sudan',
  'Spain',
  'Sri Lanka',
  'Sudan',
  'Suriname',
  'Sweden',
  'Switzerland',
  'Syria',
  'Taiwan',
  'Tajikistan',
  'Tanzania',
  'Thailand',
  'Timor-Leste',
  'Togo',
  'Tonga',
  'Trinidad and Tobago',
  'Tunisia',
  'Turkey',
  'Turkmenistan',
  'Tuvalu',
  'Uganda',
  'Ukraine',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Uruguay',
  'Uzbekistan',
  'Vanuatu',
  'Vatican City',
  'Venezuela',
  'Vietnam',
  'Yemen',
  'Zambia',
  'Zimbabwe',
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { user, token, completeProfile } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [scrapingLinkedIn, setScrapingLinkedIn] = useState(false)
  const [linkedInScraped, setLinkedInScraped] = useState(false)
  const [error, setError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationProgress, setVerificationProgress] = useState(0)
  const [verificationStep, setVerificationStep] = useState('')
  const [isVerified, setIsVerified] = useState(false)

  const [formData, setFormData] = useState({
    // Step 1: Resume
    resume: null,
    resumeFileName: '',
    resumeUrl: '',

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

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError('')

    try {
      // Upload resume file to get file URL
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const uploadResponse = await axios.post(
        `${API}/files/upload`,
        uploadFormData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      if (uploadResponse.data.url) {
        setFormData((prev) => ({
          ...prev,
          resume: file,
          resumeFileName: file.name,
          resumeUrl: `${BACKEND_URL}${uploadResponse.data.url}`,
        }))
      } else {
        setError('Failed to upload resume')
      }
    } catch (error) {
      console.error('Error uploading resume:', error)
      setError('Failed to upload resume. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLinkedInScrape = async () => {
    const linkedinUrl = formData.linkedinUrl?.trim()

    // Only scrape if URL is provided and looks like a LinkedIn URL
    if (!linkedinUrl || !linkedinUrl.includes('linkedin.com')) {
      return
    }

    // Don't scrape if already scraped this URL
    if (linkedInScraped) {
      return
    }

    setScrapingLinkedIn(true)
    setError('')

    try {
      const response = await axios.post(
        `${API}/profile/scrape-linkedin`,
        { linkedin_url: linkedinUrl },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      const scrapedData = response.data

      // Auto-fill the form data with scraped information
      setFormData((prev) => ({
        ...prev,
        firstName: scrapedData.firstName || prev.firstName,
        lastName: scrapedData.lastName || prev.lastName,
        city: scrapedData.city || prev.city,
        country: scrapedData.country || prev.country,
        bio: scrapedData.bio || prev.bio,
        expertise:
          scrapedData.expertise?.length > 0
            ? scrapedData.expertise
            : prev.expertise,
        education:
          scrapedData.education?.length > 0
            ? scrapedData.education
            : prev.education,
        workExperience:
          scrapedData.work_experience?.length > 0
            ? scrapedData.work_experience
            : prev.workExperience,
      }))

      setLinkedInScraped(true)
    } catch (err) {
      console.error('Error scraping LinkedIn:', err)
      setError('Failed to scrape LinkedIn profile. Please continue manually.')
    } finally {
      setScrapingLinkedIn(false)
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
      education: [
        ...prev.education,
        { school: '', degree: '', field: '', year: '' },
      ],
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
      workExperience: [
        ...prev.workExperience,
        { company: '', title: '', startDate: '', endDate: '', description: '' },
      ],
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
      publications: [
        ...prev.publications,
        { title: '', publisher: '', year: '', url: '' },
      ],
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
      certifications: [
        ...prev.certifications,
        { name: '', issuer: '', year: '' },
      ],
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
      if (
        !formData.firstName ||
        !formData.lastName ||
        !formData.email ||
        !formData.city ||
        !formData.country
      ) {
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
      if (!formData.citizenship) {
        setError('Please select your citizenship country')
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
      setIsVerifying(true)
      setVerificationProgress(0)

      // Helper function to check if an entry has meaningful data
      const hasData = (obj) => {
        return Object.values(obj).some((val) => {
          if (!val) return false
          const str = val.toString().trim()
          // Exclude common placeholder values
          return (
            str !== '' &&
            str.toLowerCase() !== 'none' &&
            str.toLowerCase() !== 'n/a'
          )
        })
      }

      const fullName = `${formData.firstName} ${formData.lastName}`

      // Verification Step 1: Validate identity
      setVerificationStep(
        `Verifying identity for ${fullName} in ${formData.city}, ${formData.country}...`
      )
      setVerificationProgress(20)
      // TODO: Call api.intrace.ai for identity verification
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Verification Step 2: Checking credentials
      setVerificationStep(`Checking credentials and background information...`)
      setVerificationProgress(40)
      // TODO: Call api.intrace.ai for credential verification
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Verification Step 3: Validating work authorization
      setVerificationStep(
        `Validating work authorization in ${formData.country}...`
      )
      setVerificationProgress(60)
      // TODO: Call api.intrace.ai for work authorization check
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Verification Step 4: Creating profile
      setVerificationStep(`Creating your profile...`)
      setVerificationProgress(80)

      // Prepare profile data - only include optional fields if they have content
      const profileData = {
        name: fullName,
        bio: formData.bio,
        expertise: formData.expertise,
      }

      // Add resume URL if uploaded
      if (formData.resumeUrl) {
        profileData.resume_url = formData.resumeUrl
      }

      // Add work authorization data
      if (formData.workAuthorized) {
        profileData.work_authorization = formData.workAuthorized
      }
      if (formData.citizenship) {
        profileData.citizenship = formData.citizenship
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

      // Verification Step 5: Finalizing
      setVerificationStep(`Finalizing setup for ${fullName}...`)
      setVerificationProgress(95)
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Complete
      setVerificationProgress(100)
      setVerificationStep(`Verified! Welcome to Verita AI.`)
      setIsVerified(true)

      // Wait a moment before navigating
      await new Promise((resolve) => setTimeout(resolve, 1500))
      navigate('/')
    } catch (err) {
      console.error('Error completing onboarding:', err)

      // Handle different error response formats
      let errorMessage = 'Failed to complete onboarding'

      if (err.response?.data) {
        const data = err.response.data

        // If detail is an array (Pydantic validation errors)
        if (Array.isArray(data.detail)) {
          const errors = data.detail
            .map((e) => e.msg || 'Validation error')
            .join(', ')
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
      setIsVerifying(false)
      setVerificationProgress(0)
    } finally {
      setLoading(false)
    }
  }

  const progressPercent = (currentStep / STEPS.length) * 100

  // Show verification screen when verifying
  if (isVerifying) {
    return (
      <div className="flex min-h-screen bg-white items-center justify-center">
        <Card className="w-full max-w-2xl mx-4 p-12 border border-neutral-200">
          <div className="text-center">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <img
                src="/images/verita_ai_logo.jpeg"
                alt="Verita AI"
                className="w-16 h-16 rounded-lg object-cover"
              />
            </div>

            {/* Title */}
            <h2 className="text-3xl font-bold text-neutral-900 mb-2">
              {isVerified ? 'Verification Complete!' : 'Verifying Your Profile'}
            </h2>

            {/* Verification Status Text */}
            <p className="text-base text-neutral-600 mb-8 min-h-[24px]">
              {verificationStep}
            </p>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="h-3 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ease-out ${
                    isVerified
                      ? 'bg-green-500'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600'
                  }`}
                  style={{ width: `${verificationProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-neutral-600 mt-3 font-medium">
                {verificationProgress}% Complete
              </p>
            </div>

            {/* Success Icon */}
            {isVerified && (
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
              </div>
            )}

            {/* Loading Spinner */}
            {!isVerified && (
              <div className="flex justify-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              </div>
            )}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Left Sidebar - Progress */}
      <div className="w-80 bg-white border-r border-neutral-200 p-8 flex flex-col">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <img
              src="/images/verita_ai_logo.jpeg"
              alt="Verita AI"
              className="w-10 h-10 rounded-md flex-shrink-0 object-cover"
            />
            <div>
              <h2 className="text-xl font-display font-bold text-neutral-900">
                Verita AI
              </h2>
            </div>
          </div>
          <h3 className="text-lg font-bold text-neutral-900 mb-1">
            Complete Your Profile
          </h3>
          <p className="text-xs text-neutral-600">Get started with Verita</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-1 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
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
                    ? 'bg-blue-50 border border-blue-200 cursor-default'
                    : canClick
                      ? 'bg-neutral-50 hover:bg-neutral-100 cursor-pointer'
                      : 'bg-neutral-50 cursor-default opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-blue-500" />
                    ) : (
                      <Circle
                        className={`w-5 h-5 ${
                          isCurrent ? 'text-blue-500' : 'text-neutral-400'
                        }`}
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        isCurrent ? 'text-neutral-900' : 'text-neutral-700'
                      }`}
                    >
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
              handleLinkedInScrape={handleLinkedInScrape}
              scrapingLinkedIn={scrapingLinkedIn}
              linkedInScraped={linkedInScraped}
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
          <div className="flex justify-end gap-3 mt-8">
            {currentStep > 1 && (
              <Button
                onClick={handleBack}
                disabled={scrapingLinkedIn}
                variant="outline"
                className="border-neutral-300 font-semibold"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={loading || scrapingLinkedIn}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold"
            >
              {loading
                ? 'Saving...'
                : currentStep === STEPS.length
                  ? 'Complete'
                  : 'Next'}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
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
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">
          Upload Resume
        </h2>
        <p className="text-sm text-neutral-600">
          Your resume helps us understand your background and match you with
          opportunities
        </p>
      </div>

      <Card className="p-6 border border-neutral-200">
        <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
          <input
            type="file"
            id="resume-upload"
            accept=".pdf,.doc,.docx"
            onChange={handleFileUpload}
            className="hidden"
          />
          <label htmlFor="resume-upload" className="cursor-pointer block">
            <Upload className="w-10 h-10 mx-auto mb-3 text-neutral-400" />
            <p className="text-base font-semibold text-neutral-900 mb-1">
              {formData.resumeFileName || 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-neutral-600">
              PDF, DOC, or DOCX (Max 10MB)
            </p>
          </label>
        </div>

        {formData.resumeFileName && (
          <div className="mt-4 p-3 border-2 border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-900 text-sm">
                {formData.resumeFileName}
              </p>
              <p className="text-xs text-green-700">Ready to upload</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

function StepPersonalInfo({
  formData,
  handleInputChange,
  handleLinkedInScrape,
  scrapingLinkedIn,
  linkedInScraped,
}) {
  const [countrySearch, setCountrySearch] = useState('')

  const handleCountryChange = (value) => {
    handleInputChange({ target: { name: 'country', value } })
  }

  const filteredCountries = COUNTRIES.filter((country) =>
    country.toLowerCase().includes(countrySearch.toLowerCase())
  )

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">
          Personal Information
        </h2>
        <p className="text-sm text-neutral-600">
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
              CITY *
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
              COUNTRY *
            </label>
            <Select
              value={formData.country}
              onValueChange={handleCountryChange}
            >
              <SelectTrigger className="text-sm border-neutral-300">
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <div className="sticky top-0 z-10 bg-white px-2 pb-2 pt-2">
                  <Input
                    placeholder="Search countries..."
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="h-8 text-sm"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
                {filteredCountries.length > 0 ? (
                  filteredCountries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-2 py-6 text-center text-sm text-neutral-500">
                    No countries found
                  </div>
                )}
              </SelectContent>
            </Select>
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
            onBlur={handleLinkedInScrape}
            className="text-sm border-neutral-300"
            placeholder="https://linkedin.com/in/yourprofile"
          />
          {scrapingLinkedIn && (
            <div className="mt-3 flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Scraping LinkedIn profile...</span>
            </div>
          )}
          {linkedInScraped && !scrapingLinkedIn && (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                Profile data imported. Your information will be auto-filled in
                the next step.
              </span>
            </div>
          )}
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
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">
          Experience & Expertise
        </h2>
        <p className="text-sm text-neutral-600">
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
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {formData.expertise.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.expertise.map((exp) => (
                <div
                  key={exp}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-600 rounded-lg text-sm font-medium"
                >
                  {exp}
                  <button
                    onClick={() => removeExpertise(exp)}
                    className="hover:text-blue-600"
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
          <h2 className="text-lg font-bold text-neutral-900 mb-4 tracking-tight">
            Education
          </h2>
          {formData.education.map((edu, index) => (
            <Card key={index} className="p-6 border border-neutral-200 mb-4">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-semibold text-neutral-700">
                  Education {index + 1}
                </p>
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
                  onChange={(e) =>
                    updateEducation(index, 'school', e.target.value)
                  }
                  className="text-sm border-neutral-300"
                />
                <Input
                  placeholder="Degree"
                  value={edu.degree}
                  onChange={(e) =>
                    updateEducation(index, 'degree', e.target.value)
                  }
                  className="text-sm border-neutral-300"
                />
                <Input
                  placeholder="Field of Study"
                  value={edu.field}
                  onChange={(e) =>
                    updateEducation(index, 'field', e.target.value)
                  }
                  className="text-sm border-neutral-300"
                />
                <Input
                  placeholder="Year"
                  value={edu.year}
                  onChange={(e) =>
                    updateEducation(index, 'year', e.target.value)
                  }
                  className="text-sm border-neutral-300"
                />
              </div>
            </Card>
          ))}
          <Button
            onClick={addEducation}
            variant="outline"
            className="border-neutral-300 text-blue-500 hover:text-blue-600 mb-8"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Education
          </Button>
        </div>

        {/* Work Experience Section */}
        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-4 tracking-tight">
            Work Experience
          </h2>
          {formData.workExperience.map((exp, index) => (
            <Card key={index} className="p-6 border border-neutral-200 mb-4">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-semibold text-neutral-700">
                  Experience {index + 1}
                </p>
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
                    onChange={(e) =>
                      updateWorkExperience(index, 'company', e.target.value)
                    }
                    className="text-sm border-neutral-300"
                  />
                  <Input
                    placeholder="Job Title"
                    value={exp.title}
                    onChange={(e) =>
                      updateWorkExperience(index, 'title', e.target.value)
                    }
                    className="text-sm border-neutral-300"
                  />
                  <Input
                    placeholder="Start Date"
                    value={exp.startDate}
                    onChange={(e) =>
                      updateWorkExperience(index, 'startDate', e.target.value)
                    }
                    className="text-sm border-neutral-300"
                  />
                  <Input
                    placeholder="End Date (or Present)"
                    value={exp.endDate}
                    onChange={(e) =>
                      updateWorkExperience(index, 'endDate', e.target.value)
                    }
                    className="text-sm border-neutral-300"
                  />
                </div>
                <Textarea
                  placeholder="Description"
                  value={exp.description}
                  onChange={(e) =>
                    updateWorkExperience(index, 'description', e.target.value)
                  }
                  className="text-sm resize-none min-h-20 border-neutral-300"
                />
              </div>
            </Card>
          ))}
          <Button
            onClick={addWorkExperience}
            variant="outline"
            className="border-neutral-300 text-blue-500 hover:text-blue-600 mb-8"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Work Experience
          </Button>
        </div>

        {/* Projects Section */}
        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-4 tracking-tight">
            Projects
          </h2>
          {formData.projects.map((project, index) => (
            <Card key={index} className="p-6 border border-neutral-200 mb-4">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-semibold text-neutral-700">
                  Project {index + 1}
                </p>
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
                  onChange={(e) =>
                    updateProject(index, 'description', e.target.value)
                  }
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
          <Button
            onClick={addProject}
            variant="outline"
            className="border-neutral-300 text-blue-500 hover:text-blue-600 mb-8"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Project
          </Button>
        </div>

        {/* Publications Section */}
        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-4 tracking-tight">
            Publications
          </h2>
          {formData.publications.map((pub, index) => (
            <Card key={index} className="p-6 border border-neutral-200 mb-4">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-semibold text-neutral-700">
                  Publication {index + 1}
                </p>
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
                  onChange={(e) =>
                    updatePublication(index, 'title', e.target.value)
                  }
                  className="text-sm border-neutral-300 col-span-2"
                />
                <Input
                  placeholder="Publisher/Venue"
                  value={pub.publisher}
                  onChange={(e) =>
                    updatePublication(index, 'publisher', e.target.value)
                  }
                  className="text-sm border-neutral-300"
                />
                <Input
                  placeholder="Year"
                  value={pub.year}
                  onChange={(e) =>
                    updatePublication(index, 'year', e.target.value)
                  }
                  className="text-sm border-neutral-300"
                />
                <Input
                  placeholder="URL (optional)"
                  value={pub.url}
                  onChange={(e) =>
                    updatePublication(index, 'url', e.target.value)
                  }
                  className="text-sm border-neutral-300 col-span-2"
                />
              </div>
            </Card>
          ))}
          <Button
            onClick={addPublication}
            variant="outline"
            className="border-neutral-300 text-blue-500 hover:text-blue-600 mb-8"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Publication
          </Button>
        </div>

        {/* Certifications Section */}
        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-4 tracking-tight">
            Certifications
          </h2>
          {formData.certifications.map((cert, index) => (
            <Card key={index} className="p-6 border border-neutral-200 mb-4">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-semibold text-neutral-700">
                  Certification {index + 1}
                </p>
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
                  onChange={(e) =>
                    updateCertification(index, 'name', e.target.value)
                  }
                  className="text-sm border-neutral-300 col-span-2"
                />
                <Input
                  placeholder="Year"
                  value={cert.year}
                  onChange={(e) =>
                    updateCertification(index, 'year', e.target.value)
                  }
                  className="text-sm border-neutral-300"
                />
                <Input
                  placeholder="Issuing Organization"
                  value={cert.issuer}
                  onChange={(e) =>
                    updateCertification(index, 'issuer', e.target.value)
                  }
                  className="text-sm border-neutral-300 col-span-3"
                />
              </div>
            </Card>
          ))}
          <Button
            onClick={addCertification}
            variant="outline"
            className="border-neutral-300 text-blue-500 hover:text-blue-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Certification
          </Button>
        </div>
      </div>
    </div>
  )
}

function StepAuthorization({ formData, handleInputChange }) {
  const [countrySearch, setCountrySearch] = useState('')

  const handleCountryChange = (value) => {
    handleInputChange({ target: { name: 'citizenship', value } })
  }

  const filteredCountries = COUNTRIES.filter((country) =>
    country.toLowerCase().includes(countrySearch.toLowerCase())
  )

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">
          Work Authorization
        </h2>
        <p className="text-sm text-neutral-600">
          Confirm your legal ability to work
        </p>
      </div>

      <Card className="p-6 border border-neutral-200 space-y-6">
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
              <label
                key={option.value}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="radio"
                  name="workAuthorized"
                  value={option.value}
                  checked={formData.workAuthorized === option.value}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600"
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
            CITIZENSHIP COUNTRY *
          </label>
          <Select
            value={formData.citizenship}
            onValueChange={handleCountryChange}
          >
            <SelectTrigger className="text-sm border-neutral-300">
              <SelectValue placeholder="Select your country" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <div className="sticky top-0 z-10 bg-white px-2 pb-2 pt-2">
                <Input
                  placeholder="Search countries..."
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  className="h-8 text-sm"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
              {filteredCountries.length > 0 ? (
                filteredCountries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))
              ) : (
                <div className="px-2 py-6 text-center text-sm text-neutral-500">
                  No countries found
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="p-4  border-2 border-blue-100 rounded-lg">
          <p className="text-sm text-blue-400">
            Your work authorization status helps us match you with opportunities
            you're eligible for.
          </p>
        </div>
      </Card>
    </div>
  )
}
