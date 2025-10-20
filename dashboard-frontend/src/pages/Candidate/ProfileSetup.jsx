import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Card } from '../../components/ui/card'
import { useAuth } from '../../contexts/AuthContext'
import { X, Plus } from 'lucide-react'

const ProfileSetup = () => {
  const navigate = useNavigate()
  const { completeProfile } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    skills: [],
    experience_years: '',
    bio: '',
  })
  const [skillInput, setSkillInput] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, skillInput.trim()],
      })
      setSkillInput('')
    }
  }

  const removeSkill = (skillToRemove) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((s) => s !== skillToRemove),
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.skills.length === 0) {
      setError('Please add at least one skill')
      return
    }

    setLoading(true)

    try {
      await completeProfile({
        ...formData,
        experience_years: parseInt(formData.experience_years),
      })
      // Profile complete - redirect to candidate portal
      navigate('/candidate/portal')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to complete profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-3 bg-background">
      <Card className="w-full max-w-lg p-6 bg-surface shadow-xl rounded-xl border-0">
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold mb-1 text-neutral-900">
            Complete Your Profile
          </h1>
          <p className="text-sm text-neutral-600">
            Tell us about yourself to get started with interviews
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <Label
              htmlFor="name"
              className="text-xs font-medium text-neutral-700"
            >
              Full Name
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              className="mt-1 h-8 text-sm rounded-lg border-neutral-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              placeholder="e.g. Jordan Rivera"
            />
          </div>

          {/* Position */}
          <div>
            <Label
              htmlFor="position"
              className="text-xs font-medium text-neutral-700"
            >
              Position/Role
            </Label>
            <Input
              id="position"
              type="text"
              value={formData.position}
              onChange={(e) =>
                setFormData({ ...formData, position: e.target.value })
              }
              required
              className="mt-1 h-8 text-sm rounded-lg border-neutral-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              placeholder="e.g. Software Engineer, Data Scientist, Designer"
            />
          </div>

          {/* Skills */}
          <div>
            <Label
              htmlFor="skills"
              className="text-xs font-medium text-neutral-700"
            >
              Skills
            </Label>
            <div className="mt-1 flex gap-1.5">
              <Input
                id="skills"
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addSkill()
                  }
                }}
                className="flex-1 h-8 text-sm rounded-lg border-neutral-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                placeholder="e.g. Python, React, Data Analysis, etc."
              />
              <Button
                type="button"
                onClick={addSkill}
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.skills.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {formData.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-brand-50 text-brand-600 border border-brand-200"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="hover:text-brand-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Experience */}
          <div>
            <Label
              htmlFor="experience"
              className="text-xs font-medium text-neutral-700"
            >
              Years of Experience
            </Label>
            <Input
              id="experience"
              type="number"
              min="0"
              max="50"
              value={formData.experience_years}
              onChange={(e) =>
                setFormData({ ...formData, experience_years: e.target.value })
              }
              required
              className="mt-1 h-8 text-sm rounded-lg border-neutral-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              placeholder="5"
            />
          </div>

          {/* Bio */}
          <div>
            <Label
              htmlFor="bio"
              className="text-xs font-medium text-neutral-700"
            >
              Bio / Summary
            </Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) =>
                setFormData({ ...formData, bio: e.target.value })
              }
              required
              rows={3}
              className="mt-1 text-sm rounded-lg border-neutral-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              placeholder="Tell us about your background, notable projects, and the type of work you're most passionate about..."
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
            {loading ? 'Saving Profile...' : 'Continue to Portal'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-xs text-neutral-600">
            Already completed profile?{' '}
            <Link
              to="/candidate/login"
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

export default ProfileSetup
