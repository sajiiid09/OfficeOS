/**
 * AdminMenu — Sidebar navigation for super_admin / sub_admin users.
 * Pure presentational. Logout logic delegated to useLogout hook.
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLogout } from '../hooks/useLogout';

/** @type {Array<{ to: string, icon: string, label: string }>} */
const MAIN_LINKS = [
  { to: '/home', icon: 'fas fa-home', label: 'Dashboard' },
  { to: '/chat', icon: 'fas fa-comments', label: 'Chat Room' },
  { to: '/employees', icon: 'fas fa-users', label: 'Employees' },
  { to: '/leaders', icon: 'fas fa-user-friends', label: 'Leaders' },
  { to: '/admins', icon: 'fas fa-users-cog', label: 'Admins' },
  { to: '/teams', icon: 'fas fa-fire', label: 'Teams' },
  { to: '/attendance', icon: 'fas fa-user', label: 'Attendance' },
  { to: '/admin/attendance-management', icon: 'fas fa-user-edit', label: 'Manage Attendance' },
  { to: '/leaves', icon: 'fas fa-book', label: 'Leaves' },
  { to: '/assignSalary', icon: 'fas fa-pen', label: 'Assign Salary' },
  { to: '/salaries', icon: 'fas fa-piggy-bank', label: 'Salaries' },
  { to: '/admin/problems', icon: 'fas fa-exclamation-triangle', label: 'User Problems' },
  { to: '/admin/progress', icon: 'fas fa-chart-line', label: 'Progress Logs' },
  { to: '/admin/invitations', icon: 'fas fa-history', label: 'Invitations' },
  { to: '/admin/empires', icon: 'fas fa-building', label: 'Employers' },
];

const STARTER_LINKS = [
  { to: '/inviteuser', icon: 'fas fa-envelope-open-text', label: 'Invite User' },
  { to: '/addteam', icon: 'fas fa-address-card', label: 'Add Team' },
  { to: '/Addtask', icon: 'far fa-square', label: 'Assign Task' },
  { to: '/letterhead', icon: 'far fa-file-alt', label: 'Letterhead' },
];

const AdminMenu = () => {
  const logout = useLogout();

  return (
    <ul className="sidebar-menu overflow-auto">
      {MAIN_LINKS.map(({ to, icon, label }) => (
        <li key={to}>
          <NavLink className="nav-link" to={to}>
            <i className={icon} aria-hidden="true" /> <span>{label}</span>
          </NavLink>
        </li>
      ))}

      <li className="menu-header">Starter</li>

      {STARTER_LINKS.map(({ to, icon, label }) => (
        <li key={to}>
          <NavLink className="nav-link" to={to}>
            <i className={icon} aria-hidden="true" /> <span>{label}</span>
          </NavLink>
        </li>
      ))}

      <li>
        <button
          type="button"
          className="nav-link"
          onClick={logout}
          style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
        >
          <i className="fas fa-sign-out-alt" aria-hidden="true" /> <span>Logout</span>
        </button>
      </li>
    </ul>
  );
};

export default AdminMenu;
