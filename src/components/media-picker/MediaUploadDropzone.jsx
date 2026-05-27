import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const DEFAULT_ACCEPT = 'image/*,video/*,.pdf'

function MediaUploadDropzone({
  onUploadFiles,
  uploading = false,
  disabled = false,
  defaultFolder = 'general',
  errorMessage = '',
  accept = DEFAULT_ACCEPT,
}) {
  const inputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)
  const [folder, setFolder] = useState(defaultFolder)
  const [title, setTitle] = useState('')
  const [altText, setAltText] = useState('')

  const handleFiles = (fileList) => {
    if (!fileList?.length || disabled || uploading) return
    const files = Array.from(fileList)
    if (typeof onUploadFiles === 'function') {
      onUploadFiles(files, { folder: folder.trim() || 'general', title: title.trim(), altText: altText.trim() })
    }
  }

  const handleInputChange = (event) => {
    handleFiles(event.target.files)
    event.target.value = ''
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setDragActive(false)
    handleFiles(event.dataTransfer?.files)
  }

  return (
    <div className="space-y-4">
      <div
        onDragEnter={(event) => {
          event.preventDefault()
          setDragActive(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault()
          setDragActive(false)
        }}
        onDrop={handleDrop}
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          dragActive
            ? 'border-slate-400 bg-slate-50 dark:border-slate-500 dark:bg-slate-800/60'
            : 'border-slate-200/80 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/40',
          (disabled || uploading) && 'pointer-events-none opacity-60',
        )}
      >
        <Upload className="mb-3 h-8 w-8 text-slate-400 dark:text-slate-500" />
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
          Drag and drop files here
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">or choose files to upload</p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-4"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? 'Uploading...' : 'Choose files'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept={accept}
          onChange={handleInputChange}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="media-picker-folder" className="text-slate-700 dark:text-slate-300">
            Folder
          </Label>
          <Input
            id="media-picker-folder"
            value={folder}
            onChange={(event) => setFolder(event.target.value)}
            placeholder="general"
            disabled={disabled || uploading}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="media-picker-title" className="text-slate-700 dark:text-slate-300">
            Title
          </Label>
          <Input
            id="media-picker-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Optional"
            disabled={disabled || uploading}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="media-picker-alt" className="text-slate-700 dark:text-slate-300">
            Alt text
          </Label>
          <Input
            id="media-picker-alt"
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
            placeholder="Optional"
            disabled={disabled || uploading}
          />
        </div>
      </div>

      {errorMessage ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}

export default MediaUploadDropzone
