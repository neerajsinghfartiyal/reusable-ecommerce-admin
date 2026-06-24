import { Store } from 'lucide-react'
import { useTheme } from '@/context/useTheme'
import { cn } from '@/lib/utils'
import {
  getBrandLogoUrl,
  resolveBrandAssetUrl,
  useBranding,
} from './branding-config'

const sizeMap = {
  sm: {
    shell: 'h-9 w-9 rounded-lg',
    icon: 'h-4 w-4',
    text: 'text-xs',
  },
  md: {
    shell: 'h-11 w-11 rounded-xl',
    icon: 'h-5 w-5',
    text: 'text-sm',
  },
  lg: {
    shell: 'h-14 w-14 rounded-xl',
    icon: 'h-6 w-6',
    text: 'text-base',
  },
}

/**
 * Store logo with premium container, theme-aware asset, and initials/icon fallback.
 */
function BrandMark({ branding: brandingProp, size = 'md', className, showInitials = false }) {
  const { isDark } = useTheme()
  const brandingFromHook = useBranding()
  const branding = brandingProp || brandingFromHook
  const sizes = sizeMap[size] || sizeMap.md
  const logoSrc = resolveBrandAssetUrl(getBrandLogoUrl(isDark, branding))

  return (
    <div
      className={cn(
        'brand-mark-shell relative inline-flex shrink-0 items-center justify-center overflow-hidden',
        'border border-slate-200/90 bg-white shadow-sm',
        'ring-1 ring-slate-900/[0.04]',
        'dark:border-slate-700/90 dark:bg-slate-900 dark:ring-white/[0.06]',
        sizes.shell,
        className,
      )}
    >
      {logoSrc ? (
        <img
          src={logoSrc}
          alt=""
          className="h-full w-full object-contain p-1.5"
        />
      ) : showInitials && branding?.initials ? (
        <span
          className={cn(
            'font-semibold tracking-tight text-slate-800 dark:text-slate-100',
            sizes.text,
          )}
          aria-hidden
        >
          {branding.initials}
        </span>
      ) : (
        <span
          className="inline-flex items-center justify-center text-slate-700 dark:text-slate-200"
          aria-hidden
        >
          <Store className={sizes.icon} />
        </span>
      )}
    </div>
  )
}

export default BrandMark
