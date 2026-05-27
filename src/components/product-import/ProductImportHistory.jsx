import { useEffect, useState } from 'react'
import { History, Loader2 } from 'lucide-react'
import { getProductImportHistory, downloadProductImportErrorsCsv } from '@/api/importApi'
import AdminAlert from '@/components/admin-ui/AdminAlert'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ModuleTable from '@/components/admin-ui/ModuleTable'

const formatDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

const historyStatusClass = {
  completed:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
  partial:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
  failed:
    'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
}

function ProductImportHistory({ refreshKey = 0 }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadingId, setDownloadingId] = useState('')

  const loadHistory = async () => {
    setLoading(true)
    setError('')
    try {
      const payload = await getProductImportHistory({ limit: 10 })
      setHistory(payload?.history || [])
    } catch (err) {
      setError(err?.message || 'Failed to load import history.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [refreshKey])

  const handleDownloadErrors = async (record) => {
    if (!record?.failedCount) return
    setDownloadingId(record._id)
    try {
      await downloadProductImportErrorsCsv({ historyId: record._id })
    } catch (err) {
      setError(err?.message || 'Failed to download error report.')
    } finally {
      setDownloadingId('')
    }
  }

  return (
    <ModuleCard
      title="Import history"
      description="Recent import runs with operational status, row totals, and failed-row exports."
      actions={
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8"
          onClick={loadHistory}
          disabled={loading}
        >
          Refresh
        </Button>
      }
    >
      {error ? (
        <AdminAlert type="error" title="History unavailable">
          {error}
        </AdminAlert>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading history…
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300/90 bg-slate-50/60 px-4 py-10 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <History className="h-8 w-8 text-slate-400 dark:text-slate-500" aria-hidden />
          <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-100">
            No import runs recorded yet
          </p>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            Completed imports will appear here with outcome counts and failed-row CSV exports.
          </p>
        </div>
      ) : (
        <ModuleTable
          compact
          columns={[
            { key: 'file', label: 'Run' },
            { key: 'status', label: 'Status' },
            { key: 'counts', label: 'Results' },
            { key: 'by', label: 'Operator' },
            { key: 'date', label: 'Started' },
            { key: 'actions', label: '' },
          ]}
          data={history}
          emptyMessage="No imports yet."
          renderRow={(record) => (
            <tr key={record._id} className="text-sm">
              <td className="min-w-[14rem] max-w-[16rem]">
                <div className="space-y-1">
                  <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                    {record.filename || '—'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {(record.fileFormat || 'file').toUpperCase()} · Strategy:{' '}
                    {String(record.strategy || 'skip_duplicates').replaceAll('_', ' ')}
                  </p>
                </div>
              </td>
              <td>
                <Badge
                  className={
                    historyStatusClass[record.status] ||
                    'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }
                >
                  {record.status || 'unknown'}
                </Badge>
              </td>
              <td>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                    Imported {record.importedCount || 0}
                  </Badge>
                  <Badge className="border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300">
                    Updated {record.updatedCount || 0}
                  </Badge>
                  <Badge className="border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    Skipped {record.skippedCount || 0}
                  </Badge>
                  <Badge className="border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                    Failed {record.failedCount || 0}
                  </Badge>
                </div>
              </td>
              <td className="max-w-[10rem]">
                <div className="space-y-1 text-xs">
                  <p className="truncate text-slate-900 dark:text-slate-100">
                    {record.importedBy?.name || '—'}
                  </p>
                  <p className="truncate text-slate-500 dark:text-slate-400">
                    {record.importedBy?.email || 'No email'}
                  </p>
                </div>
              </td>
              <td className="whitespace-nowrap text-xs text-slate-500">
                {formatDateTime(record.createdAt)}
              </td>
              <td className="text-right">
                {record.failedCount > 0 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled={downloadingId === record._id}
                    onClick={() => handleDownloadErrors(record)}
                  >
                    {downloadingId === record._id ? 'Preparing…' : 'Failed rows CSV'}
                  </Button>
                ) : (
                  <span className="text-xs text-slate-400 dark:text-slate-500">No failed rows</span>
                )}
              </td>
            </tr>
          )}
        />
      )}
    </ModuleCard>
  )
}

export default ProductImportHistory
