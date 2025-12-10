# Backend API — AutoBase

Flask-based REST API for the AutoBase vehicle management system. Handles user authentication and data queries and updates.

## Overview

The backend provides a few main modules:

- **Authentication** (`auth_routes.py`) — Login, logout, and session management for employees and customers
- **Customer** (`customer_routes.py`) — Vehicle information retrieval for authenticated customers
- **Database** (`database.py`, `db_utils.py`) — Connection management and utility functions for database queries

## Prerequisites

1. **Python 3.7+** with dependencies:

2. **MySQL server** with populated AutoBase database (from Database Pipeline)

3. **Environment variables** in `.env`:

   ```
   DB_HOST=localhost
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   DB_NAME=your_database_name
   ```

## Running the Server

From the `Backend/` directory:

```bash
python app.py
```

The API will be available at `http://127.0.0.1:5000`

**Note:** Debug mode is enabled by default. Change `debug=True` to `debug=False` in `app.py` for production.

## File Structure

| File | Purpose |
|------|---------|
| `app.py` | Main Flask app initialization, CORS setup, blueprint registration |
| `auth_routes.py` | Authentication endpoints (login, logout, session) |
| `customer_routes.py` | Customer-specific endpoints (vehicles, info) |
| `database.py` | Database connection initialization |
| `db_utils.py` | Helper functions for common database operations |

## CORS Configuration

The API is configured to accept requests from:

- **Origin:** `http://127.0.0.1:5500` (typically Live Server on port 5500)
- **Credentials:** Enabled (cookies/sessions)
- **Headers:** Content-Type, Authorization

To modify, edit the `CORS()` configuration in `app.py`.

## Session Management

- **Session timeout:** 30 minutes of inactivity (configurable via `PERMANENT_SESSION_LIFETIME`)
- **Session storage:** Server-side (cookies)
- **Security:** Secret key must be changed in production

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Connection refused** | Verify MySQL is running and credentials in `.env` are correct |
| **401 Unauthorized** | Ensure user is logged in first via `/api/auth/login` |
| **CORS errors** | Check that frontend is running on `http://127.0.0.1:5500` |
| **Invalid credentials** | Verify EmployeeAuth/CustomerAuth tables are populated from Database Pipeline |
