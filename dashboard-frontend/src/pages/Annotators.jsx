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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  RotateCcw,
  AlertCircle,
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'

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

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />

      {/* Main Content */}
      <main className="lg:ml-64 overflow-y-auto pb-16 lg:pb-0">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-neutral-900 mb-1">
              Annotators
            </h1>
            <p className="text-sm text-gray-500">
              Only candidates who have been accepted as annotators (not regular
              candidates)
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-4 flex gap-3 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10 rounded-lg border-neutral-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 text-sm"
                />
              </div>
            </div>
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
                <SelectItem value="accepted_date_desc">
                  Date (Newest)
                </SelectItem>
                <SelectItem value="accepted_date_asc">Date (Oldest)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <p className="text-sm text-gray-600">Loading...</p>
          ) : items.length === 0 ? (
            <Card className="p-10 text-center bg-surface border border-neutral-200 rounded-xl shadow-card">
              <p className="text-sm text-neutral-600 mb-3">
                No accepted annotators found. Only candidates who have been
                explicitly accepted as annotators appear here.
              </p>
              <p className="text-xs text-neutral-500">
                Regular candidates (not yet accepted as annotators) are shown in
                the Candidates view.
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden border border-neutral-200 rounded-xl shadow-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50">
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Job Posting</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>AI Score</TableHead>
                    <TableHead>Accepted Date</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow
                      key={item.interviewId}
                      className="hover:bg-neutral-50"
                    >
                      <TableCell className="font-medium">
                        {item.candidateName}
                      </TableCell>
                      <TableCell className="text-sm text-neutral-600">
                        {item.candidateEmail}
                      </TableCell>
                      <TableCell className="text-sm">{item.jobTitle}</TableCell>
                      <TableCell className="text-sm">
                        {item.projectCount > 0 ? (
                          <Badge
                            variant="secondary"
                            className="text-xs border-brand-200 text-brand-700 bg-brand-50"
                          >
                            {item.projectCount} project
                            {item.projectCount !== 1 ? 's' : ''}
                          </Badge>
                        ) : (
                          <span className="text-neutral-400">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>{renderScore(item)}</TableCell>
                      <TableCell className="text-sm text-neutral-600">
                        {formatDate(item.acceptedDate)}
                      </TableCell>
                      <TableCell className="text-sm text-neutral-600">
                        {formatDate(item.lastActivity)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigate(`/candidates`)}
                            >
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                navigate(`/admin/review/${item.interviewId}`)
                              }
                            >
                              Open Interview Report
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3">
              <div className="text-sm text-neutral-600">
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, total)} of {total} results
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={pageSize.toString()}
                  onValueChange={(val) => {
                    setPageSize(parseInt(val))
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="w-28 h-9 text-sm border-neutral-300 focus:border-brand-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                    <SelectItem value="100">100 / page</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="h-9 border-neutral-300 hover:bg-neutral-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="h-9 border-neutral-300 hover:bg-neutral-100"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

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
    </div>
  )
}
