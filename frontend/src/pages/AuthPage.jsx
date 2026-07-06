import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './AuthPage.css';

const BASE_URL = process.env.REACT_APP_API_URL;
console.log("BASE_URL =", BASE_URL);

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

  useEffect(() => {
    const m = new URLSearchParams(location.search).get('mode');
    if (m) setMode(m);
  }, [location.search]);

  const handleSubmit = async () => {
    setMessage('');
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
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">

        {/* Logo */}
        <div className="auth-logo">⚖️ LexAI</div>

        {/* Toggle */}
        <div className="auth-toggle">
          <button
            className={mode === 'login' ? 'auth-tab auth-tab--active' : 'auth-tab auth-tab--inactive'}
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button
            className={mode === 'signup' ? 'auth-tab auth-tab--active' : 'auth-tab auth-tab--inactive'}
            onClick={() => setMode('signup')}
          >
            Sign Up
          </button>
        </div>

        {/* Fields */}
        {mode === 'signup' && (
          <input
            className="auth-input"
            placeholder="Full Name"
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <input
          className="auth-input"
          type="email"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* Password field with show/hide toggle */}
        <div className="auth-password-wrapper">
          <input
            className="auth-password-input"
            type={showPassword ? 'text' : 'password'}
            placeholder="At least 6 characters"
            onChange={(e) => setPassword(e.target.value)}
          />
          <span
            className="auth-eye-btn"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? '🙈' : '👁️'}
          </span>
        </div>

        {message && <p className="auth-message">{message}</p>}

        <button className="auth-btn" onClick={handleSubmit}>
          {mode === 'login' ? 'Sign In →' : 'Create Account →'}
        </button>

        <p className="auth-switch-text">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <span
            className="auth-switch-link"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login' ? 'Sign Up' : 'Login'}
          </span>
        </p>

      </div>
    </div>
  );
}

export default AuthPage;