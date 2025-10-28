import axios from 'axios'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
export const API_BASE_URL = `${BACKEND_URL}/api`

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
})

// Store the getToken function reference
let clerkGetToken = null
let clerkSignOut = null

/**
 * Initialize the API client with Clerk's getToken and signOut functions
 * This should be called from a component that has access to useAuth() from Clerk
 */
export const initializeApiClient = (getTokenFn, signOutFn) => {
  clerkGetToken = getTokenFn
  clerkSignOut = signOutFn
}

// Request interceptor to add Clerk token to all requests
api.interceptors.request.use(
  async (config) => {
    if (clerkGetToken) {
      try {
        const token = await clerkGetToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        } else {
          console.warn('Clerk getToken returned null for:', config.url)
        }
      } catch (error) {
        console.error('Error getting Clerk token:', error)
      }
    } else {
      console.warn('clerkGetToken not initialized yet for:', config.url)
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired or invalid - sign out and redirect to login
      console.error('Authentication error - please sign in again')

      if (clerkSignOut) {
        try {
          await clerkSignOut()
          // Redirect to login page after sign out
          window.location.href = '/login'
        } catch (signOutError) {
          console.error('Error signing out:', signOutError)
          // Force redirect even if sign out fails
          window.location.href = '/login'
        }
      } else {
        // If clerkSignOut not available, just redirect
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
