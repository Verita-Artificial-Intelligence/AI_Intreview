import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { CheckCircle2, Clock, Eye } from 'lucide-react'
import CandidateSidebar from '../../components/CandidateSidebar'
import { toast } from 'sonner'

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : 'http://localhost:8000/api'

export default function MyAnnotationTasks() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('in-progress')

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      if (user?.id) {
        const response = await axios.get(`${API}/annotations/user/${user.id}`)
        setTasks(response.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const inProgressTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'assigned')
  const completedTasks = tasks.filter(t => t.status === 'completed')

  const getStatusBadge = (status) => {
    const badges = {
      assigned: { bg: 'bg-brand-100', text: 'text-brand-700', label: 'Assigned' },
      in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'In Progress' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
    }
    const badge = badges[status]
    return badge ? (
      <Badge className={`${badge.bg} ${badge.text}`}>{badge.label}</Badge>
    ) : (
      <Badge variant="outline">{status}</Badge>
    )
  }

  const renderStars = (rating) => {
    if (!rating) return '-'
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`text-sm ${i <= rating ? 'text-yellow-400' : 'text-neutral-300'}`}
          >
            ★
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <CandidateSidebar showAnnotationTasks={true} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 mb-1">In Progress</p>
                  <p className="text-3xl font-bold text-neutral-900">{inProgressTasks.length}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 mb-1">Completed</p>
                  <p className="text-3xl font-bold text-neutral-900">{completedTasks.length}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 mb-1">Total Tasks</p>
                  <p className="text-3xl font-bold text-neutral-900">{tasks.length}</p>
                </div>
                <Eye className="w-8 h-8 text-brand-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Task History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-neutral-600">Loading tasks...</p>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-neutral-600">No tasks yet</p>
                <p className="text-sm text-neutral-500 mt-2">Tasks will be assigned after you complete interviews and get accepted</p>
                <Button
                  onClick={() => navigate('/candidate/portal')}
                  className="mt-4 bg-brand-500 hover:bg-brand-600 text-white"
                >
                  Back to Portal
                </Button>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6">
                  <TabsTrigger value="in-progress">
                    In Progress ({inProgressTasks.length})
                  </TabsTrigger>
                  <TabsTrigger value="completed">
                    Completed ({completedTasks.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="in-progress">
                  {inProgressTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-neutral-600 mb-4">No tasks in progress</p>
                      <Button
                        onClick={() => navigate('/candidate/portal')}
                        className="bg-brand-500 hover:bg-brand-600 text-white"
                      >
                        Back to Portal
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-neutral-200">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Task ID</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Status</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Started</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inProgressTasks.map((task) => (
                            <tr key={task.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                              <td className="py-3 px-4 font-mono text-sm text-neutral-900">{task.id.slice(0, 8)}...</td>
                              <td className="py-3 px-4">{getStatusBadge(task.status)}</td>
                              <td className="py-3 px-4 text-sm text-neutral-600">
                                {task.started_at ? new Date(task.started_at).toLocaleDateString() : '-'}
                              </td>
                              <td className="py-3 px-4">
                                <Button
                                  size="sm"
                                  onClick={() => navigate(`/candidate/annotate/${task.id}`)}
                                  className="bg-brand-500 hover:bg-brand-600 text-white"
                                >
                                  Continue
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="completed">
                  {completedTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-neutral-600">No completed tasks yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-neutral-200">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Task ID</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Rating</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Completed</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Feedback</th>
                          </tr>
                        </thead>
                        <tbody>
                          {completedTasks.map((task) => (
                            <tr key={task.id} className="border-b border-neutral-100">
                              <td className="py-3 px-4 font-mono text-sm text-neutral-900">{task.id.slice(0, 8)}...</td>
                              <td className="py-3 px-4">{renderStars(task.quality_rating)}</td>
                              <td className="py-3 px-4 text-sm text-neutral-600">
                                {task.completed_at ? new Date(task.completed_at).toLocaleDateString() : '-'}
                              </td>
                              <td className="py-3 px-4 text-sm text-neutral-600 max-w-xs truncate">
                                {task.feedback_notes || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
        </div>
      </main>
    </div>
  )
}
