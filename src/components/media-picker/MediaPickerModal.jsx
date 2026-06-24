import { useCallback, useEffect, useMemo, useState } from 'react'
import { getMedia, uploadMedia } from '@/api/mediaApi'
import {
  dedupeGalleryMedia,
  enrichSelectionWithLibrary,
  isSameMediaAsset,
} from '@/components/media-picker/index.js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import MediaAssetGrid from './MediaAssetGrid'
import MediaUploadDropzone from './MediaUploadDropzone'
import { normalizeMediaAsset } from './normalizeMediaAsset'

const getNumberValue = (...values) => {
  for (const value of values) {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return 0
}

const extractMediaList = (response) => {
  const checks = [
    response?.data?.media,
    response?.media,
    response?.data?.data?.media,
    response?.data?.items,
    response?.items,
    response?.data?.data,
    response?.data,
    response,
  ]
  for (const value of checks) {
    if (Array.isArray(value)) return value
    if (value && typeof value === 'object' && !Array.isArray(value) && (value._id || value.id)) {
      return [value]
    }
  }
  return []
}

const extractPagination = (response) =>
  response?.data?.data?.pagination ||
  response?.data?.pagination ||
  response?.pagination ||
  {}

const extractUploadedMedia = (response) => {
  const single =
    response?.data?.data ||
    response?.data?.media ||
    (response?.data && !Array.isArray(response.data) ? response.data : null)
  if (single && typeof single === 'object' && (single._id || single.id)) return single
  return extractMediaList(response)[0] || null
}

function MediaPickerModal({
  open,
  onOpenChange,
  mode = 'multiple',
  selectedAssets = [],
  onConfirm,
  title = 'Select media',
  description = 'Choose from the library or upload new files.',
  maxSelection = 20,
  mediaType = 'image',
  defaultFolder = 'general',
  initialTab = 'library',
  uploadAccept,
}) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [draftSelection, setDraftSelection] = useState([])
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [folderFilter, setFolderFilter] = useState('all')
  const [mediaItems, setMediaItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [selectionWarning, setSelectionWarning] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    totalPages: 1,
    currentPage: 1,
  })

  const effectiveMax = mode === 'single' ? 1 : maxSelection

  const normalizedItems = useMemo(
    () => mediaItems.map(normalizeMediaAsset).filter(Boolean),
    [mediaItems],
  )

  const folderOptions = useMemo(() => {
    const values = new Set()
    if (defaultFolder) values.add(defaultFolder)
    normalizedItems.forEach((item) => {
      if (item.folder) values.add(item.folder)
    })
    return ['all', ...Array.from(values)]
  }, [normalizedItems, defaultFolder])

  const loadMedia = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page: currentPage }
      if (searchQuery) params.search = searchQuery
      if (folderFilter !== 'all') params.folder = folderFilter
      if (mediaType && mediaType !== 'all') params.type = mediaType

      const response = await getMedia(params)
      const list = extractMediaList(response)
      const paginationData = extractPagination(response)

      setMediaItems(list)
      setPagination({
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
      })
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load media.')
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchQuery, folderFilter, mediaType])

  useEffect(() => {
    if (!open) return
    setActiveTab(initialTab)
    setDraftSelection(dedupeGalleryMedia(selectedAssets))
    setSearchInput('')
    setSearchQuery('')
    setFolderFilter('all')
    setCurrentPage(1)
    setError('')
    setSelectionWarning('')
  }, [open, initialTab, selectedAssets])

  useEffect(() => {
    if (!open || activeTab !== 'library') return
    loadMedia()
  }, [open, activeTab, loadMedia])

  useEffect(() => {
    if (!open || activeTab !== 'library' || loading || !normalizedItems.length) return
    setDraftSelection((prev) =>
      dedupeGalleryMedia(enrichSelectionWithLibrary(prev, normalizedItems)),
    )
  }, [open, activeTab, loading, normalizedItems])

  const handleToggleAsset = (asset) => {
    setSelectionWarning('')

    if (mode === 'single') {
      setDraftSelection([asset])
      return
    }

    const exists = draftSelection.some((item) => isSameMediaAsset(item, asset))
    if (exists) {
      setDraftSelection(draftSelection.filter((item) => !isSameMediaAsset(item, asset)))
      return
    }

    if (effectiveMax > 0 && draftSelection.length >= effectiveMax) {
      setSelectionWarning(`You can select up to ${effectiveMax} items.`)
      return
    }

    setDraftSelection([...draftSelection, asset])
  }

  const handleUploadFiles = async (files, meta = {}) => {
    if (!files?.length) return

    setUploading(true)
    setError('')
    setSelectionWarning('')

    try {
      const uploadedAssets = []

      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', meta.folder || defaultFolder || 'general')
        formData.append('title', meta.title || '')
        formData.append('altText', meta.altText || '')

        const response = await uploadMedia(formData)
        const created = extractUploadedMedia(response)
        const normalized = normalizeMediaAsset(created)
        if (normalized) uploadedAssets.push(normalized)
      }

      if (uploadedAssets.length === 0) {
        throw new Error('Upload completed but no media was returned.')
      }

      setMediaItems((prev) => {
        const merged = [...uploadedAssets.map((a) => a.raw), ...prev]
        const seen = new Set()
        return merged.filter((item) => {
          const id = item?._id || item?.id
          if (!id || seen.has(id)) return false
          seen.add(id)
          return true
        })
      })

      setDraftSelection((prev) => {
        if (mode === 'single') {
          return [uploadedAssets[uploadedAssets.length - 1]]
        }
        const merged = dedupeGalleryMedia([...prev, ...uploadedAssets])
        if (effectiveMax > 0 && merged.length > effectiveMax) {
          setSelectionWarning(`Only the first ${effectiveMax} items were selected.`)
          return merged.slice(0, effectiveMax)
        }
        return merged
      })

      setActiveTab('library')
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to upload media.')
    } finally {
      setUploading(false)
    }
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setCurrentPage(1)
    setSearchQuery(searchInput.trim())
  }

  const handleCancel = () => {
    onOpenChange?.(false)
  }

  const handleConfirm = () => {
    if (draftSelection.length === 0) return
    onConfirm?.(dedupeGalleryMedia(draftSelection))
    onOpenChange?.(false)
  }

  const confirmDisabled = draftSelection.length === 0
  const selectionLabel =
    mode === 'single'
      ? draftSelection.length
        ? '1 selected'
        : 'None selected'
      : `${draftSelection.length} selected${effectiveMax ? ` / ${effectiveMax}` : ''}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[min(90vh,900px)] w-[calc(100vw-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-3rem)]',
          'border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950',
        )}
      >
        <DialogHeader className="border-b border-slate-200/80 px-6 py-4 dark:border-slate-800">
          <DialogTitle className="text-slate-900 dark:text-slate-100">{title}</DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex border-b border-slate-200/80 px-6 dark:border-slate-800">
          <button
            type="button"
            className={cn(
              'cursor-pointer border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === 'library'
                ? 'border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
            )}
            onClick={() => setActiveTab('library')}
          >
            Library
          </button>
          <button
            type="button"
            className={cn(
              'cursor-pointer border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === 'upload'
                ? 'border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
            )}
            onClick={() => setActiveTab('upload')}
          >
            Upload
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6">
          {activeTab === 'library' ? (
            <div className="space-y-4">
              <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={handleSearchSubmit}>
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor="media-picker-search"
                    className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
                  >
                    Search
                  </label>
                  <Input
                    id="media-picker-search"
                    type="search"
                    placeholder="Search media..."
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                  />
                </div>
                {folderOptions.length > 1 ? (
                  <div className="w-full sm:w-40">
                    <label
                      htmlFor="media-picker-folder-filter"
                      className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
                    >
                      Folder
                    </label>
                    <select
                      id="media-picker-folder-filter"
                      value={folderFilter}
                      onChange={(event) => {
                        setFolderFilter(event.target.value)
                        setCurrentPage(1)
                      }}
                      className="flex h-9 w-full cursor-pointer rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                      {folderOptions.map((folder) => (
                        <option key={folder} value={folder}>
                          {folder === 'all' ? 'All folders' : folder}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <Button type="submit" variant="secondary" size="sm">
                  Search
                </Button>
              </form>

              {error ? (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {error}
                </p>
              ) : null}
              {selectionWarning ? (
                <p className="text-sm text-amber-700 dark:text-amber-300" role="status">
                  {selectionWarning}
                </p>
              ) : null}

              <MediaAssetGrid
                items={normalizedItems}
                selectedAssets={draftSelection}
                loading={loading}
                mode={mode}
                maxSelection={effectiveMax}
                onToggleAsset={handleToggleAsset}
              />

              {pagination.totalPages > 1 ? (
                <div className="flex items-center justify-between gap-2 border-t border-slate-200/80 pt-3 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading || pagination.currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading || pagination.currentPage >= pagination.totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <MediaUploadDropzone
              onUploadFiles={handleUploadFiles}
              uploading={uploading}
              disabled={uploading}
              defaultFolder={defaultFolder}
              errorMessage={error}
              {...(uploadAccept ? { accept: uploadAccept } : {})}
            />
          )}
        </div>

        <DialogFooter className="flex-col gap-2 border-t border-slate-200/80 px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">{selectionLabel}</p>
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={confirmDisabled}>
              Confirm selection
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default MediaPickerModal
