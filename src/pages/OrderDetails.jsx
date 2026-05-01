import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
} from '../api/orderApi'
import { createReturnRequest } from '../api/returnApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import ModuleActions from '@/components/admin-ui/ModuleActions'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import ModuleFormGrid from '@/components/admin-ui/ModuleFormGrid'
import ModuleHeader from '@/components/admin-ui/ModuleHeader'
import ModuleStatusBadge from '@/components/admin-ui/ModuleStatusBadge'
import ModuleTable from '@/components/admin-ui/ModuleTable'

const orderStatuses = ['processing', 'confirmed', 'shipped', 'delivered', 'cancelled']
const paymentStatuses = [
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
  'cod_pending',
]
const returnRequestTypes = ['return', 'exchange']
const returnItemConditions = ['unopened', 'opened', 'damaged', 'wrong_item', 'other']

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

const getImageUrl = (imagePath) => {
  if (!imagePath) return ''
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
  return `${baseUrl}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`
}

const extractOrder = (response) =>
  response?.data?.data?.order ||
  response?.data?.data?.item ||
  response?.data?.data ||
  response?.data?.order ||
  response?.data?.item ||
  response?.data ||
  {}

function OrderDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [updating, setUpdating] = useState(false)
  const [statusNote, setStatusNote] = useState('')
  const [selectedOrderStatus, setSelectedOrderStatus] = useState('processing')
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('pending')
  const [creatingReturn, setCreatingReturn] = useState(false)
  const [returnError, setReturnError] = useState('')
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
      const details = extractOrder(response)
      setOrder(details)
      setSelectedOrderStatus((details?.orderStatus || 'processing').toLowerCase())
      setSelectedPaymentStatus((details?.paymentStatus || 'pending').toLowerCase())
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load order details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrder()
  }, [id])

  const handleOrderStatusUpdate = async () => {
    if (!id) return
    setUpdating(true)
    setError('')
    setSuccessMessage('')
    try {
      await updateOrderStatus(id, {
        orderStatus: selectedOrderStatus,
        notes: statusNote,
      })
      setSuccessMessage('Order status updated successfully.')
      await loadOrder()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update order status.')
    } finally {
      setUpdating(false)
    }
  }

  const handlePaymentStatusUpdate = async () => {
    if (!id) return
    setUpdating(true)
    setError('')
    setSuccessMessage('')
    try {
      await updatePaymentStatus(id, {
        paymentStatus: selectedPaymentStatus,
        notes: statusNote,
      })
      setSuccessMessage('Payment status updated successfully.')
      await loadOrder()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update payment status.')
    } finally {
      setUpdating(false)
    }
  }

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

    if (!returnRequestTypes.includes(returnForm.type)) {
      setReturnError('Please choose a valid request type.')
      return
    }

    if (!returnForm.reason.trim()) {
      setReturnError('Please enter a reason for this request.')
      return
    }

    const selectedItem = orderItemOptions.find(
      (item) => item.key === returnForm.selectedItemKey,
    )

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
      await createReturnRequest({
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
      setSuccessMessage('Return/Exchange request created successfully.')
      resetReturnForm()
      navigate('/returns')
    } catch (err) {
      setReturnError(
        err?.response?.data?.message || 'Failed to create return/exchange request.',
      )
    } finally {
      setCreatingReturn(false)
    }
  }

  const customerName =
    `${order?.customer?.firstName || ''} ${order?.customer?.lastName || ''}`.trim() ||
    order?.customer?.name ||
    order?.customer?.email ||
    order?.email ||
    'Customer'

  const items = Array.isArray(order?.items)
    ? order.items
    : Array.isArray(order?.orderItems)
      ? order.orderItems
      : []
  const orderNumber = order?.orderNumber || order?.invoiceNumber || order?._id || '-'
  const currentPaymentStatus = (order?.paymentStatus || 'pending').toLowerCase()
  const currentOrderStatus = (order?.orderStatus || 'processing').toLowerCase()
  const orderStatus = currentOrderStatus
  const finalOrderStatuses = ['cancelled', 'delivered']
  const isFinalOrderStatus = finalOrderStatuses.includes(
    String(orderStatus || '').toLowerCase(),
  )
  const createdAt = order?.createdAt ? new Date(order.createdAt).toLocaleString() : '-'
  const subtotal = order?.subtotal ?? order?.subTotal ?? 0
  const taxAmount = order?.taxAmount ?? order?.tax ?? 0
  const shippingAmount = order?.shippingAmount ?? order?.shipping ?? 0
  const discountAmount = order?.discountAmount ?? order?.discount ?? 0
  const totalAmount = order?.totalAmount ?? order?.total ?? order?.amount ?? 0
  const orderItemOptions = buildOrderItemOptions(items)
  const itemColumns = [
    { key: 'product', label: 'Product' },
    { key: 'sku', label: 'SKU' },
    { key: 'price', label: 'Price' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'total', label: 'Total' },
  ]

  if (loading) {
    return (
      <section>
        <ModuleHeader
          title="Order Details"
          description="Review order information, items, totals, and status updates."
          actions={
            <Button type="button" size="sm" variant="ghost" onClick={() => navigate('/orders')}>
              Back to Orders
            </Button>
          }
        />
        <ModuleCard>
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading order details...</p>
        </ModuleCard>
      </section>
    )
  }

  return (
    <section>
      <ModuleHeader
        title="Order Details"
        description="Review order information, items, totals, and status updates."
        actions={
          <Button type="button" size="sm" variant="ghost" onClick={() => navigate('/orders')}>
            Back to Orders
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">#{orderNumber}</p>
        <ModuleStatusBadge status={currentPaymentStatus} />
        <ModuleStatusBadge status={currentOrderStatus} />
      </div>

      {error ? (
        <ModuleCard className="mb-3 border-red-200 bg-red-50 dark:border-red-900/70 dark:bg-red-950/30">
          <p className="mb-2 text-sm text-red-700 dark:text-red-300">{error}</p>
          <Button type="button" size="sm" variant="ghost" onClick={() => navigate('/orders')}>
            Back to Orders
          </Button>
        </ModuleCard>
      ) : null}

      {successMessage ? (
        <ModuleCard className="mb-3 border-blue-200 bg-blue-50 dark:border-blue-900/70 dark:bg-blue-950/30">
          <p className="text-sm text-blue-700 dark:text-blue-300">{successMessage}</p>
        </ModuleCard>
      ) : null}

      {isFinalOrderStatus ? (
        <ModuleCard className="mb-3 border-blue-200 bg-blue-50 dark:border-blue-900/70 dark:bg-blue-950/30">
          <p className="mb-2 text-sm text-blue-700 dark:text-blue-300">This order is final and cannot be changed.</p>
          <Button type="button" size="sm" variant="ghost" onClick={() => navigate('/orders')}>
            Back to Orders
          </Button>
        </ModuleCard>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <ModuleCard title="Order Summary">
          <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <p>
              <strong>Order Number:</strong> {orderNumber}
            </p>
            <p>
              <strong>Created At:</strong> {createdAt}
            </p>
            <p>
              <strong>Items:</strong> {items.length}
            </p>
          </div>
        </ModuleCard>

        <ModuleCard title="Customer">
          <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <p>
              <strong>Name:</strong> {customerName}
            </p>
            <p>
              <strong>Email:</strong>{' '}
              {order?.customer?.email || order?.email || 'Not available'}
            </p>
            <p>
              <strong>Phone:</strong> {order?.customer?.phone || order?.phone || 'Not available'}
            </p>
          </div>
        </ModuleCard>

        <ModuleCard title="Payment Summary / Totals">
          <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <p>
              <strong>Subtotal:</strong> {formatCurrency(subtotal)}
            </p>
            <p>
              <strong>Tax:</strong> {formatCurrency(taxAmount)}
            </p>
            <p>
              <strong>Shipping:</strong> {formatCurrency(shippingAmount)}
            </p>
            <p>
              <strong>Discount:</strong> {formatCurrency(discountAmount)}
            </p>
            <p className="total-strong dark:text-slate-100 dark:border-slate-700">
              <strong>Total:</strong> {formatCurrency(totalAmount)}
            </p>
          </div>
        </ModuleCard>

        <ModuleCard title="Status Controls">
          <ModuleFormGrid columns={2}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Order Status</label>
              <select
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:text-slate-500"
                value={selectedOrderStatus}
                disabled={isFinalOrderStatus}
                onChange={(event) => setSelectedOrderStatus(event.target.value)}
              >
                {orderStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Payment Status</label>
              <select
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:text-slate-500"
                value={selectedPaymentStatus}
                onChange={(event) => setSelectedPaymentStatus(event.target.value)}
              >
                {paymentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Notes</label>
              <Textarea
                rows={3}
                value={statusNote}
                onChange={(event) => setStatusNote(event.target.value)}
                placeholder="Optional note for status update"
              />
            </div>
          </ModuleFormGrid>

          <ModuleActions className="mt-4 justify-end">
            <Button
              type="button"
              size="sm"
              disabled={updating || isFinalOrderStatus}
              onClick={handleOrderStatusUpdate}
            >
              {updating ? 'Updating...' : 'Update Order Status'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={updating}
              onClick={handlePaymentStatusUpdate}
            >
              {updating ? 'Updating...' : 'Update Payment Status'}
            </Button>
          </ModuleActions>
        </ModuleCard>
      </div>

      <ModuleCard title="Items" className="mt-4">
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
              <tr key={item?._id || item?.id || `order-item-${index}`} className="text-slate-700 dark:text-slate-300">
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
                      <p className="order-item-product-name dark:text-slate-100">{productName}</p>
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

      {String(orderStatus).toLowerCase() === 'delivered' ? (
        <ModuleCard title="Create Return / Exchange Request" className="mt-4">

          {returnError ? (
            <ModuleCard className="mb-3 border-red-200 bg-red-50">
              <p className="text-sm text-red-700">{returnError}</p>
            </ModuleCard>
          ) : null}

          <form onSubmit={handleCreateReturnRequest}>
            <ModuleFormGrid columns={2}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Type</label>
                <select
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  value={returnForm.type}
                  onChange={(event) =>
                    handleReturnFormChange('type', event.target.value)
                  }
                >
                  {returnRequestTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Reason</label>
                <Input
                  type="text"
                  value={returnForm.reason}
                  onChange={(event) =>
                    handleReturnFormChange('reason', event.target.value)
                  }
                  placeholder="Why is this request being created?"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Notes</label>
                <Textarea
                  rows={3}
                  value={returnForm.notes}
                  onChange={(event) =>
                    handleReturnFormChange('notes', event.target.value)
                  }
                  placeholder="Optional notes"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Order Item</label>
                <select
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Quantity</label>
                <Input
                  type="number"
                  min="1"
                  max={
                    orderItemOptions.find(
                      (item) => item.key === returnForm.selectedItemKey,
                    )?.maxQuantity || 1
                  }
                  value={returnForm.quantity}
                  onChange={(event) =>
                    handleReturnFormChange('quantity', event.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Item Reason</label>
                <Input
                  type="text"
                  value={returnForm.itemReason}
                  onChange={(event) =>
                    handleReturnFormChange('itemReason', event.target.value)
                  }
                  placeholder="Reason for this item"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Condition</label>
                <select
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  value={returnForm.condition}
                  onChange={(event) =>
                    handleReturnFormChange('condition', event.target.value)
                  }
                >
                  {returnItemConditions.map((condition) => (
                    <option key={condition} value={condition}>
                      {condition}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={returnForm.restockable}
                    onChange={(event) =>
                      handleReturnFormChange('restockable', event.target.checked)
                    }
                  />
                  Mark this item as restockable
                </label>
              </div>
            </ModuleFormGrid>

            <ModuleActions className="mt-4 justify-end">
              <Button type="submit" size="sm" disabled={creatingReturn}>
                {creatingReturn ? 'Creating...' : 'Create Return / Exchange'}
              </Button>
            </ModuleActions>
          </form>
        </ModuleCard>
      ) : null}

      {order?.notes ? (
        <ModuleCard title="Notes" className="mt-4">
          <p>{order.notes}</p>
        </ModuleCard>
      ) : null}
    </section>
  )
}

export default OrderDetails
