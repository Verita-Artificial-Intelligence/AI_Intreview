import React, { useState, useEffect } from 'react'
import api from '@/utils/api'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
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
import { Users, Plus, Search, MessagesSquare } from 'lucide-react'
import Sidebar from '../components/Sidebar'

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : 'http://localhost:8000/api'

export default function Annotators() {
  const navigate = useNavigate()
  const [annotators, setAnnotators] = useState([])
  const [filteredAnnotators, setFilteredAnnotators] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [completionFilter, setCompletionFilter] = useState('all')
  const [performanceFilter, setPerformanceFilter] = useState('all')

  useEffect(() => {
    fetchAnnotators()
  }, [])

  useEffect(() => {
    filterAnnotators()
  }, [searchTerm, annotators, completionFilter, performanceFilter])

  const filterAnnotators = () => {
    let filtered = annotators

    // Filter by search term
    if (searchTerm.trim() !== '') {
      const query = searchTerm.toLowerCase()
      filtered = filtered.filter((annotator) =>
        annotator.name.toLowerCase().includes(query)
      )
    }

    // Filter by completion rate
    if (completionFilter !== 'all') {
      filtered = filtered.filter((annotator) => {
        const completionRate =
          annotator.totalTasks > 0
            ? Math.round(
                (annotator.completedTasks / annotator.totalTasks) * 100
              )
            : 0

        if (completionFilter === '100') return completionRate === 100
        if (completionFilter === '75')
          return completionRate >= 75 && completionRate < 100
        if (completionFilter === '50')
          return completionRate >= 50 && completionRate < 75
        return completionRate < 50
      })
    }

    // Filter by performance (average rating)
    if (performanceFilter !== 'all') {
      filtered = filtered.filter((annotator) => {
        const rating = parseFloat(annotator.avgRating)
        if (performanceFilter === 'excellent') return rating >= 4.5
        if (performanceFilter === 'good') return rating >= 3.5 && rating < 4.5
        if (performanceFilter === 'fair') return rating >= 2.5 && rating < 3.5
        return rating < 2.5
      })
    }

    setFilteredAnnotators(filtered)
  }

  const fetchAnnotators = async () => {
    try {
      setLoading(true)

      // Fetch both annotations and interviews to get candidate names
      const [annotationsRes, interviewsRes] = await Promise.all([
        api.get(`/annotations`),
        api.get(`/interviews`),
      ])

      const tasks = annotationsRes.data
      const interviews = interviewsRes.data

      // Create a map of candidate_id to candidate_name
      const candidateNameMap = {}
      interviews.forEach((interview) => {
        if (interview.candidate_id && interview.candidate_name) {
          candidateNameMap[interview.candidate_id] = interview.candidate_name
        }
      })

      // Group tasks by annotator
      const annotatorMap = {}
      tasks.forEach((task) => {
        if (task.annotator_id) {
          if (!annotatorMap[task.annotator_id]) {
            annotatorMap[task.annotator_id] = {
              id: task.annotator_id,
              name: candidateNameMap[task.annotator_id] || 'Unknown Annotator',
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
      const annotatorsList = Object.values(annotatorMap).map((a) => ({
        ...a,
        avgRating:
          a.ratings.length > 0
            ? (
                a.ratings.reduce((sum, r) => sum + r, 0) / a.ratings.length
              ).toFixed(2)
            : 0,
      }))

      setAnnotators(annotatorsList)
    } catch (error) {
      console.error('Failed to fetch annotators:', error)
    } finally {
      setLoading(false)
    }
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
                  Annotators
                </h1>
                <p className="text-sm text-gray-500">
                  Performance and activity overview
                </p>
              </div>
              <Button
                onClick={() => navigate('/candidates')}
                className="rounded-lg font-medium bg-blue-500 hover:bg-blue-600 text-white h-10 px-5 shadow-sm hover:shadow transition-shadow"
              >
                <Plus className="w-4 h-4 mr-2" />
                Find Candidates
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
                  placeholder="Search by annotator name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-sm"
                />
              </div>
            </div>
            <Select
              value={completionFilter}
              onValueChange={setCompletionFilter}
            >
              <SelectTrigger className="w-40 h-10 rounded-lg text-sm">
                <SelectValue placeholder="Completion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Completion</SelectItem>
                <SelectItem value="100">100% Complete</SelectItem>
                <SelectItem value="75">75% - 99%</SelectItem>
                <SelectItem value="50">50% - 74%</SelectItem>
                <SelectItem value="0">Below 50%</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={performanceFilter}
              onValueChange={setPerformanceFilter}
            >
              <SelectTrigger className="w-40 h-10 rounded-lg text-sm">
                <SelectValue placeholder="Performance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Performance</SelectItem>
                <SelectItem value="excellent">Excellent (4.5+)</SelectItem>
                <SelectItem value="good">Good (3.5-4.5)</SelectItem>
                <SelectItem value="fair">Fair (2.5-3.5)</SelectItem>
                <SelectItem value="poor">Poor (&lt;2.5)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Annotators Grid */}
          {loading ? (
            <p className="text-sm text-gray-600">Loading annotators...</p>
          ) : filteredAnnotators.length === 0 ? (
            <Card className="p-8 text-center bg-white border border-gray-200 rounded-lg shadow-sm">
              <MessagesSquare
                className="w-10 h-10 mx-auto mb-3 text-gray-300"
                strokeWidth={1.5}
              />
              <p className="text-sm text-gray-600 mb-4">
                {searchTerm
                  ? 'No annotators found matching your search. Try a different search term'
                  : 'No annotators yet. Annotators will appear once annotation tasks are assigned'}
              </p>
              {searchTerm && (
                <Button
                  onClick={() => setSearchTerm('')}
                  variant="outline"
                  size="sm"
                  className="rounded-lg font-normal text-xs h-8 px-3"
                >
                  Clear Search
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAnnotators.map((annotator) => (
                <Card
                  key={annotator.id}
                  className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{annotator.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-600">
                          Total Tasks
                        </span>
                        <Badge variant="outline">{annotator.totalTasks}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-600">
                          Completed
                        </span>
                        <Badge className="bg-green-100 text-green-800">
                          {annotator.completedTasks}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-600">
                          Avg Rating
                        </span>
                        <span className="font-semibold text-neutral-900">
                          {annotator.avgRating}/5
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-600">
                          Completion Rate
                        </span>
                        <span className="font-semibold text-neutral-900">
                          {annotator.totalTasks > 0
                            ? Math.round(
                                (annotator.completedTasks /
                                  annotator.totalTasks) *
                                  100
                              )
                            : 0}
                          %
                        </span>
                      </div>
                    </div>
                    <div className="pt-2">
                      <div className="flex justify-between mb-2">
                        <span className="text-xs text-neutral-600">
                          Progress
                        </span>
                        <span className="text-xs font-semibold">
                          {annotator.completedTasks}/{annotator.totalTasks}
                        </span>
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
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
