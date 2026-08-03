import React from 'react';
import { FileText, Activity, Sparkles, CheckCircle2 } from 'lucide-react';
import './AnalysisPanel.css';

export default function AnalysisPanel({ analysis, loading, onAnalyze }) {
  if (loading) return <div className="analysis-loading">Analyzing document...</div>;

  if (!analysis) {
    return (
      <div className="analysis-empty">
        <button className="analyze-btn" onClick={onAnalyze}>
          <Sparkles size={14} /> Analyze Document
        </button>
      </div>
    );
  }

  // Calculate stats dynamically
  const totalClauses = analysis.clauses?.length || 0;
  const totalRisks = analysis.risks?.length || 0;
  const totalImprovements = analysis.improvements?.length || 0;

  // Count risk severities
  const highRisks = analysis.risks?.filter(r => r.severity?.toLowerCase() === 'high').length || 0;
  const mediumRisks = analysis.risks?.filter(r => r.severity?.toLowerCase() === 'medium').length || 0;
  const lowRisks = analysis.risks?.filter(r => r.severity?.toLowerCase() === 'low').length || 0;

  return (
    <div className="analysis-panel">
      {/* ── Dashboard Stats Header ── */}
      <div className="analysis-stats-row">
        <div className="stat-card">
          <span className="stat-label">Total Clauses</span>
          <span className="stat-val">{totalClauses}</span>
          <span className="stat-sub">Parsed Sections</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Risk Profile</span>
          <span className="stat-val stat-val--risks">{totalRisks}</span>
          <div className="stat-risks-breakdown">
            {highRisks > 0 && <span className="badge-dot badge-dot--high">{highRisks} High</span>}
            {mediumRisks > 0 && <span className="badge-dot badge-dot--med">{mediumRisks} Med</span>}
            {lowRisks > 0 && <span className="badge-dot badge-dot--low">{lowRisks} Low</span>}
            {totalRisks === 0 && <span className="badge-dot badge-dot--none">Clear</span>}
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Improvements</span>
          <span className="stat-val">{totalImprovements}</span>
          <span className="stat-sub">Action Items</span>
        </div>
      </div>

      {/* ── Executive Summary ── */}
      <div className="analysis-card analysis-card--summary">
        <div className="analysis-card-header">
          <FileText className="card-header-icon" size={16} />
          <h4>Executive Summary</h4>
        </div>
        <p className="summary-paragraph">{analysis.summary}</p>
      </div>

      {/* ── Highlighted Clauses ── */}
      <div className="analysis-card">
        <div className="analysis-card-header">
          <FileText className="card-header-icon" size={16} />
          <h4>Key Clauses ({totalClauses})</h4>
        </div>
        <div className="clauses-timeline">
          {analysis.clauses.map((c, i) => (
            <div key={i} className="clause-timeline-item">
              <div className="clause-node">0{i + 1}</div>
              <div className="clause-timeline-content">
                <strong>{c.title}</strong>
                <p>{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Risk Assessment ── */}
      <div className="analysis-card">
        <div className="analysis-card-header">
          <Activity className="card-header-icon" size={16} />
          <h4>Risk Assessment ({totalRisks})</h4>
        </div>
        <div className="risks-list">
          {analysis.risks.map((r, i) => {
            const sev = r.severity?.toLowerCase() || 'low';
            return (
              <div key={i} className={`risk-item-card risk-item-card--${sev}`}>
                <div className="risk-item-header">
                  <span className={`risk-badge-pill risk-badge-pill--${sev}`}>
                    {r.severity} Risk
                  </span>
                  <strong>{r.clause}</strong>
                </div>
                <p>{r.reason}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Actionable Improvements ── */}
      <div className="analysis-card">
        <div className="analysis-card-header">
          <Sparkles className="card-header-icon" size={16} />
          <h4>Recommended Improvements</h4>
        </div>
        <div className="improvements-checklist">
          {analysis.improvements.map((imp, i) => (
            <div key={i} className="improvement-item">
              <CheckCircle2 className="improvement-check" size={16} />
              <p>{imp}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}