const getApiBaseUrl = () =>
  String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '')

export const normalizeMediaUrlPath = (url) => {
  const trimmed = String(url || '').trim()
  if (!trimmed) return ''

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const { pathname } = new URL(trimmed)
      return pathname.replace(/\/+/g, '/').toLowerCase()
    }
  } catch {
    // ignore invalid absolute URL
  }

  const baseUrl = getApiBaseUrl()
  let path = trimmed
  if (baseUrl && path.startsWith(baseUrl)) {
    path = path.slice(baseUrl.length)
  }

  path = path.split('?')[0].split('#')[0]
  if (!path.startsWith('/')) path = `/${path}`
  return path.replace(/\/+/g, '/').toLowerCase()
}

export const isReliableMediaId = (value) => {
  const id = String(value || '').trim()
  if (!id) return false
  if (/^https?:\/\//i.test(id)) return false
  if (id.startsWith('/')) return false
  return /^[a-f\d]{24}$/i.test(id)
}

export const getReliableMediaIdFromAsset = (asset) => {
  if (!asset) return null
  const raw = asset.raw || {}
  const candidates = [asset.mediaId, asset.id, raw._id, raw.id]

  for (const value of candidates) {
    if (isReliableMediaId(value)) {
      return String(value).trim()
    }
  }

  return null
}

export const getAssetMatchKeys = (asset) => {
  const keys = new Set()
  if (!asset) return keys

  const raw = asset.raw || {}
  const candidates = [
    asset.mediaId,
    asset.id,
    asset.url,
    asset.fileUrl,
    raw._id,
    raw.id,
    raw.fileUrl,
    raw.url,
    raw.filePath,
  ]

  candidates.forEach((value) => {
    const str = String(value || '').trim()
    if (!str) return

    const path = normalizeMediaUrlPath(str)
    if (path) keys.add(`path:${path}`)

    if (isReliableMediaId(str)) keys.add(`id:${str}`)
  })

  return keys
}

export const isSameMediaAsset = (a, b) => {
  if (!a || !b) return false

  const keysA = getAssetMatchKeys(a)
  const keysB = getAssetMatchKeys(b)

  for (const key of keysA) {
    if (keysB.has(key)) return true
  }
  return false
}

export const isSameGalleryAsset = isSameMediaAsset

export const enrichSelectionWithLibrary = (selection = [], libraryItems = []) => {
  if (!Array.isArray(selection) || !selection.length) return []
  if (!Array.isArray(libraryItems) || !libraryItems.length) return selection

  return selection.map((selected) => {
    const match = libraryItems.find((item) => isSameMediaAsset(selected, item))
    return match || selected
  })
}

export const toStoredImageUrl = (url) => {
  const trimmed = String(url || '').trim()
  if (!trimmed) return ''
  const baseUrl = getApiBaseUrl()
  if (baseUrl && trimmed.startsWith(baseUrl)) {
    const relative = trimmed.slice(baseUrl.length)
    return relative.startsWith('/') ? relative : `/${relative}`
  }
  return trimmed
}

export const featuredMediaFromUrl = (url, mediaId = null) => {
  const storedUrl = toStoredImageUrl(url)
  if (!storedUrl) return null

  const reliableId = isReliableMediaId(mediaId) ? String(mediaId).trim() : null

  return {
    id: reliableId || storedUrl,
    mediaId: reliableId,
    url: storedUrl,
    title: 'Featured image',
  }
}

export const featuredMediaFromProduct = (product) => {
  const storedUrl = toStoredImageUrl(
    product?.featuredImage || product?.image || product?.thumbnail || '',
  )
  const rawMediaId = product?.featuredMediaId?._id || product?.featuredMediaId || null
  const reliableId = isReliableMediaId(rawMediaId) ? String(rawMediaId).trim() : null

  if (!storedUrl && !reliableId) {
    return null
  }

  return {
    id: reliableId || storedUrl,
    mediaId: reliableId,
    url: storedUrl,
    altText: '',
    title: 'Featured image',
  }
}

export const assetFromPickerSelection = (selected) => {
  if (!selected) return null

  const raw = selected.raw || {}
  const storedUrl = toStoredImageUrl(
    raw.fileUrl || raw.url || raw.filePath || selected.url || selected.fileUrl || '',
  )
  if (!storedUrl) return null

  const mediaId = getReliableMediaIdFromAsset({
    mediaId: selected.mediaId,
    id: selected.id,
    raw,
  })

  return {
    id: mediaId || storedUrl,
    mediaId,
    url: storedUrl,
    altText: selected.altText || '',
    title: selected.title || selected.fileName || 'Gallery image',
    ...(raw && Object.keys(raw).length ? { raw } : {}),
  }
}

export const dedupeImageUrls = (urls = []) => {
  if (!Array.isArray(urls)) return []
  const result = []
  const seen = new Set()

  urls.forEach((url) => {
    const stored = toStoredImageUrl(url)
    if (!stored) return

    const path = normalizeMediaUrlPath(stored)
    const key = path ? `path:${path}` : `url:${stored.toLowerCase()}`
    if (seen.has(key)) return

    seen.add(key)
    result.push(stored)
  })

  return result
}

export const getGalleryDisplayUrl = (storedUrl) => {
  const trimmed = String(storedUrl || '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const baseUrl = getApiBaseUrl()
  return `${baseUrl}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`
}

export const normalizeGalleryMediaItem = (item) => {
  if (!item) return null
  const raw = item.raw || {}
  const storedUrl = toStoredImageUrl(
    item.url || item.fileUrl || raw.fileUrl || raw.url || raw.filePath || '',
  )
  if (!storedUrl) return null

  const mediaId = getReliableMediaIdFromAsset({ ...item, raw })
  const id = mediaId || storedUrl

  return {
    id,
    mediaId,
    url: storedUrl,
    altText: item.altText || '',
    title: item.title || item.fileName || 'Gallery image',
    ...(raw && Object.keys(raw).length ? { raw } : {}),
  }
}

export const galleryMediaFromUrls = (urls = []) => {
  const items = (Array.isArray(urls) ? urls : [])
    .map((url) => {
      const storedUrl = toStoredImageUrl(url)
      if (!storedUrl) return null

      return {
        id: storedUrl,
        mediaId: null,
        url: storedUrl,
        title: 'Gallery image',
      }
    })
    .filter(Boolean)

  return dedupeGalleryMedia(items)
}

export const galleryMediaFromProduct = (urls = [], mediaIds = []) => {
  const urlList = Array.isArray(urls) ? urls : []
  const idList = Array.isArray(mediaIds) ? mediaIds : []

  const items = urlList
    .map((url, index) => {
      const storedUrl = toStoredImageUrl(url)
      if (!storedUrl) return null

      const rawId = idList[index]?._id || idList[index]
      const mediaId = isReliableMediaId(rawId) ? String(rawId).trim() : null

      return {
        id: mediaId || storedUrl,
        mediaId,
        url: storedUrl,
        title: 'Gallery image',
      }
    })
    .filter(Boolean)

  return dedupeGalleryMedia(items)
}

/** Index-aligned with galleryMedia / galleryImages; null = URL-only slot. */
export const galleryMediaToMediaIds = (galleryMedia = []) =>
  (Array.isArray(galleryMedia) ? galleryMedia : []).map((item) => {
    const mediaId = getReliableMediaIdFromAsset(item)
    return mediaId || null
  })

/** Derive URLs in galleryMedia order; caller should pass deduped galleryMedia. */
export const galleryMediaToUrls = (galleryMedia = []) =>
  (Array.isArray(galleryMedia) ? galleryMedia : []).map((item) =>
    toStoredImageUrl(item?.url || ''),
  )

export const canonicalGalleryMedia = (assets = [], max = 20) =>
  dedupeGalleryMedia(assets).slice(0, max)

export const pickerAssetToGalleryMedia = (selected) => assetFromPickerSelection(selected)

export const dedupeGalleryMedia = (assets = []) => {
  const result = []
  ;(Array.isArray(assets) ? assets : []).forEach((asset) => {
    const normalized = normalizeGalleryMediaItem(asset)
    if (!normalized) return
    if (result.some((item) => isSameGalleryAsset(item, normalized))) return
    result.push(normalized)
  })
  return result
}

export const appendUniqueGalleryMedia = (existing = [], incoming = [], max = 20) => {
  const normalizedIncoming = dedupeGalleryMedia(incoming)
  const novel = normalizedIncoming.filter(
    (item) =>
      !(Array.isArray(existing) ? existing : []).some((existingItem) =>
        isSameGalleryAsset(existingItem, item),
      ),
  )
  return dedupeGalleryMedia([...(Array.isArray(existing) ? existing : []), ...novel]).slice(
    0,
    max,
  )
}

export const mergeGalleryMedia = (existing = [], incoming = [], max = 20) =>
  appendUniqueGalleryMedia(existing, incoming, max)

export { default as MediaPickerModal } from './MediaPickerModal'
export { normalizeMediaAsset } from './normalizeMediaAsset'
export { default as MediaAssetGrid } from './MediaAssetGrid'
export { default as MediaAssetCard } from './MediaAssetCard'
export { default as MediaUploadDropzone } from './MediaUploadDropzone'
export { default as SelectedImagePreview } from './SelectedImagePreview'
export { default as GalleryImageGrid } from './GalleryImageGrid'
