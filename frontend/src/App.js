import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Marketplace from './pages/Marketplace';
import InterviewPage from './pages/InterviewPage';
import AudioInterviewPage from './pages/AudioInterviewPage';
import InterviewPrep from './pages/InterviewPrep';
import EnhancedInterviewPrep from './pages/EnhancedInterviewPrep';
import AdminInterviewReview from './pages/AdminInterviewReview';
import WatercolorMarketplace from './pages/WatercolorMarketplace';
import '@/App.css';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WatercolorMarketplace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/interview-prep/:interviewId" element={<EnhancedInterviewPrep />} />
          <Route path="/interview/:interviewId" element={<InterviewPage />} />
          <Route path="/audio-interview/:interviewId" element={<AudioInterviewPage />} />
          <Route path="/admin/review/:interviewId" element={<AdminInterviewReview />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;