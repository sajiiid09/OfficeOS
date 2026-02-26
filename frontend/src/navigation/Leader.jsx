/**
 * LeaderMenu — Sidebar navigation for leader users.
 * Pure presentational. Logout logic delegated to useLogout hook.
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLogout } from '../hooks/useLogout';

/** @type {Array<{ to: string, icon: string, label: string }>} */
const LINKS = [
  { to: '/dashboardEmployee', icon: 'fas fa-home', label: 'Leader Dashboard' },
  { to: '/members', icon: 'fas fa-users', label: 'Members' },
  { to: '/Addtask', icon: 'fas fa-plus-circle', label: 'Assign Task' },
  { to: '/leader/tasks', icon: 'fas fa-tasks', label: 'Team Tasks' },
  { to: '/leader/problems', icon: 'fas fa-exclamation-triangle', label: 'Problems' },
  { to: '/leader/report-problem', icon: 'fas fa-bug', label: 'Report Problem' },
  { to: '/chat', icon: 'fas fa-comments', label: 'Chat Room' },
  { to: '/userAttendance', icon: 'fas fa-user-check', label: 'Attendance' },
  { to: '/applyforleave', icon: 'fas fa-pen', label: 'Apply for Leave' },
  { to: '/userLeaveApplications', icon: 'fas fa-book', label: 'Leave Applications' },
  { to: '/userSalary', icon: 'fas fa-piggy-bank', label: 'Salary' },
];

const LeaderMenu = () => {
  const logout = useLogout();

  return (
    <ul className="sidebar-menu overflow-auto">
      {LINKS.map(({ to, icon, label }) => (
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

export default LeaderMenu;
