import csv
import io
import pytest
from fastapi.testclient import TestClient
from app.main import create_app


@pytest.fixture
def app(tmp_path):
    return create_app("sqlite:///" + str(tmp_path / "test.db"))


def register(client, username):
    result = client.post(
        "/api/register",
        json={"username": username, "password": "only-a-test-password-123"},
    )
    assert result.status_code == 201
    return {"X-CSRF-Token": result.json()["csrf"]}


def test_owner_isolation_and_csrf(app):
    with TestClient(app) as alice, TestClient(app) as bob:
        a = register(alice, "alice")
        b = register(bob, "bob")
        body = {"company": "Example", "role": "Intern", "status": "Applied"}
        assert alice.post("/api/applications", json=body).status_code == 403
        record = alice.post("/api/applications", json=body, headers=a)
        assert record.status_code == 201
        rid = record.json()["id"]
        assert bob.get("/api/applications").json() == []
        assert (
            bob.put(f"/api/applications/{rid}", json=body, headers=b).status_code == 404
        )
        assert (
            bob.request(
                "DELETE", f"/api/applications/{rid}", json={}, headers=b
            ).status_code
            == 404
        )
        assert len(alice.get("/api/applications").json()) == 1
        assert alice.post("/api/logout", json={}, headers=a).status_code == 200
        assert alice.get("/api/applications").status_code == 401


def test_validation_and_csv_injection(app):
    with TestClient(app) as client:
        h = register(client, "charlie")
        assert (
            client.post(
                "/api/applications",
                json={"company": "x", "role": "y", "url": "javascript:alert(1)"},
                headers=h,
            ).status_code
            == 422
        )
        assert (
            client.post(
                "/api/applications",
                json={"company": "x", "role": "y", "deadline": "bad"},
                headers=h,
            ).status_code
            == 422
        )
        assert (
            client.post(
                "/api/applications",
                json={"company": "x", "role": "y", "status": "MadeUp"},
                headers=h,
            ).status_code
            == 422
        )
        assert (
            client.post(
                "/api/applications", json={"company": "=1+1", "role": "Test"}, headers=h
            ).status_code
            == 201
        )
        rows = list(csv.reader(io.StringIO(client.get("/api/export").text)))
        assert rows[1][1] == "'=1+1"


def test_login_origin_and_password_policy(app):
    with TestClient(app) as client:
        assert (
            client.post(
                "/api/register", json={"username": "test", "password": "short"}
            ).status_code
            == 422
        )
        h = register(client, "delta")
        assert (
            client.post(
                "/api/register",
                json={"username": "delta", "password": "only-a-test-password-123"},
            ).status_code
            == 409
        )
        assert (
            client.post(
                "/api/applications",
                json={"company": "x", "role": "y"},
                headers={**h, "Origin": "https://evil.example"},
            ).status_code
            == 403
        )
        client.post("/api/logout", json={}, headers=h)
        assert (
            client.post(
                "/api/login",
                json={"username": "delta", "password": "incorrect-password"},
            ).status_code
            == 401
        )
        result = client.post(
            "/api/login",
            json={"username": "delta", "password": "only-a-test-password-123"},
        )
        assert result.status_code == 200
        assert "HttpOnly" in result.headers["set-cookie"]
        assert client.get("/api/me").json()["username"] == "delta"


def test_records_survive_new_app_instance(tmp_path):
    url = "sqlite:///" + str(tmp_path / "persistent.db")
    with TestClient(create_app(url)) as client:
        headers = register(client, "echo")
        client.post(
            "/api/applications",
            json={"company": "Persistent", "role": "Intern"},
            headers=headers,
        )
    with TestClient(create_app(url)) as client:
        client.post(
            "/api/login",
            json={"username": "echo", "password": "only-a-test-password-123"},
        )
        assert client.get("/api/applications").json()[0]["company"] == "Persistent"
