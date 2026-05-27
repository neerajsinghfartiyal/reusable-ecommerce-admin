import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  deleteMedia,
  getMedia,
  getMediaUsage,
  updateMedia,
  uploadMedia,
} from '../api/mediaApi'
import AdminAlert from '@/components/admin-ui/AdminAlert'
import AdminFilterBar from '@/components/admin-ui/AdminFilterBar'
import AdminFilterField from '@/components/admin-ui/AdminFilterField'
import AdminField from '@/components/admin-ui/AdminField'
import AdminPage from '@/components/admin-ui/AdminPage'
import AdminPagination from '@/components/admin-ui/AdminPagination'
import AdminSelect from '@/components/admin-ui/AdminSelect'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import ModuleActions from '@/components/admin-ui/ModuleActions'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import ModuleEmptyState from '@/components/admin-ui/ModuleEmptyState'
import ModuleFormGrid from '@/components/admin-ui/ModuleFormGrid'
import ModuleStatusBadge from '@/components/admin-ui/ModuleStatusBadge'
import PageLoading from '@/components/admin-ui/PageLoading'
const typeFilters = ['all', 'image', 'video', 'document', 'other']

const getTypeFilterLabel = (type) => {
  if (type === 'all') {
    return 'All types'
  }

  return type.charAt(0).toUpperCase() + type.slice(1)
}

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

const getUsageFieldLabel = (field, position) => {
  if (field === 'featuredImage') return 'Featured image'
  if (field === 'galleryImages') {
    const slot =
      typeof position === 'number' && Number.isFinite(position) ? position + 1 : null
    return slot ? `Gallery image (slot ${slot})` : 'Gallery image'
  }
  return field || 'Image'
}

const extractUsagePayload = (response) =>
  response?.data?.data || response?.data || {}

const formatUsageReferenceLabel = (count) => {
  const total = getNumberValue(count)
  if (total <= 0) return 'Unused'
  return total === 1 ? '1 reference' : `${total} references`
}

const isMediaUsed = (item, usageCountOverride) => {
  const count =
    usageCountOverride !== undefined
      ? getNumberValue(usageCountOverride)
      : getNumberValue(item?.usageCount)
  if (typeof item?.isUsed === 'boolean') {
    return item.isUsed
  }
  return count > 0
}

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
  const [usageState, setUsageState] = useState({
    loading: false,
    error: '',
    usageCount: 0,
    usages: [],
  })
  const [deleteBlocked, setDeleteBlocked] = useState({
    message: '',
    usageCount: 0,
    usages: [],
  })

  const loadMedia = async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page: currentPage, includeUsage: true }
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

  useEffect(() => {
    if (!isDetailsOpen || !selectedMediaId) {
      setUsageState({
        loading: false,
        error: '',
        usageCount: 0,
        usages: [],
      })
      return undefined
    }

    let cancelled = false

    const loadUsage = async () => {
      setUsageState((prev) => ({
        ...prev,
        loading: true,
        error: '',
      }))

      try {
        const response = await getMediaUsage(selectedMediaId)
        const data = extractUsagePayload(response)
        if (cancelled) return

        setUsageState({
          loading: false,
          error: '',
          usageCount: getNumberValue(data?.usageCount, data?.usages?.length),
          usages: Array.isArray(data?.usages) ? data.usages : [],
        })
      } catch (err) {
        if (cancelled) return
        setUsageState({
          loading: false,
          error: err?.response?.data?.message || 'Failed to load media usage.',
          usageCount: 0,
          usages: [],
        })
      }
    }

    loadUsage()

    return () => {
      cancelled = true
    }
  }, [isDetailsOpen, selectedMediaId])

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
    setDeleteBlocked({ message: '', usageCount: 0, usages: [] })
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
    setDeleteBlocked({ message: '', usageCount: 0, usages: [] })
    setUsageState({
      loading: false,
      error: '',
      usageCount: 0,
      usages: [],
    })
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

    const deactivatingWhileUsed =
      selectedMediaInUse && editForm.isActive === false

    if (deactivatingWhileUsed) {
      setDeleteBlocked({
        message:
          'This media is used by products and cannot be deactivated.',
        usageCount: usageState.usageCount,
        usages: usageState.usages,
      })
      setError('')
      setSuccessMessage('')
      return
    }

    setSaving(true)
    setError('')
    setSuccessMessage('')
    setDeleteBlocked({ message: '', usageCount: 0, usages: [] })
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
      if (err?.response?.status === 409) {
        const payload = err?.response?.data?.data || {}
        const usages = Array.isArray(payload?.usages) ? payload.usages : []
        setDeleteBlocked({
          message:
            err?.response?.data?.message ||
            'This media is used by products and cannot be deactivated.',
          usageCount: getNumberValue(payload?.usageCount, usages.length),
          usages,
        })
        setError('')
      } else {
        setDeleteBlocked({ message: '', usageCount: 0, usages: [] })
        setError(err?.response?.data?.message || 'Failed to update media.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    const id = item?._id || item?.id
    if (!id) return

    const inUse =
      selectedMediaId === id && usageState.usageCount > 0
        ? true
        : isMediaUsed(item)

    if (inUse) {
      const count =
        selectedMediaId === id ? usageState.usageCount : getNumberValue(item?.usageCount)
      setDeleteBlocked({
        message:
          'This media is used by products and cannot be deleted until it is removed or replaced.',
        usageCount: count,
        usages:
          selectedMediaId === id && usageState.usages.length
            ? usageState.usages
            : [],
      })
      setError('')
      setSuccessMessage('')
      return
    }

    const ok = window.confirm(
      `Delete "${item?.originalName || item?.fileName || 'this file'}"?`,
    )
    if (!ok) return

    setDeletingId(id)
    setError('')
    setSuccessMessage('')
    setDeleteBlocked({ message: '', usageCount: 0, usages: [] })
    try {
      await deleteMedia(id)
      setSuccessMessage('Media deleted successfully.')
      if (selectedMediaId === id) closeDetails()
      await loadMedia()
    } catch (err) {
      if (err?.response?.status === 409) {
        const payload = err?.response?.data?.data || {}
        const usages = Array.isArray(payload?.usages) ? payload.usages : []
        setDeleteBlocked({
          message:
            err?.response?.data?.message ||
            'Media is currently used and cannot be deleted.',
          usageCount: getNumberValue(payload?.usageCount, usages.length),
          usages,
        })
        setError('')
      } else {
        setDeleteBlocked({ message: '', usageCount: 0, usages: [] })
        setError(err?.response?.data?.message || 'Failed to delete media.')
      }
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
  const selectedMediaInUse = isMediaUsed(selectedMedia, usageState.usageCount)

  return (
    <AdminPage
      headerMode="hidden"
      title="Media Library"
      description="Upload, browse, and manage media files used across the store."
    >
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
            <ModuleFormGrid columns={2}>
              <AdminField label="File" required>
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
              </AdminField>

              <AdminField label="Folder">
                <Input
                  type="text"
                  value={uploadForm.folder}
                  onChange={(event) =>
                    setUploadForm((prev) => ({ ...prev, folder: event.target.value }))
                  }
                />
              </AdminField>

              <AdminField label="Title">
                <Input
                  type="text"
                  value={uploadForm.title}
                  onChange={(event) =>
                    setUploadForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
              </AdminField>

              <AdminField label="Alt Text">
                <Input
                  type="text"
                  value={uploadForm.altText}
                  onChange={(event) =>
                    setUploadForm((prev) => ({ ...prev, altText: event.target.value }))
                  }
                />
              </AdminField>
            </ModuleFormGrid>

            <ModuleActions className="mt-4 justify-end">
              <Button type="submit" size="sm" disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload Media'}
              </Button>
            </ModuleActions>
          </form>
        ) : null}
      </ModuleCard>

      <AdminFilterBar>
        <AdminFilterField variant="search" label="Search">
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
            onSubmit={handleSearchSubmit}
          >
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
        </AdminFilterField>

        <AdminFilterField label="Folder">
          <AdminSelect
            value={folderFilter}
            aria-label="Filter by folder"
            onChange={(event) => {
              setCurrentPage(1)
              setFolderFilter(event.target.value)
            }}
          >
            <option value="all">All folders</option>
            {folderOptions.map((folder) => (
              <option key={folder} value={folder}>
                {folder}
              </option>
            ))}
          </AdminSelect>
        </AdminFilterField>

        <AdminFilterField label="Type" className="sm:w-[160px]">
          <AdminSelect
            value={typeFilter}
            aria-label="Filter by media type"
            onChange={(event) => {
              setCurrentPage(1)
              setTypeFilter(event.target.value)
            }}
          >
            {typeFilters.map((type) => (
              <option key={type} value={type}>
                {getTypeFilterLabel(type)}
              </option>
            ))}
          </AdminSelect>
        </AdminFilterField>
      </AdminFilterBar>

      {loading ? <PageLoading message="Loading media files..." /> : null}

      {error ? (
        <AdminAlert type="error" title="Request failed">
          {error}
        </AdminAlert>
      ) : null}

      {deleteBlocked.message ? (
        <AdminAlert type="error" title="Action blocked">
          <p className="text-sm">{deleteBlocked.message}</p>
          {deleteBlocked.usageCount > 0 ? (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Used in {formatUsageReferenceLabel(deleteBlocked.usageCount)} on products.
            </p>
          ) : null}
          {deleteBlocked.usages.length > 0 ? (
            <ul className="mt-3 max-h-36 space-y-2 overflow-y-auto">
              {deleteBlocked.usages.map((usage) => (
                <li
                  key={`${usage.entityType}-${usage.entityId}-${usage.field}-${usage.position ?? ''}`}
                  className="rounded-md border border-slate-200/80 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/60"
                >
                  <span className="font-medium text-slate-950 dark:text-slate-50">
                    {usage.entityLabel || 'Unnamed product'}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-600 dark:text-slate-400">
                    {getUsageFieldLabel(usage.field, usage.position)}
                  </span>
                  {usage.editUrl ? (
                    <Link
                      to={usage.editUrl}
                      className="mt-1 inline-block text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Edit product
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </AdminAlert>
      ) : null}

      {successMessage ? (
        <AdminAlert type="success" title="Success">
          {successMessage}
        </AdminAlert>
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
                const usageCount = getNumberValue(item?.usageCount)
                const isUsed = isMediaUsed(item)

                return (
                  <div
                    className={`media-card media-thumb-button relative group ${isSelected ? 'media-card-selected' : ''}`}
                    key={id}
                    title={displayName}
                  >
                    <span
                      className={`absolute left-2 top-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        isUsed
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/70 dark:text-amber-100'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {isUsed
                        ? `Used${
                            usageCount > 0
                              ? ` · ${formatUsageReferenceLabel(usageCount)}`
                              : ''
                          }`
                        : 'Unused'}
                    </span>
                    <button
                      type="button"
                      className="media-thumb-button block h-full w-full cursor-pointer"
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
                        disabled={deletingId === id || isUsed}
                        title={
                          isUsed
                            ? 'This media is used by products and cannot be deleted.'
                            : 'Delete media'
                        }
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
                className="media-modal admin-card dark:border dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="media-modal-header">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Attachment Details
                  </h2>
                  <Button type="button" size="sm" variant="ghost" onClick={closeDetails}>
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
                  <p className="media-meta text-slate-700 dark:text-slate-300">
                    <strong className="text-slate-900 dark:text-slate-100">File:</strong>{' '}
                    {selectedMediaName}
                  </p>
                  <p className="media-meta text-slate-700 dark:text-slate-300">
                    <strong className="text-slate-900 dark:text-slate-100">URL:</strong>{' '}
                    {selectedMediaFileUrl || '-'}
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
                      <span className="media-copy-text text-slate-600 dark:text-slate-400">
                        {copyUrlMessage}
                      </span>
                    ) : null}
                  </div>
                  <p className="media-meta text-slate-700 dark:text-slate-300">
                    <strong className="text-slate-900 dark:text-slate-100">Folder:</strong>{' '}
                    {selectedMedia?.folder || 'general'}
                  </p>
                  <p className="media-meta text-slate-700 dark:text-slate-300">
                    <strong className="text-slate-900 dark:text-slate-100">Type:</strong>{' '}
                    {selectedMedia?.type || selectedMedia?.mimeType || 'other'}
                  </p>
                  <p className="media-meta text-slate-700 dark:text-slate-300">
                    <strong className="text-slate-900 dark:text-slate-100">Size:</strong>{' '}
                    {formatFileSizeKb(selectedMedia?.size)}
                  </p>
                  <p className="media-meta flex flex-wrap items-center gap-2 text-slate-700 dark:text-slate-300">
                    <strong className="text-slate-900 dark:text-slate-100">Status:</strong>
                    <ModuleStatusBadge status={selectedMediaStatus} />
                  </p>
                  <p className="media-meta text-slate-700 dark:text-slate-300">
                    <strong className="text-slate-900 dark:text-slate-100">Created:</strong>{' '}
                    {selectedMedia?.createdAt
                      ? new Date(selectedMedia.createdAt).toLocaleString()
                      : '-'}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                      Product usage
                    </h3>
                    {usageState.loading ? (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Loading...
                      </span>
                    ) : usageState.usageCount > 0 ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-900/50 dark:text-amber-100">
                        Used · {formatUsageReferenceLabel(usageState.usageCount)}
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        Unused
                      </span>
                    )}
                  </div>

                  {usageState.error ? (
                    <p className="text-sm text-rose-600 dark:text-rose-400">{usageState.error}</p>
                  ) : null}

                  {!usageState.loading && !usageState.error && usageState.usageCount > 0 ? (
                    <ul className="max-h-40 space-y-2 overflow-y-auto pr-1">
                      {usageState.usages.map((usage) => {
                        const usageKey = `${usage.entityType}-${usage.entityId}-${usage.field}-${usage.position ?? ''}`
                        return (
                          <li
                            key={usageKey}
                            className="flex flex-col gap-1 rounded-md border border-slate-200/80 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/80"
                          >
                            <span className="font-medium text-slate-950 dark:text-slate-50">
                              {usage.entityLabel || 'Unnamed product'}
                            </span>
                            <span className="text-xs text-slate-600 dark:text-slate-400">
                              {getUsageFieldLabel(usage.field, usage.position)}
                            </span>
                            {usage.editUrl ? (
                              <Link
                                to={usage.editUrl}
                                className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                              >
                                Edit product
                              </Link>
                            ) : null}
                          </li>
                        )
                      })}
                    </ul>
                  ) : null}

                  {!usageState.loading &&
                  !usageState.error &&
                  usageState.usageCount === 0 ? (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Not referenced by any product featured or gallery image.
                    </p>
                  ) : null}

                  {usageState.usageCount > 0 ? (
                    <p className="mt-3 text-xs text-amber-800 dark:text-amber-200/90">
                      This media is used by products and cannot be deleted until it is
                      removed or replaced.
                    </p>
                  ) : null}
                </div>

                <div className="media-edit-form">
                  <ModuleFormGrid columns={1}>
                    <AdminField label="Title">
                      <Input
                        type="text"
                        value={editForm.title}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, title: event.target.value }))
                        }
                      />
                    </AdminField>

                    <AdminField label="Alt Text">
                      <Input
                        type="text"
                        value={editForm.altText}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, altText: event.target.value }))
                        }
                      />
                    </AdminField>

                    <AdminField label="Folder">
                      <Input
                        type="text"
                        value={editForm.folder}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, folder: event.target.value }))
                        }
                      />
                    </AdminField>

                    <AdminField label="Active">
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <Checkbox
                          checked={editForm.isActive}
                          disabled={selectedMediaInUse}
                          onCheckedChange={(checked) =>
                            setEditForm((prev) => ({
                              ...prev,
                              isActive: checked === true,
                            }))
                          }
                        />
                        Active
                      </label>
                      {selectedMediaInUse ? (
                        <p className="mt-1 text-xs text-amber-800 dark:text-amber-200/90">
                          Active status cannot be turned off while this media is used by
                          products.
                        </p>
                      ) : null}
                    </AdminField>
                  </ModuleFormGrid>
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
                    disabled={deletingId === selectedMediaId || selectedMediaInUse}
                    title={
                      selectedMediaInUse
                        ? 'This media is used by products and cannot be deleted.'
                        : 'Delete media'
                    }
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

          <AdminPagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPrevious={goPrev}
            onNext={goNext}
            isPreviousDisabled={pagination.currentPage <= 1}
            isNextDisabled={pagination.currentPage >= pagination.totalPages}
          />
        </>
      ) : null}
    </AdminPage>
  )
}

export default MediaLibrary
