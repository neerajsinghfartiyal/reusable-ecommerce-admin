import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  closeReturnRequest,
  getReturnRequestById,
  updateReturnRequestStatus,
} from '../api/returnApi'
import { getActivityLogs } from '../api/activityLogApi'
import AdminAlert from '@/components/admin-ui/AdminAlert'
import AdminField from '@/components/admin-ui/AdminField'
import AdminPage from '@/components/admin-ui/AdminPage'
import AdminSelect from '@/components/admin-ui/AdminSelect'
import ConfirmActionDialog from '@/components/admin-ui/ConfirmActionDialog'
import { Button } from '@/components/ui/button'
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
  formatCurrency,
  formatDateTime,
  getCustomerDisplayName,
  getOrderFulfillment,
  RETURN_STATUS_OPTIONS,
} from '@/lib/sales'

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
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [activityLogs, setActivityLogs] = useState([])
  const [activityLoading, setActivityLoading] = useState(true)
  const [activityError, setActivityError] = useState('')

  const loadReturnRequest = async () => {
    if (!id) return

    setLoading(true)
    setError('')

    try {
      const response = await getReturnRequestById(id)
      const details = extractEntity(response, ['returnRequest', 'item'])

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

  const loadActivity = async () => {
    if (!id) return

    setActivityLoading(true)
    setActivityError('')

    try {
      const response = await getActivityLogs({
        module: 'RETURN',
        entityType: 'ReturnRequest',
        entityId: id,
        limit: 6,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
      setActivityLogs(extractList(response, ['logs']))
    } catch (err) {
      setActivityError(err?.response?.data?.message || 'Failed to load activity history.')
    } finally {
      setActivityLoading(false)
    }
  }

  useEffect(() => {
    loadReturnRequest()
    loadActivity()
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
      await loadReturnRequest()
      await loadActivity()
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
      setCloseDialogOpen(false)
      setSuccessMessage('Return request closed successfully.')
      await loadReturnRequest()
      await loadActivity()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to close return request.')
    } finally {
      setClosing(false)
    }
  }

  const backAction = (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={adminLinkButtonClass}
      onClick={() => navigate('/returns')}
    >
      Back to Returns
    </Button>
  )

  if (loading) {
    return (
      <AdminPage
        headerMode="compact"
        title="Return Request Details"
        description="Review request details, related records, and status updates."
        actions={backAction}
      >
        <ModuleCard>
          <AdminAlert type="info" title="Loading">
            Loading return request details...
          </AdminAlert>
        </ModuleCard>
      </AdminPage>
    )
  }

  const type = (request?.type || 'return').toLowerCase()
  const status = (request?.status || 'requested').toLowerCase()
  const orderNumber = request?.order?.orderNumber || request?.order?._id || '-'
  const orderId = request?.order?._id || request?.order?.id || ''
  const customerId = request?.customer?._id || request?.customer?.id || ''
  const customerName = getCustomerDisplayName(request?.customer || {})
  const customerEmail = request?.customer?.email || '-'
  const customerPhone = request?.customer?.phone || '-'
  const reason = request?.reason || '-'
  const notes = request?.notes || '-'
  const createdAt = formatDateTime(request?.createdAt)
  const reviewedAt = request?.reviewedAt ? formatDateTime(request?.reviewedAt) : 'Not reviewed yet'
  const reviewedBy =
    request?.reviewedBy?.name || request?.reviewedBy?.email || 'Not reviewed yet'
  const items = Array.isArray(request?.items) ? request.items : []
  const maxRefundAmount = Number(request?.order?.totalAmount || 0)
  const isClosed = status === 'closed'
  const linkedOrderFulfillment = getOrderFulfillment(request?.order || {})
  const itemColumns = [
    { key: 'product', label: 'Product' },
    { key: 'sku', label: 'SKU' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'reason', label: 'Reason' },
    { key: 'condition', label: 'Condition' },
    { key: 'restockable', label: 'Restockable' },
  ]

  return (
    <AdminPage
      headerMode="compact"
      title="Return Request Details"
      description="Review request details, related order/customer records, and status updates."
      actions={backAction}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ModuleStatusBadge status={type} />
        <ModuleStatusBadge status={status} />
        {orderId ? (
          <Link to={`/orders/${orderId}`} className={adminLinkButtonClass}>
            View Order
          </Link>
        ) : null}
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

      {selectedStatus === 'refunded' && Number(refundAmount || 0) > maxRefundAmount ? (
        <AdminAlert type="warning" title="Refund exceeds order total">
          Refund amounts cannot exceed the linked order total of {formatCurrency(maxRefundAmount)}.
        </AdminAlert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <ModuleCard title="Request Summary">
          <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <p>
              <strong>Type:</strong> <ModuleStatusBadge status={type} />
            </p>
            <p>
              <strong>Status:</strong> <ModuleStatusBadge status={status} />
            </p>
            <p>
              <strong>Reason:</strong> {reason}
            </p>
            <p>
              <strong>Notes:</strong> {notes}
            </p>
            <p>
              <strong>Created At:</strong> {createdAt}
            </p>
            <p>
              <strong>Reviewed By:</strong> {reviewedBy}
            </p>
            <p>
              <strong>Reviewed At:</strong> {reviewedAt}
            </p>
            <p>
              <strong>Refund Amount:</strong> {formatCurrency(request?.refundAmount || 0)}
            </p>
          </div>
        </ModuleCard>

        <ModuleCard
          title="Order Details"
          actions={
            orderId ? (
              <Link to={`/orders/${orderId}`} className={adminLinkButtonClass}>
                Open order
              </Link>
            ) : null
          }
        >
          <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <p>
              <strong>Order Number:</strong> {orderNumber}
            </p>
            <p>
              <strong>Order Status:</strong> {request?.order?.orderStatus || '-'}
            </p>
            <p>
              <strong>Payment Status:</strong> {request?.order?.paymentStatus || '-'}
            </p>
            <p>
              <strong>Fulfillment Status:</strong>{' '}
              <ModuleStatusBadge status={linkedOrderFulfillment.status || 'unfulfilled'} />
            </p>
            <p>
              <strong>Tracking:</strong> {linkedOrderFulfillment.trackingNumber || 'Not recorded'}
            </p>
            <p>
              <strong>Total Amount:</strong> {formatCurrency(request?.order?.totalAmount || 0)}
            </p>
          </div>
        </ModuleCard>

        <ModuleCard
          title="Customer Details"
          actions={
            customerId ? (
              <Link to={`/customers/${customerId}`} className={adminLinkButtonClass}>
                Open customer
              </Link>
            ) : null
          }
        >
          <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <p>
              <strong>Name:</strong> {customerName}
            </p>
            <p>
              <strong>Email:</strong> {customerEmail}
            </p>
            <p>
              <strong>Phone:</strong> {customerPhone}
            </p>
          </div>
        </ModuleCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <ModuleCard title="Update Request Status">
          <ModuleFormGrid columns={2}>
            <AdminField label="Status">
              <AdminSelect
                value={selectedStatus}
                disabled={isClosed}
                onChange={(event) => setSelectedStatus(event.target.value)}
              >
                {RETURN_STATUS_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>

            <AdminField label="Refund Amount">
              <Input
                type="number"
                min="0"
                max={String(maxRefundAmount || 0)}
                step="0.01"
                value={refundAmount}
                onChange={(event) => setRefundAmount(event.target.value)}
              />
            </AdminField>

            <AdminField label="Notes" className="md:col-span-2">
              <Textarea
                className="text-slate-800 placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                rows={3}
                value={updateNotes}
                onChange={(event) => setUpdateNotes(event.target.value)}
                placeholder="Add notes for this status update"
              />
            </AdminField>
          </ModuleFormGrid>

          <ModuleActions className="mt-4 justify-end" wrap="wrap">
            <Button type="button" size="sm" disabled={updating || isClosed} onClick={handleStatusUpdate}>
              {updating ? 'Updating...' : 'Update status'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={closing || isClosed}
              onClick={() => setCloseDialogOpen(true)}
            >
              {closing ? 'Closing...' : 'Close request'}
            </Button>
          </ModuleActions>
        </ModuleCard>

        <SalesActivityTimeline
          logs={activityLogs}
          loading={activityLoading}
          error={activityError}
          emptyMessage="No return activity has been recorded yet."
        />
      </div>

      <ModuleCard title="Items">
        <ModuleTable
          columns={itemColumns}
          data={items}
          emptyMessage="No items found."
          renderRow={(item, index) => (
            <tr
              key={item?.product?._id || item?.product || `return-item-${index}`}
              className="text-slate-700 dark:text-slate-300"
            >
              <td className="font-medium text-slate-800 dark:text-slate-100">
                {item?.productName || item?.product?.name || 'Product'}
              </td>
              <td>{item?.sku || item?.product?.sku || '-'}</td>
              <td>{item?.quantity ?? 0}</td>
              <td className="text-slate-600 dark:text-slate-400">{item?.reason || '-'}</td>
              <td className="text-slate-600 dark:text-slate-400">{item?.condition || 'other'}</td>
              <td>{item?.restockable ? 'Yes' : 'No'}</td>
            </tr>
          )}
        />
      </ModuleCard>

      <ConfirmActionDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        title="Close return request?"
        description="Closing a request is a final operator action. Keep the record open if more review or refund work is still pending."
        confirmLabel={closing ? 'Closing…' : 'Close request'}
        confirmVariant="destructive"
        confirmDisabled={closing}
        onConfirm={handleCloseRequest}
      />
    </AdminPage>
  )
}

export default ReturnDetails
