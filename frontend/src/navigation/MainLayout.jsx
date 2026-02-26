/**
 * MainLayout — Authenticated page wrapper.
 * Composes the sidebar + top navigation around page content.
 * ThemeProvider scoped here so only authenticated pages get theming.
 */

import React from 'react';
import SideBar from './sidebar';
import Navigation from './navigation';
import { ThemeProvider } from '../store/ThemeContext';

const MainLayout = ({ children }) => (
  <ThemeProvider>
    <div id="app">
      <div className="main-wrapper">
        <Navigation />
        <SideBar />
        <main id="main-content" role="main">
          {children}
        </main>
      </div>
    </div>
  </ThemeProvider>
);

export default MainLayout;
