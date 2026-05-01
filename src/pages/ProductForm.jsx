import { useEffect, useMemo, useState } from 'react'
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
import { uploadProductImages } from '../api/uploadApi'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import ModuleActions from '@/components/admin-ui/ModuleActions'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import ModuleFormGrid from '@/components/admin-ui/ModuleFormGrid'
import ModuleHeader from '@/components/admin-ui/ModuleHeader'

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
  galleryImages: [],
  attributes: [],
  variations: [],
}

const getOptionLabel = (item, fallback) =>
  item?.name || item?.title || item?.label || item?.slug || fallback

const getOptionValue = (item) => item?._id || item?.id || item?.value || ''

const mapUploadUrls = (data) => {
  if (typeof data?.featuredImage === 'string') return [data.featuredImage]
  if (Array.isArray(data?.galleryImages)) return data.galleryImages
  if (Array.isArray(data?.urls)) return data.urls
  if (Array.isArray(data?.images)) return data.images
  if (Array.isArray(data?.files)) return data.files
  if (typeof data?.url === 'string') return [data.url]
  if (typeof data?.image === 'string') return [data.image]
  if (typeof data?.file === 'string') return [data.file]
  return []
}

const getImageUrl = (imagePath) => {
  if (!imagePath) return ''
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
  return `${baseUrl}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`
}

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
  const [uploadingFeatured, setUploadingFeatured] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [error, setError] = useState('')
  const [featuredPreviewFailed, setFeaturedPreviewFailed] = useState(false)
  const [galleryPreviewFailedMap, setGalleryPreviewFailedMap] = useState({})

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

        console.log('Categories response:', categoriesResponse)
        console.log('Brands response:', brandsResponse)
        console.log('Unit types response:', unitTypesResponse)
        console.log('Loaded attributes:', attributesResponse)

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
            galleryImages: Array.isArray(product?.galleryImages)
              ? product.galleryImages
              : [],
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
          })
          setFeaturedPreviewFailed(false)
          setGalleryPreviewFailedMap({})
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

  useEffect(() => {
    console.log('Product form attributes:', formData.attributes)
  }, [formData.attributes])

  useEffect(() => {
    console.log('Product form variations:', formData.variations)
  }, [formData.variations])

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

  const handleFeaturedUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingFeatured(true)
    setError('')

    try {
      const uploadData = new FormData()
      uploadData.append('featuredImage', file)
      const response = await uploadProductImages(uploadData)
      const uploadPayload = response?.data?.data || response?.data || {}
      const featuredUrl =
        uploadPayload?.featuredImage || mapUploadUrls(uploadPayload)?.[0] || ''

      if (featuredUrl) {
        setFormData((prev) => ({ ...prev, featuredImage: featuredUrl }))
        setFeaturedPreviewFailed(false)
      } else {
        throw new Error('Image upload failed')
      }
    } catch (err) {
      console.error(
        'Product image upload failed:',
        err?.response?.data || err?.message,
      )
      const message =
        err?.response?.data?.message || 'Failed to upload featured image.'
      setError(message)
    } finally {
      setUploadingFeatured(false)
      event.target.value = ''
    }
  }

  const handleGalleryUpload = async (event) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setUploadingGallery(true)
    setError('')

    try {
      const uploadData = new FormData()
      Array.from(files).forEach((file) => {
        uploadData.append('galleryImages', file)
      })

      const response = await uploadProductImages(uploadData)
      const uploadPayload = response?.data?.data || response?.data || {}
      const urls = Array.isArray(uploadPayload?.galleryImages)
        ? uploadPayload.galleryImages
        : mapUploadUrls(uploadPayload)

      if (urls.length > 0) {
        setFormData((prev) => ({
          ...prev,
          galleryImages: [...prev.galleryImages, ...urls],
        }))
        setGalleryPreviewFailedMap({})
      } else {
        throw new Error('Image upload failed')
      }
    } catch (err) {
      console.error(
        'Product image upload failed:',
        err?.response?.data || err?.message,
      )
      const message =
        err?.response?.data?.message || 'Failed to upload gallery images.'
      setError(message)
    } finally {
      setUploadingGallery(false)
      event.target.value = ''
    }
  }

  const removeGalleryImage = (imageUrl) => {
    setFormData((prev) => ({
      ...prev,
      galleryImages: prev.galleryImages.filter((url) => url !== imageUrl),
    }))
    setGalleryPreviewFailedMap((prev) => {
      const next = { ...prev }
      delete next[imageUrl]
      return next
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
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
        galleryImages: Array.isArray(formData.galleryImages)
          ? formData.galleryImages
          : [],
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
      <section>
        <ModuleHeader title={pageTitle} description={pageDescription} />
        <ModuleCard>
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading form...</p>
        </ModuleCard>
      </section>
    )
  }

  return (
    <section>
      <ModuleHeader
        title={pageTitle}
        description={pageDescription}
        actions={
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            onClick={() => navigate('/products')}
            disabled={saving}
          >
            Back to Products
          </Button>
        }
      />

      {error ? (
        <ModuleCard className="mb-3 border-red-200 bg-red-50 dark:border-red-900/70 dark:bg-red-950/30">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </ModuleCard>
      ) : null}

      <form onSubmit={handleSubmit}>
        <ModuleCard title="Basic Information">
          <ModuleFormGrid columns={3}>
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Name
              </label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleFieldChange}
                required
              />
            </div>

            <div>
              <label htmlFor="sku" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                SKU
              </label>
              <Input
                id="sku"
                name="sku"
                value={formData.sku}
                onChange={handleFieldChange}
              />
            </div>

            <div>
              <label htmlFor="status" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleFieldChange}
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="draft">draft</option>
                <option value="published">published</option>
              </select>
            </div>
          </ModuleFormGrid>
        </ModuleCard>

        <ModuleCard title="Organization">
          <ModuleFormGrid columns={3}>
            <div>
              <label htmlFor="category" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Category
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleFieldChange}
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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
              </select>
              {categories.length === 0 ? (
                <p className="helper-text dark:text-slate-400">
                  No categories found. Please create a category first.
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="brand" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Brand
              </label>
              <select
                id="brand"
                name="brand"
                value={formData.brand}
                onChange={handleFieldChange}
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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
              </select>
              {brands.length === 0 ? (
                <p className="helper-text dark:text-slate-400">
                  No brands found. Please create a brand first.
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="unitType" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Unit Type
              </label>
              <select
                id="unitType"
                name="unitType"
                value={formData.unitType}
                onChange={handleFieldChange}
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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
              </select>
              {unitTypes.length === 0 ? (
                <p className="helper-text dark:text-slate-400">
                  No unit types found. Please create a unit type first.
                </p>
              ) : null}
            </div>
          </ModuleFormGrid>
        </ModuleCard>

        <ModuleCard title="Pricing & Inventory">
          <ModuleFormGrid columns={3}>
            <div>
              <label htmlFor="price" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Price
              </label>
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
            </div>

            <div>
              <label htmlFor="salePrice" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Sale Price
              </label>
              <Input
                id="salePrice"
                name="salePrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.salePrice}
                onChange={handleFieldChange}
              />
            </div>

            <div>
              <label htmlFor="quantity" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Quantity
              </label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="0"
                value={formData.quantity}
                onChange={handleFieldChange}
                required
              />
            </div>
          </ModuleFormGrid>
        </ModuleCard>

        <ModuleCard title="Descriptions">
          <ModuleFormGrid columns={1}>
            <div>
              <label htmlFor="shortDescription" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Short Description
              </label>
              <Textarea
                id="shortDescription"
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleFieldChange}
                rows={3}
              />
            </div>
            <div>
              <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Description
              </label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleFieldChange}
                rows={5}
              />
            </div>
          </ModuleFormGrid>
        </ModuleCard>

        <ModuleCard title="Media">
          <ModuleFormGrid columns={2}>
            <div>
              <label htmlFor="featuredImage" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Featured Image
              </label>
              <Input
                id="featuredImage"
                type="file"
                accept="image/*"
                onChange={handleFeaturedUpload}
              />
              {uploadingFeatured ? (
                <p className="helper-text dark:text-slate-400">Uploading featured image...</p>
              ) : null}
              {formData.featuredImage ? (
                featuredPreviewFailed ? (
                  <p className="helper-text dark:text-slate-400">Image preview unavailable</p>
                ) : (
                  <img
                    src={getImageUrl(formData.featuredImage)}
                    alt="Featured preview"
                    className="image-preview-featured"
                    onError={() => setFeaturedPreviewFailed(true)}
                  />
                )
              ) : null}
            </div>

            <div>
              <label htmlFor="galleryImages" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Gallery Images
              </label>
              <Input
                id="galleryImages"
                type="file"
                accept="image/*"
                multiple
                onChange={handleGalleryUpload}
              />
              {uploadingGallery ? (
                <p className="helper-text dark:text-slate-400">Uploading gallery images...</p>
              ) : null}

              <div className="gallery-grid">
                {formData.galleryImages.map((url) => (
                  <div key={url} className="gallery-item dark:border-slate-700 dark:bg-slate-900">
                    {galleryPreviewFailedMap[url] ? (
                      <p className="helper-text dark:text-slate-400">Image preview unavailable</p>
                    ) : (
                      <img
                        src={getImageUrl(url)}
                        alt="Gallery preview"
                        className="image-preview-gallery"
                        onError={() =>
                          setGalleryPreviewFailedMap((prev) => ({
                            ...prev,
                            [url]: true,
                          }))
                        }
                      />
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="mt-2 h-7 px-2 text-xs"
                      onClick={() => removeGalleryImage(url)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </ModuleFormGrid>
        </ModuleCard>

        <ModuleCard title="Product Attributes">
          {attributes.length === 0 ? (
            <p className="helper-text dark:text-slate-400">
              No attributes found. Create attributes first from Catalog &gt; Attributes.
            </p>
          ) : (
            <>
              <div className="product-attribute-picker flex flex-col gap-2 md:flex-row">
                <select
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  value={selectedAttributeId}
                  onChange={(event) => setSelectedAttributeId(event.target.value)}
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
                </select>
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

        <ModuleCard title="Product Variations">
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
                      <div key={`variation-${index}`} className="variation-card dark:border-slate-700 dark:bg-slate-900">
                        <p className="variation-combination dark:text-slate-100">
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
                          <select
                            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                            value={variation?.status || 'active'}
                            onChange={(event) =>
                              handleVariationFieldChange(index, 'status', event.target.value)
                            }
                          >
                            <option value="active">active</option>
                            <option value="inactive">inactive</option>
                            <option value="draft">draft</option>
                          </select>
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
        </ModuleCard>

        <ModuleCard title="Actions">
          <ModuleActions className="justify-end">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => navigate('/products')}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Saving...' : 'Save Product'}
            </Button>
          </ModuleActions>
        </ModuleCard>
      </form>
    </section>
  )
}

export default ProductForm
