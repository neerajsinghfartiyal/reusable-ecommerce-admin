import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  closeReturnRequest,
  getReturnRequestById,
  updateReturnRequestStatus,
} from '../api/returnApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import ModuleActions from '@/components/admin-ui/ModuleActions'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import ModuleFormGrid from '@/components/admin-ui/ModuleFormGrid'
import ModuleHeader from '@/components/admin-ui/ModuleHeader'
import ModuleStatusBadge from '@/components/admin-ui/ModuleStatusBadge'
import ModuleTable from '@/components/admin-ui/ModuleTable'

const returnStatuses = [
  'requested',
  'approved',
  'rejected',
  'received',
  'refunded',
  'exchanged',
  'closed',
]

const extractReturnRequest = (response) =>
  response?.data?.data?.returnRequest ||
  response?.data?.data?.item ||
  response?.data?.data ||
  response?.data?.returnRequest ||
  response?.data?.item ||
  response?.data ||
  {}

const formatCurrency = (value) => {
  const amount = Number(value)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number.isNaN(amount) ? 0 : amount)
}

const getCustomerName = (customer) =>
  `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() ||
  customer?.name ||
  customer?.email ||
  'Customer'

function ReturnDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [updating, setUpdating] = useState(false)
  const [closing, setClosing] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('requested')
  const [refundAmount, setRefundAmount] = useState('0')
  const [updateNotes, setUpdateNotes] = useState('')

  const loadReturnRequest = async () => {
    if (!id) return

    setLoading(true)
    setError('')

    try {
      const response = await getReturnRequestById(id)
      const details = extractReturnRequest(response)

      setRequest(details)
      setSelectedStatus((details?.status || 'requested').toLowerCase())
      setRefundAmount(String(details?.refundAmount ?? 0))
      setUpdateNotes(details?.notes || '')
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load return request details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReturnRequest()
  }, [id])

  const handleStatusUpdate = async () => {
    if (!id) return

    setUpdating(true)
    setError('')
    setSuccessMessage('')

    try {
      await updateReturnRequestStatus(id, {
        status: selectedStatus,
        refundAmount: Number(refundAmount || 0),
        notes: updateNotes,
      })
      setSuccessMessage('Return request status updated successfully.')
      navigate('/returns')
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update return request status.')
    } finally {
      setUpdating(false)
    }
  }

  const handleCloseRequest = async () => {
    if (!id) return

    setClosing(true)
    setError('')
    setSuccessMessage('')

    try {
      await closeReturnRequest(id)
      navigate('/returns')
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to close return request.')
    } finally {
      setClosing(false)
    }
  }

  if (loading) {
    return (
      <section>
        <ModuleHeader
          title="Return Request Details"
          description="Review request details, items, and status updates."
          actions={
            <Button type="button" size="sm" variant="ghost" onClick={() => navigate('/returns')}>
              Back to Returns
            </Button>
          }
        />
        <ModuleCard>
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading return request details...</p>
        </ModuleCard>
      </section>
    )
  }

  const type = (request?.type || 'return').toLowerCase()
  const status = (request?.status || 'requested').toLowerCase()
  const orderNumber = request?.order?.orderNumber || request?.order?._id || '-'
  const customerName = getCustomerName(request?.customer || {})
  const customerEmail = request?.customer?.email || '-'
  const customerPhone = request?.customer?.phone || '-'
  const reason = request?.reason || '-'
  const notes = request?.notes || '-'
  const createdAt = request?.createdAt ? new Date(request.createdAt).toLocaleString() : '-'
  const reviewedAt = request?.reviewedAt
    ? new Date(request.reviewedAt).toLocaleString()
    : 'Not reviewed yet'
  const reviewedBy =
    request?.reviewedBy?.name || request?.reviewedBy?.email || 'Not reviewed yet'
  const items = Array.isArray(request?.items) ? request.items : []
  const itemColumns = [
    { key: 'product', label: 'Product' },
    { key: 'sku', label: 'SKU' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'reason', label: 'Reason' },
    { key: 'condition', label: 'Condition' },
    { key: 'restockable', label: 'Restockable' },
  ]

  return (
    <section>
      <ModuleHeader
        title="Return Request Details"
        description="Review request details, items, and status updates."
        actions={
          <Button type="button" size="sm" variant="ghost" onClick={() => navigate('/returns')}>
            Back to Returns
          </Button>
        }
      />

      {error ? (
        <ModuleCard className="mb-3 border-red-200 bg-red-50 dark:border-red-900/70 dark:bg-red-950/30">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </ModuleCard>
      ) : null}

      {successMessage ? (
        <ModuleCard className="mb-3 border-blue-200 bg-blue-50 dark:border-blue-900/70 dark:bg-blue-950/30">
          <p className="text-sm text-blue-700 dark:text-blue-300">{successMessage}</p>
        </ModuleCard>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <ModuleCard title="Request Summary">
          <p className="text-slate-700 dark:text-slate-300">
            <strong>Type:</strong> <ModuleStatusBadge status={type} />
          </p>
          <p className="text-slate-700 dark:text-slate-300">
            <strong>Status:</strong> <ModuleStatusBadge status={status} />
          </p>
          <p className="text-slate-700 dark:text-slate-300">
            <strong>Reason:</strong> {reason}
          </p>
          <p className="text-slate-700 dark:text-slate-300">
            <strong>Notes:</strong> {notes}
          </p>
          <p className="text-slate-700 dark:text-slate-300">
            <strong>Created At:</strong> {createdAt}
          </p>
          <p className="text-slate-700 dark:text-slate-300">
            <strong>Reviewed By:</strong> {reviewedBy}
          </p>
          <p className="text-slate-700 dark:text-slate-300">
            <strong>Reviewed At:</strong> {reviewedAt}
          </p>
          <p className="text-slate-700 dark:text-slate-300">
            <strong>Refund Amount:</strong> {formatCurrency(request?.refundAmount || 0)}
          </p>
        </ModuleCard>

        <ModuleCard title="Order Details">
          <p className="text-slate-700 dark:text-slate-300">
            <strong>Order Number:</strong> {orderNumber}
          </p>
          <p className="text-slate-700 dark:text-slate-300">
            <strong>Order Status:</strong> {request?.order?.orderStatus || '-'}
          </p>
          <p className="text-slate-700 dark:text-slate-300">
            <strong>Payment Status:</strong> {request?.order?.paymentStatus || '-'}
          </p>
          <p className="text-slate-700 dark:text-slate-300">
            <strong>Total Amount:</strong> {formatCurrency(request?.order?.totalAmount || 0)}
          </p>
        </ModuleCard>

        <ModuleCard title="Customer Details" className="md:col-span-2">
          <p className="text-slate-700 dark:text-slate-300">
            <strong>Name:</strong> {customerName}
          </p>
          <p className="text-slate-700 dark:text-slate-300">
            <strong>Email:</strong> {customerEmail}
          </p>
          <p className="text-slate-700 dark:text-slate-300">
            <strong>Phone:</strong> {customerPhone}
          </p>
        </ModuleCard>
      </div>

      <ModuleCard title="Update Return Status" className="mt-4">
        <ModuleFormGrid columns={2}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
            <select
              className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
            >
              {returnStatuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Refund Amount</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={refundAmount}
              onChange={(event) => setRefundAmount(event.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Notes</label>
            <Textarea
              rows={3}
              value={updateNotes}
              onChange={(event) => setUpdateNotes(event.target.value)}
              placeholder="Add notes for this status update"
            />
          </div>
        </ModuleFormGrid>

        <ModuleActions className="mt-4 justify-end">
          <Button
            type="button"
            size="sm"
            disabled={updating}
            onClick={handleStatusUpdate}
          >
            {updating ? 'Updating...' : 'Update Status'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={closing}
            onClick={handleCloseRequest}
          >
            {closing ? 'Closing...' : 'Close Request'}
          </Button>
        </ModuleActions>
      </ModuleCard>

      <ModuleCard title="Items" className="mt-4">
        <ModuleTable
          columns={itemColumns}
          data={items}
          emptyMessage="No items found."
          renderRow={(item, index) => (
            <tr key={item?.product?._id || item?.product || `return-item-${index}`} className="text-slate-700 dark:text-slate-300">
              <td className="font-medium text-slate-800 dark:text-slate-100">{item?.productName || item?.product?.name || 'Product'}</td>
              <td>{item?.sku || item?.product?.sku || '-'}</td>
              <td>{item?.quantity ?? 0}</td>
              <td className="text-slate-600 dark:text-slate-400">{item?.reason || '-'}</td>
              <td className="text-slate-600 dark:text-slate-400">{item?.condition || 'other'}</td>
              <td>{item?.restockable ? 'Yes' : 'No'}</td>
            </tr>
          )}
        />
      </ModuleCard>
    </section>
  )
}

export default ReturnDetails
