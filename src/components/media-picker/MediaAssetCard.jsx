import { useState } from 'react'
import { ImageIcon, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const getImageUrl = (fileUrl) => {
  if (!fileUrl) return ''
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) return fileUrl
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
  return `${baseUrl}${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`
}

function MediaAssetCard({ asset, selected = false, disabled = false, onToggle }) {
  const [imageError, setImageError] = useState(false)
  const imageSrc = getImageUrl(asset?.url || asset?.raw?.fileUrl)
  const showImage = asset?.type === 'image' && imageSrc && !imageError
  const label = asset?.title || asset?.fileName || 'Media asset'

  const handleClick = () => {
    if (disabled || typeof onToggle !== 'function') return
    onToggle(asset)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleClick()
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={label}
      className={cn(
        'group relative aspect-square w-full overflow-hidden rounded-xl border bg-slate-50 transition-all duration-150',
        'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2',
        'dark:bg-slate-900/80 dark:focus-visible:ring-slate-300 dark:focus-visible:ring-offset-slate-950',
        selected
          ? 'border-slate-900 ring-2 ring-slate-900/20 shadow-md dark:border-slate-200 dark:ring-slate-200/30'
          : 'border-slate-200/90 hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:hover:border-slate-500',
        disabled &&
          'cursor-not-allowed opacity-50 hover:border-slate-200/90 hover:shadow-none dark:hover:border-slate-700',
      )}
    >
      <span className="absolute inset-0 flex items-center justify-center p-2">
        {showImage ? (
          <img
            src={imageSrc}
            alt=""
            aria-hidden
            className="max-h-full max-w-full object-contain"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            <ImageIcon className="h-7 w-7" />
          </span>
        )}
      </span>

      <span
        className={cn(
          'pointer-events-none absolute inset-0 transition-colors',
          'group-hover:bg-slate-900/[0.03] dark:group-hover:bg-white/[0.04]',
          selected && 'bg-slate-900/[0.06] dark:bg-white/[0.08]',
        )}
        aria-hidden
      />

      {selected ? (
        <span
          className="pointer-events-none absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white shadow-md ring-2 ring-white dark:bg-slate-100 dark:text-slate-900 dark:ring-slate-900"
          aria-hidden
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
      ) : null}
    </button>
  )
}

export default MediaAssetCard
