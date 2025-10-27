import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '@/utils/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeft,
  Briefcase,
  Award,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { pageHeader, containers, cardStyles } from '@/lib/design-system'
import { toast } from 'sonner'
import Sidebar from '@/components/Sidebar'

const AdminInterviewReview = () => {
  const { interviewId } = useParams()
  const navigate = useNavigate()
  const [interview, setInterview] = useState(null)
  const [candidate, setCandidate] = useState(null)
  const [messages, setMessages] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState(null)
  const [showAcceptDialog, setShowAcceptDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [videoSources, setVideoSources] = useState([])
  const [transcriptUnavailable, setTranscriptUnavailable] = useState(false)
  const [highlightedEntry, setHighlightedEntry] = useState(null)
  const transcriptRef = useRef(null)

  const getInitials = (name) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase()
  }

  const scrollToTranscriptEntry = (entryIndex) => {
    if (!transcriptRef.current) return

    const transcriptEntries = transcriptRef.current.querySelectorAll(
      '[data-transcript-entry]'
    )
    const targetEntry = transcriptEntries[entryIndex - 1] // Convert to 0-based index

    if (targetEntry) {
      targetEntry.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightedEntry(entryIndex)

      // Remove highlight after 3 seconds
      setTimeout(() => setHighlightedEntry(null), 3000)
    }
  }

  const parseTextWithCitations = (text) => {
    if (!text) return text

    // Match patterns like [3], [5], [3, 5], etc.
    const citationRegex = /\[(\d+(?:\s*,\s*\d+)*)\]/g

    const parts = []
    let lastIndex = 0
    let match

    while ((match = citationRegex.exec(text)) !== null) {
      // Add text before the citation
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index))
      }

      // Parse citation numbers
      const citationNumbers = match[1]
        .split(',')
        .map((num) => parseInt(num.trim()))
        .filter((num) => !isNaN(num))

      // Create clickable citation spans
      citationNumbers.forEach((num, index) => {
        if (index > 0) parts.push(', ')
        parts.push(
          <button
            key={`${match.index}-${num}`}
            onClick={() => scrollToTranscriptEntry(num)}
            className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-medium bg-brand-200 text-brand-800 rounded-full hover:bg-brand-300 transition-colors cursor-pointer mx-0.5"
            title={`Jump to transcript entry ${num}`}
          >
            {num}
          </button>
        )
      })

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }

    return parts.length > 0 ? parts : text
  }

  const fetchInterviewData = useCallback(async () => {
    try {
      setTranscriptUnavailable(false)

      const interviewPromise = api.get(`/interviews/${interviewId}`)
      const messagesPromise = axios
        .get(`${API}/interviews/${interviewId}/messages`)
        .then((res) => res.data)
        .catch((error) => {
          if (error.response?.status === 404) {
            console.warn(
              'Transcript not yet available for interview:',
              interviewId
            )
            setTranscriptUnavailable(true)
            return null
          }
          throw error
        })
      const reviewPromise = axios
        .get(`${API}/admin/review/${interviewId}`)
        .catch((error) => {
          console.warn('Review endpoint unavailable:', error.message)
          return null
        })

      const [interviewRes, messagesData, reviewRes] = await Promise.all([
        interviewPromise,
        messagesPromise,
        reviewPromise,
      ])

      setInterview(interviewRes.data)
      setMessages(Array.isArray(messagesData) ? messagesData : [])

      // Try to fetch full candidate data, fall back to interview data if not available
      let candidateData
      if (interviewRes.data.candidate_id) {
        try {
          const candidateRes = await api.get(
            `/candidates/${interviewRes.data.candidate_id}`
          )
          candidateData = candidateRes.data
        } catch (candidateError) {
          // If candidate fetch fails (e.g., profile not completed), use interview data
          console.warn(
            'Could not fetch full candidate profile, using interview data:',
            candidateError.message
          )
          candidateData = {
            id: interviewRes.data.candidate_id,
            name: interviewRes.data.candidate_name || 'Unknown',
            email: 'N/A',
            position:
              interviewRes.data.position ||
              interviewRes.data.job_title ||
              'N/A',
            skills: interviewRes.data.skills?.map((s) => s.name) || [],
            experience_years: 0,
            bio: '',
          }
        }
      } else {
        // No candidate_id in interview, use interview data directly
        console.warn('Interview has no candidate_id, using interview data')
        candidateData = {
          id: null,
          name: interviewRes.data.candidate_name || 'Unknown',
          email: 'N/A',
          position:
            interviewRes.data.position || interviewRes.data.job_title || 'N/A',
          skills: interviewRes.data.skills?.map((s) => s.name) || [],
          experience_years: 0,
          bio: '',
        }
      }
      setCandidate(candidateData)

      if (reviewRes?.data) {
        const recordings = Array.isArray(reviewRes.data.recordings)
          ? reviewRes.data.recordings
          : []

        const normalizedRecordings = recordings
          .map((value) => {
            if (!value) return null
            if (value.startsWith('http://') || value.startsWith('https://')) {
              return value
            }
            if (!BACKEND_URL) return value
            const base = BACKEND_URL.endsWith('/')
              ? BACKEND_URL.slice(0, -1)
              : BACKEND_URL
            const path = value.startsWith('/') ? value : `/${value}`
            return `${base}${path}`
          })
          .filter(Boolean)

        const uniqueRecordings = []
        normalizedRecordings.forEach((url) => {
          if (!uniqueRecordings.includes(url)) {
            uniqueRecordings.push(url)
          }
        })

        setVideoSources(uniqueRecordings)
        if (uniqueRecordings.length > 0) {
          setVideoPollingAttempts(0)
        }
      } else {
        setVideoSources([])
      }

      const transcriptHasEntries =
        Array.isArray(interviewRes.data?.transcript) &&
        interviewRes.data.transcript.length > 0
      const messagesHaveEntries =
        Array.isArray(messagesData) && messagesData.length > 0

      // Check if analysis already exists
      if (
        interviewRes.data.analysis_result &&
        interviewRes.data.analysis_status === 'completed'
      ) {
        setAnalysis(interviewRes.data.analysis_result)
      } else if (interviewRes.data.analysis_status === 'processing') {
        setAnalysis({ processing: true })
      } else if (interviewRes.data.analysis_status === 'failed') {
        setAnalysis({ failed: true })
      } else if (transcriptHasEntries || messagesHaveEntries) {
        // No analysis exists - automatically generate it
        console.log('No analysis found, automatically generating...')
        generateAnalysis(messagesData || [], candidateData)
      } else {
        setAnalysis(null)
      }
    } catch (error) {
      console.error('Error fetching interview data:', error)
    } finally {
      setLoading(false)
    }
  }, [interviewId])

  useEffect(() => {
    fetchInterviewData()
  }, [fetchInterviewData])

  const [videoPollingAttempts, setVideoPollingAttempts] = useState(0)

  useEffect(() => {
    if (!interview) return
    if (interview.status !== 'completed') return
    if (videoSources.length > 0) return
    if (videoPollingAttempts >= 5) return

    const timeoutId = setTimeout(() => {
      setVideoPollingAttempts((attempts) => attempts + 1)
      fetchInterviewData()
    }, 5000)

    return () => clearTimeout(timeoutId)
  }, [interview, videoSources.length, videoPollingAttempts, fetchInterviewData])

  const generateAnalysis = async (msgs, cand) => {
    setAnalyzing(true)
    setAnalysisError(null)
    try {
      const response = await api.post(
        `/interviews/${interviewId}/analyze?framework=behavioral`
      )
      setAnalysis(response.data)
      setAnalysisError(null)
    } catch (error) {
      console.error('Error generating analysis:', error)
      setAnalysisError(
        error.response?.data?.detail ||
          error.message ||
          'Failed to generate analysis'
      )
      setAnalysis(null)
    } finally {
      setAnalyzing(false)
    }
  }

  const confirmAcceptCandidate = async () => {
    try {
      await api.patch(`/interviews/${interviewId}/accept`)
      toast.success(
        'Candidate accepted! You can now create annotation tasks for them.'
      )
      setShowAcceptDialog(false)
      fetchInterviewData()
    } catch (error) {
      console.error('Error accepting candidate:', error)
      toast.error('Failed to accept candidate')
    }
  }

  const confirmRejectCandidate = async () => {
    try {
      await api.patch(`/interviews/${interviewId}/reject`)
      toast.success('Candidate rejected')
      setShowRejectDialog(false)
      fetchInterviewData()
    } catch (error) {
      console.error('Error rejecting candidate:', error)
      toast.error('Failed to reject candidate')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Sidebar />
        <main className="lg:ml-64 overflow-y-auto pb-16 lg:pb-0">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto mb-3"></div>
              <p className="text-sm text-neutral-600">Loading interview...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!interview || !candidate) {
    return (
      <div className="min-h-screen bg-white">
        <Sidebar />
        <main className="lg:ml-64 overflow-y-auto pb-16 lg:pb-0">
          <div className="flex items-center justify-center min-h-screen">
            <p className="text-neutral-600">Interview not found</p>
          </div>
        </main>
      </div>
    )
  }

  // Inline loading will be handled in specific sections below

  // Show error state
  if (analysisError || analysis?.failed) {
    return (
      <div className="min-h-screen bg-white">
        <Sidebar />
        <main className="lg:ml-64 overflow-y-auto pb-16 lg:pb-0">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              size="sm"
              className="rounded-lg mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center justify-center py-20">
              <div className="text-center max-w-md">
                <h2 className="text-xl font-bold mb-2 text-neutral-900">
                  Analysis Failed
                </h2>
                <p className="text-neutral-600 mb-2">
                  We encountered an error while analyzing this interview.
                </p>
                {analysisError && (
                  <p className="text-xs text-red-600 mb-4 font-mono bg-red-50 p-2 rounded">
                    {analysisError}
                  </p>
                )}
                <Button
                  onClick={() => generateAnalysis(messages, candidate)}
                  variant="outline"
                >
                  Retry Analysis
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Inline handling of unavailable analysis will be shown in section cards

  const getScoreBadge = (score) => {
    if (score >= 8) return 'bg-green-50 text-green-700 border-green-200'
    if (score >= 6) return 'bg-yellow-50 text-yellow-700 border-yellow-200'
    return 'bg-red-50 text-red-700 border-red-200'
  }

  // Derive inline loading flags for analysis sections
  const hasTranscript =
    Array.isArray(interview?.transcript) && interview.transcript.length > 0
  const hasMessages = Array.isArray(messages) && messages.length > 0
  const isAnalysisLoadingInline =
    analyzing ||
    analysis?.processing ||
    (!analysis && (hasTranscript || hasMessages))
  const isAnalysisUnavailable = !analysis && !isAnalysisLoadingInline

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />

      {/* Main Content */}
      <main className="lg:ml-64 overflow-y-auto pb-16 lg:pb-0">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-6">
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              size="sm"
              className="rounded-lg mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-semibold text-neutral-900 mb-1">
              Interview Review
            </h1>
            <p className="text-sm text-gray-500">
              AI-powered analysis and candidate assessment
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column - Candidate Info & Video */}
            <div className="lg:col-span-1 space-y-4">
              {/* Candidate Profile */}
              <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-md flex items-center justify-center text-base font-bold text-neutral-900 bg-brand-200">
                    {getInitials(candidate.name)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900">
                      {candidate.name}
                    </h3>
                    <p className="text-xs text-neutral-600">
                      {candidate.email}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Briefcase className="w-3 h-3 text-neutral-500" />
                    <span className="text-neutral-700">
                      {candidate.position}
                    </span>
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
                  <p className="text-xs font-medium text-neutral-700 mb-1.5">
                    Skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-neutral-200">
                  <p className="text-xs font-medium text-neutral-700 mb-1.5">
                    Bio
                  </p>
                  <p className="text-xs text-neutral-600">{candidate.bio}</p>
                </div>
              </Card>

              {/* Accept/Reject Actions */}
              {interview.status === 'completed' &&
                interview.acceptance_status !== 'accepted' &&
                interview.acceptance_status !== 'rejected' && (
                  <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <h3 className="font-bold text-sm mb-3 text-neutral-900">
                      Candidate Decision
                    </h3>
                    <div className="space-y-2">
                      <Button
                        onClick={() => setShowAcceptDialog(true)}
                        size="sm"
                        className="w-full rounded-lg bg-brand-500 hover:bg-brand-600 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Accept Candidate
                      </Button>
                      <Button
                        onClick={() => setShowRejectDialog(true)}
                        variant="outline"
                        size="sm"
                        className="w-full rounded-lg"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Candidate
                      </Button>
                    </div>
                  </Card>
                )}

              {interview.acceptance_status === 'accepted' && (
                <Card className="p-6 bg-green-50 border border-green-200 rounded-lg shadow-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-bold text-sm text-green-900">
                        Candidate Accepted
                      </p>
                      <p className="text-xs text-green-700">
                        Ready for annotation task assignment
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {interview.acceptance_status === 'rejected' && (
                <Card className="p-6 bg-neutral-50 border border-neutral-200 rounded-lg shadow-sm">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-neutral-600" />
                    <div>
                      <p className="font-bold text-sm text-neutral-900">
                        Candidate Rejected
                      </p>
                      <p className="text-xs text-neutral-700">
                        This candidate has been declined
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Interview Metadata */}
              <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <h3 className="font-bold text-sm mb-3 text-neutral-900">
                  Interview Details
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Status</span>
                    <span className="font-medium text-neutral-900">
                      {interview.status.charAt(0).toUpperCase() +
                        interview.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Duration</span>
                    <span className="font-medium text-neutral-900">
                      {interview.completed_at
                        ? Math.round(
                            (new Date(interview.completed_at) -
                              new Date(interview.created_at)) /
                              60000
                          ) + ' min'
                        : 'In progress'}
                    </span>
                  </div>
                </div>
              </Card>

              {interview?.status === 'completed' &&
                videoSources.length === 0 && (
                  <Card className="p-6 bg-neutral-50 border border-dashed border-gray-300 rounded-lg shadow-sm">
                    <h3 className="font-bold text-sm mb-2 text-neutral-900">
                      Recording Processing
                    </h3>
                    <p className="text-xs text-neutral-600">
                      We&apos;re finalizing the interview recording. This
                      usually takes just a moment&mdash;refreshing happens
                      automatically, so hang tight or check back shortly if the
                      video doesn&apos;t appear right away.
                    </p>
                  </Card>
                )}

              {videoSources.length > 0 && (
                <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <h3 className="font-bold text-sm mb-3 text-neutral-900">
                    Interview Recording
                  </h3>
                  <div className="space-y-3">
                    {videoSources.map((src, idx) => (
                      <div key={idx}>
                        {videoSources.length > 1 && (
                          <p className="text-xs font-medium text-neutral-600 mb-1">
                            Recording {idx + 1}
                          </p>
                        )}
                        <video
                          controls
                          preload="metadata"
                          className="w-full rounded-lg bg-black"
                          src={src}
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Right Column - Analysis & Transcript */}
            <div className="lg:col-span-2 space-y-4">
              {/* Analysis Section */}
              {isAnalysisUnavailable ? (
                <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="flex flex-col items-center justify-center py-8">
                    <Clock className="w-10 h-10 text-neutral-300 mb-3" />
                    <p className="text-sm text-neutral-600 text-center max-w-md">
                      Analysis will appear here once the interview has content.
                    </p>
                  </div>
                </Card>
              ) : (
                <>
                  {/* Combined Assessment Card */}
                  {isAnalysisLoadingInline ? (
                    <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mb-4"></div>
                        <h3 className="text-base font-bold mb-2 text-neutral-900">
                          Waiting for AI Analysis
                        </h3>
                        <p className="text-sm text-neutral-600 text-center max-w-md">
                          Our AI is analyzing the interview responses. This
                          usually takes 10-30 seconds...
                        </p>
                      </div>
                    </Card>
                  ) : (
                    <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                      {/* Overall Score */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-base font-bold text-neutral-900">
                              Overall Assessment
                            </h3>
                            <p className="text-xs text-neutral-600 mt-0.5">
                              AI-generated evaluation based on interview
                              responses
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-2xl font-bold text-neutral-900">
                                {analysis?.overall_score || 0}
                                <span className="text-sm text-neutral-500">
                                  /10
                                </span>
                              </div>
                              <p className="text-xs text-neutral-500">Score</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Skills Assessment */}
                      <div className="mb-6 pb-6 border-b border-neutral-200">
                        <h3 className="text-base font-bold mb-3 text-neutral-900">
                          Skills Assessment
                        </h3>
                        <div className="space-y-3">
                          {analysis?.skills_breakdown?.map((skill, index) => (
                            <div key={index}>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-sm font-medium text-neutral-900">
                                  {skill.skill}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full ${getScoreBadge(skill.score)}`}
                                  >
                                    {skill.level}
                                  </span>
                                  <span className="text-sm font-bold text-neutral-900">
                                    {skill.score}/10
                                  </span>
                                </div>
                              </div>
                              <div className="w-full bg-neutral-100 rounded-full h-1.5">
                                <div
                                  className="bg-brand-500 h-1.5 rounded-full transition-all"
                                  style={{
                                    width: `${(skill.score / 10) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Key Insights */}
                      {analysis?.key_insights &&
                        analysis.key_insights.length > 0 && (
                          <div className="mb-6 pb-6 border-b border-neutral-200">
                            <h3 className="text-base font-bold mb-3 text-neutral-900">
                              Key Insights
                            </h3>
                            <ul className="space-y-2">
                              {analysis.key_insights.map((insight, index) => (
                                <li
                                  key={index}
                                  className="flex gap-2 text-sm text-neutral-700"
                                >
                                  <span className="text-neutral-400 flex-shrink-0">
                                    •
                                  </span>
                                  <span>{parseTextWithCitations(insight)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {/* Strengths & Growth Areas */}
                      <div className="mb-6 pb-6 border-b border-neutral-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="text-sm font-bold mb-2 text-neutral-900">
                              Strengths
                            </h3>
                            <ul className="space-y-1.5">
                              {analysis?.strengths?.map((strength, index) => (
                                <li
                                  key={index}
                                  className="flex gap-2 text-xs text-neutral-700"
                                >
                                  <span className="text-neutral-400 flex-shrink-0">
                                    •
                                  </span>
                                  <span>
                                    {parseTextWithCitations(strength)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h3 className="text-sm font-bold mb-2 text-neutral-900">
                              Growth Areas
                            </h3>
                            <ul className="space-y-1.5">
                              {analysis?.areas_for_improvement?.map(
                                (area, index) => (
                                  <li
                                    key={index}
                                    className="flex gap-2 text-xs text-neutral-700"
                                  >
                                    <span className="text-neutral-400 flex-shrink-0">
                                      •
                                    </span>
                                    <span>{parseTextWithCitations(area)}</span>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Detailed Assessment */}
                      {(analysis?.communication_assessment ||
                        analysis?.technical_depth ||
                        analysis?.problem_solving) && (
                        <div>
                          <h3 className="text-base font-bold mb-3 text-neutral-900">
                            Detailed Assessment
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {analysis?.communication_assessment && (
                              <div>
                                <p className="text-sm font-semibold text-neutral-900 mb-2">
                                  Communication
                                </p>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-neutral-600">
                                      Clarity
                                    </span>
                                    <span className="font-medium text-neutral-900">
                                      {
                                        analysis.communication_assessment
                                          .clarity_score
                                      }
                                      /10
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-neutral-600">
                                      Articulation
                                    </span>
                                    <span className="font-medium text-neutral-900">
                                      {
                                        analysis.communication_assessment
                                          .articulation_score
                                      }
                                      /10
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-neutral-600">
                                      Confidence
                                    </span>
                                    <span className="font-medium text-neutral-900">
                                      {
                                        analysis.communication_assessment
                                          .confidence_score
                                      }
                                      /10
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {analysis?.technical_depth && (
                              <div>
                                <p className="text-sm font-semibold text-neutral-900 mb-2">
                                  Technical Depth
                                </p>
                                <div className="text-xs">
                                  <div className="flex justify-between mb-1">
                                    <span className="text-neutral-600">
                                      Score
                                    </span>
                                    <span className="font-medium text-neutral-900">
                                      {analysis.technical_depth.score}/10
                                    </span>
                                  </div>
                                  <p className="text-neutral-600 leading-relaxed">
                                    {analysis.technical_depth.notes}
                                  </p>
                                </div>
                              </div>
                            )}

                            {analysis?.problem_solving && (
                              <div>
                                <p className="text-sm font-semibold text-neutral-900 mb-2">
                                  Problem Solving
                                </p>
                                <div className="text-xs">
                                  <div className="flex justify-between mb-1">
                                    <span className="text-neutral-600">
                                      Score
                                    </span>
                                    <span className="font-medium text-neutral-900">
                                      {analysis.problem_solving.score}/10
                                    </span>
                                  </div>
                                  <p className="text-neutral-600 leading-relaxed">
                                    {analysis.problem_solving.approach}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </Card>
                  )}

                  {/* Hiring Recommendation */}
                  {isAnalysisLoadingInline ? (
                    <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                      <div className="flex flex-col items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500 mb-3"></div>
                        <p className="text-sm text-neutral-600">
                          Generating recommendation...
                        </p>
                      </div>
                    </Card>
                  ) : (
                    <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                      <h3 className="text-base font-bold mb-3 text-neutral-900">
                        Hiring Recommendation
                      </h3>
                      <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-200 mb-3">
                        <div>
                          <p className="text-lg font-bold text-neutral-900">
                            {analysis?.recommendation}
                          </p>
                          <p className="text-xs text-neutral-600">
                            Confidence: {analysis?.confidence}%
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-neutral-900">
                            {analysis?.confidence}%
                          </div>
                        </div>
                      </div>

                      {analysis?.recommendations &&
                        analysis.recommendations.length > 0 && (
                          <div className="pt-3 border-t border-neutral-200">
                            <p className="text-sm font-semibold text-neutral-900 mb-2">
                              Recommendations
                            </p>
                            <ul className="space-y-1">
                              {analysis.recommendations.map((rec, index) => (
                                <li
                                  key={index}
                                  className="text-xs text-neutral-700 flex gap-2"
                                >
                                  <span className="text-neutral-400">•</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </Card>
                  )}

                  {/* Interview Transcript */}
                  {interview.transcript && interview.transcript.length > 0 ? (
                    <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                      <h3 className="text-base font-bold mb-3 text-neutral-900">
                        Interview Transcript
                      </h3>
                      <div
                        ref={transcriptRef}
                        className="space-y-3 max-h-[600px] overflow-y-auto pr-2"
                      >
                        {interview.transcript.map((entry, index) => (
                          <div
                            key={index}
                            data-transcript-entry={index + 1}
                            className={`border-l-2 border-neutral-200 pl-3 transition-colors duration-300 ${
                              highlightedEntry === index + 1
                                ? 'bg-brand-50 border-brand-300'
                                : ''
                            }`}
                          >
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="text-xs font-semibold text-neutral-900">
                                {entry.speaker === 'assistant'
                                  ? 'AI Interviewer'
                                  : candidate.name}
                              </span>
                              <span className="text-[10px] text-neutral-500">
                                [{index + 1}]
                              </span>
                            </div>
                            <p className="text-sm text-neutral-700 leading-relaxed">
                              {entry.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ) : transcriptUnavailable ? (
                    <Card className="p-8 text-center bg-white border border-gray-200 rounded-lg shadow-sm">
                      <Clock
                        className="w-10 h-10 mx-auto mb-3 text-gray-300"
                        strokeWidth={1.5}
                      />
                      <p className="text-sm text-gray-600 mb-4">
                        We&apos;re still preparing the interview transcript. Try
                        refreshing this page in a few moments to view the full
                        conversation.
                      </p>
                      <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                        size="sm"
                        className="rounded-lg font-normal text-xs h-8 px-3"
                      >
                        Refresh Page
                      </Button>
                    </Card>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Accept Candidate Dialog */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept Candidate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to accept this candidate? After accepting,
              you can create annotation tasks for them through the Annotation
              Tasks page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAcceptCandidate}
              className="bg-brand-500 hover:bg-brand-600"
            >
              Accept Candidate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Candidate Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Candidate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this candidate? This action will
              update their status and they will not be able to proceed with
              annotation tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRejectCandidate}
              className="bg-red-500 hover:bg-red-600"
            >
              Reject Candidate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default AdminInterviewReview
