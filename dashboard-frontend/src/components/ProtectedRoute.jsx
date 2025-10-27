import { Navigate } from 'react-router-dom'
import { useAuth as useClerkAuth } from '@clerk/clerk-react'
import { Loader2 } from 'lucide-react'

/**
 * Protected Route Component
 * Ensures user is authenticated via Clerk (all dashboard users are admins)
 */
const ProtectedRoute = ({ children }) => {
  const { isSignedIn, isLoaded } = useClerkAuth()

  // Show loading while Clerk is loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
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

  return children
}

export default ProtectedRoute
