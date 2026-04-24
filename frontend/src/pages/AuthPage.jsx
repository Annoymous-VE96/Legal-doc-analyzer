import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const [mode, setMode] = useState(params.get('mode') || 'login');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const m = new URLSearchParams(location.search).get('mode');
    if (m) setMode(m);
  }, [location.search]);

  const handleSubmit = async () => {
    setMessage('');
    const url = mode === 'login'
      ? 'http://localhost:8000/login'
      : 'http://localhost:8000/register';

    const body = mode === 'login'
      ? { email, password }
      : { name, email, password };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (response.ok) {
      navigate('/chat');
    } else {
      setMessage(data.detail);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>

        {/* Logo */}
        <div style={styles.logo}>⚖️ LexAI</div>

        {/* Toggle */}
        <div style={styles.toggle}>
          <button
            style={mode === 'login' ? styles.activeTab : styles.inactiveTab}
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button
            style={mode === 'signup' ? styles.activeTab : styles.inactiveTab}
            onClick={() => setMode('signup')}
          >
            Sign Up
          </button>
        </div>

        {/* Fields */}
        {mode === 'signup' && (
          <input
            style={styles.input}
            placeholder="Full Name"
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        {message && <p style={styles.message}>{message}</p>}

        <button style={styles.btn} onClick={handleSubmit}>
          {mode === 'login' ? 'Sign In →' : 'Create Account →'}
        </button>

        <p style={styles.switchText}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <span
            style={styles.switchLink}
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login' ? 'Sign Up' : 'Login'}
          </span>
        </p>

      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    background: '#0d0d0d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    background: '#141414',
    border: '1px solid #222',
    borderRadius: '12px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '380px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  logo: {
    textAlign: 'center',
    fontSize: '1.4rem',
    color: '#c9a84c',
    fontFamily: 'Georgia, serif',
    fontWeight: 'bold',
    marginBottom: '0.5rem',
  },
  toggle: {
    display: 'flex',
    background: '#1a1a1a',
    borderRadius: '8px',
    padding: '4px',
  },
  activeTab: {
    flex: 1,
    background: '#c9a84c',
    color: '#0d0d0d',
    border: 'none',
    padding: '0.5rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.9rem',
  },
  inactiveTab: {
    flex: 1,
    background: 'transparent',
    color: '#888',
    border: 'none',
    padding: '0.5rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  input: {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    color: '#ececec',
    fontSize: '0.9rem',
    outline: 'none',
  },
  btn: {
    background: '#c9a84c',
    border: 'none',
    color: '#0d0d0d',
    padding: '0.75rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.95rem',
    marginTop: '0.5rem',
  },
  message: {
    color: '#e05252',
    fontSize: '0.85rem',
    margin: 0,
    textAlign: 'center',
  },
  switchText: {
    color: '#666',
    fontSize: '0.85rem',
    textAlign: 'center',
    margin: 0,
  },
  switchLink: {
    color: '#c9a84c',
    cursor: 'pointer',
  },
};

export default AuthPage;