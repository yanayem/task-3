# PayFlow - Expense Management Service

[![Django REST Framework](https://img.shields.io/badge/Django_REST-3.14+-green.svg)](https://www.django-rest-framework.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**PayFlow** is a modern, full-stack financial expense management service built with **Django REST Framework (DRF)** and **React (Vite)**. It strictly adheres to production API standards, implementing user isolation, idempotent write retries, server-side response caching, structured error interfaces, and full test suite coverage.

---

## Final Project Brief Checklist Compliance

| Brief Requirement | Implementation Status | Implementation Details |
| :--- | :--- | :--- |
| **Public URL & Repository** | ✅ Ready for Deployment | Repository contains backend & frontend configured for deployment on Render, Railway, Vercel, or Heroku. |
| **Authentication & Protection** | ✅ Compliant | Unauthenticated requests to protected endpoints return `401 Unauthorized` status. DRF Token Authentication enabled. |
| **User Data Isolation** | ✅ Compliant | Strict row-level isolation via `Expense.objects.filter(user=request.user)`. Covered by `test_data_isolation.py`. |
| **Retry-Safe Write Path** | ✅ Compliant | Idempotent POST requests via `Idempotency-Key` header. Repeat requests return original response without duplicate row creation. |
| **Actionable Error Responses** | ✅ Compliant | Custom exception handler returns structured JSON detailing `error_code`, `message`, and field-level `details`. |
| **Caching Strategy** | ✅ Compliant | Server-side Django in-memory cache for financial summaries with auto-invalidation on expense changes. |
| **Secret Management** | ✅ Compliant | Environment variables managed via `.env`. Secrets excluded from Git repository tracking (`.gitignore`). |

---

## Authentication & Data Isolation

* **Unauthenticated Requests**: Any request to `/api/expenses/` or `/api/expenses/summary/` without a valid `Authorization: Token <token>` header returns `401 Unauthorized` with error code `AUTHENTICATION_REQUIRED`.
* **Data Isolation**: Each user can only read, update, or delete their own expense records. Querysets are dynamically scoped to `request.user` (`Expense.objects.filter(user=self.request.user)`).
* **Test Verification**: The test suite `backend/api/tests/test_data_isolation.py` explicitly tests and proves that User A cannot read, modify, or delete User B's rows (returning `404 Not Found` or `401 Unauthorized`).

---

## 🔁 Retry-Safe Write Path (Idempotency)

### How Repeats are Recognised
1. **Request Header**: The client sends a unique UUID or key in the `Idempotency-Key` request header when creating an expense (`POST /api/expenses/`).
2. **Key Lookup**: Before processing the write query, the backend computes a user-scoped lookup key (`idempotency_{user.id}_{idempotency_key}`).
3. **Cache & DB Check**: The backend checks Django's cache and the `IdempotencyRecord` database model for matching `(user, key)`.
4. **Repeat Handling**:
   - **If found (Repeat)**: The backend immediately returns the cached/saved original response payload and status code with the response header `X-Idempotent-Replay: true`. No new database row is created.
   - **If not found (First Attempt)**: The backend processes the transaction inside an atomic database block (`transaction.atomic()`), saves the `Expense` and `IdempotencyRecord`, caches the result for 24 hours (86,400s), and returns `201 Created`.

---

## ⚡ Caching: What, Where, and For How Long

* **What is cached**: Financial summary analytics (`GET /api/expenses/summary/`), including total count of expenses, total dollar amount spent, and category breakdown.
* **Where it is cached**: Server-side in Django's caching layer using user-scoped key `summary_user_{user.id}`.
* **For how long**:
  * **TTL (Time to Live)**: **60 seconds**.
  * **Cache Invalidation**: Whenever a user creates, updates, or deletes an expense, `invalidate_user_summary_cache(user_id)` is invoked, instantly clearing the stale summary cache for that user.
* **Response Indicators**: Responses include an `X-Cache-Status` header returning `HIT` (served from cache) or `MISS` (freshly computed from DB).

---

## ⚠️ Actionable Error Responses

Instead of raw HTML 500 error pages or uninformative generic strings, all API errors return structured JSON that callers can parse and react to:

```json
{
  "status": "error",
  "error_code": "VALIDATION_ERROR",
  "message": "Validation failed: amount: A valid number is required.",
  "details": {
    "amount": ["A valid number is required."]
  }
}
```

### Supported Error Codes
* `AUTHENTICATION_REQUIRED` (`401 Unauthorized`)
* `PERMISSION_DENIED` (`403 Forbidden`)
* `NOT_FOUND` (`404 Not Found`)
* `VALIDATION_ERROR` (`400 Bad Request`)
* `METHOD_NOT_ALLOWED` (`405 Method Not Allowed`)

---

## 🌐 Deployment Instructions (Render & Vercel)

### 1. Backend Deployment on Render (100% Free Tier)
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
2. Connect your GitHub repository (`https://github.com/yanayem/task-3.git`).
3. Configure the Web Service settings:
   - **Name**: `payflow-backend`
   - **Region**: Any preferred region (e.g., Oregon or Singapore)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt && python manage.py collectstatic --no-input && python manage.py migrate`
   - **Start Command**: `gunicorn payflow.wsgi:application`
   - **Instance Type**: **Free** ($0 / month)
4. Add **Environment Variables** under "Advanced":
   - `PYTHON_VERSION`: `3.11.0`
   - `DEBUG`: `False`
   - `ALLOWED_HOSTS`: `.onrender.com,localhost,127.0.0.1`
   - `SECRET_KEY`: `your-secure-production-secret-key`
5. Click **Create Web Service**. Your backend API will be live at `https://payflow-backend.onrender.com/api`.

### 2. Frontend Deployment on Vercel
1. Go to [Vercel Dashboard](https://vercel.com/) and click **Add New** -> **Project**.
2. Import your GitHub repository.
3. Configure project settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Environment Variables**:
   - `VITE_API_BASE_URL`: `https://your-backend-service.onrender.com/api`
5. Click **Deploy**. Vercel will automatically configure SPA routing via `vercel.json`.

---

## 🚀 Running the Project Locally

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
# Activate virtual environment (Windows)
venv\Scripts\activate
# Activate virtual environment (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start Django development server
python manage.py runserver
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

---

## 🧪 Running Unit Tests

Run the complete backend test suite covering Authentication, Data Isolation, Idempotency, Caching, and Error Responses:

```bash
cd backend
python manage.py test api
```

### Test Suite Structure
- `test_auth.py`: Verifies user registration, login, token generation, and `/auth/me/`.
- `test_data_isolation.py`: Verifies strict isolation between User A and User B.
- `test_idempotency.py`: Verifies idempotent write path retries and `X-Idempotent-Replay` headers.
- `test_caching.py`: Verifies 60s summary caching and auto-invalidation on write operations.
- `test_errors.py`: Verifies structured error responses and 401 handling for unauthenticated requests.

---

## 🔒 Security & Environment Variables

Create a `.env` file in `backend/` based on `.env.example`:

```env
SECRET_KEY=your-production-secret-key
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost
```

No credentials, tokens, or production secret keys are committed to the git repository.
