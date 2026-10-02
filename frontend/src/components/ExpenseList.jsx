import React from 'react';
import { Trash2, PlusCircle, CheckCircle2, DollarSign } from 'lucide-react';

export default function ExpenseList({ expenses, onDelete, onOpenModal }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <DollarSign size={20} color="#4f46e5" />
          <span>My Expense Transactions</span>
        </div>
        <button className="btn-primary" onClick={onOpenModal}>
          <PlusCircle size={18} />
          Add Expense
        </button>
      </div>

      {expenses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
          <p style={{ fontSize: '1rem', fontWeight: 500 }}>No expense records found.</p>
          <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Click "Add Expense" above or use the Retry Safety Demo to create one!</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Title & Note</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Idempotency Key</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{expense.title}</div>
                    {expense.note && (
                      <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{expense.note}</div>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-purple">{expense.category}</span>
                  </td>
                  <td style={{ fontWeight: 700, color: '#0f172a' }}>
                    ${parseFloat(expense.amount).toFixed(2)}
                  </td>
                  <td>
                    {expense.idempotency_key ? (
                      <span className="badge badge-green" title={expense.idempotency_key}>
                        <CheckCircle2 size={12} />
                        {expense.idempotency_key.substring(0, 10)}...
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>None</span>
                    )}
                  </td>
                  <td>
                    <button className="btn-danger" onClick={() => onDelete(expense.id)} title="Delete Expense">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
