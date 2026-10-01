# CampusTrack

A personal internship application tracker with real accounts and a relational database.

**Status:** implemented and checked locally. Public publication is approved; GitHub upload and deployment are blocked on account access. **Live demo:** not deployed; no URL claimed.

## Features

- Register and sign in using a unique username and password; passwords use salted scrypt hashes.
- Create, edit and delete applications with a company, role, stage, deadline, link and notes.
- Search and filter a five-stage board; see deadline and pipeline counts.
- Export CSV with protection against spreadsheet formula injection.
- Explore a clearly labelled fictional sample board without creating an account.
- Owner-scoped database queries, expiring hashed sessions, CSRF checks, input limits and login throttling.

## Tech stack

Python, FastAPI, SQLAlchemy, SQLite/PostgreSQL, HTML, CSS, JavaScript

## Run locally

Use Python 3.12. From this repository's folder:

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements-dev.txt
.venv\Scripts\python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

On macOS/Linux, replace `.venv\Scripts\python` with `.venv/bin/python`.
Open **http://127.0.0.1:8000**. Interactive API documentation is at **/docs**, and **/healthz** is the health check.

`.env.example` documents configuration names. The application reads environment variables; it does **not** automatically load a `.env` file. Set variables in your shell or hosting dashboard. Never commit real `.env` values.

## Test

```powershell
.venv\Scripts\python -m pytest -q
```

GitHub Actions runs these tests on pushes and pull requests. Direct dependencies are pinned to the versions tested for this release.

## Deploy

`render.yaml` describes a Render Python web service with one worker. Connect the eventual GitHub repository and review the service settings before creating it. The manifest requests the free web-service plan and does not create paid resources. Availability and provider terms should be checked at deployment time. Deployment has not been performed.

Alternatively, build the included Dockerfile and run the container with the required environment variables. Production traffic should be served over HTTPS.

### Configuration

| Variable | Local default | Hosted requirement |
|---|---|---|
| APP_ENV | development | production |
| APP_ORIGIN | http://127.0.0.1:8000 | Exact HTTPS deployment origin, no trailing slash |
| DATABASE_URL | sqlite:///./campustrack.db | PostgreSQL connection URL in a secret setting |
| COOKIE_SECURE | false locally | true |
| PORT | supplied to Uvicorn | Provided by host |

Production startup refuses an insecure cookie/origin configuration or a local SQLite database. Supply a real PostgreSQL database before publishing. This avoids pretending that a web service's temporary filesystem is durable storage. No database or billable resource was provisioned.

### Limits

This learning release has no email verification, password reset, MFA, administrator console or account deletion screen. Do not use a password reused elsewhere. Sessions expire after 24 hours. There are up to five retained sessions per account and 500 applications per account. Rate limits are per process; use one worker. Before horizontal scaling, use a shared limiter and a proper schema migration workflow. `create_all` initializes tables; it is not a schema migration system.

The sample board uses fictional companies and stores changes only in browser memory. Real account records go to the database. No analytics or external data service is used.

## Screenshots

![Desktop application](docs/screenshot-desktop.png)

[Mobile screenshot](docs/screenshot-mobile.png)

## Understand the code

Read [docs/EXPLAINED.md](docs/EXPLAINED.md) for the request flow, technology choices, limitations and ten interview questions with answers.

## Attribution and license

Original application code created for Vishnu R. Nair with AI assistance. Third-party libraries retain their licenses. The project is an AI-assisted learning build; the owner is working through the implementation. MIT license; see [LICENSE](LICENSE).
