import { Fragment, useEffect, useState } from 'react'
import {
  createAttribute,
  deleteAttribute,
  getAttributes,
  updateAttribute,
} from '../api/attributeApi'
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
import { Textarea } from '@/components/ui/textarea'
import ModuleActions from '@/components/admin-ui/ModuleActions'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import ModuleEmptyState from '@/components/admin-ui/ModuleEmptyState'
import ModuleFormGrid from '@/components/admin-ui/ModuleFormGrid'
import ModuleStatusBadge from '@/components/admin-ui/ModuleStatusBadge'
import ModuleTable from '@/components/admin-ui/ModuleTable'
import PageLoading from '@/components/admin-ui/PageLoading'
import {
  adminHelperTextClass,
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminDangerButtonClass,
  adminSubCardSurfaceClass,
  adminTextareaClass,
} from '../components/admin-ui/adminStyles'

const typeOptions = ['text', 'dropdown', 'button', 'color', 'image']
const statusFilters = ['all', 'active', 'inactive']
const typeFilters = ['all', ...typeOptions]
const variationFilters = ['all', 'variation', 'not_variation']
const filterableFilters = ['all', 'filterable', 'not_filterable']

const getTypeFilterLabel = (type) => {
  if (type === 'all') {
    return 'All types'
  }

  return type.charAt(0).toUpperCase() + type.slice(1)
}

const getStatusFilterLabel = (status) => {
  if (status === 'all') {
    return 'All statuses'
  }

  return status.charAt(0).toUpperCase() + status.slice(1)
}

const getVariationFilterLabel = (value) => {
  if (value === 'all') {
    return 'All variation settings'
  }

  if (value === 'variation') {
    return 'Yes'
  }

  return 'No'
}

const getFilterableFilterLabel = (value) => {
  if (value === 'all') {
    return 'All filterable settings'
  }

  if (value === 'filterable') {
    return 'Yes'
  }

  return 'No'
}

const defaultValueItem = () => ({
  label: '',
  value: '',
  colorCode: '',
  image: '',
  sortOrder: '0',
  isActive: true,
})

const getNumberValue = (...values) => {
  for (const value of values) {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return 0
}

const extractList = (response) => {
  const checks = [
    response?.data?.attributes,
    response?.attributes,
    response?.data?.data?.attributes,
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

const getFriendlyError = (error, fallback) => {
  const message = String(error?.response?.data?.message || '')
  const lower = message.toLowerCase()
  if (lower.includes('code') && lower.includes('exists')) {
    return 'Attribute code already exists. Please use a different code.'
  }
  if (lower.includes('duplicate') && lower.includes('value')) {
    return 'Attribute values must be unique.'
  }
  return message || fallback
}

function Attributes() {
  const [attributes, setAttributes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [variationFilter, setVariationFilter] = useState('all')
  const [filterableFilter, setFilterableFilter] = useState('all')
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
    code: '',
    type: 'dropdown',
    description: '',
    isVariationAttribute: true,
    isFilterable: true,
    isActive: true,
    sortOrder: '0',
    values: [defaultValueItem()],
  })

  const [editForm, setEditForm] = useState({
    name: '',
    code: '',
    type: 'dropdown',
    description: '',
    isVariationAttribute: true,
    isFilterable: true,
    isActive: true,
    sortOrder: '0',
    values: [defaultValueItem()],
  })

  const loadAttributes = async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page: currentPage }
      if (searchQuery) params.search = searchQuery
      if (typeFilter !== 'all') params.type = typeFilter
      if (statusFilter !== 'all') params.isActive = statusFilter === 'active'
      if (variationFilter !== 'all') {
        params.isVariationAttribute = variationFilter === 'variation'
      }
      if (filterableFilter !== 'all') {
        params.isFilterable = filterableFilter === 'filterable'
      }

      const response = await getAttributes(params)
      const list = extractList(response)
      const paginationData = extractPagination(response)

      setAttributes(list)
      setPagination({
        totalItems: getNumberValue(
          paginationData?.totalItems,
          paginationData?.totalAttributes,
          response?.data?.data?.totalItems,
          response?.data?.data?.totalAttributes,
          response?.data?.totalItems,
          response?.data?.totalAttributes,
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
      setError(err?.response?.data?.message || 'Failed to load attributes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAttributes()
  }, [currentPage, searchQuery, typeFilter, statusFilter, variationFilter, filterableFilter])

  const normalizeValues = (values) =>
    values.map((item) => ({
      label: String(item?.label || '').trim(),
      value: String(item?.value || '').trim(),
      colorCode: String(item?.colorCode || '').trim(),
      image: String(item?.image || '').trim(),
      sortOrder: getNumberValue(item?.sortOrder, 0),
      isActive: item?.isActive !== undefined ? Boolean(item.isActive) : true,
    }))

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setCurrentPage(1)
    setSearchQuery(searchInput.trim())
  }

  const handleCreateValueChange = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      values: prev.values.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }))
  }

  const addCreateValue = () => {
    setForm((prev) => ({ ...prev, values: [...prev.values, defaultValueItem()] }))
  }

  const removeCreateValue = (index) => {
    setForm((prev) => ({
      ...prev,
      values: prev.values.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const resetForm = () => {
    setForm({
      name: '',
      code: '',
      type: 'dropdown',
      description: '',
      isVariationAttribute: true,
      isFilterable: true,
      isActive: true,
      sortOrder: '0',
      values: [defaultValueItem()],
    })
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!form.name.trim()) {
      setError('Attribute name is required.')
      return
    }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      type: form.type,
      description: form.description.trim(),
      values: normalizeValues(form.values).filter((item) => item.label || item.value),
      isVariationAttribute: Boolean(form.isVariationAttribute),
      isFilterable: Boolean(form.isFilterable),
      isActive: Boolean(form.isActive),
      sortOrder: getNumberValue(form.sortOrder, 0),
    }

    setSubmitting(true)
    try {
      await createAttribute(payload)
      setSuccessMessage('Attribute created successfully.')
      resetForm()
      await loadAttributes()
    } catch (err) {
      setError(getFriendlyError(err, 'Failed to create attribute.'))
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (attribute) => {
    const id = attribute?._id || attribute?.id || ''
    setEditingId(id)
    setEditForm({
      name: attribute?.name || '',
      code: attribute?.code || '',
      type: attribute?.type || 'dropdown',
      description: attribute?.description || '',
      isVariationAttribute: attribute?.isVariationAttribute !== false,
      isFilterable: attribute?.isFilterable !== false,
      isActive: attribute?.isActive !== false,
      sortOrder: String(getNumberValue(attribute?.sortOrder, 0)),
      values: Array.isArray(attribute?.values) && attribute.values.length > 0
        ? attribute.values.map((item) => ({
            label: item?.label || '',
            value: item?.value || '',
            colorCode: item?.colorCode || '',
            image: item?.image || '',
            sortOrder: String(getNumberValue(item?.sortOrder, 0)),
            isActive: item?.isActive !== false,
          }))
        : [defaultValueItem()],
    })
  }

  const cancelEdit = () => {
    setEditingId('')
    setEditForm({
      name: '',
      code: '',
      type: 'dropdown',
      description: '',
      isVariationAttribute: true,
      isFilterable: true,
      isActive: true,
      sortOrder: '0',
      values: [defaultValueItem()],
    })
  }

  const handleEditValueChange = (index, field, value) => {
    setEditForm((prev) => ({
      ...prev,
      values: prev.values.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }))
  }

  const addEditValue = () => {
    setEditForm((prev) => ({ ...prev, values: [...prev.values, defaultValueItem()] }))
  }

  const removeEditValue = (index) => {
    setEditForm((prev) => ({
      ...prev,
      values: prev.values.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    setError('')
    setSuccessMessage('')

    if (!editForm.name.trim()) {
      setError('Attribute name is required.')
      return
    }

    const payload = {
      name: editForm.name.trim(),
      code: editForm.code.trim(),
      type: editForm.type,
      description: editForm.description.trim(),
      values: normalizeValues(editForm.values).filter((item) => item.label || item.value),
      isVariationAttribute: Boolean(editForm.isVariationAttribute),
      isFilterable: Boolean(editForm.isFilterable),
      isActive: Boolean(editForm.isActive),
      sortOrder: getNumberValue(editForm.sortOrder, 0),
    }

    setSavingRow(true)
    try {
      await updateAttribute(editingId, payload)
      setSuccessMessage('Attribute updated successfully.')
      setEditingId('')
      await loadAttributes()
    } catch (err) {
      setError(getFriendlyError(err, 'Failed to update attribute.'))
    } finally {
      setSavingRow(false)
    }
  }

  const handleDelete = async (attribute) => {
    const id = attribute?._id || attribute?.id
    if (!id) return

    const confirmed = window.confirm('Deactivate this attribute?')
    if (!confirmed) return

    setDeletingId(id)
    setError('')
    setSuccessMessage('')
    try {
      await deleteAttribute(id)
      setSuccessMessage('Attribute deactivated successfully.')
      if (editingId === id) cancelEdit()
      await loadAttributes()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to deactivate attribute.')
    } finally {
      setDeletingId('')
    }
  }

  const goPrev = () => setCurrentPage((prev) => Math.max(1, prev - 1))
  const goNext = () => setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))

  const renderValueChips = (values) => {
    const list = Array.isArray(values) ? values : []
    if (list.length === 0) return <span>-</span>

    const shown = list.slice(0, 4)
    const moreCount = Math.max(0, list.length - 4)

    return (
      <div className="attribute-value-chips">
        {shown.map((item, index) => (
          <span
            key={`${item?.value || item?.label || 'value'}-${index}`}
            className="attribute-value-chip"
          >
            {item?.label || item?.value || '-'}
          </span>
        ))}
        {moreCount > 0 ? <span className="attribute-value-more">+{moreCount} more</span> : null}
      </div>
    )
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'code', label: 'Code' },
    { key: 'type', label: 'Type' },
    { key: 'values', label: 'Values' },
    { key: 'variation', label: 'Variation' },
    { key: 'filterable', label: 'Filterable' },
    { key: 'status', label: 'Status' },
    { key: 'sort', label: 'Sort' },
    { key: 'actions', label: 'Actions' },
  ]

  return (
    <AdminPage
      headerMode="hidden"
      title="Product Attributes"
      description="Manage product attributes such as size, color, material, and variation options."
    >

      <ModuleCard title="Create Attribute" className="attribute-create-card dark:border-slate-800">
        <form onSubmit={handleCreate}>
          <ModuleFormGrid columns={2}>
            <AdminField label="Name" required>
              <Input
                type="text"
                className={adminInputClass}
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </AdminField>
            <AdminField label="Code" description="Optional (auto-generated if empty)">
              <Input
                type="text"
                className={adminInputClass}
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                placeholder="Optional (auto-generated if empty)"
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
            <AdminField label="Sort Order">
              <Input
                type="number"
                className={adminInputClass}
                value={form.sortOrder}
                onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
              />
            </AdminField>
            <AdminField label="Description" className="md:col-span-2">
              <Textarea
                className={`${adminTextareaClass} field-textarea`}
                rows={2}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </AdminField>
            <AdminField label="Variation Attribute">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Checkbox
                  checked={form.isVariationAttribute}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      isVariationAttribute: checked === true,
                    }))
                  }
                />
                Variation Attribute
              </label>
            </AdminField>
            <AdminField label="Filterable">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Checkbox
                  checked={form.isFilterable}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, isFilterable: checked === true }))
                  }
                />
                Filterable
              </label>
            </AdminField>
            <AdminField label="Active">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Checkbox
                  checked={form.isActive}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, isActive: checked === true }))
                  }
                />
                Active
              </label>
            </AdminField>
          </ModuleFormGrid>

          <div className={`${adminSubCardSurfaceClass} attribute-values-editor`}>
            <div className="attribute-values-header">
              <h3 className="setup-title">Attribute Values</h3>
              <Button type="button" size="sm" variant="secondary" onClick={addCreateValue}>
                Add Value
              </Button>
            </div>

            {form.values.map((item, index) => (
              <div key={`create-value-${index}`} className="attribute-value-row">
                <Input
                  type="text"
                  className={adminInputClass}
                  placeholder="Label"
                  value={item.label}
                  onChange={(event) => handleCreateValueChange(index, 'label', event.target.value)}
                />
                <Input
                  type="text"
                  className={adminInputClass}
                  placeholder="Value"
                  value={item.value}
                  onChange={(event) => handleCreateValueChange(index, 'value', event.target.value)}
                />
                <Input
                  type="text"
                  className={adminInputClass}
                  placeholder="Color code"
                  value={item.colorCode}
                  onChange={(event) => handleCreateValueChange(index, 'colorCode', event.target.value)}
                />
                <Input
                  type="text"
                  className={adminInputClass}
                  placeholder="Image URL"
                  value={item.image}
                  onChange={(event) => handleCreateValueChange(index, 'image', event.target.value)}
                />
                <Input
                  type="number"
                  className={adminInputClass}
                  placeholder="Sort"
                  value={item.sortOrder}
                  onChange={(event) => handleCreateValueChange(index, 'sortOrder', event.target.value)}
                />
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Checkbox
                    checked={item.isActive}
                    onCheckedChange={(checked) =>
                      handleCreateValueChange(index, 'isActive', checked === true)
                    }
                  />
                  Active
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className={adminDangerButtonClass}
                  onClick={() => removeCreateValue(index)}
                  disabled={form.values.length <= 1}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <ModuleActions className="mt-3 justify-end">
            <Button type="submit" size="sm" className={adminPrimaryButtonClass} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Attribute'}
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
              placeholder="Search attributes..."
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
            aria-label="Filter by attribute type"
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

        <AdminFilterField label="Variation">
          <AdminSelect
            value={variationFilter}
            aria-label="Filter by variation setting"
            onChange={(event) => {
              setCurrentPage(1)
              setVariationFilter(event.target.value)
            }}
          >
            {variationFilters.map((value) => (
              <option key={value} value={value}>
                {getVariationFilterLabel(value)}
              </option>
            ))}
          </AdminSelect>
        </AdminFilterField>

        <AdminFilterField label="Filterable">
          <AdminSelect
            value={filterableFilter}
            aria-label="Filter by filterable setting"
            onChange={(event) => {
              setCurrentPage(1)
              setFilterableFilter(event.target.value)
            }}
          >
            {filterableFilters.map((value) => (
              <option key={value} value={value}>
                {getFilterableFilterLabel(value)}
              </option>
            ))}
          </AdminSelect>
        </AdminFilterField>
      </AdminFilterBar>

      {loading ? <PageLoading message="Loading attributes..." /> : null}

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
        attributes.length === 0 ? (
          <ModuleEmptyState
            title="No attributes found"
            description="Create an attribute to manage reusable variation options."
          />
        ) : (
          <>
            <ModuleTable
              columns={columns}
              data={attributes}
              emptyMessage="No attributes found."
              renderRow={(attribute, index) => {
                const id = attribute?._id || attribute?.id || `attribute-${index}`
                const isEditing = editingId === id
                const isDeleting = deletingId === id

                return (
                  <Fragment key={id}>
                    <tr className="text-slate-700 dark:text-slate-300">
                      <td className="font-medium text-slate-800 dark:text-slate-100">{attribute?.name || '-'}</td>
                      <td className={adminHelperTextClass}>{attribute?.code || '-'}</td>
                      <td className={adminHelperTextClass}>{attribute?.type || '-'}</td>
                      <td className={adminHelperTextClass}>{renderValueChips(attribute?.values)}</td>
                      <td className={adminHelperTextClass}>{attribute?.isVariationAttribute ? 'Yes' : 'No'}</td>
                      <td className={adminHelperTextClass}>{attribute?.isFilterable ? 'Yes' : 'No'}</td>
                      <td>
                        <ModuleStatusBadge status={attribute?.isActive ? 'active' : 'inactive'} />
                      </td>
                      <td className={adminHelperTextClass}>{getNumberValue(attribute?.sortOrder, 0)}</td>
                      <td>
                        <ModuleActions>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className={adminSecondaryButtonClass}
                            onClick={() => (isEditing ? cancelEdit() : startEdit(attribute))}
                          >
                            {isEditing ? 'Close' : 'Edit'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className={adminDangerButtonClass}
                            disabled={isDeleting}
                            onClick={() => handleDelete(attribute)}
                          >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                          </Button>
                        </ModuleActions>
                      </td>
                    </tr>

                    {isEditing ? (
                      <tr>
                        <td colSpan={9} className="attribute-edit-cell dark:bg-slate-900/60">
                          <ModuleCard className="attribute-edit-panel">
                            <ModuleFormGrid columns={2}>
                              <AdminField label="Name" required>
                                <Input
                                  type="text"
                                  className={adminInputClass}
                                  value={editForm.name}
                                  onChange={(event) =>
                                    setEditForm((prev) => ({ ...prev, name: event.target.value }))
                                  }
                                />
                              </AdminField>
                              <AdminField label="Code">
                                <Input
                                  type="text"
                                  className={adminInputClass}
                                  value={editForm.code}
                                  onChange={(event) =>
                                    setEditForm((prev) => ({ ...prev, code: event.target.value }))
                                  }
                                />
                              </AdminField>
                              <AdminField label="Type">
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
                              </AdminField>
                              <AdminField label="Sort Order">
                                <Input
                                  type="number"
                                  className={adminInputClass}
                                  value={editForm.sortOrder}
                                  onChange={(event) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      sortOrder: event.target.value,
                                    }))
                                  }
                                />
                              </AdminField>
                              <AdminField label="Description" className="md:col-span-2">
                                <Textarea
                                  className={`${adminTextareaClass} field-textarea`}
                                  rows={2}
                                  value={editForm.description}
                                  onChange={(event) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      description: event.target.value,
                                    }))
                                  }
                                />
                              </AdminField>
                              <AdminField label="Variation Attribute">
                                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                  <Checkbox
                                    checked={editForm.isVariationAttribute}
                                    onCheckedChange={(checked) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        isVariationAttribute: checked === true,
                                      }))
                                    }
                                  />
                                  Variation Attribute
                                </label>
                              </AdminField>
                              <AdminField label="Filterable">
                                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                  <Checkbox
                                    checked={editForm.isFilterable}
                                    onCheckedChange={(checked) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        isFilterable: checked === true,
                                      }))
                                    }
                                  />
                                  Filterable
                                </label>
                              </AdminField>
                              <AdminField label="Active">
                                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                  <Checkbox
                                    checked={editForm.isActive}
                                    onCheckedChange={(checked) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        isActive: checked === true,
                                      }))
                                    }
                                  />
                                  Active
                                </label>
                              </AdminField>
                            </ModuleFormGrid>

                            <div className={`${adminSubCardSurfaceClass} attribute-values-editor`}>
                              <div className="attribute-values-header">
                                <h3 className="setup-title">Attribute Values</h3>
                                <Button type="button" size="sm" variant="secondary" onClick={addEditValue}>
                                  Add Value
                                </Button>
                              </div>

                              {editForm.values.map((item, valueIndex) => (
                                <div key={`edit-value-${valueIndex}`} className="attribute-value-row">
                                  <Input
                                    type="text"
                                    className={adminInputClass}
                                    placeholder="Label"
                                    value={item.label}
                                    onChange={(event) =>
                                      handleEditValueChange(valueIndex, 'label', event.target.value)
                                    }
                                  />
                                  <Input
                                    type="text"
                                    className={adminInputClass}
                                    placeholder="Value"
                                    value={item.value}
                                    onChange={(event) =>
                                      handleEditValueChange(valueIndex, 'value', event.target.value)
                                    }
                                  />
                                  <Input
                                    type="text"
                                    className={adminInputClass}
                                    placeholder="Color code"
                                    value={item.colorCode}
                                    onChange={(event) =>
                                      handleEditValueChange(valueIndex, 'colorCode', event.target.value)
                                    }
                                  />
                                  <Input
                                    type="text"
                                    className={adminInputClass}
                                    placeholder="Image URL"
                                    value={item.image}
                                    onChange={(event) =>
                                      handleEditValueChange(valueIndex, 'image', event.target.value)
                                    }
                                  />
                                  <Input
                                    type="number"
                                    className={adminInputClass}
                                    placeholder="Sort"
                                    value={item.sortOrder}
                                    onChange={(event) =>
                                      handleEditValueChange(valueIndex, 'sortOrder', event.target.value)
                                    }
                                  />
                                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                    <Checkbox
                                      checked={item.isActive}
                                      onCheckedChange={(checked) =>
                                        handleEditValueChange(valueIndex, 'isActive', checked === true)
                                      }
                                    />
                                    Active
                                  </label>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    className={adminDangerButtonClass}
                                    onClick={() => removeEditValue(valueIndex)}
                                    disabled={editForm.values.length <= 1}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ))}
                            </div>

                            <ModuleActions className="mt-3 justify-end">
                              <Button
                                type="button"
                                size="sm"
                                className={adminPrimaryButtonClass}
                                disabled={savingRow}
                                onClick={handleSaveEdit}
                              >
                                {savingRow ? 'Saving...' : 'Save'}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className={adminSecondaryButtonClass}
                                onClick={cancelEdit}
                              >
                                Cancel
                              </Button>
                            </ModuleActions>
                          </ModuleCard>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
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

export default Attributes
