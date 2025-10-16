import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, User, Briefcase, Award, Star, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminInterviewReview = () => {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [messages, setMessages] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInterviewData();
  }, [interviewId]);

  const fetchInterviewData = async () => {
    try {
      const [interviewRes, messagesRes] = await Promise.all([
        axios.get(`${API}/interviews/${interviewId}`),
        axios.get(`${API}/interviews/${interviewId}/messages`)
      ]);

      setInterview(interviewRes.data);
      setMessages(messagesRes.data);

      // Fetch candidate
      const candidateRes = await axios.get(`${API}/candidates/${interviewRes.data.candidate_id}`);
      setCandidate(candidateRes.data);

      // Generate AI analysis
      await generateAnalysis(messagesRes.data, candidateRes.data);
    } catch (error) {
      console.error('Error fetching interview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAnalysis = async (msgs, cand) => {
    try {
      // Call AI to generate comprehensive analysis
      const response = await axios.post(`${API}/interviews/${interviewId}/analyze?framework=behavioral`);
      setAnalysis(response.data);
    } catch (error) {
      console.error('Error generating analysis:', error);
      setAnalysis(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing interview...</p>
        </div>
      </div>
    );
  }

  if (!interview || !candidate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Interview not found</p>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 8) return '#10b981';
    if (score >= 6) return '#f59e0b';
    return '#ef4444';
  };

  const getRecommendationColor = (rec) => {
    if (rec === 'Strong Hire') return '#10b981';
    if (rec === 'Hire') return '#3b82f6';
    if (rec === 'Maybe') return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="min-h-screen" style={{ background: '#fafafa' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              size="sm"
              className="rounded-lg"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#2c3e50' }}>Interview Analysis</h1>
              <p className="text-sm text-gray-600">{candidate.name} - {candidate.position}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Candidate Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Candidate Profile */}
            <Card className="p-6 bg-white rounded-xl border-0 shadow-md">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  {candidate.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-lg" style={{ color: '#2c3e50' }}>{candidate.name}</h3>
                  <p className="text-sm text-gray-600">{candidate.email}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">{candidate.position}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Award className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">{candidate.experience_years} years experience</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">
                    {new Date(interview.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ background: '#667eea15', color: '#667eea' }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Bio</p>
                <p className="text-sm text-gray-600">{candidate.bio}</p>
              </div>
            </Card>

            {/* Interview Metadata */}
            <Card className="p-6 bg-white rounded-xl border-0 shadow-md">
              <h3 className="font-bold text-lg mb-4" style={{ color: '#2c3e50' }}>Interview Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`font-medium ${interview.status === 'completed' ? 'text-green-600' : 'text-blue-600'}`}>
                    {interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Messages</span>
                  <span className="font-medium text-gray-900">{messages.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-medium text-gray-900">
                    {interview.completed_at 
                      ? Math.round((new Date(interview.completed_at) - new Date(interview.created_at)) / 60000) + ' min'
                      : 'In progress'}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Analysis */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overall Score */}
            <Card className="p-6 bg-white rounded-xl border-0 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold mb-1" style={{ color: '#2c3e50' }}>Overall Assessment</h3>
                  <p className="text-sm text-gray-600">AI-generated evaluation based on interview responses</p>
                </div>
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white mb-2"
                    style={{ background: `linear-gradient(135deg, ${getScoreColor(analysis?.overall_score || 0)} 0%, ${getScoreColor(analysis?.overall_score || 0)}dd 100%)` }}>
                    {analysis?.overall_score || 0}
                  </div>
                  <p className="text-xs text-gray-600">out of 10</p>
                </div>
              </div>
            </Card>

            {/* Skills Breakdown */}
            <Card className="p-6 bg-white rounded-xl border-0 shadow-md">
              <h3 className="text-lg font-bold mb-4" style={{ color: '#2c3e50' }}>Skills Assessment</h3>
              <div className="space-y-4">
                {analysis?.skills_breakdown.map((skill, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4" style={{ color: getScoreColor(skill.score) }} />
                        <span className="font-medium text-gray-900">{skill.skill}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm px-3 py-1 rounded-full" 
                          style={{ background: `${getScoreColor(skill.score)}15`, color: getScoreColor(skill.score) }}>
                          {skill.level}
                        </span>
                        <span className="font-bold text-lg" style={{ color: getScoreColor(skill.score) }}>
                          {skill.score}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${(skill.score / 10) * 100}%`,
                          background: getScoreColor(skill.score)
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Key Insights */}
            {analysis?.key_insights && analysis.key_insights.length > 0 && (
              <Card className="p-6 bg-white rounded-xl border-0 shadow-md">
                <h3 className="text-lg font-bold mb-4" style={{ color: '#2c3e50' }}>Key Insights</h3>
                <ul className="space-y-2">
                  {analysis.key_insights.map((insight, index) => (
                    <li key={index} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-blue-600 mt-1">💡</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6 bg-white rounded-xl border-0 shadow-md">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="font-bold text-lg" style={{ color: '#2c3e50' }}>Strengths</h3>
                </div>
                <ul className="space-y-2">
                  {analysis?.strengths.map((strength, index) => (
                    <li key={index} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-green-600 mt-1">•</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="p-6 bg-white rounded-xl border-0 shadow-md">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                  <h3 className="font-bold text-lg" style={{ color: '#2c3e50' }}>Growth Areas</h3>
                </div>
                <ul className="space-y-2">
                  {analysis?.areas_for_improvement.map((area, index) => (
                    <li key={index} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-orange-600 mt-1">•</span>
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Standout Moments & Red Flags */}
            {(analysis?.standout_moments?.length > 0 || analysis?.red_flags?.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {analysis.standout_moments?.length > 0 && (
                  <Card className="p-6 bg-white rounded-xl border-0 shadow-md">
                    <div className="flex items-center gap-2 mb-4">
                      <Star className="w-5 h-5 text-yellow-500" />
                      <h3 className="font-bold text-lg" style={{ color: '#2c3e50' }}>Standout Moments</h3>
                    </div>
                    <ul className="space-y-2">
                      {analysis.standout_moments.map((moment, index) => (
                        <li key={index} className="flex gap-2 text-sm text-gray-700">
                          <span className="text-yellow-500 mt-1">⭐</span>
                          <span>{moment}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
                
                {analysis?.red_flags?.length > 0 && (
                  <Card className="p-6 bg-white rounded-xl border-0 shadow-md">
                    <div className="flex items-center gap-2 mb-4">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <h3 className="font-bold text-lg" style={{ color: '#2c3e50' }}>Red Flags</h3>
                    </div>
                    <ul className="space-y-2">
                      {analysis.red_flags.map((flag, index) => (
                        <li key={index} className="flex gap-2 text-sm text-gray-700">
                          <span className="text-red-600 mt-1">⚠️</span>
                          <span>{flag}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>
            )}

            {/* Communication & Technical Assessment */}
            {(analysis?.communication_assessment || analysis?.technical_depth || analysis?.problem_solving) && (
              <Card className="p-6 bg-white rounded-xl border-0 shadow-md">
                <h3 className="text-lg font-bold mb-4" style={{ color: '#2c3e50' }}>Detailed Assessment</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {analysis?.communication_assessment && (
                    <div>
                      <p className="font-semibold text-gray-900 mb-2">Communication</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Clarity:</span>
                          <span className="font-medium">{analysis.communication_assessment.clarity_score}/10</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Articulation:</span>
                          <span className="font-medium">{analysis.communication_assessment.articulation_score}/10</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Confidence:</span>
                          <span className="font-medium">{analysis.communication_assessment.confidence_score}/10</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {analysis?.technical_depth && (
                    <div>
                      <p className="font-semibold text-gray-900 mb-2">Technical Depth</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-600">Score:</span>
                          <span className="font-medium">{analysis.technical_depth.score}/10</span>
                        </div>
                        <p className="text-gray-700">{analysis.technical_depth.notes}</p>
                      </div>
                    </div>
                  )}
                  
                  {analysis?.problem_solving && (
                    <div>
                      <p className="font-semibold text-gray-900 mb-2">Problem Solving</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-600">Score:</span>
                          <span className="font-medium">{analysis.problem_solving.score}/10</span>
                        </div>
                        <p className="text-gray-700">{analysis.problem_solving.approach}</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Recommendation */}
            <Card className="p-6 bg-white rounded-xl border-0 shadow-md">
              <h3 className="text-lg font-bold mb-4" style={{ color: '#2c3e50' }}>Hiring Recommendation</h3>
              <div className="flex items-center justify-between p-4 rounded-lg"
                style={{ background: `${getRecommendationColor(analysis?.recommendation)}15` }}>
                <div>
                  <p className="text-2xl font-bold mb-1" style={{ color: getRecommendationColor(analysis?.recommendation) }}>
                    {analysis?.recommendation}
                  </p>
                  <p className="text-sm text-gray-600">Confidence: {analysis?.confidence}%</p>
                </div>
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                  style={{ background: getRecommendationColor(analysis?.recommendation) }}>
                  {analysis?.confidence}%
                </div>
              </div>
            </Card>

            {/* Interview Transcript */}
            <Card className="p-6 bg-white rounded-xl border-0 shadow-md">
              <h3 className="text-lg font-bold mb-4" style={{ color: '#2c3e50' }}>Interview Transcript</h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {messages.map((message, index) => (
                  <div key={index} className={`p-4 rounded-lg ${message.role === 'assistant' ? 'bg-gray-50' : 'bg-blue-50'}`}>
                    <p className="text-xs font-semibold mb-1" style={{ color: message.role === 'assistant' ? '#667eea' : '#3b82f6' }}>
                      {message.role === 'assistant' ? 'AI Interviewer' : 'Candidate'}
                    </p>
                    <p className="text-sm text-gray-800">{message.content}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminInterviewReview;
