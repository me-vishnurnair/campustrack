# CampusTrack, explained simply

## The idea

A personal internship application tracker with real accounts and a relational database.

Start by running the application and completing one real action. Then follow the files below. You do not need to memorize the code; you need to explain how data moves and what can fail.

## Where to look

| File | Responsibility |
|---|---|
| `static/app.js` | Handles forms, board rendering and API calls. |
| `app/main.py` | Defines routes, input models, ownership checks and exports. |
| `app/security.py` | Hashes passwords and tokens; bounds login attempts. |
| `app/database.py` | Defines users, sessions and applications and connects the database. |
| `tests/test_api.py` | Tests two-account isolation, CSRF, login, persistence and export safety. |

## Why these technologies

Python builds on the current learning foundation. FastAPI validates input and documents endpoints. SQLAlchemy keeps query values separate from SQL and supports two database environments. Plain JavaScript makes the browser-to-server flow visible without a framework layer.

## Trace one action

1. Open the application form and press Save.
2. `static/app.js` converts form fields into JSON and sends the CSRF header.
3. `ApplicationIn` checks required fields, dates, statuses and links.
4. `identify` looks up the hashed cookie token and checks expiry and CSRF.
5. The API adds the authenticated user ID; the browser cannot choose another owner.
6. SQLAlchemy commits the row; the interface fetches and redraws the board.
7. If something fails, the interface shows the error and leaves the form available.

## Ten likely interview questions

### 1. What happens when I add an application?

The browser sends JSON with the CSRF header. FastAPI validates the fields, identifies the session, assigns the server-side user ID, inserts through SQLAlchemy, commits, and returns the saved record.

### 2. Authentication versus authorization?

Authentication identifies an account. Authorization checks what that account may access. Every record edit and deletion filters by both record ID and the session user ID.

### 3. Why hash passwords with scrypt?

Passwords should not be recoverable. A random salt prevents identical passwords sharing a stored hash, and scrypt makes guessing more expensive. Verification compares derived hashes.

### 4. Why not store the session in localStorage?

The session token is in an HttpOnly cookie so application JavaScript cannot read it. The database stores only its hash. HttpOnly reduces token theft through scripts but does not make XSS harmless.

### 5. What does the CSRF token do?

It proves that a state-changing request has access to the signed-in application context. The server also checks origins when present and accepts JSON mutations. SameSite cookies add another layer.

### 6. Why SQLite locally and PostgreSQL when hosted?

SQLite is simple for learning and local setup. A hosted service needs durable storage that survives application restarts, so production requires an external PostgreSQL connection.

### 7. How does SQL injection prevention work?

SQLAlchemy constructs parameterized queries. User input is passed as values rather than concatenated into SQL command strings.

### 8. Why sanitize CSV cells?

A spreadsheet may interpret text beginning with =, +, -, or @ as a formula. Export prefixes risky values with an apostrophe as well as applying CSV quoting.

### 9. What happens after logout?

The server deletes the session row and expires the browser cookie. A copied token cannot authenticate once its hashed row has been removed.

### 10. What would you improve before large-scale use?

Add a shared rate limiter, database migrations, recovery and verification flows, monitoring, account deletion, backups and concurrency testing. The current one-worker design is an explicit learning-project trade-off.

## A practical exercise

Add a `location` field. Update the input model, database model, form and tests. Explain why an existing database needs an explicit migration instead of relying on create_all.

## Honest scope

Read the limits in the README. The implementation and its tests are real; external deployment, production operation, independent mastery and employer experience are not implied.
