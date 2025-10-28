import axios from 'axios'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
export const API_BASE_URL = `${BACKEND_URL}/api`

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
})

// Store the getToken function reference
let clerkGetToken = null

/**
 * Initialize the API client with Clerk's getToken function
 * This should be called from a component that has access to useAuth() from Clerk
 */
export const initializeApiClient = (getTokenFn) => {
  clerkGetToken = getTokenFn
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
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - Clerk will handle re-authentication
      console.error('Authentication error - please sign in again')
    }
    return Promise.reject(error)
  }
)

export default api
