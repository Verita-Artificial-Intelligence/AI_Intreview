/**
 * Status Workflow Management System
 *
 * Defines valid status transitions, validation rules, and cascade logic
 * for all entity types in the system.
 */

// ============================================================================
// WORKFLOW DEFINITIONS
// ============================================================================

/**
 * Interview Status Workflow
 * Main status tracking interview progress
 */
export const INTERVIEW_STATUS_WORKFLOW = {
  not_started: {
    label: 'Not Started',
    next: ['in_progress'],
    description: 'Interview has not been started yet',
    color: 'neutral',
  },
  in_progress: {
    label: 'In Progress',
    next: ['completed'],
    description: 'Interview is currently in progress',
    color: 'blue',
  },
  completed: {
    label: 'Completed',
    next: ['under_review'],
    description: 'Interview has been completed',
    color: 'green',
  },
  under_review: {
    label: 'Under Review',
    next: ['approved', 'rejected'],
    description: 'Interview is being reviewed',
    color: 'yellow',
  },
  approved: {
    label: 'Approved',
    next: [],
    description: 'Interview has been approved',
    color: 'green',
    terminal: true,
  },
  rejected: {
    label: 'Rejected',
    next: [],
    description: 'Interview has been rejected',
    color: 'red',
    terminal: true,
  },
}

/**
 * Interview Acceptance Status Workflow
 * Tracks hiring decision
 */
export const ACCEPTANCE_STATUS_WORKFLOW = {
  pending: {
    label: 'Pending',
    next: ['accepted', 'rejected'],
    description: 'Awaiting acceptance decision',
    color: 'neutral',
  },
  accepted: {
    label: 'Accepted',
    next: [],
    description: 'Candidate has been accepted',
    color: 'green',
    terminal: true,
    cascade: ['assignment'], // Creates/activates assignment
  },
  rejected: {
    label: 'Rejected',
    next: [],
    description: 'Candidate has been rejected',
    color: 'red',
    terminal: true,
    cascade: ['assignment'], // Removes assignment
  },
}

/**
 * Job Status Workflow
 */
export const JOB_STATUS_WORKFLOW = {
  pending: {
    label: 'Pending',
    next: ['in_progress'],
    description: 'Job posting is pending',
    color: 'neutral',
  },
  in_progress: {
    label: 'In Progress',
    next: ['completed', 'archived'],
    description: 'Job is actively accepting applications',
    color: 'blue',
  },
  completed: {
    label: 'Completed',
    next: ['archived'],
    description: 'Job has been filled',
    color: 'green',
  },
  archived: {
    label: 'Archived',
    next: [],
    description: 'Job has been archived',
    color: 'neutral',
    terminal: true,
  },
}

/**
 * Project Status Workflow
 */
export const PROJECT_STATUS_WORKFLOW = {
  active: {
    label: 'Active',
    next: ['completed', 'archived'],
    description: 'Project is currently active',
    color: 'green',
  },
  completed: {
    label: 'Completed',
    next: ['archived'],
    description: 'Project has been completed',
    color: 'blue',
    cascade: ['assignment'], // Completes all assignments
  },
  archived: {
    label: 'Archived',
    next: [],
    description: 'Project has been archived',
    color: 'neutral',
    terminal: true,
  },
}

/**
 * Assignment Status Workflow
 */
export const ASSIGNMENT_STATUS_WORKFLOW = {
  active: {
    label: 'Active',
    next: ['completed', 'removed'],
    description: 'Assignment is currently active',
    color: 'green',
  },
  completed: {
    label: 'Completed',
    next: [],
    description: 'Assignment has been completed',
    color: 'blue',
    terminal: true,
  },
  removed: {
    label: 'Removed',
    next: [],
    description: 'Assignment has been removed',
    color: 'red',
    terminal: true,
  },
}

/**
 * Annotation Task Status Workflow
 */
export const ANNOTATION_TASK_STATUS_WORKFLOW = {
  pending: {
    label: 'Pending',
    next: ['assigned'],
    description: 'Task is pending assignment',
    color: 'neutral',
  },
  assigned: {
    label: 'Assigned',
    next: ['in_progress'],
    description: 'Task has been assigned',
    color: 'blue',
  },
  in_progress: {
    label: 'In Progress',
    next: ['completed'],
    description: 'Task is in progress',
    color: 'yellow',
  },
  completed: {
    label: 'Completed',
    next: ['reviewed'],
    description: 'Task has been completed',
    color: 'green',
  },
  reviewed: {
    label: 'Reviewed',
    next: [],
    description: 'Task has been reviewed',
    color: 'green',
    terminal: true,
  },
}

// ============================================================================
// WORKFLOW REGISTRY
// ============================================================================

export const WORKFLOWS = {
  interview: INTERVIEW_STATUS_WORKFLOW,
  acceptance: ACCEPTANCE_STATUS_WORKFLOW,
  job: JOB_STATUS_WORKFLOW,
  project: PROJECT_STATUS_WORKFLOW,
  assignment: ASSIGNMENT_STATUS_WORKFLOW,
  annotationTask: ANNOTATION_TASK_STATUS_WORKFLOW,
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates if a status transition is allowed
 * @param {string} workflowType - Type of workflow (e.g., 'interview', 'job')
 * @param {string} currentStatus - Current status
 * @param {string} newStatus - Proposed new status
 * @returns {Object} { valid: boolean, error: string|null }
 */
export function validateStatusTransition(
  workflowType,
  currentStatus,
  newStatus
) {
  const workflow = WORKFLOWS[workflowType]

  if (!workflow) {
    return {
      valid: false,
      error: `Unknown workflow type: ${workflowType}`,
    }
  }

  const currentState = workflow[currentStatus]
  if (!currentState) {
    return {
      valid: false,
      error: `Invalid current status: ${currentStatus}`,
    }
  }

  const newState = workflow[newStatus]
  if (!newState) {
    return {
      valid: false,
      error: `Invalid new status: ${newStatus}`,
    }
  }

  // Allow staying in the same status
  if (currentStatus === newStatus) {
    return { valid: true, error: null }
  }

  // Check if transition is allowed
  if (!currentState.next.includes(newStatus)) {
    return {
      valid: false,
      error: `Cannot transition from "${currentState.label}" to "${newState.label}"`,
    }
  }

  return { valid: true, error: null }
}

/**
 * Gets all valid next statuses for a given current status
 * @param {string} workflowType - Type of workflow
 * @param {string} currentStatus - Current status
 * @returns {Array} Array of valid next status objects
 */
export function getValidNextStatuses(workflowType, currentStatus) {
  const workflow = WORKFLOWS[workflowType]

  if (!workflow || !workflow[currentStatus]) {
    return []
  }

  const currentState = workflow[currentStatus]

  // Always include current status as an option
  const options = [
    {
      value: currentStatus,
      label: currentState.label,
      description: currentState.description,
      color: currentState.color,
      isCurrent: true,
    },
  ]

  // Add valid next statuses
  currentState.next.forEach((statusKey) => {
    const nextState = workflow[statusKey]
    if (nextState) {
      options.push({
        value: statusKey,
        label: nextState.label,
        description: nextState.description,
        color: nextState.color,
        isCurrent: false,
      })
    }
  })

  return options
}

/**
 * Gets status label for display
 * @param {string} workflowType - Type of workflow
 * @param {string} status - Status value
 * @returns {string} Human-readable label
 */
export function getStatusLabel(workflowType, status) {
  const workflow = WORKFLOWS[workflowType]

  if (!workflow || !workflow[status]) {
    return status
  }

  return workflow[status].label
}

/**
 * Gets status color for styling
 * @param {string} workflowType - Type of workflow
 * @param {string} status - Status value
 * @returns {string} Color key (e.g., 'green', 'blue', 'yellow')
 */
export function getStatusColor(workflowType, status) {
  const workflow = WORKFLOWS[workflowType]

  if (!workflow || !workflow[status]) {
    return 'neutral'
  }

  return workflow[status].color
}

/**
 * Checks if a status is terminal (no further transitions allowed)
 * @param {string} workflowType - Type of workflow
 * @param {string} status - Status value
 * @returns {boolean} True if terminal
 */
export function isTerminalStatus(workflowType, status) {
  const workflow = WORKFLOWS[workflowType]

  if (!workflow || !workflow[status]) {
    return false
  }

  return workflow[status].terminal === true
}

/**
 * Gets entities that will be cascaded when a status changes
 * @param {string} workflowType - Type of workflow
 * @param {string} newStatus - New status being set
 * @returns {Array<string>} Array of entity types that will be affected
 */
export function getCascadeEntities(workflowType, newStatus) {
  const workflow = WORKFLOWS[workflowType]

  if (!workflow || !workflow[newStatus]) {
    return []
  }

  return workflow[newStatus].cascade || []
}

// ============================================================================
// CASCADE LOGIC MAPPING
// ============================================================================

/**
 * Defines what happens when a status changes
 * Format: { workflow: { status: { affectedEntity: action } } }
 */
export const CASCADE_RULES = {
  acceptance: {
    accepted: {
      assignment: 'create_or_activate',
      project: 'notify', // May activate project if it was waiting for annotators
    },
    rejected: {
      assignment: 'remove',
      project: 'notify',
    },
  },
  project: {
    completed: {
      assignment: 'complete_all',
    },
    archived: {
      assignment: 'remove_all',
    },
  },
  job: {
    archived: {
      interview: 'notify', // Notify pending interviews
    },
  },
}

/**
 * Gets the action to take on related entities when a status changes
 * @param {string} workflowType - Type of workflow
 * @param {string} newStatus - New status
 * @param {string} relatedEntityType - Type of related entity
 * @returns {string|null} Action to take (e.g., 'create_or_activate', 'remove')
 */
export function getCascadeAction(workflowType, newStatus, relatedEntityType) {
  const workflowRules = CASCADE_RULES[workflowType]
  if (!workflowRules) return null

  const statusRules = workflowRules[newStatus]
  if (!statusRules) return null

  return statusRules[relatedEntityType] || null
}

// ============================================================================
// UI HELPERS
// ============================================================================

/**
 * Gets CSS classes for status badges based on color
 * @param {string} color - Color key from workflow
 * @returns {string} Tailwind CSS classes
 */
export function getStatusBadgeClasses(color) {
  const colorMap = {
    green: 'bg-green-50 text-green-600 border-green-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    neutral: 'bg-neutral-100 text-neutral-600 border-neutral-300',
  }

  return colorMap[color] || colorMap.neutral
}

/**
 * Formats a status change notification message
 * @param {string} entityType - Type of entity (e.g., 'Interview')
 * @param {string} workflowType - Type of workflow
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 * @param {Array} cascadedChanges - Array of cascaded changes { entityType, action }
 * @returns {string} Formatted message
 */
export function formatStatusChangeMessage(
  entityType,
  workflowType,
  oldStatus,
  newStatus,
  cascadedChanges = []
) {
  const oldLabel = getStatusLabel(workflowType, oldStatus)
  const newLabel = getStatusLabel(workflowType, newStatus)

  let message = `${entityType} status updated from "${oldLabel}" to "${newLabel}"`

  if (cascadedChanges.length > 0) {
    const cascadeDescriptions = cascadedChanges.map((change) => {
      return `${change.entityType} ${change.action}`
    })
    message += `. Also updated: ${cascadeDescriptions.join(', ')}`
  }

  return message
}
