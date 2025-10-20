import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ProfileSetup from './pages/ProfileSetup'
import Marketplace from './pages/Marketplace'
import NewInterviewPrep from './pages/NewInterviewPrep'
import Interview from './pages/Interview'
import RealtimeInterview from './pages/RealtimeInterview'
import StatusScreen from './pages/StatusScreen'
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
              path="/profile-setup"
              element={
                <ProtectedRoute>
                  <ProfileSetup />
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
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  )
}

export default App
