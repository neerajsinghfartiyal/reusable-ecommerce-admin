import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { deleteCustomer, getCustomers, updateCustomer } from '../api/customerApi'
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

const statusFilters = ['all', 'active', 'inactive']

const getNumberValue = (...values) => {
  for (const value of values) {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return 0
}

const extractList = (response) => {
  const checks = [
    response?.data?.customers,
    response?.customers,
    response?.data?.data?.customers,
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
  'Customer'

const getStatus = (customer) => {
  if (typeof customer?.status === 'string') return customer.status.toLowerCase()
  if (typeof customer?.isActive === 'boolean') return customer.isActive ? 'active' : 'inactive'
  return 'active'
}

function Customers() {
  const navigate = useNavigate()
  const location = useLocation()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingId, setEditingId] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    status: 'active',
  })
  const [pagination, setPagination] = useState({
    totalItems: 0,
    currentPage: 1,
    totalPages: 1,
    pageLimit: 10,
  })

  const loadCustomers = async () => {
    setLoading(true)
    setError('')

    try {
      const params = { page: currentPage }
      if (searchQuery) params.search = searchQuery
      if (statusFilter !== 'all') params.status = statusFilter

      const response = await getCustomers(params)
      const list = extractList(response)
      const paginationData = extractPagination(response)

      setCustomers(list)
      setPagination({
        totalItems: getNumberValue(
          paginationData?.totalItems,
          paginationData?.totalCustomers,
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
      setError(err?.response?.data?.message || 'Failed to load customers.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [currentPage, searchQuery, statusFilter, location.pathname])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setCurrentPage(1)
    setSearchQuery(searchInput.trim())
  }

  const handleEditStart = (customer) => {
    setSuccessMessage('')
    setError('')
    setEditingId(customer?._id || customer?.id || '')
    setEditForm({
      firstName: customer?.firstName || '',
      lastName: customer?.lastName || '',
      email: customer?.email || '',
      phone: customer?.phone || '',
      status: getStatus(customer),
    })
  }

  const handleEditCancel = () => {
    setEditingId('')
    setEditForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      status: 'active',
    })
  }

  const handleInlineSave = async () => {
    if (!editingId) return
    if (!editForm.firstName.trim() || !editForm.email.trim()) {
      setError('First name and email are required.')
      return
    }

    setSaving(true)
    setError('')
    setSuccessMessage('')
    try {
      await updateCustomer(editingId, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        status: editForm.status,
      })
      setSuccessMessage('Customer updated successfully.')
      handleEditCancel()
      await loadCustomers()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update customer.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (customer) => {
    const customerId = customer?._id || customer?.id
    if (!customerId) return

    const customerName = getCustomerName(customer)
    const shouldDelete = window.confirm(
      `Are you sure you want to delete ${customerName}? This action cannot be undone.`,
    )

    if (!shouldDelete) return

    setDeletingId(customerId)
    setError('')
    setSuccessMessage('')
    try {
      await deleteCustomer(customerId)
      setSuccessMessage('Customer deleted successfully.')
      if (editingId === customerId) handleEditCancel()
      await loadCustomers()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete customer.')
    } finally {
      setDeletingId('')
    }
  }

  const goPrev = () => setCurrentPage((prev) => Math.max(1, prev - 1))
  const goNext = () =>
    setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Created At' },
    { key: 'actions', label: 'Actions' },
  ]

  return (
    <section>
      <ModuleHeader
        title="Customers"
        description="View and manage customer accounts, contact details, and status."
      />

      <ModuleToolbar>
        <form className="flex w-full flex-col gap-2 sm:flex-row sm:items-center" onSubmit={handleSearchSubmit}>
          <Input
            type="text"
            placeholder="Search customer name, email, phone..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <Button type="submit" size="sm">
            Search
          </Button>
        </form>

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
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading customers...</p>
        </ModuleCard>
      ) : null}

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

      {!loading && !error ? (
        <>
          {customers.length === 0 ? (
            <ModuleEmptyState
              title="No customers found"
              description="Customers will appear here once accounts are created."
            />
          ) : (
            <ModuleTable
              columns={columns}
              data={customers}
              emptyMessage="No customers found."
              renderRow={(customer, index) => {
                const customerId = customer?._id || customer?.id || `customer-${index}`
                const status = getStatus(customer)
                const createdAt = customer?.createdAt
                  ? new Date(customer.createdAt).toLocaleString()
                  : '-'
                const isEditing = editingId === customerId
                const isDeleting = deletingId === customerId

                return (
                  <tr key={customerId} className="text-slate-700 dark:text-slate-300">
                    <td>
                      {isEditing ? (
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          <Input
                            type="text"
                            placeholder="First name"
                            value={editForm.firstName}
                            onChange={(event) =>
                              setEditForm((prev) => ({
                                ...prev,
                                firstName: event.target.value,
                              }))
                            }
                          />
                          <Input
                            type="text"
                            placeholder="Last name"
                            value={editForm.lastName}
                            onChange={(event) =>
                              setEditForm((prev) => ({
                                ...prev,
                                lastName: event.target.value,
                              }))
                            }
                          />
                        </div>
                      ) : (
                        <span className="font-medium text-slate-800 dark:text-slate-100">{getCustomerName(customer)}</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <Input
                          type="email"
                          value={editForm.email}
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              email: event.target.value,
                            }))
                          }
                        />
                      ) : (
                        <span className="text-slate-700 dark:text-slate-300">{customer?.email || '-'}</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <Input
                          type="text"
                          value={editForm.phone}
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              phone: event.target.value,
                            }))
                          }
                        />
                      ) : (
                        <span className="text-slate-600 dark:text-slate-400">{customer?.phone || '-'}</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                          value={editForm.status}
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              status: event.target.value,
                            }))
                          }
                        >
                          <option value="active">active</option>
                          <option value="inactive">inactive</option>
                        </select>
                      ) : (
                        <ModuleStatusBadge status={status} />
                      )}
                    </td>
                    <td className="text-slate-600 dark:text-slate-400">{createdAt}</td>
                    <td>
                      <ModuleActions>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/customers/${customer?._id || customer?.id}`)}
                          disabled={!(customer?._id || customer?.id)}
                        >
                          View
                        </Button>
                        {isEditing ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              disabled={saving}
                              onClick={handleInlineSave}
                            >
                              {saving ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={handleEditCancel}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditStart(customer)}
                          >
                            Edit
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={isDeleting}
                          onClick={() => handleDelete(customer)}
                        >
                          {isDeleting ? 'Deleting...' : 'Delete'}
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

export default Customers
