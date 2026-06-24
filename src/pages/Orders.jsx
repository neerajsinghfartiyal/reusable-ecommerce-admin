import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getOrders, syncOrderOperations } from '../api/orderApi'
import AdminAlert from '@/components/admin-ui/AdminAlert'
import AdminFilterBar from '@/components/admin-ui/AdminFilterBar'
import AdminFilterField from '@/components/admin-ui/AdminFilterField'
import AdminPage from '@/components/admin-ui/AdminPage'
import AdminPagination from '@/components/admin-ui/AdminPagination'
import AdminSelect from '@/components/admin-ui/AdminSelect'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import ModuleActions from '@/components/admin-ui/ModuleActions'
import ModuleEmptyState from '@/components/admin-ui/ModuleEmptyState'
import PageLoading from '@/components/admin-ui/PageLoading'
import ModuleStatusBadge from '@/components/admin-ui/ModuleStatusBadge'
import ModuleTable from '@/components/admin-ui/ModuleTable'
import {
  extractList,
  extractPagination,
  formatDateTime,
  formatFilterOptionLabel,
  getCustomerDisplayName,
  getNumberValue,
  getOrderDisplayNumber,
  getOrderFulfillment,
  getOrderPaymentMethodLabel,
  hasOrderTracking,
  FULFILLMENT_STATUS_OPTIONS,
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  TRACKING_FILTER_OPTIONS,
} from '@/lib/sales'
import { useFormatCurrency } from '@/hooks/useFormatCurrency'

const paymentStatuses = ['all', ...PAYMENT_STATUS_OPTIONS]
const orderStatuses = ['all', ...ORDER_STATUS_OPTIONS]
const fulfillmentStatuses = ['all', ...FULFILLMENT_STATUS_OPTIONS]

const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'totalAmount:desc', label: 'Highest total' },
  { value: 'totalAmount:asc', label: 'Lowest total' },
  { value: 'fulfillment.status:asc', label: 'Fulfillment state' },
  { value: 'fulfillment.shippedAt:desc', label: 'Recently shipped' },
  { value: 'orderNumber:asc', label: 'Order number (A-Z)' },
  { value: 'orderNumber:desc', label: 'Order number (Z-A)' },
]

const PAGE_SIZE_OPTIONS = ['10', '25', '50']

function Orders() {
  const location = useLocation()
  const navigate = useNavigate()
  const formatCurrency = useFormatCurrency()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [orderFilter, setOrderFilter] = useState('all')
  const [fulfillmentFilter, setFulfillmentFilter] = useState('all')
  const [trackingFilter, setTrackingFilter] = useState('all')
  const [sortValue, setSortValue] = useState('createdAt:desc')
  const [pageSize, setPageSize] = useState('10')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingOrder, setEditingOrder] = useState(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    orderStatus: 'pending',
    paymentStatus: 'pending',
    note: '',
  })
  const [savingChanges, setSavingChanges] = useState(false)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageLimit: 10,
  })

  const loadOrders = async () => {
    setLoading(true)
    setError('')

    try {
      const [sortBy, sortOrder] = sortValue.split(':')
      const params = {
        page: currentPage,
        limit: pageSize,
        sortBy,
        sortOrder,
      }
      if (searchQuery) params.search = searchQuery
      if (paymentFilter !== 'all') params.paymentStatus = paymentFilter
      if (orderFilter !== 'all') params.orderStatus = orderFilter
      if (fulfillmentFilter !== 'all') params.fulfillmentStatus = fulfillmentFilter
      if (trackingFilter !== 'all') params.hasTracking = trackingFilter === 'tracked' ? 'true' : 'false'

      const response = await getOrders(params)
      const payload = response?.data?.data || response?.data || {}
      const list = extractList(response, ['orders'])
      const paginationData = extractPagination(response)

      setOrders(list)
      setPagination({
        totalItems: getNumberValue(
          paginationData?.totalOrders,
          paginationData?.totalItems,
          payload?.totalOrders,
          payload?.totalItems,
          list.length,
        ),
        totalPages: Math.max(
          1,
          getNumberValue(paginationData?.totalPages, payload?.totalPages, 1),
        ),
        pageLimit: getNumberValue(
          paginationData?.pageLimit,
          paginationData?.limit,
          payload?.pageLimit,
          pageSize,
        ),
        currentPage: Math.max(
          1,
          getNumberValue(
            paginationData?.currentPage,
            payload?.currentPage,
            currentPage,
          ),
        ),
      })
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load orders.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [
    currentPage,
    searchQuery,
    paymentFilter,
    orderFilter,
    fulfillmentFilter,
    trackingFilter,
    sortValue,
    pageSize,
    location.pathname,
  ])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setCurrentPage(1)
    setSearchQuery(searchInput.trim())
  }

  const openEditDialog = (order) => {
    const orderStatus = String(order?.orderStatus || 'pending').toLowerCase()
    const paymentStatus = String(order?.paymentStatus || 'pending').toLowerCase()

    setEditingOrder(order)
    setEditForm({
      orderStatus,
      paymentStatus,
      note: '',
    })
    setSuccessMessage('')
    setError('')
    setEditDialogOpen(true)
  }

  const closeEditDialog = () => {
    if (savingChanges) return
    setEditDialogOpen(false)
    setEditingOrder(null)
    setEditForm({
      orderStatus: 'pending',
      paymentStatus: 'pending',
      note: '',
    })
  }

  const handleSaveOrderChanges = async () => {
    const orderId = editingOrder?._id || editingOrder?.id
    if (!orderId) return

    setSavingChanges(true)
    setError('')
    setSuccessMessage('')

    try {
      await syncOrderOperations(orderId, {
        currentOrderStatus: String(editingOrder?.orderStatus || 'pending').toLowerCase(),
        nextOrderStatus: editForm.orderStatus,
        currentPaymentStatus: String(editingOrder?.paymentStatus || 'pending').toLowerCase(),
        nextPaymentStatus: editForm.paymentStatus,
        notes: editForm.note,
      })

      setSuccessMessage('Order operational state updated successfully.')
      closeEditDialog()
      await loadOrders()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update order.')
    } finally {
      setSavingChanges(false)
    }
  }

  const goPrev = () => setCurrentPage((prev) => Math.max(1, prev - 1))
  const goNext = () =>
    setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))

  const getAllowedOrderStatusOptions = (orderStatus) => {
    const normalized = String(orderStatus || 'pending').toLowerCase()

    if (['pending', 'processing', 'cancelled'].includes(normalized)) {
      return ORDER_STATUS_OPTIONS.filter((status) =>
        ['pending', 'processing', 'cancelled'].includes(status),
      )
    }

    return [normalized]
  }

  const visibleCount = orders.length
  const summaryText = useMemo(() => {
    if (visibleCount === 0) return 'No orders loaded'

    const start = (pagination.currentPage - 1) * pagination.pageLimit + 1
    const end = start + visibleCount - 1
    return `Showing ${start}-${end} of ${pagination.totalItems} orders`
  }, [pagination.currentPage, pagination.pageLimit, pagination.totalItems, visibleCount])

  const saveButtonVariant =
    editForm.orderStatus === 'cancelled' ||
    editForm.paymentStatus === 'refunded' ||
    editForm.paymentStatus === 'partially_refunded'
      ? 'destructive'
      : 'default'

  const columns = [
    { key: 'orderNumber', label: 'Order' },
    { key: 'customer', label: 'Customer' },
    { key: 'items', label: 'Items' },
    { key: 'total', label: 'Total' },
    { key: 'paymentStatus', label: 'Payment' },
    { key: 'orderStatus', label: 'Fulfillment' },
    { key: 'createdAt', label: 'Placed' },
    { key: 'actions', label: 'Actions' },
  ]

  return (
    <AdminPage
      headerMode="hidden"
      title="Orders"
      description="Manage customer orders, payment status, fulfillment status, and order history."
    >
      <AdminFilterBar>
        <AdminFilterField variant="search" label="Search">
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
            onSubmit={handleSearchSubmit}
          >
            <Input
              type="text"
              placeholder="Search orders..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <Button type="submit" size="sm">
              Search
            </Button>
          </form>
        </AdminFilterField>

        <AdminFilterField label="Payment Status">
          <AdminSelect
            value={paymentFilter}
            aria-label="Filter by payment status"
            onChange={(event) => {
              setCurrentPage(1)
              setPaymentFilter(event.target.value)
            }}
          >
            {paymentStatuses.map((status) => (
              <option key={status} value={status}>
                {formatFilterOptionLabel(status, 'All payment statuses')}
              </option>
            ))}
          </AdminSelect>
        </AdminFilterField>

        <AdminFilterField label="Fulfillment">
          <AdminSelect
            value={fulfillmentFilter}
            aria-label="Filter by fulfillment status"
            onChange={(event) => {
              setCurrentPage(1)
              setFulfillmentFilter(event.target.value)
            }}
          >
            {fulfillmentStatuses.map((status) => (
              <option key={status} value={status}>
                {formatFilterOptionLabel(status, 'All fulfillment states')}
              </option>
            ))}
          </AdminSelect>
        </AdminFilterField>

        <AdminFilterField label="Tracking">
          <AdminSelect
            value={trackingFilter}
            aria-label="Filter by tracking presence"
            onChange={(event) => {
              setCurrentPage(1)
              setTrackingFilter(event.target.value)
            }}
          >
            {TRACKING_FILTER_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {formatFilterOptionLabel(option, 'All tracking states')}
              </option>
            ))}
          </AdminSelect>
        </AdminFilterField>

        <AdminFilterField label="Order Status">
          <AdminSelect
            value={orderFilter}
            aria-label="Filter by order status"
            onChange={(event) => {
              setCurrentPage(1)
              setOrderFilter(event.target.value)
            }}
          >
            {orderStatuses.map((status) => (
              <option key={status} value={status}>
                {formatFilterOptionLabel(status, 'All order statuses')}
              </option>
            ))}
          </AdminSelect>
        </AdminFilterField>

        <AdminFilterField label="Sort">
          <AdminSelect
            value={sortValue}
            aria-label="Sort orders"
            onChange={(event) => {
              setCurrentPage(1)
              setSortValue(event.target.value)
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AdminSelect>
        </AdminFilterField>

        <AdminFilterField label="Page Size">
          <AdminSelect
            value={pageSize}
            aria-label="Orders page size"
            onChange={(event) => {
              setCurrentPage(1)
              setPageSize(event.target.value)
            }}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} rows
              </option>
            ))}
          </AdminSelect>
        </AdminFilterField>
      </AdminFilterBar>

      {loading ? <PageLoading message="Loading orders..." /> : null}

      {successMessage ? (
        <AdminAlert type="success" title="Success">
          {successMessage}
        </AdminAlert>
      ) : null}

      {error ? (
        <AdminAlert type="error" title="Request failed">
          {error}
        </AdminAlert>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-sm text-slate-600 dark:border-slate-800/90 dark:bg-slate-900/40 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
            <p>{summaryText}</p>
            <p>
              Page <span className="font-semibold text-slate-900 dark:text-slate-100">{pagination.currentPage}</span> of{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">{pagination.totalPages}</span>
            </p>
          </div>

          {orders.length === 0 ? (
            <ModuleEmptyState
              title="No orders found"
              description="Try changing search or status filters to find matching orders."
            />
          ) : (
            <ModuleTable
              columns={columns}
              data={orders}
              compact
              renderRow={(order, index) => {
                const id = order?._id || order?.id || `order-${index}`
                const customerName = getCustomerDisplayName(
                  order?.customer || {},
                  order?.email,
                  'Customer',
                )
                const total = order?.totalAmount ?? order?.total ?? order?.amount
                const paymentStatus = (order?.paymentStatus || 'pending').toLowerCase()
                const orderStatus = (order?.orderStatus || 'pending').toLowerCase()
                const fulfillment = getOrderFulfillment(order)
                const fulfillmentStatus = String(fulfillment?.status || 'unfulfilled').toLowerCase()
                const createdAt = formatDateTime(order?.createdAt)
                const hasOrderId = Boolean(order?._id || order?.id)
                const itemCount = getNumberValue(order?.items?.length, order?.orderItems?.length, 0)
                const orderNumber = getOrderDisplayNumber(order, id)
                const trackingAvailable = hasOrderTracking(order)
                return (
                  <tr key={id} className="align-top text-slate-700 dark:text-slate-300">
                    <td className="min-w-[10rem]">
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {orderNumber}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Order state: {orderStatus}
                        </p>
                      </div>
                    </td>
                    <td className="min-w-[12rem]">
                      <div className="space-y-1">
                        <p className="font-medium text-slate-800 dark:text-slate-100">
                          {customerName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {order?.customer?.email || order?.email || 'No email'}
                        </p>
                      </div>
                    </td>
                    <td className="text-sm text-slate-600 dark:text-slate-400">
                      {itemCount}
                    </td>
                    <td className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(total)}
                    </td>
                    <td>
                      <div className="space-y-1">
                        <ModuleStatusBadge status={paymentStatus} />
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {getOrderPaymentMethodLabel(order) || 'No payment method recorded'}
                        </p>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-1">
                        <ModuleStatusBadge status={fulfillmentStatus} />
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {fulfillment?.carrier || 'Carrier pending'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {trackingAvailable ? fulfillment.trackingNumber : 'No tracking yet'}
                        </p>
                      </div>
                    </td>
                    <td className="text-slate-600 dark:text-slate-400">{createdAt}</td>
                    <td>
                      <ModuleActions wrap="wrap">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={!hasOrderId}
                          onClick={() => {
                            if (!hasOrderId) return
                            navigate(`/orders/${order?._id || order?.id}`)
                          }}
                        >
                          View
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!hasOrderId}
                          onClick={() => openEditDialog(order)}
                        >
                          Update
                        </Button>
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="border-slate-200 bg-white sm:max-w-lg dark:border-slate-800 dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">
              Update order operation
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Use this dialog for payment updates and non-shipping order state changes. Packed, shipped, and delivered transitions now belong in the Order Details fulfillment workspace.
            </DialogDescription>
          </DialogHeader>

          {editingOrder ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {getOrderDisplayNumber(editingOrder)}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {getCustomerDisplayName(editingOrder?.customer || {}, editingOrder?.email)}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Order state
                  </label>
                  <AdminSelect
                    value={editForm.orderStatus}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        orderStatus: event.target.value,
                      }))
                    }
                  >
                    {getAllowedOrderStatusOptions(editingOrder?.orderStatus).map((status) => (
                      <option key={status} value={status}>
                        {formatFilterOptionLabel(status, status)}
                      </option>
                    ))}
                  </AdminSelect>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Payment status
                  </label>
                  <AdminSelect
                    value={editForm.paymentStatus}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        paymentStatus: event.target.value,
                      }))
                    }
                  >
                    {PAYMENT_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {formatFilterOptionLabel(status, status)}
                      </option>
                    ))}
                  </AdminSelect>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Internal note
                </label>
                <Textarea
                  rows={3}
                  value={editForm.note}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                  placeholder="Add context for this status change"
                />
              </div>

              {saveButtonVariant === 'destructive' ? (
                <AdminAlert type="warning" title="High impact change">
                  Cancelled or refunded states can affect audit history and downstream customer communication.
                </AdminAlert>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={closeEditDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={saveButtonVariant}
              disabled={savingChanges}
              onClick={handleSaveOrderChanges}
            >
              {savingChanges ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  )
}

export default Orders
