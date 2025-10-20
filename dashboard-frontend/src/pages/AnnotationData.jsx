import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { Upload, Plus, Search, Trash2, FileText, Image, Video, Music, File, BarChart, Briefcase, CheckSquare, Users, ChevronRight, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
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
import { toast } from 'sonner'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API = `${BACKEND_URL}/api`

const AnnotationData = () => {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [jobFilter, setJobFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [jobs, setJobs] = useState([])
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [dataToDelete, setDataToDelete] = useState(null)

  useEffect(() => {
    fetchData()
    fetchJobs()
  }, [])

  useEffect(() => {
    filterData()
  }, [searchQuery, jobFilter, typeFilter, data])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API}/annotation-data`)
      setData(response.data)
    } catch (error) {
      console.error('Error fetching annotation data:', error)
      toast.error('Failed to load annotation data')
    } finally {
      setLoading(false)
    }
  }

  const fetchJobs = async () => {
    try {
      const response = await axios.get(`${API}/jobs`)
      setJobs(response.data)
    } catch (error) {
      console.error('Error fetching jobs:', error)
    }
  }

  const filterData = () => {
    let filtered = data

    if (jobFilter !== 'all') {
      filtered = filtered.filter(d => d.job_id === jobFilter)
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(d => d.data_type === typeFilter)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(d =>
        d.title.toLowerCase().includes(query) ||
        d.description?.toLowerCase().includes(query)
      )
    }

    setFilteredData(filtered)
  }

  const handleDelete = (dataId, title) => {
    setDataToDelete({ id: dataId, title: title })
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!dataToDelete) return

    try {
      await axios.delete(`${API}/annotation-data/${dataToDelete.id}`)
      toast.success('Annotation data deleted')
      setShowDeleteDialog(false)
      setDataToDelete(null)
      fetchData()
    } catch (error) {
      console.error('Error deleting annotation data:', error)
      toast.error('Failed to delete annotation data')
    }
  }

  const getDataTypeIcon = (type) => {
    const icons = {
      text: FileText,
      image: Image,
      video: Video,
      audio: Music,
      document: File,
    }
    return icons[type] || FileText
  }

  const getDataTypeColor = (type) => {
    const colors = {
      text: 'bg-blue-100 text-blue-800',
      image: 'bg-green-100 text-green-800',
      video: 'bg-purple-100 text-purple-800',
      audio: 'bg-orange-100 text-orange-800',
      document: 'bg-neutral-100 text-neutral-800',
    }
    return colors[type] || 'bg-neutral-100 text-neutral-800'
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
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors mb-1"
          >
            <Briefcase className="w-4 h-4" />
            <span>Jobs</span>
          </a>

          <div className="border-t border-neutral-200 my-3" />

          <a
            href="/annotation-data"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-brand-50 text-brand-600 font-medium mb-1"
          >
            <Upload className="w-4 h-4" />
            <span>Annotation Data</span>
            <ChevronRight className="w-4 h-4 ml-auto" />
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
                Annotation Data
              </h2>
              <p className="text-neutral-600 mt-1">
                Manage data files for annotation tasks
              </p>
            </div>
            <Button
              onClick={() => navigate('/annotation-data/upload')}
              className="bg-brand-500 hover:bg-brand-600 text-white rounded-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Upload Data
            </Button>
          </div>

          {/* Filters */}
          <div className="mb-6 flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search by title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2"
                />
              </div>
            </div>
            <Select value={jobFilter} onValueChange={setJobFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by job" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="document">Document</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-neutral-600">Loading annotation data...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-12">
              <Upload className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-600 mb-4">
                {searchQuery || jobFilter !== 'all' || typeFilter !== 'all'
                  ? 'No data found matching your filters'
                  : 'No annotation data yet'}
              </p>
              {!searchQuery && jobFilter === 'all' && typeFilter === 'all' && (
                <Button
                  onClick={() => navigate('/annotation-data/upload')}
                  variant="outline"
                  className="rounded-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Your First Data
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredData.map((item) => {
                const Icon = getDataTypeIcon(item.data_type)
                const job = jobs.find(j => j.id === item.job_id)

                return (
                  <Card
                    key={item.id}
                    className="p-6 hover:shadow-lg transition-shadow relative group"
                  >
                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(item.id, item.title)}
                      className="absolute top-3 right-3 p-2 text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-red-50"
                      title="Delete data"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Content */}
                    <div className="mb-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="p-2 bg-brand-100 rounded-lg">
                          <Icon className="w-5 h-5 text-brand-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-neutral-900 mb-1">
                            {item.title}
                          </h3>
                          <Badge className={getDataTypeColor(item.data_type)}>
                            {item.data_type}
                          </Badge>
                        </div>
                      </div>

                      {item.description && (
                        <p className="text-sm text-neutral-600 line-clamp-2 mb-3">
                          {item.description}
                        </p>
                      )}

                      <div className="space-y-2 text-xs text-neutral-600">
                        <div>
                          <span className="font-medium">Job:</span> {job?.title || 'Unknown'}
                        </div>
                        <div>
                          <span className="font-medium">Created:</span>{' '}
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                        {item.data_url && (
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Source:</span>
                            <a
                              href={item.data_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-600 hover:text-brand-700 truncate"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View file
                            </a>
                          </div>
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

      {/* Delete Data Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Annotation Data</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{dataToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDataToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default AnnotationData
