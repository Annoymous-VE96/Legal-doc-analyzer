import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './AuthPage.css';

function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const [mode, setMode] = useState(params.get('mode') || 'login');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const m = new URLSearchParams(location.search).get('mode');
    if (m) setMode(m);
  }, [location.search]);

  const handleSubmit = async () => {
    if (loading) return;
    setMessage('');
    setLoading(true);

    const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const url = mode === 'login'
      ? `${BASE_URL}/login`
      : `${BASE_URL}/register`;

    const body = mode === 'login'
      ? { email, password }
      : { name, email, password };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.access_token);
        navigate('/chat');
      } else {
        setMessage(data.detail || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setMessage('Cannot connect to server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">

        {/* Logo */}
        <div className="auth-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          ⚖️ LexAI
        </div>

        {/* Header Title */}
        <h2 className="auth-header-title">
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h2>

        {/* Fields */}
        {mode === 'signup' && (
          <input
            className="auth-input"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
        )}
        <input
          className="auth-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />

        {/* Password field with show/hide toggle */}
        <div className="auth-password-wrapper">
          <input
            className="auth-password-input"
            type={showPassword ? 'text' : 'password'}
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <span
            className="auth-eye-btn"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? '🙈' : '👁️'}
          </span>
        </div>

        {message && <p className="auth-message">{message}</p>}

        <button className="auth-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <span className="auth-loading-wrap">
              <span className="auth-spinner"></span>
              {mode === 'login' ? 'Signing in...' : 'Creating account...'}
            </span>
          ) : (
            mode === 'login' ? 'Sign In →' : 'Create Account →'
          )}
        </button>

        <p className="auth-switch-text">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <span
            className="auth-switch-link"
            onClick={() => {
              if (!loading) {
                setMode(mode === 'login' ? 'signup' : 'login');
                setMessage('');
              }
            }}
          >
            {mode === 'login' ? 'Sign Up' : 'Login'}
          </span>
        </p>

      </div>
    </div>
  );
}

export default AuthPage;