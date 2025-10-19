import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API = `${BACKEND_URL}/api`

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)
  const [interviewStatus, setInterviewStatus] = useState(null)

  // Fetch user profile on mount if token exists
  useEffect(() => {
    if (token) {
      fetchUserProfile()
    } else {
      setLoading(false)
    }
  }, [token])

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setUser(response.data)
    } catch (error) {
      console.error('Error fetching user profile:', error)
      logout()
    } finally {
      setLoading(false)
    }
  }

  const fetchInterviewStatus = async () => {
    if (!token) return null

    try {
      const response = await axios.get(`${API}/profile/interview-status`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setInterviewStatus(response.data)
      return response.data
    } catch (error) {
      console.error('Error fetching interview status:', error)
      return null
    }
  }

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, {
      email,
      password,
    })

    const { token: newToken, user: userData } = response.data
    localStorage.setItem('token', newToken)
    setToken(newToken)
    setUser(userData)

    return userData
  }

  const signup = async (email, password) => {
    const response = await axios.post(`${API}/auth/register`, {
      email,
      password,
    })

    const { token: newToken, user: userData } = response.data
    localStorage.setItem('token', newToken)
    setToken(newToken)
    setUser(userData)

    return userData
  }

  const completeProfile = async (profileData) => {
    const response = await axios.put(`${API}/profile/complete`, profileData, {
      headers: { Authorization: `Bearer ${token}` },
    })

    setUser(response.data)
    return response.data
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    setInterviewStatus(null)
  }

  const value = {
    user,
    token,
    loading,
    interviewStatus,
    login,
    signup,
    logout,
    completeProfile,
    fetchInterviewStatus,
    isAuthenticated: !!token,
    isProfileComplete: user?.profile_completed || false,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
