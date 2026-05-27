import { useEffect, useMemo, useState } from 'react'
import { getActivityLogById, getActivityLogs } from '../api/activityLogApi'
import AdminAlert from '@/components/admin-ui/AdminAlert'
import AdminFilterBar from '@/components/admin-ui/AdminFilterBar'
import AdminFilterField from '@/components/admin-ui/AdminFilterField'
import AdminField from '@/components/admin-ui/AdminField'
import AdminPage from '@/components/admin-ui/AdminPage'
import AdminPagination from '@/components/admin-ui/AdminPagination'
import AdminSelect from '@/components/admin-ui/AdminSelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ModuleActions from '@/components/admin-ui/ModuleActions'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import ModuleEmptyState from '@/components/admin-ui/ModuleEmptyState'
import ModuleStatusBadge from '@/components/admin-ui/ModuleStatusBadge'
import ModuleTable from '@/components/admin-ui/ModuleTable'
import PageLoading from '@/components/admin-ui/PageLoading'
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

const getModuleFilterLabel = (module) => {
  if (module === 'all') {
    return 'All modules'
  }

  return module
}

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

  const hasDateFilter = Boolean(dateFrom || dateTo)

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
    <AdminPage
      headerMode="hidden"
      title="Activity Logs"
      description="Review admin actions, system changes, and audit history."
    >
      <AdminFilterBar>
        <AdminFilterField variant="search" label="Search">
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
            onSubmit={handleSearchSubmit}
          >
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
        </AdminFilterField>

        <AdminFilterField label="Module" className="sm:w-[160px]">
          <AdminSelect
            value={moduleFilter}
            aria-label="Filter by module"
            onChange={(event) => {
              setCurrentPage(1)
              setModuleFilter(event.target.value)
            }}
          >
            {moduleOptions.map((item) => (
              <option key={item} value={item}>
                {getModuleFilterLabel(item)}
              </option>
            ))}
          </AdminSelect>
        </AdminFilterField>

        <AdminFilterField label="Action">
          <Input
            type="text"
            placeholder="Action filter..."
            value={actionFilter}
            onChange={(event) => {
              setCurrentPage(1)
              setActionFilter(event.target.value)
            }}
          />
        </AdminFilterField>

        <AdminFilterField label="Date From" className="sm:w-[160px]">
          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />
        </AdminFilterField>

        <AdminFilterField label="Date To" className="sm:w-[160px]">
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />
        </AdminFilterField>
      </AdminFilterBar>

      {hasDateFilter ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Date filters apply to the current page of loaded logs.
        </p>
      ) : null}

      {loading ? <PageLoading message="Loading activity logs..." /> : null}

      {error ? (
        <AdminAlert type="error" title="Request failed">
          {error}
        </AdminAlert>
      ) : null}

      {!loading && !error ? (
        filteredLogs.length === 0 ? (
          <>
            <ModuleEmptyState
              title={
                logs.length > 0 && hasDateFilter
                  ? 'No logs on this page match the selected date range.'
                  : 'No activity logs found'
              }
              description={
                logs.length > 0 && hasDateFilter
                  ? 'Try another page or adjust the date range.'
                  : 'Try changing filters or search terms.'
              }
            />
            {logs.length > 0 ? (
              <div className="flex flex-col gap-2">
                {hasDateFilter ? (
                  <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                    Pagination reflects all server results for the current filters; date
                    range only narrows rows on this page.
                  </p>
                ) : null}
                <AdminPagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  onPrevious={goPrev}
                  onNext={goNext}
                  isPreviousDisabled={pagination.currentPage <= 1}
                  isNextDisabled={pagination.currentPage >= pagination.totalPages}
                />
              </div>
            ) : null}
          </>
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

            <div className="flex flex-col gap-2">
              {hasDateFilter ? (
                <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                  Pagination reflects all server results for the current filters; date
                  range only narrows rows on this page.
                </p>
              ) : null}
              <AdminPagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPrevious={goPrev}
                onNext={goNext}
                isPreviousDisabled={pagination.currentPage <= 1}
                isNextDisabled={pagination.currentPage >= pagination.totalPages}
              />
            </div>
          </>
        )
      ) : null}

      {viewingId ? (
        <div className="log-details-overlay" onClick={closeDetails}>
          <div
            className="log-details-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="log-details-header">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Activity Log Details
              </h3>
              <Button type="button" size="sm" variant="ghost" onClick={closeDetails}>
                Close
              </Button>
            </div>

            {detailsLoading ? (
              <AdminAlert type="info" title="Loading" className="mb-3">
                Loading details...
              </AdminAlert>
            ) : null}

            {detailsError ? (
              <AdminAlert type="error" title="Request failed" className="mb-3">
                {detailsError}
              </AdminAlert>
            ) : null}

            {viewingLog ? (
              <div className="log-details-grid">
                <p className="log-details-field">
                  <strong>Action:</strong> {viewingLog?.action || '-'}
                </p>
                <p className="log-details-field">
                  <strong>Module:</strong> {viewingLog?.module || '-'}
                </p>
                <p className="log-details-field">
                  <strong>Description:</strong> {viewingLog?.description || '-'}
                </p>
                <p className="log-details-field">
                  <strong>Entity ID:</strong> {viewingLog?.entityId || '-'}
                </p>
                <p className="log-details-field">
                  <strong>Entity Type:</strong> {viewingLog?.entityType || '-'}
                </p>
                <p className="log-details-field">
                  <strong>User Agent:</strong> {viewingLog?.userAgent || '-'}
                </p>
                <p className="log-details-field">
                  <strong>IP Address:</strong> {viewingLog?.ipAddress || '-'}
                </p>
                <p className="log-details-field">
                  <strong>Created At:</strong> {formatDateTime(viewingLog?.createdAt)}
                </p>
                <div className="field-group field-group-full">
                  <AdminField label="Metadata JSON">
                    <pre className="log-metadata-block dark:bg-slate-950 dark:text-slate-200">
                      {JSON.stringify(viewingLog?.metadata || {}, null, 2)}
                    </pre>
                  </AdminField>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </AdminPage>
  )
}

export default ActivityLogs
