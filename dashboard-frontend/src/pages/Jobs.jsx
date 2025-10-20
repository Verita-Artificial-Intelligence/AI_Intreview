import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Plus, Search, Trash2, FileText, BarChart, Users, ChevronRight, CheckSquare, Upload } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import JobForm from '@/components/JobForm'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API = `${BACKEND_URL}/api`

const Jobs = () => {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [filteredJobs, setFilteredJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showJobForm, setShowJobForm] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [jobToDelete, setJobToDelete] = useState(null)

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

  const handleDeleteJob = (jobId, jobTitle) => {
    setJobToDelete({ id: jobId, title: jobTitle })
    setShowDeleteDialog(true)
  }

  const confirmDeleteJob = async () => {
    if (!jobToDelete) return

    try {
      await axios.delete(`${API}/jobs/${jobToDelete.id}`)
      setShowDeleteDialog(false)
      setJobToDelete(null)
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

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-neutral-200 overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-display font-bold text-neutral-900 mb-1">Verita</h2>
          <p className="text-xs text-neutral-600">AI Interview Platform</p>
        </div>

        <nav className="px-3">
          <a
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors mb-1"
          >
            <BarChart className="w-4 h-4" />
            <span>Dashboard</span>
          </a>
          <a
            href="/candidates"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors mb-1"
          >
            <Users className="w-4 h-4" />
            <span>Candidates</span>
          </a>
          <a
            href="/interviews"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors mb-1"
          >
            <Briefcase className="w-4 h-4" />
            <span>Interviews</span>
          </a>
          <a
            href="/jobs"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-brand-50 text-brand-600 font-medium mb-1"
          >
            <Briefcase className="w-4 h-4" />
            <span>Jobs</span>
            <ChevronRight className="w-4 h-4 ml-auto" />
          </a>

          <div className="border-t border-neutral-200 my-3" />

          <a
            href="/annotation-data"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors mb-1"
          >
            <Upload className="w-4 h-4" />
            <span>Annotation Data</span>
          </a>
          <a
            href="/annotation-tasks"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors mb-1"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Annotation Tasks</span>
          </a>
          <a
            href="/annotators"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors mb-1"
          >
            <Users className="w-4 h-4" />
            <span>Annotators</span>
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-64 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-display font-bold text-neutral-900">
                Job Openings
              </h2>
              <p className="text-neutral-600 mt-1">
                Manage your open positions and interview configurations
              </p>
            </div>
            <Button
              onClick={() => setShowJobForm(true)}
              className="bg-brand-500 hover:bg-brand-600 text-white rounded-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Job
            </Button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search jobs by title, type, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full max-w-md"
              />
            </div>
          </div>

          {/* Jobs Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-neutral-600">Loading jobs...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-600 mb-4">
                {searchQuery
                  ? 'No jobs found matching your search'
                  : 'No jobs yet'}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => setShowJobForm(true)}
                  variant="outline"
                  className="rounded-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Job
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map((job) => (
                <Card
                  key={job.id}
                  className="p-6 hover:shadow-lg transition-shadow relative group flex flex-col"
                >
                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteJob(job.id, job.title)}
                    className="absolute top-3 right-3 p-2 text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-red-50"
                    title="Delete job"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Job Details */}
                  <div className="mb-4 flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 bg-brand-100 rounded-lg">
                        <Briefcase className="w-5 h-5 text-brand-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-neutral-900 mb-1">
                          {job.title}
                        </h3>
                        <p className="text-sm text-neutral-600">
                          {job.position_type}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-neutral-600 line-clamp-3 mb-4">
                      {job.description}
                    </p>

                    {/* Interview Type Badge */}
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-4 h-4 text-neutral-400" />
                      <span className="text-xs text-neutral-600">
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
                              className="px-2 py-1 bg-neutral-100 text-neutral-700 rounded text-xs"
                            >
                              {skill.name}
                            </span>
                          ))}
                          {job.skills.length > 3 && (
                            <span className="px-2 py-1 bg-neutral-100 text-neutral-700 rounded text-xs">
                              +{job.skills.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="mb-4">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
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
                    size="sm"
                    className="w-full rounded-lg"
                  >
                    View Interviews
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Job Form Modal */}
      <JobForm
        open={showJobForm}
        onClose={() => setShowJobForm(false)}
        onSubmit={handleCreateJob}
      />

      {/* Delete Job Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{jobToDelete?.title}"? This will also delete all associated interviews. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setJobToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteJob}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete Job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default Jobs
