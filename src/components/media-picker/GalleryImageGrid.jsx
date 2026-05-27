import { useEffect, useState } from 'react'
import { GripVertical, ImageIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { getGalleryDisplayUrl, normalizeMediaUrlPath } from '@/components/media-picker/index.js'

function GalleryImageGrid({
  assets = [],
  onRemove,
  onReorder,
  className = '',
  emptyMessage = 'No gallery images selected.',
}) {
  if (!assets.length) {
    return (
      <div
        className={cn(
          'flex min-h-[120px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300/90 bg-slate-50/80 px-4 py-8 text-center dark:border-slate-600 dark:bg-slate-900/50',
          className,
        )}
      >
        <ImageIcon className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" aria-hidden />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{emptyMessage}</p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Use Media Library or Upload below
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {typeof onReorder === 'function' ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Drag to reorder — coming in a future update.
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2.5">
        {assets.map((asset, index) => (
          <GalleryThumb
            key={
              normalizeMediaUrlPath(asset?.url) ||
              asset?.id ||
              `gallery-${index}`
            }
            asset={asset}
            onRemove={onRemove}
            showReorderHandle={typeof onReorder === 'function'}
          />
        ))}
      </div>
    </div>
  )
}

function GalleryThumb({ asset, onRemove, showReorderHandle = false }) {
  const [imageError, setImageError] = useState(false)
  const imageSrc = getGalleryDisplayUrl(asset?.url)
  const label = asset?.title || asset?.fileName || 'Gallery image'

  useEffect(() => {
    setImageError(false)
  }, [imageSrc])

  return (
    <div className="group relative overflow-hidden rounded-lg border border-slate-200/90 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
      {showReorderHandle ? (
        <span className="absolute left-1 top-1 z-10 rounded bg-white/80 p-0.5 text-slate-400 opacity-50 dark:bg-slate-900/80">
          <GripVertical className="h-3.5 w-3.5" />
        </span>
      ) : null}
      <div className="aspect-square bg-slate-100 dark:bg-slate-800">
        {imageSrc && !imageError ? (
          <img
            src={imageSrc}
            alt={asset?.altText || label}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            <ImageIcon className="h-6 w-6" />
          </div>
        )}
        <span
          className="pointer-events-none absolute inset-0 bg-slate-900/0 transition-colors group-hover:bg-slate-900/10 dark:group-hover:bg-white/5"
          aria-hidden
        />
      </div>
      {typeof onRemove === 'function' ? (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute right-1.5 top-1.5 h-7 w-7 cursor-pointer border-0 bg-white/95 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100 dark:bg-slate-900/95"
          onClick={() => onRemove(asset)}
          aria-label={`Remove ${label}`}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  )
}

export default GalleryImageGrid
