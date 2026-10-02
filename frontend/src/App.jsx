import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AuthForm from './components/AuthForm';
import ExpenseList from './components/ExpenseList';
import { expenseAPI, authAPI } from './api';
import { RefreshCw, Zap, ShieldCheck, PieChart, Plus, X, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [cacheStatus, setCacheStatus] = useState(null);
  const [errorBanner, setErrorBanner] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [newExpense, setNewExpense] = useState({
    title: '',
    amount: '',
    category: 'Food & Dining',
    note: '',
  });
  const [modalErrors, setModalErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Idempotency Demo State
  const [demoKey, setDemoKey] = useState(`demo-key-${Math.floor(Math.random() * 10000)}`);
  const [demoResult, setDemoResult] = useState(null);
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchExpenses();
      fetchSummary();
    }
  }, [user]);

  const checkAuth = async () => {
    const token = localStorage.getItem('payflow_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await authAPI.getMe();
      setUser(res.data);
    } catch (err) {
      localStorage.removeItem('payflow_token');
      localStorage.removeItem('payflow_user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async () => {
    try {
      const res = await expenseAPI.list();
      setExpenses(res.data);
    } catch (err) {
      handleApiError(err);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await expenseAPI.summary();
      setSummary(res.data);
      setCacheStatus(res.headers.cacheStatus || 'N/A');
    } catch (err) {
      handleApiError(err);
    }
  };

  const handleApiError = (err) => {
    setErrorBanner({
      message: err.message || 'An error occurred',
      errorCode: err.errorCode || 'ERROR',
      details: err.details || {},
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('payflow_token');
    localStorage.removeItem('payflow_user');
    setUser(null);
    setExpenses([]);
    setSummary(null);
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    setModalErrors({});
    setSubmitting(true);
    setErrorBanner(null);

    try {
      await expenseAPI.create(newExpense);
      setShowModal(false);
      setNewExpense({ title: '', amount: '', category: 'Food & Dining', note: '' });
      fetchExpenses();
      fetchSummary();
    } catch (err) {
      if (err.details) {
        setModalErrors(err.details);
      }
      handleApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    setErrorBanner(null);
    try {
      await expenseAPI.delete(id);
      fetchExpenses();
      fetchSummary();
    } catch (err) {
      handleApiError(err);
    }
  };

  const runRetryDemo = async () => {
    setDemoLoading(true);
    setErrorBanner(null);

    const demoPayload = {
      title: 'Idempotency Test Transaction',
      amount: '49.99',
      category: 'Shopping',
      note: `Created with key: ${demoKey}`,
    };

    try {
      const res = await expenseAPI.create(demoPayload, demoKey);
      setDemoResult({
        status: res.status,
        isReplay: res.headers.isReplay,
        key: res.headers.idempotencyKey || demoKey,
        data: res.data,
      });
      fetchExpenses();
      fetchSummary();
    } catch (err) {
      handleApiError(err);
    } finally {
      setDemoLoading(false);
    }
  };

  const generateNewDemoKey = () => {
    setDemoKey(`demo-key-${Math.floor(Math.random() * 10000)}`);
    setDemoResult(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: '8px', color: '#64748b' }}>
        <RefreshCw className="animate-spin" size={24} />
        <span>Loading PayFlow...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-container">
        <Navbar user={null} />
        <AuthForm onAuthSuccess={(userData) => setUser(userData)} />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar user={user} onLogout={handleLogout} />

      {errorBanner && (
        <div className="error-banner">
          <div className="error-title">
            <AlertTriangle size={18} />
            {errorBanner.errorCode}: {errorBanner.message}
          </div>
          {Object.keys(errorBanner.details).length > 0 && (
            <ul className="error-details-list">
              {Object.entries(errorBanner.details).map(([key, val]) => (
                <li key={key}>
                  <strong>{key}:</strong> {Array.isArray(val) ? val.join(', ') : String(val)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Expense Summary & Caching Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 700 }}>
            <PieChart size={22} />
            <span>Financial Overview</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.8rem' }}>
              Cache: {cacheStatus === 'HIT' ? '⚡ HIT (Served from Cache)' : '🔄 MISS (Fetched from DB)'}
            </span>
            <button
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.82rem' }}
              onClick={fetchSummary}
            >
              Refresh Summary
            </button>
          </div>
        </div>

        <div className="summary-stats" style={{ marginBottom: 0 }}>
          <div className="stat-box" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}>
            <div className="stat-label" style={{ color: '#c7d2fe' }}>Total Expenses</div>
            <div className="stat-value" style={{ color: '#fff' }}>{summary?.total_expenses || 0}</div>
          </div>
          <div className="stat-box" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}>
            <div className="stat-label" style={{ color: '#c7d2fe' }}>Total Amount Spent</div>
            <div className="stat-value" style={{ color: '#38bdf8' }}>${(summary?.total_amount || 0).toFixed(2)}</div>
          </div>
          <div className="stat-box" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}>
            <div className="stat-label" style={{ color: '#c7d2fe' }}>Cache TTL</div>
            <div className="stat-value" style={{ color: '#4ade80', fontSize: '1.2rem' }}>60 Seconds</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div>
          <ExpenseList
            expenses={expenses}
            onDelete={handleDeleteExpense}
            onOpenModal={() => setShowModal(true)}
          />
        </div>

        {/* Retry Safety / Idempotency Interactive Demo Card */}
        <div>
          <div className="card">
            <div className="card-title" style={{ marginBottom: '12px' }}>
              <ShieldCheck size={20} color="#10b981" />
              <span>Retry Safety (Idempotency)</span>
            </div>
            <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '16px' }}>
              Brief Requirement: Safe write retry. Send duplicate requests with the same Idempotency-Key and observe that the second request returns the cached existing object instead of creating a duplicate row!
            </p>

            <div className="form-group">
              <label className="form-label">Current Idempotency Key</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" value={demoKey} readOnly style={{ background: '#f8fafc', fontWeight: 'bold' }} />
                <button className="btn-secondary" onClick={generateNewDemoKey} title="New Key">
                  New
                </button>
              </div>
            </div>

            <button
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginBottom: '16px' }}
              onClick={runRetryDemo}
              disabled={demoLoading}
            >
              <Zap size={18} />
              {demoLoading ? 'Sending Request...' : 'Send Idempotent Write Request'}
            </button>

            {demoResult && (
              <div
                style={{
                  padding: '14px',
                  borderRadius: '8px',
                  background: demoResult.isReplay ? '#ecfdf5' : '#eef2ff',
                  border: `1px solid ${demoResult.isReplay ? '#a7f3d0' : '#c7d2fe'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.9rem', marginBottom: '6px', color: demoResult.isReplay ? '#047857' : '#4338ca' }}>
                  <CheckCircle2 size={16} />
                  {demoResult.isReplay ? 'REPLAY DETECTED (Safe Retry!)' : 'FIRST CREATION SUCCESSFUL'}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#334155', marginBottom: '8px' }}>
                  <strong>Status Code:</strong> {demoResult.status}<br />
                  <strong>Replay Header (X-Idempotent-Replay):</strong> {demoResult.isReplay ? 'true' : 'false'}<br />
                  <strong>Created ID:</strong> {demoResult.data.id}
                </div>
                <p style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                  {demoResult.isReplay
                    ? 'Repeated request recognized! No duplicate record was created in the database.'
                    : 'Click "Send Idempotent Write Request" AGAIN to test repeat detection!'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal for Creating New Expense */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Add New Expense</h3>
              <button
                style={{ background: 'none', padding: '4px' }}
                onClick={() => setShowModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateExpense}>
              <div className="form-group">
                <label className="form-label">Expense Title</label>
                <input
                  type="text"
                  placeholder="e.g. Grocery Shopping"
                  value={newExpense.title}
                  onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                  required
                />
                {modalErrors.title && <div className="field-error">{modalErrors.title.join(', ')}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  required
                />
                {modalErrors.amount && <div className="field-error">{modalErrors.amount.join(', ')}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                >
                  <option value="Food & Dining">Food & Dining</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Travel">Travel</option>
                  <option value="Other">Other</option>
                </select>
                {modalErrors.category && <div className="field-error">{modalErrors.category.join(', ')}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Notes (Optional)</label>
                <textarea
                  placeholder="Add any extra details..."
                  rows={3}
                  value={newExpense.note}
                  onChange={(e) => setNewExpense({ ...newExpense, note: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  <Plus size={16} />
                  {submitting ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
