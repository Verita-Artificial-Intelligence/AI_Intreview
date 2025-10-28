/**
 * DataTable Integration Examples
 *
 * This file shows how to integrate the new slide-over system with existing DataTable pages.
 * Follow these patterns for Pipeline, Jobs, Projects, Annotators, and Interviews pages.
 */

import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import DataTable from '@/components/DataTable'
import InterviewDetailSheetNew from '@/components/InterviewDetailSheetNew'
import JobSheet from '@/components/JobSheet'
import ProjectDetailSheetNew from '@/components/ProjectDetailSheetNew'
import AnnotatorProfileSheetNew from '@/components/AnnotatorProfileSheetNew'
import { useSheetState } from '@/hooks/useSheetState'

// ============================================================================
// EXAMPLE 1: Pipeline Page Integration
// ============================================================================

export function PipelinePageExample() {
  const { isOpen, sheetType, entityId, openSheet, closeSheet } = useSheetState()
  const [interviews, setInterviews] = useState([])

  // Define columns for DataTable
  const columns = [
    { key: 'candidate_name', header: 'Candidate', sortable: true },
    { key: 'job_title', header: 'Job', sortable: true },
    { key: 'status', header: 'Status', sortable: true },
    { key: 'created_at', header: 'Date', sortable: true },
  ]

  // Row click handler - opens interview detail sheet
  const handleRowClick = (interview) => {
    openSheet('interview', interview.id)
  }

  return (
    <div>
      <DataTable
        columns={columns}
        data={interviews}
        onRowClick={handleRowClick}
      />

      {/* Interview Detail Sheet - controlled by URL state */}
      {sheetType === 'interview' && (
        <InterviewDetailSheetNew
          open={isOpen}
          onOpenChange={closeSheet}
          interviewId={entityId}
        />
      )}
    </div>
  )
}

// ============================================================================
// EXAMPLE 2: Jobs Page Integration
// ============================================================================

export function JobsPageExample() {
  const { isOpen, sheetType, entityId, openSheet, closeSheet } = useSheetState()
  const [jobs, setJobs] = useState([])
  const [isCreating, setIsCreating] = useState(false)

  const columns = [
    { key: 'title', header: 'Job Title', sortable: true },
    { key: 'position_type', header: 'Type', sortable: true },
    { key: 'status', header: 'Status', sortable: true },
    { key: 'created_at', header: 'Created', sortable: true },
  ]

  // Row click opens job for editing
  const handleRowClick = (job) => {
    openSheet('job', job.id)
  }

  // Create button opens job sheet with id='new'
  const handleCreate = () => {
    openSheet('job', 'new')
  }

  const handleJobSubmit = async (jobData, jobId) => {
    // API call to create/update job
    if (jobId && jobId !== 'new') {
      await api.put(`/jobs/${jobId}`, jobData)
    } else {
      await api.post('/jobs', jobData)
    }
    // Refresh jobs list
    fetchJobs()
  }

  // Get job data for editing
  const selectedJob =
    entityId !== 'new' ? jobs.find((j) => j.id === entityId) : null

  return (
    <div>
      <button onClick={handleCreate}>Create Job</button>

      <DataTable columns={columns} data={jobs} onRowClick={handleRowClick} />

      {/* Job Sheet - for both create and edit */}
      {sheetType === 'job' && (
        <JobSheet
          open={isOpen}
          onOpenChange={closeSheet}
          job={selectedJob}
          onSubmit={handleJobSubmit}
        />
      )}
    </div>
  )
}

// ============================================================================
// EXAMPLE 3: Projects Page Integration
// ============================================================================

export function ProjectsPageExample() {
  const { isOpen, sheetType, entityId, openSheet, closeSheet } = useSheetState()
  const [projects, setProjects] = useState([])

  const columns = [
    { key: 'name', header: 'Project Name', sortable: true },
    { key: 'status', header: 'Status', sortable: true },
    { key: 'capacity', header: 'Capacity', sortable: false },
    { key: 'created_at', header: 'Created', sortable: true },
  ]

  const handleRowClick = (project) => {
    openSheet('project', project.id)
  }

  return (
    <div>
      <DataTable
        columns={columns}
        data={projects}
        onRowClick={handleRowClick}
      />

      {sheetType === 'project' && (
        <ProjectDetailSheetNew
          open={isOpen}
          onOpenChange={closeSheet}
          projectId={entityId}
        />
      )}
    </div>
  )
}

// ============================================================================
// EXAMPLE 4: Annotators Page Integration
// ============================================================================

export function AnnotatorsPageExample() {
  const { isOpen, sheetType, entityId, openSheet, closeSheet } = useSheetState()
  const [annotators, setAnnotators] = useState([])

  const columns = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'position', header: 'Position', sortable: true },
    { key: 'experience_years', header: 'Experience', sortable: true },
    { key: 'skills', header: 'Skills', sortable: false },
  ]

  const handleRowClick = (annotator) => {
    openSheet('annotator', annotator.id)
  }

  return (
    <div>
      <DataTable
        columns={columns}
        data={annotators}
        onRowClick={handleRowClick}
      />

      {sheetType === 'annotator' && (
        <AnnotatorProfileSheetNew
          open={isOpen}
          onOpenChange={closeSheet}
          candidateId={entityId}
        />
      )}
    </div>
  )
}

// ============================================================================
// EXAMPLE 5: Multi-Entity Page (with entity type switching)
// ============================================================================

export function MultiEntityPageExample() {
  const { isOpen, sheetType, entityId, openSheet, closeSheet } = useSheetState()

  // This example shows a page that can display different entity types
  // The sheet type is determined by the URL query param

  return (
    <div>
      {/* Your page content */}

      {/* Render appropriate sheet based on sheetType */}
      {sheetType === 'interview' && (
        <InterviewDetailSheetNew
          open={isOpen}
          onOpenChange={closeSheet}
          interviewId={entityId}
        />
      )}

      {sheetType === 'job' && (
        <JobSheet
          open={isOpen}
          onOpenChange={closeSheet}
          job={null} // Would need to fetch based on entityId
          onSubmit={() => {}}
        />
      )}

      {sheetType === 'project' && (
        <ProjectDetailSheetNew
          open={isOpen}
          onOpenChange={closeSheet}
          projectId={entityId}
        />
      )}

      {sheetType === 'annotator' && (
        <AnnotatorProfileSheetNew
          open={isOpen}
          onOpenChange={closeSheet}
          candidateId={entityId}
        />
      )}
    </div>
  )
}

// ============================================================================
// EXAMPLE 6: Entity Navigation (drill-down through related entities)
// ============================================================================

export function EntityNavigationExample() {
  const { replaceSheet } = useSheetState()

  // Inside a sheet component, clicking a related entity navigates to it
  const handleViewCandidate = (candidateId) => {
    // This replaces the current sheet with the candidate profile
    // The URL will update and breadcrumbs will show the trail
    replaceSheet('candidate', candidateId)
  }

  const handleViewJob = (jobId) => {
    replaceSheet('job', jobId)
  }

  const handleViewProject = (projectId) => {
    replaceSheet('project', projectId)
  }

  return (
    <div>
      <button onClick={() => handleViewCandidate('candidate-123')}>
        View Candidate
      </button>
      <button onClick={() => handleViewJob('job-456')}>View Job</button>
      <button onClick={() => handleViewProject('project-789')}>
        View Project
      </button>
    </div>
  )
}

// ============================================================================
// INTEGRATION CHECKLIST
// ============================================================================

/**
 * Steps to integrate slide-overs on a page:
 *
 * 1. Import useSheetState hook:
 *    import { useSheetState } from '@/hooks/useSheetState';
 *
 * 2. Use the hook in your component:
 *    const { isOpen, sheetType, entityId, openSheet, closeSheet } = useSheetState();
 *
 * 3. Add onRowClick handler to DataTable:
 *    <DataTable
 *      columns={columns}
 *      data={data}
 *      onRowClick={(row) => openSheet('entityType', row.id)}
 *    />
 *
 * 4. Render the appropriate sheet component:
 *    {sheetType === 'interview' && (
 *      <InterviewDetailSheetNew
 *        open={isOpen}
 *        onOpenChange={closeSheet}
 *        interviewId={entityId}
 *      />
 *    )}
 *
 * 5. For entity navigation within sheets, use replaceSheet():
 *    const { replaceSheet } = useSheetState();
 *    <button onClick={() => replaceSheet('candidate', candidateId)}>
 *      View Candidate
 *    </button>
 *
 * 6. The URL will automatically update with ?sheet=type&id=123
 *    and breadcrumbs will track navigation history
 */

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================

/**
 * Using toast notifications for user feedback:
 *
 * import { toast } from 'sonner';
 *
 * // Success message
 * toast.success('Interview status updated');
 *
 * // Error message
 * toast.error('Failed to update status');
 *
 * // With cascade information
 * toast.success('Candidate accepted. Assignment created.');
 *
 * // Error from API
 * catch (error) {
 *   const errorMsg = error.response?.data?.detail || 'Failed to update';
 *   toast.error(errorMsg);
 * }
 */
