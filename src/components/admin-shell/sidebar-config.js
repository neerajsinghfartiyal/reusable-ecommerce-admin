import {
  Activity,
  BookOpen,
  Boxes,
  CreditCard,
  FileText,
  Home,
  Image,
  LayoutDashboard,
  Package,
  Repeat,
  Settings,
  Shield,
  ShoppingCart,
  Tag,
  Truck,
  Users
} from "lucide-react"

export const sidebarSections = [
  {
    key: "dashboard",
    title: "Dashboard",
    icon: Home,
    items: [{ label: "Dashboard", to: "/dashboard", icon: LayoutDashboard }]
  },
  {
    key: "catalog",
    title: "Catalog",
    icon: Package,
    items: [
      { label: "Products", to: "/products", icon: Boxes },
      { label: "Categories", to: "/categories", icon: BookOpen },
      { label: "Brands", to: "/brands", icon: Tag },
      { label: "Unit Types", to: "/unit-types", icon: Package },
      { label: "Attributes", to: "/attributes", icon: Settings }
    ]
  },
  {
    key: "sales",
    title: "Sales",
    icon: ShoppingCart,
    items: [
      { label: "Orders", to: "/orders", icon: ShoppingCart },
      { label: "Returns / Exchanges", to: "/returns", icon: Repeat },
      { label: "Coupons", to: "/coupons", icon: Tag }
    ]
  },
  {
    key: "store",
    title: "Store",
    icon: Truck,
    items: [
      { label: "Payment Methods", to: "/payment-methods", icon: CreditCard },
      { label: "Shipping Methods", to: "/shipping-methods", icon: Truck },
      {
        label: "Store Settings",
        to: "/settings",
        icon: Settings,
        matchPaths: ["/settings", "/store-settings"]
      }
    ]
  },
  {
    key: "content",
    title: "Content",
    icon: FileText,
    items: [
      { label: "CMS Pages", to: "/pages", icon: FileText },
      { label: "Media Library", to: "/media", icon: Image, matchPaths: ["/media", "/media-library"] },
      { label: "Redirects", to: "/redirects", icon: Repeat }
    ]
  },
  {
    key: "system",
    title: "System",
    icon: Shield,
    items: [
      { label: "Activity Logs", to: "/activity-logs", icon: Activity },
      { label: "Admin Users", to: "/admin-users", icon: Users }
    ]
  }
]
