"""HydroManager backend API tests."""
import os
import pytest
import requests
from datetime import datetime, timezone, timedelta

BASE_URL = "https://hydro-check-log.preview.emergentagent.com"
ADMIN_EMAIL = "akhilharisai@gmail.com"
ADMIN_PASSWORD = "Admin@123"

state = {}


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ===== Health =====
def test_health(s):
    r = s.get(f"{BASE_URL}/api/health", timeout=15)
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"


# ===== Auth =====
def test_login_returns_dev_otp(s):
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "dev_otp" in data, f"dev_otp missing: {data}"
    assert data["email"] == ADMIN_EMAIL.lower()
    state["otp"] = data["dev_otp"]


def test_login_bad_password(s):
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=15)
    assert r.status_code == 401


def test_verify_otp(s):
    r = s.post(f"{BASE_URL}/api/auth/verify-otp",
               json={"email": ADMIN_EMAIL, "otp": state["otp"]}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data and "user" in data
    assert data["user"]["email"] == ADMIN_EMAIL.lower()
    assert data["user"]["role"] == "admin"
    state["token"] = data["token"]
    state["admin_id"] = data["user"]["id"]
    s.headers.update({"Authorization": f"Bearer {data['token']}"})


def test_verify_bad_otp(s):
    r = requests.post(f"{BASE_URL}/api/auth/verify-otp",
                      json={"email": ADMIN_EMAIL, "otp": "000000"}, timeout=15)
    assert r.status_code == 401


def test_me(s):
    r = s.get(f"{BASE_URL}/api/auth/me", timeout=15)
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN_EMAIL.lower()


def test_protected_without_token():
    r = requests.get(f"{BASE_URL}/api/dashboard", timeout=15)
    assert r.status_code == 401


# ===== Dashboard =====
def test_dashboard(s):
    r = s.get(f"{BASE_URL}/api/dashboard", timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    for k in ["today", "daily_completed", "expected_today", "total_users", "crops_count"]:
        assert k in data, f"missing key {k}"
    assert isinstance(data["expected_today"], list) and len(data["expected_today"]) > 0


# ===== Daily / Weekly / Monthly =====
def test_create_daily(s):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    payload = {
        "check_date": today, "check_time": "09:30",
        "ph_value": 6.0, "ph_range": {"min": 5.5, "max": 6.5},
        "ec_value": 1.4, "ec_range": {"min": 1.0, "max": 1.8},
        "temperature": 22.0, "temperature_range": {"min": 18, "max": 26},
        "humidity": 65, "humidity_range": {"min": 50, "max": 75},
        "seedling_watered": True, "seedling_ph": 6.0, "seedling_ec": 0.8,
        "tank_levels": {"tower_1": "high", "tower_2": "medium", "tower_3": "high",
                        "tower_4": "low", "pad_1": "high", "pad_2": "medium",
                        "ro_1": "high", "ro_2": "high"},
        "pest_check_done": True, "leaf_cleaning_done": True,
        "notes": "TEST daily"
    }
    r = s.post(f"{BASE_URL}/api/checks/daily", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["ph_value"] == 6.0 and d["tank_levels"]["tower_1"] == "high"
    state["daily_today"] = today


def test_get_daily_today(s):
    r = s.get(f"{BASE_URL}/api/checks/daily?date={state['daily_today']}", timeout=15)
    assert r.status_code == 200
    items = r.json()
    assert any(i.get("notes") == "TEST daily" for i in items)


def test_create_weekly(s):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    r = s.post(f"{BASE_URL}/api/checks/weekly",
               json={"check_date": today, "meter_calibration_done": True,
                     "nutrition_quantity_ok": True, "tank_filters_cleaned": True,
                     "notes": "TEST weekly"}, timeout=15)
    assert r.status_code == 200, r.text
    assert r.json()["meter_calibration_done"] is True


def test_create_monthly(s):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    r = s.post(f"{BASE_URL}/api/checks/monthly",
               json={"check_date": today, "tanks_cleaned": True,
                     "salt_formation_ok": True, "solution_a_qty": 5.0,
                     "solution_b_qty": 5.0, "solution_c_qty": 5.0,
                     "seeds_qty_ok": True, "notes": "TEST monthly"}, timeout=15)
    assert r.status_code == 200, r.text
    assert r.json()["tanks_cleaned"] is True


# ===== Crops =====
def test_seeded_crops(s):
    r = s.get(f"{BASE_URL}/api/crops", timeout=15)
    assert r.status_code == 200
    crops = r.json()
    names = {c["name"] for c in crops}
    for n in ["Lettuce", "Tomato", "Basil"]:
        assert n in names, f"missing seeded crop {n}: {names}"


def test_create_crop(s):
    payload = {
        "name": "TEST_Spinach",
        "description": "Test crop",
        "stages": [{
            "name": "seedling", "ph_min": 6.0, "ph_max": 7.0,
            "ec_min": 0.7, "ec_max": 1.2, "temp_min": 15, "temp_max": 20,
            "humidity_min": 50, "humidity_max": 70, "duration_days": 14, "notes": ""
        }]
    }
    r = s.post(f"{BASE_URL}/api/crops", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["name"] == "TEST_Spinach" and "id" in d
    state["crop_id"] = d["id"]


def test_delete_crop(s):
    if "crop_id" in state:
        r = s.delete(f"{BASE_URL}/api/crops/{state['crop_id']}", timeout=15)
        assert r.status_code == 200


# ===== Reminders =====
def test_create_reminder(s):
    remind_at = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    r = s.post(f"{BASE_URL}/api/reminders",
               json={"title": "TEST reminder", "description": "test",
                     "remind_at": remind_at, "notify_email": True,
                     "notify_push": True}, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["title"] == "TEST reminder" and "id" in d
    state["reminder_id"] = d["id"]


def test_list_reminders(s):
    r = s.get(f"{BASE_URL}/api/reminders", timeout=15)
    assert r.status_code == 200
    assert any(x["id"] == state["reminder_id"] for x in r.json())


def test_delete_reminder(s):
    r = s.delete(f"{BASE_URL}/api/reminders/{state['reminder_id']}", timeout=15)
    assert r.status_code == 200
    r2 = s.get(f"{BASE_URL}/api/reminders", timeout=15)
    assert not any(x["id"] == state["reminder_id"] for x in r2.json())


# ===== Calendar =====
def test_calendar_range(s):
    today = datetime.now(timezone.utc).date()
    start = (today - timedelta(days=7)).isoformat()
    end = (today + timedelta(days=7)).isoformat()
    r = s.get(f"{BASE_URL}/api/calendar?start={start}&end={end}", timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ["daily", "weekly", "monthly", "reminders"]:
        assert k in d and isinstance(d[k], list)


def test_calendar_day(s):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    r = s.get(f"{BASE_URL}/api/calendar/day/{today}", timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["is_today"] is True
    assert isinstance(d["expected_tasks"], list) and len(d["expected_tasks"]) > 0


# ===== Users (admin) =====
def test_list_users(s):
    r = s.get(f"{BASE_URL}/api/users", timeout=15)
    assert r.status_code == 200
    users = r.json()
    assert any(u["email"] == ADMIN_EMAIL.lower() for u in users)
    state["user_count"] = len(users)


def test_invite_user(s):
    # ensure idempotent: delete prior test_invitee if exists
    suffix = datetime.now(timezone.utc).strftime("%H%M%S")
    email = f"test_invitee_{suffix}@example.com"
    r = s.post(f"{BASE_URL}/api/users/invite",
               json={"email": email, "name": "TEST Invitee",
                     "password": "Pass@1234"}, timeout=15)
    if r.status_code == 400 and "Max" in r.text:
        pytest.skip("Max users reached")
    assert r.status_code == 200, r.text
    uid = r.json()["id"]
    # cleanup
    s.delete(f"{BASE_URL}/api/users/{uid}", timeout=15)


def test_max_users_enforced(s):
    # Fill up to MAX_USERS=3
    created = []
    try:
        # current count
        r = s.get(f"{BASE_URL}/api/users", timeout=15)
        current = len(r.json())
        suffix = datetime.now(timezone.utc).strftime("%H%M%S")
        for i in range(3 - current):
            email = f"test_fill_{suffix}_{i}@example.com"
            rr = s.post(f"{BASE_URL}/api/users/invite",
                        json={"email": email, "name": f"TEST Fill {i}",
                              "password": "Pass@1234"}, timeout=15)
            if rr.status_code == 200:
                created.append(rr.json()["id"])
        # one more should fail
        rr = s.post(f"{BASE_URL}/api/users/invite",
                    json={"email": f"overflow_{suffix}@example.com",
                          "name": "Overflow", "password": "Pass@1234"}, timeout=15)
        assert rr.status_code == 400
    finally:
        for uid in created:
            s.delete(f"{BASE_URL}/api/users/{uid}", timeout=15)
