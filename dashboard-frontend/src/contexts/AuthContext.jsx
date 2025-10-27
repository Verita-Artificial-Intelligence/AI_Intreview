import { createContext, useContext, useState, useEffect } from 'react'
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react'
import api, { initializeApiClient, API_BASE_URL } from '../utils/api'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const { user: clerkUser, isSignedIn, isLoaded } = useUser()
  const { getToken, signOut } = useClerkAuth()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Initialize API client with Clerk getToken function
  useEffect(() => {
    if (getToken) {
      initializeApiClient(getToken)
    }
  }, [getToken])

  // Fetch admin user profile when Clerk user is available AND getToken is ready
  useEffect(() => {
    if (isLoaded && isSignedIn && getToken) {
      fetchUserProfile()
    } else if (isLoaded && !isSignedIn) {
      setLoading(false)
    }
  }, [isLoaded, isSignedIn, getToken])

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/admin/profile')
      setUser(response.data)
    } catch (error) {
      console.error('❌ Error fetching admin profile:', error)
      console.error('Response data:', error.response?.data)
      console.error('Response status:', error.response?.status)
      // Don't auto-logout on 401 - let user see the error
      // Only logout if Clerk session is actually invalid
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setUser(null)
    await signOut()
  }

  const value = {
    user,
    clerkUser,
    loading,
    logout,
    fetchUserProfile,
    getToken,
    isAuthenticated: isSignedIn,
    isAdmin: true, // All dashboard users are admins
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
