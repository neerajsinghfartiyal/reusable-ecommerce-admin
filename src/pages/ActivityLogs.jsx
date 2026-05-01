import { useEffect, useMemo, useState } from 'react'
import { getActivityLogById, getActivityLogs } from '../api/activityLogApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Pagination from '../components/ui/Pagination'
import ModuleActions from '@/components/admin-ui/ModuleActions'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import ModuleEmptyState from '@/components/admin-ui/ModuleEmptyState'
import ModuleHeader from '@/components/admin-ui/ModuleHeader'
import ModuleStatusBadge from '@/components/admin-ui/ModuleStatusBadge'
import ModuleTable from '@/components/admin-ui/ModuleTable'
import ModuleToolbar from '@/components/admin-ui/ModuleToolbar'

const moduleOptions = [
  'all',
  'AUTH',
  'ADMIN',
  'PRODUCT',
  'CATEGORY',
  'BRAND',
  'ORDER',
  'CUSTOMER',
  'COUPON',
  'MEDIA',
  'PAGE',
  'REDIRECT',
  'RETURN',
  'SETTING',
]

const getNumberValue = (...values) => {
  for (const value of values) {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return 0
}

const extractList = (response) => {
  const checks = [
    response?.data?.logs,
    response?.logs,
    response?.data?.activityLogs,
    response?.activityLogs,
    response?.data?.data?.logs,
    response?.data?.items,
    response?.items,
    response?.data,
    response,
  ]
  for (const value of checks) {
    if (Array.isArray(value)) return value
  }
  return []
}

const extractPagination = (response) =>
  response?.data?.data?.pagination ||
  response?.data?.pagination ||
  response?.pagination ||
  {}

const extractLogById = (response) =>
  response?.data?.data?.log ||
  response?.data?.data ||
  response?.data?.log ||
  response?.log ||
  response?.data ||
  {}

const getReadableAction = (action) =>
  String(action || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase()) || '-'

const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '-')

const getAdminName = (log) =>
  log?.admin?.name || log?.admin?.email || log?.adminName || log?.adminEmail || 'System'

const isWithinDateRange = (createdAt, fromDate, toDate) => {
  if (!createdAt) return !fromDate && !toDate
  const logTime = new Date(createdAt).getTime()
  if (Number.isNaN(logTime)) return false

  if (fromDate) {
    const fromTime = new Date(fromDate).getTime()
    if (!Number.isNaN(fromTime) && logTime < fromTime) return false
  }
  if (toDate) {
    const toTime = new Date(`${toDate}T23:59:59.999`).getTime()
    if (!Number.isNaN(toTime) && logTime > toTime) return false
  }
  return true
}

function ActivityLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewingId, setViewingId] = useState('')
  const [viewingLog, setViewingLog] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState('')
  const [pagination, setPagination] = useState({
    totalItems: 0,
    currentPage: 1,
    totalPages: 1,
    pageLimit: 10,
  })

  const loadLogs = async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page: currentPage }
      if (searchQuery) params.search = searchQuery
      if (moduleFilter !== 'all') params.module = moduleFilter
      if (actionFilter.trim()) params.action = actionFilter.trim()

      const response = await getActivityLogs(params)
      const list = extractList(response)
      const paginationData = extractPagination(response)

      setLogs(list)
      setPagination({
        totalItems: getNumberValue(
          paginationData?.totalLogs,
          paginationData?.totalItems,
          response?.data?.data?.totalLogs,
          response?.data?.data?.totalItems,
          response?.data?.totalLogs,
          response?.data?.totalItems,
          list.length,
        ),
        currentPage: Math.max(
          1,
          getNumberValue(
            paginationData?.currentPage,
            response?.data?.data?.currentPage,
            response?.data?.currentPage,
            currentPage,
          ),
        ),
        totalPages: Math.max(
          1,
          getNumberValue(
            paginationData?.totalPages,
            response?.data?.data?.totalPages,
            response?.data?.totalPages,
            1,
          ),
        ),
        pageLimit: getNumberValue(
          paginationData?.pageLimit,
          paginationData?.limit,
          response?.data?.data?.pageLimit,
          response?.data?.pageLimit,
          10,
        ),
      })
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load activity logs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [currentPage, searchQuery, moduleFilter, actionFilter])

  const filteredLogs = useMemo(
    () => logs.filter((log) => isWithinDateRange(log?.createdAt, dateFrom, dateTo)),
    [logs, dateFrom, dateTo],
  )

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setCurrentPage(1)
    setSearchQuery(searchInput.trim())
  }

  const goPrev = () => setCurrentPage((prev) => Math.max(1, prev - 1))
  const goNext = () => setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))

  const openDetails = async (log) => {
    const id = log?._id || log?.id
    if (!id) return

    setViewingId(id)
    setViewingLog(log)
    setDetailsError('')
    setDetailsLoading(true)
    try {
      const response = await getActivityLogById(id)
      const details = extractLogById(response)
      setViewingLog(details && typeof details === 'object' ? details : log)
    } catch (err) {
      setDetailsError(err?.response?.data?.message || 'Failed to load log details.')
      setViewingLog(log)
    } finally {
      setDetailsLoading(false)
    }
  }

  const closeDetails = () => {
    setViewingId('')
    setViewingLog(null)
    setDetailsError('')
  }

  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'admin', label: 'Admin' },
    { key: 'module', label: 'Module' },
    { key: 'action', label: 'Action' },
    { key: 'description', label: 'Description' },
    { key: 'entity', label: 'Entity' },
    { key: 'ipAddress', label: 'IP Address' },
    { key: 'actions', label: 'Actions' },
  ]

  return (
    <section>
      <ModuleHeader
        title="Activity Logs"
        description="Review admin actions, system changes, and audit history."
      />

      <ModuleCard>
        <ModuleToolbar>
          <form className="flex w-full flex-col gap-2 sm:flex-row sm:items-center" onSubmit={handleSearchSubmit}>
            <Input
              type="text"
              placeholder="Search logs..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <Button type="submit" size="sm">
              Search
            </Button>
          </form>

          <select
            className="flex h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            value={moduleFilter}
            onChange={(event) => {
              setCurrentPage(1)
              setModuleFilter(event.target.value)
            }}
          >
            {moduleOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <Input
            type="text"
            placeholder="Action filter..."
            value={actionFilter}
            onChange={(event) => {
              setCurrentPage(1)
              setActionFilter(event.target.value)
            }}
          />

          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />
        </ModuleToolbar>

        {loading ? (
          <ModuleCard>
            <p className="text-sm text-slate-600 dark:text-slate-400">Loading activity logs...</p>
          </ModuleCard>
        ) : null}

        {error ? (
          <ModuleCard className="mb-3 border-red-200 bg-red-50 dark:border-red-900/70 dark:bg-red-950/30">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </ModuleCard>
        ) : null}

        {!loading && !error ? (
          filteredLogs.length === 0 ? (
            <ModuleEmptyState
              title="No activity logs found"
              description="Try changing filters or search terms."
            />
          ) : (
            <>
              <ModuleTable
                columns={columns}
                data={filteredLogs}
                emptyMessage="No activity logs found."
                renderRow={(log, index) => {
                  const id = log?._id || log?.id || `log-${index}`
                  const entityType = log?.entityType || ''
                  const entityId = log?.entityId || ''
                  const entityText =
                    entityType && entityId
                      ? `${entityType} (${entityId})`
                      : entityType || entityId || '-'

                  return (
                    <tr key={id} className="text-slate-700 dark:text-slate-300">
                      <td className="text-slate-600 dark:text-slate-400">{formatDateTime(log?.createdAt)}</td>
                      <td className="font-medium text-slate-800 dark:text-slate-100">{getAdminName(log)}</td>
                      <td>
                        <ModuleStatusBadge status={String(log?.module || '').toLowerCase()} />
                      </td>
                      <td>{getReadableAction(log?.action)}</td>
                      <td className="text-slate-600 dark:text-slate-400">{log?.description || '-'}</td>
                      <td className="text-slate-600 dark:text-slate-400">{entityText}</td>
                      <td className="text-slate-600 dark:text-slate-400">{log?.ipAddress || '-'}</td>
                      <td>
                        <ModuleActions>
                          <Button type="button" size="sm" variant="ghost" onClick={() => openDetails(log)}>
                            View Details
                          </Button>
                        </ModuleActions>
                      </td>
                    </tr>
                  )
                }}
              />

              <div className="[&_.pagination-btn]:dark:border-slate-700 [&_.pagination-btn]:dark:bg-slate-900 [&_.pagination-btn]:dark:text-slate-200 [&_.pagination-btn:disabled]:dark:text-slate-500 [&_.pagination-text]:dark:text-slate-400">
                <Pagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  onPrevious={goPrev}
                  onNext={goNext}
                />
              </div>
            </>
          )
        ) : null}
      </ModuleCard>

      {viewingId ? (
        <div className="log-details-overlay" onClick={closeDetails}>
          <div className="log-details-modal admin-card dark:border dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" onClick={(event) => event.stopPropagation()}>
            <div className="log-details-header">
              <h3 className="admin-card-title dark:text-slate-100">Activity Log Details</h3>
              <Button type="button" size="sm" variant="ghost" onClick={closeDetails}>
                Close
              </Button>
            </div>

            {detailsLoading ? <p className="status-text dark:text-slate-300">Loading details...</p> : null}
            {detailsError ? <p className="status-text dark:text-red-300">{detailsError}</p> : null}

            {viewingLog ? (
              <div className="log-details-grid">
                <p>
                  <strong>Action:</strong> {viewingLog?.action || '-'}
                </p>
                <p>
                  <strong>Module:</strong> {viewingLog?.module || '-'}
                </p>
                <p>
                  <strong>Description:</strong> {viewingLog?.description || '-'}
                </p>
                <p>
                  <strong>Entity ID:</strong> {viewingLog?.entityId || '-'}
                </p>
                <p>
                  <strong>Entity Type:</strong> {viewingLog?.entityType || '-'}
                </p>
                <p>
                  <strong>User Agent:</strong> {viewingLog?.userAgent || '-'}
                </p>
                <p>
                  <strong>IP Address:</strong> {viewingLog?.ipAddress || '-'}
                </p>
                <p>
                  <strong>Created At:</strong> {formatDateTime(viewingLog?.createdAt)}
                </p>
                <div className="field-group field-group-full">
                  <label className="field-label">Metadata JSON</label>
                  <pre className="log-metadata-block dark:bg-slate-950 dark:text-slate-200">
                    {JSON.stringify(viewingLog?.metadata || {}, null, 2)}
                  </pre>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default ActivityLogs
