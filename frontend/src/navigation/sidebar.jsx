/**
 * SideBar — Role-based sidebar navigation.
 * Renders the correct menu based on user type.
 * Pure presentational — no business logic.
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { NavLink } from 'react-router-dom';
import AdminMenu from './Admin';
import LeaderMenu from './Leader';
import EmployeeMenu from './Employee';

const SideBar = () => {
  const { user } = useSelector((state) => state.authSlice);

  const renderMenu = () => {
    if (['super_admin', 'sub_admin'].includes(user?.type)) return <AdminMenu />;
    if (user?.type === 'leader') return <LeaderMenu />;
    return <EmployeeMenu />;
  };

  return (
    <nav className="main-sidebar" aria-label="Sidebar Navigation">
      <aside id="sidebar-wrapper">
        {/* Brand — full sidebar */}
        <div className="sidebar-brand">
          <NavLink
            to="/home"
            className="d-flex align-items-center justify-content-center"
          >
            {/* TODO: Replace with SVG logo component */}
            <div
              className="image-placeholder"
              style={{ width: 24, height: 24, marginRight: 8, borderRadius: 4, fontSize: '0.75rem' }}
            >
              <i className="fas fa-building" aria-hidden="true" />
            </div>
            <span>OfficeOS</span>
          </NavLink>
        </div>

        {/* Brand — collapsed sidebar */}
        <div className="sidebar-brand sidebar-brand-sm">
          <NavLink to="/home" aria-label="OfficeOS Home">
            <div
              className="image-placeholder"
              style={{ width: 22, height: 22, borderRadius: 4, fontSize: '0.65rem' }}
            >
              <i className="fas fa-building" aria-hidden="true" />
            </div>
          </NavLink>
        </div>

        {/* Role-based menu */}
        {renderMenu()}
      </aside>
    </nav>
  );
};

export default SideBar;
