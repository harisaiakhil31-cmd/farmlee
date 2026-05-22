"""Backend tests for HydroManager password change & reset endpoints.

Endpoints under test:
- POST /api/auth/change-password   (Bearer auth)
- POST /api/auth/forgot-password
- POST /api/auth/reset-password

Restores admin password to Admin@123 at the end.
"""
import os
import sys
import json
import requests

BASE = "https://hydro-check-log.preview.emergentagent.com/api"
ADMIN_EMAIL = "akhilharisai@gmail.com"
ORIG_PASSWORD = "Admin@123"
NEW_PASSWORD = "NewPass@2025"
RESET_PASSWORD = "Reset@2025xY"

results = []   # list of (name, ok, detail)


def record(name, ok, detail=""):
    results.append((name, ok, detail))
    icon = "PASS" if ok else "FAIL"
    print(f"[{icon}] {name}{(' :: ' + detail) if detail else ''}")


def login_and_get_token(email, password):
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": password, "device": "tester"})
    if r.status_code != 200:
        return None, f"login failed http={r.status_code} body={r.text[:200]}"
    j = r.json()
    otp = j.get("dev_otp")
    if not otp:
        return None, f"no dev_otp returned: {j}"
    r2 = requests.post(f"{BASE}/auth/verify-otp", json={"email": email, "otp": otp})
    if r2.status_code != 200:
        return None, f"verify-otp failed http={r2.status_code} body={r2.text[:200]}"
    return r2.json().get("token"), ""


def main():
    # ===== Setup: login as admin =====
    print("\n--- Setup: admin login ---")
    token, err = login_and_get_token(ADMIN_EMAIL, ORIG_PASSWORD)
    if not token:
        record("Setup admin login", False, err)
        return finish()
    record("Setup admin login (dev_otp flow)", True)
    auth_h = {"Authorization": f"Bearer {token}"}

    # ===== 1) POST /api/auth/change-password =====
    print("\n--- /auth/change-password ---")

    # 1a. 401 without token
    r = requests.post(f"{BASE}/auth/change-password",
                      json={"current_password": ORIG_PASSWORD, "new_password": NEW_PASSWORD})
    record("change-password no token -> 401", r.status_code == 401,
           f"got {r.status_code}: {r.text[:120]}")

    # 1b. 401 with wrong current password
    r = requests.post(f"{BASE}/auth/change-password", headers=auth_h,
                      json={"current_password": "WrongPass@123", "new_password": NEW_PASSWORD})
    record("change-password wrong current -> 401", r.status_code == 401,
           f"got {r.status_code}: {r.text[:120]}")

    # 1c. 400 weak passwords - each with specific reason
    weak_cases = [
        ("short", "at least 8"),
        ("alllower1!", "uppercase"),
        ("ALLUPPER1!", "lowercase"),
        ("NoDigits!", "number"),
        ("NoSpecial1", "special"),
    ]
    for pwd, expect_sub in weak_cases:
        r = requests.post(f"{BASE}/auth/change-password", headers=auth_h,
                          json={"current_password": ORIG_PASSWORD, "new_password": pwd})
        ok = r.status_code == 400
        detail_txt = ""
        if ok:
            try:
                detail_txt = r.json().get("detail", "")
            except Exception:
                detail_txt = r.text
            ok = expect_sub.lower() in str(detail_txt).lower()
        record(f"change-password weak '{pwd}' -> 400 containing '{expect_sub}'",
               ok, f"http={r.status_code} detail={detail_txt!r}")

    # 1d. 400 same as current
    r = requests.post(f"{BASE}/auth/change-password", headers=auth_h,
                      json={"current_password": ORIG_PASSWORD, "new_password": ORIG_PASSWORD})
    record("change-password new==current -> 400", r.status_code == 400,
           f"http={r.status_code}: {r.text[:160]}")

    # 1e. 200 success with strong password
    r = requests.post(f"{BASE}/auth/change-password", headers=auth_h,
                      json={"current_password": ORIG_PASSWORD, "new_password": NEW_PASSWORD})
    success_change = r.status_code == 200
    record("change-password success (NewPass@2025) -> 200", success_change,
           f"http={r.status_code}: {r.text[:160]}")

    if not success_change:
        print("Cannot continue — change-password failed; old password still active")
        return finish()

    # 1f. Verify new password works for fresh login
    token2, err = login_and_get_token(ADMIN_EMAIL, NEW_PASSWORD)
    record("Fresh login with new password works", bool(token2), err)

    # Confirm OLD password is now rejected
    r = requests.post(f"{BASE}/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ORIG_PASSWORD})
    record("Old password rejected on login -> 401", r.status_code == 401,
           f"got {r.status_code}")

    # ===== 2) POST /api/auth/forgot-password =====
    print("\n--- /auth/forgot-password ---")

    r = requests.post(f"{BASE}/auth/forgot-password", json={"email": ADMIN_EMAIL})
    ok_known = r.status_code == 200
    known_body = {}
    dev_otp_known = None
    if ok_known:
        known_body = r.json()
        dev_otp_known = known_body.get("dev_otp")
    record("forgot-password known email -> 200 with dev_otp",
           ok_known and bool(dev_otp_known),
           f"http={r.status_code} body={known_body}")

    unknown_email = "nosuch_user_99201@example.com"
    r = requests.post(f"{BASE}/auth/forgot-password", json={"email": unknown_email})
    ok_unknown = r.status_code == 200
    unknown_body = r.json() if ok_unknown else {}
    has_dev_otp = "dev_otp" in unknown_body
    same_msg = known_body.get("message") == unknown_body.get("message")
    record("forgot-password unknown email -> 200, same msg, no dev_otp",
           ok_unknown and not has_dev_otp and same_msg,
           f"http={r.status_code} body={unknown_body} same_msg={same_msg}")

    # ===== 3) POST /api/auth/reset-password =====
    print("\n--- /auth/reset-password ---")

    if not dev_otp_known:
        record("reset-password tests (need OTP)", False, "no dev_otp from forgot-password")
        # try to restore via change-password
        return restore_with_change(token2)

    # 3a. invalid otp -> 401
    r = requests.post(f"{BASE}/auth/reset-password", json={
        "email": ADMIN_EMAIL, "otp": "000000", "new_password": RESET_PASSWORD})
    record("reset-password invalid otp -> 401", r.status_code == 401,
           f"http={r.status_code}: {r.text[:160]}")

    # 3b. weak password (valid otp) -> 400
    # Use a clearly weak one. The otp must still be valid (not yet consumed).
    r = requests.post(f"{BASE}/auth/reset-password", json={
        "email": ADMIN_EMAIL, "otp": dev_otp_known, "new_password": "weak"})
    weak_ok = r.status_code == 400
    record("reset-password weak password -> 400", weak_ok,
           f"http={r.status_code}: {r.text[:160]}")

    # 3c. success with valid otp + strong password -> 200
    r = requests.post(f"{BASE}/auth/reset-password", json={
        "email": ADMIN_EMAIL, "otp": dev_otp_known, "new_password": RESET_PASSWORD})
    reset_success = r.status_code == 200
    record("reset-password valid -> 200", reset_success,
           f"http={r.status_code}: {r.text[:160]}")

    # 3d. otp single-use: second time -> 401
    r = requests.post(f"{BASE}/auth/reset-password", json={
        "email": ADMIN_EMAIL, "otp": dev_otp_known, "new_password": RESET_PASSWORD})
    record("reset-password OTP single-use (replay -> 401)", r.status_code == 401,
           f"http={r.status_code}: {r.text[:160]}")

    # 3e. login flow with new password (after reset)
    if reset_success:
        token3, err = login_and_get_token(ADMIN_EMAIL, RESET_PASSWORD)
        record("Login with reset password works", bool(token3), err)
        current_token = token3
        current_pwd = RESET_PASSWORD
    else:
        # If reset failed but change-password worked, use that
        current_token = token2
        current_pwd = NEW_PASSWORD

    # ===== RESTORE STATE =====
    print("\n--- Restore admin password to Admin@123 ---")
    if not current_token:
        # try fresh login with whatever password we believe is active
        current_token, err = login_and_get_token(ADMIN_EMAIL, current_pwd)
    if current_token:
        auth_h2 = {"Authorization": f"Bearer {current_token}"}
        r = requests.post(f"{BASE}/auth/change-password", headers=auth_h2,
                          json={"current_password": current_pwd, "new_password": ORIG_PASSWORD})
        restore_ok = r.status_code == 200
        record("Restore Admin@123 via change-password", restore_ok,
               f"http={r.status_code}: {r.text[:160]}")
        if not restore_ok:
            # fallback to forgot+reset
            restore_via_forgot()
    else:
        record("Restore Admin@123: cannot login to restore", False, "")
        restore_via_forgot()

    # Final verification: Admin@123 works
    token_final, err = login_and_get_token(ADMIN_EMAIL, ORIG_PASSWORD)
    record("FINAL: Admin@123 login works", bool(token_final), err)

    return finish()


def restore_via_forgot():
    print(" Falling back to forgot/reset to restore Admin@123 ...")
    r = requests.post(f"{BASE}/auth/forgot-password", json={"email": ADMIN_EMAIL})
    if r.status_code != 200:
        record("Fallback restore: forgot-password", False, f"http={r.status_code}")
        return
    otp = r.json().get("dev_otp")
    if not otp:
        record("Fallback restore: no dev_otp", False, "")
        return
    r2 = requests.post(f"{BASE}/auth/reset-password", json={
        "email": ADMIN_EMAIL, "otp": otp, "new_password": ORIG_PASSWORD})
    record("Fallback restore via forgot+reset", r2.status_code == 200,
           f"http={r2.status_code}: {r2.text[:160]}")


def restore_with_change(token):
    if not token:
        return restore_via_forgot() or finish()
    auth_h = {"Authorization": f"Bearer {token}"}
    r = requests.post(f"{BASE}/auth/change-password", headers=auth_h,
                      json={"current_password": NEW_PASSWORD, "new_password": ORIG_PASSWORD})
    record("Restore via change-password (NewPass->Admin@123)",
           r.status_code == 200, f"http={r.status_code}: {r.text[:160]}")
    return finish()


def finish():
    total = len(results)
    passed = sum(1 for _, ok, _ in results if ok)
    print("\n=========================================")
    print(f"SUMMARY: {passed}/{total} passed")
    print("=========================================")
    for name, ok, detail in results:
        if not ok:
            print(f"  FAIL -> {name} :: {detail}")
    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
