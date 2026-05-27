import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { deleteCustomer, getCustomers, updateCustomer } from '../api/customerApi'
import AdminAlert from '@/components/admin-ui/AdminAlert'
import ConfirmActionDialog from '@/components/admin-ui/ConfirmActionDialog'
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
  getCustomerStatus,
  getNumberValue,
} from '@/lib/sales'
const statusFilters = ['all', 'active', 'inactive']

const getStatusFilterLabel = (status) => {
  if (status === 'all') {
    return 'All statuses'
  }

  return status.charAt(0).toUpperCase() + status.slice(1)
}
const statusEditOptions = ['active', 'inactive']

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
  const [pendingDeleteCustomer, setPendingDeleteCustomer] = useState(null)
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
      const list = extractList(response, ['customers'])
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
      status: getCustomerStatus(customer),
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

  const handleDelete = async () => {
    const customerId = pendingDeleteCustomer?._id || pendingDeleteCustomer?.id
    if (!customerId) return

    setDeletingId(customerId)
    setError('')
    setSuccessMessage('')
    try {
      await deleteCustomer(customerId)
      setSuccessMessage('Customer deleted successfully.')
      if (editingId === customerId) handleEditCancel()
      setPendingDeleteCustomer(null)
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
    <AdminPage
      headerMode="hidden"
      title="Customers"
      description="View and manage customer accounts, contact details, and status."
    >
      <AdminFilterBar>
        <AdminFilterField variant="search" label="Search">
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
            onSubmit={handleSearchSubmit}
          >
            <Input
              type="text"
              placeholder="Search customers..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <Button type="submit" size="sm">
              Search
            </Button>
          </form>
        </AdminFilterField>

        <AdminFilterField label="Status">
          <AdminSelect
            value={statusFilter}
            aria-label="Filter by status"
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

      {loading ? <PageLoading message="Loading customers..." /> : null}

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

      {!loading && !error ? (
        <>
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-sm text-slate-600 dark:border-slate-800/90 dark:bg-slate-900/40 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing {customers.length} of {pagination.totalItems} customers
            </p>
            <p>
              Page <span className="font-semibold text-slate-900 dark:text-slate-100">{pagination.currentPage}</span> of{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">{pagination.totalPages}</span>
            </p>
          </div>

          {customers.length === 0 ? (
            <ModuleEmptyState
              title="No customers found"
              description="Customers will appear here once accounts are created."
            />
          ) : (
            <ModuleTable
              columns={columns}
              data={customers}
              compact
              emptyMessage="No customers found."
              renderRow={(customer, index) => {
                const customerId = customer?._id || customer?.id || `customer-${index}`
                const status = getCustomerStatus(customer)
                const createdAt = formatDateTime(customer?.createdAt)
                const isEditing = editingId === customerId
                const isDeleting = deletingId === customerId

                return (
                  <tr key={customerId} className="align-top text-slate-700 dark:text-slate-300">
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
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                          {getCustomerDisplayName(customer)}
                        </span>
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
                        <AdminSelect
                          value={editForm.status}
                          aria-label="Customer status"
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              status: event.target.value,
                            }))
                          }
                        >
                          {statusEditOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </AdminSelect>
                      ) : (
                        <ModuleStatusBadge status={status} />
                      )}
                    </td>
                    <td className="text-slate-600 dark:text-slate-400">{createdAt}</td>
                    <td>
                      <ModuleActions wrap="wrap">
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
                          onClick={() => setPendingDeleteCustomer(customer)}
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

      <ConfirmActionDialog
        open={Boolean(pendingDeleteCustomer)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteCustomer(null)
        }}
        title="Delete customer?"
        description={`Delete ${getCustomerDisplayName(
          pendingDeleteCustomer || {},
        )}? This permanently removes the record in the current backend flow.`}
        confirmLabel={deletingId ? 'Deleting…' : 'Delete customer'}
        confirmVariant="destructive"
        confirmDisabled={Boolean(deletingId)}
        onConfirm={handleDelete}
      />
    </AdminPage>
  )
}

export default Customers
