import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import InterviewPage from './pages/InterviewPage'
import AudioInterviewPage from './pages/AudioInterviewPage'
import InterviewPrep from './pages/InterviewPrep'
import AdminInterviewReview from './pages/AdminInterviewReview'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route
          path="/interview-prep/:interviewId"
          element={<InterviewPrep />}
        />
        <Route path="/interview/:interviewId" element={<InterviewPage />} />
        <Route
          path="/audio-interview/:interviewId"
          element={<AudioInterviewPage />}
        />
        <Route
          path="/admin/review/:interviewId"
          element={<AdminInterviewReview />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
