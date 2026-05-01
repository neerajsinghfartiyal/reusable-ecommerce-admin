function PageHeader({ title, subtitle = '', actions = null }) {
  return (
    <div className="admin-page-header">
      <div className="admin-page-header-content">
        <h1 className="admin-page-header-title">{title}</h1>
        {subtitle ? <p className="admin-page-header-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="admin-page-header-actions">{actions}</div> : null}
    </div>
  )
}

export default PageHeader
