import React from 'react';
import { useNavigate } from 'react-router-dom';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={styles.wrapper}>
      {/* Navbar */}
      <nav style={styles.navbar}>
        <span style={styles.logo}>⚖️ LexAI</span>
        <div style={styles.navLinks}>
          <button style={styles.outlineBtn} onClick={() => navigate('/auth?mode=login')}>
            Login
          </button>
          <button style={styles.solidBtn} onClick={() => navigate('/auth?mode=signup')}>
            Sign Up
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div style={styles.hero}>
        <p style={styles.badge}>Powered by RAG + AI</p>
        <h1 style={styles.heading}>
          Analyze Legal Docs <br />
          <span style={styles.accent}>Instantly.</span>
        </h1>
        <p style={styles.subtext}>
          Upload any legal document and chat with it. Get summaries, <br />
          clause breakdowns, and instant answers — no law degree needed.
        </p>
        <button style={styles.solidBtn} onClick={() => navigate('/auth?mode=signup')}>
          Get Started Free →
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    background: '#0d0d0d',
    color: '#ececec',
    fontFamily: "'Georgia', serif",
  },
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.2rem 3rem',
    borderBottom: '1px solid #1e1e1e',
  },
  logo: {
    fontSize: '1.4rem',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
    color: '#c9a84c',
  },
  navLinks: {
    display: 'flex',
    gap: '1rem',
  },
  outlineBtn: {
    background: 'transparent',
    border: '1px solid #444',
    color: '#ececec',
    padding: '0.5rem 1.2rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  solidBtn: {
    background: '#c9a84c',
    border: 'none',
    color: '#0d0d0d',
    padding: '0.5rem 1.4rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 'bold',
  },
  hero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '6rem 2rem',
    gap: '1.2rem',
  },
  badge: {
    background: '#1a1a1a',
    border: '1px solid #333',
    color: '#c9a84c',
    padding: '0.3rem 1rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    letterSpacing: '0.08em',
  },
  heading: {
    fontSize: '3.5rem',
    lineHeight: 1.2,
    margin: 0,
    fontWeight: 'bold',
  },
  accent: {
    color: '#c9a84c',
  },
  subtext: {
    color: '#888',
    fontSize: '1rem',
    lineHeight: 1.7,
  },
};

export default LandingPage;