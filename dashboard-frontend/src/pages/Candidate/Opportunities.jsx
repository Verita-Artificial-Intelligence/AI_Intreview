import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Search, DollarSign, MapPin, Clock } from 'lucide-react'
import CandidateSidebar from '../../components/CandidateSidebar'
import { toast } from 'sonner'

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : 'http://localhost:8000/api'

export default function Opportunities() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [jobs, setJobs] = useState([])
  const [annotationTasks, setAnnotationTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [appliedJobs, setAppliedJobs] = useState(new Set())

  useEffect(() => {
    if (user?.id) {
      fetchJobs()
      fetchAnnotationTasks()
      fetchAppliedJobs()
    }
  }, [user])

  const fetchJobs = async () => {
    try {
      const response = await axios.get(`${API}/jobs`)
      // Filter to only show open jobs
      const openJobs = response.data.filter((job) => job.status === 'open')
      setJobs(openJobs)
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
      toast.error('Failed to load opportunities')
    } finally {
      setLoading(false)
    }
  }

  const fetchAnnotationTasks = async () => {
    try {
      const response = await axios.get(`${API}/annotations/user/${user.id}`)
      setAnnotationTasks(response.data || [])
    } catch (error) {
      console.error('Failed to fetch annotation tasks:', error)
    }
  }

  const fetchAppliedJobs = async () => {
    try {
      const response = await axios.get(`${API}/interviews/candidate/${user.id}`)
      const jobIds = new Set(response.data.map((interview) => interview.job_id))
      setAppliedJobs(jobIds)
    } catch (error) {
      console.error('Failed to fetch applied jobs:', error)
    }
  }

  const handleApply = async (jobId) => {
    try {
      // Create an interview for this job
      await axios.post(`${API}/interviews`, {
        job_id: jobId,
        candidate_id: user.id,
        candidate_name: user.name,
        candidate_email: user.email,
        status: 'scheduled',
      })

      toast.success(
        'Successfully applied! Check Active Jobs for your interview.'
      )
      setAppliedJobs((prev) => new Set([...prev, jobId]))
      fetchAppliedJobs()
    } catch (error) {
      console.error('Failed to apply:', error)
      toast.error('Failed to apply for job')
    }
  }

  const filteredJobs = jobs.filter((job) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      job.title?.toLowerCase().includes(search) ||
      job.description?.toLowerCase().includes(search) ||
      job.position?.toLowerCase().includes(search)
    )
  })

  return (
    <div className="flex min-h-screen bg-background">
      <CandidateSidebar showAnnotationTasks={annotationTasks.length > 0} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-display font-bold text-neutral-900">
              Browse Opportunities
            </h2>
            <p className="text-neutral-600 mt-1">
              Discover and apply for available positions
            </p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Jobs Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-neutral-600">Loading opportunities...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Search className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                <p className="text-neutral-600">No opportunities found</p>
                <p className="text-sm text-neutral-500 mt-1">
                  {searchTerm
                    ? 'Try adjusting your search terms'
                    : 'Check back later for new positions'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredJobs.map((job) => {
                const hasApplied = appliedJobs.has(job.id)
                const isAnnotationJob = job.interview_type === 'human_data'

                return (
                  <Card
                    key={job.id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg mb-2">
                            {job.title || job.position}
                          </CardTitle>
                          {isAnnotationJob && (
                            <Badge className="bg-purple-100 text-purple-700 mb-2">
                              Creative Project
                            </Badge>
                          )}
                        </div>
                        <Badge className="bg-green-100 text-green-700 flex-shrink-0">
                          Open
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-sm text-neutral-700 line-clamp-3">
                          {job.description || 'No description available'}
                        </p>

                        <div className="space-y-2">
                          {job.pay_per_hour && (
                            <div className="flex items-center gap-2 text-sm text-neutral-600">
                              <DollarSign className="w-4 h-4" />
                              <span>${job.pay_per_hour}/hr</span>
                            </div>
                          )}
                          {job.location && (
                            <div className="flex items-center gap-2 text-sm text-neutral-600">
                              <MapPin className="w-4 h-4" />
                              <span>{job.location}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm text-neutral-600">
                            <Clock className="w-4 h-4" />
                            <span>
                              Posted{' '}
                              {new Date(job.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="pt-3">
                          {hasApplied ? (
                            <Button
                              disabled
                              variant="outline"
                              className="w-full"
                            >
                              Already Applied
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleApply(job.id)}
                              className="w-full bg-brand-500 hover:bg-brand-600 text-white"
                            >
                              Apply Now
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
