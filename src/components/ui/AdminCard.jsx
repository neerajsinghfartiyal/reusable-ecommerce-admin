function AdminCard({ title = '', children, actions = null, className = '' }) {
  return (
    <section className={`admin-card ${className}`.trim()}>
      {title || actions ? (
        <div className="admin-card-header">
          {title ? <h2 className="admin-card-title">{title}</h2> : <div />}
          {actions ? <div className="admin-card-actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className="admin-card-body">{children}</div>
    </section>
  )
}

export default AdminCard
