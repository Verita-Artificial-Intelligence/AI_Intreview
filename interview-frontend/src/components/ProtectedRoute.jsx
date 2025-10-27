import { Navigate } from 'react-router-dom'
import { useAuth as useClerkAuth } from '@clerk/clerk-react'
import { useAuth } from '../contexts/AuthContext'
import { Loader2 } from 'lucide-react'

/**
 * Protected Route Component
 * Ensures user is authenticated via Clerk and optionally checks for profile completion
 */
const ProtectedRoute = ({ children, requireProfile = false }) => {
  const { isSignedIn, isLoaded } = useClerkAuth()
  const { isProfileComplete, loading: profileLoading } = useAuth()

  // Show loading while Clerk is loading or profile is being checked
  if (!isLoaded || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-neutral-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated - redirect to login
  if (!isSignedIn) {
    return <Navigate to="/login" replace />
  }

  // Profile required but not completed - redirect to onboarding
  if (requireProfile && !isProfileComplete) {
    return <Navigate to="/onboarding" replace />
  }

  return children
}

export default ProtectedRoute
