import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Mail, User, AlertCircle } from 'lucide-react'
import api from '@/utils/api'

const EmailPreviewModal = ({
  open,
  onClose,
  projectId,
  assignments,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    if (open && projectId && assignments?.length > 0) {
      fetchPreview()
    } else {
      setPreview(null)
      setError(null)
    }
  }, [open, projectId, assignments])

  const fetchPreview = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await api.post(
        `/projects/${projectId}/assignments/preview`,
        { assignments }
      )
      setPreview(response.data)
    } catch (err) {
      console.error('Error fetching email preview:', err)
      const errorDetail = err.response?.data?.detail
      // Handle both string and object error formats
      const errorMessage =
        typeof errorDetail === 'string'
          ? errorDetail
          : Array.isArray(errorDetail)
            ? errorDetail.map((e) => e.msg).join(', ')
            : 'Failed to load preview'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    onConfirm()
  }

  const recipientCount = preview?.recipients?.length || assignments?.length || 0

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Mail className="h-5 w-5 text-brand-600" />
            Send assignment emails to {recipientCount}{' '}
            {recipientCount === 1 ? 'person' : 'people'}
          </DialogTitle>
          <DialogDescription>
            Preview the notification email that will be sent to the selected
            candidates
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-neutral-500">Loading preview...</div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && preview && (
          <div className="flex flex-col gap-4 overflow-y-auto flex-1 min-h-0">
            {/* Project Name */}
            <div className="pb-2 border-b border-neutral-200">
              <div className="text-sm font-medium text-neutral-700">
                Project
              </div>
              <div className="text-base font-semibold text-neutral-900 mt-1">
                {preview.project_name}
              </div>
            </div>

            {/* Recipients List */}
            <div>
              <div className="text-sm font-medium text-neutral-700 mb-2">
                Recipients ({preview.recipients.length})
              </div>
              <div className="max-h-32 overflow-y-auto bg-neutral-50 rounded-lg p-3 space-y-2">
                {preview.recipients.map((recipient, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <User className="h-4 w-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-neutral-900">
                        {recipient.name}
                      </div>
                      <div className="text-neutral-600 truncate">
                        {recipient.email}
                      </div>
                      {recipient.role && (
                        <div className="text-xs text-neutral-500 mt-0.5">
                          Role: {recipient.role}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Email Preview */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-neutral-700">
                  Email Preview
                </div>
                {preview.recipients.length > 1 && (
                  <div className="text-xs text-neutral-500 italic">
                    Each person receives a personalized version
                  </div>
                )}
              </div>
              <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                {/* Email Subject */}
                <div className="mb-3 pb-3 border-b border-neutral-200">
                  <div className="text-xs font-medium text-neutral-500 uppercase mb-1">
                    Subject
                  </div>
                  <div className="font-semibold text-neutral-900">
                    {preview.email_subject}
                  </div>
                </div>

                {/* Email Body */}
                <div>
                  <div className="text-xs font-medium text-neutral-500 uppercase mb-2">
                    Message
                  </div>
                  <div className="text-sm text-neutral-700 whitespace-pre-wrap font-mono bg-white p-3 rounded border border-neutral-200 max-h-64 overflow-y-auto">
                    {preview.email_body}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || error || !preview}
            className="bg-brand-600 hover:bg-brand-700 text-white"
          >
            <Mail className="h-4 w-4 mr-2" />
            Send to {recipientCount}{' '}
            {recipientCount === 1 ? 'person' : 'people'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EmailPreviewModal
