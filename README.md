# CSS475 AutoBase

AutoBase is a Auto Dealership Management project for a CSS 475 class assignment. It includes a simple data pipeline to generate/import SQL data, a Flask backend API for authentication and customer queries, and a minimal frontend that consumes the API.

This repository contains three main areas:

- `Database/` — CSV input data, a pipeline that converts CSV into SQL and inserts it into a MySQL database (`Database/Pipeline/`)
- `Backend/` — Flask API that exposes authentication and customer endpoints (`Backend/app.py`, `auth_routes.py`, `customer_routes.py`, `database.py`, `db_utils.py`)
- `Frontend/` — HTML/JS/CSS for a simple UI (served locally via Live Server or any static server)

---

## Quickstart (recommended order)

1. Create a `.env` file at the project root with your database credentials and optional Mockaroo key:

```powershell
# .env (project root)
DB_HOST=localhost
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
# Optional: only needed if you want DataGenerator to fetch Mockaroo schemas
MOCKAROO_API_KEY=your_mockaroo_api_key
```

2. Install Python dependencies (global or in a venv):

```powershell
pip install flask flask-cors mysql-connector-python python-dotenv requests
```

3. Populate the database using the pipeline (recommended):

- If you have CSVs from Fabricate (placed in `Database/AutoBase/`), the pipeline will convert those into SQL and insert them.
- Alternatively, the generator can fetch mock data (requires `MOCKAROO_API_KEY`).

Run the pipeline:

```powershell
python Database\Pipeline\Run.py
```

This should create SQL files (in `Database/MockData/`) and insert rows into your configured MySQL database.

4. Start the backend API:

```powershell
cd Backend
python app.py
```

API base URL: `http://127.0.0.1:5000`

5. Start the frontend (open `Frontend/index.html` with VS Code Live Server or any static server). The frontend is configured to use `http://127.0.0.1:5500` as origin; the backend CORS allows that origin by default.

---

## What each folder is for

- `Database/AutoBase/` — CSV files (input). These were generated with Fabricate.tonic.ai in this project.
- `Database/MockData/` — Generated SQL files produced by the pipeline (named like `MOCK_<Table>_DATA.sql`).
- `Database/Pipeline/` — `DataGenerator.py`, `DataInserter.py`, and `Run.py` that convert/generate CSV -> SQL and insert into MySQL.
- `Backend/` — Flask application. Endpoints and utility functions are in `auth_routes.py`, `customer_routes.py`, and `db_utils.py`.
- `Frontend/` —  Website that calls backend APIs.

---

## Backend notes

- The backend uses Flask sessions and a `secret_key` set in `Backend/app.py` (change for production).
- CORS in `app.py` allows `http://127.0.0.1:5500` (Live Server). Adjust if you serve the frontend from a different origin.
- Core env vars (read from `.env`) are: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

See `Backend/README.md` for a detailed description of the API routes and examples.

---

## Database pipeline notes

- Place CSVs in `Database/AutoBase/` if you want to convert local CSVs into SQL. Filenames should match expected table names (e.g. `Customer.csv`).
- The pipeline writes SQL to `Database/MockData/` and executes the SQL against the database configured via the `.env` file.
- If you use Mockaroo, set `MOCKAROO_API_KEY` in your `.env` and the generator will fetch mock CSVs for configured schemas.

See `Database/README.md` for more detailed instructions about the pipeline.

---

## Frontend notes

- The frontend is HTML/JS. It expects the backend API to be available at `http://127.0.0.1:5000` and the frontend origin to be `http://127.0.0.1:5500`.
- Use the Live Server extension in VS Code (or any static server) to serve `Frontend/` files on port 5500.

---

## Troubleshooting

- "Connection refused" when running the pipeline or backend: ensure MySQL is running and the `.env` credentials are correct.
- 401 Unauthorized from the frontend: make sure to log in via `/api/auth/login` and that your session cookie is sent with requests (frontend must use credentials when calling the API).
- SQL/Schema mismatches: the pipeline expects certain table/column names. If you altered database schema manually, adjust CSVs or pipeline code accordingly.

---

## Next steps / Improvements

- Add a `requirements.txt` / `pyproject.toml` to pin dependencies.
- Secure session secret and disable debug mode for production.
- Add more robust password hashing for auth tables (currently compares `PasswordHash` directly).
- Add unit tests for pipeline and DB utility functions.

---
