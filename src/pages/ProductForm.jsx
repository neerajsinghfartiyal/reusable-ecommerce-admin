import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  createProduct,
  getProductById,
  updateProduct,
} from '../api/productApi'
import { getCategories } from '../api/categoryApi'
import { getBrands } from '../api/brandApi'
import { getUnitTypes } from '../api/unitTypeApi'
import { getAttributes } from '../api/attributeApi'
import {
  appendUniqueGalleryMedia,
  assetFromPickerSelection,
  canonicalGalleryMedia,
  featuredMediaFromProduct,
  GalleryImageGrid,
  galleryMediaFromProduct,
  galleryMediaToMediaIds,
  galleryMediaToUrls,
  getReliableMediaIdFromAsset,
  isSameGalleryAsset,
  MediaPickerModal,
  pickerAssetToGalleryMedia,
  SelectedImagePreview,
  toStoredImageUrl,
} from '@/components/media-picker'
import AdminAlert from '@/components/admin-ui/AdminAlert'
import AdminField from '@/components/admin-ui/AdminField'
import AdminPage from '@/components/admin-ui/AdminPage'
import AdminSelect from '@/components/admin-ui/AdminSelect'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import ModuleActions from '@/components/admin-ui/ModuleActions'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import ModuleFormGrid from '@/components/admin-ui/ModuleFormGrid'
import { adminLinkButtonClass } from '@/components/admin-ui/adminStyles'

const defaultFormData = {
  name: '',
  sku: '',
  price: '',
  salePrice: '',
  quantity: '',
  category: '',
  brand: '',
  unitType: '',
  status: 'draft',
  shortDescription: '',
  description: '',
  featuredImage: '',
  featuredMediaId: null,
  galleryImages: [],
  galleryMediaIds: [],
  attributes: [],
  variations: [],
}

const getOptionLabel = (item, fallback) =>
  item?.name || item?.title || item?.label || item?.slug || fallback

const getOptionValue = (item) => item?._id || item?.id || item?.value || ''

const extractArrayFromResponse = (response, keys = []) => {
  for (const key of keys) {
    const nestedValue = response?.data?.[key]
    if (Array.isArray(nestedValue)) return nestedValue
  }

  for (const key of keys) {
    const rootValue = response?.[key]
    if (Array.isArray(rootValue)) return rootValue
  }

  if (Array.isArray(response?.data?.items)) return response.data.items
  if (Array.isArray(response?.items)) return response.items
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response)) return response

  return []
}

const extractAttributesFromResponse = (response) => {
  return (
    response?.data?.data?.attributes ||
    response?.data?.attributes ||
    response?.data?.data?.items ||
    response?.data?.items ||
    response?.attributes ||
    response?.items ||
    []
  )
}

const normalizeAttributeValue = (value) => ({
  label: value?.label || '',
  value: value?.value || '',
  colorCode: value?.colorCode || '',
  image: value?.image || '',
})

const slugPart = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const GALLERY_MAX_IMAGES = 20

const buildVariationSku = (baseSku, attributes = []) => {
  const parts = attributes
    .map((item) => slugPart(item?.value || item?.label))
    .filter(Boolean)
  if (!baseSku) return parts.join('-')
  if (parts.length === 0) return baseSku
  return `${baseSku}-${parts.join('-')}`
}

function ProductForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditMode = Boolean(id)

  const [formData, setFormData] = useState(defaultFormData)
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [unitTypes, setUnitTypes] = useState([])
  const [attributes, setAttributes] = useState([])
  const [selectedAttributeId, setSelectedAttributeId] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [featuredMedia, setFeaturedMedia] = useState(null)
  const [featuredPickerOpen, setFeaturedPickerOpen] = useState(false)
  const [featuredPickerTab, setFeaturedPickerTab] = useState('library')
  const [featuredPickerSnapshot, setFeaturedPickerSnapshot] = useState([])
  const [galleryMedia, setGalleryMedia] = useState([])
  const galleryMediaRef = useRef([])
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false)
  const [galleryPickerTab, setGalleryPickerTab] = useState('library')
  const [galleryPickerSnapshot, setGalleryPickerSnapshot] = useState([])
  const [error, setError] = useState('')

  const pageTitle = useMemo(
    () => (isEditMode ? 'Edit Product' : 'Add Product'),
    [isEditMode],
  )
  const pageDescription = useMemo(
    () =>
      isEditMode
        ? 'Update product details, media, attributes, and variations.'
        : 'Create a product with pricing, inventory, images, attributes, and variations.',
    [isEditMode],
  )

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true)
      setError('')

      try {
        const [categoriesRes, brandsRes, unitTypesRes, attributesRes, productRes] =
          await Promise.all([
            getCategories(),
            getBrands(),
            getUnitTypes(),
            getAttributes(),
            isEditMode ? getProductById(id) : Promise.resolve(null),
          ])

        const categoriesResponse = categoriesRes?.data || categoriesRes
        const brandsResponse = brandsRes?.data || brandsRes
        const unitTypesResponse = unitTypesRes?.data || unitTypesRes
        const attributesResponse = attributesRes?.data || attributesRes

        const categoriesData = extractArrayFromResponse(categoriesResponse, [
          'categories',
        ])
        const brandsData = extractArrayFromResponse(brandsResponse, ['brands'])
        const unitTypesData = extractArrayFromResponse(unitTypesResponse, [
          'unitTypes',
          'units',
        ])
        const attributesData = extractAttributesFromResponse(attributesRes)

        setCategories(Array.isArray(categoriesData) ? categoriesData : [])
        setBrands(Array.isArray(brandsData) ? brandsData : [])
        setUnitTypes(Array.isArray(unitTypesData) ? unitTypesData : [])
        setAttributes(
          Array.isArray(attributesData)
            ? attributesData.filter((item) => item?.isActive !== false)
            : [],
        )

        if (productRes) {
          const product =
            productRes?.data?.data?.product || productRes?.data?.data || productRes?.data
          const loadedGallery = galleryMediaFromProduct(
            Array.isArray(product?.galleryImages) ? product.galleryImages : [],
            product?.galleryMediaIds,
          )

          setFormData({
            name: product?.name || '',
            sku: product?.sku || '',
            price: product?.price ?? '',
            salePrice: product?.salePrice ?? '',
            quantity: product?.quantity ?? product?.stock ?? '',
            category: product?.category?._id || product?.category?.id || product?.category || '',
            brand: product?.brand?._id || product?.brand?.id || product?.brand || '',
            unitType:
              product?.unitType?._id ||
              product?.unitType?.id ||
              product?.unitType ||
              '',
            status: product?.status || 'draft',
            shortDescription: product?.shortDescription || '',
            description: product?.description || '',
            featuredImage:
              product?.featuredImage || product?.image || product?.thumbnail || '',
            featuredMediaId:
              product?.featuredMediaId?._id ||
              product?.featuredMediaId ||
              null,
            attributes: Array.isArray(product?.attributes)
              ? product.attributes
                  .filter((item) => item && typeof item === 'object')
                  .map((item) => ({
                    attribute:
                      item?.attribute?._id || item?.attribute?.id || item?.attribute || '',
                    name: item?.name || item?.attribute?.name || '',
                    code: item?.code || item?.attribute?.code || '',
                    values: Array.isArray(item?.values)
                      ? item.values.map(normalizeAttributeValue)
                      : [],
                    isVariationAttribute: item?.isVariationAttribute !== false,
                    isVisible: item?.isVisible !== false,
                  }))
              : [],
            variations: Array.isArray(product?.variations)
              ? product.variations
                  .filter((item) => item && typeof item === 'object')
                  .map((item) => ({
                    sku: item?.sku || '',
                    price: item?.price ?? product?.price ?? '',
                    salePrice: item?.salePrice ?? product?.salePrice ?? '',
                    quantity: item?.quantity ?? 0,
                    image: item?.image || '',
                    status: item?.status || 'active',
                    attributes: Array.isArray(item?.attributes)
                      ? item.attributes.map((entry) => ({
                          attribute:
                            entry?.attribute?._id ||
                            entry?.attribute?.id ||
                            entry?.attribute ||
                            '',
                          name: entry?.name || entry?.attribute?.name || '',
                          code: entry?.code || entry?.attribute?.code || '',
                          value: entry?.value || '',
                          label: entry?.label || '',
                          colorCode: entry?.colorCode || '',
                          image: entry?.image || '',
                        }))
                      : [],
                  }))
              : [],
            galleryImages: galleryMediaToUrls(loadedGallery),
            galleryMediaIds: galleryMediaToMediaIds(loadedGallery),
          })
          setFeaturedMedia(featuredMediaFromProduct(product))
          galleryMediaRef.current = loadedGallery
          setGalleryMedia(loadedGallery)
        } else {
          setFeaturedMedia(null)
          galleryMediaRef.current = []
          setGalleryMedia([])
          setFeaturedPickerSnapshot([])
          setGalleryPickerSnapshot([])
          setFormData((prev) => ({
            ...prev,
            featuredImage: '',
            featuredMediaId: null,
            galleryImages: [],
            galleryMediaIds: [],
          }))
        }
      } catch (err) {
        const message =
          err?.response?.data?.message || 'Failed to load product form data.'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    fetchInitialData()
  }, [id, isEditMode])

  const handleFieldChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const availableAttributeOptions = attributes.filter((attributeItem) => {
    const attrId = attributeItem?._id || attributeItem?.id
    if (!attrId) return false
    return !formData.attributes.some((item) => item.attribute === attrId)
  })

  const handleAddAttribute = () => {
    if (!selectedAttributeId) return
    const selectedAttribute = attributes.find(
      (item) => (item?._id || item?.id) === selectedAttributeId,
    )
    if (!selectedAttribute) return

    setFormData((prev) => ({
      ...prev,
      attributes: [
        ...prev.attributes,
        {
          attribute: selectedAttribute?._id || selectedAttribute?.id || '',
          name: selectedAttribute?.name || '',
          code: selectedAttribute?.code || '',
          values: [],
          isVariationAttribute: selectedAttribute?.isVariationAttribute !== false,
          isVisible: true,
        },
      ],
    }))
    setSelectedAttributeId('')
  }

  const handleRemoveAttribute = (attributeId) => {
    setFormData((prev) => ({
      ...prev,
      attributes: prev.attributes.filter((item) => item.attribute !== attributeId),
    }))
  }

  const handleAssignedAttributeChange = (attributeId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      attributes: prev.attributes.map((item) =>
        item.attribute === attributeId ? { ...item, [field]: value } : item,
      ),
    }))
  }

  const handleToggleAttributeValue = (attributeId, valueOption) => {
    setFormData((prev) => ({
      ...prev,
      attributes: prev.attributes.map((item) => {
        if (item.attribute !== attributeId) return item

        const key = valueOption?.value || valueOption?.label
        const alreadySelected = item.values.some(
          (selected) => (selected?.value || selected?.label) === key,
        )

        if (alreadySelected) {
          return {
            ...item,
            values: item.values.filter(
              (selected) => (selected?.value || selected?.label) !== key,
            ),
          }
        }

        return {
          ...item,
          values: [...item.values, normalizeAttributeValue(valueOption)],
        }
      }),
    }))
  }

  const variationAttributes = formData.attributes.filter(
    (item) =>
      item?.isVariationAttribute !== false &&
      Array.isArray(item?.values) &&
      item.values.length > 0,
  )

  const variationAttributesMissingValues = formData.attributes.some(
    (item) => item?.isVariationAttribute !== false && (!Array.isArray(item?.values) || item.values.length === 0),
  )

  const generateCombinations = (groups) => {
    if (!Array.isArray(groups) || groups.length === 0) return []
    let result = [[]]
    groups.forEach((group) => {
      const next = []
      result.forEach((base) => {
        group.values.forEach((valueItem) => {
          next.push([
            ...base,
            {
              attribute: group.attribute,
              name: group.name,
              code: group.code,
              value: valueItem?.value || '',
              label: valueItem?.label || '',
              colorCode: valueItem?.colorCode || '',
              image: valueItem?.image || '',
            },
          ])
        })
      })
      result = next
    })
    return result
  }

  const handleGenerateVariations = () => {
    if (variationAttributes.length === 0) return
    if (formData.variations.length > 0) {
      const confirmed = window.confirm(
        'Regenerate variations? This will replace current variation rows.',
      )
      if (!confirmed) return
    }

    const combinations = generateCombinations(variationAttributes)
    const generated = combinations.map((combo) => ({
      sku: buildVariationSku(formData.sku, combo),
      price: formData.price || '',
      salePrice: formData.salePrice || '',
      quantity: 0,
      image: '',
      status: 'active',
      attributes: combo,
    }))

    setFormData((prev) => ({
      ...prev,
      variations: generated,
    }))
  }

  const handleVariationFieldChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      variations: prev.variations.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }))
  }

  const handleRemoveVariation = (index) => {
    setFormData((prev) => ({
      ...prev,
      variations: prev.variations.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const openFeaturedPicker = (tab) => {
    setFeaturedPickerSnapshot(featuredMedia ? [featuredMedia] : [])
    setFeaturedPickerTab(tab)
    setFeaturedPickerOpen(true)
  }

  const handleFeaturedPickerConfirm = (assets) => {
    const selected = Array.isArray(assets) ? assets[0] : assets
    const asset = assetFromPickerSelection(selected)
    if (!asset?.url) return

    setFeaturedMedia(asset)
    setFormData((prev) => ({
      ...prev,
      featuredImage: asset.url,
      featuredMediaId: asset.mediaId || null,
    }))
  }

  const handleRemoveFeaturedMedia = () => {
    setFeaturedMedia(null)
    setFormData((prev) => ({
      ...prev,
      featuredImage: '',
      featuredMediaId: null,
    }))
  }

  const applyGalleryMedia = (nextMedia) => {
    const canonical = canonicalGalleryMedia(nextMedia, GALLERY_MAX_IMAGES)
    galleryMediaRef.current = canonical
    setGalleryMedia(canonical)
    setFormData((prev) => ({
      ...prev,
      galleryImages: galleryMediaToUrls(canonical),
      galleryMediaIds: galleryMediaToMediaIds(canonical),
    }))
  }

  const openGalleryPicker = (tab) => {
    setGalleryPickerSnapshot([...galleryMedia])
    setGalleryPickerTab(tab)
    setGalleryPickerOpen(true)
  }

  const handleGalleryPickerConfirm = (assets) => {
    const selected = Array.isArray(assets) ? assets : assets ? [assets] : []
    const incoming = selected.map(pickerAssetToGalleryMedia).filter(Boolean)
    const next = appendUniqueGalleryMedia(
      galleryMediaRef.current,
      incoming,
      GALLERY_MAX_IMAGES,
    )
    applyGalleryMedia(next)
  }

  const handleRemoveGalleryMedia = (asset) => {
    const next = galleryMediaRef.current.filter(
      (item) => !isSameGalleryAsset(item, asset),
    )
    applyGalleryMedia(next)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const canonicalGallery = canonicalGalleryMedia(galleryMedia, GALLERY_MAX_IMAGES)
      const payload = {
        name: formData.name,
        sku: formData.sku,
        price: Number(formData.price || 0),
        salePrice: formData.salePrice ? Number(formData.salePrice) : undefined,
        quantity: Number(formData.quantity || 0),
        category: formData.category || undefined,
        brand: formData.brand || undefined,
        unitType: formData.unitType || undefined,
        status: formData.status || 'draft',
        shortDescription: formData.shortDescription || '',
        description: formData.description || '',
        featuredImage: formData.featuredImage || '',
        featuredMediaId: getReliableMediaIdFromAsset(featuredMedia) || null,
        galleryImages: galleryMediaToUrls(canonicalGallery),
        galleryMediaIds: galleryMediaToMediaIds(canonicalGallery),
        attributes: Array.isArray(formData.attributes)
          ? formData.attributes.map((item) => ({
              attribute: item.attribute,
              name: item.name || '',
              code: item.code || '',
              values: Array.isArray(item.values)
                ? item.values.map(normalizeAttributeValue)
                : [],
              isVariationAttribute: item.isVariationAttribute !== false,
              isVisible: item.isVisible !== false,
            }))
          : [],
        variations: Array.isArray(formData.variations)
          ? formData.variations.map((variation) => ({
              sku: variation?.sku || '',
              price: Number(variation?.price || 0),
              salePrice:
                variation?.salePrice !== '' &&
                variation?.salePrice !== undefined &&
                variation?.salePrice !== null
                  ? Number(variation.salePrice)
                  : null,
              quantity: Number(variation?.quantity || 0),
              image: variation?.image || '',
              status: variation?.status || 'active',
              attributes: Array.isArray(variation?.attributes)
                ? variation.attributes.map((entry) => ({
                    attribute: entry?.attribute || '',
                    name: entry?.name || '',
                    code: entry?.code || '',
                    value: entry?.value || '',
                    label: entry?.label || '',
                    colorCode: entry?.colorCode || '',
                    image: entry?.image || '',
                  }))
                : [],
            }))
          : [],
      }

      if (isEditMode) {
        await updateProduct(id, payload)
      } else {
        await createProduct(payload)
      }

      navigate('/products')
    } catch (err) {
      const message =
        err?.response?.data?.message || 'Failed to save product. Please try again.'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminPage headerMode="compact" title={pageTitle} description={pageDescription}>
        <ModuleCard>
          <AdminAlert type="info" title="Loading">
            Loading form...
          </AdminAlert>
        </ModuleCard>
      </AdminPage>
    )
  }

  return (
    <AdminPage
      headerMode="compact"
      title={pageTitle}
      description={pageDescription}
      actions={
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={adminLinkButtonClass}
          onClick={() => navigate('/products')}
          disabled={saving}
        >
          Back to Products
        </Button>
      }
    >

      {error ? (
        <AdminAlert type="error" title="Request failed">
          {error}
        </AdminAlert>
      ) : null}

      <form onSubmit={handleSubmit} className="product-form">
        <div className="product-form-layout">
          <div className="product-form-main">
          <ModuleCard title="Basic Information" description="Product identity and catalog naming." className="product-form-section">
            <ModuleFormGrid columns={2}>
              <AdminField label="Name" required>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleFieldChange}
                  required
                />
              </AdminField>

              <AdminField label="SKU">
                <Input
                  id="sku"
                  name="sku"
                  value={formData.sku}
                  onChange={handleFieldChange}
                />
              </AdminField>
            </ModuleFormGrid>
          </ModuleCard>

          <ModuleCard title="Descriptions" description="Short and long-form product copy." className="product-form-section">
            <ModuleFormGrid columns={1}>
              <AdminField label="Short Description">
                <Textarea
                  id="shortDescription"
                  name="shortDescription"
                  value={formData.shortDescription}
                  onChange={handleFieldChange}
                  rows={3}
                />
              </AdminField>
              <AdminField label="Description">
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleFieldChange}
                  rows={6}
                />
              </AdminField>
            </ModuleFormGrid>
          </ModuleCard>

          <ModuleCard title="Product Attributes" description="Assign attributes and variation options." className="product-form-section">
            {attributes.length === 0 ? (
              <p className="helper-text dark:text-slate-400">
                No attributes found. Create attributes first from Catalog &gt; Attributes.
              </p>
            ) : (
              <>
                <div className="product-attribute-picker flex flex-col gap-2 md:flex-row">
                  <AdminSelect
                    value={selectedAttributeId}
                    onChange={(event) => setSelectedAttributeId(event.target.value)}
                    aria-label="Select product attribute"
                  >
                    <option value="">Select Attribute</option>
                    {availableAttributeOptions.map((item) => {
                      const attrId = item?._id || item?.id
                      if (!attrId) return null
                      return (
                        <option key={attrId} value={attrId}>
                          {item?.name || 'Unnamed attribute'}
                        </option>
                      )
                    })}
                  </AdminSelect>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddAttribute}
                    disabled={!selectedAttributeId}
                  >
                    Add Attribute
                  </Button>
                </div>

                {formData.attributes.length === 0 ? (
                  <p className="helper-text dark:text-slate-400">No attributes selected for this product.</p>
                ) : (
                  <div className="selected-attributes-grid">
                    {formData.attributes.map((assigned) => {
                      const sourceAttribute = attributes.find(
                        (item) => (item?._id || item?.id) === assigned.attribute,
                      )
                      const sourceValues = Array.isArray(sourceAttribute?.values)
                        ? sourceAttribute.values
                        : []

                      return (
                        <div key={assigned.attribute} className="selected-attribute-card dark:border-slate-700 dark:bg-slate-900">
                          <div className="selected-attribute-head">
                            <div>
                              <p className="item-title dark:text-slate-100">{assigned.name || 'Attribute'}</p>
                              <p className="item-subtitle dark:text-slate-400">
                                Type: {sourceAttribute?.type || 'dropdown'}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleRemoveAttribute(assigned.attribute)}
                            >
                              Remove Attribute
                            </Button>
                          </div>

                          <div className="selected-attribute-toggles">
                            <AdminField label="Visible">
                              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                <Checkbox
                                  checked={assigned.isVisible !== false}
                                  onCheckedChange={(checked) =>
                                    handleAssignedAttributeChange(
                                      assigned.attribute,
                                      'isVisible',
                                      checked === true,
                                    )
                                  }
                                />
                                Visible on product page
                              </label>
                            </AdminField>

                            <AdminField label="Variation Attribute">
                              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                <Checkbox
                                  checked={assigned.isVariationAttribute !== false}
                                  onCheckedChange={(checked) =>
                                    handleAssignedAttributeChange(
                                      assigned.attribute,
                                      'isVariationAttribute',
                                      checked === true,
                                    )
                                  }
                                />
                                Used for variations
                              </label>
                            </AdminField>
                          </div>

                          {sourceValues.length === 0 ? (
                            <p className="helper-text dark:text-slate-400">No values available.</p>
                          ) : (
                            <div className="attribute-values-chips">
                              {sourceValues.map((valueItem, index) => {
                                const key = valueItem?.value || valueItem?.label || `value-${index}`
                                const checked = assigned.values.some(
                                  (selected) =>
                                    (selected?.value || selected?.label) ===
                                    (valueItem?.value || valueItem?.label),
                                )
                                const colorCode = valueItem?.colorCode || ''

                                return (
                                  <label
                                    key={key}
                                    className={`attribute-value-chip-option dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 ${
                                      checked ? 'is-selected' : ''
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() =>
                                        handleToggleAttributeValue(assigned.attribute, valueItem)
                                      }
                                    />
                                    {colorCode ? (
                                      <span
                                        className="attribute-color-dot"
                                        style={{ backgroundColor: colorCode }}
                                      />
                                    ) : null}
                                    <span>{valueItem?.label || valueItem?.value || 'Value'}</span>
                                  </label>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </ModuleCard>

          <ModuleCard title="Product Variations" description="Generate and configure SKU-level variations." className="product-form-section">
            <div className="product-variations-panel min-w-0">
            {formData.attributes.length === 0 ? (
              <p className="helper-text dark:text-slate-400">
                Select attributes and mark them as Used for variations to generate variations.
              </p>
            ) : variationAttributesMissingValues ? (
              <p className="helper-text dark:text-slate-400">
                Selected variation attributes need values before variations can be generated.
              </p>
            ) : variationAttributes.length === 0 ? (
              <p className="helper-text dark:text-slate-400">
                Select attributes and mark them as Used for variations to generate variations.
              </p>
            ) : (
              <>
                <div className="variations-toolbar flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleGenerateVariations}
                  >
                    Generate Variations
                  </Button>
                  <p className="helper-text variation-count-text dark:text-slate-400">
                    {formData.variations.length} variations configured
                  </p>
                </div>

                {formData.variations.length === 0 ? (
                  <p className="helper-text dark:text-slate-400">No variations generated yet.</p>
                ) : (
                  <div className="variations-grid">
                    {formData.variations.map((variation, index) => {
                      const combinationText = Array.isArray(variation?.attributes)
                        ? variation.attributes
                            .map((item) => item?.label || item?.value || item?.name)
                            .filter(Boolean)
                            .join(' / ')
                        : ''

                      return (
                        <div key={`variation-${index}`} className="variation-card">
                          <p className="variation-combination">
                            {combinationText || `Variation ${index + 1}`}
                          </p>
                          <div className="variation-fields">
                            <Input
                              type="text"
                              placeholder="SKU"
                              value={variation?.sku || ''}
                              onChange={(event) =>
                                handleVariationFieldChange(index, 'sku', event.target.value)
                              }
                            />
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Price"
                              value={variation?.price ?? ''}
                              onChange={(event) =>
                                handleVariationFieldChange(index, 'price', event.target.value)
                              }
                            />
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Sale Price"
                              value={variation?.salePrice ?? ''}
                              onChange={(event) =>
                                handleVariationFieldChange(index, 'salePrice', event.target.value)
                              }
                            />
                            <Input
                              type="number"
                              min="0"
                              placeholder="Quantity"
                              value={variation?.quantity ?? 0}
                              onChange={(event) =>
                                handleVariationFieldChange(index, 'quantity', event.target.value)
                              }
                            />
                            <Input
                              type="text"
                              placeholder="Image URL"
                              value={variation?.image || ''}
                              onChange={(event) =>
                                handleVariationFieldChange(index, 'image', event.target.value)
                              }
                            />
                            <AdminSelect
                              value={variation?.status || 'active'}
                              onChange={(event) =>
                                handleVariationFieldChange(index, 'status', event.target.value)
                              }
                              aria-label="Variation status"
                            >
                              <option value="active">active</option>
                              <option value="inactive">inactive</option>
                              <option value="draft">draft</option>
                            </AdminSelect>
                          </div>
                          <div className="variation-actions">
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleRemoveVariation(index)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
            </div>
          </ModuleCard>
          </div>

          <aside className="product-form-sidebar">
            <ModuleCard title="Publishing" description="Control catalog visibility." className="product-form-section">
              <AdminField label="Status">
                <AdminSelect
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleFieldChange}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="inactive">Inactive</option>
                </AdminSelect>
              </AdminField>
            </ModuleCard>

            <ModuleCard title="Organization" description="Category, brand, and unit." className="product-form-section">
              <ModuleFormGrid columns={1}>
                <AdminField
                  label="Category"
                  description={
                    categories.length === 0
                      ? 'No categories found. Please create a category first.'
                      : ''
                  }
                >
                  <AdminSelect
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleFieldChange}
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => {
                      if (!category?._id) return null
                      return (
                        <option key={category._id} value={category._id}>
                          {category?.name || 'Unnamed category'}
                        </option>
                      )
                    })}
                  </AdminSelect>
                </AdminField>

                <AdminField
                  label="Brand"
                  description={
                    brands.length === 0 ? 'No brands found. Please create a brand first.' : ''
                  }
                >
                  <AdminSelect
                    id="brand"
                    name="brand"
                    value={formData.brand}
                    onChange={handleFieldChange}
                  >
                    <option value="">Select brand</option>
                    {brands.map((brand) => {
                      if (!brand?._id) return null
                      return (
                        <option key={brand._id} value={brand._id}>
                          {brand?.name || 'Unnamed brand'}
                        </option>
                      )
                    })}
                  </AdminSelect>
                </AdminField>

                <AdminField
                  label="Unit Type"
                  description={
                    unitTypes.length === 0
                      ? 'No unit types found. Please create a unit type first.'
                      : ''
                  }
                >
                  <AdminSelect
                    id="unitType"
                    name="unitType"
                    value={formData.unitType}
                    onChange={handleFieldChange}
                  >
                    <option value="">Select unit type</option>
                    {unitTypes.map((unitType) => {
                      if (!unitType?._id) return null
                      return (
                        <option key={unitType._id} value={unitType._id}>
                          {unitType?.name || 'Unnamed unit type'}
                        </option>
                      )
                    })}
                  </AdminSelect>
                </AdminField>
              </ModuleFormGrid>
            </ModuleCard>

            <ModuleCard title="Pricing & Inventory" description="Base price and stock." className="product-form-section">
              <ModuleFormGrid columns={1}>
                <AdminField label="Price" required>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={handleFieldChange}
                    required
                  />
                </AdminField>

                <AdminField label="Sale Price">
                  <Input
                    id="salePrice"
                    name="salePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.salePrice}
                    onChange={handleFieldChange}
                  />
                </AdminField>

                <AdminField label="Quantity" required>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={handleFieldChange}
                    required
                  />
                </AdminField>
              </ModuleFormGrid>
            </ModuleCard>

            <ModuleCard title="Media" description="Featured image and gallery." className="product-form-section">
              <div className="space-y-6">
                <AdminField
                  label="Featured Image"
                  description="Primary catalog image."
                >
                  <div className="product-media-zone space-y-3">
                    <SelectedImagePreview
                      asset={featuredMedia}
                      onRemove={handleRemoveFeaturedMedia}
                    />
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => openFeaturedPicker('library')}
                      >
                        Media Library
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="w-full"
                        onClick={() => openFeaturedPicker('upload')}
                      >
                        Upload New
                      </Button>
                    </div>
                  </div>
                  <MediaPickerModal
                    open={featuredPickerOpen}
                    onOpenChange={setFeaturedPickerOpen}
                    mode="single"
                    mediaType="image"
                    maxSelection={1}
                    initialTab={featuredPickerTab}
                    selectedAssets={featuredPickerSnapshot}
                    onConfirm={handleFeaturedPickerConfirm}
                    uploadAccept="image/*"
                    defaultFolder="products"
                    title="Featured image"
                    description="Select one image for the product featured image."
                  />
                </AdminField>

                <AdminField
                  label="Gallery"
                  description={`${galleryMedia.length} / ${GALLERY_MAX_IMAGES} images selected`}
                >
                  <div className="product-media-zone space-y-3">
                    <GalleryImageGrid
                      assets={galleryMedia}
                      onRemove={handleRemoveGalleryMedia}
                      emptyMessage="No gallery images yet. Add from library or upload."
                    />
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full"
                        disabled={galleryMedia.length >= GALLERY_MAX_IMAGES}
                        onClick={() => openGalleryPicker('library')}
                      >
                        Media Library
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="w-full"
                        disabled={galleryMedia.length >= GALLERY_MAX_IMAGES}
                        onClick={() => openGalleryPicker('upload')}
                      >
                        Upload New
                      </Button>
                    </div>
                  </div>
                  <MediaPickerModal
                    open={galleryPickerOpen}
                    onOpenChange={setGalleryPickerOpen}
                    mode="multiple"
                    mediaType="image"
                    maxSelection={GALLERY_MAX_IMAGES}
                    initialTab={galleryPickerTab}
                    selectedAssets={galleryPickerSnapshot}
                    onConfirm={handleGalleryPickerConfirm}
                    uploadAccept="image/*"
                    defaultFolder="products"
                    title="Gallery images"
                    description={`Select up to ${GALLERY_MAX_IMAGES} images. Existing selections are included in your draft.`}
                  />
                </AdminField>
              </div>
            </ModuleCard>
          </aside>
        </div>

        <div className="product-form-actions-bar">
          <p className="product-form-actions-hint hidden text-sm text-slate-500 sm:block dark:text-slate-400">
            {isEditMode ? 'Save changes to update this product.' : 'Create a new catalog product.'}
          </p>
          <ModuleActions className="justify-end sm:ml-auto">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => navigate('/products')}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" size="default" disabled={saving} className="min-w-[120px]">
              {saving ? 'Saving…' : isEditMode ? 'Save changes' : 'Save product'}
            </Button>
          </ModuleActions>
        </div>
      </form>
    </AdminPage>
  )
}

export default ProductForm
