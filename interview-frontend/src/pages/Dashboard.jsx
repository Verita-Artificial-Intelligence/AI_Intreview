import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Users, Briefcase, Clock, CheckCircle } from 'lucide-react'
import {
  cardStyles,
  iconBackgrounds,
  pageHeader,
  containers,
  getStatusClass,
  getStatusLabel,
} from '@/lib/design-system'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API = `${BACKEND_URL}/api`

const Dashboard = () => {
  const navigate = useNavigate()
  const [interviews, setInterviews] = useState([])
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [interviewsRes, candidatesRes] = await Promise.all([
        axios.get(`${API}/interviews`),
        axios.get(`${API}/candidates`),
      ])
      setInterviews(interviewsRes.data)
      setCandidates(candidatesRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const stats = [
    {
      icon: <Users className="w-6 h-6" />,
      label: 'Total Candidates',
      value: candidates.length,
      bgClass: iconBackgrounds.purple,
    },
    {
      icon: <Briefcase className="w-6 h-6" />,
      label: 'Total Interviews',
      value: interviews.length,
      bgClass: iconBackgrounds.brand,
    },
    {
      icon: <Clock className="w-6 h-6" />,
      label: 'In Progress',
      value: interviews.filter((i) => i.status === 'in_progress').length,
      bgClass: iconBackgrounds.yellow,
    },
    {
      icon: <CheckCircle className="w-6 h-6" />,
      label: 'Completed',
      value: interviews.filter((i) => i.status === 'completed').length,
      bgClass: iconBackgrounds.blue,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className={pageHeader.wrapper}>
        <div className={`${containers.lg} ${pageHeader.container}`}>
          <div>
            <h1 className={pageHeader.title}>AI Interviewer</h1>
            <p className={pageHeader.subtitle}>
              Scale your hiring with AI-powered interviews
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/')}
              data-testid="marketplace-nav-button"
              className="rounded-lg font-medium bg-brand-500 hover:bg-brand-600 text-white"
            >
              Browse Candidates
            </Button>
          </div>
        </div>
      </div>

      <div className={`${containers.lg} mx-auto px-6 py-8`}>
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className={`p-6 ${cardStyles.default}`}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.bgClass}`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-sm text-neutral-600 font-medium">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold mt-1 text-neutral-900">
                    {stat.value}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Recent Interviews */}
        <div className="mb-8">
          <h2 className="text-2xl font-display font-bold mb-4 text-neutral-900">
            Recent Interviews
          </h2>
          {loading ? (
            <p className="text-neutral-600">Loading...</p>
          ) : interviews.length === 0 ? (
            <Card className={`p-8 text-center ${cardStyles.default}`}>
              <Briefcase className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
              <p className="text-neutral-600 mb-4">
                No interviews yet. Start by browsing candidates!
              </p>
              <Button
                onClick={() => navigate('/')}
                data-testid="empty-state-marketplace-button"
                className="rounded-lg font-medium bg-brand-500 hover:bg-brand-600 text-white"
              >
                Browse Candidates
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {interviews.slice(0, 6).map((interview) => (
                <Card
                  key={interview.id}
                  className={`p-6 ${cardStyles.default}`}
                >
                  <div className="flex items-start gap-4 mb-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white bg-gradient-to-br from-brand-400 to-brand-600 flex-shrink-0">
                      {interview.candidate_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg text-neutral-900 truncate">
                            {interview.candidate_name}
                          </h3>
                          <p className="text-sm text-neutral-600 truncate">
                            {interview.position}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${getStatusClass(interview.status)}`}
                        >
                          {getStatusLabel(interview.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-500 mb-4">
                    {new Date(interview.created_at).toLocaleDateString()}
                  </p>
                  {interview.status === 'in_progress' && (
                    <Button
                      onClick={() => navigate(`/interview/${interview.id}`)}
                      data-testid={`continue-interview-${interview.id}`}
                      className="w-full rounded-lg font-medium bg-brand-500 hover:bg-brand-600 text-white"
                    >
                      Continue Interview
                    </Button>
                  )}
                  {interview.status === 'completed' && (
                    <>
                      {interview.summary && (
                        <div className="mt-3 p-3 bg-neutral-50 rounded-lg mb-3">
                          <p className="text-xs text-neutral-700 line-clamp-3">
                            {interview.summary}
                          </p>
                        </div>
                      )}
                      <Button
                        onClick={() =>
                          navigate(`/admin/review/${interview.id}`)
                        }
                        data-testid={`view-results-${interview.id}`}
                        className="w-full rounded-lg font-medium bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        View Detailed Results
                      </Button>
                    </>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
