import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Badge } from '../ui/badge'
import {
  getValidNextStatuses,
  getStatusLabel,
  getStatusBadgeClasses,
  isTerminalStatus,
} from '../../lib/statusWorkflows'
import { Loader2, AlertCircle } from 'lucide-react'

/**
 * Status dropdown with workflow validation
 *
 * Only shows valid next statuses based on current status and workflow rules.
 * Displays status with appropriate styling and handles updates.
 */
export function StatusSelect({
  workflowType,
  currentStatus,
  onChange,
  disabled = false,
  className = '',
}) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState(null)

  // Get valid next statuses based on workflow
  const validStatuses = getValidNextStatuses(workflowType, currentStatus)
  const currentLabel = getStatusLabel(workflowType, currentStatus)
  const isTerminal = isTerminalStatus(workflowType, currentStatus)

  const handleStatusChange = async (newStatus) => {
    if (newStatus === currentStatus) return

    try {
      setIsUpdating(true)
      setError(null)
      await onChange(newStatus)
    } catch (err) {
      setError(err.message || 'Failed to update status')
      console.error('Status update error:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  // If terminal status, show as read-only badge
  if (isTerminal && validStatuses.length === 1) {
    return (
      <div className={className}>
        <StatusBadge workflowType={workflowType} status={currentStatus} />
        {error && <ErrorMessage message={error} />}
      </div>
    )
  }

  return (
    <div className={className}>
      <Select
        value={currentStatus}
        onValueChange={handleStatusChange}
        disabled={disabled || isUpdating || validStatuses.length === 0}
      >
        <SelectTrigger className="w-full sm:w-[200px]">
          <div className="flex items-center gap-2">
            {isUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
            <SelectValue>
              <StatusBadge
                workflowType={workflowType}
                status={currentStatus}
                inline
              />
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          {validStatuses.map((status) => (
            <SelectItem key={status.value} value={status.value}>
              <div className="flex flex-col gap-1 py-1">
                <div className="flex items-center gap-2">
                  <StatusBadge
                    workflowType={workflowType}
                    status={status.value}
                    inline
                  />
                  {status.isCurrent && (
                    <span className="text-xs text-neutral-500">(current)</span>
                  )}
                </div>
                {status.description && (
                  <span className="text-xs text-neutral-500">
                    {status.description}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <ErrorMessage message={error} />}
    </div>
  )
}

/**
 * Status badge component with workflow-based styling
 */
export function StatusBadge({
  workflowType,
  status,
  inline = false,
  className = '',
}) {
  const label = getStatusLabel(workflowType, status)
  const badgeClasses = getStatusBadgeClasses(
    require('../../lib/statusWorkflows').getStatusColor(workflowType, status)
  )

  if (inline) {
    return <span className={`text-sm ${className}`}>{label}</span>
  }

  return (
    <Badge variant="outline" className={`${badgeClasses} ${className}`}>
      {label}
    </Badge>
  )
}

/**
 * Dual status selector for interviews (status + acceptance status)
 */
export function DualStatusSelect({
  interviewStatus,
  acceptanceStatus,
  onInterviewStatusChange,
  onAcceptanceStatusChange,
  disabled = false,
  className = '',
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <label className="text-xs font-medium text-neutral-500 mb-1 block">
          Interview Status
        </label>
        <StatusSelect
          workflowType="interview"
          currentStatus={interviewStatus}
          onChange={onInterviewStatusChange}
          disabled={disabled}
        />
      </div>
      <div>
        <label className="text-xs font-medium text-neutral-500 mb-1 block">
          Acceptance Decision
        </label>
        <StatusSelect
          workflowType="acceptance"
          currentStatus={acceptanceStatus}
          onChange={onAcceptanceStatusChange}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

/**
 * Error message component
 */
function ErrorMessage({ message }) {
  return (
    <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
      <AlertCircle className="h-4 w-4" />
      <span>{message}</span>
    </div>
  )
}
