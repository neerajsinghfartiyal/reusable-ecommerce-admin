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
import AdminAlert from '@/components/admin-ui/AdminAlert'
import AdminPage from '@/components/admin-ui/AdminPage'
import DashboardTabs from '@/components/admin-ui/dashboard/DashboardTabs'
import { getDashboardTabPanelId } from '@/components/admin-ui/dashboard/dashboardTabIds'
import DashboardSectionHeader from '@/components/admin-ui/dashboard/DashboardSectionHeader'
import QuickActionCard from '@/components/admin-ui/dashboard/QuickActionCard'
import MetricCard from '@/components/admin-ui/dashboard/MetricCard'
import LowStockWidget from '@/components/admin-ui/dashboard/LowStockWidget'
import QuickActionsWidget from '@/components/admin-ui/dashboard/QuickActionsWidget'
import RecentActivityWidget from '@/components/admin-ui/dashboard/RecentActivityWidget'
import RecentOrdersWidget from '@/components/admin-ui/dashboard/RecentOrdersWidget'
import DashboardAnalyticsNote from '@/components/admin-ui/dashboard/DashboardAnalyticsNote'
import PageLoading from '@/components/admin-ui/PageLoading'
import { useFormatCurrency } from '@/hooks/useFormatCurrency'
import { EMPTY_DASHBOARD_STATS, parseDashboardStats } from '@/lib/dashboardStats'

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

const getTextValue = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return '-'
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
  const formatCurrency = useFormatCurrency()
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState(EMPTY_DASHBOARD_STATS)

  useEffect(() => {
    const fetchDashboardStats = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await getDashboardStats()
        setStats(parseDashboardStats(response))
      } catch (err) {
        setError(
          err?.response?.data?.message || 'Failed to load dashboard data. Please try again.',
        )
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
      insight: 'Live catalog count',
      description: 'Current snapshot',
    },
    {
      label: 'Total Orders',
      value: stats.totalOrders,
      icon: ClipboardList,
      to: '/orders',
      accent: 'green',
      insight: 'All-time orders',
    },
    {
      label: 'Total Customers',
      value: stats.totalCustomers,
      icon: Users,
      to: '/customers',
      accent: 'violet',
      insight: 'Registered customers',
    },
    {
      label: 'Revenue',
      value: formatCurrency(stats.revenue),
      icon: DollarSign,
      to: '/orders',
      accent: 'green',
      insight: 'Paid order total',
      description: 'Current snapshot',
    },
    {
      label: 'Pending Orders',
      value: stats.pendingOrders,
      icon: PackageSearch,
      to: '/orders',
      accent: 'amber',
      trend: stats.pendingOrders > 0 ? `${stats.pendingOrders} open` : 'All clear',
      trendDirection: stats.pendingOrders > 0 ? 'neutral' : 'up',
      insight: stats.pendingOrders > 0 ? 'Needs review' : 'No pending orders',
    },
    {
      label: 'Return Requests',
      value: stats.returnRequests,
      icon: RotateCcw,
      to: '/returns',
      accent: 'rose',
      trend: stats.returnRequests > 0 ? `${stats.returnRequests} open` : 'None open',
      trendDirection: 'neutral',
      insight: stats.returnRequests > 0 ? 'Awaiting review' : 'No open returns',
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
          onViewActivityLogs={() => navigate('/activity-logs')}
          formatDateTime={formatDateTime}
          getTextValue={getTextValue}
        />
        <LowStockWidget
          products={stats.lowStockProducts}
          lowStockCount={stats.lowStockCount}
          lowStockThreshold={stats.lowStockThreshold}
          onViewProducts={() => navigate('/products')}
          getTextValue={getTextValue}
          getNumberValue={getNumberValue}
        />
      </div>

      <QuickActionsWidget actions={quickLinks} />

      <DashboardAnalyticsNote className="px-0.5" />
    </div>
  )

  const renderSalesTab = () => (
    <div className="flex flex-col gap-4 md:gap-5">
      <DashboardSectionHeader
        title="Sales"
        description="Orders, revenue, and checkout configuration at a glance."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Revenue"
          value={formatCurrency(stats.revenue)}
          icon={DollarSign}
          to="/orders"
          accent="green"
          insight="Paid order total"
          description="Current snapshot"
        />
        <MetricCard
          title="Total Orders"
          value={stats.totalOrders}
          icon={ClipboardList}
          to="/orders"
          accent="blue"
          insight="All-time orders"
        />
        <MetricCard
          title="Processing Orders"
          value={stats.processingOrders}
          icon={PackageSearch}
          to="/orders"
          accent="amber"
          insight="Orders being prepared"
        />
        <MetricCard
          title="Shipped Orders"
          value={stats.shippedOrders}
          icon={Truck}
          to="/orders"
          accent="violet"
          insight="Orders in transit or delivered pipeline"
        />
      </div>

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

      <DashboardAnalyticsNote />
    </div>
  )

  const renderInventoryTab = () => {
    const lowStockCount = stats.lowStockCount

    return (
      <div className="flex flex-col gap-4 md:gap-5">
        <DashboardSectionHeader
          title="Inventory"
          description={`Catalog size and stock alerts at or below ${stats.lowStockThreshold} units.`}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard
            title="Total Products"
            value={stats.totalProducts}
            icon={Boxes}
            to="/products"
            accent="blue"
            insight="Live catalog count"
            description="Current snapshot"
          />
          <MetricCard
            title="Low Stock Alerts"
            value={lowStockCount}
            icon={PackageSearch}
            to="/products"
            accent="amber"
            trend={lowStockCount > 0 ? `${lowStockCount} items` : 'Healthy'}
            trendDirection={lowStockCount > 0 ? 'down' : 'up'}
            description={`Products at or below ${stats.lowStockThreshold} units`}
          />
        </div>

        <section className="dashboard-section min-w-0">
          <LowStockWidget
            products={stats.lowStockProducts}
            lowStockCount={stats.lowStockCount}
            lowStockThreshold={stats.lowStockThreshold}
            onViewProducts={() => navigate('/products')}
            getTextValue={getTextValue}
            getNumberValue={getNumberValue}
          />
        </section>

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

        <DashboardAnalyticsNote />
      </div>
    )
  }

  const renderActivityTab = () => (
    <div className="flex flex-col gap-4 md:gap-5">
      <RecentActivityWidget
        activities={stats.recentActivity}
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
