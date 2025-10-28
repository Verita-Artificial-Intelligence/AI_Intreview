import React, { useState, useEffect, useCallback } from 'react'
import api from '@/utils/api'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import DataTable, {
  createColumn,
  columnRenderers,
} from '@/components/DataTable'
import ColumnFilterDropdown from '@/components/ColumnFilterDropdown'
import { RotateCcw, AlertCircle } from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'

export default function Annotators() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [jobFilter, setJobFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('score_desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // UI state
  const [retryDialogOpen, setRetryDialogOpen] = useState(false)
  const [selectedInterview, setSelectedInterview] = useState(null)
  const [retrying, setRetrying] = useState(false)

  // Options for filters
  const [jobs, setJobs] = useState([])

  const fetchAnnotators = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        page,
        page_size: pageSize,
        sort: sortBy,
      }

      if (searchTerm) params.query = searchTerm
      if (jobFilter !== 'all') params.jobId = jobFilter
      if (statusFilter !== 'all') params.status = statusFilter

      const response = await api.get('/annotators/accepted', { params })
      setItems(response.data.items || [])
      setTotal(response.data.total || 0)
      setTotalPages(response.data.totalPages || 0)
    } catch (error) {
      console.error('Failed to fetch annotators:', error)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, sortBy, searchTerm, jobFilter, statusFilter])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAnnotators()
    }, 250)
    return () => clearTimeout(timer)
  }, [fetchAnnotators])

  // Fetch filter options
  useEffect(() => {
    fetchFilterOptions()
  }, [])

  const fetchFilterOptions = async () => {
    try {
      // Fetch jobs for filter dropdown
      const jobsRes = await api.get('/jobs')
      setJobs(jobsRes.data || [])
    } catch (error) {
      console.error('Failed to fetch filter options:', error)
    }
  }

  const handleRetryScoringConfirm = async () => {
    if (!selectedInterview) return

    try {
      setRetrying(true)
      await api.post(`/interviews/${selectedInterview}/retry-scoring`)
      // Refresh list
      fetchAnnotators()
      setRetryDialogOpen(false)
      setSelectedInterview(null)
    } catch (error) {
      console.error('Failed to retry scoring:', error)
      alert('Failed to retry scoring. Please try again.')
    } finally {
      setRetrying(false)
    }
  }

  const renderScore = (item) => {
    if (item.scoreStatus === 'scored' && item.score !== null) {
      const isPassing = item.passStatus === 'pass'
      return (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-900">{item.score}</span>
          <span className={`badge ${isPassing ? 'badge-green' : 'badge-red'}`}>
            {isPassing ? 'Pass' : 'Fail'}
          </span>
        </div>
      )
    } else if (item.scoreStatus === 'pending') {
      return <span className="text-sm text-gray-500">Pending</span>
    } else if (item.scoreStatus === 'error') {
      return (
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-600">Error</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={() => {
              setSelectedInterview(item.interviewId)
              setRetryDialogOpen(true)
            }}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        </div>
      )
    }
    return <span className="text-sm text-gray-400">-</span>
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

  // Table columns configuration
  const columns = [
    createColumn('name', 'Name', {
      frozen: true,
      width: 180,
      minWidth: 140,
      render: (_, item) => (
        <div className="font-medium text-neutral-900">{item.candidateName}</div>
      ),
    }),
    createColumn('email', 'Email', {
      width: 200,
      render: (_, item) => (
        <span className="text-sm text-neutral-600">{item.candidateEmail}</span>
      ),
    }),
    createColumn('job', 'Job Posting', {
      frozen: true,
      width: 180,
      minWidth: 140,
      headerRender: () => (
        <ColumnFilterDropdown
          label="Job"
          value={jobFilter}
          options={[
            { value: 'all', label: 'All Jobs' },
            ...jobs.map((j) => ({ value: j.id, label: j.job_title })),
          ]}
          onChange={setJobFilter}
          searchable={true}
          placeholder="Search jobs..."
        />
      ),
      render: (_, item) => (
        <span className="text-sm">
          {item.jobTitle || item.job_title || '-'}
        </span>
      ),
    }),
    createColumn('projects', 'Projects', {
      width: 140,
      className: 'text-left border-l border-gray-200',
      render: (_, item) => {
        if (item.projectCount > 0) {
          return (
            <Badge
              variant="secondary"
              className="text-xs border-brand-200 text-brand-700 bg-brand-50"
            >
              {item.projectCount} project{item.projectCount !== 1 ? 's' : ''}
            </Badge>
          )
        }
        return <span className="text-neutral-400">Unassigned</span>
      },
    }),
    createColumn('score', 'AI Score', {
      width: 140,
      className: 'text-left border-l border-gray-200',
      headerRender: () => (
        <ColumnFilterDropdown
          label="AI Score"
          value={statusFilter}
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'pass', label: 'Pass' },
            { value: 'fail', label: 'Fail' },
          ]}
          onChange={setStatusFilter}
          searchable={false}
        />
      ),
      render: (_, item) => renderScore(item),
    }),
    createColumn('acceptedDate', 'Accepted Date', {
      width: 140,
      className: 'text-left border-l border-gray-200',
      render: (_, item) => (
        <span className="text-sm text-neutral-600">
          {formatDate(item.acceptedDate)}
        </span>
      ),
    }),
    createColumn('lastActivity', 'Last Activity', {
      width: 140,
      className: 'text-left border-l border-gray-200',
      render: (_, item) => (
        <span className="text-sm text-neutral-600">
          {formatDate(item.lastActivity)}
        </span>
      ),
    }),
  ]

  const paginationConfig = {
    page,
    totalPages,
    pageSize,
    total,
    onPageChange: setPage,
    onPageSizeChange: (newSize) => {
      setPageSize(newSize)
      setPage(1)
    },
  }

  return (
    <DashboardLayout
      search={searchTerm}
      onSearchChange={(e) => setSearchTerm(e.target.value)}
      searchPlaceholder="Search by name or email..."
    >
      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        density="compact"
        frozenColumns={['name', 'job']}
        pagination={paginationConfig}
        emptyState={
          <div className="p-10 text-center bg-surface border border-neutral-200 rounded-xl shadow-card">
            <p className="text-sm text-neutral-600 mb-3">
              No accepted annotators found. Only candidates who have been
              explicitly accepted as annotators appear here.
            </p>
            <p className="text-xs text-neutral-500">
              Regular candidates (not yet accepted as annotators) are shown in
              the Candidates view.
            </p>
          </div>
        }
      />

      {/* Retry Scoring Dialog */}
      <AlertDialog open={retryDialogOpen} onOpenChange={setRetryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retry AI Scoring?</AlertDialogTitle>
            <AlertDialogDescription>
              This will re-run the AI analysis for this interview. The previous
              score will be replaced with the new result.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={retrying}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRetryScoringConfirm}
              disabled={retrying}
            >
              {retrying ? 'Retrying...' : 'Retry Scoring'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}
