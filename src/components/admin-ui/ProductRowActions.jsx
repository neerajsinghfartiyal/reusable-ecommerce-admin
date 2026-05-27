import { Link } from 'react-router-dom'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

function ProductRowActions({ productId, productName, onDelete }) {
  const editPath = `/products/edit/${productId}`

  const handleDeleteClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    onDelete?.()
  }

  return (
    <div
      className="flex items-center justify-end gap-0.5"
      onClick={(event) => event.stopPropagation()}
    >
      {/* Desktop / tablet: quick actions on row hover */}
      <div
        className={cn(
          'hidden items-center gap-0.5 md:flex',
          'opacity-0 transition-opacity duration-150',
          'group-hover:opacity-100 group-focus-within:opacity-100',
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          asChild
        >
          <Link to={editPath} aria-label={`Edit ${productName}`}>
            <Pencil className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
          aria-label={`Delete ${productName}`}
          onClick={handleDeleteClick}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      {/* Mobile: touch-friendly kebab menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:h-8 md:w-8 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label={`Actions for ${productName}`}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-44 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
        >
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link to={editPath}>Edit product</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600 dark:text-red-400 dark:focus:bg-red-950/40 dark:focus:text-red-400"
            onSelect={(event) => {
              event.preventDefault()
              onDelete?.()
            }}
          >
            Delete product
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default ProductRowActions
