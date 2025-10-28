/**
 * Configurable Section Architecture for Entity Detail Sheets
 *
 * This system allows easy addition/removal of sections in slide-over panels
 * and supports conditional rendering based on data availability.
 */

// ============================================================================
// SECTION DEFINITIONS
// ============================================================================

/**
 * Annotator/Candidate Profile Sections
 */
export const ANNOTATOR_SECTIONS = [
  {
    id: 'core-identity',
    title: 'Core Identity & Portfolio',
    enabled: true,
    alwaysShow: true,
    dataCheck: (entity) => true, // Always show basic info
    priority: 1,
  },
  {
    id: 'skills-experience',
    title: 'Skills & Experience',
    enabled: true,
    alwaysShow: false,
    dataCheck: (entity) =>
      entity?.skills?.length > 0 || entity?.experience_years,
    priority: 2,
  },
  {
    id: 'portfolio',
    title: 'Portfolio & Background',
    enabled: true,
    alwaysShow: false,
    dataCheck: (entity) =>
      entity?.education ||
      entity?.work_experience ||
      entity?.projects ||
      entity?.resume_url,
    priority: 3,
  },
  {
    id: 'interview-summary',
    title: 'Interview Summary',
    enabled: true,
    alwaysShow: false,
    dataCheck: (entity) => entity?.interview_id || entity?.summary,
    priority: 4,
  },
  {
    id: 'recommendations',
    title: 'Recommendations & Insights',
    enabled: true,
    alwaysShow: false,
    dataCheck: (entity) => entity?.ai_insights || entity?.recommendations,
    priority: 5,
    comingSoon: true, // Placeholder for future AI features
    description:
      'AI-powered talent fit scores, suggested roles, and performance predictions',
  },
  {
    id: 'verification',
    title: 'Verification & Vetting',
    enabled: true,
    alwaysShow: false,
    dataCheck: (entity) => entity?.verification_status || entity?.trust_score,
    priority: 6,
    comingSoon: true, // Placeholder for future features
    description: 'Identity verification, trust scores, and integrity checks',
  },
  {
    id: 'performance',
    title: 'Performance & QA Metrics',
    enabled: true,
    alwaysShow: false,
    dataCheck: (entity) => entity?.qa_metrics || entity?.performance_score,
    priority: 7,
    comingSoon: true, // Placeholder for future features
    description: 'Quality scores, accuracy rates, and reliability trends',
  },
  {
    id: 'projects-assignments',
    title: 'Projects & Assignments',
    enabled: true,
    alwaysShow: false,
    dataCheck: (entity) =>
      entity?.assignments?.length > 0 || entity?.projects?.length > 0,
    priority: 8,
  },
  {
    id: 'activity-log',
    title: 'Activity & Audit Log',
    enabled: true,
    alwaysShow: false,
    dataCheck: (entity) => entity?.activity_log || entity?.updated_at,
    priority: 9,
  },
]

/**
 * Interview Detail Sections
 */
export const INTERVIEW_SECTIONS = [
  {
    id: 'overview',
    title: 'Interview Overview',
    enabled: true,
    alwaysShow: true,
    dataCheck: (entity) => true,
    priority: 1,
  },
  {
    id: 'candidate-info',
    title: 'Candidate Information',
    enabled: true,
    alwaysShow: true,
    dataCheck: (entity) => entity?.candidate_id,
    priority: 2,
  },
  {
    id: 'status-management',
    title: 'Status & Decision',
    enabled: true,
    alwaysShow: true,
    dataCheck: (entity) => true,
    priority: 3,
  },
  {
    id: 'summary-analysis',
    title: 'Summary & Analysis',
    enabled: true,
    alwaysShow: false,
    dataCheck: (entity) => entity?.summary || entity?.analysis_result,
    priority: 4,
  },
  {
    id: 'transcript',
    title: 'Transcript',
    enabled: true,
    alwaysShow: false,
    dataCheck: (entity) => entity?.transcript,
    priority: 5,
  },
  {
    id: 'related-entities',
    title: 'Related Information',
    enabled: true,
    alwaysShow: false,
    dataCheck: (entity) => entity?.job_id || entity?.project_id,
    priority: 6,
  },
]

/**
 * Job Detail Sections
 */
export const JOB_SECTIONS = [
  {
    id: 'overview',
    title: 'Job Overview',
    enabled: true,
    alwaysShow: true,
    dataCheck: (entity) => true,
    priority: 1,
  },
  {
    id: 'description',
    title: 'Description & Requirements',
    enabled: true,
    alwaysShow: true,
    dataCheck: (entity) => entity?.description,
    priority: 2,
  },
  {
    id: 'interview-config',
    title: 'Interview Configuration',
    enabled: true,
    alwaysShow: false,
    dataCheck: (entity) => entity?.interview_type || entity?.skills,
    priority: 3,
  },
  {
    id: 'interviews',
    title: 'Interviews',
    enabled: true,
    alwaysShow: false,
    dataCheck: (entity) => entity?.interviews?.length > 0,
    priority: 4,
  },
  {
    id: 'pipeline-stats',
    title: 'Pipeline Statistics',
    enabled: true,
    alwaysShow: false,
    dataCheck: (entity) => entity?.stats,
    priority: 5,
  },
]

/**
 * Project Detail Sections
 */
export const PROJECT_SECTIONS = [
  {
    id: 'overview',
    title: 'Project Overview',
    enabled: true,
    alwaysShow: true,
    dataCheck: (entity) => true,
    priority: 1,
  },
  {
    id: 'description',
    title: 'Description',
    enabled: true,
    alwaysShow: true,
    dataCheck: (entity) => entity?.description,
    priority: 2,
  },
  {
    id: 'team-assignments',
    title: 'Team & Assignments',
    enabled: true,
    alwaysShow: false,
    dataCheck: (entity) => entity?.assignments?.length > 0,
    priority: 3,
  },
  {
    id: 'roles',
    title: 'Role Definitions',
    enabled: true,
    alwaysShow: false,
    dataCheck: (entity) => entity?.roles?.length > 0,
    priority: 4,
  },
  {
    id: 'stats',
    title: 'Project Statistics',
    enabled: true,
    alwaysShow: false,
    dataCheck: (entity) => entity?.capacity,
    priority: 5,
  },
]

// ============================================================================
// SECTION REGISTRY
// ============================================================================

export const ENTITY_SECTIONS = {
  annotator: ANNOTATOR_SECTIONS,
  candidate: ANNOTATOR_SECTIONS, // Same as annotator
  interview: INTERVIEW_SECTIONS,
  job: JOB_SECTIONS,
  project: PROJECT_SECTIONS,
}

// ============================================================================
// SECTION UTILITIES
// ============================================================================

/**
 * Gets sections for a given entity type
 * @param {string} entityType - Type of entity
 * @returns {Array} Array of section definitions
 */
export function getSections(entityType) {
  return ENTITY_SECTIONS[entityType] || []
}

/**
 * Filters sections based on data availability and enabled status
 * @param {string} entityType - Type of entity
 * @param {Object} entityData - The entity data object
 * @param {Object} options - Filtering options
 * @returns {Array} Filtered array of sections to display
 */
export function getVisibleSections(entityType, entityData, options = {}) {
  const { showComingSoon = false } = options
  const sections = getSections(entityType)

  return sections
    .filter((section) => {
      // Must be enabled
      if (!section.enabled) return false

      // If coming soon and we don't want to show placeholders, skip
      if (section.comingSoon && !showComingSoon) return false

      // If always show, include it
      if (section.alwaysShow) return true

      // Check if data exists for this section
      return section.dataCheck(entityData)
    })
    .sort((a, b) => a.priority - b.priority)
}

/**
 * Checks if a specific section should be visible
 * @param {string} entityType - Type of entity
 * @param {string} sectionId - ID of the section
 * @param {Object} entityData - The entity data object
 * @returns {boolean} True if section should be visible
 */
export function isSectionVisible(entityType, sectionId, entityData) {
  const sections = getSections(entityType)
  const section = sections.find((s) => s.id === sectionId)

  if (!section || !section.enabled) return false
  if (section.alwaysShow) return true

  return section.dataCheck(entityData)
}

/**
 * Gets a section definition by ID
 * @param {string} entityType - Type of entity
 * @param {string} sectionId - ID of the section
 * @returns {Object|null} Section definition or null if not found
 */
export function getSection(entityType, sectionId) {
  const sections = getSections(entityType)
  return sections.find((s) => s.id === sectionId) || null
}

/**
 * Updates section configuration (useful for dynamic enable/disable)
 * @param {string} entityType - Type of entity
 * @param {string} sectionId - ID of the section to update
 * @param {Object} updates - Updates to apply { enabled, alwaysShow, etc. }
 * @returns {boolean} True if updated successfully
 */
export function updateSectionConfig(entityType, sectionId, updates) {
  const sections = getSections(entityType)
  const section = sections.find((s) => s.id === sectionId)

  if (!section) return false

  Object.assign(section, updates)
  return true
}

/**
 * Gets count of visible sections
 * @param {string} entityType - Type of entity
 * @param {Object} entityData - The entity data object
 * @param {Object} options - Filtering options
 * @returns {number} Count of visible sections
 */
export function getVisibleSectionCount(entityType, entityData, options = {}) {
  return getVisibleSections(entityType, entityData, options).length
}

/**
 * Gets count of coming soon sections with available data
 * @param {string} entityType - Type of entity
 * @param {Object} entityData - The entity data object
 * @returns {number} Count of coming soon sections
 */
export function getComingSoonSectionCount(entityType, entityData) {
  const sections = getSections(entityType)

  return sections.filter((section) => {
    return (
      section.comingSoon && section.enabled && section.dataCheck(entityData)
    )
  }).length
}

// ============================================================================
// EDIT MODE CONFIGURATION
// ============================================================================

/**
 * Defines which sections are editable and in which step of the edit flow
 * Format: { entityType: { editSteps: [ { stepName, sectionIds[] } ] } }
 */
export const EDIT_FLOW_CONFIG = {
  annotator: {
    steps: [
      {
        id: 'basic-info',
        title: 'Basic Information',
        description: 'Update name, contact, and role information',
        sectionIds: ['core-identity'],
      },
      {
        id: 'skills-experience',
        title: 'Skills & Experience',
        description: 'Update skills, expertise, and experience level',
        sectionIds: ['skills-experience'],
      },
      {
        id: 'portfolio',
        title: 'Portfolio & Background',
        description: 'Update education, work history, and projects',
        sectionIds: ['portfolio'],
      },
    ],
  },
  job: {
    steps: [
      {
        id: 'job-details',
        title: 'Job Details',
        description: 'Basic job information and requirements',
        sectionIds: ['overview', 'description'],
      },
      {
        id: 'interview-type',
        title: 'Interview Type',
        description: 'Select interview format and requirements',
        sectionIds: ['interview-config'],
      },
      {
        id: 'configuration',
        title: 'Configuration',
        description: 'Skills, questions, and custom settings',
        sectionIds: ['interview-config'],
      },
    ],
  },
  project: {
    steps: [
      {
        id: 'project-info',
        title: 'Project Information',
        description: 'Update project details and description',
        sectionIds: ['overview', 'description'],
      },
      {
        id: 'roles-capacity',
        title: 'Roles & Capacity',
        description: 'Define roles and team capacity',
        sectionIds: ['roles', 'stats'],
      },
    ],
  },
  interview: {
    steps: [
      {
        id: 'metadata',
        title: 'Interview Metadata',
        description: 'Update interview information',
        sectionIds: ['overview'],
      },
    ],
  },
}

/**
 * Gets edit flow steps for an entity type
 * @param {string} entityType - Type of entity
 * @returns {Array} Array of edit steps
 */
export function getEditFlowSteps(entityType) {
  return EDIT_FLOW_CONFIG[entityType]?.steps || []
}

/**
 * Checks if an entity type supports multi-step editing
 * @param {string} entityType - Type of entity
 * @returns {boolean} True if multi-step edit is configured
 */
export function hasMultiStepEdit(entityType) {
  const steps = getEditFlowSteps(entityType)
  return steps.length > 1
}
