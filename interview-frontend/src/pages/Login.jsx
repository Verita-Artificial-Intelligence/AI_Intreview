import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SignIn, useAuth } from '@clerk/clerk-react'
import { Loader2 } from 'lucide-react'

const Login = () => {
  const navigate = useNavigate()
  const { isSignedIn, isLoaded } = useAuth()

  // Redirect if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Clerk will handle redirect to afterSignInUrl (/onboarding)
      // which will then redirect to home if profile is complete
      navigate('/onboarding')
    }
  }, [isSignedIn, isLoaded, navigate])

  // Show loading state while Clerk is loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-neutral-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="/images/verita_ai_logo.jpeg"
              alt="Verita"
              className="w-16 h-16 rounded-lg object-cover"
            />
          </div>
          <h1 className="text-2xl font-display font-bold mb-3 text-neutral-900">
            Verita
          </h1>
          <p className="text-sm text-neutral-600">Welcome Back</p>
        </div>

        <div className="flex justify-center">
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/signup"
            afterSignInUrl="/onboarding"
            appearance={{
              elements: {
                rootBox: 'mx-auto',
                card: 'shadow-xl border border-neutral-100 rounded-xl',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                socialButtonsBlockButton:
                  'border-neutral-300 hover:bg-neutral-50',
                formButtonPrimary:
                  'bg-brand-500 hover:bg-brand-600 text-white rounded-lg',
                formFieldInput:
                  'rounded-lg border-neutral-300 focus:border-brand-500 focus:ring-brand-200',
                footerActionLink: 'text-brand-500 hover:text-brand-600',
              },
            }}
          />
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-neutral-500">Verita</p>
        </div>
      </div>
    </div>
  )
}

export default Login
