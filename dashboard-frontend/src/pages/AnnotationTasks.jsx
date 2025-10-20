import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Eye, Search, BarChart, Briefcase, CheckSquare, Users, ChevronRight, Plus, Upload } from 'lucide-react'
import { toast } from 'sonner'

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : 'http://localhost:8000/api'

export default function Tasks() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [tasks, setTasks] = useState([])
  const [filteredTasks, setFilteredTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isOpen, setIsOpen] = useState(false)
  const [jobs, setJobs] = useState([])
  const [annotationData, setAnnotationData] = useState([])
  const [formData, setFormData] = useState({
    job_id: '',
    annotation_data_id: '',
  })

  const jobIdFilter = searchParams.get('jobId')

  useEffect(() => {
    fetchTasks()
    fetchJobs()
    fetchAnnotationData()
  }, [])

  useEffect(() => {
    filterTasks()
  }, [tasks, searchTerm, statusFilter])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const url = jobIdFilter ? `${API}/annotations?job_id=${jobIdFilter}` : `${API}/annotations`
      const response = await axios.get(url)
      setTasks(response.data)
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const fetchJobs = async () => {
    try {
      const response = await axios.get(`${API}/jobs`)
      setJobs(response.data)
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
    }
  }

  const fetchAnnotationData = async () => {
    try {
      const response = await axios.get(`${API}/annotation-data`)
      setAnnotationData(response.data)
    } catch (error) {
      console.error('Failed to fetch annotation data:', error)
    }
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    try {
      const data = annotationData.find(d => d.id === formData.annotation_data_id)
      if (!data) {
        toast.error('Annotation data not found')
        return
      }

      // Get all accepted candidates for this job
      const allInterviews = await axios.get(`${API}/interviews`)
      const acceptedCandidates = allInterviews.data.filter(i =>
        i.job_id === formData.job_id && i.acceptance_status === 'accepted'
      )

      if (acceptedCandidates.length === 0) {
        toast.error('No accepted candidates for this job')
        return
      }

      const data_to_annotate = {
        annotation_data_id: data.id,
        title: data.title,
        description: data.description,
        data_type: data.data_type,
        data_url: data.data_url,
        data_content: data.data_content,
      }

      // Create a task for each accepted candidate from the job
      const createPromises = acceptedCandidates.map(candidate =>
        axios.post(`${API}/annotations`, {
          job_id: formData.job_id,
          annotator_id: candidate.candidate_id,
          data_to_annotate: data_to_annotate,
          status: 'assigned',
        })
      )

      await Promise.all(createPromises)

      toast.success(`Created ${acceptedCandidates.length} annotation task(s) for all accepted candidates`)
      setFormData({ job_id: '', annotation_data_id: '' })
      setIsOpen(false)
      fetchTasks()
    } catch (error) {
      console.error('Failed to create task:', error)
      toast.error('Failed to create task')
    }
  }

  const filterTasks = () => {
    let filtered = tasks

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter)
    }

    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.id.includes(searchTerm) || t.job_id?.includes(searchTerm)
      )
    }

    setFilteredTasks(filtered)
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-800',
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      reviewed: 'bg-purple-100 text-purple-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-neutral-200 flex-shrink-0">
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
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors mb-1"
          >
            <Briefcase className="w-4 h-4" />
            <span>Jobs</span>
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
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-brand-50 text-brand-600 font-medium mb-1"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Annotation Tasks</span>
            <ChevronRight className="w-4 h-4 ml-auto" />
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
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-display font-bold text-neutral-900">Annotation Tasks</h2>
              <p className="text-neutral-600 mt-1">Manage annotation tasks and assignments</p>
            </div>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="bg-brand-500 hover:bg-brand-600 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  New Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Annotation Task</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Job</label>
                    <Select value={formData.job_id} onValueChange={(value) => setFormData({ ...formData, job_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a job" />
                      </SelectTrigger>
                      <SelectContent>
                        {jobs.map((job) => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-neutral-500 mt-1">
                      Tasks will be created for all accepted candidates in this job
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Data to Annotate</label>
                    {annotationData.filter(data => !formData.job_id || data.job_id === formData.job_id).length === 0 ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                        <p className="text-yellow-800 mb-2">
                          No annotation data available{formData.job_id ? ' for this job' : ''}.
                        </p>
                        <p className="text-yellow-700 text-xs">
                          Go to <a href="/annotation-data" className="text-brand-600 hover:text-brand-700 font-medium underline">Annotation Data</a> to upload data first, then return here to create tasks.
                        </p>
                      </div>
                    ) : (
                      <Select value={formData.annotation_data_id} onValueChange={(value) => setFormData({ ...formData, annotation_data_id: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select annotation data" />
                        </SelectTrigger>
                        <SelectContent>
                          {annotationData
                            .filter(data => !formData.job_id || data.job_id === formData.job_id)
                            .map((data) => (
                              <SelectItem key={data.id} value={data.id}>
                                {data.title} ({data.data_type})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsOpen(false)
                        setFormData({ job_id: '', annotation_data_id: '' })
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-brand-500 hover:bg-brand-600 text-white"
                      disabled={!formData.job_id || !formData.annotation_data_id}
                    >
                      Create Tasks
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters */}
          <div className="mb-6 flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                <Input
                  placeholder="Search by task ID..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tasks Table */}
          <Card>
            <CardHeader>
              <CardTitle>Annotation Tasks ({filteredTasks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-neutral-600">Loading tasks...</p>
              ) : filteredTasks.length === 0 ? (
                <p className="text-neutral-600 text-center py-8">No tasks found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Task ID</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Job ID</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Annotator</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Rating</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Created</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTasks.map((task) => (
                        <tr key={task.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                          <td className="py-3 px-4 text-sm text-neutral-900 font-mono">{task.id.slice(0, 8)}...</td>
                          <td className="py-3 px-4 text-sm text-neutral-600 font-mono">{task.job_id.slice(0, 8)}...</td>
                          <td className="py-3 px-4">
                            <Badge className={getStatusColor(task.status)}>{task.status}</Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-neutral-600">{task.annotator_id ? task.annotator_id.slice(0, 8) + '...' : '-'}</td>
                          <td className="py-3 px-4 text-sm text-neutral-900">{task.quality_rating ? `${task.quality_rating}/5` : '-'}</td>
                          <td className="py-3 px-4 text-sm text-neutral-600">
                            {new Date(task.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/review/${task.id}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

function NavLink({ to, label, icon: Icon, active }) {
  return (
    <a
      href={to}
      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
        active
          ? 'bg-brand-50 text-brand-600 font-medium'
          : 'text-neutral-700 hover:bg-neutral-50'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </a>
  )
}
