import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import './layout.css';

export function Layout() {
  const { user, logout, hasRole } = useAuth();
  if (!user) return null;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__logo">◆</span> Tickety
        </div>

        <nav className="sidebar__nav">
          {hasRole('Agent', 'Admin') && (
            <NavLink to="/queue" className="navitem">Queue</NavLink>
          )}
          {hasRole('Requester') && (
            <NavLink to="/my-tickets" className="navitem">My Tickets</NavLink>
          )}
          <NavLink to="/new" className="navitem">New Ticket</NavLink>
          {hasRole('Admin') && (
            <NavLink to="/admin/invites" className="navitem">Invite Users</NavLink>
          )}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__avatar">{user.displayName.charAt(0).toUpperCase()}</div>
            <div className="sidebar__userinfo">
              <div className="sidebar__name">{user.displayName}</div>
              <div className="sidebar__role t-caption t-muted">{user.role}</div>
            </div>
          </div>
          <div className="sidebar__actions">
            <ThemeToggle />
            <button className="btn btn--ghost btn--sm" onClick={logout}>Sign out</button>
          </div>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
