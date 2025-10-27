import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cardStyles } from '@/lib/design-system'
import { Loader2, Video } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/utils/api'

const Interview = () => {
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCompleteInterview = async () => {
    if (!user?.interview_id) {
      setError('No interview found')
      return
    }

    setLoading(true)
    setError('')

    try {
      await api.post(
        `/interviews/${user.interview_id}/complete`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      navigate('/status')
    } catch (err) {
      console.error('Error completing interview:', err)
      setError('Failed to complete interview. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full">
        <Card className={`p-12 text-center ${cardStyles.default}`}>
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-brand-100 flex items-center justify-center">
              <Video className="w-10 h-10 text-brand-600" />
            </div>
            <h1 className="text-3xl font-display font-bold text-neutral-900 mb-3">
              Interview in Progress
            </h1>
            <p className="text-lg text-neutral-600 mb-8">
              This is a placeholder for the interview interface.
            </p>
            <p className="text-sm text-neutral-500 mb-8">
              In the production version, you would see the video interview
              interface here with real-time interaction with the AI interviewer.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Button
            onClick={handleCompleteInterview}
            disabled={loading}
            className="w-full h-14 text-lg font-semibold rounded-lg bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Completing Interview...
              </>
            ) : (
              'Complete Interview'
            )}
          </Button>

          <p className="text-xs text-neutral-500 mt-4">
            Click the button above to mark the interview as complete
          </p>
        </Card>
      </div>
    </div>
  )
}

export default Interview
