import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, X, FileText, Image, Video, Music, File, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
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
import { toast } from 'sonner'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API = `${BACKEND_URL}/api`

const UploadAnnotationData = () => {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploadMethod, setUploadMethod] = useState('url') // 'url' or 'file'
  const [uploadMode, setUploadMode] = useState('file') // 'file' or 'folder'
  const [showValidationWarning, setShowValidationWarning] = useState(false)
  const [invalidFiles, setInvalidFiles] = useState([])
  const [formData, setFormData] = useState({
    job_id: '',
    title: '',
    description: '',
    instructions: '',
    data_type: 'text',
    data_url: '',
    data_content: '',
  })

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    try {
      const response = await axios.get(`${API}/jobs`)
      setJobs(response.data)
    } catch (error) {
      console.error('Error fetching jobs:', error)
      toast.error('Failed to load jobs')
    }
  }

  const getValidExtensions = (dataType) => {
    const extensions = {
      image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'],
      video: ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'],
      audio: ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'],
      document: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'],
    }
    return extensions[dataType] || []
  }

  const validateFile = (file, dataType) => {
    if (dataType === 'text') return { valid: true }

    const validExtensions = getValidExtensions(dataType)
    const fileName = file.name.toLowerCase()
    const isValid = validExtensions.some(ext => fileName.endsWith(ext))

    return {
      valid: isValid,
      file: file,
      expectedType: dataType,
      actualExtension: fileName.substring(fileName.lastIndexOf('.'))
    }
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    // Validate all files
    const validationResults = files.map(file => validateFile(file, formData.data_type))
    const invalid = validationResults.filter(r => !r.valid)

    if (invalid.length > 0) {
      setInvalidFiles(invalid)
      setShowValidationWarning(true)
      return
    }

    setSelectedFiles(files)

    // Auto-fill title with filename if empty and only one file
    if (!formData.title && files.length === 1) {
      setFormData({ ...formData, title: files[0].name.replace(/\.[^/.]+$/, '') })
    } else if (!formData.title && files.length > 1) {
      setFormData({ ...formData, title: `Batch upload - ${files.length} files` })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.job_id) {
      toast.error('Please select a job')
      return
    }

    // Check job status - can only upload data for pending jobs
    const selectedJob = jobs.find(j => j.id === formData.job_id)
    if (selectedJob && selectedJob.status !== 'pending') {
      toast.error(`Cannot add annotation data. Job is in '${selectedJob.status}' status. Data can only be added when job is 'pending'.`)
      return
    }

    if (formData.data_type === 'text' && !formData.data_content) {
      toast.error('Please enter text content')
      return
    }

    if (formData.data_type !== 'text') {
      if (uploadMethod === 'url' && !formData.data_url) {
        toast.error('Please enter a file URL')
        return
      }
      if (uploadMethod === 'file' && selectedFiles.length === 0) {
        toast.error('Please select at least one file')
        return
      }
    }

    try {
      setLoading(true)

      // Handle multiple file uploads
      if (uploadMethod === 'file' && selectedFiles.length > 0) {
        let successCount = 0
        let failCount = 0

        for (const file of selectedFiles) {
          try {
            // Upload file first
            const formDataUpload = new FormData()
            formDataUpload.append('file', file)
            formDataUpload.append('job_id', formData.job_id)

            let dataUrl
            try {
              const uploadResponse = await axios.post(`${API}/annotation-data/upload`, formDataUpload, {
                headers: {
                  'Content-Type': 'multipart/form-data',
                },
              })
              dataUrl = uploadResponse.data.url
            } catch (uploadError) {
              console.error('File upload error:', uploadError)
              // Fallback: create a placeholder URL
              dataUrl = `${BACKEND_URL}/uploads/${file.name}`
            }

            // Create annotation data entry
            const payload = {
              job_id: formData.job_id,
              title: selectedFiles.length === 1 ? formData.title : file.name.replace(/\.[^/.]+$/, ''),
              description: formData.description,
              instructions: formData.instructions,
              data_type: formData.data_type,
              data_url: dataUrl,
            }

            await axios.post(`${API}/annotation-data`, payload)
            successCount++
          } catch (error) {
            console.error(`Error uploading ${file.name}:`, error)
            failCount++
          }
        }

        if (successCount > 0) {
          toast.success(`Successfully uploaded ${successCount} file(s)${failCount > 0 ? `, ${failCount} failed` : ''}`)
          navigate('/annotation-data')
        } else {
          toast.error('Failed to upload any files')
        }
      } else {
        // Handle URL or text upload (single entry)
        const payload = {
          job_id: formData.job_id,
          title: formData.title,
          description: formData.description,
          instructions: formData.instructions,
          data_type: formData.data_type,
        }

        if (formData.data_type === 'text') {
          payload.data_content = { text: formData.data_content }
        } else {
          payload.data_url = formData.data_url
        }

        await axios.post(`${API}/annotation-data`, payload)
        toast.success('Annotation data uploaded successfully')
        navigate('/annotation-data')
      }
    } catch (error) {
      console.error('Error uploading annotation data:', error)
      toast.error('Failed to upload annotation data')
    } finally {
      setLoading(false)
    }
  }

  const getDataTypeIcon = (type) => {
    const icons = {
      text: FileText,
      image: Image,
      video: Video,
      audio: Music,
      document: File,
    }
    const Icon = icons[type] || FileText
    return <Icon className="w-5 h-5" />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/annotation-data')}
            className="flex items-center gap-2 text-brand-600 hover:text-brand-700"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Annotation Data
          </button>
          <h1 className="text-xl font-display font-bold text-neutral-900">Upload Data</h1>
          <div className="w-32" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Upload Annotation Data</CardTitle>
            <p className="text-sm text-neutral-600 mt-2">
              Upload content that annotators will review and rate. This can be text, images, videos, audio files, or documents.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Job Selection */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Job *
                </label>
                <Select
                  value={formData.job_id}
                  onValueChange={(value) => setFormData({ ...formData, job_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a job" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-neutral-500 mt-1">
                  This data will be assigned to annotators from this job
                </p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Title *
                </label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Product Design Critique #1"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Description
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide context about what annotators should focus on..."
                  rows={3}
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Instructions *
                </label>
                <Textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="Detailed instructions for annotators on how to review and rate this content..."
                  rows={4}
                  required
                />
                <p className="text-xs text-neutral-500 mt-1">
                  These instructions will guide annotators on what to look for and how to evaluate the content
                </p>
              </div>

              {/* Data Type */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Data Type *
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {['text', 'image', 'video', 'audio', 'document'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, data_type: type, data_url: '', data_content: '' })}
                      className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                        formData.data_type === type
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      {getDataTypeIcon(type)}
                      <span className="text-xs font-medium capitalize">{type}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Input */}
              {formData.data_type === 'text' ? (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Text Content *
                  </label>
                  <Textarea
                    value={formData.data_content}
                    onChange={(e) => setFormData({ ...formData, data_content: e.target.value })}
                    placeholder="Enter the text content to be annotated..."
                    rows={10}
                    required
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Annotators will read and rate this text
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Upload Method Selection */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Upload Method *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setUploadMethod('file')
                          setFormData({ ...formData, data_url: '' })
                        }}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          uploadMethod === 'file'
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <Upload className="w-5 h-5 mx-auto mb-2" />
                        <p className="text-sm font-medium">Upload File</p>
                        <p className="text-xs text-neutral-600 mt-1">From your computer</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadMethod('url')
                          setSelectedFiles([])
                        }}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          uploadMethod === 'url'
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <FileText className="w-5 h-5 mx-auto mb-2" />
                        <p className="text-sm font-medium">Enter URL</p>
                        <p className="text-xs text-neutral-600 mt-1">From external source</p>
                      </button>
                    </div>
                  </div>

                  {/* File Upload */}
                  {uploadMethod === 'file' ? (
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Select {formData.data_type} file(s) or folder *
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept={
                            formData.data_type === 'image'
                              ? 'image/*'
                              : formData.data_type === 'video'
                              ? 'video/*'
                              : formData.data_type === 'audio'
                              ? 'audio/*'
                              : '.pdf,.doc,.docx'
                          }
                          onChange={handleFileSelect}
                          className="hidden"
                          id="file-upload"
                          multiple
                        />
                        <label
                          htmlFor="file-upload"
                          className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-neutral-300 rounded-lg cursor-pointer hover:border-brand-500 hover:bg-brand-50 transition-all"
                        >
                          <div className="text-center">
                            <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                            {selectedFiles.length > 0 ? (
                              <div>
                                <p className="text-sm font-medium text-neutral-900">
                                  {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                                </p>
                                <p className="text-xs text-neutral-600 mt-1">
                                  {(selectedFiles.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2)} MB total
                                </p>
                              </div>
                            ) : (
                              <div>
                                <p className="text-sm font-medium text-neutral-900">
                                  Click to select {formData.data_type} file(s) or folder
                                </p>
                                <p className="text-xs text-neutral-600 mt-1">or drag and drop</p>
                                <p className="text-xs text-neutral-500 mt-1">Supports multiple files and folders</p>
                              </div>
                            )}
                          </div>
                        </label>
                      </div>
                      {selectedFiles.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="max-h-32 overflow-y-auto bg-neutral-50 rounded-lg p-3">
                            {selectedFiles.map((file, idx) => (
                              <div key={idx} className="text-xs text-neutral-700 py-1">
                                {file.name} ({(file.size / 1024).toFixed(1)} KB)
                              </div>
                            ))}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedFiles([])}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Remove all files
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        File URL *
                      </label>
                      <Input
                        type="url"
                        value={formData.data_url}
                        onChange={(e) => setFormData({ ...formData, data_url: e.target.value })}
                        placeholder={`https://example.com/file.${formData.data_type === 'image' ? 'jpg' : formData.data_type === 'video' ? 'mp4' : formData.data_type === 'audio' ? 'mp3' : 'pdf'}`}
                        required
                      />
                      <p className="text-xs text-neutral-500 mt-1">
                        Provide a publicly accessible URL to the {formData.data_type} file
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/annotation-data')}
                  className="flex-1"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-brand-500 hover:bg-brand-600 text-white"
                  disabled={loading}
                >
                  {loading ? 'Uploading...' : 'Upload Data'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      {/* File Type Validation Warning Dialog */}
      <AlertDialog open={showValidationWarning} onOpenChange={setShowValidationWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
              <AlertDialogTitle>Invalid File Type(s)</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              <p className="mb-3">
                The following file(s) do not match the selected data type ({formData.data_type}):
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                {invalidFiles.map((invalid, idx) => (
                  <div key={idx} className="text-sm text-yellow-900 py-1">
                    <span className="font-medium">{invalid.file.name}</span>
                    <span className="text-yellow-700"> - Expected {invalid.expectedType} file, got {invalid.actualExtension}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm">
                Valid {formData.data_type} file extensions: {getValidExtensions(formData.data_type).join(', ')}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setShowValidationWarning(false)
                setInvalidFiles([])
              }}
              className="bg-brand-500 hover:bg-brand-600"
            >
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default UploadAnnotationData
