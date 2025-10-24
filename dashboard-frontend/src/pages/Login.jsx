import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

const Login = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    // Fake login - just wait a bit then redirect
    setTimeout(() => {
      navigate('/')
    }, 500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-3 bg-background">
      <Card className="w-full max-w-xs p-6 bg-surface shadow-xl rounded-xl border-0">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-xl font-bold text-white tracking-wider">V</span>
          </div>
          <h1 className="text-2xl font-display font-bold mb-1 text-neutral-900">
            Admin Login
          </h1>
          <p className="text-sm text-neutral-600">
            Sign in to access the admin dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
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
              placeholder="admin@verita.com"
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
              placeholder="Enter your password"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-8 text-sm font-medium rounded-lg bg-brand-500 hover:bg-brand-600 text-white"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-[10px] text-neutral-500">
            Verita AI Interview Platform - Admin Dashboard
          </p>
        </div>
      </Card>
    </div>
  )
}

export default Login
