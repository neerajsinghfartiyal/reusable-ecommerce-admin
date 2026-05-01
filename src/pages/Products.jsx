import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProducts } from '../api/productApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ModuleActions from '@/components/admin-ui/ModuleActions'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import ModuleEmptyState from '@/components/admin-ui/ModuleEmptyState'
import ModuleHeader from '@/components/admin-ui/ModuleHeader'
import ModuleStatusBadge from '@/components/admin-ui/ModuleStatusBadge'
import ModuleTable from '@/components/admin-ui/ModuleTable'
import ModuleToolbar from '@/components/admin-ui/ModuleToolbar'
import Pagination from '../components/ui/Pagination'

const getNumberValue = (...values) => {
  for (const value of values) {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  return 0
}

const getTextValue = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return '-'
}

const formatPrice = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(getNumberValue(value))

const getImageUrl = (imagePath) => {
  if (!imagePath) return ''
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
  return `${baseUrl}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`
}

const extractVariations = (product) =>
  Array.isArray(product?.variations)
    ? product.variations.filter((item) => item && typeof item === 'object')
    : []

const getVariationStock = (variations = []) => {
  if (!Array.isArray(variations) || variations.length === 0) return null

  const quantities = variations
    .map((item) => item?.quantity)
    .filter((value) => value !== undefined && value !== null && value !== '')
    .map((value) => Number(value))
    .filter((value) => !Number.isNaN(value))

  if (quantities.length === 0) return null
  return quantities.reduce((sum, value) => sum + value, 0)
}

const getVariationPriceDisplay = (variations = [], fallbackPrice) => {
  if (!Array.isArray(variations) || variations.length === 0) {
    return formatPrice(fallbackPrice)
  }

  const prices = variations
    .map((item) => {
      const effective = item?.salePrice ?? item?.price
      const parsed = Number(effective)
      return Number.isNaN(parsed) ? null : parsed
    })
    .filter((value) => value !== null)

  if (prices.length === 0) return formatPrice(fallbackPrice)

  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)

  if (minPrice === maxPrice) return formatPrice(minPrice)
  return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`
}

function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [imageLoadFailed, setImageLoadFailed] = useState({})

  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    pageLimit: 10,
    currentPage: 1,
  })

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      setError('')

      try {
        const params = { page: currentPage }

        if (searchQuery) {
          params.search = searchQuery
        }

        if (statusFilter !== 'all') {
          params.status = statusFilter
        }

        const response = await getProducts(params)
        const payload = response?.data?.data || response?.data || {}
        const list = Array.isArray(payload?.products)
          ? payload.products
          : Array.isArray(payload?.items)
            ? payload.items
            : []

        const paginationData = payload?.pagination || {}
        const totalItems = getNumberValue(
          paginationData?.totalProducts,
          paginationData?.totalItems,
          payload?.totalProducts,
          payload?.totalItems,
          list.length,
        )
        const totalPages = Math.max(
          1,
          getNumberValue(paginationData?.totalPages, payload?.totalPages, 1),
        )
        const pageLimit = getNumberValue(
          paginationData?.pageLimit,
          paginationData?.limit,
          payload?.pageLimit,
          10,
        )
        const backendCurrentPage = Math.max(
          1,
          getNumberValue(
            paginationData?.currentPage,
            payload?.currentPage,
            currentPage,
          ),
        )

        setProducts(list)
        setImageLoadFailed({})
        setPagination({
          totalItems,
          totalPages,
          pageLimit,
          currentPage: backendCurrentPage,
        })
      } catch (err) {
        const message =
          err?.response?.data?.message ||
          'Failed to load products. Please try again.'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [currentPage, searchQuery, statusFilter])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setCurrentPage(1)
    setSearchQuery(searchInput.trim())
  }

  const handleStatusChange = (event) => {
    setCurrentPage(1)
    setStatusFilter(event.target.value)
  }

  const goToPrevious = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1))
  }

  const goToNext = () => {
    setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))
  }

  const columns = [
    { key: 'product', label: <span className="min-w-[240px] inline-block">Product</span> },
    { key: 'sku', label: <span className="min-w-[92px] inline-block">SKU</span> },
    { key: 'type', label: <span className="min-w-[88px] inline-block">Type</span> },
    { key: 'variations', label: <span className="min-w-[96px] inline-block">Variations</span> },
    { key: 'category', label: <span className="min-w-[110px] inline-block">Category</span> },
    { key: 'brand', label: <span className="min-w-[110px] inline-block">Brand</span> },
    { key: 'price', label: <span className="min-w-[110px] inline-block">Price</span> },
    { key: 'stock', label: <span className="min-w-[72px] inline-block">Stock</span> },
    { key: 'status', label: <span className="min-w-[92px] inline-block">Status</span> },
    { key: 'actions', label: <span className="min-w-[84px] inline-block text-right">Actions</span> },
  ]

  return (
    <section>
      <ModuleHeader
        title="Products"
        description="Manage products, inventory, pricing, images, and variation-based catalog items."
        actions={
          <Link to="/products/create">
            <Button size="sm">Add Product</Button>
          </Link>
        }
      />

      <ModuleToolbar>
        <form className="flex w-full flex-col gap-2 sm:flex-row sm:items-center" onSubmit={handleSearchSubmit}>
          <Input
            type="text"
            placeholder="Search products..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <Button type="submit" size="sm">
            Search
          </Button>
        </form>

        <select
          className="flex h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          value={statusFilter}
          onChange={handleStatusChange}
        >
          <option value="all">all</option>
          <option value="draft">draft</option>
          <option value="published">published</option>
        </select>
      </ModuleToolbar>

      {loading ? (
        <ModuleCard>
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading products...</p>
        </ModuleCard>
      ) : null}

      {error ? (
        <ModuleCard className="border-red-200 bg-red-50 dark:border-red-900/70 dark:bg-red-950/30">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </ModuleCard>
      ) : null}

      {!loading && !error ? (
        <>
          {products.length === 0 ? (
            <ModuleEmptyState
              title="No products found"
              description="Try changing filters or create your first product."
              action={
                <Link to="/products/create">
                  <Button size="sm">Add Product</Button>
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <ModuleTable
                columns={columns}
                data={products}
                emptyMessage="No products found."
                renderRow={(product, index) => {
                const productId =
                  product?._id || product?.id || `product-row-${index}`
                const productName = getTextValue(
                  product?.name,
                  product?.title,
                  'Unnamed Product',
                )
                const productImage =
                  product?.featuredImage ||
                  product?.image ||
                  product?.thumbnail ||
                  product?.images?.[0] ||
                  product?.galleryImages?.[0] ||
                  ''
                const sku = getTextValue(product?.sku, product?.code)
                const category = getTextValue(
                  product?.category?.name,
                  product?.category?.title,
                  product?.category,
                )
                const brand = getTextValue(
                  product?.brand?.name,
                  product?.brand?.title,
                  product?.brand,
                )
                const fallbackPrice = product?.salePrice ?? product?.price
                const variations = extractVariations(product)
                const isVariableProduct = variations.length > 0
                const variationCountText = isVariableProduct
                  ? `${variations.length} variations`
                  : '-'
                const variationStock = getVariationStock(variations)
                const stock = isVariableProduct
                  ? getNumberValue(
                      variationStock,
                      product?.quantity,
                      product?.stock,
                      product?.countInStock,
                    )
                  : getNumberValue(
                      product?.quantity,
                      product?.stock,
                      product?.countInStock,
                    )
                const status = getTextValue(product?.status, 'draft')
                const priceDisplay = getVariationPriceDisplay(variations, fallbackPrice)

                  return (
                    <tr key={productId} className="text-slate-700 dark:text-slate-300">
                      <td className="min-w-[240px]">
                        <div className="product-cell flex items-center gap-2">
                        {productImage ? (
                          imageLoadFailed[productId] ? (
                            <div className="product-thumb product-thumb-fallback flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-xs">
                              {productName.charAt(0).toUpperCase()}
                            </div>
                          ) : (
                            <img
                              src={getImageUrl(productImage)}
                              alt={productName}
                              className="product-thumb h-10 w-10 shrink-0 rounded-md object-cover"
                              onError={() =>
                                setImageLoadFailed((prev) => ({
                                  ...prev,
                                  [productId]: true,
                                }))
                              }
                            />
                          )
                        ) : (
                          <div className="product-thumb product-thumb-fallback flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-xs">
                            {productName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="product-name line-clamp-2 text-sm font-medium leading-5 text-slate-900 dark:text-slate-100">
                          {productName}
                        </span>
                      </div>
                    </td>
                    <td className="min-w-[92px] max-w-[120px] break-words text-xs text-slate-600 dark:text-slate-400">{sku}</td>
                    <td className="min-w-[88px]">
                      <ModuleStatusBadge status={isVariableProduct ? 'Variable' : 'Simple'} />
                    </td>
                    <td className="min-w-[96px] text-sm text-slate-700 dark:text-slate-300">{variationCountText}</td>
                    <td className="min-w-[110px] max-w-[130px] truncate text-sm text-slate-600 dark:text-slate-400">{category}</td>
                    <td className="min-w-[110px] max-w-[130px] truncate text-sm text-slate-600 dark:text-slate-400">{brand}</td>
                    <td className="min-w-[110px] whitespace-nowrap text-sm font-medium text-slate-800 dark:text-slate-200">{priceDisplay}</td>
                    <td className="min-w-[72px] text-sm text-slate-700 dark:text-slate-300">{stock}</td>
                    <td className="min-w-[92px]">
                      <ModuleStatusBadge status={status.toLowerCase()} />
                    </td>
                    <td className="min-w-[84px] text-right">
                      <ModuleActions className="justify-end">
                        <Link to={`/products/edit/${productId}`}>
                          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs">
                            Edit
                          </Button>
                        </Link>
                      </ModuleActions>
                    </td>
                  </tr>
                  )
                }}
              />
            </div>
          )}

          <div className="[&_.pagination-btn]:dark:border-slate-700 [&_.pagination-btn]:dark:bg-slate-900 [&_.pagination-btn]:dark:text-slate-200 [&_.pagination-btn:disabled]:dark:text-slate-500 [&_.pagination-text]:dark:text-slate-400">
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPrevious={goToPrevious}
              onNext={goToNext}
            />
          </div>
        </>
      ) : null}
    </section>
  )
}

export default Products
