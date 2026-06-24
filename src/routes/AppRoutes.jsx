import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard'
import Products from '../pages/Products'
import ProductImports from '../pages/ProductImports'
import ProductForm from '../pages/ProductForm'
import Categories from '../pages/Categories'
import Brands from '../pages/Brands'
import UnitTypes from '../pages/UnitTypes'
import Attributes from '../pages/Attributes'
import Orders from '../pages/Orders'
import OrderDetails from '../pages/OrderDetails'
import Returns from '../pages/Returns'
import ReturnDetails from '../pages/ReturnDetails'
import Customers from '../pages/Customers'
import CustomerDetails from '../pages/CustomerDetails'
import Coupons from '../pages/Coupons'
import MediaLibrary from '../pages/MediaLibrary'
import Pages from '../pages/Pages'
import PageForm from '../pages/PageForm'
import Redirects from '../pages/Redirects'
import StoreSettings from '../pages/StoreSettings'
import ActivityLogs from '../pages/ActivityLogs'
import AdminUsers from '../pages/AdminUsers'
import PaymentMethods from '../pages/PaymentMethods'
import ShippingMethods from '../pages/ShippingMethods'
import AdminShell from '../components/admin-shell/AdminShell'
import Profile from '../pages/Profile'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <AdminShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/product-imports" element={<ProductImports />} />
        <Route path="/products/create" element={<ProductForm />} />
        <Route path="/products/edit/:id" element={<ProductForm />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/brands" element={<Brands />} />
        <Route path="/unit-types" element={<UnitTypes />} />
        <Route path="/attributes" element={<Attributes />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderDetails />} />
        <Route path="/returns" element={<Returns />} />
        <Route path="/returns/:id" element={<ReturnDetails />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:id" element={<CustomerDetails />} />
        <Route path="/coupons" element={<Coupons />} />
        <Route path="/media" element={<MediaLibrary />} />
        <Route path="/media-library" element={<MediaLibrary />} />
        <Route path="/pages" element={<Pages />} />
        <Route path="/pages/create" element={<PageForm />} />
        <Route path="/pages/edit/:id" element={<PageForm />} />
        <Route path="/redirects" element={<Redirects />} />
        <Route path="/payment-methods" element={<PaymentMethods />} />
        <Route path="/shipping-methods" element={<ShippingMethods />} />
        <Route path="/settings" element={<StoreSettings />} />
        <Route
          path="/store-settings"
          element={<StoreSettings />}
        />
        <Route
          path="/activity-logs"
          element={<ActivityLogs />}
        />
        <Route path="/admin-users" element={<AdminUsers />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRoutes
