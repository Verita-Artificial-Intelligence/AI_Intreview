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
  const [interviewStatus, setInterviewStatus] = useState(null)

  // Initialize API client with Clerk getToken and signOut functions
  useEffect(() => {
    if (getToken && signOut) {
      initializeApiClient(getToken, signOut)
    }
  }, [getToken, signOut])

  // Fetch user profile when Clerk user is available AND getToken is ready
  useEffect(() => {
    if (isLoaded && isSignedIn && getToken) {
      fetchUserProfile()
    } else if (isLoaded && !isSignedIn) {
      setLoading(false)
    }
  }, [isLoaded, isSignedIn, getToken])

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/profile/me')
      setUser(response.data)
    } catch (error) {
      console.error('❌ Error fetching user profile:', error)
      console.error('Response data:', error.response?.data)
      console.error('Response status:', error.response?.status)
      // Don't auto-logout on 401 - let user see the error
      // Only logout if Clerk session is actually invalid
    } finally {
      setLoading(false)
    }
  }

  const fetchInterviewStatus = async () => {
    if (!isSignedIn) return null

    try {
      const response = await api.get('/profile/interview-status')
      setInterviewStatus(response.data)
      return response.data
    } catch (error) {
      console.error('Error fetching interview status:', error)
      return null
    }
  }

  const completeProfile = async (profileData) => {
    try {
      const response = await api.put('/profile/complete', profileData)
      // Immediately set the user from the response
      setUser(response.data)

      // Fetch the user profile again to ensure backend state is synchronized
      // This guarantees that profile_completed is properly set
      await fetchUserProfile()

      return response.data
    } catch (error) {
      console.error('Error completing profile:', error)
      throw error
    }
  }

  const logout = async () => {
    setUser(null)
    setInterviewStatus(null)
    await signOut()
  }

  const value = {
    user,
    clerkUser,
    loading,
    interviewStatus,
    logout,
    completeProfile,
    fetchInterviewStatus,
    fetchUserProfile,
    getToken,
    isAuthenticated: isSignedIn,
    isProfileComplete: user?.profile_completed || false,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
