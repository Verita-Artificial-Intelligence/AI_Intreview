import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * Protected Route Component
 * Ensures user is authenticated and optionally checks for role and profile completion
 */
const ProtectedRoute = ({
  children,
  requireRole = null,
  requireProfile = false,
}) => {
  const { isAuthenticated, role, isProfileComplete, loading } = useAuth()

  // Show nothing while loading (prevents flash of login page)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-neutral-600">Loading...</div>
      </div>
    )
  }

  // Not authenticated - redirect to appropriate login
  if (!isAuthenticated) {
    const loginPath =
      requireRole === 'admin' ? '/admin/login' : '/candidate/login'
    return <Navigate to={loginPath} replace />
  }

  // Role check - redirect to appropriate home if wrong role
  if (requireRole && role !== requireRole) {
    const homePath = role === 'admin' ? '/' : '/candidate/portal'
    return <Navigate to={homePath} replace />
  }

  // Profile required but not completed - redirect to profile setup (only for candidates)
  if (requireProfile && !isProfileComplete && role === 'candidate') {
    return <Navigate to="/candidate/profile-setup" replace />
  }

  return children
}

export default ProtectedRoute
