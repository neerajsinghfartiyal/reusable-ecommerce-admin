import { useEffect, useState } from 'react'
import {
  createShippingMethod,
  deleteShippingMethod,
  getShippingMethods,
  updateShippingMethod,
} from '../api/shippingMethodApi'
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
import { useFormatCurrency } from '@/hooks/useFormatCurrency'
import ModuleStatusBadge from '@/components/admin-ui/ModuleStatusBadge'
import ModuleTable from '@/components/admin-ui/ModuleTable'
import PageLoading from '@/components/admin-ui/PageLoading'
const typeOptions = [
  'free',
  'flat_rate',
  'local_pickup',
  'weight_based',
  'price_based',
  'custom',
]
const typeFilters = ['all', ...typeOptions]
const statusFilters = ['all', 'active', 'inactive']

const getTypeFilterLabel = (type) => {
  if (type === 'all') {
    return 'All types'
  }

  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
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
    response?.data?.shippingMethods,
    response?.shippingMethods,
    response?.data?.data?.shippingMethods,
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

const getFriendlyDuplicateError = (error, fallback) => {
  const message = String(error?.response?.data?.message || '')
  if (message.toLowerCase().includes('code') && message.toLowerCase().includes('exists')) {
    return 'Shipping method code already exists. Please use a different code.'
  }
  if (message.toLowerCase().includes('duplicate')) {
    return 'Shipping method code already exists. Please use a different code.'
  }
  return message || fallback
}

const parseCommaSeparated = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const getCountriesDisplay = (value) => {
  if (!Array.isArray(value) || value.length === 0) return '-'
  if (value.length <= 3) return value.join(', ')
  return `${value.slice(0, 3).join(', ')} +${value.length - 3}`
}

function ShippingMethods() {
  const formatCurrency = useFormatCurrency()
  const [shippingMethods, setShippingMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
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
    name: '',
    code: '',
    type: 'flat_rate',
    displayName: '',
    description: '',
    instructions: '',
    sortOrder: '0',
    baseRate: '0',
    freeShippingThreshold: '0',
    minOrderAmount: '0',
    maxOrderAmount: '0',
    allowedCountries: '',
    allowedStates: '',
    postalCodes: '',
    configJson: '{}',
    isActive: true,
  })

  const [editForm, setEditForm] = useState({
    name: '',
    code: '',
    type: 'flat_rate',
    displayName: '',
    baseRate: '0',
    freeShippingThreshold: '0',
    sortOrder: '0',
    isActive: true,
  })

  const loadShippingMethods = async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page: currentPage }
      if (searchQuery) params.search = searchQuery
      if (typeFilter !== 'all') params.type = typeFilter
      if (statusFilter !== 'all') params.isActive = statusFilter === 'active'

      const response = await getShippingMethods(params)
      const list = extractList(response)
      const paginationData = extractPagination(response)

      setShippingMethods(list)
      setPagination({
        totalItems: getNumberValue(
          paginationData?.totalItems,
          paginationData?.totalShippingMethods,
          response?.data?.data?.totalItems,
          response?.data?.data?.totalShippingMethods,
          response?.data?.totalItems,
          response?.data?.totalShippingMethods,
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
      setError(err?.response?.data?.message || 'Failed to load shipping methods.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadShippingMethods()
  }, [currentPage, searchQuery, typeFilter, statusFilter])

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

  const buildCreatePayload = () => {
    let parsedConfig
    try {
      const rawConfig = String(form.configJson || '').trim()
      parsedConfig = rawConfig ? JSON.parse(rawConfig) : {}
    } catch {
      throw new Error('Config JSON is invalid. Please enter valid JSON.')
    }

    return {
      name: form.name.trim(),
      code: form.code.trim(),
      type: form.type,
      displayName: form.displayName.trim(),
      description: form.description.trim(),
      instructions: form.instructions.trim(),
      sortOrder: getNumberValue(form.sortOrder, 0),
      baseRate: getNumberValue(form.baseRate, 0),
      freeShippingThreshold: getNumberValue(form.freeShippingThreshold, 0),
      minOrderAmount: getNumberValue(form.minOrderAmount, 0),
      maxOrderAmount: getNumberValue(form.maxOrderAmount, 0),
      allowedCountries: parseCommaSeparated(form.allowedCountries),
      allowedStates: parseCommaSeparated(form.allowedStates),
      postalCodes: parseCommaSeparated(form.postalCodes),
      config: parsedConfig,
      isActive: Boolean(form.isActive),
    }
  }

  const resetCreateForm = () => {
    setForm({
      name: '',
      code: '',
      type: 'flat_rate',
      displayName: '',
      description: '',
      instructions: '',
      sortOrder: '0',
      baseRate: '0',
      freeShippingThreshold: '0',
      minOrderAmount: '0',
      maxOrderAmount: '0',
      allowedCountries: '',
      allowedStates: '',
      postalCodes: '',
      configJson: '{}',
      isActive: true,
    })
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }

    let payload
    try {
      payload = buildCreatePayload()
    } catch (parseError) {
      setError(parseError.message)
      return
    }

    setSubmitting(true)
    try {
      await createShippingMethod(payload)
      setSuccessMessage('Shipping method created successfully.')
      resetCreateForm()
      await loadShippingMethods()
    } catch (err) {
      setError(getFriendlyDuplicateError(err, 'Failed to create shipping method.'))
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (item) => {
    const id = item?._id || item?.id || ''
    setEditingId(id)
    setEditForm({
      name: item?.name || '',
      code: item?.code || '',
      type: item?.type || 'flat_rate',
      displayName: item?.displayName || '',
      baseRate: String(getNumberValue(item?.baseRate, 0)),
      freeShippingThreshold: String(getNumberValue(item?.freeShippingThreshold, 0)),
      sortOrder: String(getNumberValue(item?.sortOrder, 0)),
      isActive: item?.isActive !== false,
    })
  }

  const cancelEdit = () => {
    setEditingId('')
    setEditForm({
      name: '',
      code: '',
      type: 'flat_rate',
      displayName: '',
      baseRate: '0',
      freeShippingThreshold: '0',
      sortOrder: '0',
      isActive: true,
    })
  }

  const handleSaveInline = async () => {
    if (!editingId) return
    setError('')
    setSuccessMessage('')

    if (!editForm.name.trim()) {
      setError('Name is required.')
      return
    }

    setSavingRow(true)
    try {
      await updateShippingMethod(editingId, {
        name: editForm.name.trim(),
        code: editForm.code.trim(),
        type: editForm.type,
        displayName: editForm.displayName.trim(),
        baseRate: getNumberValue(editForm.baseRate, 0),
        freeShippingThreshold: getNumberValue(editForm.freeShippingThreshold, 0),
        sortOrder: getNumberValue(editForm.sortOrder, 0),
        isActive: Boolean(editForm.isActive),
      })
      setSuccessMessage('Shipping method updated successfully.')
      setEditingId('')
      await loadShippingMethods()
    } catch (err) {
      setError(getFriendlyDuplicateError(err, 'Failed to update shipping method.'))
    } finally {
      setSavingRow(false)
    }
  }

  const handleDelete = async (item) => {
    const id = item?._id || item?.id
    if (!id) return

    const confirmed = window.confirm('Deactivate this shipping method?')
    if (!confirmed) return

    setDeletingId(id)
    setError('')
    setSuccessMessage('')
    try {
      await deleteShippingMethod(id)
      setSuccessMessage('Shipping method deactivated successfully.')
      if (editingId === id) cancelEdit()
      await loadShippingMethods()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to deactivate shipping method.')
    } finally {
      setDeletingId('')
    }
  }

  const goPrev = () => setCurrentPage((prev) => Math.max(1, prev - 1))
  const goNext = () => setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'code', label: 'Code' },
    { key: 'type', label: 'Type' },
    { key: 'displayName', label: 'Display Name' },
    { key: 'baseRate', label: 'Base Rate' },
    { key: 'freeOver', label: 'Free Over' },
    { key: 'countries', label: 'Countries' },
    { key: 'status', label: 'Status' },
    { key: 'sort', label: 'Sort' },
    { key: 'actions', label: 'Actions' },
  ]

  return (
    <AdminPage
      headerMode="hidden"
      title="Shipping Methods"
      description="Manage shipping options, rates, delivery rules, and availability."
    >

      <ModuleCard title="Create Shipping Method">
        <form onSubmit={handleCreate}>
          <ModuleFormGrid columns={2}>
            <AdminField label="Name" required>
              <Input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </AdminField>
            <AdminField label="Code" description="Optional (auto-generated if empty)">
              <Input
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                placeholder="optional (auto-generated if empty)"
              />
            </AdminField>
            <AdminField label="Type">
              <AdminSelect
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
              >
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField label="Display Name">
              <Input
                value={form.displayName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, displayName: event.target.value }))
                }
              />
            </AdminField>
            <AdminField label="Sort Order">
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, sortOrder: event.target.value }))
                }
              />
            </AdminField>
            <AdminField label="Base Rate">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.baseRate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, baseRate: event.target.value }))
                }
              />
            </AdminField>
            <AdminField label="Free Shipping Threshold">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.freeShippingThreshold}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, freeShippingThreshold: event.target.value }))
                }
              />
            </AdminField>
            <AdminField label="Minimum Order Amount">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.minOrderAmount}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, minOrderAmount: event.target.value }))
                }
              />
            </AdminField>
            <AdminField label="Maximum Order Amount">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.maxOrderAmount}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, maxOrderAmount: event.target.value }))
                }
              />
            </AdminField>
            <AdminField label="Description" className="md:col-span-2">
              <Textarea
                rows={2}
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </AdminField>
            <AdminField label="Instructions" className="md:col-span-2">
              <Textarea
                rows={2}
                value={form.instructions}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, instructions: event.target.value }))
                }
              />
            </AdminField>
            <AdminField label="Allowed Countries" description="Comma separated, e.g. US, IN, GB" className="md:col-span-2">
              <Input
                value={form.allowedCountries}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, allowedCountries: event.target.value }))
                }
                placeholder="US, IN, GB"
              />
            </AdminField>
            <AdminField label="Allowed States" description="Comma separated, e.g. CA, NY, TX" className="md:col-span-2">
              <Input
                value={form.allowedStates}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, allowedStates: event.target.value }))
                }
                placeholder="CA, NY, TX"
              />
            </AdminField>
            <AdminField label="Postal Codes" description="Comma separated, e.g. 10001, 90001" className="md:col-span-2">
              <Input
                value={form.postalCodes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, postalCodes: event.target.value }))
                }
                placeholder="10001, 90001"
              />
            </AdminField>
            <AdminField label="Config JSON" className="md:col-span-2">
              <Textarea
                className="font-mono"
                rows={5}
                value={form.configJson}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, configJson: event.target.value }))
                }
              />
            </AdminField>
            <AdminField label="Active">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Checkbox checked={form.isActive} onCheckedChange={handleFormCheckChange} />
                Active
              </label>
            </AdminField>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Shipping Method'}
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
              placeholder="Search shipping methods..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <Button type="submit" size="sm">
              Search
            </Button>
          </form>
        </AdminFilterField>

        <AdminFilterField label="Type">
          <AdminSelect
            value={typeFilter}
            aria-label="Filter by shipping type"
            onChange={(event) => {
              setCurrentPage(1)
              setTypeFilter(event.target.value)
            }}
          >
            {typeFilters.map((type) => (
              <option key={type} value={type}>
                {getTypeFilterLabel(type)}
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

      {loading ? <PageLoading message="Loading shipping methods..." /> : null}

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
        shippingMethods.length === 0 ? (
          <ModuleEmptyState
            title="No shipping methods found"
            description="Create a shipping method or try changing filters."
          />
        ) : (
          <>
            <ModuleTable
              columns={columns}
              data={shippingMethods}
              emptyMessage="No shipping methods found."
              renderRow={(item, index) => {
                const id = item?._id || item?.id || `shipping-method-${index}`
                const isEditing = editingId === id
                const isDeleting = deletingId === id
                const statusText = item?.isActive ? 'active' : 'inactive'

                return (
                  <tr key={id}>
                    <td>
                      {isEditing ? (
                        <Input
                          value={editForm.name}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, name: event.target.value }))
                          }
                        />
                      ) : (
                        item?.name || '-'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <Input
                          value={editForm.code}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, code: event.target.value }))
                          }
                        />
                      ) : (
                        item?.code || '-'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <AdminSelect
                          value={editForm.type}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, type: event.target.value }))
                          }
                        >
                          {typeOptions.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </AdminSelect>
                      ) : (
                        item?.type || '-'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <Input
                          value={editForm.displayName}
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              displayName: event.target.value,
                            }))
                          }
                        />
                      ) : (
                        item?.displayName || '-'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editForm.baseRate}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, baseRate: event.target.value }))
                          }
                        />
                      ) : (
                        formatCurrency(item?.baseRate)
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editForm.freeShippingThreshold}
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              freeShippingThreshold: event.target.value,
                            }))
                          }
                        />
                      ) : (
                        formatCurrency(item?.freeShippingThreshold)
                      )}
                    </td>
                    <td>{getCountriesDisplay(item?.allowedCountries)}</td>
                    <td>
                      {isEditing ? (
                        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                          <Checkbox checked={editForm.isActive} onCheckedChange={handleEditCheckChange} />
                          Active
                        </label>
                      ) : (
                        <ModuleStatusBadge status={statusText} />
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editForm.sortOrder}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, sortOrder: event.target.value }))
                          }
                        />
                      ) : (
                        getNumberValue(item?.sortOrder, 0)
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
                              onClick={handleSaveInline}
                            >
                              {savingRow ? 'Saving...' : 'Save'}
                            </Button>
                            <Button type="button" size="sm" variant="secondary" onClick={cancelEdit}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button type="button" size="sm" variant="ghost" onClick={() => startEdit(item)}>
                            Edit
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={isDeleting}
                          onClick={() => handleDelete(item)}
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

export default ShippingMethods
