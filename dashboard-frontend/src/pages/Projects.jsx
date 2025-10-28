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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import DataTable, {
  createColumn,
  columnRenderers,
} from '../components/DataTable'
import ColumnFilterDropdown from '../components/ColumnFilterDropdown'
import { Plus, FolderKanban } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'

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

  // Table columns configuration
  const columns = [
    createColumn('name', 'Name', {
      frozen: true,
      width: 260,
      minWidth: 200,
      render: (_, project) => (
        <div>
          <div className="font-semibold text-neutral-900">{project.name}</div>
          {project.description && (
            <div className="text-xs text-neutral-600 mt-1 line-clamp-1">
              {project.description}
            </div>
          )}
        </div>
      ),
    }),
    createColumn('status', 'Status', {
      width: 140,
      className: 'text-left border-l border-gray-200',
      headerRender: () => (
        <ColumnFilterDropdown
          label="Status"
          value={statusFilter}
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
            { value: 'archived', label: 'Archived' },
          ]}
          onChange={setStatusFilter}
          searchable={false}
        />
      ),
      render: (_, project) => {
        const statusConfig = {
          active: { bg: 'badge-green', label: 'Active' },
          completed: { bg: 'badge-blue', label: 'Completed' },
          archived: { bg: 'badge-gray', label: 'Archived' },
        }
        const config = statusConfig[project.status] || statusConfig.active
        return <span className={`badge ${config.bg}`}>{config.label}</span>
      },
    }),
    createColumn('capacity', 'Assigned / Capacity', {
      width: 180,
      className: 'text-left border-l border-gray-200',
      render: (_, project) =>
        columnRenderers.progress(
          project.assigned_count || 0,
          project.capacity || 0,
          { showText: true, color: 'blue' }
        ),
    }),
    createColumn('updated_at', 'Last Updated', {
      width: 140,
      className: 'text-left border-l border-gray-200',
      render: (_, project) => (
        <span className="text-sm text-gray-600">
          {formatDate(project.updated_at)}
        </span>
      ),
    }),
  ]

  const handleRowClick = (project) => {
    navigate(`/projects/${project.id}`)
  }

  const paginationConfig = {
    page,
    totalPages,
    pageSize,
    total,
    onPageChange: setPage,
    onPageSizeChange: (newSize) => {
      setPageSize(newSize)
      setPage(1)
    },
  }

  return (
    <DashboardLayout
      search={searchTerm}
      onSearchChange={(e) => setSearchTerm(e.target.value)}
      searchPlaceholder="Search by project name..."
      actionButton={
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="rounded-lg font-medium bg-blue-500 hover:bg-blue-600 text-white h-10 px-5 shadow-sm hover:shadow transition-shadow"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Project
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={projects}
        onRowClick={handleRowClick}
        loading={loading}
        density="compact"
        frozenColumns={['name']}
        pagination={paginationConfig}
        emptyState={
          <div className="p-10 text-center bg-surface border border-neutral-200 rounded-xl shadow-card">
            <FolderKanban
              className="w-10 h-10 mx-auto mb-3 text-gray-300"
              strokeWidth={1.5}
            />
            <p className="text-sm text-neutral-600 mb-3">
              No projects yet. Create your first project to get started.
            </p>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              variant="outline"
              size="sm"
              className="rounded-lg font-normal text-xs h-8 px-3"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </div>
        }
      />

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
    </DashboardLayout>
  )
}
