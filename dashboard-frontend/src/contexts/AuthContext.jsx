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
  const [role, setRole] = useState(localStorage.getItem('role') || 'candidate')
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
      const endpoint = role === 'admin' ? `${API}/admin/profile` : `${API}/profile/me`
      const response = await axios.get(endpoint, {
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
    if (!token || role === 'admin') return null

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

  const login = async (email, password, userRole = 'candidate') => {
    const endpoint = userRole === 'admin' ? `${API}/admin/login` : `${API}/auth/login`
    const response = await axios.post(endpoint, {
      email,
      password,
    })

    const { token: newToken, user: userData } = response.data
    localStorage.setItem('token', newToken)
    localStorage.setItem('role', userRole)
    setToken(newToken)
    setRole(userRole)
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
    localStorage.setItem('role', 'candidate')
    setToken(newToken)
    setRole('candidate')
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
    localStorage.removeItem('role')
    setToken(null)
    setRole('candidate')
    setUser(null)
    setInterviewStatus(null)
  }

  const value = {
    user,
    token,
    role,
    loading,
    interviewStatus,
    login,
    signup,
    logout,
    completeProfile,
    fetchInterviewStatus,
    isAuthenticated: !!token,
    isAdmin: role === 'admin',
    isCandidate: role === 'candidate',
    isProfileComplete: user?.profile_completed || false,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
