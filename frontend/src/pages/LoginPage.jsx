import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Login successful!');
        navigate('/home');            // redirect to home page
      } else {
        setMessage(data.detail);      // e.g. "Incorrect password"
      }

    } catch (error) {
      setMessage('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Welcome back</h2>

      <input
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {/* shows success or error message */}
      {message && <p>{message}</p>}

      <button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </div>
  );
}

export default LoginPage;