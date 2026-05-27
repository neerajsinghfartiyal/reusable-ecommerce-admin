import { isSameMediaAsset } from './index.js'
import MediaAssetCard from './MediaAssetCard'

const GRID_CLASS =
  'grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'

const assetsMatchSelection = (asset, selectedAssets = []) =>
  selectedAssets.some((selected) => isSameMediaAsset(asset, selected))

function MediaAssetGrid({
  items = [],
  selectedAssets = [],
  loading = false,
  mode = 'multiple',
  maxSelection = 20,
  onToggleAsset,
}) {
  if (loading) {
    return (
      <div className={GRID_CLASS}>
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={`media-skeleton-${index}`}
            className="aspect-square w-full animate-pulse rounded-lg bg-slate-200/80 dark:bg-slate-800"
          />
        ))}
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200/80 bg-slate-50/50 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/40">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">No media found</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Try another search or upload a new file.
        </p>
      </div>
    )
  }

  const atMax =
    mode === 'multiple' &&
    maxSelection > 0 &&
    selectedAssets.length >= maxSelection

  return (
    <div className={GRID_CLASS}>
      {items.map((asset, index) => {
        const selected = assetsMatchSelection(asset, selectedAssets)
        const disabled = atMax && !selected

        return (
          <MediaAssetCard
            key={asset?.id || `media-${index}`}
            asset={asset}
            selected={selected}
            disabled={disabled}
            onToggle={onToggleAsset}
          />
        )
      })}
    </div>
  )
}

export default MediaAssetGrid
