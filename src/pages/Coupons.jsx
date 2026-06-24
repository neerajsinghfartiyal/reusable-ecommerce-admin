import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  createCoupon,
  deleteCoupon,
  getCoupons,
  updateCoupon,
} from '../api/couponApi'
import AdminAlert from '@/components/admin-ui/AdminAlert'
import AdminFilterBar from '@/components/admin-ui/AdminFilterBar'
import AdminFilterField from '@/components/admin-ui/AdminFilterField'
import AdminField from '@/components/admin-ui/AdminField'
import AdminPage from '@/components/admin-ui/AdminPage'
import AdminPagination from '@/components/admin-ui/AdminPagination'
import AdminSelect from '@/components/admin-ui/AdminSelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import ModuleActions from '@/components/admin-ui/ModuleActions'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import ModuleEmptyState from '@/components/admin-ui/ModuleEmptyState'
import ModuleFormGrid from '@/components/admin-ui/ModuleFormGrid'
import ModuleStatusBadge from '@/components/admin-ui/ModuleStatusBadge'
import ModuleTable from '@/components/admin-ui/ModuleTable'
import PageLoading from '@/components/admin-ui/PageLoading'
import { useFormatCurrency } from '@/hooks/useFormatCurrency'
const statusFilters = ['all', 'active', 'inactive']

const getStatusFilterLabel = (status) => {
  if (status === 'all') {
    return 'All statuses'
  }

  return status.charAt(0).toUpperCase() + status.slice(1)
}
const discountTypes = ['percentage', 'fixed']

const getNumberValue = (...values) => {
  for (const value of values) {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return 0
}

const extractList = (response) => {
  const checks = [
    response?.data?.coupons,
    response?.coupons,
    response?.data?.data?.coupons,
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

const getDiscountValue = (coupon) =>
  getNumberValue(
    coupon?.discountValue,
    coupon?.couponDiscountValue,
    coupon?.value,
    coupon?.amount,
    0,
  )

const getMinimumOrderAmount = (coupon) =>
  getNumberValue(
    coupon?.minimumOrderAmount,
    coupon?.minOrderAmount,
    coupon?.minAmount,
    0,
  )

const getUsageData = (coupon) => ({
  used: getNumberValue(coupon?.usedCount, coupon?.used, 0),
  limit:
    coupon?.usageLimit !== undefined || coupon?.limit !== undefined
      ? getNumberValue(coupon?.usageLimit, coupon?.limit, 0)
      : '-',
})

const getStatus = (coupon) => {
  if (typeof coupon?.isActive === 'boolean') return coupon.isActive ? 'active' : 'inactive'
  if (typeof coupon?.status === 'string') return coupon.status.toLowerCase()
  return 'inactive'
}

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-')

const formatCouponDiscountDisplay = (coupon, formatCurrency) => {
  const value = getDiscountValue(coupon)
  if (String(coupon?.discountType || '').toLowerCase() === 'percentage') {
    return `${value}%`
  }
  return formatCurrency(value)
}

const formatCouponMinimumOrderDisplay = (coupon, formatCurrency) => {
  const amount = getMinimumOrderAmount(coupon)
  return amount > 0 ? formatCurrency(amount) : '-'
}

const getFriendlyCreateError = (error) => {
  const message = error?.response?.data?.message || ''
  if (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('code')) {
    return 'Coupon code already exists. Please use a different code.'
  }
  return message || 'Failed to create coupon.'
}

function Coupons() {
  const formatCurrency = useFormatCurrency()
  const location = useLocation()
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [savingRow, setSavingRow] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [pagination, setPagination] = useState({
    totalItems: 0,
    currentPage: 1,
    totalPages: 1,
    pageLimit: 10,
  })
  const [form, setForm] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: '',
    minimumOrderAmount: '',
    usageLimit: '',
    startDate: '',
    endDate: '',
    isActive: true,
  })
  const [editForm, setEditForm] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: '',
    minimumOrderAmount: '',
    usageLimit: '',
    startDate: '',
    endDate: '',
    isActive: true,
  })

  const loadCoupons = async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page: currentPage }
      if (searchQuery) params.search = searchQuery
      if (statusFilter !== 'all') params.status = statusFilter

      const response = await getCoupons(params)
      const list = extractList(response)
      const paginationData = extractPagination(response)

      setCoupons(list)
      setPagination({
        totalItems: getNumberValue(
          paginationData?.totalItems,
          paginationData?.totalCoupons,
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
      setError(err?.response?.data?.message || 'Failed to load coupons.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCoupons()
  }, [currentPage, searchQuery, statusFilter, location.pathname])

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

  const resetCreateForm = () => {
    setForm({
      code: '',
      discountType: 'percentage',
      discountValue: '',
      minimumOrderAmount: '',
      usageLimit: '',
      startDate: '',
      endDate: '',
      isActive: true,
    })
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    if (!form.code.trim()) {
      setError('Coupon code is required.')
      return
    }

    setSubmitting(true)
    setError('')
    setSuccessMessage('')
    try {
      await createCoupon({
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: getNumberValue(form.discountValue, 0),
        minimumOrderAmount: getNumberValue(form.minimumOrderAmount, 0),
        usageLimit: getNumberValue(form.usageLimit, 0),
        startDate: form.startDate || null,
        expiryDate: form.endDate || null,
        status: form.isActive ? 'active' : 'inactive',
      })
      setSuccessMessage('Coupon created successfully.')
      resetCreateForm()
      await loadCoupons()
    } catch (err) {
      setError(getFriendlyCreateError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (coupon) => {
    setEditingId(coupon?._id || coupon?.id || '')
    setEditForm({
      code: coupon?.code || '',
      discountType: coupon?.discountType || 'percentage',
      discountValue: String(getDiscountValue(coupon)),
      minimumOrderAmount: String(getMinimumOrderAmount(coupon)),
      usageLimit: String(getNumberValue(coupon?.usageLimit, coupon?.limit, 0)),
      startDate: coupon?.startDate ? String(coupon.startDate).slice(0, 10) : '',
      endDate: (coupon?.endDate || coupon?.expiryDate)
        ? String(coupon?.endDate || coupon?.expiryDate).slice(0, 10)
        : '',
      isActive: getStatus(coupon) === 'active',
    })
  }

  const cancelEdit = () => {
    setEditingId('')
  }

  const handleInlineUpdate = async () => {
    if (!editingId) return
    if (!editForm.code.trim()) {
      setError('Coupon code is required.')
      return
    }
    setSavingRow(true)
    setError('')
    setSuccessMessage('')
    try {
      await updateCoupon(editingId, {
        code: editForm.code.trim().toUpperCase(),
        discountType: editForm.discountType,
        discountValue: getNumberValue(editForm.discountValue, 0),
        minimumOrderAmount: getNumberValue(editForm.minimumOrderAmount, 0),
        usageLimit: getNumberValue(editForm.usageLimit, 0),
        startDate: editForm.startDate || null,
        expiryDate: editForm.endDate || null,
        status: editForm.isActive ? 'active' : 'inactive',
      })
      setSuccessMessage('Coupon updated successfully.')
      setEditingId('')
      await loadCoupons()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update coupon.')
    } finally {
      setSavingRow(false)
    }
  }

  const handleDelete = async (coupon) => {
    const couponId = coupon?._id || coupon?.id
    if (!couponId) return
    const ok = window.confirm(
      `Are you sure you want to delete coupon ${coupon?.code || ''}?`,
    )
    if (!ok) return

    setDeletingId(couponId)
    setError('')
    setSuccessMessage('')
    try {
      await deleteCoupon(couponId)
      setSuccessMessage('Coupon deleted successfully.')
      if (editingId === couponId) setEditingId('')
      await loadCoupons()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete coupon.')
    } finally {
      setDeletingId('')
    }
  }

  const goPrev = () => setCurrentPage((prev) => Math.max(1, prev - 1))
  const goNext = () =>
    setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'type', label: 'Type' },
    { key: 'value', label: 'Value' },
    { key: 'minimumOrder', label: 'Minimum Order' },
    { key: 'usage', label: 'Usage' },
    { key: 'dateRange', label: 'Date Range' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ]

  return (
    <AdminPage
      headerMode="hidden"
      title="Coupons"
      description="Manage discount codes, usage limits, and promotional offers."
    >
      <ModuleCard title="Create Coupon">
        <form onSubmit={handleCreate}>
          <ModuleFormGrid columns={2}>
            <AdminField label="Code" required>
              <Input
                value={form.code}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, code: event.target.value }))
                }
              />
            </AdminField>

            <AdminField label="Type">
              <AdminSelect
                value={form.discountType}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, discountType: event.target.value }))
                }
              >
                {discountTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>

            <AdminField label="Value">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.discountValue}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, discountValue: event.target.value }))
                }
              />
            </AdminField>

            <AdminField label="Minimum Order">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.minimumOrderAmount}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, minimumOrderAmount: event.target.value }))
                }
              />
            </AdminField>

            <AdminField label="Usage Limit">
              <Input
                type="number"
                min="0"
                value={form.usageLimit}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, usageLimit: event.target.value }))
                }
              />
            </AdminField>

            <AdminField label="Starts At">
              <Input
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, startDate: event.target.value }))
                }
              />
            </AdminField>

            <AdminField label="Ends At">
              <Input
                type="date"
                value={form.endDate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, endDate: event.target.value }))
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
                {submitting ? 'Creating...' : 'Create Coupon'}
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
              placeholder="Search coupons..."
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

      {loading ? <PageLoading message="Loading coupons..." /> : null}

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
        coupons.length === 0 ? (
          <ModuleEmptyState
            title="No coupons found"
            description="Create your first coupon or try changing filters."
          />
        ) : (
          <>
            <ModuleTable
              columns={columns}
              data={coupons}
              emptyMessage="No coupons found."
              renderRow={(coupon, index) => {
                const couponId = coupon?._id || coupon?.id || `coupon-${index}`
                const status = getStatus(coupon)
                const usageData = getUsageData(coupon)
                const isEditing = editingId === couponId
                const isDeleting = deletingId === couponId
                const startDate = coupon?.startDate
                const endDate = coupon?.endDate || coupon?.expiryDate

                return (
                  <tr key={couponId} className="text-slate-700 dark:text-slate-300">
                    <td className="font-medium text-slate-800 dark:text-slate-100">
                      {isEditing ? (
                        <Input
                          type="text"
                          value={editForm.code}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, code: event.target.value }))
                          }
                        />
                      ) : (
                        coupon?.code || '-'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <AdminSelect
                          value={editForm.discountType}
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              discountType: event.target.value,
                            }))
                          }
                        >
                          {discountTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </AdminSelect>
                      ) : (
                        coupon?.discountType || '-'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editForm.discountValue}
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              discountValue: event.target.value,
                            }))
                          }
                        />
                      ) : (
                        formatCouponDiscountDisplay(coupon, formatCurrency)
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editForm.minimumOrderAmount}
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              minimumOrderAmount: event.target.value,
                            }))
                          }
                        />
                      ) : (
                        formatCouponMinimumOrderDisplay(coupon, formatCurrency)
                      )}
                    </td>
                    <td className="text-slate-600 dark:text-slate-400">
                      {isEditing ? (
                        <Input
                          type="number"
                          min="0"
                          value={editForm.usageLimit}
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              usageLimit: event.target.value,
                            }))
                          }
                        />
                      ) : (
                        `${usageData.used} / ${usageData.limit}`
                      )}
                    </td>
                    <td className="text-slate-600 dark:text-slate-400">
                      {isEditing ? (
                        <div className="grid grid-cols-1 gap-2">
                          <Input
                            type="date"
                            value={editForm.startDate}
                            onChange={(event) =>
                              setEditForm((prev) => ({
                                ...prev,
                                startDate: event.target.value,
                              }))
                            }
                          />
                          <Input
                            type="date"
                            value={editForm.endDate}
                            onChange={(event) =>
                              setEditForm((prev) => ({
                                ...prev,
                                endDate: event.target.value,
                              }))
                            }
                          />
                        </div>
                      ) : (
                        `${formatDate(startDate)} - ${formatDate(endDate)}`
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <Checkbox checked={editForm.isActive} onCheckedChange={handleEditCheckChange} />
                          Active
                        </label>
                      ) : (
                        <ModuleStatusBadge status={status} />
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
                              onClick={handleInlineUpdate}
                            >
                              {savingRow ? 'Saving...' : 'Save'}
                            </Button>
                            <Button type="button" size="sm" variant="secondary" onClick={cancelEdit}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(coupon)}
                          >
                            Edit
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={isDeleting}
                          onClick={() => handleDelete(coupon)}
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

export default Coupons
