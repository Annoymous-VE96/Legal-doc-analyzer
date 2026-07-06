import React from 'react';
import './AnalysisPanel.css';

const severityColor = { High: '#e05252', Medium: '#e0c052', Low: '#52c97a' };

export default function AnalysisPanel({ analysis, loading, onAnalyze }) {
  if (loading) return <div className="analysis-loading">Analyzing document...</div>;

  if (!analysis) {
    return (
      <div className="analysis-empty">
        <p>No analysis yet.</p>
        <button className="analyze-btn" onClick={onAnalyze}>Analyze Document</button>
      </div>
    );
  }

  return (
    <div className="analysis-panel">
      <div className="analysis-card">
        <h4>Summary</h4>
        <p>{analysis.summary}</p>
      </div>

      <div className="analysis-card">
        <h4>Clauses</h4>
        {analysis.clauses.map((c, i) => (
          <div key={i} className="clause-item">
            <strong>{c.title}</strong>
            <p>{c.text}</p>
          </div>
        ))}
      </div>

      <div className="analysis-card">
        <h4>Risks</h4>
        {analysis.risks.map((r, i) => (
          <div key={i} className="risk-item">
            <span className="risk-badge" style={{ background: severityColor[r.severity] }}>
              {r.severity}
            </span>
            <strong>{r.clause}</strong>
            <p>{r.reason}</p>
          </div>
        ))}
      </div>

      <div className="analysis-card">
        <h4>Improvements</h4>
        <ul>
          {analysis.improvements.map((imp, i) => <li key={i}>{imp}</li>)}
        </ul>
      </div>
    </div>
  );
}