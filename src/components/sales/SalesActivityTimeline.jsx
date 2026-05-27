import ModuleCard from '@/components/admin-ui/ModuleCard'
import { formatDateTime } from '@/lib/sales'

const getReadableAction = (action) =>
  String(action || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase()) || '-'

const getAdminName = (log) =>
  log?.admin?.name || log?.admin?.email || log?.adminName || log?.adminEmail || 'System'

function SalesActivityTimeline({
  title = 'Activity timeline',
  description = 'Recent operational events for this record.',
  logs = [],
  loading = false,
  error = '',
  emptyMessage = 'No activity recorded yet.',
}) {
  return (
    <ModuleCard title={title} description={description}>
      {loading ? (
        <div className="py-6 text-sm text-slate-500 dark:text-slate-400">
          Loading activity…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200/80 bg-red-50/70 px-3 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200">
          {error}
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300/90 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
          {emptyMessage}
        </div>
      ) : (
        <ol className="space-y-3">
          {logs.map((log, index) => (
            <li
              key={log?._id || log?.id || `${log?.action || 'log'}-${index}`}
              className="flex gap-3"
            >
              <div className="flex flex-col items-center">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-900 dark:bg-slate-100" />
                {index < logs.length - 1 ? (
                  <span className="mt-1 h-full w-px bg-slate-200 dark:bg-slate-800" />
                ) : null}
              </div>
              <div className="flex-1 rounded-lg border border-slate-200/80 bg-white/80 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {getReadableAction(log?.action)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {log?.description || 'No description provided.'}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDateTime(log?.createdAt)}
                  </p>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  By {getAdminName(log)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </ModuleCard>
  )
}

export default SalesActivityTimeline
