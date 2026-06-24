const getMediaType = (item) => {
  const rawType = String(item?.type || '').toLowerCase()
  const mimeType = String(item?.mimeType || '').toLowerCase()
  if (['image', 'video', 'document', 'other'].includes(rawType)) return rawType
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  return rawType || 'other'
}

export const normalizeMediaAsset = (item) => {
  if (!item || typeof item !== 'object') return null
  const id = String(item?._id || item?.id || '').trim()
  const fileUrl = item?.fileUrl || item?.url || ''
  if (!id && !fileUrl) return null

  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
  const url =
    !fileUrl
      ? ''
      : fileUrl.startsWith('http://') || fileUrl.startsWith('https://')
        ? fileUrl
        : `${baseUrl}${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`

  return {
    id: id || url,
    url,
    fileName: item?.fileName || item?.originalName || item?.title || 'Media asset',
    title: item?.title || '',
    altText: item?.altText || '',
    folder: item?.folder || '',
    type: getMediaType(item),
    mimeType: item?.mimeType || '',
    raw: item,
  }
}
