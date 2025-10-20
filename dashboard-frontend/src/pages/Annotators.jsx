import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { BarChart, Briefcase, CheckSquare, Users, ChevronRight, Upload } from 'lucide-react'

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : 'http://localhost:8000/api'

export default function Annotators() {
  const [annotators, setAnnotators] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnnotators()
  }, [])

  const fetchAnnotators = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API}/annotations`)
      const tasks = response.data

      // Group tasks by annotator
      const annotatorMap = {}
      tasks.forEach(task => {
        if (task.annotator_id) {
          if (!annotatorMap[task.annotator_id]) {
            annotatorMap[task.annotator_id] = {
              id: task.annotator_id,
              totalTasks: 0,
              completedTasks: 0,
              avgRating: 0,
              ratings: [],
            }
          }
          annotatorMap[task.annotator_id].totalTasks++
          if (task.status === 'completed') {
            annotatorMap[task.annotator_id].completedTasks++
            if (task.quality_rating) {
              annotatorMap[task.annotator_id].ratings.push(task.quality_rating)
            }
          }
        }
      })

      // Calculate average ratings
      const annotatorsList = Object.values(annotatorMap).map(a => ({
        ...a,
        avgRating: a.ratings.length > 0 ? (a.ratings.reduce((sum, r) => sum + r, 0) / a.ratings.length).toFixed(2) : 0,
      }))

      setAnnotators(annotatorsList)
    } catch (error) {
      console.error('Failed to fetch annotators:', error)
    } finally {
      setLoading(false)
    }
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
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors mb-1"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Annotation Tasks</span>
          </a>
          <a
            href="/annotators"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-brand-50 text-brand-600 font-medium mb-1"
          >
            <Users className="w-4 h-4" />
            <span>Annotators</span>
            <ChevronRight className="w-4 h-4 ml-auto" />
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-neutral-900">Annotators</h2>
            <p className="text-neutral-600 mt-2">Performance and activity overview</p>
          </div>

          {/* Annotators Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <p className="text-neutral-600">Loading annotators...</p>
            ) : annotators.length === 0 ? (
              <Card className="lg:col-span-3">
                <CardContent className="pt-6 text-center">
                  <p className="text-neutral-600">No annotators yet</p>
                </CardContent>
              </Card>
            ) : (
              annotators.map((annotator) => (
                <Card key={annotator.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-sm font-mono">{annotator.id.slice(0, 8)}...</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-600">Total Tasks</span>
                        <Badge variant="outline">{annotator.totalTasks}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-600">Completed</span>
                        <Badge className="bg-green-100 text-green-800">{annotator.completedTasks}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-600">Avg Rating</span>
                        <span className="font-semibold text-neutral-900">{annotator.avgRating}/5</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-600">Completion Rate</span>
                        <span className="font-semibold text-neutral-900">
                          {annotator.totalTasks > 0
                            ? Math.round((annotator.completedTasks / annotator.totalTasks) * 100)
                            : 0}
                          %
                        </span>
                      </div>
                    </div>
                    <div className="pt-2">
                      <div className="flex justify-between mb-2">
                        <span className="text-xs text-neutral-600">Progress</span>
                        <span className="text-xs font-semibold">{annotator.completedTasks}/{annotator.totalTasks}</span>
                      </div>
                      <div className="w-full bg-neutral-200 rounded-full h-2">
                        <div
                          className="bg-brand-500 h-2 rounded-full transition-all"
                          style={{
                            width: `${annotator.totalTasks > 0 ? (annotator.completedTasks / annotator.totalTasks) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
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
