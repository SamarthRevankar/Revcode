import React, { useState } from 'react';
import { Settings as SettingsIcon, User, Bell, Shield, Palette, Save } from 'lucide-react';
import { getUser } from '../api';

export default function SettingsPage() {
  const user = getUser();
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState({
    username: user?.username || '',
    email: user?.email || '',
  });
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    securityAlerts: true,
    weeklyDigest: false,
    reviewComplete: true,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'security', icon: Shield, label: 'Security' },
    { id: 'appearance', icon: Palette, label: 'Appearance' },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="anim-slide-up" style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <SettingsIcon size={24} color="var(--text-secondary)" />
          Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Manage your account preferences</p>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Tabs */}
        <div className="card anim-slide-up delay-1" style={{ width: 200, padding: 8, flexShrink: 0, height: 'fit-content' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              className={`sidebar-link ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
              style={{ fontSize: 13 }}
            >
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="card anim-slide-up delay-2" style={{ flex: 1, padding: 28 }}>
          {activeTab === 'profile' && (
            <>
              <h3 style={{ fontSize: 18, marginBottom: 20 }}>Profile Settings</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <img
                  src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.username}`}
                  alt="Avatar"
                  style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid var(--border-color)' }}
                />
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{profile.username}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Connected via {user?.provider || 'GitHub'}</div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input className="form-input" value={profile.username} onChange={e => setProfile({ ...profile, username: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} />
              </div>
              <button className="btn btn-primary" onClick={handleSave}><Save size={15} /> Save Changes</button>
            </>
          )}

          {activeTab === 'notifications' && (
            <>
              <h3 style={{ fontSize: 18, marginBottom: 20 }}>Notification Preferences</h3>
              {Object.entries(notifications).map(([key, val]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: 14, textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</span>
                  <button
                    onClick={() => setNotifications({ ...notifications, [key]: !val })}
                    style={{
                      width: 44, height: 24, borderRadius: 12, position: 'relative',
                      background: val ? 'var(--brand-blue)' : 'var(--bg-tertiary)',
                      border: `1px solid ${val ? 'var(--brand-blue)' : 'var(--border-color)'}`,
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2,
                      left: val ? 22 : 2, transition: 'left 0.2s',
                    }} />
                  </button>
                </div>
              ))}
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleSave}><Save size={15} /> Save</button>
            </>
          )}

          {activeTab === 'security' && (
            <>
              <h3 style={{ fontSize: 18, marginBottom: 20 }}>Security Settings</h3>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input className="form-input" type="password" placeholder="••••••••" />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" placeholder="••••••••" />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input className="form-input" type="password" placeholder="••••••••" />
              </div>
              <button className="btn btn-primary"><Save size={15} /> Update Password</button>
            </>
          )}

          {activeTab === 'appearance' && (
            <>
              <h3 style={{ fontSize: 18, marginBottom: 20 }}>Appearance</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>Theme</p>
              <div style={{ display: 'flex', gap: 12 }}>
                {['Dark', 'Light', 'System'].map(t => (
                  <button key={t} className={`btn ${t === 'Dark' ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }}>{t}</button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {saved && <div className="toast toast-success">✓ Settings saved successfully</div>}
    </div>
  );
}
