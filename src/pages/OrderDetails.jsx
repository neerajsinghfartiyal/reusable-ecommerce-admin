import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  getOrderById,
  syncOrderOperations,
  updateOrderFulfillment,
} from '../api/orderApi'
import { createReturnRequest, getReturnRequests } from '../api/returnApi'
import { getActivityLogs } from '../api/activityLogApi'
import AdminAlert from '@/components/admin-ui/AdminAlert'
import AdminField from '@/components/admin-ui/AdminField'
import AdminPage from '@/components/admin-ui/AdminPage'
import AdminSelect from '@/components/admin-ui/AdminSelect'
import ConfirmActionDialog from '@/components/admin-ui/ConfirmActionDialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import ModuleActions from '@/components/admin-ui/ModuleActions'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import ModuleFormGrid from '@/components/admin-ui/ModuleFormGrid'
import ModuleStatusBadge from '@/components/admin-ui/ModuleStatusBadge'
import ModuleTable from '@/components/admin-ui/ModuleTable'
import SalesActivityTimeline from '@/components/sales/SalesActivityTimeline'
import { adminLinkButtonClass } from '@/components/admin-ui/adminStyles'
import {
  extractEntity,
  extractList,
  formatDateTime,
  getCustomerDisplayName,
  getNumberValue,
  getOrderDisplayNumber,
  getOrderFulfillment,
  getOrderShipmentAddress,
  getOrderShippingMethodMeta,
  getOrderPaymentMethodMeta,
  isReplacementOrder,
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  RETURN_REQUEST_TYPES,
} from '@/lib/sales'
import { useFormatCurrency } from '@/hooks/useFormatCurrency'

const FULFILLMENT_ACTIONS = {
  packed: {
    title: 'Mark order as packed?',
    description:
      'Use this when the order is physically packed and ready for carrier handoff.',
    confirmLabel: 'Mark packed',
  },
  shipped: {
    title: 'Mark order as shipped?',
    description:
      'This will record the shipment handoff and move the order into the shipped state.',
    confirmLabel: 'Mark shipped',
  },
  delivered: {
    title: 'Mark order as delivered?',
    description:
      'Use this only when delivery has been confirmed. Delivered orders can then move into returns workflows.',
    confirmLabel: 'Mark delivered',
  },
}

const FULFILLMENT_TIMELINE_ACTIONS = new Set([
  'SHIPMENT_CREATED',
  'TRACKING_ADDED',
  'ORDER_PACKED',
  'ORDER_SHIPPED',
  'ORDER_DELIVERED',
  'ORDER_RETURNED',
  'FULFILLMENT_NOTE_ADDED',
  'ORDER_FULFILLMENT_UPDATED',
])

const returnItemConditions = ['unopened', 'opened', 'damaged', 'wrong_item', 'other']

const getImageUrl = (imagePath) => {
  if (!imagePath) return ''
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
  return `${baseUrl}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`
}

function OrderDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const formatCurrency = useFormatCurrency()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [updatingOperations, setUpdatingOperations] = useState(false)
  const [savingFulfillment, setSavingFulfillment] = useState(false)
  const [orderNote, setOrderNote] = useState('')
  const [selectedOrderStatus, setSelectedOrderStatus] = useState('pending')
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('pending')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [fulfillmentForm, setFulfillmentForm] = useState({
    carrier: '',
    trackingNumber: '',
    trackingUrl: '',
    notes: '',
  })
  const [fulfillmentDialog, setFulfillmentDialog] = useState({
    open: false,
    status: '',
  })
  const [creatingReturn, setCreatingReturn] = useState(false)
  const [returnError, setReturnError] = useState('')
  const [relatedReturns, setRelatedReturns] = useState([])
  const [relatedReturnsLoading, setRelatedReturnsLoading] = useState(true)
  const [activityLogs, setActivityLogs] = useState([])
  const [activityLoading, setActivityLoading] = useState(true)
  const [activityError, setActivityError] = useState('')
  const [returnForm, setReturnForm] = useState({
    type: 'return',
    reason: '',
    notes: '',
    selectedItemKey: '',
    quantity: 1,
    itemReason: '',
    condition: 'other',
    restockable: false,
  })

  const loadOrder = async () => {
    if (!id) return

    setLoading(true)
    setError('')

    try {
      const response = await getOrderById(id)
      const details = extractEntity(response, ['order', 'item'])
      const fulfillment = getOrderFulfillment(details)

      setOrder(details)
      setSelectedOrderStatus((details?.orderStatus || 'pending').toLowerCase())
      setSelectedPaymentStatus((details?.paymentStatus || 'pending').toLowerCase())
      setPaymentMethod(details?.paymentMethod || '')
      setPaymentReference(details?.paymentReference || '')
      setOrderNote(details?.notes || '')
      setFulfillmentForm({
        carrier: fulfillment.carrier,
        trackingNumber: fulfillment.trackingNumber,
        trackingUrl: fulfillment.trackingUrl,
        notes: fulfillment.notes,
      })
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load order details.')
    } finally {
      setLoading(false)
    }
  }

  const loadRelatedData = async () => {
    if (!id) return

    setRelatedReturnsLoading(true)
    setActivityLoading(true)
    setActivityError('')

    try {
      const [returnsResponse, activityResponse] = await Promise.all([
        getReturnRequests({ order: id, limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
        getActivityLogs({
          module: 'ORDER',
          entityType: 'Order',
          entityId: id,
          limit: 10,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        }),
      ])

      setRelatedReturns(extractList(returnsResponse, ['returnRequests']))
      setActivityLogs(extractList(activityResponse, ['logs']))
    } catch (err) {
      setActivityError(err?.response?.data?.message || 'Failed to load related activity.')
    } finally {
      setRelatedReturnsLoading(false)
      setActivityLoading(false)
    }
  }

  useEffect(() => {
    loadOrder()
    loadRelatedData()
  }, [id])

  const getItemProductId = (item) => {
    const product = item?.product
    if (product && typeof product === 'object') {
      return product?._id || product?.id || ''
    }
    return product || ''
  }

  const buildOrderItemOptions = (orderItems) =>
    orderItems
      .map((item, index) => {
        const productId = getItemProductId(item)
        const maxQuantity = getNumberValue(item?.quantity, 0)
        const productName = item?.product?.name || item?.productName || item?.name || 'Product'
        const sku = item?.product?.sku || item?.sku || '-'
        const key = `${productId}-${index}`

        if (!productId || maxQuantity < 1) return null

        return {
          key,
          productId,
          productName,
          sku,
          maxQuantity,
        }
      })
      .filter(Boolean)

  const handleReturnFormChange = (field, value) => {
    setReturnForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const resetReturnForm = () => {
    setReturnForm({
      type: 'return',
      reason: '',
      notes: '',
      selectedItemKey: '',
      quantity: 1,
      itemReason: '',
      condition: 'other',
      restockable: false,
    })
  }

  const handleSaveOperations = async () => {
    if (!id || !order) return

    setUpdatingOperations(true)
    setError('')
    setSuccessMessage('')

    try {
      await syncOrderOperations(id, {
        currentOrderStatus,
        nextOrderStatus: selectedOrderStatus,
        currentPaymentStatus,
        nextPaymentStatus: selectedPaymentStatus,
        notes: orderNote,
        paymentMethod,
        paymentReference,
      })
      setSuccessMessage('Order operations updated successfully.')
      await loadOrder()
      await loadRelatedData()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update order operations.')
    } finally {
      setUpdatingOperations(false)
    }
  }

  const handleSaveFulfillmentInfo = async () => {
    if (!id) return

    setSavingFulfillment(true)
    setError('')
    setSuccessMessage('')

    try {
      await updateOrderFulfillment(id, {
        carrier: fulfillmentForm.carrier,
        trackingNumber: fulfillmentForm.trackingNumber,
        trackingUrl: fulfillmentForm.trackingUrl,
        notes: fulfillmentForm.notes,
      })
      setSuccessMessage('Shipment details updated successfully.')
      await loadOrder()
      await loadRelatedData()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update shipment details.')
    } finally {
      setSavingFulfillment(false)
    }
  }

  const openFulfillmentDialog = (status) =>
    setFulfillmentDialog({
      open: true,
      status,
    })

  const closeFulfillmentDialog = () =>
    setFulfillmentDialog({
      open: false,
      status: '',
    })

  const handleConfirmFulfillmentAction = async () => {
    if (!id || !fulfillmentDialog.status) return

    setSavingFulfillment(true)
    setError('')
    setSuccessMessage('')

    try {
      await updateOrderFulfillment(id, {
        status: fulfillmentDialog.status,
        carrier: fulfillmentForm.carrier,
        trackingNumber: fulfillmentForm.trackingNumber,
        trackingUrl: fulfillmentForm.trackingUrl,
        notes: fulfillmentForm.notes,
      })
      closeFulfillmentDialog()
      setSuccessMessage('Fulfillment state updated successfully.')
      await loadOrder()
      await loadRelatedData()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update fulfillment.')
    } finally {
      setSavingFulfillment(false)
    }
  }

  const handleCreateReturnRequest = async (event) => {
    event.preventDefault()
    setReturnError('')
    setSuccessMessage('')

    if (String(orderStatus).toLowerCase() !== 'delivered') {
      setReturnError('Return/Exchange requests are allowed only for delivered orders.')
      return
    }

    if (!order?._id) {
      setReturnError('Order ID is missing for this request.')
      return
    }

    if (!RETURN_REQUEST_TYPES.includes(returnForm.type)) {
      setReturnError('Please choose a valid request type.')
      return
    }

    if (!returnForm.reason.trim()) {
      setReturnError('Please enter a reason for this request.')
      return
    }

    const selectedItem = orderItemOptions.find((item) => item.key === returnForm.selectedItemKey)

    if (!selectedItem) {
      setReturnError('Please select an order item.')
      return
    }

    const quantity = Math.floor(getNumberValue(returnForm.quantity, 0))
    if (quantity < 1) {
      setReturnError('Quantity must be at least 1.')
      return
    }

    if (quantity > selectedItem.maxQuantity) {
      setReturnError(
        `Quantity cannot exceed ordered quantity (${selectedItem.maxQuantity}).`,
      )
      return
    }

    setCreatingReturn(true)
    try {
      const response = await createReturnRequest({
        order: order._id,
        type: returnForm.type,
        reason: returnForm.reason.trim(),
        notes: returnForm.notes.trim(),
        items: [
          {
            product: selectedItem.productId,
            quantity,
            reason: returnForm.itemReason.trim(),
            condition: returnForm.condition,
            restockable: Boolean(returnForm.restockable),
          },
        ],
      })

      const createdRequest = extractEntity(response, ['returnRequest', 'item'])
      const requestId = createdRequest?._id || createdRequest?.id

      resetReturnForm()
      navigate(requestId ? `/returns/${requestId}` : '/returns')
    } catch (err) {
      setReturnError(
        err?.response?.data?.message || 'Failed to create return/exchange request.',
      )
    } finally {
      setCreatingReturn(false)
    }
  }

  const customerName = getCustomerDisplayName(order?.customer || {}, order?.email)
  const items = Array.isArray(order?.items)
    ? order.items
    : Array.isArray(order?.orderItems)
      ? order.orderItems
      : []
  const orderNumber = getOrderDisplayNumber(order)
  const replacementOrder = isReplacementOrder(order || {})
  const sourceOrderId = order?.sourceOrder?._id || order?.sourceOrder?.id || order?.sourceOrder || ''
  const sourceOrderNumber = order?.sourceOrder?.orderNumber || sourceOrderId
  const linkedReturnRequestId =
    order?.returnRequest?._id || order?.returnRequest?.id || order?.returnRequest || ''
  const currentPaymentStatus = (order?.paymentStatus || 'pending').toLowerCase()
  const currentOrderStatus = (order?.orderStatus || 'pending').toLowerCase()
  const fulfillment = getOrderFulfillment(order || {})
  const currentFulfillmentStatus = (fulfillment.status || 'unfulfilled').toLowerCase()
  const orderStatus = currentOrderStatus
  const createdAt = formatDateTime(order?.createdAt)
  const subtotal = order?.subtotal ?? order?.subTotal ?? 0
  const taxAmount = order?.taxAmount ?? order?.tax ?? 0
  const shippingAmount = order?.shippingAmount ?? order?.shipping ?? 0
  const discountAmount = order?.discountAmount ?? order?.discount ?? 0
  const totalAmount = order?.totalAmount ?? order?.total ?? order?.amount ?? 0
  const orderItemOptions = buildOrderItemOptions(items)
  const customerId = order?.customer?._id || order?.customer?.id || ''
  const address = getOrderShipmentAddress(order || {})
  const shippingMethodMeta = getOrderShippingMethodMeta(order || {})
  const paymentMethodMeta = getOrderPaymentMethodMeta(order || {})
  const hasSnapshotAddress = Boolean(
    order?.shippingAddressSnapshot && Object.values(order.shippingAddressSnapshot).some(Boolean),
  )
  const allowedOrderStatusOptions =
    ['pending', 'processing'].includes(currentOrderStatus) || currentOrderStatus === 'cancelled'
      ? ORDER_STATUS_OPTIONS.filter((status) =>
          ['pending', 'processing', 'cancelled'].includes(status),
        )
      : [currentOrderStatus]
  const canEditOrderState = ['pending', 'processing', 'cancelled'].includes(currentOrderStatus)
  const itemColumns = [
    { key: 'product', label: 'Product' },
    { key: 'sku', label: 'SKU' },
    { key: 'price', label: 'Price' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'total', label: 'Total' },
  ]
  const shipmentTimelineLogs = useMemo(() => {
    const filtered = activityLogs.filter((log) =>
      FULFILLMENT_TIMELINE_ACTIONS.has(String(log?.action || '')),
    )

    return filtered.length > 0 ? filtered : activityLogs
  }, [activityLogs])

  if (loading) {
    return (
      <AdminPage
        headerMode="compact"
        title="Order Details"
        description="Review order information, fulfillment state, and shipment operations."
        actions={
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={adminLinkButtonClass}
            onClick={() => navigate('/orders')}
          >
            Back to Orders
          </Button>
        }
      >
        <ModuleCard>
          <AdminAlert type="info" title="Loading">
            Loading order details...
          </AdminAlert>
        </ModuleCard>
      </AdminPage>
    )
  }

  return (
    <AdminPage
      headerMode="compact"
      title="Order Details"
      description="Review order information, shipment state, related returns, and operational history."
      actions={
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={adminLinkButtonClass}
          onClick={() => navigate('/orders')}
        >
          Back to Orders
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">#{orderNumber}</p>
        <ModuleStatusBadge status={currentPaymentStatus} />
        <ModuleStatusBadge status={currentOrderStatus} />
        <ModuleStatusBadge status={currentFulfillmentStatus} />
        {replacementOrder ? <ModuleStatusBadge status="replacement" /> : null}
        {customerId ? (
          <Link to={`/customers/${customerId}`} className={adminLinkButtonClass}>
            View Customer
          </Link>
        ) : null}
      </div>

      {error ? (
        <AdminAlert type="error" title="Request failed">
          {error}
        </AdminAlert>
      ) : null}

      {successMessage ? (
        <AdminAlert type="success" title="Success">
          {successMessage}
        </AdminAlert>
      ) : null}

      {replacementOrder ? (
        <AdminAlert type="info" title="Replacement order">
          This order was created as a replacement shipment.
          {sourceOrderId ? (
            <>
              {' '}
              Source order:{' '}
              <Link to={`/orders/${sourceOrderId}`} className={adminLinkButtonClass}>
                {sourceOrderNumber}
              </Link>
            </>
          ) : null}
          {linkedReturnRequestId ? (
            <>
              {' '}
              Exchange request:{' '}
              <Link to={`/returns/${linkedReturnRequestId}`} className={adminLinkButtonClass}>
                View return
              </Link>
            </>
          ) : null}
        </AdminAlert>
      ) : null}

      {currentOrderStatus === 'cancelled' ? (
        <AdminAlert type="warning" title="Order cancelled">
          Fulfillment actions are disabled because this order has been cancelled.
        </AdminAlert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <ModuleCard title="Order Summary">
          <div className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
            <p>
              <strong>Order Number:</strong> {orderNumber}
            </p>
            <p>
              <strong>Placed At:</strong> {createdAt}
            </p>
            <p>
              <strong>Items:</strong> {items.length}
            </p>
            <p>
              <strong>Total:</strong> {formatCurrency(totalAmount)}
            </p>
          </div>
        </ModuleCard>

        <ModuleCard
          title="Customer"
          actions={
            customerId ? (
              <Link to={`/customers/${customerId}`} className={adminLinkButtonClass}>
                Open customer
              </Link>
            ) : null
          }
        >
          <div className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
            <p>
              <strong>Name:</strong> {customerName}
            </p>
            <p>
              <strong>Email:</strong> {order?.customer?.email || order?.email || 'Not available'}
            </p>
            <p>
              <strong>Phone:</strong> {order?.customer?.phone || order?.phone || 'Not available'}
            </p>
          </div>
        </ModuleCard>

        <ModuleCard title="Shipping Snapshot">
          <div className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
            <p>
              <strong>Shipping Method:</strong>{' '}
              {shippingMethodMeta.label || 'Not recorded (legacy order)'}
            </p>
            {shippingMethodMeta.code ? (
              <p>
                <strong>Method Code:</strong> {shippingMethodMeta.code}
              </p>
            ) : null}
            {shippingMethodMeta.type ? (
              <p>
                <strong>Method Type:</strong>{' '}
                {shippingMethodMeta.type.replace(/_/g, ' ')}
              </p>
            ) : null}
            {shippingMethodMeta.instructions ? (
              <p>
                <strong>Instructions:</strong> {shippingMethodMeta.instructions}
              </p>
            ) : null}
            <p>
              <strong>Recipient:</strong>{' '}
              {[address?.firstName, address?.lastName].filter(Boolean).join(' ') || customerName}
            </p>
            <p>
              <strong>Phone:</strong> {address?.phone || order?.customer?.phone || 'Not captured'}
            </p>
            <p>
              <strong>Street:</strong> {address?.street || 'Not captured'}
            </p>
            <p>
              <strong>City:</strong> {address?.city || 'Not captured'}
            </p>
            <p>
              <strong>State:</strong> {address?.state || 'Not captured'}
            </p>
            <p>
              <strong>Postal Code:</strong> {address?.postalCode || 'Not captured'}
            </p>
            <p>
              <strong>Country:</strong> {address?.country || 'Not captured'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {hasSnapshotAddress
                ? 'This shipment view is using the order-level shipping snapshot.'
                : 'This order predates shipping snapshots, so the linked customer address is shown as a fallback.'}
            </p>
          </div>
        </ModuleCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <ModuleCard title="Ordered Items">
          <ModuleTable
            columns={itemColumns}
            data={items}
            emptyMessage="No items found."
            renderRow={(item, index) => {
              const productName = item?.product?.name || item?.name || 'Product'
              const sku = item?.product?.sku || item?.sku || '-'
              const price = getNumberValue(item?.price, item?.unitPrice)
              const quantity = getNumberValue(item?.quantity, 0)
              const total = getNumberValue(item?.total, price * quantity)
              const imagePath =
                item?.product?.featuredImage ||
                item?.product?.image ||
                item?.image ||
                item?.product?.galleryImages?.[0]

              return (
                <tr
                  key={item?._id || item?.id || `order-item-${index}`}
                  className="text-slate-700 dark:text-slate-200"
                >
                  <td>
                    <div className="product-cell">
                      {imagePath ? (
                        <img
                          src={getImageUrl(imagePath)}
                          alt={productName}
                          className="product-thumb"
                        />
                      ) : (
                        <div className="product-thumb product-thumb-fallback">
                          {productName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="order-item-product-name text-slate-900 dark:text-slate-100">
                          {productName}
                        </p>
                        <p className="order-item-product-sku dark:text-slate-400">SKU: {sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="order-item-subtle dark:text-slate-400">{sku}</td>
                  <td className="order-item-num">{formatCurrency(price)}</td>
                  <td className="order-item-num">{quantity}</td>
                  <td className="order-item-num">{formatCurrency(total)}</td>
                </tr>
              )
            }}
          />
        </ModuleCard>

        <div className="space-y-4">
          <ModuleCard title="Payment / Order Controls">
            <ModuleFormGrid columns={2}>
              <AdminField label="Order State">
                <AdminSelect
                  value={selectedOrderStatus}
                  disabled={!canEditOrderState || updatingOperations}
                  className="disabled:opacity-70 dark:disabled:text-slate-400"
                  onChange={(event) => setSelectedOrderStatus(event.target.value)}
                >
                  {allowedOrderStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </AdminSelect>
              </AdminField>

              <AdminField label="Payment Status">
                <AdminSelect
                  value={selectedPaymentStatus}
                  disabled={updatingOperations}
                  className="disabled:opacity-70 dark:disabled:text-slate-400"
                  onChange={(event) => setSelectedPaymentStatus(event.target.value)}
                >
                  {PAYMENT_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </AdminSelect>
              </AdminField>

              <AdminField label="Payment Method Note">
                <Input
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  placeholder="Optional override or legacy payment note"
                />
              </AdminField>
              {paymentMethodMeta.label ? (
                <p className="md:col-span-2 text-xs text-slate-500 dark:text-slate-400">
                  Structured checkout method: {paymentMethodMeta.label}
                  {paymentMethodMeta.code ? ` (${paymentMethodMeta.code})` : ''}
                </p>
              ) : null}

              <AdminField label="Payment Reference">
                <Input
                  value={paymentReference}
                  onChange={(event) => setPaymentReference(event.target.value)}
                  placeholder="Gateway or settlement reference"
                />
              </AdminField>

              <AdminField label="Internal Note" className="md:col-span-2">
                <Textarea
                  rows={3}
                  value={orderNote}
                  onChange={(event) => setOrderNote(event.target.value)}
                  placeholder="Add order-level context for operations or finance"
                />
              </AdminField>
            </ModuleFormGrid>

            <ModuleActions className="mt-4 justify-end">
              <Button type="button" size="sm" disabled={updatingOperations} onClick={handleSaveOperations}>
                {updatingOperations ? 'Saving...' : 'Save payment / order changes'}
              </Button>
            </ModuleActions>
          </ModuleCard>

          <ModuleCard title="Fulfillment Workspace">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Fulfillment status
                  </p>
                  <ModuleStatusBadge status={currentFulfillmentStatus} />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Carrier: {fulfillment.carrier || 'Not assigned'}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Tracking: {fulfillment.trackingNumber || 'Not recorded'}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Tracking URL:{' '}
                  {fulfillment.trackingUrl ? (
                    <a
                      href={fulfillment.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline-offset-2 hover:underline dark:text-blue-300"
                    >
                      Open tracking
                    </a>
                  ) : (
                    'Not recorded'
                  )}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Shipped: {formatDateTime(fulfillment.shippedAt)}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Delivered: {formatDateTime(fulfillment.deliveredAt)}
                </p>
              </div>

              <div className="space-y-2">
                <AdminField label="Carrier">
                  <Input
                    value={fulfillmentForm.carrier}
                    onChange={(event) =>
                      setFulfillmentForm((current) => ({
                        ...current,
                        carrier: event.target.value,
                      }))
                    }
                    placeholder="DHL, FedEx, UPS..."
                  />
                </AdminField>

                <AdminField label="Tracking Number">
                  <Input
                    value={fulfillmentForm.trackingNumber}
                    onChange={(event) =>
                      setFulfillmentForm((current) => ({
                        ...current,
                        trackingNumber: event.target.value,
                      }))
                    }
                    placeholder="Shipment tracking number"
                  />
                </AdminField>

                <AdminField label="Tracking URL">
                  <Input
                    value={fulfillmentForm.trackingUrl}
                    onChange={(event) =>
                      setFulfillmentForm((current) => ({
                        ...current,
                        trackingUrl: event.target.value,
                      }))
                    }
                    placeholder="https://carrier.example/track/..."
                  />
                </AdminField>
              </div>
            </div>

            <AdminField label="Fulfillment Note" className="mt-4">
              <Textarea
                rows={3}
                value={fulfillmentForm.notes}
                onChange={(event) =>
                  setFulfillmentForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="Add packing, dispatch, or delivery context"
              />
            </AdminField>

            {['processing', 'packed'].includes(currentFulfillmentStatus) &&
            !String(fulfillmentForm.trackingNumber || '').trim() ? (
              <AdminAlert type="info" title="Tracking needed before shipment" className="mt-4">
                Add a tracking number before marking this order as shipped.
              </AdminAlert>
            ) : null}

            {currentOrderStatus !== 'cancelled' ? (
              <ModuleActions className="mt-4 justify-between" wrap="wrap">
                <div className="flex flex-wrap gap-2">
                  {['unfulfilled', 'processing'].includes(currentFulfillmentStatus) ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={savingFulfillment}
                      onClick={() => openFulfillmentDialog('packed')}
                    >
                      Mark packed
                    </Button>
                  ) : null}
                  {['processing', 'packed'].includes(currentFulfillmentStatus) ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={savingFulfillment}
                      onClick={() => openFulfillmentDialog('shipped')}
                    >
                      Mark shipped
                    </Button>
                  ) : null}
                  {currentFulfillmentStatus === 'shipped' ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={savingFulfillment}
                      onClick={() => openFulfillmentDialog('delivered')}
                    >
                      Mark delivered
                    </Button>
                  ) : null}
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={savingFulfillment}
                  onClick={handleSaveFulfillmentInfo}
                >
                  {savingFulfillment ? 'Saving...' : 'Save shipment info'}
                </Button>
              </ModuleActions>
            ) : null}
          </ModuleCard>

          <ModuleCard title="Payment / Totals">
            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
              <p>
                <strong>Subtotal:</strong> {formatCurrency(subtotal)}
              </p>
              <p>
                <strong>Tax:</strong> {formatCurrency(taxAmount)}
              </p>
              <p>
                <strong>Shipping:</strong> {formatCurrency(shippingAmount)}
                {shippingMethodMeta.label ? ` (${shippingMethodMeta.label})` : ''}
              </p>
              <p>
                <strong>Discount:</strong> {formatCurrency(discountAmount)}
              </p>
              <p>
                <strong>Payment Method:</strong>{' '}
                {paymentMethodMeta.label || order?.paymentMethod || 'Not recorded (legacy order)'}
              </p>
              {paymentMethodMeta.code ? (
                <p>
                  <strong>Payment Code:</strong> {paymentMethodMeta.code}
                </p>
              ) : null}
              {paymentMethodMeta.provider ? (
                <p>
                  <strong>Provider:</strong> {paymentMethodMeta.provider.replace(/_/g, ' ')}
                </p>
              ) : null}
              {paymentMethodMeta.instructions ? (
                <p>
                  <strong>Payment Instructions:</strong> {paymentMethodMeta.instructions}
                </p>
              ) : null}
              <p>
                <strong>Payment Reference:</strong> {order?.paymentReference || 'Not recorded'}
              </p>
              <p className="total-strong border-slate-200 text-slate-900 dark:border-slate-700 dark:text-slate-100">
                <strong>Total:</strong> {formatCurrency(totalAmount)}
              </p>
            </div>
          </ModuleCard>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <ModuleCard
          title="Related Returns"
          description="Return and exchange requests linked to this order."
        >
          {relatedReturnsLoading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading related requests…</p>
          ) : relatedReturns.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No return or exchange requests are linked to this order yet.
            </p>
          ) : (
            <div className="space-y-3">
              {relatedReturns.map((request) => {
                const requestId = request?._id || request?.id

                return (
                  <div
                    key={requestId}
                    className="rounded-lg border border-slate-200/80 bg-slate-50/70 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/50"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <ModuleStatusBadge status={request?.type || 'return'} />
                          <ModuleStatusBadge status={request?.status || 'requested'} />
                        </div>
                        <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                          {request?.reason || 'No reason provided'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Created {formatDateTime(request?.createdAt)}
                        </p>
                      </div>
                      {requestId ? (
                        <Link to={`/returns/${requestId}`} className={adminLinkButtonClass}>
                          View request
                        </Link>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ModuleCard>

        <SalesActivityTimeline
          title="Shipment Timeline"
          description="Recent packing, dispatch, delivery, and fulfillment updates for this order."
          logs={shipmentTimelineLogs}
          loading={activityLoading}
          error={activityError}
          emptyMessage="No shipment activity has been recorded yet."
        />
      </div>

      {orderStatus === 'delivered' ? (
        <ModuleCard title="Create Return / Exchange Request">
          {returnError ? (
            <AdminAlert type="error" title="Request failed" className="mb-3">
              {returnError}
            </AdminAlert>
          ) : null}

          <form onSubmit={handleCreateReturnRequest}>
            <ModuleFormGrid columns={2}>
              <AdminField label="Type">
                <AdminSelect
                  value={returnForm.type}
                  onChange={(event) => handleReturnFormChange('type', event.target.value)}
                >
                  {RETURN_REQUEST_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </AdminSelect>
              </AdminField>

              <AdminField label="Reason">
                <Input
                  type="text"
                  value={returnForm.reason}
                  onChange={(event) => handleReturnFormChange('reason', event.target.value)}
                  placeholder="Why is this request being created?"
                />
              </AdminField>

              <AdminField label="Notes" className="md:col-span-2">
                <Textarea
                  rows={3}
                  value={returnForm.notes}
                  onChange={(event) => handleReturnFormChange('notes', event.target.value)}
                  placeholder="Optional notes"
                />
              </AdminField>

              <AdminField label="Order Item">
                <AdminSelect
                  value={returnForm.selectedItemKey}
                  onChange={(event) =>
                    handleReturnFormChange('selectedItemKey', event.target.value)
                  }
                >
                  <option value="">Select order item</option>
                  {orderItemOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.productName} ({option.sku}) - Max {option.maxQuantity}
                    </option>
                  ))}
                </AdminSelect>
              </AdminField>

              <AdminField label="Quantity">
                <Input
                  type="number"
                  min="1"
                  max={
                    orderItemOptions.find((item) => item.key === returnForm.selectedItemKey)
                      ?.maxQuantity || 1
                  }
                  value={returnForm.quantity}
                  onChange={(event) => handleReturnFormChange('quantity', event.target.value)}
                />
              </AdminField>

              <AdminField label="Item Reason">
                <Input
                  type="text"
                  value={returnForm.itemReason}
                  onChange={(event) => handleReturnFormChange('itemReason', event.target.value)}
                  placeholder="Reason for this item"
                />
              </AdminField>

              <AdminField label="Condition">
                <AdminSelect
                  value={returnForm.condition}
                  onChange={(event) => handleReturnFormChange('condition', event.target.value)}
                >
                  {returnItemConditions.map((condition) => (
                    <option key={condition} value={condition}>
                      {condition}
                    </option>
                  ))}
                </AdminSelect>
              </AdminField>

              <AdminField label="Restock" className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Checkbox
                    checked={returnForm.restockable}
                    onCheckedChange={(checked) =>
                      handleReturnFormChange('restockable', checked === true)
                    }
                  />
                  Mark this item as restockable
                </label>
              </AdminField>
            </ModuleFormGrid>

            <ModuleActions className="mt-4 justify-end">
              <Button type="submit" size="sm" disabled={creatingReturn}>
                {creatingReturn ? 'Creating...' : 'Create Return / Exchange'}
              </Button>
            </ModuleActions>
          </form>
        </ModuleCard>
      ) : null}

      <ConfirmActionDialog
        open={fulfillmentDialog.open}
        onOpenChange={(open) => {
          if (!open) closeFulfillmentDialog()
        }}
        title={FULFILLMENT_ACTIONS[fulfillmentDialog.status]?.title || 'Confirm fulfillment action'}
        description={
          FULFILLMENT_ACTIONS[fulfillmentDialog.status]?.description ||
          'Review this fulfillment action before continuing.'
        }
        confirmLabel={savingFulfillment ? 'Saving…' : FULFILLMENT_ACTIONS[fulfillmentDialog.status]?.confirmLabel || 'Confirm'}
        confirmDisabled={savingFulfillment}
        onConfirm={handleConfirmFulfillmentAction}
      />
    </AdminPage>
  )
}

export default OrderDetails
