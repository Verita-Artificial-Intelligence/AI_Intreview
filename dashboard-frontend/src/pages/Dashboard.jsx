import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/utils/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import DashboardLayout from '@/components/DashboardLayout'
import {
  TrendingUp,
  TrendingDown,
  Briefcase,
  Globe,
  AlertCircle,
  Users,
  FileText,
} from 'lucide-react'

const Dashboard = () => {
  const navigate = useNavigate()
  const [projectsData, setProjectsData] = useState([])
  const [annotators, setAnnotators] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const [interviews, setInterviews] = useState([])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      // Fetch projects and interviews
      const [projectsRes, interviewsRes] = await Promise.all([
        api.get('/projects'),
        api.get('/interviews'),
      ])

      // Fetch all annotators in batches (API max page_size is 100)
      let allAnnotators = []
      let page = 1
      let hasMore = true

      while (hasMore) {
        const annotatorsRes = await api.get('/annotators/accepted', {
          params: { page, page_size: 100 },
        })
        allAnnotators = [...allAnnotators, ...(annotatorsRes.data.items || [])]
        hasMore = annotatorsRes.data.has_next || false
        page++
      }

      const projectsWithMetrics = enrichProjectsWithMetrics(
        projectsRes.data.items || [],
        interviewsRes.data || [],
        allAnnotators
      )

      setProjectsData(projectsWithMetrics)
      setAnnotators(allAnnotators)
      setInterviews(interviewsRes.data || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const enrichProjectsWithMetrics = (projects, interviews, annotators) => {
    return projects
      .filter((p) => p.status === 'active')
      .map((project) => {
        const projectInterviews = interviews.filter(
          (i) => i.project_id === project.id
        )
        const completedCount = projectInterviews.filter(
          (i) => i.status === 'completed' || i.status === 'approved'
        ).length
        const completionPercent =
          project.capacity > 0
            ? Math.round((completedCount / project.capacity) * 100)
            : 0

        // Calculate average turnaround time
        const completedWithTime = projectInterviews
          .filter(
            (i) =>
              (i.status === 'completed' || i.status === 'approved') &&
              i.created_at &&
              i.completed_at
          )
          .map((i) => {
            const start = new Date(i.created_at)
            const end = new Date(i.completed_at)
            return (end - start) / (1000 * 60 * 60 * 24) // days
          })

        const avgTurnaroundDays =
          completedWithTime.length > 0
            ? Math.round(
                completedWithTime.reduce((a, b) => a + b, 0) /
                  completedWithTime.length
              )
            : 0

        // Count annotators assigned to this project
        const annotatorsCount = annotators.filter((a) =>
          a.projectIds?.includes(project.id)
        ).length

        return {
          ...project,
          completionPercent,
          completedCount,
          avgTurnaroundDays,
          totalInterviews: projectInterviews.length,
          annotatorsCount,
        }
      })
      .sort((a, b) => {
        // Red/at-risk first (low completion)
        if (a.completionPercent !== b.completionPercent) {
          return a.completionPercent - b.completionPercent
        }
        return b.updated_at - a.updated_at
      })
  }

  // Calculate top annotators by score
  const topAnnotators = annotators
    .filter((a) => a.score !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  // Calculate geographical distribution
  const geoDistribution = {}
  annotators.forEach((a) => {
    const country = a.citizenship
    if (country) {
      geoDistribution[country] = (geoDistribution[country] || 0) + 1
    }
  })

  const topCountries = Object.entries(geoDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <DashboardLayout hideSearch={true}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-neutral-600">
            Project health, QA performance, and team insights
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-neutral-600">Loading dashboard...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-blue-100 flex-shrink-0">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      Total Annotators
                    </p>
                    <p className="text-3xl font-bold text-neutral-900">
                      {annotators.length}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-blue-100 flex-shrink-0">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      Total in Pipeline
                    </p>
                    <p className="text-3xl font-bold text-neutral-900">
                      {interviews.length}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Project Health Table */}
            <div>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-neutral-900 mb-1">
                  Project Health
                </h2>
                <p className="text-sm text-neutral-600">
                  Active projects sorted by completion status
                </p>
              </div>

              {projectsData.length === 0 ? (
                <Card className="p-8 text-center">
                  <Briefcase className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-neutral-600 mb-4">No active projects</p>
                  <Button
                    onClick={() => navigate('/projects')}
                    variant="outline"
                    size="sm"
                  >
                    Create Project
                  </Button>
                </Card>
              ) : (
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            Project Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            Completion
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            Annotators
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            Turnaround
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            Last Updated
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {projectsData.slice(0, 4).map((project) => {
                          return (
                            <tr
                              key={project.id}
                              className="hover:bg-gray-50 transition-colors cursor-pointer"
                              onClick={() =>
                                navigate(
                                  `/projects?sheet=project&id=${project.id}`
                                )
                              }
                            >
                              <td className="px-6 py-4">
                                <div>
                                  <p className="font-medium text-neutral-900">
                                    {project.name}
                                  </p>
                                  {project.description && (
                                    <p className="text-xs text-neutral-500 mt-1 line-clamp-1">
                                      {project.description}
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-24 bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full transition-all ${
                                        project.completionPercent >= 75
                                          ? 'bg-blue-600'
                                          : project.completionPercent >= 50
                                            ? 'bg-blue-500'
                                            : 'bg-blue-400'
                                      }`}
                                      style={{
                                        width: `${project.completionPercent}%`,
                                      }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium text-neutral-900 w-12">
                                    {project.completionPercent}%
                                  </span>
                                  <span className="text-xs text-neutral-600">
                                    {project.completedCount}/{project.capacity}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm font-medium text-neutral-900">
                                    {project.annotatorsCount}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-neutral-600">
                                {project.avgTurnaroundDays} days avg
                              </td>
                              <td className="px-6 py-4 text-sm text-neutral-600">
                                {new Date(
                                  project.updated_at
                                ).toLocaleDateString()}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {projectsData.length > 4 && (
                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-center">
                      <Button
                        onClick={() => navigate('/projects')}
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        View All {projectsData.length} Projects
                      </Button>
                    </div>
                  )}
                </Card>
              )}
            </div>

            {/* Two Column Layout for Top Movers and Geography */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Top Movers / QA Leaderboard */}
              <div>
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-neutral-900 mb-1">
                    Top Annotators
                  </h2>
                  <p className="text-sm text-neutral-600">Highest QA scores</p>
                </div>

                {topAnnotators.length === 0 ? (
                  <Card className="p-8 text-center">
                    <AlertCircle className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-neutral-600">
                      No annotators with passing scores yet
                    </p>
                  </Card>
                ) : (
                  <Card>
                    <div className="divide-y divide-gray-200">
                      {topAnnotators.map((annotator, idx) => (
                        <div
                          key={annotator.candidateId}
                          className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() =>
                            navigate(
                              `/annotators?sheet=annotator&id=${annotator.candidateId}`
                            )
                          }
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                                {idx + 1}
                              </div>
                              <div>
                                <p className="font-medium text-neutral-900">
                                  {annotator.candidateName}
                                </p>
                                <p className="text-xs text-neutral-500">
                                  {annotator.jobTitle || 'Job TBD'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="font-semibold text-neutral-900">
                                  {annotator.score}
                                </p>
                                <p
                                  className={`text-xs ${annotator.passStatus === 'pass' ? 'text-blue-600' : 'text-blue-400'}`}
                                >
                                  {annotator.passStatus === 'pass'
                                    ? 'Pass'
                                    : 'Fail'}
                                </p>
                              </div>
                              {annotator.passStatus === 'pass' ? (
                                <TrendingUp className="w-4 h-4 text-blue-600" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-blue-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>

              {/* Geographical Distribution */}
              <div>
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-neutral-900 mb-1">
                    Annotator Distribution
                  </h2>
                  <p className="text-sm text-neutral-600">By country</p>
                </div>

                {topCountries.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Globe className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-neutral-600">
                      No location data available
                    </p>
                  </Card>
                ) : (
                  <Card>
                    <div className="divide-y divide-gray-200">
                      {topCountries.map(([country, count]) => {
                        const maxCount = topCountries[0][1]
                        const percent = (count / maxCount) * 100
                        return (
                          <div
                            key={country}
                            className="px-6 py-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium text-neutral-900">
                                {country}
                              </p>
                              <p className="text-sm font-semibold text-neutral-600">
                                {count} annotators
                              </p>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default Dashboard
