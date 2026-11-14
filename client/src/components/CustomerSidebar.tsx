import { Bell, Heart, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { User } from '../auth/useAuth'

interface CustomerSidebarProps {
  user: User
  activePage: 'account' | 'notifications'
}

export function CustomerSidebar({ user, activePage }: CustomerSidebarProps) {
  return (
    <aside className="customer-sidebar">
      <div className="customer-identity">
        <span className="customer-avatar" aria-hidden="true">
          {user.firstName.charAt(0).toUpperCase()}
        </span>
        <span>
          <strong>{user.firstName} {user.lastName}</strong>
          <small>{user.email}</small>
        </span>
      </div>
      <nav className="customer-navigation" aria-label="Account navigation">
        <Link
          className={`customer-navigation-link${activePage === 'account' ? ' is-active' : ''}`}
          to="/account"
          aria-current={activePage === 'account' ? 'page' : undefined}
        >
          <UserRound size={18} aria-hidden="true" />
          Profile
        </Link>
        <Link
          className={`customer-navigation-link${activePage === 'notifications' ? ' is-active' : ''}`}
          to="/notifications"
          aria-current={activePage === 'notifications' ? 'page' : undefined}
        >
          <Bell size={18} aria-hidden="true" />
          Notifications
        </Link>
        <Link className="customer-navigation-link" to="/wishlist">
          <Heart size={18} aria-hidden="true" />
          Saved items
        </Link>
      </nav>
    </aside>
  )
}
