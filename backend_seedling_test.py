"""Seedling Management endpoint tests.

Hits the public backend at EXPO_PUBLIC_BACKEND_URL/api.
Auth: admin akhilharisai@gmail.com / Admin@123; OTP fetched from MongoDB.
"""
import os, sys, time, requests
from pymongo import MongoClient

BASE = os.environ.get("EXPO_PUBLIC_BACKEND_URL",
                     "https://hydro-check-log.preview.emergentagent.com").rstrip("/") + "/api"
ADMIN_EMAIL = "akhilharisai@gmail.com"
ADMIN_PASSWORD = "Admin@123"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "hydromanager_db")

PASS, FAIL = [], []

def ok(name):
    PASS.append(name); print(f"  PASS {name}")

def bad(name, detail=""):
    FAIL.append(f"{name} — {detail}"); print(f"  FAIL {name} :: {detail}")

def login():
    r = requests.post(f"{BASE}/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD, "device": "pytest"},
                      timeout=20)
    if r.status_code != 200:
        print("Login failed", r.status_code, r.text); sys.exit(1)
    body = r.json()
    if "dev_otp" in body:
        otp = body["dev_otp"]
    else:
        # Grab fresh OTP from Mongo
        time.sleep(1)
        c = MongoClient(MONGO_URL)
        db = c[DB_NAME]
        doc = list(db.otp_codes.find({"email": ADMIN_EMAIL.lower(), "purpose": "login"})
                   .sort("created_at", -1).limit(1))
        if not doc:
            print("No OTP found in Mongo"); sys.exit(1)
        otp = doc[0]["otp"]
    r = requests.post(f"{BASE}/auth/verify-otp", json={"email": ADMIN_EMAIL, "otp": otp}, timeout=20)
    if r.status_code != 200:
        print("verify-otp failed", r.status_code, r.text); sys.exit(1)
    return r.json()["token"]


def main():
    token = login()
    H = {"Authorization": f"Bearer {token}"}

    # ---------- 1) LIST TYPES (seeded) ----------
    print("\n[1] GET /seedlings/types")
    r = requests.get(f"{BASE}/seedlings/types", headers=H, timeout=20)
    if r.status_code != 200: bad("list types -> 200", f"{r.status_code} {r.text}")
    else:
        types = r.json()
        if not isinstance(types, list) or len(types) < 3:
            bad("seeded types >= 3", f"got {len(types) if isinstance(types, list) else 'n/a'}")
        names = {t.get("name") for t in types}
        for n in ("Lettuce", "Basil", "Tomato"):
            if n in names: ok(f"seeded type '{n}' present")
            else: bad(f"seeded type '{n}' present")
        # validate shape on the first
        sample = types[0]
        for k in ("id", "name", "total_days_to_tower", "stages"):
            if k in sample: ok(f"type has field '{k}'")
            else: bad(f"type has field '{k}'", str(sample.keys()))
        if isinstance(sample.get("stages"), list) and sample["stages"]:
            st = sample["stages"][0]
            for k in ("stage_name", "duration_days", "ec_min", "ec_max"):
                if k in st: ok(f"stage has '{k}'")
                else: bad(f"stage has '{k}'", str(st.keys()))

    # ---------- 2) CREATE TYPE (with mixed order_index) ----------
    print("\n[2] POST /seedlings/types (with shuffled order_index)")
    new_type_payload = {
        "name": f"Spinach-Test-{int(time.time())}",
        "description": "Cool-weather leafy green",
        "total_days_to_tower": 24,
        "stages": [
            {"stage_name": "Pre-Transplant", "order_index": 3, "duration_days": 5,
             "ec_min": 1.0, "ec_max": 1.4, "water_temp_min": 18, "water_temp_max": 22, "notes": ""},
            {"stage_name": "Germination", "order_index": 0, "duration_days": 4,
             "ec_min": 0.2, "ec_max": 0.4, "water_temp_min": 20, "water_temp_max": 24, "notes": ""},
            {"stage_name": "True Leaf", "order_index": 2, "duration_days": 8,
             "ec_min": 0.8, "ec_max": 1.2, "water_temp_min": 19, "water_temp_max": 23, "notes": ""},
            {"stage_name": "Cotyledon", "order_index": 1, "duration_days": 7,
             "ec_min": 0.4, "ec_max": 0.8, "water_temp_min": 19, "water_temp_max": 23, "notes": ""},
        ],
        "notes": "test type",
    }
    r = requests.post(f"{BASE}/seedlings/types", headers=H, json=new_type_payload, timeout=20)
    new_type_id = None
    if r.status_code != 200: bad("create type -> 200", f"{r.status_code} {r.text}")
    else:
        nt = r.json()
        new_type_id = nt.get("id")
        if new_type_id: ok("create type returns id")
        else: bad("create type returns id", str(nt))
        # stages must be sorted by order_index
        stage_names = [s["stage_name"] for s in nt.get("stages", [])]
        expected = ["Germination", "Cotyledon", "True Leaf", "Pre-Transplant"]
        if stage_names == expected: ok("stages sorted by order_index")
        else: bad("stages sorted by order_index", f"got {stage_names}")

    # ---------- 3) UPDATE TYPE ----------
    print("\n[3] PUT /seedlings/types/{id}")
    if new_type_id:
        upd_payload = dict(new_type_payload)
        upd_payload["name"] = upd_payload["name"] + "-renamed"
        upd_payload["total_days_to_tower"] = 28
        # remove one stage
        upd_payload["stages"] = upd_payload["stages"][:3]
        r = requests.put(f"{BASE}/seedlings/types/{new_type_id}", headers=H, json=upd_payload, timeout=20)
        if r.status_code != 200: bad("update type -> 200", f"{r.status_code} {r.text}")
        else:
            ut = r.json()
            if ut.get("name", "").endswith("-renamed") and ut.get("total_days_to_tower") == 28:
                ok("update type changed name & total_days_to_tower")
            else:
                bad("update type changed name & total_days_to_tower", str(ut))
            if len(ut.get("stages", [])) == 3:
                ok("update type stages count = 3")
            else:
                bad("update type stages count = 3", str(len(ut.get("stages", []))))

    # ---------- 5) CREATE BATCH (auto-fill expected_transplant_date) ----------
    print("\n[5] POST /seedlings/batches")
    # use the new (renamed) type — it has total_days_to_tower=28
    sown_date = "2026-01-10"
    batch_payload = {
        "seedling_type_id": new_type_id,
        "batch_name": "Spinach Tray A",
        "quantity": 48,
        "sown_date": sown_date,
        "tray_location": "Rack 3 / Shelf 2",
        "notes": "auto-fill ET date test",
    }
    new_batch_id = None
    r = requests.post(f"{BASE}/seedlings/batches", headers=H, json=batch_payload, timeout=20)
    if r.status_code != 200: bad("create batch -> 200", f"{r.status_code} {r.text}")
    else:
        b = r.json()
        new_batch_id = b.get("id")
        if new_batch_id: ok("batch returned id")
        if b.get("status") == "active": ok("batch default status = active")
        else: bad("batch default status = active", b.get("status"))
        expected_et = "2026-02-07"  # 2026-01-10 + 28d
        if b.get("expected_transplant_date") == expected_et:
            ok("expected_transplant_date auto-filled = sown + total_days")
        else:
            bad("expected_transplant_date auto-filled", f"got {b.get('expected_transplant_date')} expected {expected_et}")

    # 5b) 404 if seedling_type_id doesn't exist
    r = requests.post(f"{BASE}/seedlings/batches", headers=H, json={
        "seedling_type_id": "00000000-0000-0000-0000-000000000000",
        "batch_name": "ghost", "quantity": 1, "sown_date": "2026-01-01"}, timeout=20)
    if r.status_code == 404: ok("create batch with unknown type -> 404")
    else: bad("create batch with unknown type -> 404", f"{r.status_code} {r.text}")

    # ---------- 6) LIST BATCHES (with progress + type name + status filter) ----------
    print("\n[6] GET /seedlings/batches")
    r = requests.get(f"{BASE}/seedlings/batches", headers=H, timeout=20)
    if r.status_code != 200: bad("list batches -> 200", f"{r.status_code}")
    else:
        items = r.json()
        ours = next((x for x in items if x["id"] == new_batch_id), None)
        if not ours: bad("our batch in list")
        else:
            ok("our batch in list")
            if ours.get("seedling_type_name", "").startswith("Spinach-Test"):
                ok("batch has seedling_type_name")
            else:
                bad("batch has seedling_type_name", str(ours.get("seedling_type_name")))
            prog = ours.get("progress") or {}
            for k in ("current_stage_index", "day_in_stage", "days_since_sown"):
                if k in prog: ok(f"progress.{k} present")
                else: bad(f"progress.{k} present", str(prog))

    # 6b) ?status=active should include our batch
    r = requests.get(f"{BASE}/seedlings/batches?status=active", headers=H, timeout=20)
    if r.status_code != 200: bad("list batches?status=active -> 200", f"{r.status_code}")
    else:
        items = r.json()
        if all(b.get("status") == "active" for b in items): ok("status filter returns only active")
        else: bad("status filter returns only active", "non-active in result")

    # ---------- 7) GET single batch ----------
    print("\n[7] GET /seedlings/batches/{id}")
    if new_batch_id:
        r = requests.get(f"{BASE}/seedlings/batches/{new_batch_id}", headers=H, timeout=20)
        if r.status_code != 200: bad("get batch -> 200", f"{r.status_code} {r.text}")
        else:
            b = r.json()
            if isinstance(b.get("seedling_type"), dict): ok("seedling_type expanded as object")
            else: bad("seedling_type expanded as object", str(type(b.get("seedling_type"))))
            if isinstance(b.get("watering_logs"), list): ok("watering_logs present (list)")
            else: bad("watering_logs present (list)", str(type(b.get("watering_logs"))))

    # ---------- 8) PUT batch ----------
    print("\n[8] PUT /seedlings/batches/{id}")
    if new_batch_id:
        r = requests.put(f"{BASE}/seedlings/batches/{new_batch_id}", headers=H, json={
            "batch_name": "Spinach Tray A (updated)",
            "quantity": 60,
            "tray_location": "Rack 1 / Shelf 1"
        }, timeout=20)
        if r.status_code != 200: bad("update batch -> 200", f"{r.status_code} {r.text}")
        else:
            b = r.json()
            if (b.get("batch_name") == "Spinach Tray A (updated)"
                and b.get("quantity") == 60
                and b.get("tray_location") == "Rack 1 / Shelf 1"):
                ok("batch fields updated")
            else: bad("batch fields updated", str(b))

    # ---------- 10) WATERING create ----------
    print("\n[10] POST /seedlings/watering")
    if new_batch_id:
        # morning
        r = requests.post(f"{BASE}/seedlings/watering", headers=H, json={
            "batch_id": new_batch_id, "log_date": "2026-01-15", "session": "morning",
            "watered": True, "ec_before": 0.5, "water_temp_before": 21,
            "ec_target_min": 0.4, "ec_target_max": 0.8, "ec_actual": 0.55,
            "notes": "morning round"
        }, timeout=20)
        if r.status_code == 200: ok("create morning watering log")
        else: bad("create morning watering log", f"{r.status_code} {r.text}")

        # evening same day
        r = requests.post(f"{BASE}/seedlings/watering", headers=H, json={
            "batch_id": new_batch_id, "log_date": "2026-01-15", "session": "evening",
            "watered": True, "ec_before": 0.6, "water_temp_before": 22,
            "ec_actual": 0.58, "notes": "evening round"
        }, timeout=20)
        if r.status_code == 200: ok("create evening watering log (same day)")
        else: bad("create evening watering log (same day)", f"{r.status_code} {r.text}")

        # another day to test sort
        r = requests.post(f"{BASE}/seedlings/watering", headers=H, json={
            "batch_id": new_batch_id, "log_date": "2026-01-16", "session": "morning",
            "watered": True
        }, timeout=20)
        if r.status_code == 200: ok("create watering log day 2")
        else: bad("create watering log day 2", f"{r.status_code} {r.text}")

        # invalid session -> 400
        r = requests.post(f"{BASE}/seedlings/watering", headers=H, json={
            "batch_id": new_batch_id, "log_date": "2026-01-16", "session": "noon", "watered": True
        }, timeout=20)
        if r.status_code == 400: ok("invalid session -> 400")
        else: bad("invalid session -> 400", f"{r.status_code} {r.text}")

        # unknown batch_id -> 404
        r = requests.post(f"{BASE}/seedlings/watering", headers=H, json={
            "batch_id": "00000000-0000-0000-0000-000000000000",
            "log_date": "2026-01-16", "session": "morning", "watered": True
        }, timeout=20)
        if r.status_code == 404: ok("watering unknown batch -> 404")
        else: bad("watering unknown batch -> 404", f"{r.status_code} {r.text}")

    # ---------- 11) LIST watering by batch ----------
    print("\n[11] GET /seedlings/watering?batch_id={id}")
    if new_batch_id:
        r = requests.get(f"{BASE}/seedlings/watering?batch_id={new_batch_id}", headers=H, timeout=20)
        if r.status_code != 200: bad("list watering -> 200", f"{r.status_code}")
        else:
            logs = r.json()
            if len(logs) >= 3: ok(f">=3 logs returned ({len(logs)})")
            else: bad(">=3 logs returned", f"got {len(logs)}")
            dates = [l["log_date"] for l in logs]
            if dates == sorted(dates, reverse=True): ok("logs sorted by log_date desc")
            else: bad("logs sorted by log_date desc", str(dates))
            same_day = [l for l in logs if l["log_date"] == "2026-01-15"]
            sessions = {l["session"] for l in same_day}
            if sessions == {"morning", "evening"}:
                ok("morning + evening coexist on same day")
            else:
                bad("morning + evening coexist on same day", str(sessions))

    # ---------- 9) TRANSPLANT ----------
    print("\n[9] POST /seedlings/batches/{id}/transplant")
    # Create a 2nd batch to transplant so the main one stays for delete cascade test
    transplant_batch_id = None
    if new_type_id:
        r = requests.post(f"{BASE}/seedlings/batches", headers=H, json={
            "seedling_type_id": new_type_id,
            "batch_name": "Spinach Tray B (will transplant)",
            "quantity": 30, "sown_date": "2026-01-01"
        }, timeout=20)
        if r.status_code == 200:
            transplant_batch_id = r.json()["id"]
            r = requests.post(f"{BASE}/seedlings/batches/{transplant_batch_id}/transplant",
                              headers=H, json={
                                  "actual_transplant_date": "2026-01-29",
                                  "tower_destination": "Tower #4",
                                  "notes": "ready"
                              }, timeout=20)
            if r.status_code == 200: ok("transplant returns 200")
            else: bad("transplant returns 200", f"{r.status_code} {r.text}")
            # verify status updated
            r = requests.get(f"{BASE}/seedlings/batches/{transplant_batch_id}", headers=H, timeout=20)
            if r.status_code == 200:
                b = r.json()
                if (b.get("status") == "transplanted"
                    and b.get("actual_transplant_date") == "2026-01-29"
                    and b.get("tower_destination") == "Tower #4"):
                    ok("transplant updated status/date/destination")
                else:
                    bad("transplant updated status/date/destination", str({
                        k: b.get(k) for k in ("status","actual_transplant_date","tower_destination")
                    }))
        else:
            bad("create 2nd batch for transplant", f"{r.status_code} {r.text}")

    # ---------- 4) DELETE TYPE with active batch -> 400 ----------
    print("\n[4] DELETE /seedlings/types/{id} (with active batch -> 400)")
    if new_type_id:
        r = requests.delete(f"{BASE}/seedlings/types/{new_type_id}", headers=H, timeout=20)
        if r.status_code == 400: ok("delete type with active batch -> 400")
        else: bad("delete type with active batch -> 400", f"{r.status_code} {r.text}")

    # ---------- 12) DELETE BATCH cascades watering logs ----------
    print("\n[12] DELETE /seedlings/batches/{id} cascades")
    if new_batch_id:
        r = requests.delete(f"{BASE}/seedlings/batches/{new_batch_id}", headers=H, timeout=20)
        if r.status_code == 200: ok("delete batch -> 200")
        else: bad("delete batch -> 200", f"{r.status_code} {r.text}")
        # batch should be gone
        r = requests.get(f"{BASE}/seedlings/batches/{new_batch_id}", headers=H, timeout=20)
        if r.status_code == 404: ok("deleted batch -> 404 on GET")
        else: bad("deleted batch -> 404 on GET", f"{r.status_code}")
        # watering logs should also be gone
        r = requests.get(f"{BASE}/seedlings/watering?batch_id={new_batch_id}", headers=H, timeout=20)
        if r.status_code == 200 and r.json() == []:
            ok("watering logs cascade-deleted")
        else:
            bad("watering logs cascade-deleted", f"{r.status_code} {r.text}")

    # Now delete the (transplanted) batch + the test type
    if transplant_batch_id:
        requests.delete(f"{BASE}/seedlings/batches/{transplant_batch_id}", headers=H, timeout=20)

    # Now DELETE type should succeed (no active batches)
    print("\n[4b] DELETE /seedlings/types/{id} (no active batches -> 200)")
    if new_type_id:
        r = requests.delete(f"{BASE}/seedlings/types/{new_type_id}", headers=H, timeout=20)
        if r.status_code == 200: ok("delete type with no active batches -> 200")
        else: bad("delete type with no active batches -> 200", f"{r.status_code} {r.text}")

    # ---------- NO-AUTH TESTS ----------
    print("\n[Auth] 401 for all endpoints when no Bearer token")
    NA = [
        ("GET",  "/seedlings/types"),
        ("POST", "/seedlings/types"),
        ("PUT",  "/seedlings/types/some-id"),
        ("DELETE","/seedlings/types/some-id"),
        ("POST", "/seedlings/batches"),
        ("GET",  "/seedlings/batches"),
        ("GET",  "/seedlings/batches/some-id"),
        ("PUT",  "/seedlings/batches/some-id"),
        ("POST", "/seedlings/batches/some-id/transplant"),
        ("POST", "/seedlings/watering"),
        ("GET",  "/seedlings/watering"),
        ("DELETE","/seedlings/batches/some-id"),
    ]
    for method, path in NA:
        r = requests.request(method, f"{BASE}{path}", json={}, timeout=15)
        if r.status_code == 401: ok(f"401 no-auth {method} {path}")
        else: bad(f"401 no-auth {method} {path}", f"{r.status_code} {r.text[:120]}")

    # ---------- SUMMARY ----------
    print("\n=== SUMMARY ===")
    print(f"PASS: {len(PASS)}")
    print(f"FAIL: {len(FAIL)}")
    if FAIL:
        for f in FAIL: print("  -", f)
        sys.exit(1)


if __name__ == "__main__":
    main()
