import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import '@/App.css'

// Admin auth
import Login from './pages/Login'
import Signup from './pages/Signup'

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
import AdminDataExplorer from './pages/AdminDataExplorer'

// Candidate pages
import CandidateLogin from './pages/Candidate/Login'
import CandidateSignup from './pages/Candidate/Signup'
import ProfileSetup from './pages/Candidate/ProfileSetup'
import CandidatePortal from './pages/Candidate/CandidatePortal'
import Opportunities from './pages/Candidate/Opportunities'
import MyAnnotationTasks from './pages/Candidate/MyAnnotationTasks'
import AnnotateTask from './pages/Candidate/AnnotateTask'

// Error pages
import NotFound from './pages/NotFound'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Admin auth routes - wildcard to handle SSO callbacks */}
          <Route path="/login/*" element={<Login />} />
          <Route path="/signup/*" element={<Signup />} />

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

          {/* Admin routes - all require authentication */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidates"
            element={
              <ProtectedRoute>
                <Candidates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interviews"
            element={
              <ProtectedRoute>
                <Interviews />
              </ProtectedRoute>
            }
          />
          <Route
            path="/jobs"
            element={
              <ProtectedRoute>
                <Jobs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/data-explorer"
            element={
              <ProtectedRoute>
                <AdminDataExplorer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/annotation-data"
            element={
              <ProtectedRoute>
                <AnnotationData />
              </ProtectedRoute>
            }
          />
          <Route
            path="/annotation-data/upload"
            element={
              <ProtectedRoute>
                <UploadAnnotationData />
              </ProtectedRoute>
            }
          />
          <Route
            path="/annotators"
            element={
              <ProtectedRoute>
                <Annotators />
              </ProtectedRoute>
            }
          />
          <Route
            path="/review/:taskId"
            element={
              <ProtectedRoute>
                <ReviewAnnotation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interview-prep/:interviewId"
            element={
              <ProtectedRoute>
                <InterviewPrep />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interview/:interviewId"
            element={
              <ProtectedRoute>
                <InterviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audio-interview/:interviewId"
            element={
              <ProtectedRoute>
                <AudioInterviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/review/:interviewId"
            element={
              <ProtectedRoute>
                <AdminInterviewReview />
              </ProtectedRoute>
            }
          />

          {/* 404 catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
