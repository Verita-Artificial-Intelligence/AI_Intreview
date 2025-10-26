import { useState, useEffect } from 'react'
import axios from 'axios'
import Sidebar from '@/components/Sidebar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Save, Edit2, Plus, X, FileText, Download, Upload } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API = `${BACKEND_URL}/api`

export default function Profile() {
  const { user, token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    bio: '',
    expertise: [],
    education: [],
    work_experience: [],
    projects: [],
    publications: [],
    certifications: [],
    resume_url: '',
  })

  // Track which sections are being edited
  const [editingSections, setEditingSections] = useState({
    personal: false,
    bio: false,
    expertise: false,
    education: false,
    workExperience: false,
    projects: false,
    publications: false,
    certifications: false,
    resume: false,
  })

  // Temporary state for expertise input
  const [expertiseInput, setExpertiseInput] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API}/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      setProfileData({
        name: response.data.name || '',
        email: response.data.email || '',
        bio: response.data.bio || '',
        expertise: response.data.expertise || [],
        education: response.data.education || [],
        work_experience: response.data.work_experience || [],
        projects: response.data.projects || [],
        publications: response.data.publications || [],
        certifications: response.data.certifications || [],
        resume_url: response.data.resume_url || '',
      })
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (section) => {
    setEditingSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const handleSaveSection = async (section) => {
    try {
      setSaving(true)

      // Prepare update data
      const updateData = {
        name: profileData.name,
        bio: profileData.bio,
        expertise: profileData.expertise,
        education:
          profileData.education.length > 0 ? profileData.education : undefined,
        work_experience:
          profileData.work_experience.length > 0
            ? profileData.work_experience
            : undefined,
        projects:
          profileData.projects.length > 0 ? profileData.projects : undefined,
        publications:
          profileData.publications.length > 0
            ? profileData.publications
            : undefined,
        certifications:
          profileData.certifications.length > 0
            ? profileData.certifications
            : undefined,
        resume_url: profileData.resume_url || undefined,
      }

      await axios.put(`${API}/profile/complete`, updateData, {
        headers: { Authorization: `Bearer ${token}` },
      })

      toggleSection(section)
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Expertise handlers
  const addExpertise = () => {
    if (
      expertiseInput.trim() &&
      !profileData.expertise.includes(expertiseInput.trim())
    ) {
      setProfileData((prev) => ({
        ...prev,
        expertise: [...prev.expertise, expertiseInput.trim()],
      }))
      setExpertiseInput('')
    }
  }

  const removeExpertise = (expertise) => {
    setProfileData((prev) => ({
      ...prev,
      expertise: prev.expertise.filter((e) => e !== expertise),
    }))
  }

  // Education handlers
  const addEducation = () => {
    setProfileData((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        { school: '', degree: '', field: '', year: '' },
      ],
    }))
  }

  const removeEducation = (index) => {
    setProfileData((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }))
  }

  const updateEducation = (index, field, value) => {
    setProfileData((prev) => ({
      ...prev,
      education: prev.education.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  // Work Experience handlers
  const addWorkExperience = () => {
    setProfileData((prev) => ({
      ...prev,
      work_experience: [
        ...prev.work_experience,
        { company: '', title: '', startDate: '', endDate: '', description: '' },
      ],
    }))
  }

  const removeWorkExperience = (index) => {
    setProfileData((prev) => ({
      ...prev,
      work_experience: prev.work_experience.filter((_, i) => i !== index),
    }))
  }

  const updateWorkExperience = (index, field, value) => {
    setProfileData((prev) => ({
      ...prev,
      work_experience: prev.work_experience.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  // Project handlers
  const addProject = () => {
    setProfileData((prev) => ({
      ...prev,
      projects: [...prev.projects, { name: '', description: '', url: '' }],
    }))
  }

  const removeProject = (index) => {
    setProfileData((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }))
  }

  const updateProject = (index, field, value) => {
    setProfileData((prev) => ({
      ...prev,
      projects: prev.projects.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  // Publication handlers
  const addPublication = () => {
    setProfileData((prev) => ({
      ...prev,
      publications: [
        ...prev.publications,
        { title: '', publisher: '', year: '', url: '' },
      ],
    }))
  }

  const removePublication = (index) => {
    setProfileData((prev) => ({
      ...prev,
      publications: prev.publications.filter((_, i) => i !== index),
    }))
  }

  const updatePublication = (index, field, value) => {
    setProfileData((prev) => ({
      ...prev,
      publications: prev.publications.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  // Certification handlers
  const addCertification = () => {
    setProfileData((prev) => ({
      ...prev,
      certifications: [
        ...prev.certifications,
        { name: '', issuer: '', year: '' },
      ],
    }))
  }

  const removeCertification = (index) => {
    setProfileData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }))
  }

  const updateCertification = (index, field, value) => {
    setProfileData((prev) => ({
      ...prev,
      certifications: prev.certifications.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Sidebar />
        <main className="lg:ml-64 flex items-center justify-center pb-16 lg:pb-0">
          <p className="text-sm text-gray-600">Loading profile...</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />

      {/* Main Content */}
      <main className="lg:ml-64 overflow-y-auto pb-20 lg:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-md flex items-center justify-center text-base sm:text-lg font-semibold text-neutral-900 bg-brand-200 flex-shrink-0">
                {profileData.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 mb-1">
                  {profileData.name}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">
                  {profileData.email}
                </p>
              </div>
            </div>
          </div>

          {/* Profile Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Left Column - Expertise Card */}
            <div className="lg:col-span-1">
              <Card className="p-4 sm:p-6 bg-white border border-neutral-200 h-fit lg:sticky lg:top-6">
                <div className="space-y-4">
                  {/* Status Badge */}
                  <div>
                    <p className="text-xs font-semibold text-neutral-600 tracking-wide mb-2">
                      STATUS
                    </p>
                    <Badge className="bg-green-100 text-green-800 font-semibold text-xs">
                      Active
                    </Badge>
                  </div>

                  {/* Member Since */}
                  <div>
                    <p className="text-xs font-semibold text-neutral-600 tracking-wide mb-2">
                      MEMBER SINCE
                    </p>
                    <p className="text-sm font-medium text-neutral-900">
                      {new Date().getFullYear()}
                    </p>
                  </div>

                  {/* Expertise */}
                  <div className="pt-4 border-t border-neutral-200">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-neutral-600 tracking-wide">
                        EXPERTISE
                      </p>
                      <Button
                        onClick={() => {
                          if (editingSections.expertise) {
                            handleSaveSection('expertise')
                          } else {
                            toggleSection('expertise')
                          }
                        }}
                        disabled={saving}
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                      >
                        {editingSections.expertise ? (
                          <>
                            <Save className="w-3 h-3 mr-1" /> Save
                          </>
                        ) : (
                          <>
                            <Edit2 className="w-3 h-3 mr-1" /> Edit
                          </>
                        )}
                      </Button>
                    </div>

                    {editingSections.expertise ? (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            value={expertiseInput}
                            onChange={(e) => setExpertiseInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                addExpertise()
                              }
                            }}
                            className="text-xs h-8"
                            placeholder="Add skill..."
                          />
                          <Button
                            onClick={addExpertise}
                            size="sm"
                            className="h-8 px-2 bg-blue-500 hover:bg-blue-600 text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {profileData.expertise.map((skill, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-blue-50 rounded"
                            >
                              <span className="text-xs text-neutral-700">
                                {skill}
                              </span>
                              <button
                                onClick={() => removeExpertise(skill)}
                                className="text-neutral-500 hover:text-red-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {profileData.expertise.length > 0 ? (
                          profileData.expertise.map((skill, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2"
                            >
                              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                              <span className="text-sm text-neutral-700">
                                {skill}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-neutral-500 italic">
                            No expertise added yet
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column - Main Content */}
            <div className="lg:col-span-3 space-y-4">
              {/* Personal Information */}
              <Card className="p-4 sm:p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-neutral-900">
                    Personal Information
                  </h2>
                  <Button
                    onClick={() => {
                      if (editingSections.personal) {
                        handleSaveSection('personal')
                      } else {
                        toggleSection('personal')
                      }
                    }}
                    disabled={saving}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    {editingSections.personal ? (
                      <>
                        <Save className="w-3 h-3 mr-1" /> Save
                      </>
                    ) : (
                      <>
                        <Edit2 className="w-3 h-3 mr-1" /> Edit
                      </>
                    )}
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 tracking-wide mb-2">
                      FULL NAME
                    </label>
                    <Input
                      name="name"
                      value={profileData.name}
                      onChange={handleInputChange}
                      disabled={!editingSections.personal}
                      className={`text-sm font-medium ${!editingSections.personal ? 'bg-neutral-50 border-neutral-200 cursor-default' : 'border-blue-300'}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 tracking-wide mb-2">
                      EMAIL
                    </label>
                    <Input
                      name="email"
                      type="email"
                      value={profileData.email}
                      disabled={true}
                      className="text-sm bg-neutral-50 border-neutral-200 cursor-default"
                    />
                  </div>
                </div>
              </Card>

              {/* Resume */}
              <Card className="p-4 sm:p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-neutral-900">
                    Resume
                  </h2>
                  <Button
                    onClick={() => {
                      if (editingSections.resume) {
                        handleSaveSection('resume')
                      } else {
                        toggleSection('resume')
                      }
                    }}
                    disabled={saving}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    {editingSections.resume ? (
                      <>
                        <Save className="w-3 h-3 mr-1" /> Save
                      </>
                    ) : (
                      <>
                        <Edit2 className="w-3 h-3 mr-1" /> Edit
                      </>
                    )}
                  </Button>
                </div>

                {editingSections.resume ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 tracking-wide mb-2">
                        RESUME URL
                      </label>
                      <Input
                        name="resume_url"
                        value={profileData.resume_url}
                        onChange={handleInputChange}
                        className="text-sm border-blue-300"
                        placeholder="https://example.com/resume.pdf"
                      />
                      <p className="text-xs text-neutral-500 mt-2">
                        Enter a public URL to your resume (Google Drive,
                        Dropbox, personal website, etc.)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    {profileData.resume_url ? (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm text-neutral-900">
                              Resume
                            </p>
                            <p className="text-xs text-neutral-600 truncate">
                              {profileData.resume_url}
                            </p>
                          </div>
                        </div>
                        <a
                          href={profileData.resume_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors flex-shrink-0 w-full sm:w-auto"
                        >
                          <Download className="w-3 h-3" />
                          View Resume
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                        <Upload className="w-5 h-5 text-neutral-400" />
                        <p className="text-sm text-neutral-500 italic">
                          No resume added yet
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* Bio */}
              <Card className="p-4 sm:p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-neutral-900">
                    About
                  </h2>
                  <Button
                    onClick={() => {
                      if (editingSections.bio) {
                        handleSaveSection('bio')
                      } else {
                        toggleSection('bio')
                      }
                    }}
                    disabled={saving}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    {editingSections.bio ? (
                      <>
                        <Save className="w-3 h-3 mr-1" /> Save
                      </>
                    ) : (
                      <>
                        <Edit2 className="w-3 h-3 mr-1" /> Edit
                      </>
                    )}
                  </Button>
                </div>

                <Textarea
                  name="bio"
                  value={profileData.bio}
                  onChange={handleInputChange}
                  disabled={!editingSections.bio}
                  className={`text-sm resize-none min-h-24 ${!editingSections.bio ? 'bg-neutral-50 border-neutral-200 cursor-default' : 'border-blue-300'}`}
                  placeholder="Tell us about yourself..."
                />
              </Card>

              {/* Education */}
              <Card className="p-4 sm:p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-neutral-900">
                    Education
                  </h2>
                  <Button
                    onClick={() => {
                      if (editingSections.education) {
                        handleSaveSection('education')
                      } else {
                        toggleSection('education')
                      }
                    }}
                    disabled={saving}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    {editingSections.education ? (
                      <>
                        <Save className="w-3 h-3 mr-1" /> Save
                      </>
                    ) : (
                      <>
                        <Edit2 className="w-3 h-3 mr-1" /> Edit
                      </>
                    )}
                  </Button>
                </div>

                {editingSections.education ? (
                  <div className="space-y-4">
                    {profileData.education.map((edu, index) => (
                      <div
                        key={index}
                        className="p-4 border border-neutral-200 rounded-lg"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <p className="text-xs font-semibold text-neutral-600">
                            Education {index + 1}
                          </p>
                          <button
                            onClick={() => removeEducation(index)}
                            className="text-neutral-500 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Input
                            placeholder="School/University"
                            value={edu.school}
                            onChange={(e) =>
                              updateEducation(index, 'school', e.target.value)
                            }
                            className="text-sm"
                          />
                          <Input
                            placeholder="Degree"
                            value={edu.degree}
                            onChange={(e) =>
                              updateEducation(index, 'degree', e.target.value)
                            }
                            className="text-sm"
                          />
                          <Input
                            placeholder="Field of Study"
                            value={edu.field}
                            onChange={(e) =>
                              updateEducation(index, 'field', e.target.value)
                            }
                            className="text-sm"
                          />
                          <Input
                            placeholder="Year"
                            value={edu.year}
                            onChange={(e) =>
                              updateEducation(index, 'year', e.target.value)
                            }
                            className="text-sm"
                          />
                        </div>
                      </div>
                    ))}
                    <Button
                      onClick={addEducation}
                      variant="outline"
                      size="sm"
                      className="text-blue-500 hover:text-blue-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Education
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {profileData.education.length > 0 ? (
                      profileData.education.map((edu, index) => (
                        <div
                          key={index}
                          className="p-4 bg-neutral-50 rounded-lg"
                        >
                          <p className="font-semibold text-sm text-neutral-900">
                            {edu.degree} in {edu.field}
                          </p>
                          <p className="text-sm text-neutral-600">
                            {edu.school}
                          </p>
                          {edu.year && (
                            <p className="text-xs text-neutral-500 mt-1">
                              {edu.year}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-neutral-500 italic">
                        No education added yet
                      </p>
                    )}
                  </div>
                )}
              </Card>

              {/* Work Experience */}
              <Card className="p-4 sm:p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-neutral-900">
                    Work Experience
                  </h2>
                  <Button
                    onClick={() => {
                      if (editingSections.workExperience) {
                        handleSaveSection('workExperience')
                      } else {
                        toggleSection('workExperience')
                      }
                    }}
                    disabled={saving}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    {editingSections.workExperience ? (
                      <>
                        <Save className="w-3 h-3 mr-1" /> Save
                      </>
                    ) : (
                      <>
                        <Edit2 className="w-3 h-3 mr-1" /> Edit
                      </>
                    )}
                  </Button>
                </div>

                {editingSections.workExperience ? (
                  <div className="space-y-4">
                    {profileData.work_experience.map((exp, index) => (
                      <div
                        key={index}
                        className="p-4 border border-neutral-200 rounded-lg"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <p className="text-xs font-semibold text-neutral-600">
                            Experience {index + 1}
                          </p>
                          <button
                            onClick={() => removeWorkExperience(index)}
                            className="text-neutral-500 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input
                              placeholder="Company"
                              value={exp.company}
                              onChange={(e) =>
                                updateWorkExperience(
                                  index,
                                  'company',
                                  e.target.value
                                )
                              }
                              className="text-sm"
                            />
                            <Input
                              placeholder="Job Title"
                              value={exp.title}
                              onChange={(e) =>
                                updateWorkExperience(
                                  index,
                                  'title',
                                  e.target.value
                                )
                              }
                              className="text-sm"
                            />
                            <Input
                              placeholder="Start Date"
                              value={exp.startDate}
                              onChange={(e) =>
                                updateWorkExperience(
                                  index,
                                  'startDate',
                                  e.target.value
                                )
                              }
                              className="text-sm"
                            />
                            <Input
                              placeholder="End Date"
                              value={exp.endDate}
                              onChange={(e) =>
                                updateWorkExperience(
                                  index,
                                  'endDate',
                                  e.target.value
                                )
                              }
                              className="text-sm"
                            />
                          </div>
                          <Textarea
                            placeholder="Description"
                            value={exp.description}
                            onChange={(e) =>
                              updateWorkExperience(
                                index,
                                'description',
                                e.target.value
                              )
                            }
                            className="text-sm resize-none min-h-20"
                          />
                        </div>
                      </div>
                    ))}
                    <Button
                      onClick={addWorkExperience}
                      variant="outline"
                      size="sm"
                      className="text-blue-500 hover:text-blue-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Work Experience
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {profileData.work_experience.length > 0 ? (
                      profileData.work_experience.map((exp, index) => (
                        <div
                          key={index}
                          className="p-4 bg-neutral-50 rounded-lg"
                        >
                          <p className="font-semibold text-sm text-neutral-900">
                            {exp.title}
                          </p>
                          <p className="text-sm text-neutral-600">
                            {exp.company}
                          </p>
                          <p className="text-xs text-neutral-500 mt-1">
                            {exp.startDate} - {exp.endDate}
                          </p>
                          {exp.description && (
                            <p className="text-sm text-neutral-700 mt-2">
                              {exp.description}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-neutral-500 italic">
                        No work experience added yet
                      </p>
                    )}
                  </div>
                )}
              </Card>

              {/* Projects */}
              <Card className="p-4 sm:p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-neutral-900">
                    Projects
                  </h2>
                  <Button
                    onClick={() => {
                      if (editingSections.projects) {
                        handleSaveSection('projects')
                      } else {
                        toggleSection('projects')
                      }
                    }}
                    disabled={saving}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    {editingSections.projects ? (
                      <>
                        <Save className="w-3 h-3 mr-1" /> Save
                      </>
                    ) : (
                      <>
                        <Edit2 className="w-3 h-3 mr-1" /> Edit
                      </>
                    )}
                  </Button>
                </div>

                {editingSections.projects ? (
                  <div className="space-y-4">
                    {profileData.projects.map((project, index) => (
                      <div
                        key={index}
                        className="p-4 border border-neutral-200 rounded-lg"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <p className="text-xs font-semibold text-neutral-600">
                            Project {index + 1}
                          </p>
                          <button
                            onClick={() => removeProject(index)}
                            className="text-neutral-500 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-3">
                          <Input
                            placeholder="Project Name"
                            value={project.name}
                            onChange={(e) =>
                              updateProject(index, 'name', e.target.value)
                            }
                            className="text-sm"
                          />
                          <Textarea
                            placeholder="Description"
                            value={project.description}
                            onChange={(e) =>
                              updateProject(
                                index,
                                'description',
                                e.target.value
                              )
                            }
                            className="text-sm resize-none min-h-20"
                          />
                          <Input
                            placeholder="URL (optional)"
                            value={project.url}
                            onChange={(e) =>
                              updateProject(index, 'url', e.target.value)
                            }
                            className="text-sm"
                          />
                        </div>
                      </div>
                    ))}
                    <Button
                      onClick={addProject}
                      variant="outline"
                      size="sm"
                      className="text-blue-500 hover:text-blue-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Project
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {profileData.projects.length > 0 ? (
                      profileData.projects.map((project, index) => (
                        <div
                          key={index}
                          className="p-4 bg-neutral-50 rounded-lg"
                        >
                          <p className="font-semibold text-sm text-neutral-900">
                            {project.name}
                          </p>
                          {project.description && (
                            <p className="text-sm text-neutral-700 mt-1">
                              {project.description}
                            </p>
                          )}
                          {project.url && (
                            <a
                              href={project.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                            >
                              View Project
                            </a>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-neutral-500 italic">
                        No projects added yet
                      </p>
                    )}
                  </div>
                )}
              </Card>

              {/* Publications */}
              <Card className="p-4 sm:p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-neutral-900">
                    Publications
                  </h2>
                  <Button
                    onClick={() => {
                      if (editingSections.publications) {
                        handleSaveSection('publications')
                      } else {
                        toggleSection('publications')
                      }
                    }}
                    disabled={saving}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    {editingSections.publications ? (
                      <>
                        <Save className="w-3 h-3 mr-1" /> Save
                      </>
                    ) : (
                      <>
                        <Edit2 className="w-3 h-3 mr-1" /> Edit
                      </>
                    )}
                  </Button>
                </div>

                {editingSections.publications ? (
                  <div className="space-y-4">
                    {profileData.publications.map((pub, index) => (
                      <div
                        key={index}
                        className="p-4 border border-neutral-200 rounded-lg"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <p className="text-xs font-semibold text-neutral-600">
                            Publication {index + 1}
                          </p>
                          <button
                            onClick={() => removePublication(index)}
                            className="text-neutral-500 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Input
                            placeholder="Title"
                            value={pub.title}
                            onChange={(e) =>
                              updatePublication(index, 'title', e.target.value)
                            }
                            className="text-sm sm:col-span-2"
                          />
                          <Input
                            placeholder="Publisher/Venue"
                            value={pub.publisher}
                            onChange={(e) =>
                              updatePublication(
                                index,
                                'publisher',
                                e.target.value
                              )
                            }
                            className="text-sm"
                          />
                          <Input
                            placeholder="Year"
                            value={pub.year}
                            onChange={(e) =>
                              updatePublication(index, 'year', e.target.value)
                            }
                            className="text-sm"
                          />
                          <Input
                            placeholder="URL (optional)"
                            value={pub.url}
                            onChange={(e) =>
                              updatePublication(index, 'url', e.target.value)
                            }
                            className="text-sm col-span-2"
                          />
                        </div>
                      </div>
                    ))}
                    <Button
                      onClick={addPublication}
                      variant="outline"
                      size="sm"
                      className="text-blue-500 hover:text-blue-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Publication
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {profileData.publications.length > 0 ? (
                      profileData.publications.map((pub, index) => (
                        <div
                          key={index}
                          className="p-4 bg-neutral-50 rounded-lg"
                        >
                          <p className="font-semibold text-sm text-neutral-900">
                            {pub.title}
                          </p>
                          <p className="text-sm text-neutral-600">
                            {pub.publisher}
                          </p>
                          {pub.year && (
                            <p className="text-xs text-neutral-500 mt-1">
                              {pub.year}
                            </p>
                          )}
                          {pub.url && (
                            <a
                              href={pub.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                            >
                              View Publication
                            </a>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-neutral-500 italic">
                        No publications added yet
                      </p>
                    )}
                  </div>
                )}
              </Card>

              {/* Certifications */}
              <Card className="p-4 sm:p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-neutral-900">
                    Certifications
                  </h2>
                  <Button
                    onClick={() => {
                      if (editingSections.certifications) {
                        handleSaveSection('certifications')
                      } else {
                        toggleSection('certifications')
                      }
                    }}
                    disabled={saving}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    {editingSections.certifications ? (
                      <>
                        <Save className="w-3 h-3 mr-1" /> Save
                      </>
                    ) : (
                      <>
                        <Edit2 className="w-3 h-3 mr-1" /> Edit
                      </>
                    )}
                  </Button>
                </div>

                {editingSections.certifications ? (
                  <div className="space-y-4">
                    {profileData.certifications.map((cert, index) => (
                      <div
                        key={index}
                        className="p-4 border border-neutral-200 rounded-lg"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <p className="text-xs font-semibold text-neutral-600">
                            Certification {index + 1}
                          </p>
                          <button
                            onClick={() => removeCertification(index)}
                            className="text-neutral-500 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Input
                            placeholder="Certification Name"
                            value={cert.name}
                            onChange={(e) =>
                              updateCertification(index, 'name', e.target.value)
                            }
                            className="text-sm sm:col-span-2"
                          />
                          <Input
                            placeholder="Year"
                            value={cert.year}
                            onChange={(e) =>
                              updateCertification(index, 'year', e.target.value)
                            }
                            className="text-sm"
                          />
                          <Input
                            placeholder="Issuing Organization"
                            value={cert.issuer}
                            onChange={(e) =>
                              updateCertification(
                                index,
                                'issuer',
                                e.target.value
                              )
                            }
                            className="text-sm sm:col-span-3"
                          />
                        </div>
                      </div>
                    ))}
                    <Button
                      onClick={addCertification}
                      variant="outline"
                      size="sm"
                      className="text-blue-500 hover:text-blue-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Certification
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {profileData.certifications.length > 0 ? (
                      profileData.certifications.map((cert, index) => (
                        <div
                          key={index}
                          className="p-4 bg-neutral-50 rounded-lg"
                        >
                          <p className="font-semibold text-sm text-neutral-900">
                            {cert.name}
                          </p>
                          <p className="text-sm text-neutral-600">
                            {cert.issuer}
                          </p>
                          {cert.year && (
                            <p className="text-xs text-neutral-500 mt-1">
                              {cert.year}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-neutral-500 italic">
                        No certifications added yet
                      </p>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
