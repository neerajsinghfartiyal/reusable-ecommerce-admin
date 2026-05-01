import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  createCoupon,
  deleteCoupon,
  getCoupons,
  updateCoupon,
} from '../api/couponApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

const statusFilters = ['all', 'active', 'inactive']
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

const getFriendlyCreateError = (error) => {
  const message = error?.response?.data?.message || ''
  if (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('code')) {
    return 'Coupon code already exists. Please use a different code.'
  }
  return message || 'Failed to create coupon.'
}

function Coupons() {
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
      console.log('First coupon item:', list[0])
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
    <section>
      <ModuleHeader
        title="Coupons"
        description="Manage discount codes, usage limits, and promotional offers."
      />

      <ModuleCard title="Create Coupon" className="mb-4">
        <form onSubmit={handleCreate}>
          <ModuleFormGrid columns={2}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Code</label>
              <Input
                value={form.code}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, code: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Discount Type</label>
              <select
                className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm"
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
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Discount Value</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.discountValue}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, discountValue: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Minimum Order Amount</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.minimumOrderAmount}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, minimumOrderAmount: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Usage Limit</label>
              <Input
                type="number"
                min="0"
                value={form.usageLimit}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, usageLimit: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Start Date</label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, startDate: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">End Date</label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, endDate: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <Checkbox checked={form.isActive} onCheckedChange={handleFormCheckChange} />
                Active
              </label>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Coupon'}
              </Button>
            </div>
          </ModuleFormGrid>
        </form>
      </ModuleCard>

      <ModuleToolbar>
        <form className="flex w-full flex-col gap-2 sm:flex-row sm:items-center" onSubmit={handleSearchSubmit}>
          <Input
            type="text"
            placeholder="Search coupon code..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <Button type="submit" size="sm">
            Search
          </Button>
        </form>
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
          <p className="text-sm text-slate-600">Loading coupons...</p>
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
                <tr key={couponId}>
                  <td>
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
                      <select
                        className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm"
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
                      </select>
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
                      getDiscountValue(coupon)
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
                      getMinimumOrderAmount(coupon)
                    )}
                  </td>
                  <td>
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
                  <td>
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
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
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

export default Coupons
