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
  Tag,
  Truck,
  Users,
} from 'lucide-react'
import { getDashboardStats } from '../api/dashboardApi'
import { getActivityLogs } from '../api/activityLogApi'
import AdminAlert from '@/components/admin-ui/AdminAlert'
import AdminPage from '@/components/admin-ui/AdminPage'
import DashboardTabs, {
  getDashboardTabPanelId,
} from '@/components/admin-ui/dashboard/DashboardTabs'
import DashboardSectionHeader from '@/components/admin-ui/dashboard/DashboardSectionHeader'
import QuickActionCard from '@/components/admin-ui/dashboard/QuickActionCard'
import MetricCard from '@/components/admin-ui/dashboard/MetricCard'
import LowStockWidget from '@/components/admin-ui/dashboard/LowStockWidget'
import QuickActionsWidget from '@/components/admin-ui/dashboard/QuickActionsWidget'
import RecentActivityWidget from '@/components/admin-ui/dashboard/RecentActivityWidget'
import RecentOrdersWidget from '@/components/admin-ui/dashboard/RecentOrdersWidget'
import RevenueOverviewChart from '@/components/admin-ui/dashboard/RevenueOverviewChart'
import OrdersOverviewChart from '@/components/admin-ui/dashboard/OrdersOverviewChart'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import PageLoading from '@/components/admin-ui/PageLoading'

const DASHBOARD_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'sales', label: 'Sales' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'activity', label: 'Activity' },
]

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
  const [activeTab, setActiveTab] = useState('overview')
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
      <AdminPage headerMode="hidden">
        <PageLoading message="Loading dashboard stats..." />
      </AdminPage>
    )
  }

  if (error) {
    return (
      <AdminPage headerMode="hidden">
        <AdminAlert type="error" title="Request failed">
          {error}
        </AdminAlert>
      </AdminPage>
    )
  }

  const statCards = [
    {
      label: 'Total Products',
      value: stats.totalProducts,
      icon: Boxes,
      to: '/products',
      accent: 'blue',
      trend: '+12%',
      trendDirection: 'up',
      insight: 'vs last 7 days',
      description: 'Catalog snapshot',
    },
    {
      label: 'Total Orders',
      value: stats.totalOrders,
      icon: ClipboardList,
      to: '/orders',
      accent: 'green',
      trend: '+18 this week',
      trendDirection: 'up',
      insight: 'Order volume',
    },
    {
      label: 'Total Customers',
      value: stats.totalCustomers,
      icon: Users,
      to: '/customers',
      accent: 'violet',
      trend: '+6%',
      trendDirection: 'up',
      insight: 'vs last 7 days',
    },
    {
      label: 'Revenue',
      value: formatCurrency(stats.revenue),
      icon: DollarSign,
      to: '/orders',
      accent: 'green',
      trend: '+12.4%',
      trendDirection: 'up',
      insight: 'Paid orders',
      description: 'Demo trend indicator',
    },
    {
      label: 'Pending Orders',
      value: stats.pendingOrders,
      icon: PackageSearch,
      to: '/orders',
      accent: 'amber',
      trend: stats.pendingOrders > 0 ? `${stats.pendingOrders} open` : 'All clear',
      trendDirection: stats.pendingOrders > 0 ? 'neutral' : 'up',
      insight: stats.pendingOrders > 0 ? 'Needs review' : 'Updated today',
    },
    {
      label: 'Return Requests',
      value: stats.returnRequests,
      icon: RotateCcw,
      to: '/returns',
      accent: 'rose',
      trend: stats.returnRequests > 0 ? '-4%' : 'Stable',
      trendDirection: stats.returnRequests > 0 ? 'down' : 'neutral',
      insight: stats.returnRequests > 0 ? '3 pending review' : 'No open returns',
    },
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

  const renderOverviewTab = () => (
    <div className="flex flex-col gap-4 md:gap-5">
      <section className="dashboard-section">
        <DashboardSectionHeader
          title="Operations snapshot"
          description="Live counts from your store. Click a card to open the module."
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {statCards.map((card) => (
            <MetricCard
              key={card.label}
              title={card.label}
              value={card.value}
              icon={card.icon}
              to={card.to}
              accent={card.accent}
              trend={card.trend}
              trendDirection={card.trendDirection}
              insight={card.insight}
              description={card.description}
            />
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <DashboardSectionHeader
          title="Analytics"
          description="Revenue and order trends (demo visualization until reporting API is connected)."
        />
        <div className="mt-3 grid min-w-0 gap-4 lg:grid-cols-2">
          <RevenueOverviewChart />
          <OrdersOverviewChart />
        </div>
      </section>

      <section className="dashboard-section min-w-0">
        <RecentOrdersWidget
          orders={stats.recentOrders}
          onViewOrders={() => navigate('/orders')}
          formatCurrency={formatCurrency}
          normalizeStatus={normalizeStatus}
          getTextValue={getTextValue}
          getNumberValue={getNumberValue}
        />
      </section>

      <div className="dashboard-section dashboard-pair-row min-w-0">
        <RecentActivityWidget
          activities={stats.recentActivity}
          warning={activityWarning}
          onViewActivityLogs={() => navigate('/activity-logs')}
          formatDateTime={formatDateTime}
          getTextValue={getTextValue}
        />
        <LowStockWidget
          products={stats.lowStockProducts}
          onViewProducts={() => navigate('/products')}
          getTextValue={getTextValue}
          getNumberValue={getNumberValue}
        />
      </div>

      <QuickActionsWidget actions={quickLinks} />
    </div>
  )

  const renderSalesTab = () => (
    <div className="flex flex-col gap-4 md:gap-5">
      <DashboardSectionHeader
        title="Sales"
        description="Orders, revenue, and checkout configuration at a glance."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <MetricCard
          title="Revenue"
          value={formatCurrency(stats.revenue)}
          icon={DollarSign}
          to="/orders"
          accent="green"
          trend="+12.4%"
          trendDirection="up"
          insight="vs last 7 days"
        />
        <MetricCard
          title="Total Orders"
          value={stats.totalOrders}
          icon={ClipboardList}
          to="/orders"
          accent="blue"
          trend="+18 this week"
          trendDirection="up"
        />
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <RevenueOverviewChart />
        <OrdersOverviewChart />
      </div>

      <div className="flex flex-col gap-3">
        <DashboardSectionHeader
          title="Shortcuts"
          description="Jump to day-to-day sales tools."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            title="View Orders"
            description="Review and manage customer orders"
            icon={ShoppingCart}
            to="/orders"
          />
          <QuickActionCard
            title="Manage Coupons"
            description="Create and edit promotional codes"
            icon={Tag}
            to="/coupons"
          />
          <QuickActionCard
            title="Payment Methods"
            description="Configure checkout payment options"
            icon={CreditCard}
            to="/payment-methods"
          />
        </div>
      </div>

      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        Advanced sales analytics will appear here once reporting data is available.
      </p>
    </div>
  )

  const renderInventoryTab = () => {
    const lowStockCount = stats.lowStockProducts.length

    return (
      <div className="flex flex-col gap-4 md:gap-5">
        <DashboardSectionHeader
          title="Inventory"
          description="Catalog size and stock alerts from your current snapshot."
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard
            title="Total Products"
            value={stats.totalProducts}
            icon={Boxes}
            to="/products"
            accent="blue"
            trend="+12%"
            trendDirection="up"
            insight="vs last 7 days"
          />
          <MetricCard
            title="Low Stock Alerts"
            value={lowStockCount}
            icon={PackageSearch}
            to="/products"
            accent="amber"
            trend={lowStockCount > 0 ? `${lowStockCount} items` : 'Healthy'}
            trendDirection={lowStockCount > 0 ? 'down' : 'up'}
            description="Products flagged in current snapshot"
          />
        </div>

        <div className="flex flex-col gap-3">
          <DashboardSectionHeader
            title="Shortcuts"
            description="Manage catalog and fulfillment settings."
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <QuickActionCard
              title="View Products"
              description="Browse and update your product catalog"
              icon={Boxes}
              to="/products"
            />
            <QuickActionCard
              title="Add Product"
              description="Create a new catalog item"
              icon={PlusCircle}
              to="/products/create"
            />
            <QuickActionCard
              title="Shipping Methods"
              description="Configure shipping rules and rates"
              icon={Truck}
              to="/shipping-methods"
            />
          </div>
        </div>

        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Inventory analytics will appear here once stock movement data is available.
        </p>
      </div>
    )
  }

  const renderActivityTab = () => (
    <div className="flex flex-col gap-4 md:gap-5">
      <ModuleCard compact>
        <DashboardSectionHeader
          title="Recent audit snapshot"
          description="A quick view of the latest admin actions. Extended timelines, filters, and exports will be added in a future update."
        />
      </ModuleCard>
      <RecentActivityWidget
        activities={stats.recentActivity}
        warning={activityWarning}
        onViewActivityLogs={() => navigate('/activity-logs')}
        formatDateTime={formatDateTime}
        getTextValue={getTextValue}
        title="Latest admin actions"
        description="Most recent changes recorded across admin modules."
      />
    </div>
  )

  const renderTabPanel = () => {
    if (activeTab === 'overview') {
      return renderOverviewTab()
    }

    if (activeTab === 'sales') {
      return renderSalesTab()
    }

    if (activeTab === 'inventory') {
      return renderInventoryTab()
    }

    if (activeTab === 'activity') {
      return renderActivityTab()
    }

    return renderOverviewTab()
  }

  return (
    <AdminPage headerMode="hidden">
      <DashboardTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={DASHBOARD_TABS}
      />
      <div
        role="tabpanel"
        id={getDashboardTabPanelId(activeTab)}
        aria-labelledby={`dashboard-tab-${activeTab}`}
        className="min-w-0 outline-none"
      >
        {renderTabPanel()}
      </div>
    </AdminPage>
  )
}

export default Dashboard
