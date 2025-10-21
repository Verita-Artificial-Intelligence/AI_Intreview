import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Users, Plus, Search } from 'lucide-react'
import Sidebar from '../components/Sidebar'

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : 'http://localhost:8000/api'

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
      filtered = filtered.filter(annotator =>
        annotator.name.toLowerCase().includes(query)
      )
    }

    // Filter by completion rate
    if (completionFilter !== 'all') {
      filtered = filtered.filter(annotator => {
        const completionRate = annotator.totalTasks > 0
          ? Math.round((annotator.completedTasks / annotator.totalTasks) * 100)
          : 0

        if (completionFilter === '100') return completionRate === 100
        if (completionFilter === '75') return completionRate >= 75 && completionRate < 100
        if (completionFilter === '50') return completionRate >= 50 && completionRate < 75
        return completionRate < 50
      })
    }

    // Filter by performance (average rating)
    if (performanceFilter !== 'all') {
      filtered = filtered.filter(annotator => {
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
        axios.get(`${API}/annotations`),
        axios.get(`${API}/interviews`)
      ])

      const tasks = annotationsRes.data
      const interviews = interviewsRes.data

      // Create a map of candidate_id to candidate_name
      const candidateNameMap = {}
      interviews.forEach(interview => {
        if (interview.candidate_id && interview.candidate_name) {
          candidateNameMap[interview.candidate_id] = interview.candidate_name
        }
      })

      // Group tasks by annotator
      const annotatorMap = {}
      tasks.forEach(task => {
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
    <div className="min-h-screen bg-white">
      <Sidebar />

      {/* Main Content */}
      <main className="ml-64 overflow-y-auto bg-white">
        <div className="max-w-7xl mx-auto px-8 py-12">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-5xl font-bold text-neutral-900 mb-3 tracking-tight leading-tight">
              Annotators
            </h1>
            <p className="text-lg text-neutral-600 font-light">
              Performance and activity overview
            </p>
          </div>

          {/* Find Candidates Button */}
          <div className="mb-8">
            <Button
              onClick={() => navigate('/candidates')}
              className="bg-brand-500 hover:bg-brand-600 text-white rounded-lg h-12 px-6"
            >
              <Plus className="w-5 h-5 mr-2" />
              Find Candidates
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="mb-6 flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search by annotator name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2"
                />
              </div>
            </div>
            <Select value={completionFilter} onValueChange={setCompletionFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by completion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Completion</SelectItem>
                <SelectItem value="100">100% Complete</SelectItem>
                <SelectItem value="75">75% - 99%</SelectItem>
                <SelectItem value="50">50% - 74%</SelectItem>
                <SelectItem value="0">Below 50%</SelectItem>
              </SelectContent>
            </Select>
            <Select value={performanceFilter} onValueChange={setPerformanceFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by performance" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <p className="text-neutral-600">Loading annotators...</p>
            ) : filteredAnnotators.length === 0 ? (
              <div className="lg:col-span-3 text-center py-12">
                <Users className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-600 mb-2 font-medium">
                  {searchTerm ? 'No annotators found' : 'No annotators yet'}
                </p>
                <p className="text-sm text-neutral-500 mb-4">
                  {searchTerm ? 'Try a different search term' : 'Annotators will appear once annotation tasks are assigned'}
                </p>
              </div>
            ) : (
              filteredAnnotators.map((annotator) => (
                <Card key={annotator.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{annotator.name}</CardTitle>
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
