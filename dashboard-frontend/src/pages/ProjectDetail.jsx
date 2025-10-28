import React, { useState, useEffect } from 'react'
import api from '@/utils/api'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Checkbox } from '../components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog'
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  UserPlus,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import Sidebar from '../components/Sidebar'
import EmailPreviewModal from '../components/EmailPreviewModal'

export default function ProjectDetail() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // Overview state
  const [editing, setEditing] = useState(false)
  const [editedProject, setEditedProject] = useState(null)
  const [saving, setSaving] = useState(false)

  // Candidate Pool state
  const [candidatePool, setCandidatePool] = useState([])
  const [poolLoading, setPoolLoading] = useState(false)
  const [poolSort, setPoolSort] = useState('score_desc')
  const [poolFilter, setPoolFilter] = useState('all')
  const [selectedCandidates, setSelectedCandidates] = useState([])
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assigning, setAssigning] = useState(false)

  // Assignments state
  const [assignments, setAssignments] = useState([])
  const [assignmentsLoading, setAssignmentsLoading] = useState(false)
  const [unassignDialogOpen, setUnassignDialogOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState(null)
  const [unassigning, setUnassigning] = useState(false)

  // Activity state
  const [activities, setActivities] = useState([])
  const [activityLoading, setActivityLoading] = useState(false)

  useEffect(() => {
    fetchProject()
  }, [projectId])

  const fetchProject = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/projects/${projectId}`)
      setProject(response.data)
      setEditedProject(response.data)
    } catch (error) {
      console.error('Failed to fetch project:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCandidatePool = async () => {
    try {
      setPoolLoading(true)
      const response = await api.get(`/projects/${projectId}/candidate-pool`, {
        params: { sort: poolSort, filter: poolFilter },
      })
      setCandidatePool(response.data || [])
    } catch (error) {
      console.error('Failed to fetch candidate pool:', error)
    } finally {
      setPoolLoading(false)
    }
  }

  const fetchAssignments = async () => {
    try {
      setAssignmentsLoading(true)
      const response = await api.get(`/projects/${projectId}/assignments`)
      setAssignments(response.data || [])
    } catch (error) {
      console.error('Failed to fetch assignments:', error)
    } finally {
      setAssignmentsLoading(false)
    }
  }

  const fetchActivity = async () => {
    try {
      setActivityLoading(true)
      const response = await api.get(`/projects/${projectId}/activity`)
      setActivities(response.data || [])
    } catch (error) {
      console.error('Failed to fetch activity:', error)
    } finally {
      setActivityLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'candidate-pool') {
      fetchCandidatePool()
    } else if (activeTab === 'assignments') {
      fetchAssignments()
    } else if (activeTab === 'activity') {
      fetchActivity()
    }
  }, [activeTab, poolSort, poolFilter])

  const handleSave = async () => {
    try {
      setSaving(true)
      await api.patch(`/projects/${projectId}`, {
        name: editedProject.name,
        description: editedProject.description,
        capacity: editedProject.capacity,
        status: editedProject.status,
      })
      setProject(editedProject)
      setEditing(false)
    } catch (error) {
      console.error('Failed to update project:', error)
      alert('Failed to update project. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditedProject(project)
    setEditing(false)
  }

  const handleBulkAssign = async () => {
    if (selectedCandidates.length === 0) return

    try {
      setAssigning(true)
      const assignments = selectedCandidates.map((candidateId) => ({
        candidate_id: candidateId,
        role: null,
      }))
      await api.post(`/projects/${projectId}/assignments/bulk`, { assignments })
      setAssignDialogOpen(false)
      setSelectedCandidates([])
      // Refresh data
      fetchProject()
      fetchCandidatePool()
      fetchAssignments()
    } catch (error) {
      console.error('Failed to assign candidates:', error)
      alert('Failed to assign candidates. Please try again.')
    } finally {
      setAssigning(false)
    }
  }

  const handleUnassign = async () => {
    if (!selectedAssignment) return

    try {
      setUnassigning(true)
      await api.delete(
        `/projects/${projectId}/assignments/${selectedAssignment}`
      )
      setUnassignDialogOpen(false)
      setSelectedAssignment(null)
      // Refresh data
      fetchProject()
      fetchAssignments()
    } catch (error) {
      console.error('Failed to unassign candidate:', error)
      alert('Failed to unassign candidate. Please try again.')
    } finally {
      setUnassigning(false)
    }
  }

  const handleResendEmail = async (assignmentId) => {
    try {
      await api.post(
        `/projects/${projectId}/assignments/${assignmentId}/send-email`
      )
      alert('Email sent successfully!')
      fetchActivity()
    } catch (error) {
      console.error('Failed to resend email:', error)
      alert('Failed to send email. Please try again.')
    }
  }

  const toggleCandidateSelection = (candidateId) => {
    setSelectedCandidates((prev) =>
      prev.includes(candidateId)
        ? prev.filter((id) => id !== candidateId)
        : [...prev, candidateId]
    )
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
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'assigned':
        return <UserPlus className="w-4 h-4 text-green-600" />
      case 'email_sent':
        return <CheckCircle className="w-4 h-4 text-blue-600" />
      case 'email_failed':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'unassigned':
        return <AlertCircle className="w-4 h-4 text-orange-600" />
      default:
        return <Mail className="w-4 h-4 text-gray-600" />
    }
  }

  if (loading || !project) {
    return (
      <div className="min-h-screen bg-white">
        <Sidebar />
        <main className="lg:ml-64 overflow-y-auto pb-16 lg:pb-0">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <p className="text-sm text-gray-600">Loading project...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />

      {/* Main Content */}
      <main className="lg:ml-64 overflow-y-auto pb-16 lg:pb-0">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/projects')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-neutral-900 mb-1">
                  {project.name}
                </h1>
                <p className="text-sm text-gray-500">
                  {project.description || 'No description'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(project.status)}
                <span className="text-sm text-gray-600">
                  {assignments.length} / {project.capacity} assigned
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="candidate-pool">Candidate Pool</TabsTrigger>
              <TabsTrigger value="assignments">Assignments</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Project Details</CardTitle>
                    {!editing ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing(true)}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEdit}
                          disabled={saving}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSave}
                          disabled={saving}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {saving ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Project Name</Label>
                    {editing ? (
                      <Input
                        value={editedProject.name}
                        onChange={(e) =>
                          setEditedProject({
                            ...editedProject,
                            name: e.target.value,
                          })
                        }
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-sm mt-1">{project.name}</p>
                    )}
                  </div>
                  <div>
                    <Label>Description</Label>
                    {editing ? (
                      <Textarea
                        value={editedProject.description || ''}
                        onChange={(e) =>
                          setEditedProject({
                            ...editedProject,
                            description: e.target.value,
                          })
                        }
                        className="mt-1"
                        rows={3}
                      />
                    ) : (
                      <p className="text-sm mt-1">
                        {project.description || 'No description'}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Status</Label>
                      {editing ? (
                        <Select
                          value={editedProject.status}
                          onValueChange={(value) =>
                            setEditedProject({
                              ...editedProject,
                              status: value,
                            })
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="mt-1">
                          {getStatusBadge(project.status)}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Capacity</Label>
                      {editing ? (
                        <Input
                          type="number"
                          min="1"
                          value={editedProject.capacity}
                          onChange={(e) =>
                            setEditedProject({
                              ...editedProject,
                              capacity: parseInt(e.target.value) || 0,
                            })
                          }
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-sm mt-1">{project.capacity}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Candidate Pool Tab */}
            <TabsContent value="candidate-pool">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Available Candidates</CardTitle>
                    <div className="flex gap-2">
                      <Select value={poolFilter} onValueChange={setPoolFilter}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="pass_only">Pass Only</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={poolSort} onValueChange={setPoolSort}>
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="score_desc">
                            Score (High to Low)
                          </SelectItem>
                          <SelectItem value="score_asc">
                            Score (Low to High)
                          </SelectItem>
                          <SelectItem value="date_desc">
                            Date (Newest)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {selectedCandidates.length > 0 && (
                        <Button onClick={() => setAssignDialogOpen(true)}>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Assign Selected ({selectedCandidates.length})
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {poolLoading ? (
                    <p className="text-sm text-gray-600">Loading...</p>
                  ) : candidatePool.length === 0 ? (
                    <p className="text-sm text-gray-600 text-center py-8">
                      No available candidates found.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Job</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {candidatePool.map((candidate) => (
                          <TableRow key={candidate.candidateId}>
                            <TableCell>
                              <Checkbox
                                checked={selectedCandidates.includes(
                                  candidate.candidateId
                                )}
                                onCheckedChange={() =>
                                  toggleCandidateSelection(
                                    candidate.candidateId
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {candidate.candidateName}
                            </TableCell>
                            <TableCell className="text-sm">
                              {candidate.jobTitle}
                            </TableCell>
                            <TableCell>
                              {candidate.score !== null ? (
                                <span className="font-semibold">
                                  {candidate.score}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {candidate.passStatus === 'pass' ? (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                  Pass
                                </Badge>
                              ) : candidate.passStatus === 'fail' ? (
                                <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                                  Fail
                                </Badge>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Assignments Tab */}
            <TabsContent value="assignments">
              <Card>
                <CardHeader>
                  <CardTitle>Current Assignments</CardTitle>
                </CardHeader>
                <CardContent>
                  {assignmentsLoading ? (
                    <p className="text-sm text-gray-600">Loading...</p>
                  ) : assignments.length === 0 ? (
                    <p className="text-sm text-gray-600 text-center py-8">
                      No assignments yet.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Assigned Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignments.map((assignment) => (
                          <TableRow key={assignment.assignmentId}>
                            <TableCell className="font-medium">
                              {assignment.candidateName}
                            </TableCell>
                            <TableCell className="text-sm">
                              {assignment.candidateEmail}
                            </TableCell>
                            <TableCell className="text-sm">
                              {assignment.role || '-'}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {formatDate(assignment.assignedDate)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedAssignment(assignment.assignmentId)
                                  setUnassignDialogOpen(true)
                                }}
                              >
                                Unassign
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {activityLoading ? (
                    <p className="text-sm text-gray-600">Loading...</p>
                  ) : activities.length === 0 ? (
                    <p className="text-sm text-gray-600 text-center py-8">
                      No activity yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {activities.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-start gap-4 pb-4 border-b last:border-b-0"
                        >
                          <div className="mt-1">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">
                                {activity.candidateName}
                              </p>
                              <span className="text-xs text-gray-500">
                                {formatDate(activity.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {activity.candidateEmail}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {activity.type === 'assigned' &&
                                'Assigned to project'}
                              {activity.type === 'email_sent' &&
                                'Email sent successfully'}
                              {activity.type === 'email_failed' &&
                                `Email failed: ${activity.details?.error || 'Unknown error'}`}
                              {activity.type === 'unassigned' &&
                                'Removed from project'}
                            </p>
                            {activity.type === 'email_failed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() =>
                                  handleResendEmail(activity.assignmentId)
                                }
                              >
                                <Mail className="w-3 h-3 mr-1" />
                                Resend Email
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Email Preview Modal */}
      <EmailPreviewModal
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        projectId={projectId}
        assignments={selectedCandidates.map((candidateId) => ({
          candidate_id: candidateId,
          role: null,
        }))}
        onConfirm={handleBulkAssign}
      />

      {/* Unassign Dialog */}
      <AlertDialog
        open={unassignDialogOpen}
        onOpenChange={setUnassignDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unassign Candidate?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the candidate from this project. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unassigning}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnassign} disabled={unassigning}>
              {unassigning ? 'Removing...' : 'Unassign'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
