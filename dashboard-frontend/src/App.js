import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import '@/App.css'

// Admin auth
import Login from './pages/Login'

// Admin pages
import Dashboard from './pages/Dashboard'
import Candidates from './pages/Candidates'
import Interviews from './pages/Interviews'
import Jobs from './pages/Jobs'
import InterviewPage from './pages/InterviewPage'
import AudioInterviewPage from './pages/AudioInterviewPage'
import InterviewPrep from './pages/InterviewPrep'
import AdminInterviewReview from './pages/AdminInterviewReview'
import AnnotationData from './pages/AnnotationData'
import UploadAnnotationData from './pages/UploadAnnotationData'
import Annotators from './pages/Annotators'
import ReviewAnnotation from './pages/ReviewAnnotation'

// Candidate pages
import CandidateLogin from './pages/Candidate/Login'
import CandidateSignup from './pages/Candidate/Signup'
import ProfileSetup from './pages/Candidate/ProfileSetup'
import CandidatePortal from './pages/Candidate/CandidatePortal'
import Opportunities from './pages/Candidate/Opportunities'
import MyAnnotationTasks from './pages/Candidate/MyAnnotationTasks'
import AnnotateTask from './pages/Candidate/AnnotateTask'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Admin auth routes */}
          <Route path="/login" element={<Login />} />

          {/* Public candidate auth routes */}
          <Route path="/candidate/login" element={<CandidateLogin />} />
          <Route path="/candidate/signup" element={<CandidateSignup />} />

          {/* Candidate protected routes - require authentication */}
          <Route
            path="/candidate/profile-setup"
            element={
              <ProtectedRoute requireRole="candidate">
                <ProfileSetup />
              </ProtectedRoute>
            }
          />

          {/* Candidate protected routes - require authentication and profile */}
          <Route
            path="/candidate/portal"
            element={
              <ProtectedRoute requireRole="candidate" requireProfile={true}>
                <CandidatePortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/opportunities"
            element={
              <ProtectedRoute requireRole="candidate" requireProfile={true}>
                <Opportunities />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/annotation-tasks"
            element={
              <ProtectedRoute requireRole="candidate" requireProfile={true}>
                <MyAnnotationTasks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/annotate/:taskId"
            element={
              <ProtectedRoute requireRole="candidate" requireProfile={true}>
                <AnnotateTask />
              </ProtectedRoute>
            }
          />

          {/* Admin routes - existing functionality */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/candidates" element={<Candidates />} />
          <Route path="/interviews" element={<Interviews />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/annotation-data" element={<AnnotationData />} />
          <Route path="/annotation-data/upload" element={<UploadAnnotationData />} />
          <Route path="/annotators" element={<Annotators />} />
          <Route path="/review/:taskId" element={<ReviewAnnotation />} />
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
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
