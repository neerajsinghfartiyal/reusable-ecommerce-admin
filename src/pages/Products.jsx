import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { bulkUpdateProducts, deleteProduct, getProducts } from '../api/productApi'
import AdminAlert from '@/components/admin-ui/AdminAlert'
import AdminFilterBar from '@/components/admin-ui/AdminFilterBar'
import AdminFilterField from '@/components/admin-ui/AdminFilterField'
import AdminPage from '@/components/admin-ui/AdminPage'
import AdminPagination from '@/components/admin-ui/AdminPagination'
import AdminSelect from '@/components/admin-ui/AdminSelect'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import ProductBulkActions from '@/components/admin-ui/ProductBulkActions'
import ProductRowActions from '@/components/admin-ui/ProductRowActions'
import ModuleEmptyState from '@/components/admin-ui/ModuleEmptyState'
import PageLoading from '@/components/admin-ui/PageLoading'
import ModuleStatusBadge from '@/components/admin-ui/ModuleStatusBadge'
import ModuleTable from '@/components/admin-ui/ModuleTable'
import { cn } from '@/lib/utils'

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

const getProductId = (product, index = 0) => {
  const id = product?._id || product?.id
  if (id === undefined || id === null || id === '') {
    return ''
  }
  return String(id)
}

const BULK_STATUS_VALUES = ['draft', 'published', 'inactive']

const getBulkStatusLabel = (status) => {
  if (status === 'published') return 'Published'
  if (status === 'inactive') return 'Inactive'
  return 'Draft'
}

const openBulkConfirm = (setBulkConfirm, setBulkDialogOpen, setBulkError, config) => {
  setBulkError('')
  setBulkConfirm(config)
  setBulkDialogOpen(true)
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

  const [listRefreshKey, setListRefreshKey] = useState(0)
  const [listSuccessMessage, setListSuccessMessage] = useState('')
  const [listActionError, setListActionError] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [selectedProductIds, setSelectedProductIds] = useState([])
  const [bulkAction, setBulkAction] = useState('')
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkConfirm, setBulkConfirm] = useState(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkError, setBulkError] = useState('')

  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    pageLimit: 10,
    currentPage: 1,
  })

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError('')
    setListActionError('')

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
  }, [currentPage, searchQuery, statusFilter])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts, listRefreshKey])

  const visibleProductIds = useMemo(
    () =>
      products
        .map((product, index) => getProductId(product, index))
        .filter((id) => id.length > 0),
    [products],
  )

  useEffect(() => {
    setSelectedProductIds((prev) =>
      prev.filter((id) => visibleProductIds.includes(id)),
    )
  }, [visibleProductIds])

  useEffect(() => {
    setSelectedProductIds([])
    setBulkAction('')
  }, [currentPage, searchQuery, statusFilter])

  const selectedCount = selectedProductIds.length
  const allVisibleSelected =
    visibleProductIds.length > 0 &&
    visibleProductIds.every((id) => selectedProductIds.includes(id))
  const someVisibleSelected = visibleProductIds.some((id) =>
    selectedProductIds.includes(id),
  )
  const selectAllChecked = allVisibleSelected
    ? true
    : someVisibleSelected
      ? 'indeterminate'
      : false

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedProductIds([])
      return
    }
    setSelectedProductIds(visibleProductIds)
  }

  const toggleProductSelection = (productId) => {
    if (!productId) return
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    )
  }

  const clearSelection = () => {
    setSelectedProductIds([])
    setBulkAction('')
  }

  const refreshListAfterRemoval = (removedCount = 1) => {
    if (products.length <= removedCount && currentPage > 1) {
      setCurrentPage((prev) => Math.max(1, prev - 1))
      return
    }
    setListRefreshKey((prev) => prev + 1)
  }

  const startBulkConfirm = (action) => {
    if (selectedProductIds.length === 0) return

    const count = selectedProductIds.length

    if (action === 'delete') {
      openBulkConfirm(setBulkConfirm, setBulkDialogOpen, setBulkError, {
        type: 'delete',
        count,
      })
      return
    }

    if (BULK_STATUS_VALUES.includes(action)) {
      openBulkConfirm(setBulkConfirm, setBulkDialogOpen, setBulkError, {
        type: 'status',
        status: action,
        count,
      })
    }
  }

  const handleBulkApply = () => {
    if (!bulkAction || selectedProductIds.length === 0) return
    startBulkConfirm(bulkAction)
  }

  const handleQuickBulkAction = (action) => {
    if (selectedProductIds.length === 0) return
    setBulkAction(action === 'delete' ? 'delete' : action)
    startBulkConfirm(action)
  }

  const closeBulkDialog = () => {
    if (bulkLoading) return
    setBulkDialogOpen(false)
    setBulkConfirm(null)
    setBulkError('')
  }

  const handleConfirmBulk = async () => {
    if (!bulkConfirm || selectedProductIds.length === 0 || bulkLoading) return

    setBulkLoading(true)
    setBulkError('')
    setListActionError('')

    try {
      const payload =
        bulkConfirm.type === 'delete'
          ? { ids: selectedProductIds, action: 'delete' }
          : {
              ids: selectedProductIds,
              action: 'status',
              status: bulkConfirm.status,
            }

      const response = await bulkUpdateProducts(payload)
      const isSuccess = response?.data?.success !== false
      const result = response?.data?.data || response?.data || {}
      const failedIds = Array.isArray(result?.failedIds) ? result.failedIds : []
      const message =
        response?.data?.message ||
        result?.message ||
        'Bulk action completed.'

      if (!isSuccess || failedIds.length > 0) {
        setSelectedProductIds(failedIds.map((id) => String(id)))
        setBulkAction('')
        setListSuccessMessage('')
        setListActionError(message)
        setBulkDialogOpen(false)
        setBulkConfirm(null)
        setListRefreshKey((prev) => prev + 1)
        return
      }

      setListActionError('')

      if (bulkConfirm.type === 'delete') {
        const deletedCount = getNumberValue(
          result?.deletedCount,
          selectedProductIds.length,
        )
        setListSuccessMessage(
          deletedCount === 1
            ? '1 product was deleted.'
            : `${deletedCount} products were deleted.`,
        )
        clearSelection()
        setBulkDialogOpen(false)
        setBulkConfirm(null)
        refreshListAfterRemoval(
          Math.min(deletedCount, products.length) || selectedProductIds.length,
        )
        return
      }

      const updatedCount = getNumberValue(
        result?.updatedCount,
        selectedProductIds.length,
      )
      const statusLabel = getBulkStatusLabel(bulkConfirm.status)
      setListSuccessMessage(
        updatedCount === 1
          ? `1 product was set to ${statusLabel}.`
          : `${updatedCount} products were set to ${statusLabel}.`,
      )
      clearSelection()
      setBulkDialogOpen(false)
      setBulkConfirm(null)
      setListRefreshKey((prev) => prev + 1)
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        'Bulk action failed. Please try again.'
      setBulkError(message)
    } finally {
      setBulkLoading(false)
    }
  }

  const openDeleteDialog = (product) => {
    const productId = product?._id || product?.id
    const productName = getTextValue(product?.name, product?.title, 'Unnamed Product')
    if (!productId) return

    setDeleteTarget({ id: productId, name: productName })
    setDeleteError('')
    setDeleteDialogOpen(true)
  }

  const closeDeleteDialog = () => {
    if (deleteLoading) return
    setDeleteDialogOpen(false)
    setDeleteTarget(null)
    setDeleteError('')
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id || deleteLoading) return

    setDeleteLoading(true)
    setDeleteError('')
    setListActionError('')

    try {
      await deleteProduct(deleteTarget.id)
      setSelectedProductIds((prev) =>
        prev.filter((id) => id !== String(deleteTarget.id)),
      )
      setListSuccessMessage(`"${deleteTarget.name}" was deleted.`)
      setDeleteDialogOpen(false)
      setDeleteTarget(null)

      refreshListAfterRemoval(1)
    } catch (err) {
      const message =
        err?.response?.data?.message || 'Failed to delete product. Please try again.'
      setDeleteError(message)
    } finally {
      setDeleteLoading(false)
    }
  }

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

  const getStickySelectCellClass = (isSelected) =>
    cn(
      'sticky left-0 z-10 w-12 min-w-[48px] max-w-[48px] border-r border-slate-200/80 bg-white shadow-[6px_0_12px_-8px_rgba(15,23,42,0.08)] dark:border-slate-800/90 dark:bg-slate-900/75 dark:shadow-[6px_0_12px_-8px_rgba(0,0,0,0.3)]',
      'group-hover:bg-slate-50/60 dark:group-hover:bg-slate-800/50',
      isSelected && 'bg-slate-100/90 dark:bg-slate-800/60',
    )

  const getStickyActionsCellClass = (isSelected) =>
    cn(
      'sticky right-0 z-10 min-w-[88px] border-l border-slate-200/80 bg-white text-right shadow-[-6px_0_12px_-8px_rgba(15,23,42,0.08)] dark:border-slate-800/90 dark:bg-slate-900/75 dark:shadow-[-6px_0_12px_-8px_rgba(0,0,0,0.3)]',
      'group-hover:bg-slate-50/60 dark:group-hover:bg-slate-800/50',
      isSelected && 'bg-slate-100/90 dark:bg-slate-800/60',
    )

  const columns = [
    {
      key: 'select',
      label: (
        <Checkbox
          checked={selectAllChecked}
          onCheckedChange={toggleSelectAllVisible}
          disabled={visibleProductIds.length === 0}
          aria-label="Select all products on this page"
        />
      ),
      sticky: 'left',
      headClassName: 'w-12 min-w-[48px] max-w-[48px] px-2',
    },
    { key: 'product', label: <span className="min-w-[240px] inline-block">Product</span> },
    { key: 'sku', label: <span className="min-w-[92px] inline-block">SKU</span> },
    { key: 'type', label: <span className="min-w-[88px] inline-block">Type</span> },
    { key: 'variations', label: <span className="min-w-[96px] inline-block">Variations</span> },
    { key: 'category', label: <span className="min-w-[110px] inline-block">Category</span> },
    { key: 'brand', label: <span className="min-w-[110px] inline-block">Brand</span> },
    { key: 'price', label: <span className="min-w-[110px] inline-block">Price</span> },
    { key: 'stock', label: <span className="min-w-[72px] inline-block">Stock</span> },
    { key: 'status', label: <span className="min-w-[92px] inline-block">Status</span> },
    {
      key: 'actions',
      label: <span className="inline-block min-w-[88px] text-right">Actions</span>,
      sticky: 'right',
      headClassName: 'text-right',
    },
  ]

  return (
    <AdminPage
      headerMode="compact"
      title="Products"
      description="Manage products, inventory, pricing, images, and variation-based catalog items."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/product-imports">
            <Button size="sm" variant="outline">
              Import Products
            </Button>
          </Link>
          <Link to="/products/create">
            <Button size="sm">Add Product</Button>
          </Link>
        </div>
      }
    >

      <AdminFilterBar>
        <AdminFilterField variant="search" label="Search">
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
            onSubmit={handleSearchSubmit}
          >
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
        </AdminFilterField>

        <AdminFilterField label="Status">
          <AdminSelect
            value={statusFilter}
            onChange={handleStatusChange}
            aria-label="Filter products by status"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="inactive">Inactive</option>
          </AdminSelect>
        </AdminFilterField>
      </AdminFilterBar>

      {loading ? <PageLoading message="Loading products..." /> : null}

      {listSuccessMessage ? (
        <AdminAlert type="success" title="Success">
          {listSuccessMessage}
        </AdminAlert>
      ) : null}

      {listActionError ? (
        <AdminAlert type="error" title="Action incomplete">
          {listActionError}
        </AdminAlert>
      ) : null}

      {error ? (
        <AdminAlert type="error" title="Request failed">
          {error}
        </AdminAlert>
      ) : null}

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog()
          else setDeleteDialogOpen(true)
        }}
      >
        <DialogContent className="border-slate-200 bg-white sm:max-w-md dark:border-slate-800 dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">
              Delete product?
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                <p>
                  You are about to permanently remove this product from your catalog.
                  This action cannot be undone.
                </p>
                {deleteTarget?.name ? (
                  <div
                    className="rounded-lg border border-red-200/80 bg-red-50/80 px-3 py-2.5 dark:border-red-900/50 dark:bg-red-950/30"
                    role="status"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-red-800/80 dark:text-red-300/90">
                      Product to delete
                    </p>
                    <p className="mt-1 font-semibold text-red-950 dark:text-red-100">
                      {deleteTarget.name}
                    </p>
                  </div>
                ) : null}
              </div>
            </DialogDescription>
          </DialogHeader>

          {deleteError ? (
            <AdminAlert type="error" title="Delete failed">
              {deleteError}
            </AdminAlert>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={closeDeleteDialog}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Deleting…
                </>
              ) : (
                'Delete Product'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeBulkDialog()
          else setBulkDialogOpen(true)
        }}
      >
        <DialogContent className="border-slate-200 bg-white sm:max-w-md dark:border-slate-800 dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">
              {bulkConfirm?.type === 'delete'
                ? `Delete ${bulkConfirm?.count ?? 0} selected ${
                    bulkConfirm?.count === 1 ? 'product' : 'products'
                  }?`
                : `Update ${bulkConfirm?.count ?? 0} selected ${
                    bulkConfirm?.count === 1 ? 'product' : 'products'
                  }?`}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                {bulkConfirm?.type === 'delete' ? (
                  <>
                    <p>
                      You are about to permanently remove{' '}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {bulkConfirm?.count ?? 0}{' '}
                        {bulkConfirm?.count === 1 ? 'product' : 'products'}
                      </span>{' '}
                      from your catalog. This action cannot be undone.
                    </p>
                    <div
                      className="rounded-lg border border-red-200/80 bg-red-50/80 px-3 py-2.5 dark:border-red-900/50 dark:bg-red-950/30"
                      role="status"
                    >
                      <p className="text-xs font-medium uppercase tracking-wide text-red-800/80 dark:text-red-300/90">
                        Destructive action
                      </p>
                      <p className="mt-1 text-sm text-red-950 dark:text-red-100">
                        Deleted products cannot be recovered from the admin panel.
                      </p>
                    </div>
                  </>
                ) : (
                  <p>
                    Set{' '}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {bulkConfirm?.count ?? 0}{' '}
                      {bulkConfirm?.count === 1 ? 'product' : 'products'}
                    </span>{' '}
                    to{' '}
                    <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                      {getBulkStatusLabel(bulkConfirm?.status)}
                    </span>
                    .
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          {bulkError ? (
            <AdminAlert type="error" title="Bulk action failed">
              {bulkError}
            </AdminAlert>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={closeBulkDialog}
              disabled={bulkLoading}
            >
              Cancel
            </Button>
            {bulkConfirm?.type === 'delete' ? (
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmBulk}
                disabled={bulkLoading}
              >
                {bulkLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Deleting…
                  </>
                ) : (
                  'Delete Products'
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleConfirmBulk}
                disabled={bulkLoading}
              >
                {bulkLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Updating…
                  </>
                ) : (
                  'Update Products'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!loading && !error ? (
        <>
          {products.length === 0 ? (
            <ModuleEmptyState
              title="No products found"
              description="Try changing filters, add a product manually, or use Product Imports for a bulk upload."
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Link to="/product-imports">
                    <Button size="sm" variant="outline">
                      Import Products
                    </Button>
                  </Link>
                  <Link to="/products/create">
                    <Button size="sm">Add Product</Button>
                  </Link>
                </div>
              }
            />
          ) : (
            <>
            <ProductBulkActions
              selectedCount={selectedCount}
              bulkAction={bulkAction}
              onBulkActionChange={(event) => setBulkAction(event.target.value)}
              onApply={handleBulkApply}
              onQuickAction={handleQuickBulkAction}
              onClearSelection={clearSelection}
              isProcessing={bulkLoading}
            />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Showing{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {products.length}
                </span>{' '}
                of{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {pagination.totalItems}
                </span>{' '}
                products
                {selectedCount > 0 ? (
                  <span className="text-slate-400 dark:text-slate-500">
                    {' '}
                    · {selectedCount} selected on this page
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Page{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {pagination.currentPage}
                </span>{' '}
                of{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {pagination.totalPages}
                </span>
              </p>
            </div>

            <ModuleTable
              columns={columns}
              data={products}
              emptyMessage="No products found."
              renderRow={(product, index) => {
                const rowProductId = getProductId(product, index)
                const productId = rowProductId || `product-row-${index}`
                const isSelectable = Boolean(rowProductId)
                const isSelected = isSelectable && selectedProductIds.includes(rowProductId)
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
                    <tr
                      key={productId}
                      className={cn(
                        'products-table-row group align-middle text-slate-700 transition-colors',
                        'hover:bg-slate-50/70 dark:text-slate-300 dark:hover:bg-slate-800/40',
                        isSelected &&
                          'bg-slate-100/80 ring-1 ring-inset ring-slate-900/5 hover:bg-slate-100/90 dark:bg-slate-800/55 dark:ring-slate-100/10 dark:hover:bg-slate-800/60',
                      )}
                      data-selected={isSelected || undefined}
                    >
                      <td className={cn(getStickySelectCellClass(isSelected), 'align-middle')}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleProductSelection(rowProductId)}
                          disabled={!isSelectable}
                          aria-label={`Select product ${productName}`}
                        />
                      </td>
                      <td className="min-w-[240px] align-middle">
                        <div className="product-cell flex min-w-0 items-center gap-3">
                        {productImage ? (
                          imageLoadFailed[productId] ? (
                            <div className="product-thumb-card product-thumb-fallback flex h-12 w-12 shrink-0 items-center justify-center text-sm font-semibold">
                              {productName.charAt(0).toUpperCase()}
                            </div>
                          ) : (
                            <div className="product-thumb-card shrink-0 overflow-hidden">
                              <img
                                src={getImageUrl(productImage)}
                                alt={productName}
                                className="product-thumb h-12 w-12 object-cover"
                                onError={() =>
                                  setImageLoadFailed((prev) => ({
                                    ...prev,
                                    [productId]: true,
                                  }))
                                }
                              />
                            </div>
                          )
                        ) : (
                          <div className="product-thumb-card product-thumb-fallback flex h-12 w-12 shrink-0 items-center justify-center text-sm font-semibold">
                            {productName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="product-name line-clamp-2 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-50">
                            {productName}
                          </p>
                          <p className="product-sku mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                            {sku !== '-' ? sku : 'No SKU'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden min-w-[92px] max-w-[120px] align-middle break-words text-xs text-slate-500 dark:text-slate-400 md:table-cell">
                      {sku}
                    </td>
                    <td className="min-w-[88px] align-middle">
                      <ModuleStatusBadge status={isVariableProduct ? 'Variable' : 'Simple'} />
                    </td>
                    <td className="min-w-[96px] align-middle text-sm text-slate-700 dark:text-slate-200">{variationCountText}</td>
                    <td className="min-w-[110px] max-w-[130px] truncate align-middle text-sm text-slate-600 dark:text-slate-400">{category}</td>
                    <td className="min-w-[110px] max-w-[130px] truncate align-middle text-sm text-slate-600 dark:text-slate-400">{brand}</td>
                    <td className="min-w-[110px] whitespace-nowrap align-middle text-sm font-medium tabular-nums text-slate-900 dark:text-slate-100">{priceDisplay}</td>
                    <td className="min-w-[72px] align-middle text-sm tabular-nums text-slate-700 dark:text-slate-200">{stock}</td>
                    <td className="min-w-[92px] align-middle">
                      <ModuleStatusBadge status={status.toLowerCase()} />
                    </td>
                    <td className={cn(getStickyActionsCellClass(isSelected), 'align-middle')}>
                      {isSelectable ? (
                        <ProductRowActions
                          productId={rowProductId}
                          productName={productName}
                          onDelete={() => openDeleteDialog(product)}
                        />
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                  )
              }}
            />
            </>
          )}

          <AdminPagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPrevious={goToPrevious}
            onNext={goToNext}
            isPreviousDisabled={pagination.currentPage <= 1}
            isNextDisabled={pagination.currentPage >= pagination.totalPages}
          />
        </>
      ) : null}
    </AdminPage>
  )
}

export default Products
