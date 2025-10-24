import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Sidebar from '@/components/Sidebar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Briefcase,
  ArrowRight,
  Search,
  CheckCircle,
  TrendingUp,
  Clock,
  FileCheck,
  X,
  DollarSign,
  Calendar,
  MapPin,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API = `${BACKEND_URL}/api`

const Marketplace = () => {
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const [jobs, setJobs] = useState([])
  const [filteredJobs, setFilteredJobs] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [userInterviews, setUserInterviews] = useState([])
  const [filterMode, setFilterMode] = useState('newest')
  const [selectedJob, setSelectedJob] = useState(null)
  const [sortBy, setSortBy] = useState('newest')
  const [profileData, setProfileData] = useState(null)

  const getInterviewTypeLabel = (type) => {
    const labels = {
      standard: 'Standard Interview',
      resume_based: 'Portfolio/Resume Based',
      human_data: 'Design Critique',
      software_engineer: 'Creative Project',
      custom_questions: 'Custom Questions',
      coding_exercise: 'Creative Exercise',
      custom_exercise: 'Custom Creative Exercise',
    }
    return (
      labels[type] ||
      type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    )
  }

  useEffect(() => {
    fetchJobs()
    fetchProfile()
  }, [])

  useEffect(() => {
    let filtered = jobs

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.position_type.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply mode filter
    if (filterMode === 'applied') {
      filtered = filtered.filter((job) => getJobApplication(job.id))
    }

    // Apply sorting
    if (sortBy === 'newest') {
      filtered = [...filtered].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      )
    } else if (sortBy === 'trending') {
      // For now, trending is the same as newest. Could add view count later
      filtered = [...filtered].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      )
    } else if (sortBy === 'most_pay') {
      filtered = [...filtered].sort((a, b) => {
        const payA = parseFloat(
          typeof a.pay_per_hour === 'string'
            ? a.pay_per_hour.replace(/[^0-9.]/g, '')
            : a.pay_per_hour || 0
        )
        const payB = parseFloat(
          typeof b.pay_per_hour === 'string'
            ? b.pay_per_hour.replace(/[^0-9.]/g, '')
            : b.pay_per_hour || 0
        )
        return payB - payA
      })
    }
    // job_fit sorting can be implemented later with a scoring algorithm

    setFilteredJobs(filtered)
  }, [searchTerm, jobs, filterMode, sortBy, userInterviews])

  const fetchJobs = async () => {
    try {
      const [jobsRes, interviewsRes] = await Promise.all([
        axios.get(`${API}/jobs`), // Get all jobs
        axios.get(`${API}/interviews`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      // Filter out completed and archived jobs - candidates can apply for pending and in_progress jobs
      const activeJobs = jobsRes.data.filter(
        (job) => job.status !== 'completed' && job.status !== 'archived'
      )

      setJobs(activeJobs)
      setFilteredJobs(activeJobs)

      // Filter interviews for current user
      const myInterviews = interviewsRes.data.filter(
        (interview) => interview.candidate_id === user?.id
      )
      setUserInterviews(myInterviews)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API}/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setProfileData(response.data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const getJobApplication = (jobId) => {
    return userInterviews.find((interview) => interview.job_id === jobId)
  }

  const handleStartInterview = (jobId) => {
    // Always route through job application onboarding
    // This flow handles: resume, work auth, availability confirmation, and equipment check
    // All are required for every job application
    navigate(`/job-application-onboarding?jobId=${jobId}`)
  }

  const handleViewApplication = (jobId) => {
    const application = getJobApplication(jobId)
    if (application) {
      navigate(`/status?interviewId=${application.id}`)
    }
  }

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now - date
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) {
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
      if (diffInHours === 0) {
        return 'Posted just now'
      }
      return `Posted ${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`
    } else if (diffInDays === 1) {
      return 'Posted 1 day ago'
    } else if (diffInDays < 30) {
      return `Posted ${diffInDays} days ago`
    } else if (diffInDays < 60) {
      return 'Posted a month ago'
    } else {
      const diffInMonths = Math.floor(diffInDays / 30)
      return `Posted ${diffInMonths} months ago`
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />

      <main className="ml-64 flex h-screen overflow-hidden">
        {/* Left side - Job List */}
        <div
          className={`flex-shrink-0 overflow-y-auto ${
            selectedJob ? 'w-1/2' : 'w-full'
          } transition-all duration-300`}
        >
          <div className="px-6 py-8">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-neutral-900 mb-1">
                Marketplace
              </h1>
              <p className="text-sm text-gray-500">
                Discover elite projects matched to your expertise and skills
              </p>
            </div>

            {/* Search Bar and Filters */}
            {jobs.length > 0 && (
              <div className="mb-6 flex flex-col gap-3">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search by title, type, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-sm"
                  />
                </div>

                {/* Filter Buttons */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => setSortBy('trending')}
                    className={`rounded-lg h-8 px-3 text-xs font-medium transition-colors ${
                      sortBy === 'trending'
                        ? 'border-brand-500 text-brand-600 font-bold bg-white hover:bg-brand-50'
                        : 'border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-50'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                    Trending
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSortBy('newest')}
                    className={`rounded-lg h-8 px-3 text-xs font-medium transition-colors ${
                      sortBy === 'newest'
                        ? 'border-brand-500 text-brand-600 font-bold bg-white hover:bg-brand-50'
                        : 'border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-50'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 mr-1.5" />
                    Newest
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSortBy('most_pay')}
                    className={`rounded-lg h-8 px-3 text-xs font-medium transition-colors ${
                      sortBy === 'most_pay'
                        ? 'border-brand-500 text-brand-600 font-bold bg-white hover:bg-brand-50'
                        : 'border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-50'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5 mr-1.5" />
                    Most Pay
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSortBy('job_fit')}
                    className={`rounded-lg h-8 px-3 text-xs font-medium transition-colors ${
                      sortBy === 'job_fit'
                        ? 'border-brand-500 text-brand-600 font-bold bg-white hover:bg-brand-50'
                        : 'border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-50'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                    Job Fit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setFilterMode(
                        filterMode === 'applied' ? 'all' : 'applied'
                      )
                    }
                    className={`rounded-lg h-8 px-3 text-xs font-medium transition-colors ${
                      filterMode === 'applied'
                        ? 'border-brand-500 text-brand-600 font-bold bg-white hover:bg-brand-50'
                        : 'border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-50'
                    }`}
                  >
                    <FileCheck className="w-3.5 h-3.5 mr-1.5" />
                    Applied
                  </Button>
                </div>
              </div>
            )}

            {loading ? (
              <p className="text-sm text-gray-600">Loading jobs...</p>
            ) : jobs.length === 0 ? (
              <Card className="p-8 text-center bg-white border border-gray-200 rounded-lg shadow-sm">
                <Briefcase
                  className="w-10 h-10 mx-auto mb-3 text-gray-300"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-gray-600 mb-4">
                  There are no creative positions available right now.
                </p>
              </Card>
            ) : filteredJobs.length === 0 ? (
              <Card className="p-8 text-center bg-white border border-gray-200 rounded-lg shadow-sm">
                <Search
                  className="w-10 h-10 mx-auto mb-3 text-gray-300"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-gray-600 mb-4">
                  No jobs match your search. Try different keywords!
                </p>
                <Button
                  onClick={() => setSearchTerm('')}
                  variant="outline"
                  size="sm"
                  className="rounded-lg font-normal text-xs h-8 px-3"
                >
                  Clear Search
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredJobs.map((job) => {
                  const application = getJobApplication(job.id)
                  const hasApplied = !!application

                  return (
                    <Card
                      key={job.id}
                      className={`p-5 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all cursor-pointer`}
                      onClick={() => setSelectedJob(job)}
                    >
                      <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div className="flex-shrink-0 p-2.5 rounded-lg bg-neutral-100 border border-neutral-200">
                          <Briefcase className="w-5 h-5 text-neutral-600" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base text-neutral-900 mb-1">
                            {job.title}
                          </h3>
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            {job.pay_per_hour && (
                              <>
                                <span className="font-medium text-neutral-700">
                                  {job.pay_per_hour}/hr
                                </span>
                                <span className="text-gray-400">•</span>
                              </>
                            )}
                            <span>{getTimeAgo(job.created_at)}</span>
                          </div>
                        </div>

                        {/* Right side - Position type badge and applied status */}
                        <div className="flex items-center gap-2">
                          {hasApplied && (
                            <Badge className="bg-brand-50 text-brand-600 border-brand-200 text-xs font-medium px-2.5 py-1 hover:bg-brand-50">
                              Applied
                            </Badge>
                          )}
                          <Badge className="bg-neutral-100 text-neutral-700 border-neutral-200 text-xs font-medium px-2.5 py-1 hover:bg-neutral-100">
                            {job.position_type}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right side - Job Details */}
        {selectedJob && (
          <div className="w-1/2 bg-white overflow-y-auto flex flex-col py-8">
            <div className="flex flex-col h-full border-l border-gray-200 relative">
              {/* Close button at top right */}
              <div className="absolute top-0 right-6">
                <button
                  onClick={() => setSelectedJob(null)}
                  className="p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 px-6 space-y-2 overflow-y-auto pb-20">
                {/* Job Title */}
                <div className="pr-12">
                  <h1 className="text-2xl font-bold text-neutral-900">
                    {selectedJob.title}
                  </h1>
                </div>

                {/* Hourly Rate */}
                {selectedJob.pay_per_hour && (
                  <div className="">
                    <span className="text-lg font-bold text-neutral-900">
                      ${selectedJob.pay_per_hour}
                    </span>
                    <span className="text-sm text-gray-600 ml-1">per hour</span>
                  </div>
                )}

                {/* Position Type and Remote Info */}
                <div className="flex items-center gap-4 text-sm text-gray-600 -mt-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    <span>Hourly contract</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-600" />
                    <span>Remote</span>
                  </div>
                </div>

                {/* Posted By Section */}
                <div className="flex items-center gap-3 py-4 border-y border-gray-200">
                  <img
                    src="/images/verita_ai_logo.jpeg"
                    alt="Verita AI"
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      Posted by Verita AI
                    </p>
                    <p className="text-xs text-gray-500">verita-ai.com</p>
                  </div>
                </div>

                {/* Application Progress Section */}
                {(() => {
                  const application = getJobApplication(selectedJob.id)
                  const hasApplied = !!application

                  // Calculate application steps
                  const interviewCompleted =
                    hasApplied && application?.status === 'completed'

                  const steps = [
                    {
                      name: 'Resume',
                      completed: !!profileData?.resume_url,
                      date: profileData?.resume_url
                        ? new Date().toLocaleDateString('en-US', {
                            month: '2-digit',
                            day: '2-digit',
                            year: '2-digit',
                          })
                        : null,
                    },
                    {
                      name: getInterviewTypeLabel(selectedJob.interview_type),
                      completed: interviewCompleted,
                      date: null,
                    },
                    {
                      name: 'Availability',
                      // If interview is completed, availability must have been confirmed
                      completed: interviewCompleted,
                      date: interviewCompleted
                        ? new Date().toLocaleDateString('en-US', {
                            month: '2-digit',
                            day: '2-digit',
                            year: '2-digit',
                          })
                        : null,
                    },
                    {
                      name: 'Work Authorization',
                      completed: !!profileData?.work_authorization,
                      date: profileData?.work_authorization
                        ? new Date().toLocaleDateString('en-US', {
                            month: '2-digit',
                            day: '2-digit',
                            year: '2-digit',
                          })
                        : null,
                    },
                  ]

                  const completedSteps = steps.filter((s) => s.completed).length
                  const totalSteps = steps.length
                  const progressPercentage = Math.round(
                    (completedSteps / totalSteps) * 100
                  )

                  return (
                    <div className="py-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-neutral-900">
                          Application
                        </h3>
                        <button
                          onClick={() => {}}
                          className="p-1 hover:bg-gray-50 rounded transition-colors"
                        >
                          <svg
                            className="w-5 h-5 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">
                            {completedSteps} of {totalSteps} steps completed
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {progressPercentage}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-500 transition-all duration-300"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Application Steps */}
                      <div className="space-y-4">
                        {steps.map((step, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between"
                          >
                            <div className="flex-1">
                              <p className="text-base font-semibold text-neutral-900">
                                {step.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {step.completed
                                  ? step.date
                                    ? `Completed on ${step.date}`
                                    : 'Completed'
                                  : 'Not done'}
                              </p>
                            </div>
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                step.completed
                                  ? 'bg-brand-500'
                                  : 'border-2 border-gray-300'
                              }`}
                            >
                              {step.completed && (
                                <svg
                                  className="w-5 h-5 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Location and Type */}
                <div className="pt-4 pb-2 border-t border-gray-200 space-y-2">
                  <div>
                    <p className="text-sm">
                      <span className="font-semibold text-neutral-900">
                        Type:
                      </span>{' '}
                      <span className="text-gray-600">
                        {selectedJob.position_type}
                      </span>
                    </p>
                  </div>
                  {selectedJob.availability && (
                    <div>
                      <p className="text-sm">
                        <span className="font-semibold text-neutral-900">
                          Availability:
                        </span>{' '}
                        <span className="text-gray-600">
                          {selectedJob.availability}
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedJob.description && (
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-neutral-900 mb-2">
                      Description
                    </h4>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {selectedJob.description}
                    </p>
                  </div>
                )}

                {/* Skills */}
                {selectedJob.skills && selectedJob.skills.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-900 mb-2">
                      Required Skills
                    </h4>
                    <div className="space-y-2">
                      {selectedJob.skills.map((skill, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-lg bg-neutral-50 border border-neutral-200"
                        >
                          <div className="font-medium text-sm text-neutral-900">
                            {skill.name}
                          </div>
                          {skill.description && (
                            <div className="text-xs text-gray-600 mt-1">
                              {skill.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Questions */}
                {selectedJob.custom_questions &&
                  selectedJob.custom_questions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-900 mb-2">
                        Interview Questions
                      </h4>
                      <ul className="space-y-2">
                        {selectedJob.custom_questions.map((question, index) => (
                          <li
                            key={index}
                            className="flex gap-2 text-sm text-gray-700"
                          >
                            <span className="text-brand-500 font-semibold">
                              {index + 1}.
                            </span>
                            <span>{question}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>

              {/* Footer Actions */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
                {(() => {
                  const application = getJobApplication(selectedJob.id)
                  const hasApplied = !!application
                  const interviewCompleted =
                    hasApplied && application?.status === 'completed'

                  // Calculate completion based on profile and interview status
                  const steps = [
                    { completed: !!profileData?.resume_url },
                    { completed: interviewCompleted },
                    { completed: interviewCompleted }, // Availability
                    { completed: !!profileData?.work_authorization },
                  ]
                  const allStepsComplete = steps.every((s) => s.completed)

                  if (allStepsComplete) {
                    return (
                      <Button
                        onClick={() => handleViewApplication(selectedJob.id)}
                        size="sm"
                        className="w-full h-10 rounded-lg text-white text-sm font-medium"
                      >
                        View Application Status
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )
                  } else if (hasApplied) {
                    return (
                      <Button
                        onClick={() => handleViewApplication(selectedJob.id)}
                        size="sm"
                        className="w-full h-10 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium"
                      >
                        Continue Application
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )
                  } else {
                    return (
                      <Button
                        onClick={() => handleStartInterview(selectedJob.id)}
                        size="sm"
                        className="w-full h-10 rounded-lg text-sm font-medium"
                      >
                        Start Application
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )
                  }
                })()}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Marketplace
