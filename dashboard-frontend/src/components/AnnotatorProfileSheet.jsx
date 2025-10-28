import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/utils/api'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Mail,
  Award,
  Calendar,
  Briefcase,
  ExternalLink,
  Users,
  FileText,
  AlertCircle,
} from 'lucide-react'

export default function AnnotatorProfileSheet({
  open,
  onOpenChange,
  candidateId,
}) {
  const navigate = useNavigate()
  const [annotator, setAnnotator] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open && candidateId) {
      fetchAnnotatorProfile()
    }
  }, [open, candidateId])

  const fetchAnnotatorProfile = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/candidates/${candidateId}`)
      setAnnotator(response.data)
    } catch (error) {
      console.error('Error fetching annotator profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase()
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const renderScore = (score, passStatus) => {
    if (score !== null && score !== undefined) {
      const isPassing = passStatus === 'pass'
      return (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-900">{score}</span>
          <Badge
            className={
              isPassing
                ? 'bg-green-100 text-green-800 hover:bg-green-100'
                : 'bg-red-100 text-red-800 hover:bg-red-100'
            }
          >
            {isPassing ? 'Pass' : 'Fail'}
          </Badge>
        </div>
      )
    }
    return <span className="text-sm text-gray-400">-</span>
  }

  if (!open) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-neutral-50">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-gray-600">
              Loading annotator profile...
            </p>
          </div>
        ) : annotator ? (
          <>
            <SheetHeader className="mb-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-lg flex items-center justify-center text-lg font-bold text-neutral-900 bg-brand-200 flex-shrink-0">
                  {getInitials(annotator.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-2xl font-semibold mb-1">
                    {annotator.name}
                  </SheetTitle>
                  <SheetDescription className="text-sm text-neutral-600 flex items-center gap-1">
                    <Briefcase className="w-4 h-4" />
                    {annotator.position}
                  </SheetDescription>
                  <div className="flex items-center gap-2 text-sm text-neutral-600 mt-1">
                    <Mail className="w-4 h-4" />
                    <span>{annotator.email}</span>
                  </div>
                </div>
              </div>
            </SheetHeader>

            {/* Experience & Skills */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 text-neutral-600 mb-1">
                  <Award className="w-4 h-4" />
                  <span className="text-xs font-medium">Experience</span>
                </div>
                <p className="text-sm font-semibold text-neutral-900">
                  {annotator.experience_years} years
                </p>
              </Card>
              <Card className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 text-neutral-600 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-medium">Joined</span>
                </div>
                <p className="text-sm font-semibold text-neutral-900">
                  {formatDate(annotator.created_at)}
                </p>
              </Card>
            </div>

            {/* Skills */}
            {annotator.skills && annotator.skills.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-neutral-900 mb-3">
                  Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {annotator.skills.map((skill, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="text-xs bg-neutral-100 text-neutral-700 hover:bg-neutral-100"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Bio */}
            {annotator.bio && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-neutral-900 mb-3">
                  Bio
                </h3>
                <Card className="p-4 border border-gray-200 rounded-lg bg-neutral-50">
                  <p className="text-sm text-neutral-700 whitespace-pre-wrap">
                    {annotator.bio}
                  </p>
                </Card>
              </div>
            )}

            {/* Interview Info */}
            {annotator.last_interview && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-neutral-900 mb-3">
                  Interview Information
                </h3>
                <div className="space-y-3">
                  <Card className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-neutral-600 mb-1">
                          <FileText className="w-4 h-4" />
                          <span className="text-xs font-medium">
                            Last Interview
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-neutral-900">
                          {annotator.last_interview.job_title}
                        </p>
                        <p className="text-xs text-neutral-600">
                          {formatDate(annotator.last_interview.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        {annotator.last_interview.score !== null ? (
                          renderScore(
                            annotator.last_interview.score,
                            annotator.last_interview.pass_status
                          )
                        ) : (
                          <span className="text-xs text-neutral-500">
                            No score
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button
                onClick={() => {
                  navigate(`/pipeline?candidate=${candidateId}`)
                  onOpenChange(false)
                }}
                className="flex-1 rounded-lg"
              >
                <Users className="w-4 h-4 mr-2" />
                View All Interviews
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigate(`/annotators`)
                  onOpenChange(false)
                }}
                className="flex-1 rounded-lg"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View All Annotators
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-600">Annotator not found</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
