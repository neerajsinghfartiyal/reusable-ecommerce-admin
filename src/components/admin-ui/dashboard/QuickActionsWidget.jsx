import DashboardSectionHeader from '@/components/admin-ui/dashboard/DashboardSectionHeader'
import QuickActionCard from '@/components/admin-ui/dashboard/QuickActionCard'
import ModuleCard from '@/components/admin-ui/ModuleCard'

function QuickActionsWidget({ actions = [] }) {
  return (
    <section className="dashboard-section">
      <ModuleCard compact tone="muted" className="dashboard-module-card">
        <DashboardSectionHeader
          compact
          title="Quick actions"
          description="Jump to frequent operational tasks."
        />
        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
          {actions.map((item) => (
            <QuickActionCard
              key={item.to}
              title={item.label}
              description={item.helper}
              icon={item.icon}
              to={item.to}
            />
          ))}
        </div>
      </ModuleCard>
    </section>
  )
}

export default QuickActionsWidget
