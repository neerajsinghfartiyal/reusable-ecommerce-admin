import { useEffect, useState } from 'react'
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
  updateAdminUser,
} from '../api/adminUserApi'
import AdminAlert from '@/components/admin-ui/AdminAlert'
import AdminFilterBar from '@/components/admin-ui/AdminFilterBar'
import AdminFilterField from '@/components/admin-ui/AdminFilterField'
import AdminField from '@/components/admin-ui/AdminField'
import AdminPage from '@/components/admin-ui/AdminPage'
import AdminPagination from '@/components/admin-ui/AdminPagination'
import AdminSelect from '@/components/admin-ui/AdminSelect'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import ModuleActions from '@/components/admin-ui/ModuleActions'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import ModuleEmptyState from '@/components/admin-ui/ModuleEmptyState'
import ModuleFormGrid from '@/components/admin-ui/ModuleFormGrid'
import ModuleStatusBadge from '@/components/admin-ui/ModuleStatusBadge'
import ModuleTable from '@/components/admin-ui/ModuleTable'
import PageLoading from '@/components/admin-ui/PageLoading'
const roleFilters = ['all', 'super_admin', 'admin', 'manager', 'staff']
const statusFilters = ['all', 'active', 'inactive']
const roleOptions = ['super_admin', 'admin', 'manager', 'staff']

const getRoleFilterLabel = (role) => {
  if (role === 'all') {
    return 'All roles'
  }

  const labels = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    manager: 'Manager',
    staff: 'Staff',
  }

  return labels[role] || role
}

const getStatusFilterLabel = (status) => {
  if (status === 'all') {
    return 'All statuses'
  }

  return status.charAt(0).toUpperCase() + status.slice(1)
}

const getNumberValue = (...values) => {
  for (const value of values) {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return 0
}

const extractList = (response) => {
  const checks = [
    response?.data?.admins,
    response?.admins,
    response?.data?.adminUsers,
    response?.adminUsers,
    response?.data?.data?.admins,
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

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '-')

const getFriendlyDuplicateError = (error, fallbackMessage) => {
  const message = String(error?.response?.data?.message || '')
  if (message.toLowerCase().includes('already exists') || message.toLowerCase().includes('email')) {
    return 'Admin email already exists. Please use a different email.'
  }
  return message || fallbackMessage
}

const mapRoleForApi = (role) => {
  if (role === 'manager' || role === 'staff') return 'editor'
  return role
}

function AdminUsers() {
  const [adminUsers, setAdminUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [savingRow, setSavingRow] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [editingId, setEditingId] = useState('')
  const [pagination, setPagination] = useState({
    totalItems: 0,
    currentPage: 1,
    totalPages: 1,
    pageLimit: 10,
  })

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin',
    isActive: true,
  })

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'admin',
    isActive: true,
  })

  const loadAdminUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page: currentPage }
      if (searchQuery) params.search = searchQuery
      if (roleFilter !== 'all') params.role = mapRoleForApi(roleFilter)
      if (statusFilter !== 'all') params.isActive = statusFilter === 'active'

      const response = await getAdminUsers(params)
      const list = extractList(response)
      const paginationData = extractPagination(response)

      setAdminUsers(list)
      setPagination({
        totalItems: getNumberValue(
          paginationData?.totalAdmins,
          paginationData?.totalUsers,
          paginationData?.totalItems,
          response?.data?.data?.totalAdmins,
          response?.data?.data?.totalUsers,
          response?.data?.data?.totalItems,
          response?.data?.totalAdmins,
          response?.data?.totalUsers,
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
          paginationData?.limit,
          response?.data?.data?.pageLimit,
          response?.data?.pageLimit,
          10,
        ),
      })
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load admin users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdminUsers()
  }, [currentPage, searchQuery, roleFilter, statusFilter])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setCurrentPage(1)
    setSearchQuery(searchInput.trim())
  }

  const resetForm = () => {
    setForm({
      name: '',
      email: '',
      password: '',
      role: 'admin',
      isActive: true,
    })
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError('Name, email, and password are required.')
      return
    }

    setSubmitting(true)
    try {
      await createAdminUser({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: mapRoleForApi(form.role),
        isActive: Boolean(form.isActive),
      })
      setSuccessMessage('Admin user created successfully.')
      resetForm()
      await loadAdminUsers()
    } catch (err) {
      setError(getFriendlyDuplicateError(err, 'Failed to create admin user.'))
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (adminUser) => {
    const id = adminUser?._id || adminUser?.id || ''
    setEditingId(id)
    setEditForm({
      name: adminUser?.name || '',
      email: adminUser?.email || '',
      role: adminUser?.role || 'admin',
      isActive: adminUser?.isActive !== false,
    })
  }

  const cancelEdit = () => {
    setEditingId('')
    setEditForm({
      name: '',
      email: '',
      role: 'admin',
      isActive: true,
    })
  }

  const handleSaveInline = async () => {
    if (!editingId) return
    setError('')
    setSuccessMessage('')

    if (!editForm.name.trim() || !editForm.email.trim()) {
      setError('Name and email are required.')
      return
    }

    setSavingRow(true)
    try {
      // Backend update supports name, role, isActive. Email is shown in UI but not sent.
      await updateAdminUser(editingId, {
        name: editForm.name.trim(),
        role: mapRoleForApi(editForm.role),
        isActive: Boolean(editForm.isActive),
      })
      setSuccessMessage('Admin user updated successfully.')
      setEditingId('')
      await loadAdminUsers()
    } catch (err) {
      setError(getFriendlyDuplicateError(err, 'Failed to update admin user.'))
    } finally {
      setSavingRow(false)
    }
  }

  const handleDelete = async (adminUser) => {
    const id = adminUser?._id || adminUser?.id
    if (!id) return

    const ok = window.confirm(
      'Are you sure you want to deactivate/delete this admin user?',
    )
    if (!ok) return

    setDeletingId(id)
    setError('')
    setSuccessMessage('')
    try {
      await deleteAdminUser(id)
      if (editingId === id) setEditingId('')
      setSuccessMessage('Admin user deleted successfully.')
      await loadAdminUsers()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete admin user.')
    } finally {
      setDeletingId('')
    }
  }

  const goPrev = () => setCurrentPage((prev) => Math.max(1, prev - 1))
  const goNext = () => setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Created At' },
    { key: 'actions', label: 'Actions' },
  ]

  return (
    <AdminPage
      headerMode="hidden"
      title="Admin Users"
      description="Manage admin accounts, roles, and access status."
    >
      <ModuleCard title="Create Admin User">
        <form onSubmit={handleCreate}>
          <ModuleFormGrid columns={2}>
            <AdminField label="Name" required>
              <Input
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </AdminField>

            <AdminField label="Email" required>
              <Input
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </AdminField>

            <AdminField label="Password" required>
              <Input
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, password: event.target.value }))
                }
              />
            </AdminField>

            <AdminField label="Role">
              <AdminSelect
                value={form.role}
                onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>

            <AdminField label="Active" className="md:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Checkbox
                  checked={Boolean(form.isActive)}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, isActive: checked === true }))
                  }
                />
                Active
              </label>
            </AdminField>
          </ModuleFormGrid>

          <ModuleActions className="mt-4 justify-end">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Admin'}
            </Button>
          </ModuleActions>
        </form>
      </ModuleCard>

      <AdminFilterBar>
        <AdminFilterField variant="search" label="Search">
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
            onSubmit={handleSearchSubmit}
          >
            <Input
              type="text"
              placeholder="Search admin users..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <Button type="submit" size="sm">
              Search
            </Button>
          </form>
        </AdminFilterField>

        <AdminFilterField label="Role">
          <AdminSelect
            value={roleFilter}
            aria-label="Filter by role"
            onChange={(event) => {
              setCurrentPage(1)
              setRoleFilter(event.target.value)
            }}
          >
            {roleFilters.map((role) => (
              <option key={role} value={role}>
                {getRoleFilterLabel(role)}
              </option>
            ))}
          </AdminSelect>
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

      {loading ? <PageLoading message="Loading admin users..." /> : null}

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
        adminUsers.length === 0 ? (
          <ModuleEmptyState
            title="No admin users found"
            description="Create a new admin user or change filters."
          />
        ) : (
          <>
            <ModuleTable
              columns={columns}
              data={adminUsers}
              emptyMessage="No admin users found."
              renderRow={(adminUser, index) => {
                const id = adminUser?._id || adminUser?.id || `admin-user-${index}`
                const isEditing = editingId === id
                const isDeleting = deletingId === id
                const statusText = adminUser?.isActive ? 'active' : 'inactive'

                return (
                  <tr key={id} className="text-slate-700 dark:text-slate-300">
                    <td className="font-medium text-slate-800 dark:text-slate-100">
                      {isEditing ? (
                        <Input
                          type="text"
                          value={editForm.name}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, name: event.target.value }))
                          }
                        />
                      ) : (
                        adminUser?.name || '-'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <Input
                          type="email"
                          value={editForm.email}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, email: event.target.value }))
                          }
                        />
                      ) : (
                        <span className="text-slate-600 dark:text-slate-400">{adminUser?.email || '-'}</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <AdminSelect
                          value={editForm.role}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, role: event.target.value }))
                          }
                        >
                          {roleOptions.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </AdminSelect>
                      ) : (
                        adminUser?.role || '-'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <Checkbox
                            checked={Boolean(editForm.isActive)}
                            onCheckedChange={(checked) =>
                              setEditForm((prev) => ({
                                ...prev,
                                isActive: checked === true,
                              }))
                            }
                          />
                          Active
                        </label>
                      ) : (
                        <ModuleStatusBadge status={statusText} />
                      )}
                    </td>
                    <td className="text-slate-600 dark:text-slate-400">
                      {formatDate(adminUser?.createdAt)}
                    </td>
                    <td>
                      <ModuleActions>
                        {isEditing ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              disabled={savingRow}
                              onClick={handleSaveInline}
                            >
                              {savingRow ? 'Saving...' : 'Save'}
                            </Button>
                            <Button type="button" size="sm" variant="secondary" onClick={cancelEdit}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button type="button" size="sm" variant="ghost" onClick={() => startEdit(adminUser)}>
                            Edit
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={isDeleting}
                          onClick={() => handleDelete(adminUser)}
                        >
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </Button>
                      </ModuleActions>
                    </td>
                  </tr>
                )
              }}
            />

            <AdminPagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPrevious={goPrev}
              onNext={goNext}
              isPreviousDisabled={pagination.currentPage <= 1}
              isNextDisabled={pagination.currentPage >= pagination.totalPages}
            />
          </>
        )
      ) : null}
    </AdminPage>
  )
}

export default AdminUsers
