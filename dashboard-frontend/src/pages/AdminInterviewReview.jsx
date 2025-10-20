import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  ArrowLeft,
  Briefcase,
  Award,
  Clock,
  PlayCircle,
} from 'lucide-react'
import { pageHeader, containers, cardStyles } from '@/lib/design-system'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API = `${BACKEND_URL}/api`

const AdminInterviewReview = () => {
  const { interviewId } = useParams()
  const navigate = useNavigate()
  const [interview, setInterview] = useState(null)
  const [candidate, setCandidate] = useState(null)
  const [messages, setMessages] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInterviewData()
  }, [interviewId])

  const fetchInterviewData = async () => {
    try {
      const [interviewRes, messagesRes] = await Promise.all([
        axios.get(`${API}/interviews/${interviewId}`),
        axios.get(`${API}/interviews/${interviewId}/messages`),
      ])

      setInterview(interviewRes.data)
      setMessages(messagesRes.data)

      // Fetch candidate
      const candidateRes = await axios.get(
        `${API}/candidates/${interviewRes.data.candidate_id}`
      )
      setCandidate(candidateRes.data)

      // Check if analysis already exists
      if (interviewRes.data.analysis_result && interviewRes.data.analysis_status === 'completed') {
        setAnalysis(interviewRes.data.analysis_result)
      } else if (interviewRes.data.analysis_status === 'pending') {
        await generateAnalysis(messagesRes.data, candidateRes.data)
      } else if (interviewRes.data.analysis_status === 'processing') {
        setAnalysis({ processing: true })
      } else if (interviewRes.data.analysis_status === 'failed') {
        setAnalysis({ failed: true })
      } else {
        await generateAnalysis(messagesRes.data, candidateRes.data)
      }
    } catch (error) {
      console.error('Error fetching interview data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateAnalysis = async (msgs, cand) => {
    try {
      const response = await axios.post(
        `${API}/interviews/${interviewId}/analyze?framework=behavioral`
      )
      setAnalysis(response.data)
    } catch (error) {
      console.error('Error generating analysis:', error)
      setAnalysis(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto mb-3"></div>
          <p className="text-sm text-neutral-600">Analyzing interview...</p>
        </div>
      </div>
    )
  }

  if (!interview || !candidate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-600">Interview not found</p>
      </div>
    )
  }

  // Show processing state
  if (analysis?.processing) {
    return (
      <div className="min-h-screen bg-background">
        <div className={pageHeader.wrapper}>
          <div className={`${containers.lg} ${pageHeader.container}`}>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              size="sm"
              className="rounded-lg"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-md">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold mb-2 text-neutral-900">Analysis in Progress</h2>
            <p className="text-neutral-600">
              Our AI is analyzing the interview responses. This usually takes a few minutes. Please check back soon.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline" className="mt-6">
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Show failed state
  if (analysis?.failed) {
    return (
      <div className="min-h-screen bg-background">
        <div className={pageHeader.wrapper}>
          <div className={`${containers.lg} ${pageHeader.container}`}>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              size="sm"
              className="rounded-lg"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-bold mb-2 text-neutral-900">Analysis Failed</h2>
            <p className="text-neutral-600 mb-6">
              We encountered an error while analyzing this interview. Please try again or contact support.
            </p>
            <Button onClick={() => generateAnalysis(messages, candidate)} variant="outline">
              Retry Analysis
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const getScoreBadge = (score) => {
    if (score >= 8) return 'bg-green-50 text-green-700 border-green-200'
    if (score >= 6) return 'bg-yellow-50 text-yellow-700 border-yellow-200'
    return 'bg-red-50 text-red-700 border-red-200'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className={pageHeader.wrapper}>
        <div className={`${containers.lg} ${pageHeader.container}`}>
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            size="sm"
            className="rounded-lg"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      <div className={`${containers.lg} mx-auto px-5 py-5`}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Candidate Info & Video */}
          <div className="lg:col-span-1 space-y-4">
            {/* Candidate Profile */}
            <Card className={`p-4 ${cardStyles.default}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold text-white bg-gradient-to-br from-brand-400 to-brand-600">
                  {candidate.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900">
                    {candidate.name}
                  </h3>
                  <p className="text-xs text-neutral-600">{candidate.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <Briefcase className="w-3 h-3 text-neutral-500" />
                  <span className="text-neutral-700">{candidate.position}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Award className="w-3 h-3 text-neutral-500" />
                  <span className="text-neutral-700">
                    {candidate.experience_years} years experience
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="w-3 h-3 text-neutral-500" />
                  <span className="text-neutral-700">
                    {new Date(interview.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-neutral-200">
                <p className="text-xs font-medium text-neutral-700 mb-1.5">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {candidate.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-neutral-200">
                <p className="text-xs font-medium text-neutral-700 mb-1.5">Bio</p>
                <p className="text-xs text-neutral-600">{candidate.bio}</p>
              </div>
            </Card>

            {/* Interview Metadata */}
            <Card className={`p-4 ${cardStyles.default}`}>
              <h3 className="font-bold text-sm mb-3 text-neutral-900">Interview Details</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Status</span>
                  <span className="font-medium text-neutral-900">
                    {interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Duration</span>
                  <span className="font-medium text-neutral-900">
                    {interview.completed_at
                      ? Math.round(
                          (new Date(interview.completed_at) - new Date(interview.created_at)) / 60000
                        ) + ' min'
                      : 'In progress'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Video Player */}
            {interview.video_url && (
              <Card className={`p-4 ${cardStyles.default}`}>
                <div className="flex items-center gap-2 mb-3">
                  <PlayCircle className="w-4 h-4 text-neutral-700" />
                  <h3 className="text-sm font-bold text-neutral-900">Interview Recording</h3>
                </div>
                <div className="rounded-lg overflow-hidden bg-black">
                  <video controls className="w-full">
                    <source src={`${BACKEND_URL}${interview.video_url}`} type="video/mp4" />
                    <source src={`${BACKEND_URL}${interview.video_url}`} type="video/webm" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Analysis & Transcript */}
          <div className="lg:col-span-2 space-y-4">
            {/* Overall Score */}
            <Card className={`p-4 ${cardStyles.default}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Overall Assessment</h3>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    AI-generated evaluation based on interview responses
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-neutral-900">
                      {analysis?.overall_score || 0}<span className="text-sm text-neutral-500">/10</span>
                    </div>
                    <p className="text-xs text-neutral-500">Score</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Skills Assessment */}
            <Card className={`p-4 ${cardStyles.default}`}>
              <h3 className="text-base font-bold mb-3 text-neutral-900">Skills Assessment</h3>
              <div className="space-y-3">
                {analysis?.skills_breakdown?.map((skill, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-neutral-900">{skill.skill}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getScoreBadge(skill.score)}`}>
                          {skill.level}
                        </span>
                        <span className="text-sm font-bold text-neutral-900">{skill.score}/10</span>
                      </div>
                    </div>
                    <div className="w-full bg-neutral-100 rounded-full h-1.5">
                      <div
                        className="bg-brand-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${(skill.score / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Key Insights */}
            {analysis?.key_insights && analysis.key_insights.length > 0 && (
              <Card className={`p-4 ${cardStyles.default}`}>
                <h3 className="text-base font-bold mb-3 text-neutral-900">Key Insights</h3>
                <ul className="space-y-2">
                  {analysis.key_insights.map((insight, index) => (
                    <li key={index} className="flex gap-2 text-sm text-neutral-700">
                      <span className="text-neutral-400 flex-shrink-0">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Strengths & Growth Areas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className={`p-4 ${cardStyles.default}`}>
                <h3 className="text-sm font-bold mb-2 text-neutral-900">Strengths</h3>
                <ul className="space-y-1.5">
                  {analysis?.strengths?.map((strength, index) => (
                    <li key={index} className="flex gap-2 text-xs text-neutral-700">
                      <span className="text-neutral-400 flex-shrink-0">•</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className={`p-4 ${cardStyles.default}`}>
                <h3 className="text-sm font-bold mb-2 text-neutral-900">Growth Areas</h3>
                <ul className="space-y-1.5">
                  {analysis?.areas_for_improvement?.map((area, index) => (
                    <li key={index} className="flex gap-2 text-xs text-neutral-700">
                      <span className="text-neutral-400 flex-shrink-0">•</span>
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Communication & Technical */}
            {(analysis?.communication_assessment || analysis?.technical_depth || analysis?.problem_solving) && (
              <Card className={`p-4 ${cardStyles.default}`}>
                <h3 className="text-base font-bold mb-3 text-neutral-900">Detailed Assessment</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {analysis?.communication_assessment && (
                    <div>
                      <p className="text-sm font-semibold text-neutral-900 mb-2">Communication</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Clarity</span>
                          <span className="font-medium text-neutral-900">
                            {analysis.communication_assessment.clarity_score}/10
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Articulation</span>
                          <span className="font-medium text-neutral-900">
                            {analysis.communication_assessment.articulation_score}/10
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Confidence</span>
                          <span className="font-medium text-neutral-900">
                            {analysis.communication_assessment.confidence_score}/10
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {analysis?.technical_depth && (
                    <div>
                      <p className="text-sm font-semibold text-neutral-900 mb-2">Technical Depth</p>
                      <div className="text-xs">
                        <div className="flex justify-between mb-1">
                          <span className="text-neutral-600">Score</span>
                          <span className="font-medium text-neutral-900">{analysis.technical_depth.score}/10</span>
                        </div>
                        <p className="text-neutral-600 leading-relaxed">{analysis.technical_depth.notes}</p>
                      </div>
                    </div>
                  )}

                  {analysis?.problem_solving && (
                    <div>
                      <p className="text-sm font-semibold text-neutral-900 mb-2">Problem Solving</p>
                      <div className="text-xs">
                        <div className="flex justify-between mb-1">
                          <span className="text-neutral-600">Score</span>
                          <span className="font-medium text-neutral-900">{analysis.problem_solving.score}/10</span>
                        </div>
                        <p className="text-neutral-600 leading-relaxed">{analysis.problem_solving.approach}</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Hiring Recommendation */}
            <Card className={`p-4 ${cardStyles.default}`}>
              <h3 className="text-base font-bold mb-3 text-neutral-900">Hiring Recommendation</h3>
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-200 mb-3">
                <div>
                  <p className="text-lg font-bold text-neutral-900">{analysis?.recommendation}</p>
                  <p className="text-xs text-neutral-600">Confidence: {analysis?.confidence}%</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-neutral-900">{analysis?.confidence}%</div>
                </div>
              </div>

              {analysis?.recommendations && analysis.recommendations.length > 0 && (
                <div className="pt-3 border-t border-neutral-200">
                  <p className="text-sm font-semibold text-neutral-900 mb-2">Recommendations</p>
                  <ul className="space-y-1">
                    {analysis.recommendations.map((rec, index) => (
                      <li key={index} className="text-xs text-neutral-700 flex gap-2">
                        <span className="text-neutral-400">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>

            {/* Interview Transcript */}
            <Card className={`p-4 ${cardStyles.default}`}>
              <h3 className="text-base font-bold mb-3 text-neutral-900">Interview Transcript</h3>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {messages.map((message, index) => (
                  <div key={index} className="border-l-2 border-neutral-200 pl-3">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs font-semibold text-neutral-900">
                        {message.role === 'assistant' ? 'Interviewer' : candidate.name}
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-700 leading-relaxed">{message.content}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminInterviewReview
