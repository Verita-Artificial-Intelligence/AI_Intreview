import React, { useState, useEffect, useCallback } from 'react'
import api from '@/utils/api'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import {
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  RotateCcw,
  AlertCircle,
} from 'lucide-react'
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
  const [sortBy, setSortBy] = useState('accepted_date_desc')
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
      render: (_, item) => (
        <div className="font-medium text-neutral-900">{item.candidateName}</div>
      ),
    }),
    createColumn('email', 'Email', {
      render: (_, item) => (
        <span className="text-sm text-neutral-600">{item.candidateEmail}</span>
      ),
    }),
    createColumn('job', 'Job Posting', {
      render: (_, item) => <span className="text-sm">{item.jobTitle}</span>,
    }),
    createColumn('projects', 'Projects', {
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
      render: (_, item) => renderScore(item),
    }),
    createColumn('acceptedDate', 'Accepted Date', {
      render: (_, item) => (
        <span className="text-sm text-neutral-600">
          {formatDate(item.acceptedDate)}
        </span>
      ),
    }),
    createColumn('lastActivity', 'Last Activity', {
      render: (_, item) => (
        <span className="text-sm text-neutral-600">
          {formatDate(item.lastActivity)}
        </span>
      ),
    }),
    createColumn('actions', 'Actions', {
      className: 'text-right',
      render: (_, item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/candidates`)}>
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate(`/admin/review/${item.interviewId}`)}
            >
              Open Interview Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="mb-4 flex gap-3 flex-wrap">
          <Select value={jobFilter} onValueChange={setJobFilter}>
            <SelectTrigger className="w-44 h-10 rounded-lg text-sm border-neutral-300 focus:border-brand-500">
              <SelectValue placeholder="Job" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jobs</SelectItem>
              {jobs.map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  {job.job_title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-10 rounded-lg text-sm border-neutral-300 focus:border-brand-500">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pass">Pass</SelectItem>
              <SelectItem value="fail">Fail</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44 h-10 rounded-lg text-sm border-neutral-300 focus:border-brand-500">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score_desc">Score (High to Low)</SelectItem>
              <SelectItem value="score_asc">Score (Low to High)</SelectItem>
              <SelectItem value="accepted_date_desc">Date (Newest)</SelectItem>
              <SelectItem value="accepted_date_asc">Date (Oldest)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Annotators Table */}
        <DataTable
          columns={columns}
          data={items}
          loading={loading}
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
          size="md"
        />
      </div>

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
