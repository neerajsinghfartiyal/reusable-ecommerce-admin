import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getReturnRequests } from '../api/returnApi'
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

const typeFilters = ['all', 'return', 'exchange']
const statusFilters = [
  'all',
  'requested',
  'approved',
  'rejected',
  'received',
  'refunded',
  'exchanged',
  'closed',
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
    response?.data?.returnRequests,
    response?.returnRequests,
    response?.data?.data?.returnRequests,
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

const getCustomerName = (customer) =>
  `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() ||
  customer?.name ||
  customer?.email ||
  'Customer'

function Returns() {
  const navigate = useNavigate()
  const location = useLocation()
  const [returnRequests, setReturnRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    totalItems: 0,
    currentPage: 1,
    totalPages: 1,
    pageLimit: 10,
  })

  const loadReturnRequests = async () => {
    setLoading(true)
    setError('')

    try {
      const params = { page: currentPage }
      if (searchQuery) params.search = searchQuery
      if (typeFilter !== 'all') params.type = typeFilter
      if (statusFilter !== 'all') params.status = statusFilter

      const response = await getReturnRequests(params)
      const list = extractList(response)
      const paginationData = extractPagination(response)

      setReturnRequests(list)
      setPagination({
        totalItems: getNumberValue(
          paginationData?.totalItems,
          response?.data?.data?.totalItems,
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
          response?.data?.data?.pageLimit,
          response?.data?.pageLimit,
          10,
        ),
      })
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load return requests.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReturnRequests()
  }, [currentPage, searchQuery, typeFilter, statusFilter, location.pathname])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setCurrentPage(1)
    setSearchQuery(searchInput.trim())
  }

  const goPrev = () => setCurrentPage((prev) => Math.max(1, prev - 1))
  const goNext = () =>
    setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))

  const columns = [
    { key: 'requestType', label: 'Request Type' },
    { key: 'orderNumber', label: 'Order Number' },
    { key: 'customer', label: 'Customer' },
    { key: 'reason', label: 'Reason' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Created At' },
    { key: 'actions', label: 'Actions' },
  ]

  return (
    <section>
      <ModuleHeader
        title="Returns / Exchanges"
        description="Manage customer return and exchange requests."
      />

      <ModuleToolbar>
        <form className="flex w-full flex-col gap-2 sm:flex-row sm:items-center" onSubmit={handleSearchSubmit}>
          <Input
            type="text"
            placeholder="Search by reason, notes, status, type..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <Button type="submit" size="sm">
            Search
          </Button>
        </form>

        <select
          className="flex h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          value={typeFilter}
          onChange={(event) => {
            setCurrentPage(1)
            setTypeFilter(event.target.value)
          }}
        >
          {typeFilters.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          className="flex h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          value={statusFilter}
          onChange={(event) => {
            setCurrentPage(1)
            setStatusFilter(event.target.value)
          }}
        >
          {statusFilters.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </ModuleToolbar>

      {loading ? (
        <ModuleCard>
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading return requests...</p>
        </ModuleCard>
      ) : null}

      {error ? (
        <ModuleCard className="mb-3 border-red-200 bg-red-50 dark:border-red-900/70 dark:bg-red-950/30">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </ModuleCard>
      ) : null}

      {!loading && !error ? (
        <>
          {returnRequests.length === 0 ? (
            <ModuleEmptyState
              title="No return requests found"
              description="Return and exchange requests will appear here after customers submit them."
            />
          ) : (
            <ModuleTable
              columns={columns}
              data={returnRequests}
              emptyMessage="No return/exchange requests found."
              renderRow={(request, index) => {
                const id = request?._id || request?.id || `return-${index}`
                const type = (request?.type || 'return').toLowerCase()
                const status = (request?.status || 'requested').toLowerCase()
                const orderNumber = request?.order?.orderNumber || request?.order?._id || '-'
                const customerName = getCustomerName(request?.customer || {})
                const reason = request?.reason || '-'
                const createdAt = request?.createdAt
                  ? new Date(request.createdAt).toLocaleString()
                  : '-'

                return (
                  <tr key={id} className="text-slate-700 dark:text-slate-300">
                    <td>
                      <ModuleStatusBadge status={type} />
                    </td>
                    <td className="font-medium text-slate-800 dark:text-slate-100">{orderNumber}</td>
                    <td>{customerName}</td>
                    <td className="text-slate-600 dark:text-slate-400">{reason}</td>
                    <td>
                      <ModuleStatusBadge status={status} />
                    </td>
                    <td className="text-slate-600 dark:text-slate-400">{createdAt}</td>
                    <td>
                      <ModuleActions>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={!(request?._id || request?.id)}
                          onClick={() => navigate(`/returns/${request?._id || request?.id}`)}
                        >
                          View
                        </Button>
                      </ModuleActions>
                    </td>
                  </tr>
                )
              }}
            />
          )}

          <div className="[&_.pagination-btn]:dark:border-slate-700 [&_.pagination-btn]:dark:bg-slate-900 [&_.pagination-btn]:dark:text-slate-200 [&_.pagination-btn:disabled]:dark:text-slate-500 [&_.pagination-text]:dark:text-slate-400">
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPrevious={goPrev}
              onNext={goNext}
            />
          </div>
        </>
      ) : null}
    </section>
  )
}

export default Returns
