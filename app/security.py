"""Passwords are salted; only hashed session tokens reach the database."""

import hashlib
import hmac
import secrets
import time
from collections import defaultdict, deque
from threading import Lock
from fastapi import HTTPException


def password_hash(password, salt=None):
    salt = salt or secrets.token_hex(16)
    value = hashlib.scrypt(
        password.encode(),
        salt=bytes.fromhex(salt),
        n=32768,
        r=8,
        p=1,
        maxmem=64 * 1024 * 1024,
    ).hex()
    return salt + ":" + value


def verify_password(password, stored):
    salt = stored.split(":")[0]
    return hmac.compare_digest(password_hash(password, salt), stored)


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


class RateLimit:
    """Per-process limiter. Deploy one worker; use shared storage before scaling."""

    def __init__(self):
        self.hits = defaultdict(deque)
        self.lock = Lock()

    def check(self, key, limit=15, window=300):
        now = time.monotonic()
        with self.lock:
            # Bound memory even when requests use many different addresses.
            if len(self.hits) > 5000:
                self.hits = defaultdict(
                    deque,
                    {k: v for k, v in self.hits.items() if v and v[-1] > now - window},
                )
                if len(self.hits) > 5000:
                    raise HTTPException(429, "Server busy. Please try again later.")
            q = self.hits[key]
            while q and q[0] < now - window:
                q.popleft()
            if len(q) >= limit:
                raise HTTPException(
                    429, "Too many attempts. Try again in five minutes."
                )
            q.append(now)
