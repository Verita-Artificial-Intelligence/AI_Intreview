import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

const Login = () => {
  const navigate = useNavigate()
  const {
    login,
    fetchInterviewStatus,
    isAuthenticated,
    isProfileComplete,
    loading: authLoading,
  } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    const handleRedirect = async () => {
      // Check if profile is complete
      if (!isProfileComplete) {
        navigate('/onboarding')
        return
      }

      // Redirect to marketplace (home page)
      navigate('/')
    }

    // Only redirect if authenticated AND auth state is fully loaded
    if (isAuthenticated && !authLoading) {
      setRedirecting(true)
      handleRedirect()
    }
  }, [isAuthenticated, authLoading, isProfileComplete, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(formData.email, formData.password)
      // handleRedirect will be called via useEffect after login
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password')
      setLoading(false)
    }
  }

  // Show loading state while checking auth or redirecting
  if (authLoading || redirecting) {
    return (
      <div className="min-h-screen flex items-center  justify-center p-4 bg-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-neutral-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center  justify-center p-4 bg-white">
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
          <p className="text-sm text-neutral-600">Welcome Back</p>
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
            <div className="flex items-center justify-between mb-1">
              <Label
                htmlFor="password"
                className="text-xs font-medium text-neutral-700"
              >
                Password
              </Label>
              <a
                href="#"
                className="text-[10px] text-brand-500 hover:text-brand-600"
              >
                Forgot password?
              </a>
            </div>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              className="mt-1 h-8 text-sm rounded-lg border-neutral-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-8 text-sm font-medium rounded-lg bg-brand-500 hover:bg-brand-600 text-white"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-neutral-600">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="text-brand-500 hover:text-brand-600 font-medium"
            >
              Sign up
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}

export default Login
