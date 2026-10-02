const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

/**
 * Helper to make authenticated requests to DRF backend
 */
export async function apiRequest(endpoint, method = 'GET', body = null, customHeaders = {}) {
  const token = localStorage.getItem('payflow_token');
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const contentType = response.headers.get('content-type');

    let data = {};
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    }

    if (!response.ok) {
      if (response.status === 401) {
        // If unauthenticated, clear token and notify
        localStorage.removeItem('payflow_token');
        localStorage.removeItem('payflow_user');
      }

      const error = new Error(data.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.data = data;
      error.errorCode = data.error_code || 'UNKNOWN_ERROR';
      error.details = data.details || {};
      throw error;
    }

    return {
      data,
      status: response.status,
      headers: {
        isReplay: response.headers.get('x-idempotent-replay') === 'true',
        idempotencyKey: response.headers.get('x-idempotent-key'),
        cacheStatus: response.headers.get('x-cache-status'),
      }
    };
  } catch (err) {
    if (err.status) throw err;
    const networkError = new Error('Network error or server unreachable. Please check your connection.');
    networkError.status = 0;
    networkError.errorCode = 'NETWORK_ERROR';
    networkError.details = {};
    throw networkError;
  }
}

// Helper auth functions
export const authAPI = {
  register: (userData) => apiRequest('/auth/register/', 'POST', userData),
  login: (credentials) => apiRequest('/auth/login/', 'POST', credentials),
  getMe: () => apiRequest('/auth/me/'),
};

// Helper expense functions
export const expenseAPI = {
  list: () => apiRequest('/expenses/'),
  summary: () => apiRequest('/expenses/summary/'),
  create: (data, idempotencyKey = null) => {
    const headers = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return apiRequest('/expenses/', 'POST', data, headers);
  },
  delete: (id) => apiRequest(`/expenses/${id}/`, 'DELETE'),
};
