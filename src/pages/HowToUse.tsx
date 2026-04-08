import React from 'react';
import { BookOpen, Code2, Shield, Zap, GitBranch, Eye } from 'lucide-react';

export default function HowToUse() {
  const steps = [
    {
      icon: GitBranch, color: '#3b82f6',
      title: '1. Connect Your Repositories',
      description: 'Sign in with GitHub, GitLab, Bitbucket, or Azure DevOps to automatically sync your repositories. Revcode AI will analyze your codebase structure and prepare it for review.',
    },
    {
      icon: Code2, color: '#8b5cf6',
      title: '2. AI Code Review',
      description: 'Paste any code snippet or select a repository file for instant AI-powered analysis. Our AI detects security vulnerabilities (SQL injection, XSS, code injection), code smells, and anti-patterns.',
    },
    {
      icon: Shield, color: '#10b981',
      title: '3. Cloud Security Scanning',
      description: 'Run automated cloud security scans on your repositories. Detect IAM misconfigurations, exposed secrets, open ports, unencrypted storage, and compliance violations.',
    },
    {
      icon: Zap, color: '#f59e0b',
      title: '4. Auto-Fix Suggestions',
      description: 'Get actionable remediation steps for every issue found. Revcode AI provides specific code fixes, configuration changes, and best practices to resolve vulnerabilities instantly.',
    },
    {
      icon: Eye, color: '#ef4444',
      title: '5. Continuous Monitoring',
      description: 'Track your code health over time with score history, vulnerability trends, and team-wide dashboards. Set up alerts for critical issues and track remediation progress.',
    },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="anim-slide-up" style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 26, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <BookOpen size={24} color="var(--brand-blue)" />
          How to Use Revcode AI
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Get started with AI-powered code review and security scanning in minutes
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {steps.map((step, i) => (
          <div
            key={i}
            className="card anim-slide-up"
            style={{ padding: 24, display: 'flex', gap: 20, alignItems: 'flex-start', animationDelay: `${i * 0.1}s` }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 'var(--radius-md)', flexShrink: 0,
              background: `${step.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${step.color}25`,
            }}>
              <step.icon size={22} color={step.color} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, marginBottom: 6 }}>{step.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card anim-slide-up delay-4" style={{ padding: 28, marginTop: 24, textAlign: 'center', background: 'var(--bg-glass)', backdropFilter: 'blur(12px)' }}>
        <h3 style={{ marginBottom: 8 }}>Supported Languages</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
          Revcode AI supports 30+ programming languages including:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C#', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'C++', 'Dart', 'Scala', 'HTML/CSS'].map(lang => (
            <span key={lang} className="badge badge-public" style={{ fontSize: 12 }}>{lang}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
