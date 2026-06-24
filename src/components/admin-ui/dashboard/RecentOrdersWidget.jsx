import DashboardSectionHeader from "@/components/admin-ui/dashboard/DashboardSectionHeader"
import { Button } from "@/components/ui/button"
import ModuleCard from "@/components/admin-ui/ModuleCard"
import ModuleEmptyState from "@/components/admin-ui/ModuleEmptyState"
import ModuleStatusBadge from "@/components/admin-ui/ModuleStatusBadge"
import ModuleTable from "@/components/admin-ui/ModuleTable"

const recentOrdersColumns = [
  { key: "order", label: "Order" },
  { key: "customer", label: "Customer" },
  { key: "total", label: "Total" },
  { key: "payment", label: "Payment" },
  { key: "status", label: "Status" },
]

const viewButtonClass =
  "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"

const emptyStateClass = "dark:border-slate-800/90 dark:bg-slate-900/60"

function RecentOrdersWidget({
  orders = [],
  onViewOrders,
  formatCurrency,
  normalizeStatus,
  getTextValue,
  getNumberValue,
}) {
  const orderRows = orders.slice(0, 5)

  return (
    <ModuleCard compact className="min-w-0">
      <DashboardSectionHeader
        title="Recent Orders"
        description="Latest customer orders across the store."
        action={
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className={viewButtonClass}
            onClick={onViewOrders}
          >
            View Orders
          </Button>
        }
      />
      <div className="mt-4 min-w-0">
        {orderRows.length === 0 ? (
          <ModuleEmptyState
            compact
            title="No recent orders"
            description="New orders will appear here when customers place them."
            className={emptyStateClass}
          />
        ) : (
          <ModuleTable
            compact
            columns={recentOrdersColumns}
            data={orderRows}
            emptyMessage="No recent orders available."
            renderRow={(order, index) => {
              const orderId =
                order?._id || order?.id || order?.orderId || `recent-order-${index}`
              const customerName = getTextValue(
                order?.customerName,
                [order?.customer?.firstName, order?.customer?.lastName]
                  .filter(Boolean)
                  .join(" ")
                  .trim(),
                order?.customer?.name,
                order?.customer?.email,
                order?.user?.name,
                order?.email,
                "Customer"
              )
              const orderAmount = getNumberValue(
                order?.totalAmount,
                order?.amount,
                order?.total
              )
              const orderNumber = getTextValue(
                order?.orderNumber,
                order?.orderId,
                order?._id,
                order?.id
              )
              const paymentStatus = normalizeStatus(
                order?.paymentStatus,
                order?.payment?.status,
                "pending"
              )
              const orderStatus = normalizeStatus(
                order?.orderStatus,
                order?.status,
                "pending"
              )

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
      </div>
    </ModuleCard>
  )
}

export default RecentOrdersWidget
