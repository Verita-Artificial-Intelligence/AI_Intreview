import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Onboarding from './pages/Onboarding'
import JobApplicationOnboarding from './pages/JobApplicationOnboarding'
import Marketplace from './pages/Marketplace'
import Jobs from './pages/Jobs'
import Annotate from './pages/Annotate'
import Earnings from './pages/Earnings'
import Profile from './pages/Profile'
import NewInterviewPrep from './pages/NewInterviewPrep'
import Interview from './pages/Interview'
import RealtimeInterview from './pages/RealtimeInterview'
import StatusScreen from './pages/StatusScreen'
import NotFound from './pages/NotFound'
import '@/App.css'

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />

            {/* Protected routes - require authentication */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />
            <Route
              path="/job-application-onboarding"
              element={
                <ProtectedRoute>
                  <JobApplicationOnboarding />
                </ProtectedRoute>
              }
            />

            {/* Protected routes - require authentication and profile completion */}
            {/* Marketplace is the home page */}
            <Route
              path="/"
              element={
                <ProtectedRoute requireProfile={true}>
                  <Marketplace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/interview-prep"
              element={
                <ProtectedRoute requireProfile={true}>
                  <NewInterviewPrep />
                </ProtectedRoute>
              }
            />
            <Route
              path="/interview"
              element={
                <ProtectedRoute requireProfile={true}>
                  <Interview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/realtime-interview/:interviewId"
              element={
                <ProtectedRoute requireProfile={true}>
                  <RealtimeInterview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/status"
              element={
                <ProtectedRoute requireProfile={true}>
                  <StatusScreen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs"
              element={
                <ProtectedRoute requireProfile={true}>
                  <Jobs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/annotate/:taskId"
              element={
                <ProtectedRoute requireProfile={true}>
                  <Annotate />
                </ProtectedRoute>
              }
            />
            <Route
              path="/earnings"
              element={
                <ProtectedRoute requireProfile={true}>
                  <Earnings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute requireProfile={true}>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* 404 catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  )
}

export default App
