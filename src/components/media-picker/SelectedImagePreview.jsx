import { ImageIcon, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const getImageUrl = (fileUrl) => {
  if (!fileUrl) return ''
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) return fileUrl
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
  return `${baseUrl}${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`
}

function SelectedImagePreview({ asset, onRemove, className = '' }) {
  const [imageError, setImageError] = useState(false)

  if (!asset) {
    return (
      <div
        className={cn(
          'flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200/80 bg-slate-50/50 p-6 text-center dark:border-slate-700 dark:bg-slate-900/40',
          className,
        )}
      >
        <ImageIcon className="mb-2 h-8 w-8 text-slate-400 dark:text-slate-500" />
        <p className="text-sm text-slate-500 dark:text-slate-400">No image selected</p>
      </div>
    )
  }

  const label = asset?.title || asset?.fileName || 'Selected image'
  const imageSrc = getImageUrl(asset?.url)
  const showImage = asset?.type !== 'video' && imageSrc && !imageError

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/80',
        className,
      )}
    >
      <div className="relative aspect-video w-full bg-slate-100 dark:bg-slate-800">
        {showImage ? (
          <img
            src={imageSrc}
            alt={asset?.altText || label}
            className="h-full w-full object-contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full min-h-[180px] flex-col items-center justify-center text-slate-400 dark:text-slate-500">
            <ImageIcon className="h-10 w-10" />
            <span className="mt-2 text-xs uppercase">{asset?.type || 'preview'}</span>
          </div>
        )}
        {typeof onRemove === 'function' ? (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8 bg-white/90 dark:bg-slate-900/90"
            onClick={() => onRemove(asset)}
            aria-label="Remove selected image"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <div className="space-y-1 p-3">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</p>
        {asset?.url ? (
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{asset.url}</p>
        ) : null}
      </div>
    </div>
  )
}

export default SelectedImagePreview
