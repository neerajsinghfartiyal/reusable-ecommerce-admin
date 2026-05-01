import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  getOrders,
  updateOrderStatus,
  updatePaymentStatus,
} from '../api/orderApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ModuleActions from '@/components/admin-ui/ModuleActions'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import ModuleEmptyState from '@/components/admin-ui/ModuleEmptyState'
import ModuleHeader from '@/components/admin-ui/ModuleHeader'
import ModuleStatusBadge from '@/components/admin-ui/ModuleStatusBadge'
import ModuleTable from '@/components/admin-ui/ModuleTable'
import ModuleToolbar from '@/components/admin-ui/ModuleToolbar'
import Pagination from '../components/ui/Pagination'

const paymentStatuses = [
  'all',
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
  'cod_pending',
]

const orderStatuses = [
  'all',
  'processing',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
]

const getNumberValue = (...values) => {
  for (const value of values) {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return 0
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(getNumberValue(value))

const extractOrders = (payload) => {
  if (Array.isArray(payload?.orders)) return payload.orders
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload)) return payload
  return []
}

function Orders() {
  const location = useLocation()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [orderFilter, setOrderFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [updatingRow, setUpdatingRow] = useState('')
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
      const params = { page: currentPage }
      if (searchQuery) params.search = searchQuery
      if (paymentFilter !== 'all') params.paymentStatus = paymentFilter
      if (orderFilter !== 'all') params.orderStatus = orderFilter

      const response = await getOrders(params)
      const payload = response?.data?.data || response?.data || {}
      const list = extractOrders(payload)
      const paginationData = payload?.pagination || {}

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
          10,
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
  }, [currentPage, searchQuery, paymentFilter, orderFilter, location.pathname])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setCurrentPage(1)
    setSearchQuery(searchInput.trim())
  }

  const handleUpdateOrderStatus = async (orderId, nextStatus) => {
    if (!orderId || !nextStatus) return
    setUpdatingRow(orderId)
    setError('')
    try {
      await updateOrderStatus(orderId, { orderStatus: nextStatus })
      await loadOrders()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update order status.')
    } finally {
      setUpdatingRow('')
    }
  }

  const handleUpdatePaymentStatus = async (orderId, nextStatus) => {
    if (!orderId || !nextStatus) return
    setUpdatingRow(orderId)
    setError('')
    try {
      await updatePaymentStatus(orderId, { paymentStatus: nextStatus })
      await loadOrders()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update payment status.')
    } finally {
      setUpdatingRow('')
    }
  }

  const goPrev = () => setCurrentPage((prev) => Math.max(1, prev - 1))
  const goNext = () =>
    setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))

  const columns = [
    { key: 'orderNumber', label: 'Order Number' },
    { key: 'customer', label: 'Customer' },
    { key: 'total', label: 'Total' },
    { key: 'paymentStatus', label: 'Payment Status' },
    { key: 'orderStatus', label: 'Order Status' },
    { key: 'createdAt', label: 'Created At' },
    { key: 'actions', label: 'Actions' },
  ]

  return (
    <section>
      <ModuleHeader
        title="Orders"
        description="Manage customer orders, payment status, fulfillment status, and order history."
      />

      <ModuleToolbar>
        <form className="flex w-full flex-col gap-2 sm:flex-row sm:items-center" onSubmit={handleSearchSubmit}>
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

        <select
          className="flex h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          value={paymentFilter}
          onChange={(event) => {
            setCurrentPage(1)
            setPaymentFilter(event.target.value)
          }}
        >
          {paymentStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          className="flex h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          value={orderFilter}
          onChange={(event) => {
            setCurrentPage(1)
            setOrderFilter(event.target.value)
          }}
        >
          {orderStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </ModuleToolbar>

      {loading ? (
        <ModuleCard>
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading orders...</p>
        </ModuleCard>
      ) : null}

      {error ? (
        <ModuleCard className="mb-3 border-red-200 bg-red-50 dark:border-red-900/70 dark:bg-red-950/30">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </ModuleCard>
      ) : null}

      {!loading && !error ? (
        <>
          {orders.length === 0 ? (
            <ModuleEmptyState
              title="No orders found"
              description="Try changing search or status filters to find matching orders."
            />
          ) : (
            <ModuleTable
              columns={columns}
              data={orders}
              renderRow={(order, index) => {
                const id = order?._id || order?.id || `order-${index}`
                const customerName =
                  `${order?.customer?.firstName || ''} ${
                    order?.customer?.lastName || ''
                  }`.trim() ||
                  order?.customer?.name ||
                  order?.customer?.email ||
                  order?.email ||
                  'Customer'
                const total = order?.totalAmount ?? order?.total ?? order?.amount
                const paymentStatus = (order?.paymentStatus || 'pending').toLowerCase()
                const orderStatus = (order?.orderStatus || 'processing').toLowerCase()
                const createdAt = order?.createdAt
                  ? new Date(order.createdAt).toLocaleString()
                  : '-'
                const hasOrderId = Boolean(order?._id || order?.id)

                return (
                  <tr key={id} className="text-slate-700 dark:text-slate-300">
                    <td className="font-medium text-slate-800 dark:text-slate-100">{order?.orderNumber || order?.invoiceNumber || id}</td>
                    <td className="text-slate-700 dark:text-slate-300">{customerName}</td>
                    <td className="text-slate-800 dark:text-slate-200">{formatCurrency(total)}</td>
                    <td>
                      <ModuleStatusBadge status={paymentStatus} />
                      <select
                        className="mt-1 flex h-8 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:text-slate-500"
                        value={paymentStatus}
                        disabled={updatingRow === id}
                        onChange={(event) =>
                          handleUpdatePaymentStatus(id, event.target.value)
                        }
                      >
                        {paymentStatuses
                          .filter((item) => item !== 'all')
                          .map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td>
                      <ModuleStatusBadge status={orderStatus} />
                      <select
                        className="mt-1 flex h-8 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:text-slate-500"
                        value={orderStatus}
                        disabled={updatingRow === id}
                        onChange={(event) =>
                          handleUpdateOrderStatus(id, event.target.value)
                        }
                      >
                        {orderStatuses
                          .filter((item) => item !== 'all')
                          .map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="text-slate-600 dark:text-slate-400">{createdAt}</td>
                    <td>
                      <ModuleActions>
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

export default Orders
