import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

const Signup = () => {
  const navigate = useNavigate()
  const {
    signup,
    isAuthenticated,
    isProfileComplete,
    loading: authLoading,
  } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    // Only redirect if authenticated AND auth state is fully loaded
    if (isAuthenticated && !authLoading) {
      if (isProfileComplete) {
        navigate('/')
      } else {
        navigate('/onboarding')
      }
    }
  }, [isAuthenticated, isProfileComplete, authLoading, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await signup(formData.email, formData.password)
      // After successful signup, redirect to onboarding
      navigate('/onboarding')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create account')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white">
      <Card className="w-full max-w-md py-12 px-8 border border-neutral-100 bg-surface shadow-xl rounded-xl ">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <img
              src="/images/verita_ai_logo.jpeg"
              alt="Verita AI"
              className="w-16 h-16 rounded-lg object-cover"
            />
          </div>
          <h1 className="text-2xl font-display font-bold mb-3 text-neutral-900">
            Verita AI
          </h1>
          <p className="text-sm text-neutral-600">
            Human data for multimodal intelligence
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label
              htmlFor="email"
              className="text-xs font-medium text-neutral-700"
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              className="mt-1 h-8 text-sm rounded-lg border-neutral-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <Label
              htmlFor="password"
              className="text-xs font-medium text-neutral-700"
            >
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              className="mt-1 h-8 text-sm rounded-lg border-neutral-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              placeholder="Create a strong password"
              minLength={6}
            />
          </div>

          {error && (
            <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-8 text-sm font-medium rounded-lg bg-brand-500 hover:bg-brand-600 text-white"
          >
            {submitting ? 'Creating Account...' : 'Sign Up'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-neutral-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-brand-500 hover:text-brand-600 font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}

export default Signup
