import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  ChevronDown,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  Shield,
  ShoppingCart,
  Users,
} from 'lucide-react'

const dashboardItem = { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }

const menuSections = [
  {
    key: 'catalog',
    title: 'Catalog',
    icon: Package,
    items: [
      { label: 'Products', path: '/products' },
      { label: 'Categories', path: '/categories' },
      { label: 'Brands', path: '/brands' },
      { label: 'Unit Types', path: '/unit-types' },
      { label: 'Attributes', path: '/attributes' },
    ],
  },
  {
    key: 'sales',
    title: 'Sales',
    icon: ShoppingCart,
    items: [
      { label: 'Orders', path: '/orders' },
      { label: 'Returns / Exchanges', path: '/returns' },
      { label: 'Coupons', path: '/coupons' },
    ],
  },
  {
    key: 'customers',
    title: 'Customers',
    icon: Users,
    items: [{ label: 'Customers', path: '/customers' }],
  },
  {
    key: 'content-management',
    title: 'Content Management',
    icon: FileText,
    items: [
      { label: 'CMS Pages', path: '/pages' },
      { label: 'Media Library', path: '/media', matchPaths: ['/media', '/media-library'] },
      { label: 'Redirects', path: '/redirects' },
    ],
  },
  {
    key: 'store-management',
    title: 'Store Management',
    icon: Settings,
    items: [
      { label: 'Payment Methods', path: '/payment-methods' },
      { label: 'Shipping Methods', path: '/shipping-methods' },
      { label: 'Store Settings', path: '/store-settings' },
    ],
  },
  {
    key: 'system',
    title: 'System',
    icon: Shield,
    items: [
      { label: 'Activity Logs', path: '/activity-logs' },
      { label: 'Admin Users', path: '/admin-users' },
    ],
  },
]

function Sidebar() {
  const location = useLocation()
  const pathname = location.pathname
  const [openGroups, setOpenGroups] = useState({})

  const isPathActive = (basePath) =>
    pathname === basePath || pathname.startsWith(`${basePath}/`)

  const isItemActive = (item) => {
    if (item.isDisabled || !item.path) return false
    const pathsToMatch =
      Array.isArray(item.matchPaths) && item.matchPaths.length > 0
        ? item.matchPaths
        : [item.path]
    return pathsToMatch.some((path) => isPathActive(path))
  }

  const activeGroups = useMemo(() => {
    const activeState = {}
    menuSections.forEach((section) => {
      activeState[section.key] = section.items.some((item) => isItemActive(item))
    })
    return activeState
  }, [pathname])

  useEffect(() => {
    // Keep active route group visible while preserving user's other toggles.
    setOpenGroups((prev) => {
      const next = { ...prev }
      menuSections.forEach((section) => {
        if (activeGroups[section.key]) {
          next[section.key] = true
        } else if (next[section.key] === undefined) {
          next[section.key] = false
        }
      })
      return next
    })
  }, [activeGroups])

  const toggleGroup = (sectionKey) => {
    setOpenGroups((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }))
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">Reusable Admin</div>
      <nav className="sidebar-nav">
        <NavLink
          to={dashboardItem.path}
          className={`sidebar-link ${
            isItemActive(dashboardItem) ? 'sidebar-link-active' : ''
          }`.trim()}
          >
          <dashboardItem.icon size={16} className="sidebar-link-icon" />
          {dashboardItem.label}
        </NavLink>

        {menuSections.map((section) => (
          <div key={section.key} className="sidebar-section">
            <button
              type="button"
              className={`sidebar-group-toggle ${
                openGroups[section.key] || activeGroups[section.key]
                  ? 'sidebar-group-toggle-open'
                  : ''
              }`.trim()}
              onClick={() => toggleGroup(section.key)}
            >
              <span className="sidebar-group-title-wrap">
                <section.icon size={15} className="sidebar-group-icon" />
                <span className="sidebar-section-title">{section.title}</span>
              </span>
              <ChevronDown
                size={14}
                className={`sidebar-group-chevron ${
                  openGroups[section.key] || activeGroups[section.key]
                    ? 'sidebar-group-chevron-open'
                    : ''
                }`.trim()}
              />
            </button>

            <div
              className={`sidebar-group-content ${
                openGroups[section.key] || activeGroups[section.key]
                  ? 'sidebar-group-content-open'
                  : ''
              }`.trim()}
            >
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`sidebar-link sidebar-link-child ${
                    isItemActive(item) ? 'sidebar-link-active' : ''
                  }`.trim()}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
