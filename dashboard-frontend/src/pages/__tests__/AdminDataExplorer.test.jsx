import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import axios from 'axios'

import AdminDataExplorer from '../AdminDataExplorer'

jest.mock('axios')
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

const mockRecord = {
  id: 'task-1',
  task_name: 'QA Review',
  job_id: 'job-1',
  job_title: 'Creative Project',
  job_status: 'in_progress',
  annotator_id: 'annotator-1',
  annotator_name: 'Alex Doe',
  annotator_email: 'alex@example.com',
  status: 'completed',
  quality_rating: 4,
  created_at: '2024-01-01T10:00:00+00:00',
  completed_at: '2024-01-02T10:00:00+00:00',
  dataset_title: 'Moodboard',
  dataset_tags: ['design'],
}

const renderComponent = () =>
  render(
    <MemoryRouter>
      <AdminDataExplorer />
    </MemoryRouter>
  )

const setupDefaultMock = () => {
  axios.get.mockImplementation((url) => {
    if (url.endsWith('/jobs')) {
      return Promise.resolve({
        data: [{ id: 'job-1', title: 'Creative Project' }],
      })
    }

    if (url.endsWith('/admin/data')) {
      return Promise.resolve({
        data: {
          items: [mockRecord],
          total: 1,
          total_pages: 1,
        },
      })
    }

    if (url.endsWith('/admin/data/export')) {
      return Promise.resolve({
        data: new Blob(['id,task_name\n'], { type: 'text/csv' }),
        headers: { 'content-type': 'text/csv' },
      })
    }

    return Promise.resolve({ data: {} })
  })
}

describe('AdminDataExplorer', () => {
  beforeEach(() => {
    axios.get.mockReset()
    setupDefaultMock()
  })

  it('renders fetched records', async () => {
    renderComponent()

    expect(screen.getByText(/loading data/i)).toBeInTheDocument()

    await waitFor(() =>
      expect(screen.getByText('QA Review')).toBeInTheDocument()
    )
    expect(screen.getByText('Creative Project')).toBeInTheDocument()
    expect(screen.getByText('Alex Doe')).toBeInTheDocument()
  })

  it('applies sorting when table header clicked', async () => {
    renderComponent()
    await waitFor(() =>
      expect(screen.getByText('QA Review')).toBeInTheDocument()
    )

    axios.get.mockClear()
    setupDefaultMock()

    fireEvent.click(screen.getByRole('button', { name: /project/i }))

    await waitFor(() => {
      const adminCalls = axios.get.mock.calls.filter(([url]) =>
        url.endsWith('/admin/data')
      )
      expect(adminCalls.length).toBeGreaterThan(0)
      const [, options] = adminCalls[adminCalls.length - 1]
      expect(options.params.sort_by).toBe('job_title')
    })
  })

  it('requests CSV export with current filters', async () => {
    renderComponent()
    await waitFor(() =>
      expect(screen.getByText('QA Review')).toBeInTheDocument()
    )

    const createObjectURLSpy = jest
      .spyOn(window.URL, 'createObjectURL')
      .mockReturnValue('blob:url')
    const revokeSpy = jest
      .spyOn(window.URL, 'revokeObjectURL')
      .mockImplementation(() => {})
    const clickSpy = jest
      .spyOn(window.HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    axios.get.mockClear()
    setupDefaultMock()

    fireEvent.click(screen.getByRole('button', { name: /export csv/i }))

    await waitFor(() => {
      const exportCall = axios.get.mock.calls.find(([url]) =>
        url.endsWith('/admin/data/export')
      )
      expect(exportCall).toBeTruthy()
      const [, options] = exportCall
      expect(options.params.format).toBe('csv')
      expect(options.responseType).toBe('blob')
      expect(createObjectURLSpy).toHaveBeenCalled()
      expect(clickSpy).toHaveBeenCalled()
    })

    createObjectURLSpy.mockRestore()
    revokeSpy.mockRestore()
    clickSpy.mockRestore()
  })
})
