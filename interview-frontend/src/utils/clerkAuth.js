import { useAuth } from '@clerk/clerk-react'

/**
 * Get the current Clerk authentication token
 * @returns {Promise<string|null>} The Clerk session token or null if not authenticated
 */
export const getClerkToken = async (getToken) => {
  try {
    const token = await getToken()
    return token
  } catch (error) {
    console.error('Error getting Clerk token:', error)
    return null
  }
}

/**
 * Hook to get Clerk token getter function
 * @returns {Function} Function to get the Clerk token
 */
export const useClerkToken = () => {
  const { getToken } = useAuth()

  return async () => {
    return await getClerkToken(getToken)
  }
}

/**
 * Get authentication token (backward compatibility helper)
 * Will be used to replace the old getAuthToken function
 */
export const getAuthToken = async (getToken) => {
  return await getClerkToken(getToken)
}
