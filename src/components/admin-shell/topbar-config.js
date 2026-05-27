const DEFAULT_PAGE_META = {
  section: "Admin",
  title: "Admin",
  breadcrumbs: ["Admin"],
}

const ROUTE_OVERRIDES = [
  {
    match: (pathname) => pathname === "/products/create",
    section: "Catalog",
    title: "Add Product",
    breadcrumbs: ["Catalog", "Add Product"],
  },
  {
    match: (pathname) => /^\/products\/edit\/[^/]+$/.test(pathname),
    section: "Catalog",
    title: "Edit Product",
    breadcrumbs: ["Catalog", "Edit Product"],
  },
  {
    match: (pathname) => /^\/orders\/[^/]+$/.test(pathname) && pathname !== "/orders",
    section: "Sales",
    title: "Order Details",
    breadcrumbs: ["Sales", "Order Details"],
  },
  {
    match: (pathname) => /^\/returns\/[^/]+$/.test(pathname) && pathname !== "/returns",
    section: "Sales",
    title: "Return Request Details",
    breadcrumbs: ["Sales", "Return Request Details"],
  },
  {
    match: (pathname) => /^\/customers\/[^/]+$/.test(pathname) && pathname !== "/customers",
    section: "Sales",
    title: "Customer Details",
    breadcrumbs: ["Sales", "Customers", "Customer Details"],
  },
  {
    match: (pathname) => pathname === "/pages/create",
    section: "Content",
    title: "Create CMS Page",
    breadcrumbs: ["Content", "Create CMS Page"],
  },
  {
    match: (pathname) => /^\/pages\/edit\/[^/]+$/.test(pathname),
    section: "Content",
    title: "Edit CMS Page",
    breadcrumbs: ["Content", "Edit CMS Page"],
  },
]

const STATIC_ROUTES = [
  {
    paths: ["/dashboard"],
    section: "Dashboard",
    title: "Dashboard",
    breadcrumbs: ["Dashboard"],
  },
  {
    paths: ["/products"],
    section: "Catalog",
    title: "Products",
    breadcrumbs: ["Catalog", "Products"],
  },
  {
    paths: ["/product-imports"],
    section: "Catalog",
    title: "Product Imports",
    breadcrumbs: ["Catalog", "Product Imports"],
  },
  {
    paths: ["/categories"],
    section: "Catalog",
    title: "Categories",
    breadcrumbs: ["Catalog", "Categories"],
  },
  {
    paths: ["/brands"],
    section: "Catalog",
    title: "Brands",
    breadcrumbs: ["Catalog", "Brands"],
  },
  {
    paths: ["/unit-types"],
    section: "Catalog",
    title: "Unit Types",
    breadcrumbs: ["Catalog", "Unit Types"],
  },
  {
    paths: ["/attributes"],
    section: "Catalog",
    title: "Product Attributes",
    breadcrumbs: ["Catalog", "Product Attributes"],
  },
  {
    paths: ["/orders"],
    section: "Sales",
    title: "Orders",
    breadcrumbs: ["Sales", "Orders"],
  },
  {
    paths: ["/returns"],
    section: "Sales",
    title: "Returns / Exchanges",
    breadcrumbs: ["Sales", "Returns / Exchanges"],
  },
  {
    paths: ["/coupons"],
    section: "Sales",
    title: "Coupons",
    breadcrumbs: ["Sales", "Coupons"],
  },
  {
    paths: ["/customers"],
    section: "Sales",
    title: "Customers",
    breadcrumbs: ["Sales", "Customers"],
  },
  {
    paths: ["/pages"],
    section: "Content",
    title: "CMS Pages",
    breadcrumbs: ["Content", "CMS Pages"],
  },
  {
    paths: ["/media", "/media-library"],
    section: "Content",
    title: "Media Library",
    breadcrumbs: ["Content", "Media Library"],
  },
  {
    paths: ["/redirects"],
    section: "Content",
    title: "Redirects",
    breadcrumbs: ["Content", "Redirects"],
  },
  {
    paths: ["/payment-methods"],
    section: "Store",
    title: "Payment Methods",
    breadcrumbs: ["Store", "Payment Methods"],
  },
  {
    paths: ["/shipping-methods"],
    section: "Store",
    title: "Shipping Methods",
    breadcrumbs: ["Store", "Shipping Methods"],
  },
  {
    paths: ["/settings", "/store-settings"],
    section: "Store",
    title: "Store Settings",
    breadcrumbs: ["Store", "Store Settings"],
  },
  {
    paths: ["/activity-logs"],
    section: "System",
    title: "Activity Logs",
    breadcrumbs: ["System", "Activity Logs"],
  },
  {
    paths: ["/admin-users"],
    section: "System",
    title: "Admin Users",
    breadcrumbs: ["System", "Admin Users"],
  },
]

const normalizePathname = (pathname) => {
  if (!pathname || pathname === "/") {
    return "/"
  }
  return pathname.replace(/\/+$/, "") || "/"
}

export const QUICK_NAV_LINKS = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Products", to: "/products" },
  { label: "Product Imports", to: "/product-imports" },
  { label: "Orders", to: "/orders" },
  { label: "Returns / Exchanges", to: "/returns" },
  { label: "Customers", to: "/customers" },
  { label: "CMS Pages", to: "/pages" },
  { label: "Media Library", to: "/media" },
  { label: "Payment Methods", to: "/payment-methods" },
  { label: "Store Settings", to: "/settings" },
]

/** Breadcrumb line for topbar; empty when it would duplicate the page title. */
export function getBreadcrumbDisplay(breadcrumbs = [], title = "") {
  if (!Array.isArray(breadcrumbs) || breadcrumbs.length === 0) {
    return ""
  }

  if (breadcrumbs.length === 1 && breadcrumbs[0] === title) {
    return ""
  }

  if (breadcrumbs.length > 1 && breadcrumbs[breadcrumbs.length - 1] === title) {
    return breadcrumbs.slice(0, -1).join(" / ")
  }

  return breadcrumbs.join(" / ")
}

export function getPageMeta(pathname) {
  const path = normalizePathname(pathname)

  for (const override of ROUTE_OVERRIDES) {
    if (override.match(path)) {
      return {
        section: override.section,
        title: override.title,
        breadcrumbs: override.breadcrumbs,
      }
    }
  }

  const staticRoute = STATIC_ROUTES.find((route) => route.paths.includes(path))
  if (staticRoute) {
    return {
      section: staticRoute.section,
      title: staticRoute.title,
      breadcrumbs: staticRoute.breadcrumbs,
    }
  }

  return DEFAULT_PAGE_META
}

export default getPageMeta
