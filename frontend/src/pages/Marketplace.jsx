import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Search, Briefcase, Mail, Award } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Marketplace = () => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [interviewType, setInterviewType] = useState('text'); // 'text' or 'audio'
  const [startingInterview, setStartingInterview] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = candidates.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.skills.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredCandidates(filtered);
    } else {
      setFilteredCandidates(candidates);
    }
  }, [searchTerm, candidates]);

  const fetchCandidates = async () => {
    try {
      const response = await axios.get(`${API}/candidates`);
      setCandidates(response.data);
      setFilteredCandidates(response.data);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartInterview = async () => {
    if (!selectedCandidate) return;
    setStartingInterview(true);

    try {
      const response = await axios.post(`${API}/interviews`, {
        candidate_id: selectedCandidate.id
      });
      
      // Navigate to prep page with interview type in state
      navigate(`/interview-prep/${response.data.id}`, { 
        state: { interviewType }
      });
    } catch (error) {
      console.error('Error starting interview:', error);
      alert('Failed to start interview');
    } finally {
      setStartingInterview(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#fafafa' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#2c3e50' }}>Candidate Marketplace</h1>
            <p className="text-sm text-gray-600">Find and interview top talent</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="rounded-lg border-gray-300"
            >
              Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              data-testid="candidate-search-input"
              placeholder="Search by name, position, or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base"
            />
          </div>
        </div>

        {/* Candidates Grid */}
        {loading ? (
          <p className="text-gray-600">Loading candidates...</p>
        ) : filteredCandidates.length === 0 ? (
          <Card className="p-12 text-center bg-white rounded-xl border-0 shadow-md">
            <Search className="w-16 h-16 mx-auto mb-4" style={{ color: '#bbb' }} />
            <p className="text-gray-600 text-lg">No candidates found</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCandidates.map((candidate) => (
              <Card
                key={candidate.id}
                className="p-6 bg-white rounded-xl border-0 shadow-md hover:shadow-xl"
                style={{ transition: 'box-shadow 0.3s' }}
              >
                <div className="mb-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3 text-2xl font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    {candidate.name.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="font-bold text-xl mb-1" style={{ color: '#2c3e50' }}>{candidate.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Briefcase className="w-4 h-4" />
                    <span>{candidate.position}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <Award className="w-4 h-4" />
                    <span>{candidate.experience_years} years experience</span>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-700 line-clamp-2 mb-3">{candidate.bio}</p>
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.slice(0, 4).map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{ background: '#667eea15', color: '#667eea' }}
                      >
                        {skill}
                      </span>
                    ))}
                    {candidate.skills.length > 4 && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: '#f0f0f0', color: '#666' }}>
                        +{candidate.skills.length - 4}
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setSelectedCandidate(candidate);
                    setInterviewType('text');
                    setShowDialog(true);
                  }}
                  data-testid={`start-interview-${candidate.id}`}
                  className="w-full rounded-lg font-medium"
                  style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                >
                  Start AI Interview
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Interview Confirmation Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl" style={{ color: '#2c3e50' }}>
              Start {interviewType === 'audio' ? '🎙️ Voice' : '💬 Text'} Interview
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {interviewType === 'audio' 
                ? "You're about to start a voice-based AI interview. Make sure your microphone is working."
                : "You're about to start a text-based AI interview with this candidate."}
            </DialogDescription>
          </DialogHeader>
          {selectedCandidate && (
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Candidate</p>
                <p className="text-lg font-semibold" style={{ color: '#2c3e50' }}>{selectedCandidate.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Position</p>
                <p className="text-base" style={{ color: '#2c3e50' }}>{selectedCandidate.position}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {selectedCandidate.skills.map((skill, index) => (
                    <span key={index} className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ background: '#667eea15', color: '#667eea' }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Interview Type</p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setInterviewType('text')}
                    variant={interviewType === 'text' ? 'default' : 'outline'}
                    className="flex-1 rounded-lg"
                    style={interviewType === 'text' ? { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' } : {}}
                  >
                    💬 Text Chat
                  </Button>
                  <Button
                    onClick={() => setInterviewType('audio')}
                    variant={interviewType === 'audio' ? 'default' : 'outline'}
                    className="flex-1 rounded-lg"
                    style={interviewType === 'audio' ? { background: 'linear-gradient(135deg, #48dbfb 0%, #0abde3 100%)' } : {}}
                  >
                    🎙️ Voice Call
                  </Button>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowDialog(false)}
                  variant="outline"
                  className="flex-1 rounded-lg"
                  disabled={startingInterview}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStartInterview}
                  data-testid="confirm-start-interview-button"
                  disabled={startingInterview}
                  className="flex-1 rounded-lg font-medium"
                  style={{ 
                    background: interviewType === 'audio'
                      ? 'linear-gradient(135deg, #48dbfb 0%, #0abde3 100%)'
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  }}
                >
                  {startingInterview ? 'Starting...' : 'Start Interview'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Marketplace;