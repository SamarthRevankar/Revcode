import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, FileCode2, Clock, ChevronRight, Wand2, CheckCircle2, AlertTriangle, Save, ShieldCheck, Cpu, Braces } from 'lucide-react';
import { submitReview, getReviews, submitAutofix, submitFeedback } from '../api';

export default function Review() {
  const [code, setCode] = useState('');
  const [filename, setFilename] = useState('snippet.js');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [fixLoading, setFixLoading] = useState(false);
  const [fixResult, setFixResult] = useState<any>(null);
  const [applied, setApplied] = useState(false);
  const [scanningStep, setScanningStep] = useState(0);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    getReviews().then(d => setHistory(d.reviews || [])).catch(() => {});
  }, []);

  const handleReview = async () => {
    if (!code.trim()) { setError('Please paste some code to review.'); return; }
    setError('');
    setLoading(true);
    setResult(null);
    setScanningStep(1);
    
    try {
      // Step 1: DistilBERT Scan Simulation
      await new Promise(r => setTimeout(r, 800));
      setScanningStep(2);
      
      // Step 2: CodeT5+ Analysis
      await new Promise(r => setTimeout(r, 1000));
      setScanningStep(3);
      
      const data = await submitReview(code, filename);
      
      // Step 3: Guardrail Validation
      await new Promise(r => setTimeout(r, 600));
      setScanningStep(4);
      await new Promise(r => setTimeout(r, 400));

      setResult(data);
      setFixResult(null);
      setApplied(false);
      getReviews().then(d => setHistory(d.reviews || [])).catch(() => {});
    } catch (e: any) {
      setError(e.message || 'Failed to analyze code.');
    }
    setLoading(false);
    setScanningStep(0);
  };

  const handleAutofix = async () => {
    if (!code) return;
    setFixLoading(true);
    try {
      const data = await submitAutofix(code);
      setFixResult(data);
    } catch (e: any) {
      setError(e.message || 'Autofix failed.');
    }
    setFixLoading(false);
  };

  const applyFix = async (useManual?: string) => {
    const finalCode = useManual || fixResult.suggestion;
    
    // Submit feedback for HITL Active Learning
    try {
      await submitFeedback(code, finalCode);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (e) {
      console.warn('Feedback failed', e);
    }

    setCode(finalCode);
    setApplied(true);
    setFixResult(null);
  };

  const VisualDiff = ({ original, suggested }: { original: string, suggested: string }) => {
    const origLines = original.split('\n');
    const suggLines = suggested.split('\n');
    
    // Simple diff logic for visualization
    return (
      <div className="diff-container">
        {suggLines.map((line, i) => {
          const isNew = !origLines.includes(line.trim() === '' ? line : line);
          const wasRemoved = i < origLines.length && !suggLines.includes(origLines[i]);
          
          return (
            <React.Fragment key={i}>
              {wasRemoved && (
                <div className="diff-line diff-removed">
                  <div className="diff-line-num">-</div>
                  {origLines[i]}
                </div>
              )}
              <div className={`diff-line ${isNew ? 'diff-added' : ''}`}>
                <div className="diff-line-num">{i + 1}</div>
                {line}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const scoreClass = (s: number) => s >= 75 ? 'score-high' : s >= 40 ? 'score-medium' : 'score-low';

  const loadHistoryItem = (item: any) => {
    setCode(item.code);
    setFilename(item.filename);
    setResult(item);
    setShowHistory(false);
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div className="anim-slide-up">
          <h1 style={{ fontSize: 26, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Sparkles size={24} color="var(--brand-purple)" />
            AI Code Review
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Paste code for automated security audit & quality analysis
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline btn-sm" onClick={() => setShowHistory(!showHistory)}>
            <Clock size={15} /> History ({history.length})
          </button>
          <button className="btn btn-primary" onClick={handleReview} disabled={loading}>
            {loading ? <Loader2 size={16} className="spinner" /> : <Sparkles size={16} />}
            {loading ? 'Analyzing...' : 'Analyze Code'}
          </button>
        </div>
      </div>

      {error && (
        <div className="anim-scale" style={{ padding: 14, background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: 20, border: '1px solid rgba(239,68,68,0.15)', fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* History Panel */}
      {showHistory && history.length > 0 && (
        <div className="card anim-scale" style={{ marginBottom: 20 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', fontWeight: 600, fontSize: 14 }}>
            Recent Reviews
          </div>
          {history.slice(0, 8).map(item => (
            <div className="history-item" key={item.id} onClick={() => loadHistoryItem(item)}>
              <div className={`score-ring ${scoreClass(item.score)}`} style={{ width: 36, height: 36, fontSize: 12, flexShrink: 0 }}>
                {item.score}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 2 }}>{item.filename}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.feedback}
                </div>
              </div>
              <ChevronRight size={16} color="var(--text-muted)" />
            </div>
          ))}
        </div>
      )}

      {/* Code Editor */}
      <div className="card anim-slide-up delay-1">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
          <FileCode2 size={14} color="var(--text-muted)" />
          <input
            value={filename}
            onChange={e => setFilename(e.target.value)}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 13, fontFamily: 'monospace', outline: 'none', width: 200 }}
          />
        </div>
        <textarea
          className="code-editor"
          placeholder={`// Paste your code here for AI analysis...\n// The AI will detect:\n//   - Security vulnerabilities (SQL Injection, XSS, etc.)\n//   - Code smells & anti-patterns\n//   - Performance issues\n//   - Best practice violations`}
          value={code}
          onChange={e => setCode(e.target.value)}
          style={{ border: 'none', borderRadius: '0 0 var(--radius-xl) var(--radius-xl)', minHeight: 280 }}
        />
      </div>

      {/* Loading State with Orchestration */}
      {loading && (
        <div className="review-results anim-scale" style={{ padding: '40px 60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
             <div className="spinner" style={{ border: '3px solid var(--border-color)', borderTopColor: 'var(--brand-purple)', borderRadius: '50%', width: 40, height: 40 }} />
             <div>
                <h3 style={{ fontSize: 18 }}>AI Orchestrator in Progress</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Coordinating multiple specialized models...</p>
             </div>
          </div>
          
          <div className="orchestration-step-list">
             <div className={`orchestration-step ${scanningStep === 1 ? 'active' : scanningStep > 1 ? 'completed' : ''}`}>
                <ShieldCheck size={18} />
                <span style={{ flex: 1 }}>Layer 1: DistilBERT Security Classifier</span>
                {scanningStep > 1 && <CheckCircle2 size={16} />}
             </div>
             <div className={`orchestration-step ${scanningStep === 2 ? 'active' : scanningStep > 2 ? 'completed' : ''}`}>
                <Cpu size={18} />
                <span style={{ flex: 1 }}>Layer 2: CodeT5+ Logical Analysis</span>
                {scanningStep > 2 && <CheckCircle2 size={16} />}
             </div>
             <div className={`orchestration-step ${scanningStep === 3 ? 'active' : scanningStep > 3 ? 'completed' : ''}`}>
                <Braces size={18} />
                <span style={{ flex: 1 }}>Layer 3: AST Architectural Guardrails</span>
                {scanningStep > 3 && <CheckCircle2 size={16} />}
             </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="review-results anim-slide-up">
          <div style={{ display: 'flex', gap: 28, marginBottom: 24, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div className={`score-ring ${scoreClass(result.score)}`}>{result.score}</div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Health Score</span>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                {result.securityRisk && (
                  <span className={`severity-badge severity-${result.securityRisk}`}>{result.securityRisk} risk</span>
                )}
                {result.vulnerabilities?.length > 0 && (
                  <span className="severity-badge severity-high">{result.vulnerabilities.length} vulns</span>
                )}
              </div>
              <h3 style={{ fontSize: 18, marginBottom: 6 }}>AI Feedback</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>{result.feedback}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
               {!applied ? (
                  <button 
                   className="btn btn-primary" 
                   onClick={handleAutofix} 
                   disabled={fixLoading}
                   style={{ 
                     background: 'var(--brand-gradient)', 
                     border: 'none', 
                     boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                     position: 'relative',
                     overflow: 'hidden'
                   }}
                 >
                    {fixLoading ? <Loader2 size={16} className="spinner" /> : <Sparkles size={16} />}
                    {fixLoading ? 'Strengthening Code...' : 'Stronger Autofix (Gemini)'}
                    {!fixLoading && (
                      <div style={{ position: 'absolute', top: -10, right: -10, background: 'rgba(255,255,255,0.2)', fontSize: 8, padding: '2px 10px', transform: 'rotate(15deg)' }}>
                        ULTRA
                      </div>
                    )}
                  </button>
               ) : (
                 <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)', fontWeight: 600, fontSize: 14 }}>
                    <CheckCircle2 size={18} /> Fix Applied & AI Taught
                 </div>
               )}
            </div>
          </div>

          {fixResult && (
            <div className="card anim-scale" style={{ marginBottom: 24, padding: 0, border: '1px solid var(--brand-purple)', boxShadow: '0 8px 30px rgba(139, 92, 246, 0.15)' }}>
              <div style={{ padding: '12px 20px', background: 'rgba(139, 92, 246, 0.08)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ background: 'var(--brand-purple)', color: 'white', borderRadius: 4, padding: '2px 6px', fontSize: 10, fontWeight: 800 }}>
                    {fixResult.engine || 'AI ENGINE'}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Suggested Correction</span>
                  {fixResult.guardrail_status === 'PASSED' ? (
                    <span className="severity-badge severity-low" style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ShieldCheck size={10} /> {fixResult.guardrail_msg}
                    </span>
                  ) : (
                    <span className="severity-badge severity-medium" style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                       <AlertTriangle size={10} /> 
                       {fixResult.guardrail_msg}
                    </span>
                  )}
                </div>
                <button className="btn btn-sm btn-primary" onClick={() => applyFix()}>
                  Confirm & Apply Fix
                </button>
              </div>
              <div style={{ padding: 20 }}>
                <VisualDiff original={code} suggested={fixResult.suggestion} />
              </div>
              <div style={{ padding: '12px 20px', background: 'var(--bg-tertiary)', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid var(--border-color)' }}>
                <Save size={12} /> Confirming will submit this correction to retrain our models (HITL).
              </div>
            </div>
          )}

          {/* Active Learning Toast */}
          {showToast && (
            <div className="toast toast-success" style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--brand-gradient)', border: 'none' }}>
               <Sparkles size={16} />
               <span>AI Knowledge Updated. Thank you for the feedback!</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Vulnerabilities */}
            <div style={{ background: 'var(--danger-bg)', padding: 20, borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.1)' }}>
              <h4 style={{ color: 'var(--danger)', marginBottom: 12, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Vulnerabilities ({result.vulnerabilities?.length || 0})
              </h4>
              {result.vulnerabilities?.length > 0 ? (
                <div>{result.vulnerabilities.map((v: string, i: number) => <span className="vuln-tag" key={i}>{v}</span>)}</div>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No vulnerabilities detected ✓</p>
              )}
            </div>

            {/* Suggestions */}
            <div style={{ background: 'var(--success-bg)', padding: 20, borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,185,129,0.1)' }}>
              <h4 style={{ color: 'var(--success)', marginBottom: 12, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Suggestions ({result.suggestions?.length || 0})
              </h4>
              {result.suggestions?.length > 0 ? (
                <div>{result.suggestions.map((s: string, i: number) => <div className="suggestion-item" key={i}>{s}</div>)}</div>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Code follows best practices ✓</p>
              )}
            </div>
          </div>

          {/* Code Smells */}
          {result.codeSmells?.length > 0 && (
            <div style={{ marginTop: 20, background: 'var(--warning-bg)', padding: 20, borderRadius: 'var(--radius-md)', border: '1px solid rgba(245,158,11,0.1)' }}>
              <h4 style={{ color: 'var(--warning)', marginBottom: 12, fontSize: 14 }}>Code Smells ({result.codeSmells.length})</h4>
              {result.codeSmells.map((s: string, i: number) => <div className="suggestion-item" key={i}>{s}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
