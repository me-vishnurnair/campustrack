import csv
import io
import os
import secrets
import time
from datetime import date
from pathlib import Path
from typing import Literal
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select, delete, func
from sqlalchemy.exc import IntegrityError
from .database import connect, User, LoginSession, Application
from .security import password_hash, verify_password, token_hash, RateLimit

STATIC = Path(__file__).resolve().parent.parent / 'static'
FIELDS = ('id', 'company', 'role', 'status', 'deadline', 'url', 'notes')


class Credentials(BaseModel):
    username: str = Field(pattern=r'^[a-zA-Z0-9_]{3,30}$')
    password: str = Field(min_length=12, max_length=128)


class ApplicationIn(BaseModel):
    company: str = Field(min_length=1, max_length=100)
    role: str = Field(min_length=1, max_length=120)
    status: Literal['Saved', 'Applied', 'Interview', 'Offer', 'Closed'] = 'Saved'
    deadline: str = ''
    url: str = Field(default='', max_length=1000)
    notes: str = Field(default='', max_length=4000)

    @field_validator('company', 'role')
    @classmethod
    def nonempty(cls, value):
        if not value.strip():
            raise ValueError('Must not be blank')
        return value.strip()

    @field_validator('deadline')
    @classmethod
    def valid_date(cls, value):
        return date.fromisoformat(value).isoformat() if value else ''

    @field_validator('url')
    @classmethod
    def safe_url(cls, value):
        from urllib.parse import urlsplit
        if value:
            parts = urlsplit(value)
            if parts.scheme not in ('https', 'http') or not parts.hostname or parts.username or parts.password:
                raise ValueError('Use a normal HTTP or HTTPS link without credentials')
        return value


def create_app(database_url=None):
    production = os.getenv('APP_ENV') == 'production'
    origin = os.getenv('APP_ORIGIN', 'http://127.0.0.1:8000').rstrip('/')
    secure = os.getenv('COOKIE_SECURE', 'true' if production else 'false') == 'true'
    if production and (not origin.startswith('https://') or not secure or (database_url or os.getenv('DATABASE_URL', '')).startswith('sqlite') or not (database_url or os.getenv('DATABASE_URL'))):
        raise RuntimeError('Production requires APP_ORIGIN=https://..., COOKIE_SECURE=true, and a PostgreSQL DATABASE_URL.')
    engine, Session = connect(database_url)
    limiter = RateLimit()
    # Equal-cost verification when the account does not exist.
    dummy_hash = password_hash(secrets.token_urlsafe(32))

    @asynccontextmanager
    async def lifespan(app):
        yield
        engine.dispose()

    app = FastAPI(title='CampusTrack API', version='1.0.0', lifespan=lifespan)
    app.state.Session = Session

    @app.middleware('http')
    async def boundary(request: Request, call_next):
        if request.method in ('POST', 'PATCH', 'DELETE', 'PUT'):
            if request.headers.get('origin') not in (None, origin):
                return JSONResponse({'detail': 'Request origin is not allowed.'}, status_code=403)
            if request.headers.get('content-type', '').split(';')[0] != 'application/json':
                return JSONResponse({'detail': 'JSON requests required.'}, status_code=415)
            # Count actual body bytes, rather than trusting Content-Length.
            body = b''
            async for part in request.stream():
                body += part
                if len(body) > 16000:
                    return JSONResponse({'detail': 'Request too large.'}, status_code=413)
            request._body = body
        response = await call_next(request)
        response.headers.update({'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY'})
        if request.url.path.startswith('/api'):
            response.headers['Cache-Control'] = 'no-store'
        elif request.url.path == '/':
            response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
        return response

    def identify(request, db, write=False):
        token = request.cookies.get('campus_session', '')
        session = db.get(LoginSession, token_hash(token)) if token else None
        if not session or session.expires <= int(time.time()):
            raise HTTPException(401, 'Please sign in.')
        if write and not secrets.compare_digest(request.headers.get('x-csrf-token', ''), session.csrf):
            raise HTTPException(403, 'Refresh the page before making changes.')
        return session

    def login_response(user, db, response):
        token = secrets.token_urlsafe(32)
        csrf = secrets.token_urlsafe(32)
        now = int(time.time())
        db.execute(delete(LoginSession).where(LoginSession.expires <= now))
        existing = list(db.scalars(select(LoginSession).where(LoginSession.user_id == user.id).order_by(LoginSession.expires)))
        for old in existing[:-4]:
            db.delete(old)
        db.add(LoginSession(token_hash=token_hash(token), user_id=user.id, csrf=csrf, expires=now+86400))
        db.commit()
        response.set_cookie('campus_session', token, max_age=86400, httponly=True, secure=secure, samesite='lax', path='/')
        return {'username': user.username, 'csrf': csrf}

    @app.get('/healthz')
    def health():
        with Session() as db:
            db.execute(select(1))
        return {'status': 'ok'}

    @app.post('/api/register', status_code=201)
    def register(data: Credentials, request: Request, response: Response):
        limiter.check(('register', request.client.host if request.client else 'unknown'))
        with Session() as db:
            user = User(username=data.username.lower(), password_hash=password_hash(data.password))
            db.add(user)
            try:
                db.commit()
            except IntegrityError:
                db.rollback()
                raise HTTPException(409, 'That username is unavailable.')
            return login_response(user, db, response)

    @app.post('/api/login')
    def login(data: Credentials, request: Request, response: Response):
        limiter.check(('login-ip', request.client.host if request.client else 'unknown'))
        limiter.check(('login-user', data.username.lower()))
        with Session() as db:
            user = db.scalar(select(User).where(User.username == data.username.lower()))
            valid = verify_password(data.password, user.password_hash if user else dummy_hash)
            if not user or not valid:
                raise HTTPException(401, 'Username or password is incorrect.')
            return login_response(user, db, response)

    @app.get('/api/me')
    def me(request: Request):
        with Session() as db:
            session = identify(request, db)
            return {'username': db.get(User, session.user_id).username, 'csrf': session.csrf}

    @app.post('/api/logout')
    def logout(request: Request, response: Response):
        with Session() as db:
            db.delete(identify(request, db, True))
            db.commit()
        response.delete_cookie('campus_session', path='/')
        return {'ok': True}

    @app.get('/api/applications')
    def applications(request: Request):
        with Session() as db:
            session = identify(request, db)
            rows = db.scalars(select(Application).where(Application.user_id == session.user_id).order_by(Application.id.desc()))
            return [{k: getattr(row, k) for k in FIELDS} for row in rows]

    @app.post('/api/applications', status_code=201)
    def add(data: ApplicationIn, request: Request):
        with Session() as db:
            session = identify(request, db, True)
            if db.scalar(select(func.count()).select_from(Application).where(Application.user_id == session.user_id)) >= 500:
                raise HTTPException(409, 'Limit of 500 applications reached. Export and remove old records.')
            row = Application(user_id=session.user_id, **data.model_dump())
            db.add(row)
            db.commit()
            return {k: getattr(row, k) for k in FIELDS}

    @app.put('/api/applications/{application_id}')
    def edit(application_id: int, data: ApplicationIn, request: Request):
        with Session() as db:
            session = identify(request, db, True)
            row = db.scalar(select(Application).where(Application.id == application_id, Application.user_id == session.user_id))
            if not row:
                raise HTTPException(404, 'Application not found.')
            for key, value in data.model_dump().items():
                setattr(row, key, value)
            db.commit()
            return {k: getattr(row, k) for k in FIELDS}

    @app.delete('/api/applications/{application_id}')
    def remove(application_id: int, request: Request):
        with Session() as db:
            session = identify(request, db, True)
            result = db.execute(delete(Application).where(Application.id == application_id, Application.user_id == session.user_id))
            if not result.rowcount:
                raise HTTPException(404, 'Application not found.')
            db.commit()
        return {'ok': True}

    @app.get('/api/export')
    def export(request: Request):
        rows = applications(request)
        output = io.StringIO(newline='')
        writer = csv.writer(output)
        writer.writerow(FIELDS)
        for row in rows:
            # Spreadsheet formula injection is possible even in valid CSV.
            cells = [str(row[k]) for k in FIELDS]
            writer.writerow(["'"+v if v.lstrip().startswith(('=', '+', '-', '@', '\t', '\r')) else v for v in cells])
        return Response(output.getvalue(), media_type='text/csv', headers={'Content-Disposition': 'attachment; filename=applications.csv'})

    @app.get('/')
    def home():
        return FileResponse(STATIC / 'index.html')

    app.mount('/static', StaticFiles(directory=STATIC), name='static')
    return app


app = create_app()
