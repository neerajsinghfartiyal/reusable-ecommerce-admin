import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  deleteMedia,
  getMedia,
  updateMedia,
  uploadMedia,
} from '../api/mediaApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ModuleActions from '@/components/admin-ui/ModuleActions'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import ModuleEmptyState from '@/components/admin-ui/ModuleEmptyState'
import ModuleHeader from '@/components/admin-ui/ModuleHeader'
import ModuleToolbar from '@/components/admin-ui/ModuleToolbar'
import Pagination from '../components/ui/Pagination'

const typeFilters = ['all', 'image', 'video', 'document', 'other']

const getNumberValue = (...values) => {
  for (const value of values) {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return 0
}

const extractList = (response) => {
  const checks = [
    response?.data?.media,
    response?.media,
    response?.data?.data?.media,
    response?.data?.items,
    response?.items,
    response?.data,
    response,
  ]
  for (const value of checks) {
    if (Array.isArray(value)) return value
  }
  return []
}

const extractPagination = (response) =>
  response?.data?.data?.pagination ||
  response?.data?.pagination ||
  response?.pagination ||
  {}

const getMediaType = (item) => {
  const rawType = String(item?.type || '').toLowerCase()
  const mimeType = String(item?.mimeType || '').toLowerCase()

  if (['image', 'video', 'document', 'other'].includes(rawType)) return rawType
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('word') ||
    mimeType.includes('sheet') ||
    mimeType.includes('text')
  ) {
    return 'document'
  }
  return rawType || 'other'
}

const getImageUrl = (fileUrl) => {
  if (!fileUrl) return ''
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) return fileUrl
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
  return `${baseUrl}${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`
}

const formatFileSizeKb = (size) => `${(getNumberValue(size, 0) / 1024).toFixed(2)} KB`

function MediaLibrary() {
  const location = useLocation()
  const [mediaItems, setMediaItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [selectedMediaId, setSelectedMediaId] = useState('')
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [folderFilter, setFolderFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    totalItems: 0,
    currentPage: 1,
    totalPages: 1,
    pageLimit: 12,
  })
  const [uploadForm, setUploadForm] = useState({
    file: null,
    folder: 'general',
    title: '',
    altText: '',
  })
  const [editForm, setEditForm] = useState({
    title: '',
    altText: '',
    folder: 'general',
    isActive: true,
  })
  const [imageLoadErrors, setImageLoadErrors] = useState({})
  const [copyUrlMessage, setCopyUrlMessage] = useState('')

  const loadMedia = async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page: currentPage }
      if (searchQuery) params.search = searchQuery
      if (folderFilter !== 'all') params.folder = folderFilter
      if (typeFilter !== 'all') params.type = typeFilter

      const response = await getMedia(params)
      const list = extractList(response)
      const paginationData = extractPagination(response)

      setMediaItems(list)
      setImageLoadErrors({})
      setPagination({
        totalItems: getNumberValue(
          paginationData?.totalMedia,
          paginationData?.totalItems,
          response?.data?.data?.totalMedia,
          response?.data?.data?.totalItems,
          response?.data?.totalMedia,
          response?.data?.totalItems,
          list.length,
        ),
        currentPage: Math.max(
          1,
          getNumberValue(
            paginationData?.currentPage,
            response?.data?.data?.currentPage,
            response?.data?.currentPage,
            currentPage,
          ),
        ),
        totalPages: Math.max(
          1,
          getNumberValue(
            paginationData?.totalPages,
            response?.data?.data?.totalPages,
            response?.data?.totalPages,
            1,
          ),
        ),
        pageLimit: getNumberValue(
          paginationData?.pageLimit,
          response?.data?.data?.pageLimit,
          response?.data?.pageLimit,
          12,
        ),
      })
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load media library.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMedia()
  }, [currentPage, searchQuery, folderFilter, typeFilter, location.pathname])

  useEffect(() => {
    if (!isDetailsOpen || !selectedMediaId) return
    const selectedStillExists = mediaItems.some(
      (item) => (item?._id || item?.id) === selectedMediaId,
    )
    if (!selectedStillExists) {
      setSelectedMediaId('')
      setIsDetailsOpen(false)
    }
  }, [mediaItems, isDetailsOpen, selectedMediaId])

  const folderOptions = useMemo(() => {
    const values = new Set(['general'])
    mediaItems.forEach((item) => {
      const folder = String(item?.folder || '').trim()
      if (folder) values.add(folder)
    })
    return Array.from(values)
  }, [mediaItems])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setCurrentPage(1)
    setSearchQuery(searchInput.trim())
  }

  const handleUpload = async (event) => {
    event.preventDefault()
    if (!uploadForm.file) {
      setError('Please select a file to upload.')
      return
    }

    const formData = new FormData()
    formData.append('file', uploadForm.file)
    formData.append('folder', uploadForm.folder || 'general')
    formData.append('title', uploadForm.title || '')
    formData.append('altText', uploadForm.altText || '')

    setUploading(true)
    setError('')
    setSuccessMessage('')
    try {
      await uploadMedia(formData)
      setSuccessMessage('Media uploaded successfully.')
      setUploadForm({
        file: null,
        folder: 'general',
        title: '',
        altText: '',
      })
      const fileInput = document.getElementById('media-upload-input')
      if (fileInput) fileInput.value = ''
      setShowUploadForm(false)
      await loadMedia()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to upload media.')
    } finally {
      setUploading(false)
    }
  }

  const openDetails = (item) => {
    const mediaId = item?._id || item?.id || ''
    setSelectedMediaId(mediaId)
    setIsDetailsOpen(true)
    setEditForm({
      title: item?.title || '',
      altText: item?.altText || '',
      folder: item?.folder || 'general',
      isActive:
        typeof item?.isActive === 'boolean'
          ? item.isActive
          : String(item?.status || 'active').toLowerCase() === 'active',
    })
  }

  const closeDetails = () => {
    setIsDetailsOpen(false)
    setCopyUrlMessage('')
    setEditForm({
      title: '',
      altText: '',
      folder: 'general',
      isActive: true,
    })
  }

  const handleSaveEdit = async (id) => {
    if (!id) return
    setSaving(true)
    setError('')
    setSuccessMessage('')
    try {
      await updateMedia(id, {
        title: editForm.title.trim(),
        altText: editForm.altText.trim(),
        folder: editForm.folder.trim() || 'general',
        isActive: editForm.isActive,
      })
      setSuccessMessage('Media updated successfully.')
      closeDetails()
      await loadMedia()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update media.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    const id = item?._id || item?.id
    if (!id) return
    const ok = window.confirm(
      `Delete "${item?.originalName || item?.fileName || 'this file'}"?`,
    )
    if (!ok) return

    setDeletingId(id)
    setError('')
    setSuccessMessage('')
    try {
      await deleteMedia(id)
      setSuccessMessage('Media deleted successfully.')
      if (selectedMediaId === id) closeDetails()
      await loadMedia()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete media.')
    } finally {
      setDeletingId('')
    }
  }

  const goPrev = () => setCurrentPage((prev) => Math.max(1, prev - 1))
  const goNext = () =>
    setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))

  const handleCopyUrl = async () => {
    if (!selectedMediaFileUrl) return
    const fullUrl = getImageUrl(selectedMediaFileUrl)

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullUrl)
      } else {
        const tempInput = document.createElement('textarea')
        tempInput.value = fullUrl
        document.body.appendChild(tempInput)
        tempInput.select()
        document.execCommand('copy')
        document.body.removeChild(tempInput)
      }
      setCopyUrlMessage('URL copied')
      setTimeout(() => setCopyUrlMessage(''), 1800)
    } catch {
      setCopyUrlMessage('Could not copy URL')
      setTimeout(() => setCopyUrlMessage(''), 1800)
    }
  }

  const markImageError = (id) => {
    if (!id) return
    setImageLoadErrors((prev) => ({ ...prev, [id]: true }))
  }

  const selectedMedia = mediaItems.find(
    (item) => (item?._id || item?.id) === selectedMediaId,
  )
  const selectedMediaType = selectedMedia ? getMediaType(selectedMedia) : 'other'
  const selectedMediaIsImage = selectedMediaType === 'image'
  const selectedMediaStatus =
    typeof selectedMedia?.isActive === 'boolean'
      ? selectedMedia.isActive
        ? 'active'
        : 'inactive'
      : String(selectedMedia?.status || 'inactive').toLowerCase()
  const selectedMediaFileUrl = selectedMedia?.fileUrl || selectedMedia?.filePath || ''
  const selectedMediaName =
    selectedMedia?.originalName || selectedMedia?.fileName || 'Untitled file'

  return (
    <section>
      <ModuleHeader
        title="Media Library"
        description="Upload, browse, and manage media files used across the store."
      />

      <ModuleCard
        title="Media Upload"
        actions={
          <Button
            type="button"
            size="sm"
            onClick={() => setShowUploadForm((prev) => !prev)}
          >
            {showUploadForm ? 'Hide Upload Form' : 'Upload New Media'}
          </Button>
        }
      >

        {showUploadForm ? (
          <form onSubmit={handleUpload}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">File</label>
                <Input
                  id="media-upload-input"
                  type="file"
                  onChange={(event) =>
                    setUploadForm((prev) => ({
                      ...prev,
                      file: event.target.files?.[0] || null,
                    }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Folder</label>
                <Input
                  type="text"
                  value={uploadForm.folder}
                  onChange={(event) =>
                    setUploadForm((prev) => ({ ...prev, folder: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
                <Input
                  type="text"
                  value={uploadForm.title}
                  onChange={(event) =>
                    setUploadForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Alt Text</label>
                <Input
                  type="text"
                  value={uploadForm.altText}
                  onChange={(event) =>
                    setUploadForm((prev) => ({ ...prev, altText: event.target.value }))
                  }
                />
              </div>
            </div>
            <ModuleActions className="mt-4 justify-end">
              <Button type="submit" size="sm" disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload Media'}
              </Button>
            </ModuleActions>
          </form>
        ) : null}
      </ModuleCard>

      <ModuleToolbar>
        <form className="flex w-full flex-col gap-2 sm:flex-row sm:items-center" onSubmit={handleSearchSubmit}>
          <Input
            type="text"
            placeholder="Search media by name, title, alt text..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <Button type="submit" size="sm">
            Search
          </Button>
        </form>
        <select
          className="flex h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          value={folderFilter}
          onChange={(event) => {
            setCurrentPage(1)
            setFolderFilter(event.target.value)
          }}
        >
          <option value="all">all folders</option>
          {folderOptions.map((folder) => (
            <option key={folder} value={folder}>
              {folder}
            </option>
          ))}
        </select>
        <select
          className="flex h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          value={typeFilter}
          onChange={(event) => {
            setCurrentPage(1)
            setTypeFilter(event.target.value)
          }}
        >
          {typeFilters.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </ModuleToolbar>

      {loading ? (
        <ModuleCard>
          <p className="text-sm text-slate-600">Loading media...</p>
        </ModuleCard>
      ) : null}

      {error ? (
        <ModuleCard className="mb-3 border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
        </ModuleCard>
      ) : null}

      {successMessage ? (
        <ModuleCard className="mb-3 border-blue-200 bg-blue-50">
          <p className="text-sm text-blue-700">{successMessage}</p>
        </ModuleCard>
      ) : null}

      {!loading && !error ? (
        <>
          {mediaItems.length === 0 ? (
            <ModuleEmptyState
              title="No media files found"
              description="Upload media files or adjust filters to see items here."
            />
          ) : (
            <div className="media-grid">
              {mediaItems.map((item, index) => {
                const id = item?._id || item?.id || `media-${index}`
                const type = getMediaType(item)
                const isImage = type === 'image'
                const fileUrl = item?.fileUrl || item?.filePath || item?.url || item?.path || ''
                const displayName = item?.originalName || item?.fileName || 'Media'
                const isSelected = selectedMediaId === id
                const showImage = isImage && fileUrl && !imageLoadErrors[id]

                return (
                  <div
                    className={`media-card media-thumb-button relative group ${isSelected ? 'media-card-selected' : ''}`}
                    key={id}
                    title={displayName}
                  >
                    <button
                      type="button"
                      className="h-full w-full"
                      onClick={() => openDetails(item)}
                    >
                      {showImage ? (
                        <img
                          src={getImageUrl(fileUrl)}
                          alt={item?.altText || displayName}
                          className="media-thumb"
                          onError={() => markImageError(id)}
                        />
                      ) : (
                        <div className="media-thumb media-thumb-fallback">
                          {isImage ? 'IMG' : type.toUpperCase()}
                        </div>
                      )}
                    </button>
                    <div className="absolute inset-x-2 bottom-2 flex items-center justify-end gap-2 rounded-md bg-black/55 p-1 opacity-0 transition group-hover:opacity-100">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 px-2 text-xs"
                        onClick={() => openDetails(item)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="h-7 px-2 text-xs"
                        disabled={deletingId === id}
                        onClick={() => handleDelete(item)}
                      >
                        {deletingId === id ? '...' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {isDetailsOpen && selectedMedia ? (
            <div className="media-modal-overlay" onClick={closeDetails}>
              <div
                className="media-modal admin-card"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="media-modal-header">
                  <h2 className="setup-title">Attachment Details</h2>
                  <Button type="button" size="sm" onClick={closeDetails}>
                    Close
                  </Button>
                </div>

                <div className="media-modal-preview-wrap">
                  {selectedMediaIsImage && selectedMediaFileUrl && !imageLoadErrors[selectedMediaId] ? (
                    <img
                      src={getImageUrl(selectedMediaFileUrl)}
                      alt={selectedMedia?.altText || selectedMediaName}
                      className="media-modal-preview"
                      onError={() => markImageError(selectedMediaId)}
                    />
                  ) : (
                    <div className="media-modal-preview media-thumb-fallback">
                      {selectedMediaType.toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="media-modal-meta">
                  <p className="media-meta"><strong>File:</strong> {selectedMediaName}</p>
                  <p className="media-meta">
                    <strong>URL:</strong> {selectedMediaFileUrl || '-'}
                  </p>
                  <div className="media-copy-row">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCopyUrl}
                      disabled={!selectedMediaFileUrl}
                    >
                      Copy URL
                    </Button>
                    {copyUrlMessage ? (
                      <span className="media-copy-text">{copyUrlMessage}</span>
                    ) : null}
                  </div>
                  <p className="media-meta">
                    <strong>Folder:</strong> {selectedMedia?.folder || 'general'}
                  </p>
                  <p className="media-meta">
                    <strong>Type:</strong> {selectedMedia?.type || selectedMedia?.mimeType || 'other'}
                  </p>
                  <p className="media-meta">
                    <strong>Size:</strong> {formatFileSizeKb(selectedMedia?.size)}
                  </p>
                  <p className="media-meta">
                    <strong>Status:</strong>{' '}
                    <span className={`status-badge media-${selectedMediaStatus}`}>
                      {selectedMediaStatus}
                    </span>
                  </p>
                  <p className="media-meta">
                    <strong>Created:</strong>{' '}
                    {selectedMedia?.createdAt
                      ? new Date(selectedMedia.createdAt).toLocaleString()
                      : '-'}
                  </p>
                </div>

                <div className="media-edit-form">
                  <div className="field-group">
                    <label className="field-label">Title</label>
                    <Input
                      type="text"
                      value={editForm.title}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, title: event.target.value }))
                      }
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Alt Text</label>
                    <Input
                      type="text"
                      value={editForm.altText}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, altText: event.target.value }))
                      }
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Folder</label>
                    <Input
                      type="text"
                      value={editForm.folder}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, folder: event.target.value }))
                      }
                    />
                  </div>
                  <label className="setup-checkbox">
                    <input
                      type="checkbox"
                      checked={editForm.isActive}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          isActive: event.target.checked,
                        }))
                      }
                    />
                    Active
                  </label>
                </div>

                <div className="media-actions">
                  <Button
                    type="button"
                    size="sm"
                    disabled={saving}
                    onClick={() => handleSaveEdit(selectedMediaId)}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={deletingId === selectedMediaId}
                    onClick={() => handleDelete(selectedMedia)}
                  >
                    {deletingId === selectedMediaId ? 'Deleting...' : 'Delete'}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={closeDetails}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPrevious={goPrev}
            onNext={goNext}
          />
        </>
      ) : null}
    </section>
  )
}

export default MediaLibrary
