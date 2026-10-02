import React, { useState } from 'react';
import { authAPI } from '../api';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';

export default function AuthForm({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (fieldErrors[e.target.name]) {
      setFieldErrors({ ...fieldErrors, [e.target.name]: null });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setFieldErrors({});
    setLoading(true);

    try {
      let res;
      if (mode === 'login') {
        res = await authAPI.login({
          username: formData.username,
          password: formData.password,
        });
      } else {
        res = await authAPI.register(formData);
      }

      localStorage.setItem('payflow_token', res.data.token);
      localStorage.setItem('payflow_user', JSON.stringify(res.data.user));
      onAuthSuccess(res.data.user);
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed.');
      if (err.details && typeof err.details === 'object') {
        setFieldErrors(err.details);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper card">
      <div className="tab-group">
        <button
          className={`tab-btn ${mode === 'login' ? 'active' : ''}`}
          onClick={() => { setMode('login'); setErrorMsg(''); setFieldErrors({}); }}
        >
          Login
        </button>
        <button
          className={`tab-btn ${mode === 'register' ? 'active' : ''}`}
          onClick={() => { setMode('register'); setErrorMsg(''); setFieldErrors({}); }}
        >
          Register
        </button>
      </div>

      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '16px' }}>
        {mode === 'login' ? 'Welcome back to PayFlow' : 'Create a PayFlow Account'}
      </h2>

      {errorMsg && (
        <div className="error-banner">
          <div className="error-title">
            <AlertCircle size={18} />
            {mode === 'login' ? 'Login Failed' : 'Registration Failed'}
          </div>
          <div>{errorMsg}</div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Username</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Enter username"
            required
          />
          {fieldErrors.username && (
            <div className="field-error">{Array.isArray(fieldErrors.username) ? fieldErrors.username.join(', ') : fieldErrors.username}</div>
          )}
        </div>

        {mode === 'register' && (
          <div className="form-group">
            <label className="form-label">Email (Optional)</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="user@example.com"
            />
            {fieldErrors.email && (
              <div className="field-error">{Array.isArray(fieldErrors.email) ? fieldErrors.email.join(', ') : fieldErrors.email}</div>
            )}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
          />
          {fieldErrors.password && (
            <div className="field-error">{Array.isArray(fieldErrors.password) ? fieldErrors.password.join(', ') : fieldErrors.password}</div>
          )}
        </div>

        {mode === 'register' && (
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              name="confirm_password"
              value={formData.confirm_password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
            {fieldErrors.confirm_password && (
              <div className="field-error">{Array.isArray(fieldErrors.confirm_password) ? fieldErrors.confirm_password.join(', ') : fieldErrors.confirm_password}</div>
            )}
          </div>
        )}

        <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }} disabled={loading}>
          {loading ? 'Processing...' : mode === 'login' ? (
            <><LogIn size={18} /> Sign In</>
          ) : (
            <><UserPlus size={18} /> Create Account</>
          )}
        </button>
      </form>
    </div>
  );
}
