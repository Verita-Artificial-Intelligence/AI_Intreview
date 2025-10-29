import axios from 'axios'

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
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

// Track if we're already handling auth error to prevent loops
let isHandlingAuthError = false

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const errorDetail = error.response?.data?.detail || ''

    // Only redirect on auth errors, and avoid redirect loops
    if ((status === 401 || status === 403) && !isHandlingAuthError) {
      // Check if it's a Clerk instance mismatch (config issue, not expired token)
      const isInstanceMismatch =
        errorDetail.includes('Unable to find a signin key') ||
        errorDetail.includes('Token verification failed')

      if (isInstanceMismatch) {
        console.error('Clerk instance configuration mismatch:', errorDetail)
        console.error(
          'Frontend and backend are using different Clerk instances.'
        )
        console.error(
          'Please check your REACT_APP_CLERK_PUBLISHABLE_KEY and backend CLERK_CANDIDATE_* environment variables.'
        )
        // Don't auto-logout for config errors, just show in console
        return Promise.reject(error)
      }

      // Token expired or invalid - sign out and redirect to login
      console.error('Authentication error - please sign in again')
      isHandlingAuthError = true

      if (clerkSignOut) {
        try {
          await clerkSignOut()
          // Use window.location.replace to avoid adding to history
          window.location.replace('/login')
        } catch (signOutError) {
          console.error('Error signing out:', signOutError)
          window.location.replace('/login')
        }
      } else {
        window.location.replace('/login')
      }
    }
    return Promise.reject(error)
  }
)

export default api
