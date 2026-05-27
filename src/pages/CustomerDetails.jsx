import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getCustomerById, updateCustomer } from '../api/customerApi'
import { getOrders } from '../api/orderApi'
import { getReturnRequests } from '../api/returnApi'
import { getActivityLogs } from '../api/activityLogApi'
import AdminAlert from '@/components/admin-ui/AdminAlert'
import AdminField from '@/components/admin-ui/AdminField'
import AdminPage from '@/components/admin-ui/AdminPage'
import AdminSelect from '@/components/admin-ui/AdminSelect'
import ModuleActions from '@/components/admin-ui/ModuleActions'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import ModuleFormGrid from '@/components/admin-ui/ModuleFormGrid'
import ModuleStatusBadge from '@/components/admin-ui/ModuleStatusBadge'
import SalesActivityTimeline from '@/components/sales/SalesActivityTimeline'
import { adminLinkButtonClass } from '@/components/admin-ui/adminStyles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  extractEntity,
  extractList,
  formatCurrency,
  formatDateTime,
  getCustomerDisplayName,
  getCustomerStatus,
  getOrderDisplayNumber,
  CUSTOMER_STATUS_OPTIONS,
} from '@/lib/sales'

function CustomerDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [relatedOrders, setRelatedOrders] = useState([])
  const [relatedReturns, setRelatedReturns] = useState([])
  const [relationsLoading, setRelationsLoading] = useState(true)
  const [activityLogs, setActivityLogs] = useState([])
  const [activityLoading, setActivityLoading] = useState(true)
  const [activityError, setActivityError] = useState('')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    status: 'active',
  })

  const loadCustomer = async () => {
    if (!id) return
    setLoading(true)
    setError('')

    try {
      const response = await getCustomerById(id)
      const details = extractEntity(response, ['customer', 'item'])
      setCustomer(details)
      setForm({
        firstName: details?.firstName || '',
        lastName: details?.lastName || '',
        email: details?.email || '',
        phone: details?.phone || '',
        status: getCustomerStatus(details),
      })
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load customer details.')
    } finally {
      setLoading(false)
    }
  }

  const loadRelationships = async () => {
    if (!id) return

    setRelationsLoading(true)
    setActivityLoading(true)
    setActivityError('')

    try {
      const [ordersResponse, returnsResponse, activityResponse] = await Promise.all([
        getOrders({ customer: id, limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
        getReturnRequests({ customer: id, limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
        getActivityLogs({
          module: 'CUSTOMER',
          entityType: 'Customer',
          entityId: id,
          limit: 6,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        }),
      ])

      setRelatedOrders(extractList(ordersResponse, ['orders']))
      setRelatedReturns(extractList(returnsResponse, ['returnRequests']))
      setActivityLogs(extractList(activityResponse, ['logs']))
    } catch (err) {
      setActivityError(err?.response?.data?.message || 'Failed to load related customer activity.')
    } finally {
      setRelationsLoading(false)
      setActivityLoading(false)
    }
  }

  useEffect(() => {
    loadCustomer()
    loadRelationships()
  }, [id])

  const handleSave = async (event) => {
    event.preventDefault()
    if (!id) return

    if (!form.firstName.trim() || !form.email.trim()) {
      setError('First name and email are required.')
      return
    }

    setSaving(true)
    setError('')
    setSuccessMessage('')

    try {
      await updateCustomer(id, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        status: form.status,
      })
      setSuccessMessage('Customer updated successfully.')
      await loadCustomer()
      await loadRelationships()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update customer.')
    } finally {
      setSaving(false)
    }
  }

  const backAction = (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={adminLinkButtonClass}
      onClick={() => navigate('/customers')}
    >
      Back to Customers
    </Button>
  )

  if (loading) {
    return (
      <AdminPage
        headerMode="compact"
        title="Customer Details"
        description="View and update customer profile information."
        actions={backAction}
      >
        <ModuleCard>
          <AdminAlert type="info" title="Loading">
            Loading customer details...
          </AdminAlert>
        </ModuleCard>
      </AdminPage>
    )
  }

  const customerName = getCustomerDisplayName(customer || {})
  const status = getCustomerStatus(customer || {})
  const createdAt = formatDateTime(customer?.createdAt)
  const updatedAt = formatDateTime(customer?.updatedAt)
  const address = customer?.address || {}

  return (
    <AdminPage
      headerMode="compact"
      title="Customer Details"
      description="View and update customer profile information."
      actions={backAction}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ModuleStatusBadge status={status} />
        {relatedOrders.length > 0 ? (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {relatedOrders.length} recent orders
          </span>
        ) : null}
        {relatedReturns.length > 0 ? (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {relatedReturns.length} recent returns
          </span>
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

      <div className="grid gap-4 xl:grid-cols-3">
        <ModuleCard title="Customer Summary">
          <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <p>
              <strong className="text-slate-900 dark:text-slate-100">Name:</strong> {customerName}
            </p>
            <p>
              <strong className="text-slate-900 dark:text-slate-100">Email:</strong>{' '}
              {customer?.email || '-'}
            </p>
            <p>
              <strong className="text-slate-900 dark:text-slate-100">Phone:</strong>{' '}
              {customer?.phone || '-'}
            </p>
            <p className="flex flex-wrap items-center gap-2">
              <strong className="text-slate-900 dark:text-slate-100">Status:</strong>
              <ModuleStatusBadge status={status} />
            </p>
            <p>
              <strong className="text-slate-900 dark:text-slate-100">Created At:</strong> {createdAt}
            </p>
            <p>
              <strong className="text-slate-900 dark:text-slate-100">Updated At:</strong> {updatedAt}
            </p>
          </div>
        </ModuleCard>

        <ModuleCard title="Address">
          <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <p>
              <strong className="text-slate-900 dark:text-slate-100">Street:</strong>{' '}
              {address?.street || '-'}
            </p>
            <p>
              <strong className="text-slate-900 dark:text-slate-100">City:</strong>{' '}
              {address?.city || '-'}
            </p>
            <p>
              <strong className="text-slate-900 dark:text-slate-100">State:</strong>{' '}
              {address?.state || '-'}
            </p>
            <p>
              <strong className="text-slate-900 dark:text-slate-100">Postal Code:</strong>{' '}
              {address?.postalCode || '-'}
            </p>
            <p>
              <strong className="text-slate-900 dark:text-slate-100">Country:</strong>{' '}
              {address?.country || '-'}
            </p>
          </div>
        </ModuleCard>

        <ModuleCard title="Edit Customer">
          <form onSubmit={handleSave}>
            <ModuleFormGrid columns={1}>
              <AdminField label="First Name" required>
                <Input
                  type="text"
                  value={form.firstName}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, firstName: event.target.value }))
                  }
                />
              </AdminField>

              <AdminField label="Last Name">
                <Input
                  type="text"
                  value={form.lastName}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, lastName: event.target.value }))
                  }
                />
              </AdminField>

              <AdminField label="Email" required>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                />
              </AdminField>

              <AdminField label="Phone">
                <Input
                  type="text"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                />
              </AdminField>

              <AdminField label="Status">
                <AdminSelect
                  value={form.status}
                  aria-label="Customer status"
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, status: event.target.value }))
                  }
                >
                  {CUSTOMER_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </AdminSelect>
              </AdminField>
            </ModuleFormGrid>

            <ModuleActions className="mt-4 justify-end">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </ModuleActions>
          </form>
        </ModuleCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="space-y-4">
          <ModuleCard title="Recent Orders" description="Newest orders linked to this customer.">
            {relationsLoading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading related orders…</p>
            ) : relatedOrders.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No orders are linked to this customer yet.
              </p>
            ) : (
              <div className="space-y-3">
                {relatedOrders.map((order) => {
                  const orderId = order?._id || order?.id

                  return (
                    <div
                      key={orderId}
                      className="rounded-lg border border-slate-200/80 bg-slate-50/70 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/50"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <ModuleStatusBadge status={order?.paymentStatus || 'pending'} />
                            <ModuleStatusBadge status={order?.orderStatus || 'pending'} />
                          </div>
                          <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                            {getOrderDisplayNumber(order)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {formatCurrency(order?.totalAmount || order?.total || 0)} •{' '}
                            {formatDateTime(order?.createdAt)}
                          </p>
                        </div>
                        {orderId ? (
                          <Link to={`/orders/${orderId}`} className={adminLinkButtonClass}>
                            View order
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ModuleCard>

          <ModuleCard
            title="Recent Returns"
            description="Return and exchange requests linked to this customer."
          >
            {relationsLoading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading related returns…</p>
            ) : relatedReturns.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No returns or exchanges are linked to this customer yet.
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
                            {request?.order?.orderNumber || 'No order number'} •{' '}
                            {formatDateTime(request?.createdAt)}
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
        </div>

        <SalesActivityTimeline
          logs={activityLogs}
          loading={activityLoading}
          error={activityError}
          emptyMessage="No customer activity has been recorded yet."
        />
      </div>
    </AdminPage>
  )
}

export default CustomerDetails
