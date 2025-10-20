import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Sidebar from '@/components/Sidebar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Briefcase, ArrowRight, Search, CheckCircle, TrendingUp, Clock, FileCheck, X, DollarSign } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  cardStyles,
  pageHeader,
  containers,
} from '@/lib/design-system'

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

  useEffect(() => {
    fetchJobs()
  }, [])

  useEffect(() => {
    let filtered = jobs

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((job) =>
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
    if (filterMode === 'newest') {
      filtered = [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    } else if (filterMode === 'trending') {
      // For now, trending is the same as newest. Could add view count later
      filtered = [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }

    setFilteredJobs(filtered)
  }, [searchTerm, jobs, filterMode, userInterviews])

  const fetchJobs = async () => {
    try {
      const [jobsRes, interviewsRes] = await Promise.all([
        axios.get(`${API}/jobs`), // Get all jobs
        axios.get(`${API}/interviews`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      // Filter out completed and archived jobs - candidates can apply for pending and in_progress jobs
      const activeJobs = jobsRes.data.filter(
        job => job.status !== 'completed' && job.status !== 'archived'
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

  const getJobApplication = (jobId) => {
    return userInterviews.find((interview) => interview.job_id === jobId)
  }

  const handleStartInterview = (jobId) => {
    navigate(`/interview-prep?jobId=${jobId}`)
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
    <div className="flex min-h-screen bg-white relative">
      <Sidebar />

      <main className="flex-1 overflow-y-auto bg-white">
        <div className={`${containers.lg} mx-auto px-8 py-12`}>
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-neutral-900 mb-3 tracking-tight leading-tight">
            Explore opportunities
          </h1>
          <p className="text-lg text-neutral-600 font-light">
            Discover elite projects matched to your expertise and skills
          </p>
        </div>

        {/* Search Bar and Filters */}
        {jobs.length > 0 && (
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Type to search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 rounded-lg border-neutral-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 text-base"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterMode === 'trending' ? 'default' : 'outline'}
                onClick={() => setFilterMode('trending')}
                className={`rounded-full h-9 px-4 text-sm font-medium ${
                  filterMode === 'trending'
                    ? 'bg-brand-500 hover:bg-brand-600 text-white'
                    : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <TrendingUp className="w-4 h-4 mr-1.5" />
                Trending
              </Button>
              <Button
                variant={filterMode === 'newest' ? 'default' : 'outline'}
                onClick={() => setFilterMode('newest')}
                className={`rounded-full h-9 px-4 text-sm font-medium ${
                  filterMode === 'newest'
                    ? 'bg-brand-500 hover:bg-brand-600 text-white'
                    : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <Clock className="w-4 h-4 mr-1.5" />
                Newest
              </Button>
              <Button
                variant={filterMode === 'applied' ? 'default' : 'outline'}
                onClick={() => setFilterMode('applied')}
                className={`rounded-full h-9 px-4 text-sm font-medium ${
                  filterMode === 'applied'
                    ? 'bg-brand-500 hover:bg-brand-600 text-white'
                    : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <FileCheck className="w-4 h-4 mr-1.5" />
                Applied
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-neutral-600">Loading jobs...</p>
        ) : jobs.length === 0 ? (
          <Card className={`p-8 text-center ${cardStyles.default}`}>
            <Briefcase className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <h3 className="text-lg font-display font-semibold mb-2 text-neutral-900">
              No Open Opportunities
            </h3>
            <p className="text-sm text-neutral-600">
              There are no creative positions available right now. Check back soon for exciting opportunities to showcase your work!
            </p>
          </Card>
        ) : filteredJobs.length === 0 ? (
          <Card className={`p-8 text-center ${cardStyles.default}`}>
            <Search className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <h3 className="text-lg font-display font-semibold mb-2 text-neutral-900">
              No Results Found
            </h3>
            <p className="text-sm text-neutral-600 mb-3">
              No jobs match your search. Try different keywords!
            </p>
            <Button
              onClick={() => setSearchTerm('')}
              variant="outline"
              className="rounded-lg"
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
                  className="p-5 bg-white rounded-xl border border-neutral-200 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                  onClick={() => setSelectedJob(job)}
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 p-3 rounded-lg bg-neutral-100">
                      <Briefcase className="w-6 h-6 text-neutral-600" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-base text-neutral-900 mb-1">
                        {job.title}
                      </h3>
                      <p className="text-sm text-neutral-500">
                        {getTimeAgo(job.created_at)}
                      </p>
                    </div>

                    {/* Right side - Pay, Position type and action */}
                    <div className="flex items-center gap-3">
                      {job.pay_per_hour && (
                        <div className="flex items-center gap-1 text-brand-600">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-semibold text-sm">{job.pay_per_hour}</span>
                          <span className="text-neutral-500 text-sm">/ hour</span>
                        </div>
                      )}
                      <Badge className="bg-neutral-100 text-neutral-700 border-neutral-200 text-sm font-medium px-3 py-1">
                        {job.position_type}
                      </Badge>

                      {hasApplied ? (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewApplication(job.id)
                          }}
                          data-testid={`view-application-${job.id}`}
                          variant="outline"
                          className="rounded-lg font-medium border border-neutral-300 text-neutral-700 hover:bg-neutral-50 px-4"
                        >
                          View Status
                        </Button>
                      ) : (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStartInterview(job.id)
                          }}
                          data-testid={`start-interview-${job.id}`}
                          className="rounded-lg font-medium border-2 border-brand-500 text-brand-600 hover:bg-brand-50 bg-white px-4"
                        >
                          Apply
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
        </div>
      </main>

      {/* Overlay */}
      {selectedJob && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity"
          onClick={() => setSelectedJob(null)}
        />
      )}

      {/* Side Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-[600px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          selectedJob ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedJob && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-display font-bold text-neutral-900">
                Job Details
              </h2>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <X className="w-5 h-5 text-neutral-600" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 px-6 py-6 space-y-6">
              {/* Job Icon and Title */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-4 rounded-xl bg-brand-50">
                  <Briefcase className="w-8 h-8 text-brand-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-display font-bold text-neutral-900 mb-2">
                    {selectedJob.title}
                  </h3>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-neutral-100 text-neutral-700 border-neutral-200 text-sm font-medium">
                      {selectedJob.position_type}
                    </Badge>
                    {getJobApplication(selectedJob.id) ? (
                      <Badge className="bg-brand-50 text-brand-600 border-brand-200 text-sm flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Applied
                      </Badge>
                    ) : (
                      <Badge className="bg-green-50 text-green-600 border-green-200 text-sm">
                        Open
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-neutral-500">
                    {getTimeAgo(selectedJob.created_at)}
                  </p>
                </div>
              </div>

              {/* Pay Information */}
              {selectedJob.pay_per_hour && (
                <div className="p-4 rounded-xl bg-brand-50 border border-brand-200">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-brand-600" />
                    <div>
                      <p className="text-xs text-neutral-600 mb-0.5">Hourly Rate</p>
                      <p className="text-xl font-display font-bold text-brand-600">
                        {selectedJob.pay_per_hour}
                        <span className="text-sm font-normal text-neutral-600"> / hour</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <h4 className="text-base font-display font-semibold text-neutral-900 mb-3">
                  Description
                </h4>
                <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
                  {selectedJob.description}
                </p>
              </div>

              {/* Interview Type */}
              {selectedJob.interview_type && selectedJob.interview_type !== 'standard' && (
                <div>
                  <h4 className="text-base font-display font-semibold text-neutral-900 mb-3">
                    Interview Type
                  </h4>
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-sm">
                    {selectedJob.interview_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Badge>
                </div>
              )}

              {/* Skills */}
              {selectedJob.skills && selectedJob.skills.length > 0 && (
                <div>
                  <h4 className="text-base font-display font-semibold text-neutral-900 mb-3">
                    Required Skills
                  </h4>
                  <div className="space-y-2">
                    {selectedJob.skills.map((skill, index) => (
                      <div key={index} className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                        <div className="font-medium text-sm text-neutral-900">{skill.name}</div>
                        {skill.description && (
                          <div className="text-xs text-neutral-600 mt-1">{skill.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Questions */}
              {selectedJob.custom_questions && selectedJob.custom_questions.length > 0 && (
                <div>
                  <h4 className="text-base font-display font-semibold text-neutral-900 mb-3">
                    Interview Questions
                  </h4>
                  <ul className="space-y-2">
                    {selectedJob.custom_questions.map((question, index) => (
                      <li key={index} className="flex gap-2 text-sm text-neutral-700">
                        <span className="text-brand-500 font-semibold">{index + 1}.</span>
                        <span>{question}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-white border-t border-neutral-200 px-6 py-4">
              {getJobApplication(selectedJob.id) ? (
                <Button
                  onClick={() => handleViewApplication(selectedJob.id)}
                  variant="outline"
                  className="w-full rounded-lg font-medium border-2 border-brand-500 text-brand-600 hover:bg-brand-50 h-12"
                >
                  View Application Status
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={() => handleStartInterview(selectedJob.id)}
                  className="w-full rounded-lg font-medium border-2 border-brand-500 text-brand-600 hover:bg-brand-50 bg-white h-12"
                >
                  Start Interview
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Marketplace
