import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * Protected Route Component
 * Ensures user is authenticated and optionally checks for profile completion
 */
const ProtectedRoute = ({ children, requireProfile = false }) => {
  const { isAuthenticated, isProfileComplete, loading } = useAuth()

  // Show nothing while loading (prevents flash of login page)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-neutral-600">Loading...</div>
      </div>
    )
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Profile required but not completed - redirect to profile setup
  if (requireProfile && !isProfileComplete) {
    return <Navigate to="/profile-setup" replace />
  }

  return children
}

export default ProtectedRoute
