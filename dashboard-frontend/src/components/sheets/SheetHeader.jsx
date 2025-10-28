import { Button } from '../ui/button'
import { StatusSelect, StatusBadge } from './StatusSelect'
import { X } from 'lucide-react'

/**
 * Standardized header for entity detail sheets
 *
 * Displays entity title, avatar, status management, and action buttons
 */
export function SheetHeader({
  title,
  subtitle,
  avatar,
  avatarFallback,
  status,
  workflowType,
  onStatusChange,
  actions = [],
  onClose,
  className = '',
}) {
  return (
    <div className={`mb-6 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        {/* Left: Avatar + Title */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {(avatar || avatarFallback) && (
            <EntityAvatar avatar={avatar} fallback={avatarFallback} />
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-neutral-900 truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-neutral-600 mt-1">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right: Close Button */}
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Status Management */}
      {status && workflowType && (
        <div className="mt-4">
          {onStatusChange ? (
            <StatusSelect
              workflowType={workflowType}
              currentStatus={status}
              onChange={onStatusChange}
            />
          ) : (
            <StatusBadge workflowType={workflowType} status={status} />
          )}
        </div>
      )}

      {/* Action Buttons */}
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'outline'}
              size={action.size || 'sm'}
              onClick={action.onClick}
              disabled={action.disabled}
              className={action.className}
            >
              {action.icon && <action.icon className="h-4 w-4 mr-2" />}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Entity avatar with colored background and initials
 */
function EntityAvatar({ avatar, fallback }) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt="Avatar"
        className="w-16 h-16 rounded-full object-cover flex-shrink-0"
      />
    )
  }

  if (fallback) {
    // Generate a color based on the first character
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-yellow-500',
      'bg-indigo-500',
    ]
    const colorIndex = fallback.charCodeAt(0) % colors.length
    const bgColor = colors[colorIndex]

    return (
      <div
        className={`w-16 h-16 rounded-full ${bgColor} flex items-center justify-center text-white text-xl font-semibold flex-shrink-0`}
      >
        {fallback}
      </div>
    )
  }

  return null
}

/**
 * Simple header variant for edit mode
 */
export function SheetEditHeader({
  title,
  subtitle,
  currentStep,
  totalSteps,
  onClose,
  onCancel,
  onSave,
  isSaving = false,
  className = '',
}) {
  return (
    <div className={`mb-6 ${className}`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
          {subtitle && (
            <p className="text-sm text-neutral-600 mt-1">{subtitle}</p>
          )}
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Progress indicator for multi-step forms */}
      {currentStep !== undefined &&
        totalSteps !== undefined &&
        totalSteps > 1 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-neutral-600 mb-2">
              <span>
                Step {currentStep} of {totalSteps}
              </span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div
                className="bg-brand-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        )}

      {/* Action buttons for edit mode */}
      {(onCancel || onSave) && (
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
          )}
          {onSave && (
            <Button onClick={onSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
