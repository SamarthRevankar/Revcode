import React, { useState, useEffect } from 'react';
import { Shield, Loader2, AlertTriangle, CheckCircle, RefreshCcw } from 'lucide-react';
import { getRepositories, runSecurityScan, getSecurityScans } from '../api';

export default function CloudSecurity() {
  const [repos, setRepos] = useState<any[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  const [scanning, setScanning] = useState('');
  const [selectedScan, setSelectedScan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scanStatus, setScanStatus] = useState<'idle' | 'fetching' | 'analyzing'>('idle');

  const load = async () => {
    setLoading(true);
    try {
      const [repoData, scanData] = await Promise.all([getRepositories(), getSecurityScans()]);
      setRepos(repoData.repositories || []);
      setScans(scanData.scans || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleScan = async (repoId: string) => {
    setScanning(repoId);
    setScanStatus('fetching');
    try {
      // Small artificial delay for "fetching" UX
      await new Promise(r => setTimeout(r, 1200));
      setScanStatus('analyzing');
      const result = await runSecurityScan(repoId);
      setSelectedScan(result);
      load();
    } catch (e: any) {
      alert(e.message);
    }
    setScanning('');
    setScanStatus('idle');
  };

  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="anim-slide-up" style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Shield size={24} color="var(--brand-blue)" />
          Security
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Scan your repositories for security vulnerabilities, misconfigurations, and compliance issues
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Repositories to Scan */}
        <div className="card anim-slide-up delay-1">
          <div className="card-header">
            <h3 style={{ fontSize: 16 }}>Repositories</h3>
            <button className="btn btn-outline btn-sm" onClick={load}>
              <RefreshCcw size={14} /> Refresh
            </button>
          </div>
          {loading ? (
            <div style={{ padding: 20 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 48, marginBottom: 8 }} />)}
            </div>
          ) : repos.length === 0 ? (
            <div className="empty-state"><p>No repositories. Add some first.</p></div>
          ) : (
            repos.map(repo => (
              <div key={repo.id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{repo.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{repo.language}</div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleScan(repo.id)}
                  disabled={scanning === repo.id}
                  style={{ minWidth: 100 }}
                >
                  {scanning === repo.id ? <Loader2 size={14} className="spinner" /> : <Shield size={14} />}
                  {scanning === repo.id ? (scanStatus === 'fetching' ? 'Fetching...' : 'Deep Scan...') : 'Safe Scan'}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Scan Results / History */}
        <div className="card anim-slide-up delay-2">
          <div className="card-header">
            <h3 style={{ fontSize: 16 }}>Scan Results</h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{scans.length} scans</span>
          </div>

          {selectedScan ? (
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h4 style={{ fontSize: 16, marginBottom: 4 }}>{selectedScan.repositoryName}</h4>
                  <span className={`severity-badge severity-${selectedScan.riskLevel}`}>{selectedScan.riskLevel} risk</span>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => setSelectedScan(null)}>← Back</button>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>{selectedScan.summary}</p>
              
              {selectedScan.sourceFiles?.length > 0 && (
                <div style={{ marginBottom: 20, padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', fontWeight: 600 }}>Scanned Infrastructure Files</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selectedScan.sourceFiles.map((f: string) => (
                      <span key={f} style={{ fontSize: 11, padding: '2px 8px', background: 'var(--bg-hover)', borderRadius: 4, fontFamily: 'monospace' }}>{f}</span>
                    ))}
                  </div>
                </div>
              )}
              
              <h4 style={{ fontSize: 14, marginBottom: 12 }}>Findings ({selectedScan.findings.length})</h4>
              {selectedScan.findings
                .sort((a: any, b: any) => (severityOrder[a.severity] || 9) - (severityOrder[b.severity] || 9))
                .map((f: any) => (
                  <div className="finding-row" key={f.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 500, fontSize: 14 }}>{f.title}</span>
                      <span className={`severity-badge severity-${f.severity}`}>{f.severity}</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{f.description}</p>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Type: {f.type}</span>
                  </div>
                ))}
            </div>
          ) : scans.length === 0 ? (
            <div className="empty-state">
              <Shield size={48} />
              <h3>No scans yet</h3>
              <p>Select a repository and run a scan</p>
            </div>
          ) : (
            scans.map(scan => (
              <div
                key={scan.id}
                className="history-item"
                onClick={() => setSelectedScan(scan)}
              >
                <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: scan.riskLevel === 'critical' || scan.riskLevel === 'high' ? 'var(--danger-bg)' : 'var(--success-bg)', flexShrink: 0 }}>
                  {scan.riskLevel === 'critical' || scan.riskLevel === 'high' ? <AlertTriangle size={16} color="var(--danger)" /> : <CheckCircle size={16} color="var(--success)" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{scan.repositoryName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{scan.findings.length} findings</div>
                </div>
                <span className={`severity-badge severity-${scan.riskLevel}`}>{scan.riskLevel}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
