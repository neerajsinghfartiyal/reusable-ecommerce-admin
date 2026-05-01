const statusClassMap = {
  active: 'is-active',
  inactive: 'is-inactive',
  published: 'is-published',
  draft: 'is-draft',
  paid: 'is-paid',
  pending: 'is-pending',
  failed: 'is-failed',
  refunded: 'is-refunded',
  processing: 'is-processing',
  confirmed: 'is-confirmed',
  shipped: 'is-shipped',
  delivered: 'is-delivered',
  cancelled: 'is-cancelled',
  requested: 'is-requested',
  approved: 'is-approved',
  rejected: 'is-rejected',
  received: 'is-received',
  exchanged: 'is-exchanged',
  closed: 'is-closed',
}

function StatusBadge({ status = '', type = '' }) {
  const normalizedStatus = String(status || type || '').trim().toLowerCase()
  const className = statusClassMap[normalizedStatus] || 'is-neutral'
  const text = normalizedStatus || 'unknown'

  return <span className={`status-badge ${className}`}>{text}</span>
}

export default StatusBadge
