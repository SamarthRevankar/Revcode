import React from 'react';
import { Home, Code2, Cloud, Book, Settings, LifeBuoy, LogOut, Shield } from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  user: any;
}

export default function Sidebar({ currentPage, onNavigate, user }: SidebarProps) {
  const links = [
    { id: 'dashboard', icon: Home, label: 'Repositories' },
    { id: 'review', icon: Code2, label: 'AI Code Review' },
    { id: 'cloud', icon: Shield, label: 'Security' },
    { id: 'howto', icon: Book, label: 'How to Use' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="url(#sg)" strokeWidth="2" />
          <path d="M12 8V16" stroke="url(#sg)" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 12H16" stroke="url(#sg)" strokeWidth="2" strokeLinecap="round" />
          <defs><linearGradient id="sg" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3B82F6" /><stop offset="1" stopColor="#8B5CF6" />
          </linearGradient></defs>
        </svg>
        <span className="sidebar-logo-text">Revcode AI</span>
      </div>

      <select className="sidebar-select" defaultValue={user?.username || 'PUNITH HU'}>
        <option>{user?.username || 'PUNITH HU'}</option>
      </select>

      <nav className="sidebar-nav">
        {links.map(link => (
          <button
            key={link.id}
            className={`sidebar-link ${currentPage === link.id ? 'active' : ''}`}
            onClick={() => onNavigate(link.id)}
          >
            <link.icon size={18} />
            {link.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button className="sidebar-link" onClick={() => { }}>
          <LifeBuoy size={18} />
          Support
        </button>
        <button className="sidebar-link" onClick={() => onNavigate('logout')}>
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
