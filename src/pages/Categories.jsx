import { useEffect, useState } from 'react'
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from '../api/categoryApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import AdminAlert from '@/components/admin-ui/AdminAlert'
import AdminField from '@/components/admin-ui/AdminField'
import AdminPage from '@/components/admin-ui/AdminPage'
import ModuleActions from '@/components/admin-ui/ModuleActions'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import ModuleEmptyState from '@/components/admin-ui/ModuleEmptyState'
import ModuleFormGrid from '@/components/admin-ui/ModuleFormGrid'
import ModuleStatusBadge from '@/components/admin-ui/ModuleStatusBadge'
import ModuleTable from '@/components/admin-ui/ModuleTable'

const defaultForm = {
  name: '',
  description: '',
  isActive: true,
}

const extractList = (response, possibleKeys = []) => {
  for (const key of possibleKeys) {
    if (Array.isArray(response?.data?.data?.[key])) return response.data.data[key]
  }

  for (const key of possibleKeys) {
    if (Array.isArray(response?.data?.[key])) return response.data[key]
  }

  for (const key of possibleKeys) {
    if (Array.isArray(response?.[key])) return response[key]
  }

  if (Array.isArray(response?.data?.data?.items)) return response.data.data.items
  if (Array.isArray(response?.data?.items)) return response.data.items
  if (Array.isArray(response?.items)) return response.items
  if (Array.isArray(response?.data?.data)) return response.data.data
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response)) return response

  return []
}

function Categories() {
  const [categories, setCategories] = useState([])
  const [formData, setFormData] = useState(defaultForm)
  const [editingId, setEditingId] = useState('')
  const [editForm, setEditForm] = useState(defaultForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [inlineSaving, setInlineSaving] = useState(false)
  const [error, setError] = useState('')

  const loadCategories = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await getCategories()
      console.log('Categories list response:', response)
      console.log('Categories response data:', response?.data)
      const list = extractList(response, ['categories'])
      console.log('First category item:', list[0])
      setCategories(list)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load categories.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const resetForm = () => {
    setFormData(defaultForm)
  }

  const resetInlineEdit = () => {
    setEditingId('')
    setEditForm(defaultForm)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        isActive: Boolean(formData.isActive),
      }

      await createCategory(payload)
      resetForm()
    } catch (err) {
      console.error(
        'Create category failed:',
        err?.response?.data || err?.message,
      )
      const backendMessage = err?.response?.data?.message || ''
      const isDuplicate = backendMessage.includes('E11000')
      setError(
        isDuplicate
          ? 'Category already exists. Please use a different name.'
          : backendMessage || 'Failed to save category.',
      )
    } finally {
      await loadCategories()
      setSaving(false)
    }
  }

  const handleEdit = (item) => {
    if (!item?._id) return
    setEditingId(item._id)
    setEditForm({
      name: item?.name || '',
      description: item?.description || item?.desc || '',
      isActive: item?.isActive ?? true,
    })
  }

  const handleInlineChange = (event) => {
    const { name, value, type, checked } = event.target
    setEditForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleActiveChange = (checked) => {
    setFormData((prev) => ({
      ...prev,
      isActive: checked === true,
    }))
  }

  const handleInlineActiveChange = (checked) => {
    setEditForm((prev) => ({
      ...prev,
      isActive: checked === true,
    }))
  }

  const handleInlineSave = async () => {
    if (!editingId) return

    setInlineSaving(true)
    setError('')

    try {
      const payload = {
        name: editForm.name,
        description: editForm.description,
        isActive: Boolean(editForm.isActive),
      }
      await updateCategory(editingId, payload)
      resetInlineEdit()
    } catch (err) {
      console.error(
        'Inline category update failed:',
        err?.response?.data || err?.message,
      )
      setError(err?.response?.data?.message || 'Failed to update category.')
    } finally {
      await loadCategories()
      setInlineSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!id) return
    const ok = window.confirm('Delete this category?')
    if (!ok) return

    setError('')
    try {
      await deleteCategory(id)
      if (editingId === id) resetInlineEdit()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete category.')
    } finally {
      await loadCategories()
    }
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ]

  return (
    <AdminPage
      title="Categories"
      description="Manage product categories used to organize your catalog."
    >

      {error ? (
        <AdminAlert type="error" title="Request failed">
          {error}
        </AdminAlert>
      ) : null}

      <ModuleCard title="Create Category">
        <form onSubmit={handleSubmit}>
          <ModuleFormGrid columns={2}>
            <AdminField label="Name" required>
              <Input
                id="category-name"
                name="name"
                placeholder="Name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </AdminField>
            <AdminField label="Description">
              <Input
                id="category-description"
                name="description"
                placeholder="Description"
                value={formData.description}
                onChange={handleChange}
              />
            </AdminField>
            <AdminField label="Status" className="md:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Checkbox
                  name="isActive"
                  checked={formData.isActive}
                  onCheckedChange={handleActiveChange}
                />
                Active
              </label>
            </AdminField>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? 'Saving...' : 'Create'}
              </Button>
            </div>
          </ModuleFormGrid>
        </form>
      </ModuleCard>

      {loading ? (
        <ModuleCard>
          <p className="text-sm text-slate-600">Loading categories...</p>
        </ModuleCard>
      ) : categories.length === 0 ? (
        <ModuleEmptyState
          title="No categories found"
          description="Create your first category to organize products in your store."
        />
      ) : (
        <ModuleTable
          columns={columns}
          data={categories}
          emptyMessage="No categories found."
          renderRow={(item, index) => {
            const id = item?._id || `category-${index}`
            const isActiveValue =
              typeof item?.isActive === 'boolean'
                ? item.isActive
                : item?.status === 'active'
            const status = isActiveValue ? 'active' : 'inactive'
            const isEditing = editingId === item?._id

            return (
              <tr key={id}>
                <td>
                  {isEditing ? (
                    <Input
                      name="name"
                      value={editForm.name}
                      onChange={handleInlineChange}
                    />
                  ) : (
                    item?.name || '-'
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <Input
                      name="description"
                      value={editForm.description}
                      onChange={handleInlineChange}
                    />
                  ) : (
                    item?.description || item?.desc || '-'
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <Checkbox
                        name="isActive"
                        checked={Boolean(editForm.isActive)}
                        onCheckedChange={handleInlineActiveChange}
                      />
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
                          onClick={handleInlineSave}
                          disabled={inlineSaving}
                        >
                          {inlineSaving ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={resetInlineEdit}
                          disabled={inlineSaving}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(item)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(item?._id)}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </ModuleActions>
                </td>
              </tr>
            )
          }}
        />
      )}
    </AdminPage>
  )
}

export default Categories
