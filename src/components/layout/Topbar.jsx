import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function Topbar() {
  const navigate = useNavigate()
  const { admin, logout } = useAuth()

  const adminName = admin?.name || admin?.email || 'Admin User'
  const adminRole = admin?.role || 'Admin'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="topbar">
      <div>
        <p className="topbar-name">{adminName}</p>
        <p className="topbar-role">{adminRole}</p>
      </div>
      <button type="button" className="topbar-logout-btn" onClick={handleLogout}>
        Logout
      </button>
    </header>
  )
}

export default Topbar
