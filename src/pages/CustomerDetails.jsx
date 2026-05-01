import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getCustomerById, updateCustomer } from '../api/customerApi'
import ActionButton from '../components/ui/ActionButton'
import AdminCard from '../components/ui/AdminCard'
import PageHeader from '../components/ui/PageHeader'
import StatusBadge from '../components/ui/StatusBadge'

const extractCustomer = (response) =>
  response?.data?.data?.customer ||
  response?.data?.data?.item ||
  response?.data?.data ||
  response?.data?.customer ||
  response?.data?.item ||
  response?.data ||
  {}

const getCustomerName = (customer) =>
  `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() ||
  customer?.name ||
  'Customer'

const getStatus = (customer) => {
  if (typeof customer?.status === 'string') return customer.status.toLowerCase()
  if (typeof customer?.isActive === 'boolean') return customer.isActive ? 'active' : 'inactive'
  return 'active'
}

function CustomerDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
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
      const details = extractCustomer(response)
      setCustomer(details)
      setForm({
        firstName: details?.firstName || '',
        lastName: details?.lastName || '',
        email: details?.email || '',
        phone: details?.phone || '',
        status: getStatus(details),
      })
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load customer details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomer()
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
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update customer.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section>
        <PageHeader
          title="Customer Details"
          subtitle="View and update customer profile information."
          actions={
            <ActionButton type="button" variant="ghost" onClick={() => navigate('/customers')}>
              Back to Customers
            </ActionButton>
          }
        />
        <div className="status-card">
          <p className="status-text">Loading customer details...</p>
        </div>
      </section>
    )
  }

  const customerName = getCustomerName(customer || {})
  const status = getStatus(customer || {})
  const createdAt = customer?.createdAt
    ? new Date(customer.createdAt).toLocaleString()
    : '-'
  const updatedAt = customer?.updatedAt
    ? new Date(customer.updatedAt).toLocaleString()
    : '-'
  const address = customer?.address || {}

  return (
    <section>
      <PageHeader
        title="Customer Details"
        subtitle="View and update customer profile information."
        actions={
          <ActionButton type="button" variant="ghost" onClick={() => navigate('/customers')}>
            Back to Customers
          </ActionButton>
        }
      />

      {error ? (
        <div className="danger-alert">
          <p className="status-text">{error}</p>
        </div>
      ) : null}

      {successMessage ? (
        <div className="info-alert">
          <p className="status-text">{successMessage}</p>
        </div>
      ) : null}

      <div className="customer-details-grid">
        <AdminCard title="Customer Summary" className="customer-detail-card">
          <p>
            <strong>Name:</strong> {customerName}
          </p>
          <p>
            <strong>Email:</strong> {customer?.email || '-'}
          </p>
          <p>
            <strong>Phone:</strong> {customer?.phone || '-'}
          </p>
          <p>
            <strong>Status:</strong> <StatusBadge status={status} />
          </p>
          <p>
            <strong>Created At:</strong> {createdAt}
          </p>
          <p>
            <strong>Updated At:</strong> {updatedAt}
          </p>
        </AdminCard>

        <AdminCard title="Address" className="customer-detail-card">
          <p>
            <strong>Street:</strong> {address?.street || '-'}
          </p>
          <p>
            <strong>City:</strong> {address?.city || '-'}
          </p>
          <p>
            <strong>State:</strong> {address?.state || '-'}
          </p>
          <p>
            <strong>Postal Code:</strong> {address?.postalCode || '-'}
          </p>
          <p>
            <strong>Country:</strong> {address?.country || '-'}
          </p>
        </AdminCard>
      </div>

      <AdminCard title="Edit Customer" className="customer-edit-card">
        <form onSubmit={handleSave}>
          <div className="product-form-grid">
            <div className="field-group">
              <label className="field-label">First Name</label>
              <input
                type="text"
                className="field-input"
                value={form.firstName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, firstName: event.target.value }))
                }
              />
            </div>

            <div className="field-group">
              <label className="field-label">Last Name</label>
              <input
                type="text"
                className="field-input"
                value={form.lastName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, lastName: event.target.value }))
                }
              />
            </div>

            <div className="field-group">
              <label className="field-label">Email</label>
              <input
                type="email"
                className="field-input"
                value={form.email}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                }
              />
            </div>

            <div className="field-group">
              <label className="field-label">Phone</label>
              <input
                type="text"
                className="field-input"
                value={form.phone}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, phone: event.target.value }))
                }
              />
            </div>

            <div className="field-group">
              <label className="field-label">Status</label>
              <select
                className="field-input"
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, status: event.target.value }))
                }
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </div>
          </div>

          <div className="setup-actions">
            <ActionButton type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </ActionButton>
          </div>
        </form>
      </AdminCard>
    </section>
  )
}

export default CustomerDetails
