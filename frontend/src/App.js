import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Marketplace from './pages/Marketplace';
import InterviewPage from './pages/InterviewPage';
import AudioInterviewPage from './pages/AudioInterviewPage';
import InterviewPrep from './pages/InterviewPrep';
import AdminInterviewReview from './pages/AdminInterviewReview';
import '@/App.css';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/interview-prep/:interviewId" element={<InterviewPrep />} />
          <Route path="/interview/:interviewId" element={<InterviewPage />} />
          <Route path="/audio-interview/:interviewId" element={<AudioInterviewPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;