import { PackageSearch } from 'lucide-react'
import DashboardSectionHeader from '@/components/admin-ui/dashboard/DashboardSectionHeader'
import { Button } from '@/components/ui/button'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import ModuleTable from '@/components/admin-ui/ModuleTable'

const lowStockColumns = [
  { key: 'product', label: 'Product' },
  { key: 'sku', label: 'SKU' },
  { key: 'stock', label: 'Stock' },
]

const viewButtonClass =
  'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'

function LowStockWidget({ products = [], onViewProducts, getTextValue, getNumberValue }) {
  const productRows = products.slice(0, 5)

  return (
    <ModuleCard
      compact
      tone="muted"
      className="dashboard-module-card dashboard-pair-card h-full min-w-0"
    >
      <div className="dashboard-pair-card-shell">
      <DashboardSectionHeader
        compact
        title="Low Stock Products"
        description="Products that need replenishment soon."
        action={
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className={viewButtonClass}
            onClick={onViewProducts}
          >
            View Products
          </Button>
        }
      />
      <div className="dashboard-pair-card-body">
        {productRows.length === 0 ? (
          <div className="dashboard-pair-empty-slot">
            <div className="dashboard-widget-empty" role="status">
              <span className="dashboard-widget-empty-icon" aria-hidden>
                <PackageSearch className="h-4 w-4" />
              </span>
              <p className="dashboard-widget-empty-title">No low stock products</p>
              <p className="dashboard-widget-empty-desc">
                Products with low inventory will appear here when stock runs low.
              </p>
            </div>
          </div>
        ) : (
          <ModuleTable
            compact
            columns={lowStockColumns}
            data={productRows}
            emptyMessage="No low stock products."
            renderRow={(product, index) => {
              const productId = product?._id || product?.id || `low-stock-product-${index}`
              const productName = getTextValue(product?.name, product?.title, 'Product')
              const sku = getTextValue(product?.sku, product?.code)
              const stock = getNumberValue(
                product?.stock,
                product?.quantity,
                product?.countInStock,
              )

              return (
                <tr key={productId} className="text-slate-700 dark:text-slate-200">
                  <td className="font-medium text-slate-800 dark:text-slate-100">{productName}</td>
                  <td className="text-slate-700 dark:text-slate-300">{sku}</td>
                  <td className="text-slate-700 dark:text-slate-300">{stock}</td>
                </tr>
              )
            }}
          />
        )}
      </div>
      </div>
    </ModuleCard>
  )
}

export default LowStockWidget
