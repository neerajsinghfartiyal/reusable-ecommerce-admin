import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createPage, getPageById, updatePage } from '../api/pageApi'
import AdminAlert from '@/components/admin-ui/AdminAlert'
import AdminField from '@/components/admin-ui/AdminField'
import AdminPage from '@/components/admin-ui/AdminPage'
import AdminSelect from '@/components/admin-ui/AdminSelect'
import { adminLinkButtonClass } from '@/components/admin-ui/adminStyles'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import ModuleActions from '@/components/admin-ui/ModuleActions'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import ModuleFormGrid from '@/components/admin-ui/ModuleFormGrid'

const pageTypes = ['page', 'homepage', 'landing', 'policy', 'blog', 'custom']
const statuses = ['draft', 'published']

const createDefaultSection = (sortOrder = 1) => ({
  sectionKey: '',
  sectionType: 'hero',
  heading: '',
  subheading: '',
  description: '',
  image: '',
  buttonText: '',
  buttonLink: '',
  sortOrder,
  isActive: true,
  contentJson: '{}',
})

const getTextValue = (...values) => {
  for (const value of values) {
    if (typeof value === 'string') return value
  }
  return ''
}

const getNumberValue = (...values) => {
  for (const value of values) {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return 0
}

const parseSectionsForForm = (sections) => {
  if (!Array.isArray(sections) || sections.length === 0) return [createDefaultSection(1)]

  return sections.map((section, index) => ({
    sectionKey: getTextValue(section?.sectionKey),
    sectionType: getTextValue(section?.sectionType, 'hero'),
    heading: getTextValue(section?.heading),
    subheading: getTextValue(section?.subheading),
    description: getTextValue(section?.description),
    image: getTextValue(section?.image),
    buttonText: getTextValue(section?.buttonText),
    buttonLink: getTextValue(section?.buttonLink),
    sortOrder: getNumberValue(section?.sortOrder, index + 1),
    isActive: section?.isActive !== false,
    contentJson: JSON.stringify(section?.content || {}, null, 2),
  }))
}

const extractPage = (response) =>
  response?.data?.data?.page ||
  response?.data?.data?.item ||
  response?.data?.data ||
  response?.data?.page ||
  response?.data?.item ||
  response?.data ||
  {}

function PageForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditMode = Boolean(id)

  const [loading, setLoading] = useState(isEditMode)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [sectionError, setSectionError] = useState('')
  const [form, setForm] = useState({
    title: '',
    slug: '',
    pageType: 'page',
    status: 'draft',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    featuredImage: '',
  })
  const [sections, setSections] = useState([createDefaultSection(1)])

  useEffect(() => {
    const loadPage = async () => {
      if (!isEditMode || !id) return
      setLoading(true)
      setError('')
      try {
        const response = await getPageById(id)
        const page = extractPage(response)
        setForm({
          title: getTextValue(page?.title),
          slug: getTextValue(page?.slug),
          pageType: getTextValue(page?.pageType, 'page'),
          status: getTextValue(page?.status, 'draft'),
          seoTitle: getTextValue(page?.seoTitle),
          seoDescription: getTextValue(page?.seoDescription),
          seoKeywords: Array.isArray(page?.seoKeywords)
            ? page.seoKeywords.join(', ')
            : getTextValue(page?.seoKeywords),
          featuredImage: getTextValue(page?.featuredImage),
        })
        setSections(parseSectionsForForm(page?.sections))
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load page details.')
      } finally {
        setLoading(false)
      }
    }

    loadPage()
  }, [id, isEditMode])

  const pageTitle = useMemo(() => (isEditMode ? 'Edit CMS Page' : 'Create CMS Page'), [isEditMode])
  const pageDescription = useMemo(
    () =>
      isEditMode
        ? 'Update page content, SEO fields, and reusable sections.'
        : 'Add a new static, landing, policy, blog, or custom page.',
    [isEditMode],
  )

  const backAction = (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={adminLinkButtonClass}
      onClick={() => navigate('/pages')}
    >
      Back to Pages
    </Button>
  )

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSectionChange = (index, field, value) => {
    setSections((prev) =>
      prev.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, [field]: value } : section,
      ),
    )
  }

  const addSection = () => {
    setSections((prev) => [...prev, createDefaultSection(prev.length + 1)])
  }

  const removeSection = (index) => {
    setSections((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, sectionIndex) => sectionIndex !== index)
    })
  }

  const buildPayloadSections = () => {
    const nextSections = []

    for (const section of sections) {
      let parsedContent = {}
      try {
        const rawValue = String(section.contentJson || '').trim()
        parsedContent = rawValue ? JSON.parse(rawValue) : {}
      } catch (jsonError) {
        throw new Error(`Invalid content JSON in section "${section.sectionKey || 'new'}".`)
      }

      nextSections.push({
        sectionKey: section.sectionKey.trim(),
        sectionType: section.sectionType.trim(),
        heading: section.heading.trim(),
        subheading: section.subheading.trim(),
        description: section.description.trim(),
        image: section.image.trim(),
        buttonText: section.buttonText.trim(),
        buttonLink: section.buttonLink.trim(),
        sortOrder: getNumberValue(section.sortOrder, 0),
        isActive: Boolean(section.isActive),
        content: parsedContent,
      })
    }

    return nextSections
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSectionError('')

    if (!form.title.trim()) {
      setError('Title is required.')
      return
    }
    if (!form.slug.trim()) {
      setError('Slug is required.')
      return
    }

    let payloadSections = []
    try {
      payloadSections = buildPayloadSections()
    } catch (err) {
      setSectionError(err.message || 'Please fix section content JSON.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        pageType: form.pageType,
        status: form.status,
        seoTitle: form.seoTitle.trim(),
        seoDescription: form.seoDescription.trim(),
        seoKeywords: form.seoKeywords
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        featuredImage: form.featuredImage.trim(),
        sections: payloadSections,
      }

      if (isEditMode && id) {
        await updatePage(id, payload)
      } else {
        await createPage(payload)
      }
      navigate('/pages')
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save page.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminPage headerMode="compact" title={pageTitle} description={pageDescription} actions={backAction}>
        <ModuleCard>
          <AdminAlert type="info" title="Loading">
            Loading page...
          </AdminAlert>
        </ModuleCard>
      </AdminPage>
    )
  }

  return (
    <AdminPage headerMode="compact" title={pageTitle} description={pageDescription} actions={backAction}>
      {error ? (
        <AdminAlert type="error" title="Request failed">
          {error}
        </AdminAlert>
      ) : null}

      {sectionError ? (
        <AdminAlert type="error" title="Section validation">
          {sectionError}
        </AdminAlert>
      ) : null}

      <form onSubmit={handleSubmit}>
        <ModuleCard title="Page Details">
          <ModuleFormGrid columns={2}>
            <AdminField label="Title" required>
              <Input
                type="text"
                value={form.title}
                onChange={(event) => handleFormChange('title', event.target.value)}
              />
            </AdminField>

            <AdminField label="Slug" required>
              <Input
                type="text"
                value={form.slug}
                onChange={(event) => handleFormChange('slug', event.target.value)}
              />
            </AdminField>

            <AdminField label="Page Type">
              <AdminSelect
                value={form.pageType}
                onChange={(event) => handleFormChange('pageType', event.target.value)}
              >
                {pageTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>

            <AdminField label="Status">
              <AdminSelect
                value={form.status}
                onChange={(event) => handleFormChange('status', event.target.value)}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>

            <AdminField label="SEO Title" className="md:col-span-2">
              <Input
                type="text"
                value={form.seoTitle}
                onChange={(event) => handleFormChange('seoTitle', event.target.value)}
              />
            </AdminField>

            <AdminField label="SEO Description" className="md:col-span-2">
              <Textarea
                rows={3}
                value={form.seoDescription}
                onChange={(event) => handleFormChange('seoDescription', event.target.value)}
              />
            </AdminField>

            <AdminField
              label="SEO Keywords"
              description="Comma separated"
              className="md:col-span-2"
            >
              <Input
                type="text"
                value={form.seoKeywords}
                onChange={(event) => handleFormChange('seoKeywords', event.target.value)}
              />
            </AdminField>

            <AdminField label="Featured Image" className="md:col-span-2">
              <Input
                type="text"
                value={form.featuredImage}
                onChange={(event) => handleFormChange('featuredImage', event.target.value)}
                placeholder="https://..."
              />
            </AdminField>
          </ModuleFormGrid>
        </ModuleCard>

        <div className="my-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Sections</h2>
          <Button type="button" size="sm" variant="secondary" onClick={addSection}>
            Add Section
          </Button>
        </div>

        {sections.map((section, index) => (
          <ModuleCard key={`section-${index}`} title={`Section ${index + 1}`}>
            <ModuleFormGrid columns={2}>
              <AdminField label="Section Key">
                <Input
                  type="text"
                  value={section.sectionKey}
                  onChange={(event) =>
                    handleSectionChange(index, 'sectionKey', event.target.value)
                  }
                />
              </AdminField>

              <AdminField label="Section Type">
                <Input
                  type="text"
                  value={section.sectionType}
                  onChange={(event) =>
                    handleSectionChange(index, 'sectionType', event.target.value)
                  }
                />
              </AdminField>

              <AdminField label="Heading">
                <Input
                  type="text"
                  value={section.heading}
                  onChange={(event) => handleSectionChange(index, 'heading', event.target.value)}
                />
              </AdminField>

              <AdminField label="Subheading">
                <Input
                  type="text"
                  value={section.subheading}
                  onChange={(event) =>
                    handleSectionChange(index, 'subheading', event.target.value)
                  }
                />
              </AdminField>

              <AdminField label="Description" className="md:col-span-2">
                <Textarea
                  rows={3}
                  value={section.description}
                  onChange={(event) =>
                    handleSectionChange(index, 'description', event.target.value)
                  }
                />
              </AdminField>

              <AdminField label="Image">
                <Input
                  type="text"
                  value={section.image}
                  onChange={(event) => handleSectionChange(index, 'image', event.target.value)}
                />
              </AdminField>

              <AdminField label="Button Text">
                <Input
                  type="text"
                  value={section.buttonText}
                  onChange={(event) =>
                    handleSectionChange(index, 'buttonText', event.target.value)
                  }
                />
              </AdminField>

              <AdminField label="Button Link">
                <Input
                  type="text"
                  value={section.buttonLink}
                  onChange={(event) =>
                    handleSectionChange(index, 'buttonLink', event.target.value)
                  }
                />
              </AdminField>

              <AdminField label="Sort Order">
                <Input
                  type="number"
                  min="0"
                  value={section.sortOrder}
                  onChange={(event) =>
                    handleSectionChange(index, 'sortOrder', event.target.value)
                  }
                />
              </AdminField>

              <AdminField label="Active" className="md:col-span-2">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Checkbox
                    checked={Boolean(section.isActive)}
                    onCheckedChange={(checked) =>
                      handleSectionChange(index, 'isActive', checked === true)
                    }
                  />
                  Active
                </label>
              </AdminField>

              <AdminField label="Content JSON" className="md:col-span-2">
                <Textarea
                  className="cms-json-textarea"
                  rows={6}
                  value={section.contentJson}
                  onChange={(event) =>
                    handleSectionChange(index, 'contentJson', event.target.value)
                  }
                />
              </AdminField>
            </ModuleFormGrid>

            <ModuleActions className="mt-4 justify-end">
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={sections.length <= 1}
                onClick={() => removeSection(index)}
              >
                Remove Section
              </Button>
            </ModuleActions>
          </ModuleCard>
        ))}

        <ModuleActions className="justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={adminLinkButtonClass}
            onClick={() => navigate('/pages')}
          >
            Back to Pages
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? 'Saving...' : isEditMode ? 'Update Page' : 'Create Page'}
          </Button>
        </ModuleActions>
      </form>
    </AdminPage>
  )
}

export default PageForm
