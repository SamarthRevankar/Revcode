import React, { useState, useEffect } from 'react';
import { Plus, RefreshCcw, Search, Database, Trash2, X, GitPullRequest, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { getRepositories, createRepository, deleteRepository, getPullRequests, getPullRequestDetail, submitReview } from '../api';

const LANG_COLORS: Record<string, string> = {
  React: '#61dafb', Javascript: '#f7df1e', Python: '#3776ab', Swift: '#fa7343',
  Java: '#f89820', 'HTML/CSS': '#e34f26', PHP: '#777bb3', TypeScript: '#3178c6',
  Go: '#00add8', Rust: '#dea584', Ruby: '#cc342d', 'C#': '#239120',
};

export default function Dashboard() {
  const [repos, setRepos] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<any>(null);
  const [pulls, setPulls] = useState<any[]>([]);
  const [loadingPulls, setLoadingPulls] = useState(false);
  const [reviewResult, setReviewResult] = useState<any>(null);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', language: 'Javascript', visibility: 'Public', description: '' });

  const load = async () => {
    setLoading(true);
    try {
      const data = await getRepositories();
      setRepos(data.repositories || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = repos.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    try {
      await createRepository(form.name, form.language, form.visibility, form.description);
      setShowAdd(false);
      setForm({ name: '', language: 'Javascript', visibility: 'Public', description: '' });
      load();
    } catch (e: any) { alert(e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this repository?')) return;
    try {
      await deleteRepository(id);
      load();
    } catch (e: any) { alert(e.message); }
  };

  const handleRepoClick = async (repo: any) => {
    if (!repo.owner) return; // Only for real GitHub repos
    setSelectedRepo(repo);
    setLoadingPulls(true);
    setReviewResult(null);
    try {
      const data = await getPullRequests(repo.owner, repo.name);
      setPulls(data.pulls || []);
    } catch (e) { console.error(e); }
    setLoadingPulls(false);
  };

  const handleReviewPR = async (pullNumber: number) => {
    setReviewingId(pullNumber);
    setReviewResult(null);
    try {
      const { diff } = await getPullRequestDetail(selectedRepo.owner, selectedRepo.name, pullNumber);
      const res = await submitReview(diff, 'pr-diff.patch', selectedRepo.id);
      setReviewResult(res);
    } catch (e: any) { alert(e.message); }
    setReviewingId(null);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Updated today';
    if (days === 1) return 'Updated 1 day ago';
    return `Updated ${days} days ago`;
  };

  return (
    <>
      <div className="card anim-slide-up">
        <div className="card-header">
          <div>
            <h1 style={{ fontSize: 24, marginBottom: 4 }}>Repositories</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{filtered.length} total repositories</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-outline btn-sm" onClick={load}>
              <RefreshCcw size={15} /> Refresh
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
              <Plus size={15} /> Add Repository
            </button>
          </div>
        </div>

        <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--border-color)' }}>
          <div className="search-box">
            <Search size={16} color="var(--text-muted)" />
            <input placeholder="Search Repositories..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 28 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ marginBottom: 16 }}>
                <div className="skeleton" style={{ height: 20, width: '40%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 14, width: '60%' }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Search size={48} />
            <h3 style={{ marginBottom: 4 }}>No repositories found</h3>
            <p>Try adjusting your search or add a new repository</p>
          </div>
        ) : (
          filtered.map((repo, i) => (
            <div className="repo-row" key={repo.id} onClick={() => handleRepoClick(repo)} style={{ animationDelay: `${i * 0.05}s`, cursor: repo.owner ? 'pointer' : 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="repo-name">{repo.name}</span>
                  <span className={`badge ${repo.visibility === 'Public' ? 'badge-public' : 'badge-private'}`}>
                    {repo.visibility}
                  </span>
                </div>
                {!repo.owner && (
                  <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(repo.id); }} title="Delete">
                    <Trash2 size={14} />
                  </button>
                )}
                {repo.owner && (
                  <GitPullRequest size={16} color="var(--text-muted)" />
                )}
              </div>
              <div className="repo-meta">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="lang-dot" style={{ background: LANG_COLORS[repo.language] || '#8b8b9e' }} />
                  {repo.language}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Database size={13} /> {repo.size} KB
                </span>
                <span>{timeAgo(repo.lastUpdated || repo.createdAt)}</span>
              </div>
              {repo.description && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: -2 }}>{repo.description}</p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Repository Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 className="modal-title" style={{ margin: 0 }}>Add Repository</h2>
              <button onClick={() => setShowAdd(false)} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Repository Name *</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="my-awesome-project" />
            </div>
            <div className="form-group">
              <label className="form-label">Language</label>
              <select className="form-select" value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}>
                {Object.keys(LANG_COLORS).map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Visibility</label>
              <select className="form-select" value={form.visibility} onChange={e => setForm({ ...form, visibility: e.target.value })}>
                <option value="Public">Public</option>
                <option value="Private">Private</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Short description..." />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={handleAdd}>
              <Plus size={16} /> Create Repository
            </button>
          </div>
        </div>
      )}

      {/* Pull Requests Modal */}
      {selectedRepo && (
        <div className="modal-overlay" onClick={() => { setSelectedRepo(null); setReviewResult(null); }}>
          <div className="modal-box" style={{ maxWidth: 700, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 className="modal-title" style={{ margin: 0 }}>Pull Requests</h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selectedRepo.fullName || selectedRepo.name}</p>
              </div>
              <button onClick={() => setSelectedRepo(null)} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>

            {loadingPulls ? (
              <div style={{ padding: 20, textAlign: 'center' }}><RefreshCcw className="spinning" /></div>
            ) : pulls.length === 0 ? (
              <p style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No open pull requests found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pulls.map(pr => (
                  <div key={pr.id} className="card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                          <GitPullRequest size={14} style={{ marginRight: 6, color: 'var(--success)' }} />
                          {pr.title}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          #{pr.number} by {pr.user.login} • {timeAgo(pr.created_at)}
                        </div>
                      </div>
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => handleReviewPR(pr.number)}
                        disabled={reviewingId === pr.number}
                      >
                        {reviewingId === pr.number ? 'Reviewing...' : 'Review PR'}
                        <ArrowRight size={14} style={{ marginLeft: 6 }} />
                      </button>
                    </div>

                    {reviewResult && reviewingId === pr.number && (
                      <div className="anim-fade" style={{ marginTop: 16, padding: 16, background: 'rgba(59,130,246,0.05)', borderRadius: 8, border: '1px solid rgba(59,130,246,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <ShieldCheck size={16} color="var(--success)" /> Review Result
                          </span>
                          <span style={{ 
                            fontSize: 18, fontWeight: 800, 
                            color: reviewResult.score > 80 ? 'var(--success)' : reviewResult.score > 50 ? 'var(--warning)' : 'var(--danger)'
                          }}>
                            {reviewResult.score}/100
                          </span>
                        </div>
                        <p style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>{reviewResult.feedback}</p>
                        {reviewResult.vulnerabilities?.length > 0 && (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <AlertCircle size={12} /> Critical Issues
                            </div>
                            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
                              {reviewResult.vulnerabilities.map((v: string, i: number) => <li key={i}>{v}</li>)}
                            </ul>
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand-blue)', marginBottom: 4 }}>Suggestions</div>
                          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
                            {reviewResult.suggestions.map((s: string, i: number) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
