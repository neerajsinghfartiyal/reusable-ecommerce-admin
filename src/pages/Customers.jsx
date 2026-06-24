import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { createCustomer, deleteCustomer, getCustomers, updateCustomer } from '../api/customerApi'
import AdminAlert from '@/components/admin-ui/AdminAlert'
import AdminField from '@/components/admin-ui/AdminField'
import ConfirmActionDialog from '@/components/admin-ui/ConfirmActionDialog'
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
import ModuleActions from '@/components/admin-ui/ModuleActions'
import ModuleEmptyState from '@/components/admin-ui/ModuleEmptyState'
import ModuleFormGrid from '@/components/admin-ui/ModuleFormGrid'
import ModuleStatusBadge from '@/components/admin-ui/ModuleStatusBadge'
import ModuleTable from '@/components/admin-ui/ModuleTable'
import PageLoading from '@/components/admin-ui/PageLoading'
import {
  extractEntity,
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

const defaultCreateForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  status: 'active',
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createForm, setCreateForm] = useState(defaultCreateForm)
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)

  const loadCustomers = async ({ page = currentPage, search = searchQuery, status = statusFilter } = {}) => {
    setLoading(true)
    setError('')

    try {
      const params = { page }
      if (search) params.search = search
      if (status !== 'all') params.status = status

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
            page,
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

  const resetCreateForm = () => {
    setCreateForm(defaultCreateForm)
    setCreateError('')
  }

  const openCreateDialog = () => {
    setError('')
    setSuccessMessage('')
    resetCreateForm()
    setCreateDialogOpen(true)
  }

  const handleCreateCustomer = async (event) => {
    event.preventDefault()

    if (!createForm.firstName.trim() || !createForm.email.trim()) {
      setCreateError('First name and email are required.')
      return
    }

    setCreating(true)
    setCreateError('')

    try {
      const response = await createCustomer({
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim(),
        status: createForm.status,
      })

      const created = extractEntity(response, ['customer'])
      const customerName = getCustomerDisplayName(created, createForm.email.trim())

      setCreateDialogOpen(false)
      resetCreateForm()
      setSearchInput('')
      setSearchQuery('')
      setStatusFilter('all')
      setCurrentPage(1)
      setSuccessMessage(`Customer "${customerName}" created successfully.`)
      await loadCustomers({ page: 1, search: '', status: 'all' })
    } catch (err) {
      const backendMessage = err?.response?.data?.message || ''
      setCreateError(
        backendMessage.includes('already exists') || backendMessage.includes('E11000')
          ? 'A customer with this email already exists.'
          : backendMessage || 'Failed to create customer.',
      )
    } finally {
      setCreating(false)
    }
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
      setPendingDeleteCustomer(null)
      setError(
        err?.response?.data?.message ||
          'Failed to delete customer. Customers with linked orders or return requests cannot be removed.',
      )
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

        <div className="flex items-end">
          <Button type="button" size="sm" onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Create Customer
          </Button>
        </div>
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
              description="Create a customer account to get started."
              action={
                <Button type="button" size="sm" onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Customer
                </Button>
              }
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
        )}? This permanently removes the customer record. Deletion is blocked when linked orders or return/exchange requests exist — use inactive status instead to preserve history.`}
        confirmLabel={deletingId ? 'Deleting…' : 'Delete customer'}
        confirmVariant="destructive"
        confirmDisabled={Boolean(deletingId)}
        onConfirm={handleDelete}
      />

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open)
          if (!open) resetCreateForm()
        }}
      >
        <DialogContent className="border-slate-200 bg-white sm:max-w-lg dark:border-slate-800 dark:bg-slate-900">
          <form onSubmit={handleCreateCustomer}>
            <DialogHeader>
              <DialogTitle>Create Customer</DialogTitle>
              <DialogDescription>
                Add a new customer record. First name and email are required.
              </DialogDescription>
            </DialogHeader>

            {createError ? (
              <AdminAlert type="error" title="Could not create customer" className="mt-4">
                {createError}
              </AdminAlert>
            ) : null}

            <ModuleFormGrid columns={2} className="mt-4">
              <AdminField label="First Name" required>
                <Input
                  type="text"
                  value={createForm.firstName}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, firstName: event.target.value }))
                  }
                  placeholder="Jane"
                  autoFocus
                />
              </AdminField>

              <AdminField label="Last Name">
                <Input
                  type="text"
                  value={createForm.lastName}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, lastName: event.target.value }))
                  }
                  placeholder="Doe"
                />
              </AdminField>

              <AdminField label="Email" required>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  placeholder="jane@example.com"
                />
              </AdminField>

              <AdminField label="Phone">
                <Input
                  type="text"
                  value={createForm.phone}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                  placeholder="+1 555 0100"
                />
              </AdminField>

              <AdminField label="Status" className="md:col-span-2">
                <AdminSelect
                  value={createForm.status}
                  aria-label="Customer status"
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, status: event.target.value }))
                  }
                >
                  {statusEditOptions.map((option) => (
                    <option key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </AdminSelect>
              </AdminField>
            </ModuleFormGrid>

            <DialogFooter className="mt-6 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCreateDialogOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create Customer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminPage>
  )
}

export default Customers
