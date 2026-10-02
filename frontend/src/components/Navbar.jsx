import React from 'react';
import { CreditCard, LogOut, UserCheck } from 'lucide-react';

export default function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar">
      <div className="brand">
        <div className="brand-icon">
          <CreditCard size={24} />
        </div>
        <span>PayFlow</span>
      </div>

      <div className="user-badge">
        {user ? (
          <>
            <span style={{ fontSize: '0.92rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserCheck size={18} color="#10b981" />
              {user.username}
            </span>
            <button className="btn-secondary" onClick={onLogout} title="Sign Out">
              <LogOut size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Logout
            </button>
          </>
        ) : (
          <span style={{ fontSize: '0.88rem', color: '#64748b' }}>Please sign in to manage expenses</span>
        )}
      </div>
    </nav>
  );
}
