import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';
import type { UserRow } from '../lib/types';
import { Avatar } from './Avatar';
import { ThemeToggle } from './ThemeToggle';
import {
  IconQueue, IconTicket, IconPlus, IconUsers, IconBell, IconLogout, IconChevronDown,
  IconMenu, IconClose,
} from './icons';
import './layout.css';

function pageTitle(pathname: string): string {
  if (pathname.startsWith('/queue')) return 'Queue';
  if (pathname.startsWith('/my-tickets')) return 'My Tickets';
  if (pathname.startsWith('/new')) return 'New Ticket';
  if (pathname.startsWith('/tickets/')) return 'Ticket';
  if (pathname.startsWith('/users')) return 'Users';
  if (pathname.startsWith('/admin/invites')) return 'Invite Users';
  return 'Tickety';
}

export function Layout() {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();
  const isAdmin = hasRole('Admin');
  const [navOpen, setNavOpen] = useState(false);

  // Close the mobile nav drawer whenever the route changes.
  useEffect(() => { setNavOpen(false); }, [location.pathname]);

  // Live user count for the sidebar badge (admin only; shares cache with the Users page).
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<UserRow[]>('/api/users'),
    enabled: isAdmin,
    refetchInterval: 30_000,
  });

  if (!user) return null;
  const title = pageTitle(location.pathname);

  return (
    <div className="layout">
      {navOpen && <div className="nav-backdrop" onClick={() => setNavOpen(false)} />}

      <aside className={`sidebar ${navOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          <span><span className="sidebar__logo">◆</span> Tickety</span>
          <button className="sidebar__close" aria-label="Close menu" onClick={() => setNavOpen(false)}>
            <IconClose width={18} height={18} />
          </button>
        </div>

        <nav className="sidebar__nav" onClick={() => setNavOpen(false)}>
          {hasRole('Agent', 'Admin') && (
            <NavLink to="/queue" className="navitem"><IconQueue /> <span>Queue</span></NavLink>
          )}
          {hasRole('Requester') && (
            <NavLink to="/my-tickets" className="navitem"><IconTicket /> <span>My Tickets</span></NavLink>
          )}
          <NavLink to="/new" className="navitem"><IconPlus /> <span>New Ticket</span></NavLink>
          {isAdmin && (
            <NavLink to="/users" className="navitem">
              <IconUsers /> <span>Users</span>
              {users && <span className="navitem__count">{users.length}</span>}
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin/invites" className="navitem"><IconPlus /> <span>Invite Users</span></NavLink>
          )}
        </nav>

        <div className="sidebar__foot">© {new Date().getFullYear()} Tickety</div>
      </aside>

      <div className="content">
        <header className="topbar">
          <div className="topbar__left">
            <button className="topbar__menu" aria-label="Open menu" onClick={() => setNavOpen(true)}>
              <IconMenu />
            </button>
            <div className="topbar__titles">
              <h1 className="topbar__title">{title}</h1>
              <div className="topbar__crumb">Home <span>›</span> {title}</div>
            </div>
          </div>

          <div className="topbar__right">
            <ThemeToggle />
            <button className="iconbtn" aria-label="Notifications"><IconBell /></button>

            <details className="usermenu">
              <summary className="usermenu__trigger">
                <Avatar name={user.displayName} size={32} />
                <span className="usermenu__name">{user.displayName}</span>
                <IconChevronDown width={16} height={16} />
              </summary>
              <div className="usermenu__pop">
                <div className="usermenu__head">
                  <div className="usermenu__fullname">{user.displayName}</div>
                  <div className="usermenu__role">{user.role} · {user.email}</div>
                </div>
                <button className="usermenu__item" onClick={logout}>
                  <IconLogout width={16} height={16} /> Sign out
                </button>
              </div>
            </details>
          </div>
        </header>

        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
