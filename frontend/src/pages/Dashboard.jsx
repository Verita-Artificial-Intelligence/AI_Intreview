import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, Briefcase, Clock, CheckCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [interviewsRes, candidatesRes] = await Promise.all([
        axios.get(`${API}/interviews`),
        axios.get(`${API}/candidates`)
      ]);
      setInterviews(interviewsRes.data);
      setCandidates(candidatesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    {
      icon: <Users className="w-6 h-6" />,
      label: 'Total Candidates',
      value: candidates.length,
      color: '#667eea'
    },
    {
      icon: <Briefcase className="w-6 h-6" />,
      label: 'Total Interviews',
      value: interviews.length,
      color: '#f093fb'
    },
    {
      icon: <Clock className="w-6 h-6" />,
      label: 'In Progress',
      value: interviews.filter(i => i.status === 'in_progress').length,
      color: '#feca57'
    },
    {
      icon: <CheckCircle className="w-6 h-6" />,
      label: 'Completed',
      value: interviews.filter(i => i.status === 'completed').length,
      color: '#48dbfb'
    }
  ];

  return (
    <div className="min-h-screen" style={{ background: '#fafafa' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#2c3e50' }}>AI Interviewer</h1>
            <p className="text-sm text-gray-600">Welcome back, {user.username}</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/marketplace')}
              data-testid="marketplace-nav-button"
              className="rounded-lg font-medium"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              Browse Candidates
            </Button>
            <Button
              onClick={onLogout}
              variant="outline"
              className="rounded-lg border-gray-300"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="p-6 bg-white rounded-xl border-0 shadow-md hover:shadow-lg" style={{ transition: 'box-shadow 0.3s' }}>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg" style={{ background: `${stat.color}15`, color: stat.color }}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: '#2c3e50' }}>{stat.value}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Recent Interviews */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4" style={{ color: '#2c3e50' }}>Recent Interviews</h2>
          {loading ? (
            <p className="text-gray-600">Loading...</p>
          ) : interviews.length === 0 ? (
            <Card className="p-8 text-center bg-white rounded-xl border-0 shadow-md">
              <Briefcase className="w-12 h-12 mx-auto mb-3" style={{ color: '#bbb' }} />
              <p className="text-gray-600 mb-4">No interviews yet. Start by browsing candidates!</p>
              <Button
                onClick={() => navigate('/marketplace')}
                data-testid="empty-state-marketplace-button"
                className="rounded-lg font-medium"
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              >
                Browse Candidates
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {interviews.slice(0, 6).map((interview) => (
                <Card key={interview.id} className="p-6 bg-white rounded-xl border-0 shadow-md hover:shadow-lg" style={{ transition: 'box-shadow 0.3s' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg" style={{ color: '#2c3e50' }}>{interview.candidate_name}</h3>
                      <p className="text-sm text-gray-600">{interview.position}</p>
                    </div>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: interview.status === 'completed' ? '#48dbfb15' : '#feca5715',
                        color: interview.status === 'completed' ? '#48dbfb' : '#feca57'
                      }}
                    >
                      {interview.status === 'completed' ? 'Completed' : 'In Progress'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    {new Date(interview.created_at).toLocaleDateString()}
                  </p>
                  {interview.status === 'in_progress' && (
                    <Button
                      onClick={() => navigate(`/interview/${interview.id}`)}
                      data-testid={`continue-interview-${interview.id}`}
                      className="w-full rounded-lg font-medium"
                      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                    >
                      Continue Interview
                    </Button>
                  )}
                  {interview.status === 'completed' && interview.summary && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-700 line-clamp-3">{interview.summary}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;