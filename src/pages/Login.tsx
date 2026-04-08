import React, { useState, useEffect } from 'react';
import { loginOAuth, setToken, setUser } from '../api';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [tab, setTab] = useState<'SAAS' | 'SELF'>('SAAS');
  const [loading, setLoading] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userStr = params.get('user');
    
    if (token && userStr) {
      setToken(token);
      setUser(JSON.parse(userStr));
      onLogin();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [onLogin]);

  const handleProvider = async (provider: string) => {
    if (provider === 'github') {
      setLoading('github');
      window.location.href = 'http://localhost:3001/api/auth/github';
      return;
    }
    
    setLoading(provider);
    try {
      await loginOAuth(provider);
      onLogin();
    } catch (e: any) {
      alert(e.message || 'Login failed');
    } finally {
      setLoading('');
    }
  };

  const GithubIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
  );





  const GitlabIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24"><path d="M12 21.35l-7.19-5.227 1.06-3.26L8 6.05l2.11 6.81h3.78L16 6.05l2.13 6.813 1.06 3.26L12 21.35z" fill="#FC6D26"/></svg>
  );

  const SSOIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
  );

  return (
    <div className="auth-layout">
      <div className="auth-hero">
        <div className="auth-hero-content">
          <div className="glass-card floating anim-slide-up">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              </div>
              <h3 style={{ fontSize: 17 }}>AI to Detect & Autofix<br/>Bad Code</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, borderTop: '1px solid var(--border-color)', paddingTop: 20 }}>
              {[['30+', 'Language Support'], ['10K+', 'Developers'], ['100K+', 'Hours Saved']].map(([val, lbl]) => (
                <div key={lbl}>
                  <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>{val}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card anim-slide-up delay-2" style={{ maxWidth: 260, marginLeft: 'auto', marginRight: -40, marginTop: -12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 3 }}>↑ 14%</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>This week</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>Issues Fixed</div>
            <div style={{ fontSize: 30, fontWeight: 800 }}>500K+</div>
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-box anim-fade">
          <div className="auth-logo">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="url(#lg)" strokeWidth="2"/>
              <path d="M12 8V16" stroke="url(#lg)" strokeWidth="2" strokeLinecap="round"/>
              <path d="M8 12H16" stroke="url(#lg)" strokeWidth="2" strokeLinecap="round"/>
              <defs><linearGradient id="lg" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse"><stop stopColor="#3B82F6"/><stop offset="1" stopColor="#8B5CF6"/></linearGradient></defs>
            </svg>
            <span className="sidebar-logo-text" style={{ fontSize: 24 }}>Revcode AI</span>
          </div>

          <h2 style={{ fontSize: 22, marginBottom: 28 }}>Welcome to Revcode AI</h2>

          <div className="tab-bar">
            <button className={`tab-btn ${tab === 'SAAS' ? 'active' : ''}`} onClick={() => setTab('SAAS')}>SAAS</button>
            <button className={`tab-btn ${tab === 'SELF' ? 'active' : ''}`} onClick={() => setTab('SELF')}>Self Hosted</button>
          </div>

          {tab === 'SAAS' ? (
            <>
              <button className="provider-btn" onClick={() => handleProvider('github')} disabled={!!loading}>
                <GithubIcon /> {loading === 'github' ? 'Connecting...' : 'Sign in with GitHub'}
              </button>

              <button className="provider-btn" onClick={() => handleProvider('gitlab')} disabled={!!loading}>
                <GitlabIcon /> {loading === 'gitlab' ? 'Connecting...' : 'Sign in with GitLab'}
              </button>
            </>
          ) : (
            <>
              <button className="provider-btn" onClick={() => handleProvider('gitlab-self')} disabled={!!loading}>
                <GitlabIcon /> {loading === 'gitlab-self' ? 'Connecting...' : 'Self Hosted GitLab'}
              </button>
              <button className="provider-btn" onClick={() => handleProvider('sso')} disabled={!!loading}>
                <SSOIcon /> {loading === 'sso' ? 'Connecting...' : 'Sign in with SSO'}
              </button>
            </>
          )}

          <p style={{ marginTop: 28, fontSize: 12, color: 'var(--text-muted)' }}>
            By signing up you agree to the <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
