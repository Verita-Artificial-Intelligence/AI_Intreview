import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  Check,
  Download,
  Filter,
  Loader2,
  RefreshCcw,
  Search,
  X,
} from 'lucide-react'

import Sidebar from '@/components/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { cn } from '@/lib/utils'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API_BASE = BACKEND_URL
  ? `${BACKEND_URL}/api`
  : 'http://localhost:8000/api'

const PAGE_SIZE = 25
const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'reviewed', label: 'Reviewed' },
]

const SORTABLE_COLUMNS = [
  { key: 'task_name', label: 'Task' },
  { key: 'job_title', label: 'Project' },
  { key: 'annotator_name', label: 'Annotator' },
  { key: 'quality_rating', label: 'Rating' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Created' },
  { key: 'completed_at', label: 'Completed' },
]

const defaultFilters = {
  jobId: 'all',
  annotator: null,
  statuses: [],
  tags: [],
  ratingRange: [1, 5],
  createdRange: { from: null, to: null },
  search: '',
}

const formatDate = (value) => {
  if (!value) return '—'
  try {
    return format(new Date(value), 'MMM d, yyyy p')
  } catch (error) {
    return value
  }
}

const AdminDataExplorer = () => {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [jobs, setJobs] = useState([])
  const [annotators, setAnnotators] = useState([])
  const [availableTags, setAvailableTags] = useState([])
  const [filters, setFilters] = useState(defaultFilters)
  const [sort, setSort] = useState({ key: 'created_at', direction: 'desc' })
  const [activePopover, setActivePopover] = useState(null)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await axios.get(`${API_BASE}/jobs`)
        setJobs(response.data || [])
      } catch (error) {
        console.error('Failed to load jobs', error)
      }
    }

    fetchJobs()
  }, [])

  const buildQueryParams = useCallback(
    (overrides = {}) => {
      const params = {
        page,
        page_size: PAGE_SIZE,
        sort_by: sort.key,
        sort_dir: sort.direction,
      }

      if (filters.jobId && filters.jobId !== 'all') {
        params.job_id = filters.jobId
      }

      if (filters.annotator?.id) {
        params.annotator_id = filters.annotator.id
      }

      if (filters.statuses.length > 0) {
        params.status = filters.statuses
      }

      if (filters.tags.length > 0) {
        params.tags = filters.tags
      }

      if (filters.search.trim()) {
        params.search = filters.search.trim()
      }

      const [ratingMin, ratingMax] = filters.ratingRange
      if (ratingMin > 1) {
        params.rating_min = ratingMin
      }
      if (ratingMax < 5) {
        params.rating_max = ratingMax
      }

      if (filters.createdRange.from) {
        params.created_from = filters.createdRange.from.toISOString()
      }
      if (filters.createdRange.to) {
        params.created_to = filters.createdRange.to.toISOString()
      }

      return { ...params, ...overrides }
    },
    [filters, page, sort]
  )

  const updateFacetsFromRecords = useCallback((items) => {
    setAnnotators((prev) => {
      const map = new Map(prev.map((entry) => [entry.id, entry]))

      items.forEach((item) => {
        if (item.annotator_id) {
          map.set(item.annotator_id, {
            id: item.annotator_id,
            name: item.annotator_name || 'Unknown annotator',
          })
        }
      })

      return Array.from(map.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    })

    setAvailableTags((prev) => {
      const tagSet = new Set(prev)
      items.forEach((item) => {
        if (Array.isArray(item.dataset_tags)) {
          item.dataset_tags.forEach((tag) => {
            if (tag) tagSet.add(tag)
          })
        }
      })
      return Array.from(tagSet).sort((a, b) => a.localeCompare(b))
    })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const fetchData = async () => {
      setLoading(true)
      try {
        const params = buildQueryParams()
        const response = await axios.get(`${API_BASE}/admin/data`, {
          params,
          signal: controller.signal,
        })

        setRecords(response.data.items || [])
        setTotalItems(response.data.total || 0)
        setTotalPages(response.data.total_pages || 1)
        updateFacetsFromRecords(response.data.items || [])
      } catch (error) {
        if (axios.isCancel(error)) {
          return
        }
        console.error('Failed to load admin data', error)
        toast.error('Failed to load admin data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    return () => controller.abort()
  }, [buildQueryParams, updateFacetsFromRecords])

  const resetFilters = () => {
    setFilters(defaultFilters)
    setPage(1)
  }

  const handleSearchChange = (event) => {
    setFilters((prev) => ({ ...prev, search: event.target.value }))
    setPage(1)
  }

  const handleJobChange = (value) => {
    setFilters((prev) => ({ ...prev, jobId: value }))
    setPage(1)
  }

  const handleAnnotatorSelect = (annotator) => {
    setFilters((prev) => ({ ...prev, annotator }))
    setActivePopover(null)
    setPage(1)
  }

  const toggleStatus = (statusValue) => {
    setFilters((prev) => {
      const exists = prev.statuses.includes(statusValue)
      const nextStatuses = exists
        ? prev.statuses.filter((status) => status !== statusValue)
        : [...prev.statuses, statusValue]

      return { ...prev, statuses: nextStatuses }
    })
    setPage(1)
  }

  const toggleTag = (tagValue) => {
    setFilters((prev) => {
      const exists = prev.tags.includes(tagValue)
      const nextTags = exists
        ? prev.tags.filter((tag) => tag !== tagValue)
        : [...prev.tags, tagValue]
      return { ...prev, tags: nextTags }
    })
    setPage(1)
  }

  const handleRatingCommit = (value) => {
    setFilters((prev) => ({ ...prev, ratingRange: value }))
    setPage(1)
  }

  const handleDateRangeChange = (range) => {
    setFilters((prev) => ({ ...prev, createdRange: range }))
    setPage(1)
  }

  const handleSort = (columnKey) => {
    setSort((prev) => {
      if (prev.key === columnKey) {
        const nextDirection = prev.direction === 'asc' ? 'desc' : 'asc'
        return { key: columnKey, direction: nextDirection }
      }
      return { key: columnKey, direction: 'asc' }
    })
    setPage(1)
  }

  const handleExport = async (format) => {
    setIsExporting(true)
    try {
      const params = buildQueryParams({ format })
      delete params.page
      delete params.page_size

      const response = await axios.get(`${API_BASE}/admin/data/export`, {
        params,
        responseType: 'blob',
      })

      const contentType =
        response.headers['content-type'] || 'application/octet-stream'
      const blob = new Blob([response.data], { type: contentType })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download =
        format === 'json' ? 'admin-data-export.json' : 'admin-data-export.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success(`Exported admin data as ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Failed to export admin data', error)
      toast.error('Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const currentAnnotatorLabel = filters.annotator?.name || 'All annotators'
  const ratingRangeLabel =
    filters.ratingRange[0] === 1 && filters.ratingRange[1] === 5
      ? 'All ratings'
      : `${filters.ratingRange[0]} – ${filters.ratingRange[1]}`

  const activeFilters = useMemo(() => {
    const chips = []
    if (filters.jobId !== 'all') {
      const job = jobs.find((entry) => entry.id === filters.jobId)
      chips.push({
        label: job?.title || 'Selected job',
        onRemove: () => handleJobChange('all'),
      })
    }
    if (filters.annotator) {
      chips.push({
        label: `Annotator: ${filters.annotator.name}`,
        onRemove: () => handleAnnotatorSelect(null),
      })
    }
    filters.statuses.forEach((statusValue) =>
      chips.push({
        label: `Status: ${statusValue.replace('_', ' ')}`,
        onRemove: () => toggleStatus(statusValue),
      })
    )
    filters.tags.forEach((tag) =>
      chips.push({
        label: `Tag: ${tag}`,
        onRemove: () => toggleTag(tag),
      })
    )
    if (filters.ratingRange[0] !== 1 || filters.ratingRange[1] !== 5) {
      chips.push({
        label: `Rating ${filters.ratingRange[0]}-${filters.ratingRange[1]}`,
        onRemove: () => handleRatingCommit([1, 5]),
      })
    }
    if (filters.createdRange.from || filters.createdRange.to) {
      const label = `Created ${filters.createdRange.from ? format(filters.createdRange.from, 'MMM d, yyyy') : 'start'} → ${
        filters.createdRange.to
          ? format(filters.createdRange.to, 'MMM d, yyyy')
          : 'now'
      }`
      chips.push({
        label,
        onRemove: () => handleDateRangeChange({ from: null, to: null }),
      })
    }
    if (filters.search.trim()) {
      chips.push({
        label: `Search: ${filters.search.trim()}`,
        onRemove: () => handleSearchChange({ target: { value: '' } }),
      })
    }
    return chips
  }, [filters, jobs])

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <main className="lg:ml-64 overflow-y-auto bg-white pb-16 lg:pb-0">
        <div className="max-w-7xl mx-auto px-8 py-12">
          <div className="mb-10 flex flex-wrap items-start justify-between gap-6">
            <div>
              <h1 className="text-5xl font-bold text-neutral-900 mb-3 tracking-tight leading-tight">
                Admin Data Explorer
              </h1>
              <p className="text-lg text-neutral-600 font-light max-w-2xl">
                Inspect annotation tasks, project datasets, and quality trends
                with powerful filters and exports.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={resetFilters}
                disabled={loading}
                className="h-10"
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('json')}
                disabled={isExporting}
                className="h-10"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Export JSON
              </Button>
              <Button
                onClick={() => handleExport('csv')}
                disabled={isExporting}
                className="bg-brand-500 hover:bg-brand-600 h-10"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Export CSV
              </Button>
            </div>
          </div>

          <Card className="mb-6 border-neutral-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-medium text-neutral-700">
                <Filter className="w-4 h-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="col-span-1 lg:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                    <Input
                      placeholder="Search projects, datasets, annotators…"
                      value={filters.search}
                      onChange={handleSearchChange}
                      className="pl-9"
                    />
                  </div>
                </div>

                <Select value={filters.jobId} onValueChange={handleJobChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Popover
                  open={activePopover === 'annotator'}
                  onOpenChange={(open) =>
                    setActivePopover(open ? 'annotator' : null)
                  }
                >
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-between">
                      <span className="truncate">{currentAnnotatorLabel}</span>
                      <ArrowUpDown className="w-4 h-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="end">
                    <Command>
                      <CommandInput placeholder="Search annotators…" />
                      <CommandList>
                        <CommandEmpty>No annotators found</CommandEmpty>
                        <CommandGroup heading="Annotators">
                          <CommandItem
                            onSelect={() => handleAnnotatorSelect(null)}
                            className="justify-between"
                          >
                            All annotators
                            {!filters.annotator && <Checkmark />}
                          </CommandItem>
                          {annotators.map((annotator) => (
                            <CommandItem
                              key={annotator.id}
                              onSelect={() => handleAnnotatorSelect(annotator)}
                              className="justify-between"
                            >
                              <span className="truncate">{annotator.name}</span>
                              {filters.annotator?.id === annotator.id && (
                                <Checkmark />
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <Popover
                  open={activePopover === 'tags'}
                  onOpenChange={(open) =>
                    setActivePopover(open ? 'tags' : null)
                  }
                >
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-between">
                      <span className="truncate">
                        {filters.tags.length === 0
                          ? 'All tags'
                          : `${filters.tags.length} tag${filters.tags.length > 1 ? 's' : ''} selected`}
                      </span>
                      <ArrowUpDown className="w-4 h-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="max-h-72 overflow-y-auto"
                  >
                    <div className="space-y-2">
                      {availableTags.length === 0 && (
                        <p className="text-sm text-neutral-500">
                          No tags discovered yet
                        </p>
                      )}
                      {availableTags.map((tag) => {
                        const checked = filters.tags.includes(tag)
                        return (
                          <label
                            key={tag}
                            className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-neutral-100 cursor-pointer text-sm"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleTag(tag)}
                            />
                            <span className="truncate">{tag}</span>
                          </label>
                        )
                      })}
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover
                  open={activePopover === 'dates'}
                  onOpenChange={(open) =>
                    setActivePopover(open ? 'dates' : null)
                  }
                >
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-between">
                      <span>
                        {filters.createdRange.from
                          ? `${format(filters.createdRange.from, 'MMM d, yyyy')} – ${
                              filters.createdRange.to
                                ? format(filters.createdRange.to, 'MMM d, yyyy')
                                : 'today'
                            }`
                          : 'Created date'}
                      </span>
                      <CalendarDays className="w-4 h-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="range"
                      selected={filters.createdRange}
                      onSelect={handleDateRangeChange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-neutral-500">
                    <span>Rating</span>
                    <span>{ratingRangeLabel}</span>
                  </div>
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={filters.ratingRange}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, ratingRange: value }))
                    }
                    onValueCommit={handleRatingCommit}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((option) => {
                    const active = filters.statuses.includes(option.value)
                    return (
                      <Badge
                        key={option.value}
                        variant={active ? 'default' : 'outline'}
                        className={cn(
                          'cursor-pointer px-3 py-1',
                          active ? 'bg-brand-500 hover:bg-brand-600' : ''
                        )}
                        onClick={() => toggleStatus(option.value)}
                      >
                        {option.label}
                      </Badge>
                    )
                  })}
                </div>
              </div>

              {activeFilters.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {activeFilters.map((chip, index) => (
                    <Badge
                      key={`${chip.label}-${index}`}
                      variant="secondary"
                      className="flex items-center gap-1 px-3 py-1"
                    >
                      {chip.label}
                      <button
                        type="button"
                        onClick={chip.onRemove}
                        className="text-neutral-500 hover:text-neutral-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Data overview
                </h2>
                <p className="text-sm text-neutral-500">
                  Showing {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, totalItems)} of {totalItems}{' '}
                  records
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader className="bg-neutral-50 sticky top-0 z-10">
                  <TableRow>
                    {SORTABLE_COLUMNS.map((column) => {
                      const isActive = sort.key === column.key
                      const icon = !isActive
                        ? ArrowUpDown
                        : sort.direction === 'asc'
                          ? ArrowUp
                          : ArrowDown
                      const Icon = icon
                      return (
                        <TableHead
                          key={column.key}
                          className="whitespace-nowrap"
                        >
                          <button
                            type="button"
                            className="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
                            onClick={() => handleSort(column.key)}
                          >
                            {column.label}
                            <Icon className="w-3.5 h-3.5" />
                          </button>
                        </TableHead>
                      )
                    })}
                    <TableHead className="whitespace-nowrap">Dataset</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-20 text-center text-neutral-500"
                      >
                        <Loader2 className="w-5 h-5 mr-2 inline-block animate-spin" />
                        Loading data…
                      </TableCell>
                    </TableRow>
                  ) : records.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-16 text-center text-neutral-500"
                      >
                        No records match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((record) => (
                      <TableRow key={record.id} className="hover:bg-neutral-50">
                        <TableCell className="font-medium text-neutral-900">
                          <div className="flex flex-col gap-1">
                            <span>{record.task_name || 'Untitled task'}</span>
                            <span className="text-xs text-neutral-500">
                              {record.id}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-neutral-800">
                              {record.job_title || '—'}
                            </span>
                            <span className="text-xs text-neutral-500">
                              {record.job_status || '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-neutral-800">
                              {record.annotator_name || '—'}
                            </span>
                            <span className="text-xs text-neutral-500">
                              {record.annotator_email ||
                                record.annotator_id ||
                                '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const numericRating = Number(record.quality_rating)
                            if (Number.isNaN(numericRating)) {
                              return '—'
                            }
                            return (
                              <Badge
                                variant="outline"
                                className="border-green-200 text-green-700"
                              >
                                {numericRating.toFixed(1)}
                              </Badge>
                            )
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              'capitalize',
                              record.status === 'completed'
                                ? 'border-green-200 text-green-700'
                                : record.status === 'in_progress'
                                  ? 'border-blue-200 text-blue-700'
                                  : 'border-neutral-200 text-neutral-700'
                            )}
                          >
                            {record.status?.replace('_', ' ') || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(record.created_at)}</TableCell>
                        <TableCell>{formatDate(record.completed_at)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-neutral-800">
                              {record.dataset_title || '—'}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {(record.dataset_tags || []).map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between border-t border-neutral-200 px-6 py-4 bg-neutral-50">
              <div className="text-sm text-neutral-500">
                Page {page} of {totalPages}
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(event) => {
                        event.preventDefault()
                        if (page > 1) setPage(page - 1)
                      }}
                      className={cn({
                        'pointer-events-none opacity-50': page === 1,
                      })}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink isActive href="#">
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(event) => {
                        event.preventDefault()
                        if (page < totalPages) setPage(page + 1)
                      }}
                      className={cn({
                        'pointer-events-none opacity-50': page === totalPages,
                      })}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

const Checkmark = () => <Check className="w-3 h-3 text-brand-500" />

export default AdminDataExplorer
