/**
 * Navigation — Top navbar component.
 *
 * Responsibilities:
 * - Sidebar toggle
 * - Search bar
 * - Theme toggle
 * - Notification dropdown
 * - User profile dropdown
 *
 * Notification logic kept here (socket subscription is view-coupled).
 * All hardcoded image URLs have been purged.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, NavLink } from 'react-router-dom';
import {
  dLogout,
  getNotifications,
  markNotificationRead,
  deleteNotification,
} from '../http';
import { getFileUrl } from '../utils/fileUtil';
import { setAuth } from '../store/auth-slice';
import { useTheme } from '../store/ThemeContext';
import socket from '../socket';

/* ==========================================================================
   NOTIFICATION ICON MAP
   ========================================================================== */
const NOTIF_CONFIG = {
  problem: { icon: 'fas fa-exclamation-triangle', bg: 'bg-danger' },
  salary: { icon: 'fas fa-money-bill-wave', bg: 'bg-success' },
  default: { icon: 'fas fa-comment', bg: 'bg-info' },
};

const getNotifStyle = (type) => NOTIF_CONFIG[type] || NOTIF_CONFIG.default;

/* ==========================================================================
   COMPONENT
   ========================================================================== */
const Navigation = () => {
  const { theme, toggleTheme } = useTheme();
  const user = useSelector((state) => state.authSlice.user) || {};
  const { name, image, id, _id } = user;
  const userId = id || _id;
  const dispatch = useDispatch();
  const history = useHistory();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  /* ---- Notification Fetching ---- */
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await getNotifications();
      if (res.success) setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, []);

  /* ---- Socket & Notification Subscription ---- */
  useEffect(() => {
    if (!userId) {
      socket.off('connect');
      socket.off('notification');
      if (socket.connected) socket.disconnect();
      return;
    }

    fetchNotifications();
    socket.connect();

    const handleConnect = () => socket.emit('join', userId);
    const handleNotification = (notif) =>
      setNotifications((prev) => [notif, ...prev]);

    socket.on('connect', handleConnect);
    socket.on('notification', handleNotification);

    if (socket.connected) socket.emit('join', userId);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('notification', handleNotification);
    };
  }, [userId, fetchNotifications]);

  /* ---- Notification Handlers ---- */
  const handleMarkAsRead = async (e, notif) => {
    e.preventDefault();
    try {
      await deleteNotification(notif._id);
      fetchNotifications();

      if (notif.link) {
        const rawLink = typeof notif.link === 'string' ? notif.link.trim() : '';
        const isValid =
          rawLink.startsWith('/') &&
          !rawLink.includes('[object');
        history.push(isValid ? rawLink : '/');
      }
    } catch (err) {
      console.error('Failed to mark notification:', err);
    }
  };

  const handleMarkAllRead = async (e) => {
    e.preventDefault();
    try {
      await markNotificationRead('all');
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  /* ---- Logout ---- */
  const logout = async (e) => {
    if (e) e.preventDefault();
    try {
      await dLogout();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      dispatch(setAuth(null));
      history.push('/login');
    }
  };

  /* ---- Sidebar Toggle ---- */
  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
    if (window.innerWidth <= 991) {
      document.body.classList.toggle('sidebar-show');
      document.body.classList.toggle('sidebar-gone');
    }
  };

  /* ---- Sidebar resize + backdrop click ---- */
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 991) {
        document.body.classList.remove('sidebar-show');
      }
    };

    const handleBackdropClick = (e) => {
      if (
        document.body.classList.contains('sidebar-show') &&
        !e.target.closest('.main-sidebar') &&
        !e.target.closest('#sidebarCollapse')
      ) {
        document.body.classList.remove('sidebar-show');
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousedown', handleBackdropClick);

    if (isSidebarCollapsed && window.innerWidth > 991) {
      document.body.classList.add('sidebar-mini');
    } else {
      document.body.classList.remove('sidebar-mini');
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousedown', handleBackdropClick);
    };
  }, [isSidebarCollapsed]);

  /* ---- Search ---- */
  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      history.push(`/search?q=${encodeURIComponent(q)}`);
      setSearchQuery('');
    }
  };

  /* ---- Resolved Avatar URL ---- */
  const avatarUrl = getFileUrl(image);

  return (
    <>
      <div className="navbar-bg" />
      <nav className="navbar navbar-expand-lg main-navbar" role="navigation" aria-label="Top Navigation">
        <form className="d-flex align-items-center flex-grow-1" onSubmit={handleSearch}>
          <ul className="navbar-nav mr-3">
            <li>
              <button
                type="button"
                id="sidebarCollapse"
                className="nav-link nav-link-lg"
                onClick={toggleSidebar}
                aria-label="Toggle Sidebar"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <i className="fas fa-bars" aria-hidden="true" />
              </button>
            </li>
          </ul>

          {/* Brand text */}
          <div className="d-flex align-items-center mr-3" style={{ whiteSpace: 'nowrap' }}>
            {/* TODO: Replace with SVG logo component */}
            <div
              className="image-placeholder"
              style={{ width: 32, height: 32, marginRight: 10, borderRadius: 6, fontSize: '0.85rem' }}
            >
              <i className="fas fa-building" aria-hidden="true" />
            </div>
            <span style={{ fontSize: '18px', fontWeight: 600 }}>OfficeOS</span>
          </div>

          {/* Search */}
          <div className="search-element input-group mx-auto d-none d-lg-flex" style={{ maxWidth: 400 }}>
            <input
              className="form-control"
              type="search"
              placeholder="Name, email, or mobile\u2026"
              aria-label="Search employees"
              autoComplete="off"
              spellCheck={false}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="input-group-append">
              <button className="btn btn-primary" type="submit" aria-label="Search">
                <i className="fas fa-search" aria-hidden="true" />
              </button>
            </div>
          </div>
        </form>

        {/* Theme toggle */}
        <div className="theme-toggle-wrapper mr-3 d-none d-lg-block">
          <button
            type="button"
            className="btn btn-icon btn-dark theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            style={{
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} aria-hidden="true" />
          </button>
        </div>

        <ul className="navbar-nav navbar-right">
          {/* Notifications */}
          <li className="dropdown dropdown-list-toggle d-none d-lg-block">
            <a
              href="#notifications"
              data-bs-toggle="dropdown"
              className="nav-link notification-toggle nav-link-lg"
              aria-label={`${notifications.length} notifications`}
              style={{ position: 'relative' }}
            >
              <i className="far fa-bell" aria-hidden="true" />
              {notifications.length > 0 && (
                <span
                  className="badge badge-danger"
                  style={{
                    position: 'absolute', top: 10, right: 5,
                    padding: '2px 5px', fontSize: 10, borderRadius: '50%',
                    minWidth: 18, height: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold',
                  }}
                >
                  {notifications.length}
                </span>
              )}
            </a>
            <div className="dropdown-menu dropdown-list dropdown-menu-end">
              <div className="dropdown-header">
                Notifications
                <div className="float-right">
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0"
                    onClick={handleMarkAllRead}
                  >
                    Mark All as Read
                  </button>
                </div>
              </div>
              <div className="dropdown-list-content dropdown-list-icons" aria-live="polite">
                {notifications.length > 0 ? (
                  notifications.map((notif) => {
                    const { icon, bg } = getNotifStyle(notif.type);
                    return (
                      <a
                        href="#read"
                        key={notif._id}
                        className="dropdown-item dropdown-item-unread"
                        onClick={(e) => handleMarkAsRead(e, notif)}
                      >
                        <div className={`dropdown-item-icon ${bg} text-white`}>
                          <i className={icon} aria-hidden="true" />
                        </div>
                        <div className="dropdown-item-desc">
                          {notif.message}
                          <div className="time text-primary">
                            {new Intl.DateTimeFormat(undefined, {
                              hour: 'numeric',
                              minute: 'numeric',
                            }).format(new Date(notif.createdAt))}
                          </div>
                        </div>
                      </a>
                    );
                  })
                ) : (
                  <div className="dropdown-item">
                    <div className="dropdown-item-desc text-center">
                      No new notifications
                    </div>
                  </div>
                )}
              </div>
              <div className="dropdown-footer text-center">
                <NavLink to="/">
                  View All <i className="fas fa-chevron-right" aria-hidden="true" />
                </NavLink>
              </div>
            </div>
          </li>

          {/* User dropdown */}
          <li className="dropdown">
            <a
              href="#profile"
              data-bs-toggle="dropdown"
              className="nav-link dropdown-toggle nav-link-lg nav-link-user"
            >
              <img
                alt={name ? `${name}'s avatar` : 'User avatar'}
                src={avatarUrl}
                className="rounded-circle mr-1"
                width="32"
                height="32"
                loading="lazy"
              />
              <div className="d-sm-none d-lg-inline-block">
                Hi, {name || 'User'}
              </div>
            </a>
            <div className="dropdown-menu dropdown-menu-end">
              <NavLink to="/profile" className="dropdown-item has-icon">
                <i className="far fa-user" aria-hidden="true" /> Profile
              </NavLink>
              <div className="dropdown-divider" />
              <button
                type="button"
                className="dropdown-item has-icon text-danger"
                onClick={logout}
                style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
              >
                <i className="fas fa-sign-out-alt" aria-hidden="true" /> Logout
              </button>
            </div>
          </li>
        </ul>
      </nav>
    </>
  );
};

export default Navigation;
