import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import '@/index.css'
import App from '@/App'

// Fix React DevTools semver error with React 19
if (!window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.isDisabled) {
  window.__REACT_VERSION__ = '19.0.0'
}

const CLERK_PUBLISHABLE_KEY = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing Clerk Publishable Key. Please add REACT_APP_CLERK_PUBLISHABLE_KEY to your .env file.'
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      signInUrl={process.env.REACT_APP_CLERK_SIGN_IN_URL || '/login'}
      signUpUrl={process.env.REACT_APP_CLERK_SIGN_UP_URL || '/signup'}
      afterSignInUrl={
        process.env.REACT_APP_CLERK_AFTER_SIGN_IN_URL || '/onboarding'
      }
      afterSignUpUrl={
        process.env.REACT_APP_CLERK_AFTER_SIGN_UP_URL || '/onboarding'
      }
    >
      <App />
    </ClerkProvider>
  </React.StrictMode>
)
