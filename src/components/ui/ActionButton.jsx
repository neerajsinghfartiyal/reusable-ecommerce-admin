function ActionButton({
  children,
  onClick,
  type = 'button',
  variant = 'ghost',
  disabled = false,
}) {
  return (
    <button
      type={type}
      className={`action-button action-button-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export default ActionButton
