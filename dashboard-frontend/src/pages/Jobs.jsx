import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Plus, Search, Trash2, FileText, BarChart, Users, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import JobForm from '@/components/JobForm'
import PageHeader from '@/components/PageHeader'
import { pageContainer, searchBar } from '@/lib/design-system'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API = `${BACKEND_URL}/api`

const Jobs = () => {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [filteredJobs, setFilteredJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showJobForm, setShowJobForm] = useState(false)

  useEffect(() => {
    fetchJobs()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredJobs(jobs)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredJobs(
        jobs.filter(
          (job) =>
            job.title.toLowerCase().includes(query) ||
            job.position_type.toLowerCase().includes(query) ||
            job.description.toLowerCase().includes(query)
        )
      )
    }
  }, [searchQuery, jobs])

  const fetchJobs = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API}/jobs`)
      setJobs(response.data)
      setFilteredJobs(response.data)
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateJob = async (jobData) => {
    try {
      await axios.post(`${API}/jobs`, jobData)
      fetchJobs()
      setShowJobForm(false)
    } catch (error) {
      console.error('Error creating job:', error)
      throw error
    }
  }

  const handleDeleteJob = async (jobId, jobTitle) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${jobTitle}"? This will also delete all associated interviews.`
      )
    ) {
      return
    }

    try {
      await axios.delete(`${API}/jobs/${jobId}`)
      fetchJobs()
    } catch (error) {
      console.error('Error deleting job:', error)
      alert('Failed to delete job. Please try again.')
    }
  }

  const handleViewInterviews = (jobId) => {
    navigate(`/interviews?job=${jobId}`)
  }

  const getInterviewTypeLabel = (type) => {
    const labels = {
      standard: 'Standard Interview',
      resume_based: 'Portfolio/Resume Based',
      human_data: 'Design Critique',
      software_engineer: 'Creative Project',
      custom_questions: 'Custom Questions',
      coding_exercise: 'Creative Exercise',
      custom_exercise: 'Custom Portfolio Evaluation',
    }
    return labels[type] || type
  }

  const stats = [
    {
      icon: <Briefcase className="w-5 h-5" />,
      label: 'Total Jobs',
      value: jobs.length,
      bgClass: 'bg-brand-100 text-brand-600',
    },
    {
      icon: <FileText className="w-5 h-5" />,
      label: 'Open Positions',
      value: jobs.filter(job => job.status === 'open').length,
      bgClass: 'bg-green-100 text-green-600',
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: 'Active Interviews',
      value: jobs.length, // You might want to add actual interview count logic here
      bgClass: 'bg-blue-100 text-blue-600',
    },
  ]

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-neutral-200 flex-shrink-0">
        <div className="px-6 py-6 border-b border-neutral-100/60 shadow-sm">
          <h2 className="text-xl font-display font-bold text-neutral-900 mb-1">Verita</h2>
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">AI Interview Platform</p>
        </div>

        <nav className="p-4">
          <a
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-neutral-700 hover:bg-neutral-100 transition-all duration-200 mb-2"
          >
            <BarChart className="w-4 h-4" />
            <span>Dashboard</span>
          </a>
          <a
            href="/candidates"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-neutral-700 hover:bg-neutral-100 transition-all duration-200"
          >
            <Users className="w-4 h-4" />
            <span>Candidates</span>
          </a>
          <a
            href="/interviews"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-neutral-700 hover:bg-neutral-100 transition-all duration-200"
          >
            <Briefcase className="w-4 h-4" />
            <span>Interviews</span>
          </a>
          <a
            href="/jobs"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm bg-brand-600 text-white font-medium mb-2 shadow-sm transition-all duration-200"
          >
            <Briefcase className="w-4 h-4" />
            <span>Jobs</span>
            <ChevronRight className="w-4 h-4 ml-auto" />
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <div className={pageContainer.wrapper}>
        {/* Header */}
        <PageHeader
          variant="boxed"
          title="Job Openings"
          subtitle="Manage your open positions and interview configurations"
        />

        <div className={pageContainer.container}>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in-up">
            {stats.map((stat, index) => (
              <Card 
                key={index} 
                className="p-6 cursor-pointer group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${stat.bgClass} transition-transform duration-200 group-hover:scale-110`}>
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 font-medium mb-1">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-bold text-neutral-900">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Search */}
          <div className={searchBar.wrapper}>
            <div className={searchBar.container}>
              <Search className={searchBar.icon} />
              <Input
                type="text"
                placeholder="Search jobs by title, type, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={searchBar.input}
              />
            </div>
          </div>

          {/* Jobs Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            </div>
          ) : filteredJobs.length === 0 ? (
            <Card className="p-12 text-center border-2">
              <Briefcase className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
              <p className="text-base text-neutral-600 mb-4">
                {searchQuery
                  ? 'No jobs found matching your search'
                  : 'No jobs yet'}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => setShowJobForm(true)}
                  variant="outline"
                  className="rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Job
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map((job, index) => (
                <Card
                  key={job.id}
                  className="p-6 relative group flex flex-col animate-fade-in-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteJob(job.id, job.title)}
                    className="absolute top-4 right-4 p-2 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                    title="Delete job"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Job Details */}
                  <div className="flex items-start gap-4 mb-4 flex-1">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold text-white bg-gradient-to-br from-brand-500 to-brand-600 shadow-sm flex-shrink-0">
                      {job.title?.charAt(0).toUpperCase() || 'J'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base text-neutral-900 truncate mb-1">
                        {job.title}
                      </h3>
                      <p className="text-sm text-neutral-600 truncate">
                        {job.position_type}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4 flex-1">
                    <p className="text-sm text-neutral-700 line-clamp-3 mb-4">
                      {job.description}
                    </p>

                    {/* Interview Type Badge */}
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-4 h-4 text-neutral-500" />
                      <span className="text-xs font-medium text-neutral-700">
                        {getInterviewTypeLabel(job.interview_type)}
                      </span>
                    </div>

                    {/* Skills */}
                    {job.skills && job.skills.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-neutral-700 mb-2">
                          Skills to assess:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {job.skills.slice(0, 3).map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs font-medium rounded-full"
                            >
                              {skill.name}
                            </span>
                          ))}
                          {job.skills.length > 3 && (
                            <span className="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs font-medium rounded-full">
                              +{job.skills.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          job.status === 'open'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        {job.status === 'open' ? 'Open' : 'Closed'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <Button
                    onClick={() => handleViewInterviews(job.id)}
                    variant="outline"
                    className="w-full rounded-xl font-medium border-2 border-brand-600 text-brand-600 hover:bg-brand-50"
                  >
                    View Interviews
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Job Form Modal */}
      <JobForm
        open={showJobForm}
        onClose={() => setShowJobForm(false)}
        onSubmit={handleCreateJob}
      />
    </div>
  )
}

export default Jobs