"""Small relational model; SQLite locally and PostgreSQL when hosted."""

import os
from sqlalchemy import create_engine, String, ForeignKey, Text, Integer
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(30), unique=True)
    password_hash: Mapped[str] = mapped_column(String(256))


class LoginSession(Base):
    __tablename__ = "sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    csrf: Mapped[str] = mapped_column(String(64))
    expires: Mapped[int] = mapped_column(Integer)


class Application(Base):
    __tablename__ = "applications"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    company: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(20), default="Saved")
    deadline: Mapped[str] = mapped_column(String(10), default="")
    url: Mapped[str] = mapped_column(String(1000), default="")
    notes: Mapped[str] = mapped_column(Text, default="")


def connect(url=None):
    url = url or os.getenv("DATABASE_URL", "sqlite:///./campustrack.db")
    if url.startswith(("postgres://", "postgresql://")):
        url = "postgresql+psycopg://" + url.split("://", 1)[1]
    engine = create_engine(
        url,
        connect_args={"check_same_thread": False} if url.startswith("sqlite") else {},
        pool_pre_ping=True,
    )
    Base.metadata.create_all(engine)
    return engine, sessionmaker(engine, expire_on_commit=False)
