import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getReturnRequests } from '../api/returnApi'
import AdminAlert from '@/components/admin-ui/AdminAlert'
import AdminFilterBar from '@/components/admin-ui/AdminFilterBar'
import AdminFilterField from '@/components/admin-ui/AdminFilterField'
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
import {
  extractList,
  extractPagination,
  formatDateTime,
  getCustomerDisplayName,
  getNumberValue,
} from '@/lib/sales'

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

const getRequestTypeFilterLabel = (type) => {
  if (type === 'all') {
    return 'All request types'
  }

  return type.charAt(0).toUpperCase() + type.slice(1)
}

const getStatusFilterLabel = (status) => {
  if (status === 'all') {
    return 'All statuses'
  }

  return status.charAt(0).toUpperCase() + status.slice(1)
}

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
      const list = extractList(response, ['returnRequests'])
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
    { key: 'orderNumber', label: 'Order' },
    { key: 'customer', label: 'Customer' },
    { key: 'reason', label: 'Reason' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Created' },
    { key: 'actions', label: 'Actions' },
  ]

  return (
    <AdminPage
      headerMode="hidden"
      title="Returns / Exchanges"
      description="Manage customer return and exchange requests."
    >

      <AdminFilterBar>
        <AdminFilterField variant="search" label="Search">
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
            onSubmit={handleSearchSubmit}
          >
            <Input
              type="text"
              placeholder="Search returns and exchanges..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <Button type="submit" size="sm">
              Search
            </Button>
          </form>
        </AdminFilterField>

        <AdminFilterField label="Request Type">
          <AdminSelect
            value={typeFilter}
            aria-label="Filter by request type"
            onChange={(event) => {
              setCurrentPage(1)
              setTypeFilter(event.target.value)
            }}
          >
            {typeFilters.map((type) => (
              <option key={type} value={type}>
                {getRequestTypeFilterLabel(type)}
              </option>
            ))}
          </AdminSelect>
        </AdminFilterField>

        <AdminFilterField label="Status">
          <AdminSelect
            value={statusFilter}
            aria-label="Filter by request status"
            onChange={(event) => {
              setCurrentPage(1)
              setStatusFilter(event.target.value)
            }}
          >
            {statusFilters.map((status) => (
              <option key={status} value={status}>
                {getStatusFilterLabel(status)}
              </option>
            ))}
          </AdminSelect>
        </AdminFilterField>
      </AdminFilterBar>

      {loading ? <PageLoading message="Loading return requests..." /> : null}

      {error ? (
        <AdminAlert type="error" title="Request failed">
          {error}
        </AdminAlert>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-sm text-slate-600 dark:border-slate-800/90 dark:bg-slate-900/40 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing {returnRequests.length} of {pagination.totalItems} requests
            </p>
            <p>
              Page <span className="font-semibold text-slate-900 dark:text-slate-100">{pagination.currentPage}</span> of{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">{pagination.totalPages}</span>
            </p>
          </div>

          {returnRequests.length === 0 ? (
            <ModuleEmptyState
              title="No return requests found"
              description="Return and exchange requests will appear here after customers submit them."
            />
          ) : (
            <ModuleTable
              columns={columns}
              data={returnRequests}
              compact
              emptyMessage="No return/exchange requests found."
              renderRow={(request, index) => {
                const id = request?._id || request?.id || `return-${index}`
                const type = (request?.type || 'return').toLowerCase()
                const status = (request?.status || 'requested').toLowerCase()
                const orderNumber = request?.order?.orderNumber || request?.order?._id || '-'
                const customerId = request?.customer?._id || request?.customer?.id || ''
                const orderId = request?.order?._id || request?.order?.id || ''
                const customerName = getCustomerDisplayName(request?.customer || {})
                const reason = request?.reason || '-'
                const createdAt = formatDateTime(request?.createdAt)

                return (
                  <tr key={id} className="align-top text-slate-700 dark:text-slate-300">
                    <td>
                      <ModuleStatusBadge status={type} />
                    </td>
                    <td className="min-w-[9rem]">
                      <div className="space-y-1">
                        <p className="font-medium text-slate-800 dark:text-slate-100">{orderNumber}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {request?.order?.paymentStatus || 'No payment state'}
                        </p>
                      </div>
                    </td>
                    <td className="min-w-[12rem]">
                      <div className="space-y-1">
                        <p className="font-medium text-slate-800 dark:text-slate-100">{customerName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {request?.customer?.email || 'No email'}
                        </p>
                      </div>
                    </td>
                    <td className="max-w-[18rem] text-slate-600 dark:text-slate-400">{reason}</td>
                    <td>
                      <ModuleStatusBadge status={status} />
                    </td>
                    <td className="text-slate-600 dark:text-slate-400">{createdAt}</td>
                    <td>
                      <ModuleActions wrap="wrap">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={!(request?._id || request?.id)}
                          onClick={() => navigate(`/returns/${request?._id || request?.id}`)}
                        >
                          View
                        </Button>
                        {orderId ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/orders/${orderId}`)}
                          >
                            Order
                          </Button>
                        ) : null}
                        {customerId ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/customers/${customerId}`)}
                          >
                            Customer
                          </Button>
                        ) : null}
                      </ModuleActions>
                    </td>
                  </tr>
                )
              }}
            />
          )}

          <AdminPagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPrevious={goPrev}
            onNext={goNext}
            isPreviousDisabled={pagination.currentPage <= 1}
            isNextDisabled={pagination.currentPage >= pagination.totalPages}
          />
        </>
      ) : null}
    </AdminPage>
  )
}

export default Returns
