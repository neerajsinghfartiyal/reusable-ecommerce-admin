import { useEffect, useState } from 'react'
import {
  createPaymentMethod,
  deletePaymentMethod,
  getPaymentMethods,
  updatePaymentMethod,
} from '../api/paymentMethodApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import Pagination from '../components/ui/Pagination'
import ModuleActions from '@/components/admin-ui/ModuleActions'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import ModuleEmptyState from '@/components/admin-ui/ModuleEmptyState'
import ModuleFormGrid from '@/components/admin-ui/ModuleFormGrid'
import ModuleHeader from '@/components/admin-ui/ModuleHeader'
import ModuleStatusBadge from '@/components/admin-ui/ModuleStatusBadge'
import ModuleTable from '@/components/admin-ui/ModuleTable'
import ModuleToolbar from '@/components/admin-ui/ModuleToolbar'

const typeOptions = ['online', 'offline', 'manual']
const providerOptions = [
  'cod',
  'bank_transfer',
  'stripe',
  'paypal',
  'razorpay',
  'square',
  'custom',
]
const typeFilters = ['all', ...typeOptions]
const providerFilters = ['all', ...providerOptions]
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
    response?.data?.paymentMethods,
    response?.paymentMethods,
    response?.data?.data?.paymentMethods,
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
    return 'Payment method code already exists. Please use a different code.'
  }
  if (message.toLowerCase().includes('duplicate')) {
    return 'Payment method code already exists. Please use a different code.'
  }
  return message || fallback
}

function PaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [providerFilter, setProviderFilter] = useState('all')
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
    type: 'manual',
    provider: 'custom',
    displayName: '',
    description: '',
    instructions: '',
    sortOrder: '0',
    testMode: true,
    isActive: true,
    allowedCountries: '',
    minOrderAmount: '0',
    maxOrderAmount: '0',
    configJson: '{}',
  })

  const [editForm, setEditForm] = useState({
    name: '',
    code: '',
    type: 'manual',
    provider: 'custom',
    displayName: '',
    sortOrder: '0',
    testMode: true,
    isActive: true,
  })

  const loadPaymentMethods = async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page: currentPage }
      if (searchQuery) params.search = searchQuery
      if (typeFilter !== 'all') params.type = typeFilter
      if (providerFilter !== 'all') params.provider = providerFilter
      if (statusFilter !== 'all') params.isActive = statusFilter === 'active'

      const response = await getPaymentMethods(params)
      const list = extractList(response)
      const paginationData = extractPagination(response)

      setPaymentMethods(list)
      setPagination({
        totalItems: getNumberValue(
          paginationData?.totalItems,
          paginationData?.totalPaymentMethods,
          response?.data?.data?.totalItems,
          response?.data?.data?.totalPaymentMethods,
          response?.data?.totalItems,
          response?.data?.totalPaymentMethods,
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
      setError(err?.response?.data?.message || 'Failed to load payment methods.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPaymentMethods()
  }, [currentPage, searchQuery, typeFilter, providerFilter, statusFilter])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setCurrentPage(1)
    setSearchQuery(searchInput.trim())
  }

  const handleFormCheckChange = (key, checked) => {
    setForm((prev) => ({ ...prev, [key]: checked === true }))
  }

  const handleEditCheckChange = (key, checked) => {
    setEditForm((prev) => ({ ...prev, [key]: checked === true }))
  }

  const parseCountries = (value) =>
    String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

  const buildCreatePayload = () => {
    let parsedConfig = {}
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
      provider: form.provider,
      displayName: form.displayName.trim(),
      description: form.description.trim(),
      instructions: form.instructions.trim(),
      sortOrder: getNumberValue(form.sortOrder, 0),
      testMode: Boolean(form.testMode),
      isActive: Boolean(form.isActive),
      allowedCountries: parseCountries(form.allowedCountries),
      minOrderAmount: getNumberValue(form.minOrderAmount, 0),
      maxOrderAmount: getNumberValue(form.maxOrderAmount, 0),
      config: parsedConfig,
    }
  }

  const resetCreateForm = () => {
    setForm({
      name: '',
      code: '',
      type: 'manual',
      provider: 'custom',
      displayName: '',
      description: '',
      instructions: '',
      sortOrder: '0',
      testMode: true,
      isActive: true,
      allowedCountries: '',
      minOrderAmount: '0',
      maxOrderAmount: '0',
      configJson: '{}',
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
      await createPaymentMethod(payload)
      setSuccessMessage('Payment method created successfully.')
      resetCreateForm()
      await loadPaymentMethods()
    } catch (err) {
      setError(getFriendlyDuplicateError(err, 'Failed to create payment method.'))
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
      type: item?.type || 'manual',
      provider: item?.provider || 'custom',
      displayName: item?.displayName || '',
      sortOrder: String(getNumberValue(item?.sortOrder, 0)),
      testMode: Boolean(item?.testMode),
      isActive: item?.isActive !== false,
    })
  }

  const cancelEdit = () => {
    setEditingId('')
    setEditForm({
      name: '',
      code: '',
      type: 'manual',
      provider: 'custom',
      displayName: '',
      sortOrder: '0',
      testMode: true,
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
      await updatePaymentMethod(editingId, {
        name: editForm.name.trim(),
        code: editForm.code.trim(),
        type: editForm.type,
        provider: editForm.provider,
        displayName: editForm.displayName.trim(),
        sortOrder: getNumberValue(editForm.sortOrder, 0),
        testMode: Boolean(editForm.testMode),
        isActive: Boolean(editForm.isActive),
      })
      setSuccessMessage('Payment method updated successfully.')
      setEditingId('')
      await loadPaymentMethods()
    } catch (err) {
      setError(getFriendlyDuplicateError(err, 'Failed to update payment method.'))
    } finally {
      setSavingRow(false)
    }
  }

  const handleDelete = async (item) => {
    const id = item?._id || item?.id
    if (!id) return

    const confirmed = window.confirm('Deactivate this payment method?')
    if (!confirmed) return

    setDeletingId(id)
    setError('')
    setSuccessMessage('')
    try {
      await deletePaymentMethod(id)
      setSuccessMessage('Payment method deactivated successfully.')
      if (editingId === id) cancelEdit()
      await loadPaymentMethods()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to deactivate payment method.')
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
    { key: 'provider', label: 'Provider' },
    { key: 'displayName', label: 'Display Name' },
    { key: 'status', label: 'Status' },
    { key: 'sort', label: 'Sort' },
    { key: 'actions', label: 'Actions' },
  ]

  return (
    <section>
      <ModuleHeader
        title="Payment Methods"
        description="Manage payment options available during checkout."
      />

      <ModuleCard title="Create Payment Method" className="mb-4">
        <form onSubmit={handleCreate}>
          <ModuleFormGrid columns={2}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
              <Input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Code</label>
              <Input
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                placeholder="optional (auto-generated if empty)"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
              <select
                className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm"
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
              >
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Provider</label>
              <select
                className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm"
                value={form.provider}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, provider: event.target.value }))
                }
              >
                {providerOptions.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Display Name</label>
              <Input
                value={form.displayName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, displayName: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Sort Order</label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, sortOrder: event.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Instructions</label>
              <Textarea
                rows={2}
                value={form.instructions}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, instructions: event.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Allowed Countries (comma separated)</label>
              <Input
                value={form.allowedCountries}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, allowedCountries: event.target.value }))
                }
                placeholder="US, IN, GB"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Minimum Order Amount</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.minOrderAmount}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, minOrderAmount: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Maximum Order Amount</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.maxOrderAmount}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, maxOrderAmount: event.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Config JSON</label>
              <Textarea
                className="font-mono"
                rows={5}
                value={form.configJson}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, configJson: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <Checkbox checked={form.testMode} onCheckedChange={(checked) => handleFormCheckChange('testMode', checked)} />
                Test Mode
              </label>
            </div>
            <div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <Checkbox checked={form.isActive} onCheckedChange={(checked) => handleFormCheckChange('isActive', checked)} />
                Active
              </label>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Payment Method'}
              </Button>
            </div>
          </ModuleFormGrid>
        </form>
      </ModuleCard>

      <ModuleToolbar>
        <form className="flex w-full flex-col gap-2 sm:flex-row sm:items-center" onSubmit={handleSearchSubmit}>
          <Input
            type="text"
            placeholder="Search payment methods..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <Button type="submit" size="sm">
            Search
          </Button>
        </form>

        <select
          className="flex h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          value={typeFilter}
          onChange={(event) => {
            setCurrentPage(1)
            setTypeFilter(event.target.value)
          }}
        >
          {typeFilters.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          className="flex h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          value={providerFilter}
          onChange={(event) => {
            setCurrentPage(1)
            setProviderFilter(event.target.value)
          }}
        >
          {providerFilters.map((provider) => (
            <option key={provider} value={provider}>
              {provider}
            </option>
          ))}
        </select>

        <select
          className="flex h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
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
          <p className="text-sm text-slate-600">Loading payment methods...</p>
        </ModuleCard>
      ) : null}

      {error ? (
        <ModuleCard className="mb-3 border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
        </ModuleCard>
      ) : null}

      {successMessage ? (
        <ModuleCard className="mb-3 border-blue-200 bg-blue-50">
          <p className="text-sm text-blue-700">{successMessage}</p>
        </ModuleCard>
      ) : null}

      {!loading && !error ? (
        paymentMethods.length === 0 ? (
          <ModuleEmptyState
            title="No payment methods found"
            description="Create a payment method or try changing filters."
          />
        ) : (
          <>
            <ModuleTable
              columns={columns}
              data={paymentMethods}
              emptyMessage="No payment methods found."
              renderRow={(item, index) => {
                const id = item?._id || item?.id || `payment-method-${index}`
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
                        <select
                          className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm"
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
                        </select>
                      ) : (
                        item?.type || '-'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm"
                          value={editForm.provider}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, provider: event.target.value }))
                          }
                        >
                          {providerOptions.map((provider) => (
                            <option key={provider} value={provider}>
                              {provider}
                            </option>
                          ))}
                        </select>
                      ) : (
                        item?.provider || '-'
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
                        <div className="flex items-center gap-3">
                          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                            <Checkbox checked={editForm.testMode} onCheckedChange={(checked) => handleEditCheckChange('testMode', checked)} />
                            Test
                          </label>
                          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                            <Checkbox checked={editForm.isActive} onCheckedChange={(checked) => handleEditCheckChange('isActive', checked)} />
                            Active
                          </label>
                        </div>
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

            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPrevious={goPrev}
              onNext={goNext}
            />
          </>
        )
      ) : null}
    </section>
  )
}

export default PaymentMethods
