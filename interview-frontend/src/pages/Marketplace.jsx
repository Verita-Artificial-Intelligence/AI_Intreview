import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Briefcase, ArrowRight, Search, CheckCircle } from 'lucide-react'
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

  useEffect(() => {
    fetchJobs()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      const filtered = jobs.filter((job) =>
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.position_type.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredJobs(filtered)
    } else {
      setFilteredJobs(jobs)
    }
  }, [searchTerm, jobs])

  const fetchJobs = async () => {
    try {
      const [jobsRes, interviewsRes] = await Promise.all([
        axios.get(`${API}/jobs?status=open`),
        axios.get(`${API}/interviews`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      setJobs(jobsRes.data)
      setFilteredJobs(jobsRes.data)

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className={pageHeader.wrapper}>
        <div className={`${containers.lg} ${pageHeader.container}`}>
          <div>
            <h1 className={pageHeader.title}>Creative Opportunities</h1>
            <p className={pageHeader.subtitle}>
              Discover exciting creative roles and showcase your work
            </p>
          </div>
        </div>
      </div>

      <div className={`${containers.lg} mx-auto px-5 py-5`}>
        {/* Search Bar */}
        {jobs.length > 0 && (
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by title, type, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 rounded-lg border-neutral-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJobs.map((job) => {
              const application = getJobApplication(job.id)
              const hasApplied = !!application

              return (
                <Card key={job.id} className={`p-5 ${cardStyles.default} ${hasApplied ? 'border-brand-200' : ''}`}>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-brand-50 text-brand-500">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-display font-semibold text-base text-neutral-900">
                          {job.title}
                        </h3>
                        {hasApplied ? (
                          <Badge className="bg-brand-50 text-brand-600 border-brand-200 text-xs flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Applied
                          </Badge>
                        ) : (
                          <Badge className="bg-green-50 text-green-600 border-green-200 text-xs">
                            Open
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-neutral-600 mb-3">
                        {job.position_type}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-700 mb-4 line-clamp-3">
                    {job.description}
                  </p>
                  {hasApplied ? (
                    <Button
                      onClick={() => handleViewApplication(job.id)}
                      data-testid={`view-application-${job.id}`}
                      variant="outline"
                      className="w-full rounded-lg font-medium border-2 border-brand-500 text-brand-600 hover:bg-brand-50"
                    >
                      View Application
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleStartInterview(job.id)}
                      data-testid={`start-interview-${job.id}`}
                      className="w-full rounded-lg font-medium bg-brand-500 hover:bg-brand-600 text-white"
                    >
                      Start Interview
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Marketplace
