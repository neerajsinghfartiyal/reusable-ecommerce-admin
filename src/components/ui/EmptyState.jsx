function EmptyState({ title = 'Nothing to show', description = '', action = null }) {
  return (
    <div className="empty-state">
      <h3 className="empty-state-title">{title}</h3>
      {description ? <p className="empty-state-description">{description}</p> : null}
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  )
}

export default EmptyState
