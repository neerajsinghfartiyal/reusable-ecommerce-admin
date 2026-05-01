import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Boxes,
  CreditCard,
  ClipboardList,
  DollarSign,
  FileText,
  Image,
  PackageSearch,
  PlusCircle,
  RotateCcw,
  Settings,
  ShoppingCart,
  Truck,
  Users,
} from 'lucide-react'
import { getDashboardStats } from '../api/dashboardApi'
import { getActivityLogs } from '../api/activityLogApi'
import { Button } from '@/components/ui/button'
import ModuleActions from '@/components/admin-ui/ModuleActions'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import ModuleEmptyState from '@/components/admin-ui/ModuleEmptyState'
import ModuleHeader from '@/components/admin-ui/ModuleHeader'
import ModuleStatusBadge from '@/components/admin-ui/ModuleStatusBadge'
import ModuleTable from '@/components/admin-ui/ModuleTable'

const getNumberValue = (...values) => {
  for (const value of values) {
    const numberValue = Number(value)
    if (!Number.isNaN(numberValue)) {
      return numberValue
    }
  }

  return 0
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(getNumberValue(value))

const getTextValue = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return '-'
}

const extractList = (...values) => {
  for (const value of values) {
    if (Array.isArray(value)) {
      return value
    }
  }
  return []
}

const formatDateTime = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

const normalizeStatus = (value, fallback = 'pending') => {
  const status = getTextValue(value, fallback).toLowerCase()
  return status === '-' ? fallback : status
}

function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activityWarning, setActivityWarning] = useState('')
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalCustomers: 0,
    revenue: 0,
    pendingOrders: 0,
    returnRequests: 0,
    recentOrders: [],
    lowStockProducts: [],
    recentActivity: [],
  })

  useEffect(() => {
    const fetchDashboardStats = async () => {
      setLoading(true)
      setError('')
      setActivityWarning('')

      try {
        const [statsResponse, activityResponse] = await Promise.allSettled([
          getDashboardStats(),
          getActivityLogs({ limit: 5 }),
        ])

        if (statsResponse.status !== 'fulfilled') {
          const message =
            statsResponse.reason?.response?.data?.message ||
            'Failed to load dashboard data. Please try again.'
          setError(message)
          return
        }

        const payload =
          statsResponse.value?.data?.data || statsResponse.value?.data || statsResponse.value || {}

        const totalProducts = getNumberValue(
          payload?.totalProducts,
          payload?.productsCount,
        )
        const totalOrders = getNumberValue(
          payload?.totalOrders,
          payload?.ordersCount,
        )
        const totalCustomers = getNumberValue(
          payload?.totalCustomers,
          payload?.customersCount,
        )
        const revenue = getNumberValue(payload?.revenue, payload?.totalRevenue)
        const pendingOrders = getNumberValue(
          payload?.pendingOrders,
          payload?.pendingOrdersCount,
        )
        const returnRequests = getNumberValue(
          payload?.returnRequests,
          payload?.returnRequestsCount,
        )

        const recentOrders = extractList(payload?.recentOrders, payload?.orders).slice(0, 5)
        const lowStockProducts = extractList(
          payload?.lowStockProducts,
          payload?.lowStock,
          payload?.stockAlerts,
        ).slice(0, 5)

        let recentActivity = []
        if (activityResponse.status === 'fulfilled') {
          const activityPayload =
            activityResponse.value?.data?.data ||
            activityResponse.value?.data ||
            activityResponse.value ||
            {}
          recentActivity = extractList(
            activityPayload?.activityLogs,
            activityPayload?.logs,
            activityPayload?.items,
            activityResponse.value?.data?.activityLogs,
            activityResponse.value?.activityLogs,
          ).slice(0, 5)
        } else {
          setActivityWarning('Recent activity could not be loaded right now.')
        }

        setStats({
          totalProducts,
          totalOrders,
          totalCustomers,
          revenue,
          pendingOrders,
          returnRequests,
          recentOrders,
          lowStockProducts,
          recentActivity,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardStats()
  }, [])

  if (loading) {
    return (
      <section>
        <ModuleHeader
          title="Dashboard"
          description="Overview of store performance, orders, stock, and recent activity."
        />
        <ModuleCard>
          <p className="text-sm text-slate-600 dark:text-slate-300">Loading dashboard stats...</p>
        </ModuleCard>
      </section>
    )
  }

  if (error) {
    return (
      <section>
        <ModuleHeader
          title="Dashboard"
          description="Overview of store performance, orders, stock, and recent activity."
        />
        <ModuleCard className="border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </ModuleCard>
      </section>
    )
  }

  const statCards = [
    { label: 'Total Products', value: stats.totalProducts, icon: Boxes },
    { label: 'Total Orders', value: stats.totalOrders, icon: ClipboardList },
    { label: 'Total Customers', value: stats.totalCustomers, icon: Users },
    { label: 'Revenue', value: formatCurrency(stats.revenue), icon: DollarSign },
    { label: 'Pending Orders', value: stats.pendingOrders, icon: PackageSearch },
    { label: 'Return Requests', value: stats.returnRequests, icon: RotateCcw },
  ]

  const recentOrdersColumns = [
    { key: 'order', label: 'Order' },
    { key: 'customer', label: 'Customer' },
    { key: 'total', label: 'Total' },
    { key: 'payment', label: 'Payment' },
    { key: 'status', label: 'Status' },
  ]

  const lowStockColumns = [
    { key: 'product', label: 'Product' },
    { key: 'sku', label: 'SKU' },
    { key: 'stock', label: 'Stock' },
  ]

  const activityColumns = [
    { key: 'date', label: 'Date' },
    { key: 'module', label: 'Module' },
    { key: 'action', label: 'Action' },
    { key: 'description', label: 'Description' },
  ]

  const quickLinks = [
    {
      label: 'Add Product',
      to: '/products/create',
      helper: 'Create new catalog item',
      icon: PlusCircle,
    },
    {
      label: 'Orders',
      to: '/orders',
      helper: 'Review incoming orders',
      icon: ShoppingCart,
    },
    {
      label: 'Returns / Exchanges',
      to: '/returns',
      helper: 'Handle return requests',
      icon: RotateCcw,
    },
    {
      label: 'CMS Pages',
      to: '/pages',
      helper: 'Manage static pages',
      icon: FileText,
    },
    {
      label: 'Media Library',
      to: '/media',
      helper: 'Browse uploaded assets',
      icon: Image,
    },
    {
      label: 'Payment Methods',
      to: '/payment-methods',
      helper: 'Configure payments',
      icon: CreditCard,
    },
    {
      label: 'Shipping Methods',
      to: '/shipping-methods',
      helper: 'Configure shipping rules',
      icon: Truck,
    },
    {
      label: 'Store Settings',
      to: '/settings',
      helper: 'Update store preferences',
      icon: Settings,
    },
  ]

  return (
    <section>
      <ModuleHeader
        title="Dashboard"
        description="Overview of store performance, orders, stock, and recent activity."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map((card) => (
          <ModuleCard
            key={card.label}
            compact
            className="min-h-[128px] border-slate-200/90 bg-gradient-to-b from-white to-slate-50/60 dark:border-slate-800 dark:from-slate-950 dark:to-slate-900/60"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{card.value}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <card.icon className="h-4 w-4" />
              </div>
            </div>
          </ModuleCard>
        ))}
      </div>

      <div className="grid gap-5">
        <ModuleCard
          title="Recent Orders"
          actions={
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={() => navigate('/orders')}
            >
              View Orders
            </Button>
          }
        >
          {stats.recentOrders.length === 0 ? (
            <ModuleEmptyState
              compact
              title="No recent orders"
              description="New orders will appear here when customers place them."
              className="dark:border-slate-800/90 dark:bg-slate-900/60"
            />
          ) : (
            <ModuleTable
              compact
              columns={recentOrdersColumns}
              data={stats.recentOrders.slice(0, 5)}
              emptyMessage="No recent orders available."
              renderRow={(order, index) => {
                const orderId =
                  order?._id ||
                  order?.id ||
                  order?.orderId ||
                  `recent-order-${index}`
                const customerName = getTextValue(
                  order?.customerName,
                  order?.customer?.name,
                  order?.user?.name,
                  order?.email,
                  'Customer',
                )
                const orderAmount = getNumberValue(
                  order?.totalAmount,
                  order?.amount,
                  order?.total,
                )
                const orderNumber = getTextValue(
                  order?.orderNumber,
                  order?.orderId,
                  order?._id,
                  order?.id,
                )
                const paymentStatus = normalizeStatus(
                  order?.paymentStatus,
                  order?.payment?.status,
                  'pending',
                )
                const orderStatus = normalizeStatus(order?.status, 'pending')

                return (
                  <tr key={orderId} className="text-slate-700 dark:text-slate-200">
                    <td className="font-medium text-slate-800 dark:text-slate-100">{orderNumber}</td>
                    <td className="text-slate-700 dark:text-slate-300">{customerName}</td>
                    <td className="text-slate-700 dark:text-slate-300">{formatCurrency(orderAmount)}</td>
                    <td>
                      <ModuleStatusBadge status={paymentStatus} />
                    </td>
                    <td>
                      <ModuleStatusBadge status={orderStatus} />
                    </td>
                  </tr>
                )
              }}
            />
          )}
        </ModuleCard>

        <ModuleCard
          title="Low Stock Products"
          actions={
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={() => navigate('/products')}
            >
              View Products
            </Button>
          }
        >
          {stats.lowStockProducts.length === 0 ? (
            <ModuleEmptyState
              compact
              title="No low stock products"
              description="Products with low inventory will appear here."
              className="dark:border-slate-800/90 dark:bg-slate-900/60"
            />
          ) : (
            <ModuleTable
              compact
              columns={lowStockColumns}
              data={stats.lowStockProducts.slice(0, 5)}
              emptyMessage="No low stock products."
              renderRow={(product, index) => {
                const productId =
                  product?._id || product?.id || `low-stock-product-${index}`
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
        </ModuleCard>

        <ModuleCard
          title="Recent Activity"
          actions={
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={() => navigate('/activity-logs')}
            >
              View Activity Logs
            </Button>
          }
        >
          {activityWarning ? (
            <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300">
              {activityWarning}
            </p>
          ) : null}
          {stats.recentActivity.length === 0 ? (
            <ModuleEmptyState
              compact
              title="No recent activity"
              description="Recent admin actions will appear here."
              className="dark:border-slate-800/90 dark:bg-slate-900/60"
            />
          ) : (
            <ModuleTable
              compact
              columns={activityColumns}
              data={stats.recentActivity.slice(0, 5)}
              emptyMessage="No recent activity found."
              renderRow={(item, index) => {
                const id = item?._id || item?.id || `activity-row-${index}`
                return (
                  <tr key={id} className="text-slate-700 dark:text-slate-200">
                    <td className="text-slate-700 dark:text-slate-300">
                      {formatDateTime(item?.createdAt || item?.updatedAt)}
                    </td>
                    <td className="font-medium text-slate-800 dark:text-slate-100">
                      {getTextValue(item?.module)}
                    </td>
                    <td className="text-slate-700 dark:text-slate-300">{getTextValue(item?.action)}</td>
                    <td className="text-slate-700 dark:text-slate-300">{getTextValue(item?.description)}</td>
                  </tr>
                )
              }}
            />
          )}
        </ModuleCard>

        <ModuleCard title="Quick Links">
          <ModuleActions>
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {quickLinks.map((item) => {
                const Icon = item.icon

                return (
                  <Button
                    key={item.to}
                    type="button"
                    variant="outline"
                    className="h-auto justify-start rounded-xl border-slate-200 bg-white px-3 py-3 text-left text-slate-800 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                    onClick={() => navigate(item.to)}
                  >
                    <div className="flex w-full items-start gap-3">
                      <div className="mt-0.5 rounded-md bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {item.label}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                          {item.helper}
                        </p>
                      </div>
                    </div>
                  </Button>
                )
              })}
            </div>
          </ModuleActions>
        </ModuleCard>
      </div>
    </section>
  )
}

export default Dashboard
