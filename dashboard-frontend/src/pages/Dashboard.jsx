import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Users, Briefcase, Clock, CheckCircle, Plus } from 'lucide-react'
import JobForm from '@/components/JobForm'
import JobCard from '@/components/JobCard'
import {
  cardStyles,
  iconBackgrounds,
  pageHeader,
  containers,
  getStatusClass,
  getStatusLabel,
} from '@/lib/design-system'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API = `${BACKEND_URL}/api`

const Dashboard = () => {
  const navigate = useNavigate()
  const [interviews, setInterviews] = useState([])
  const [candidates, setCandidates] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [jobFormOpen, setJobFormOpen] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [interviewsRes, candidatesRes, jobsRes] = await Promise.all([
        axios.get(`${API}/interviews`),
        axios.get(`${API}/candidates`),
        axios.get(`${API}/jobs`),
      ])
      setInterviews(interviewsRes.data)
      setCandidates(candidatesRes.data)
      setJobs(jobsRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateJob = async (jobData) => {
    try {
      await axios.post(`${API}/jobs`, jobData)
      fetchData()
    } catch (error) {
      console.error('Error creating job:', error)
      throw error
    }
  }

  const handleToggleJobStatus = async (jobId, newStatus) => {
    try {
      await axios.put(`${API}/jobs/${jobId}/status`, { status: newStatus })
      fetchData()
    } catch (error) {
      console.error('Error updating job status:', error)
    }
  }

  const stats = [
    {
      icon: <Briefcase className="w-4 h-4" />,
      label: 'Open Jobs',
      value: jobs.filter((j) => j.status === 'open').length,
      bgClass: iconBackgrounds.brand,
    },
    {
      icon: <Users className="w-4 h-4" />,
      label: 'Total Candidates',
      value: candidates.length,
      bgClass: iconBackgrounds.purple,
    },
    {
      icon: <Clock className="w-4 h-4" />,
      label: 'In Progress',
      value: interviews.filter((i) => i.status === 'in_progress').length,
      bgClass: iconBackgrounds.yellow,
    },
    {
      icon: <CheckCircle className="w-4 h-4" />,
      label: 'Completed',
      value: interviews.filter((i) => i.status === 'completed').length,
      bgClass: iconBackgrounds.blue,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className={pageHeader.wrapper}>
        <div className={`${containers.lg} ${pageHeader.container}`}>
          <div>
            <h1 className={pageHeader.title}>Creative Talent Platform</h1>
            <p className={pageHeader.subtitle}>
              Discover and hire top creative talent with AI-powered interviews
            </p>
          </div>
          <Button
            onClick={() => setJobFormOpen(true)}
            data-testid="create-job-button"
            className="rounded-lg font-medium bg-brand-500 hover:bg-brand-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Job
          </Button>
        </div>
      </div>

      <div className={`${containers.lg} mx-auto px-5 py-5`}>
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, index) => (
            <Card key={index} className={`p-4 ${cardStyles.default}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgClass}`}>
                  <div className="w-4 h-4">{stat.icon}</div>
                </div>
                <div>
                  <p className="text-xs text-neutral-600 font-medium">
                    {stat.label}
                  </p>
                  <p className="text-xl font-bold mt-0.5 text-neutral-900">
                    {stat.value}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* My Jobs */}
        <div className="mb-6">
          <h2 className="text-lg font-display font-bold mb-3 text-neutral-900">
            My Jobs
          </h2>
          {loading ? (
            <p className="text-sm text-neutral-600">Loading...</p>
          ) : jobs.length === 0 ? (
            <Card className={`p-6 text-center ${cardStyles.default}`}>
              <Briefcase className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
              <p className="text-sm text-neutral-600 mb-3">
                No creative positions posted yet. Create your first job opening to find amazing talent!
              </p>
              <Button
                onClick={() => setJobFormOpen(true)}
                data-testid="empty-state-create-job-button"
                className="h-8 text-sm rounded-lg font-medium bg-brand-500 hover:bg-brand-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Job
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.slice(0, 6).map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onStatusToggle={handleToggleJobStatus}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent Interviews */}
        <div className="mb-6">
          <h2 className="text-lg font-display font-bold mb-3 text-neutral-900">
            Recent Interviews
          </h2>
          {loading ? (
            <p className="text-sm text-neutral-600">Loading...</p>
          ) : interviews.length === 0 ? (
            <Card className={`p-6 text-center ${cardStyles.default}`}>
              <Briefcase className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
              <p className="text-sm text-neutral-600 mb-3">
                No interviews yet. Create a job posting to start interviewing talented creatives!
              </p>
              <Button
                onClick={() => setJobFormOpen(true)}
                data-testid="empty-state-create-job-button"
                className="h-8 text-sm rounded-lg font-medium bg-brand-500 hover:bg-brand-600 text-white"
              >
                Create First Job
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {interviews.slice(0, 6).map((interview) => (
                <Card
                  key={interview.id}
                  className={`p-4 ${cardStyles.default}`}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br from-brand-400 to-brand-600 flex-shrink-0">
                      {interview.candidate_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-neutral-900 truncate">
                            {interview.candidate_name || 'Unknown'}
                          </h3>
                          <p className="text-xs text-neutral-600 truncate">
                            {interview.job_title || interview.position || 'General Interview'}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap ${getStatusClass(interview.status)}`}
                        >
                          {getStatusLabel(interview.status)}
                        </span>
                      </div>
                      {interview.job_title && interview.position && interview.job_title !== interview.position && (
                        <p className="text-[10px] text-neutral-500 mt-0.5 truncate">
                          Candidate: {interview.position}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 mb-3">
                    {new Date(interview.created_at).toLocaleDateString()}
                  </p>
                  {interview.status === 'in_progress' && (
                    <Button
                      onClick={() => navigate(`/interview/${interview.id}`)}
                      data-testid={`continue-interview-${interview.id}`}
                      className="w-full h-7 text-xs rounded-lg font-medium bg-brand-500 hover:bg-brand-600 text-white"
                    >
                      Continue Interview
                    </Button>
                  )}
                  {interview.status === 'completed' && (
                    <>
                      {interview.summary && (
                        <div className="mt-2 p-2 bg-neutral-50 rounded-lg mb-2">
                          <p className="text-[10px] text-neutral-700 line-clamp-3">
                            {interview.summary}
                          </p>
                        </div>
                      )}
                      <Button
                        onClick={() =>
                          navigate(`/admin/review/${interview.id}`)
                        }
                        data-testid={`view-results-${interview.id}`}
                        className="w-full h-7 text-xs rounded-lg font-medium border-2 border-brand-500 text-brand-600 hover:bg-brand-50 bg-white"
                      >
                        View Results
                      </Button>
                    </>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <JobForm
        open={jobFormOpen}
        onClose={() => setJobFormOpen(false)}
        onSubmit={handleCreateJob}
      />
    </div>
  )
}

export default Dashboard
