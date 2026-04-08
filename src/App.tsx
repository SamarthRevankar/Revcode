import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Review from './pages/Review';
import CloudSecurity from './pages/CloudSecurity';
import HowToUse from './pages/HowToUse';
import SettingsPage from './pages/Settings';
import { getUser, clearToken } from './api';

export default function App() {
  const [currentPage, setCurrentPage] = useState(() => {
    return getUser() ? 'dashboard' : 'login';
  });
  const [user, setUser] = useState<any>(getUser());

  const handleLogin = () => {
    setUser(getUser());
    setCurrentPage('dashboard');
  };

  const handleNavigate = (page: string) => {
    if (page === 'logout') {
      clearToken();
      setUser(null);
      setCurrentPage('login');
      return;
    }
    setCurrentPage(page);
  };

  if (currentPage === 'login' || !user) {
    return <Login onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'review': return <Review />;
      case 'cloud': return <CloudSecurity />;
      case 'howto': return <HowToUse />;
      case 'settings': return <SettingsPage />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar currentPage={currentPage} onNavigate={handleNavigate} user={user} />
      <main className="main-area">
        {renderPage()}
      </main>
    </div>
  );
}
