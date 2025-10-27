import React, { useState, useEffect } from 'react'
import api from '@/utils/api'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Search, Plus, FolderKanban } from 'lucide-react'
import Sidebar from '../components/Sidebar'

export default function Projects() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Create dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    capacity: 10,
  })

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchProjects()
      } else {
        setPage(1)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    fetchProjects()
  }, [page, pageSize, statusFilter])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const params = {
        page,
        page_size: pageSize,
      }

      if (searchTerm) params.query = searchTerm
      if (statusFilter !== 'all') params.status = statusFilter

      const response = await api.get('/projects', { params })
      setProjects(response.data.items || [])
      setTotal(response.data.total || 0)
      setTotalPages(response.data.totalPages || 0)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async () => {
    if (!newProject.name || newProject.capacity <= 0) {
      alert('Please provide a name and a capacity greater than 0.')
      return
    }

    try {
      setCreating(true)
      await api.post('/projects', newProject)
      setCreateDialogOpen(false)
      setNewProject({ name: '', description: '', capacity: 10 })
      fetchProjects()
    } catch (error) {
      console.error('Failed to create project:', error)
      alert('Failed to create project. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const getStatusBadge = (status) => {
    const variants = {
      active: 'bg-green-100 text-green-800 hover:bg-green-100',
      completed: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
      archived: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
    }
    return (
      <Badge className={variants[status] || variants.active}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />

      {/* Main Content */}
      <main className="lg:ml-64 overflow-y-auto pb-16 lg:pb-0">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-neutral-900 mb-1">
                  Projects
                </h1>
                <p className="text-sm text-gray-500">
                  Manage candidate projects and assignments
                </p>
              </div>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="rounded-lg font-medium bg-blue-500 hover:bg-blue-600 text-white h-10 px-5 shadow-sm hover:shadow transition-shadow"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mb-4 flex gap-3 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by project name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-sm"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-10 rounded-lg text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <p className="text-sm text-gray-600">Loading...</p>
          ) : projects.length === 0 ? (
            <Card className="p-8 text-center bg-white border border-gray-200 rounded-lg shadow-sm">
              <FolderKanban
                className="w-10 h-10 mx-auto mb-3 text-gray-300"
                strokeWidth={1.5}
              />
              <p className="text-sm text-gray-600 mb-4">
                No projects yet. Create your first project to get started.
              </p>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                variant="outline"
                className="rounded-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned / Capacity</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow
                      key={project.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <TableCell className="font-medium">
                        {project.name}
                      </TableCell>
                      <TableCell>{getStatusBadge(project.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {project.assigned_count} / {project.capacity}
                          </span>
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all"
                              style={{
                                width: `${Math.min(
                                  (project.assigned_count / project.capacity) *
                                    100,
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDate(project.updated_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, total)} of {total} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="h-9"
                >
                  Previous
                </Button>
                <div className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="h-9"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Create Project Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new project to organize and assign candidates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                placeholder="e.g., Product Launch Campaign"
                value={newProject.name}
                onChange={(e) =>
                  setNewProject({ ...newProject, name: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the project..."
                value={newProject.description}
                onChange={(e) =>
                  setNewProject({ ...newProject, description: e.target.value })
                }
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                value={newProject.capacity}
                onChange={(e) =>
                  setNewProject({
                    ...newProject,
                    capacity: parseInt(e.target.value) || 0,
                  })
                }
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum number of candidates for this project
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={creating}>
              {creating ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
