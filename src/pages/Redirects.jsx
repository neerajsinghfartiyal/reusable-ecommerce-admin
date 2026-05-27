import { useEffect, useState } from 'react'
import {
  createRedirect,
  deleteRedirect,
  getRedirects,
  updateRedirect,
} from '../api/redirectApi'
import AdminAlert from '@/components/admin-ui/AdminAlert'
import AdminFilterBar from '@/components/admin-ui/AdminFilterBar'
import AdminFilterField from '@/components/admin-ui/AdminFilterField'
import AdminField from '@/components/admin-ui/AdminField'
import AdminPage from '@/components/admin-ui/AdminPage'
import AdminPagination from '@/components/admin-ui/AdminPagination'
import AdminSelect from '@/components/admin-ui/AdminSelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import ModuleActions from '@/components/admin-ui/ModuleActions'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import ModuleEmptyState from '@/components/admin-ui/ModuleEmptyState'
import ModuleFormGrid from '@/components/admin-ui/ModuleFormGrid'
import ModuleStatusBadge from '@/components/admin-ui/ModuleStatusBadge'
import ModuleTable from '@/components/admin-ui/ModuleTable'
import PageLoading from '@/components/admin-ui/PageLoading'
const redirectTypeFilters = ['all', '301', '302']
const statusFilters = ['all', 'active', 'inactive']

const getRedirectTypeFilterLabel = (type) => {
  if (type === 'all') {
    return 'All redirect types'
  }

  return type
}

const getStatusFilterLabel = (status) => {
  if (status === 'all') {
    return 'All statuses'
  }

  return status.charAt(0).toUpperCase() + status.slice(1)
}
const redirectTypeOptions = ['301', '302']

const getNumberValue = (...values) => {
  for (const value of values) {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return 0
}

const extractList = (response) => {
  const checks = [
    response?.data?.redirects,
    response?.redirects,
    response?.data?.data?.redirects,
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

const getFriendlyDuplicateError = (error, fallback) => {
  const message = String(error?.response?.data?.message || '')
  if (
    message.toLowerCase().includes('duplicate') ||
    message.toLowerCase().includes('sourcepath')
  ) {
    return 'Redirect source path already exists. Please use a different source path.'
  }
  return message || fallback
}

function Redirects() {
  const [redirects, setRedirects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [redirectTypeFilter, setRedirectTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
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
    sourcePath: '',
    targetPath: '',
    redirectType: '301',
    notes: '',
    isActive: true,
  })

  const [editForm, setEditForm] = useState({
    sourcePath: '',
    targetPath: '',
    redirectType: '301',
    notes: '',
    isActive: true,
  })

  const loadRedirects = async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page: currentPage }
      if (searchQuery) params.search = searchQuery
      if (redirectTypeFilter !== 'all') params.redirectType = Number(redirectTypeFilter)
      if (statusFilter !== 'all') params.isActive = statusFilter === 'active'

      const response = await getRedirects(params)
      const list = extractList(response)
      const paginationData = extractPagination(response)

      setRedirects(list)
      setPagination({
        totalItems: getNumberValue(
          paginationData?.totalItems,
          paginationData?.totalRedirects,
          response?.data?.data?.totalItems,
          response?.data?.data?.totalRedirects,
          response?.data?.totalItems,
          response?.data?.totalRedirects,
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
      setError(err?.response?.data?.message || 'Failed to load redirects.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRedirects()
  }, [currentPage, searchQuery, redirectTypeFilter, statusFilter])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setCurrentPage(1)
    setSearchQuery(searchInput.trim())
  }

  const handleFormCheckChange = (checked) => {
    setForm((prev) => ({ ...prev, isActive: checked === true }))
  }

  const handleEditCheckChange = (checked) => {
    setEditForm((prev) => ({ ...prev, isActive: checked === true }))
  }

  const resetForm = () => {
    setForm({
      sourcePath: '',
      targetPath: '',
      redirectType: '301',
      notes: '',
      isActive: true,
    })
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!form.sourcePath.trim() || !form.targetPath.trim()) {
      setError('Source path and target path are required.')
      return
    }

    setSubmitting(true)
    try {
      await createRedirect({
        sourcePath: form.sourcePath.trim(),
        targetPath: form.targetPath.trim(),
        redirectType: getNumberValue(form.redirectType, 301),
        notes: form.notes.trim(),
        isActive: Boolean(form.isActive),
      })
      resetForm()
      setSuccessMessage('Redirect created successfully.')
      await loadRedirects()
    } catch (err) {
      setError(getFriendlyDuplicateError(err, 'Failed to create redirect.'))
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (redirect) => {
    const id = redirect?._id || redirect?.id || ''
    setEditingId(id)
    setEditForm({
      sourcePath: redirect?.sourcePath || '',
      targetPath: redirect?.targetPath || '',
      redirectType: String(getNumberValue(redirect?.redirectType, 301)),
      notes: redirect?.notes || '',
      isActive: Boolean(redirect?.isActive),
    })
  }

  const cancelEdit = () => {
    setEditingId('')
    setEditForm({
      sourcePath: '',
      targetPath: '',
      redirectType: '301',
      notes: '',
      isActive: true,
    })
  }

  const handleUpdate = async () => {
    if (!editingId) return
    setError('')
    setSuccessMessage('')

    if (!editForm.sourcePath.trim() || !editForm.targetPath.trim()) {
      setError('Source path and target path are required.')
      return
    }

    setSavingRow(true)
    try {
      await updateRedirect(editingId, {
        sourcePath: editForm.sourcePath.trim(),
        targetPath: editForm.targetPath.trim(),
        redirectType: getNumberValue(editForm.redirectType, 301),
        notes: editForm.notes.trim(),
        isActive: Boolean(editForm.isActive),
      })
      setEditingId('')
      setSuccessMessage('Redirect updated successfully.')
      await loadRedirects()
    } catch (err) {
      setError(getFriendlyDuplicateError(err, 'Failed to update redirect.'))
    } finally {
      setSavingRow(false)
    }
  }

  const handleDelete = async (redirect) => {
    const id = redirect?._id || redirect?.id
    if (!id) return
    const ok = window.confirm(
      `Are you sure you want to delete redirect ${redirect?.sourcePath || ''}?`,
    )
    if (!ok) return

    setDeletingId(id)
    setError('')
    setSuccessMessage('')
    try {
      await deleteRedirect(id)
      setSuccessMessage('Redirect deleted successfully.')
      if (editingId === id) cancelEdit()
      await loadRedirects()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete redirect.')
    } finally {
      setDeletingId('')
    }
  }

  const goPrev = () => setCurrentPage((prev) => Math.max(1, prev - 1))
  const goNext = () => setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))

  const columns = [
    { key: 'sourcePath', label: 'Source Path' },
    { key: 'targetPath', label: 'Target Path' },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'hits', label: 'Hits' },
    { key: 'lastHit', label: 'Last Hit' },
    { key: 'actions', label: 'Actions' },
  ]

  return (
    <AdminPage
      headerMode="hidden"
      title="Redirects"
      description="Manage SEO redirects from old URLs to new destinations."
    >
      <ModuleCard title="Create Redirect">
        <form onSubmit={handleCreate}>
          <ModuleFormGrid columns={2}>
            <AdminField label="Source Path" required>
              <Input
                value={form.sourcePath}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, sourcePath: event.target.value }))
                }
                placeholder="/old-url"
              />
            </AdminField>

            <AdminField label="Target Path" required>
              <Input
                value={form.targetPath}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, targetPath: event.target.value }))
                }
                placeholder="/new-url"
              />
            </AdminField>

            <AdminField label="Redirect Type">
              <AdminSelect
                value={form.redirectType}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, redirectType: event.target.value }))
                }
              >
                {redirectTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>

            <AdminField label="Notes">
              <Input
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Optional notes"
              />
            </AdminField>

            <AdminField label="Active" className="md:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Checkbox checked={form.isActive} onCheckedChange={handleFormCheckChange} />
                Active
              </label>
            </AdminField>

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Redirect'}
              </Button>
            </div>
          </ModuleFormGrid>
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
              placeholder="Search redirects..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <Button type="submit" size="sm">
              Search
            </Button>
          </form>
        </AdminFilterField>

        <AdminFilterField label="Redirect Type">
          <AdminSelect
            value={redirectTypeFilter}
            aria-label="Filter by redirect type"
            onChange={(event) => {
              setCurrentPage(1)
              setRedirectTypeFilter(event.target.value)
            }}
          >
            {redirectTypeFilters.map((type) => (
              <option key={type} value={type}>
                {getRedirectTypeFilterLabel(type)}
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

      {loading ? <PageLoading message="Loading redirects..." /> : null}

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
        redirects.length === 0 ? (
          <ModuleEmptyState
            title="No redirects found"
            description="Create your first redirect or try changing the filters."
          />
        ) : (
          <>
            <ModuleTable
              columns={columns}
              data={redirects}
              emptyMessage="No redirects found."
              renderRow={(redirect, index) => {
                const id = redirect?._id || redirect?.id || `redirect-${index}`
                const isEditing = editingId === id
                const isDeleting = deletingId === id
                const statusText = redirect?.isActive ? 'active' : 'inactive'

                return (
                  <tr key={id} className="text-slate-700 dark:text-slate-300">
                    <td>
                      {isEditing ? (
                        <Input
                          value={editForm.sourcePath}
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              sourcePath: event.target.value,
                            }))
                          }
                        />
                      ) : (
                        redirect?.sourcePath || '-'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <Input
                          value={editForm.targetPath}
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              targetPath: event.target.value,
                            }))
                          }
                        />
                      ) : (
                        redirect?.targetPath || '-'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <AdminSelect
                          value={editForm.redirectType}
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              redirectType: event.target.value,
                            }))
                          }
                        >
                          {redirectTypeOptions.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </AdminSelect>
                      ) : (
                        getNumberValue(redirect?.redirectType, 301)
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <div>
                          <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                            <Checkbox checked={editForm.isActive} onCheckedChange={handleEditCheckChange} />
                            Active
                          </label>
                        </div>
                      ) : (
                        <ModuleStatusBadge status={statusText} />
                      )}
                    </td>
                    <td>{getNumberValue(redirect?.hitCount, 0)}</td>
                    <td>
                      {isEditing ? (
                        <Textarea
                          rows={2}
                          value={editForm.notes}
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              notes: event.target.value,
                            }))
                          }
                          placeholder="Notes"
                        />
                      ) : (
                        formatDate(redirect?.lastHitAt)
                      )}
                    </td>
                    <td>
                      <ModuleActions>
                        {isEditing ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              disabled={savingRow}
                              onClick={handleUpdate}
                            >
                              {savingRow ? 'Saving...' : 'Save'}
                            </Button>
                            <Button type="button" size="sm" variant="secondary" onClick={cancelEdit}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button type="button" size="sm" variant="ghost" onClick={() => startEdit(redirect)}>
                            Edit
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={isDeleting}
                          onClick={() => handleDelete(redirect)}
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

export default Redirects
