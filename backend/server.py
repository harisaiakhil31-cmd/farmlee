"""HydroManager Backend - Hydroponics farm management API.

Features:
- JWT auth with email/password + email OTP 2FA (SendGrid)
- Admin user invite (max 3 users total)
- Daily / Weekly / Monthly check logging with range validation
- Crops library with stage-based parameters
- Custom reminders with scheduled email notifications
- Calendar / activity log API
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import secrets
import bcrypt
import jwt
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from apscheduler.schedulers.asyncio import AsyncIOScheduler

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Config
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = os.environ.get('JWT_ALGORITHM', 'HS256')
SENDGRID_KEY = os.environ.get('SENDGRID_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'noreply@hydromanager.app')
ADMIN_EMAIL = os.environ['ADMIN_EMAIL']
ADMIN_PASSWORD = os.environ['ADMIN_PASSWORD']
MAX_USERS = int(os.environ.get('MAX_USERS', 3))

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="HydroManager API")
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)
scheduler = AsyncIOScheduler()


# ============================================================
# UTILITIES
# ============================================================
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def hash_pwd(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_pwd(p: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), hashed.encode())
    except Exception:
        return False


def make_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": now_utc() + timedelta(days=30),
        "iat": now_utc(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def send_email(to: str, subject: str, html: str) -> bool:
    """Send via SendGrid; fall back to log if key missing (dev mode)."""
    if not SENDGRID_KEY:
        logger.warning(f"[DEV-EMAIL] To={to} | Subject={subject}\n{html}")
        return True
    try:
        msg = Mail(from_email=SENDER_EMAIL, to_emails=to, subject=subject, html_content=html)
        SendGridAPIClient(SENDGRID_KEY).send(msg)
        return True
    except Exception as e:
        logger.error(f"SendGrid error: {e}")
        return False


async def current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    if not creds:
        raise HTTPException(401, "Missing token")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


async def admin_required(user=Depends(current_user)):
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    return user


# ============================================================
# MODELS
# ============================================================
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class VerifyOTPIn(BaseModel):
    email: EmailStr
    otp: str


class InviteUserIn(BaseModel):
    email: EmailStr
    name: str
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: datetime


class RangeSpec(BaseModel):
    min: float
    max: float


class DailyCheckIn(BaseModel):
    check_date: str  # ISO date YYYY-MM-DD
    check_time: str  # HH:MM
    ph_value: Optional[float] = None
    ph_range: Optional[RangeSpec] = None
    ec_value: Optional[float] = None
    ec_range: Optional[RangeSpec] = None
    temperature: Optional[float] = None
    temperature_range: Optional[RangeSpec] = None
    humidity: Optional[float] = None
    humidity_range: Optional[RangeSpec] = None
    seedling_watered: Optional[bool] = None
    seedling_ph: Optional[float] = None
    seedling_ec: Optional[float] = None
    tank_levels: Optional[dict] = None  # { "tower_1": "low|medium|high", ... }
    pest_check_done: Optional[bool] = None
    pest_notes: Optional[str] = None
    leaf_cleaning_done: Optional[bool] = None
    leaf_notes: Optional[str] = None
    notes: Optional[str] = None


class WeeklyCheckIn(BaseModel):
    check_date: str
    meter_calibration_done: Optional[bool] = None
    nutrition_quantity_ok: Optional[bool] = None
    nutrition_notes: Optional[str] = None
    tank_filters_cleaned: Optional[bool] = None
    notes: Optional[str] = None


class MonthlyCheckIn(BaseModel):
    check_date: str
    tanks_cleaned: Optional[bool] = None
    salt_formation_ok: Optional[bool] = None
    salt_notes: Optional[str] = None
    solution_a_qty: Optional[float] = None
    solution_b_qty: Optional[float] = None
    solution_c_qty: Optional[float] = None
    solutions_ordered: Optional[bool] = None
    seeds_qty_ok: Optional[bool] = None
    seeds_ordered: Optional[bool] = None
    notes: Optional[str] = None


class CropStage(BaseModel):
    name: str  # seedling, vegetative, flowering, fruiting, harvest
    ph_min: float
    ph_max: float
    ec_min: float
    ec_max: float
    temp_min: float
    temp_max: float
    humidity_min: float
    humidity_max: float
    duration_days: int
    notes: Optional[str] = ""


class CropIn(BaseModel):
    name: str
    description: Optional[str] = ""
    stages: List[CropStage]


class ReminderIn(BaseModel):
    title: str
    description: Optional[str] = ""
    remind_at: datetime  # ISO datetime
    notify_email: bool = True
    notify_push: bool = True


# ============================================================
# AUTH
# ============================================================
@api.post("/auth/login")
async def login(body: LoginIn):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_pwd(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")

    otp = f"{secrets.randbelow(1000000):06d}"
    await db.otp_codes.delete_many({"email": body.email.lower()})
    await db.otp_codes.insert_one({
        "email": body.email.lower(),
        "otp": otp,
        "expires_at": now_utc() + timedelta(minutes=10),
        "created_at": now_utc(),
    })

    html = f"""
    <div style='font-family:Arial,sans-serif;max-width:520px;margin:auto;background:#F9F8F6;padding:32px;border-radius:16px'>
      <h2 style='color:#1B2E1C'>HydroManager – Verification Code</h2>
      <p style='color:#4A5D23'>Hi {user.get('name','')}, use the code below to sign in. It expires in 10 minutes.</p>
      <div style='font-size:36px;letter-spacing:8px;font-weight:bold;color:#4A5D23;background:#fff;padding:24px;text-align:center;border-radius:12px;border:2px solid #E5E0D8'>{otp}</div>
      <p style='color:#888;font-size:12px;margin-top:24px'>If you didn't request this, ignore the email.</p>
    </div>
    """
    send_email(body.email, "Your HydroManager verification code", html)

    resp = {"message": "OTP sent to your email", "email": body.email.lower()}
    if not SENDGRID_KEY:
        resp["dev_otp"] = otp  # exposed only when SendGrid key not configured
    return resp


@api.post("/auth/verify-otp")
async def verify_otp(body: VerifyOTPIn):
    rec = await db.otp_codes.find_one({"email": body.email.lower(), "otp": body.otp})
    if not rec:
        raise HTTPException(401, "Invalid OTP")
    expires = rec["expires_at"]
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < now_utc():
        raise HTTPException(401, "OTP expired")
    user = await db.users.find_one({"email": body.email.lower()}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(404, "User not found")
    await db.otp_codes.delete_many({"email": body.email.lower()})
    token = make_token(user["id"], user["email"])
    return {"token": token, "user": user}


@api.get("/auth/me")
async def me(user=Depends(current_user)):
    return user


# ============================================================
# USER MANAGEMENT (admin)
# ============================================================
@api.get("/users")
async def list_users(admin=Depends(admin_required)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(100)
    return users


@api.post("/users/invite")
async def invite_user(body: InviteUserIn, admin=Depends(admin_required)):
    count = await db.users.count_documents({})
    if count >= MAX_USERS:
        raise HTTPException(400, f"Max {MAX_USERS} users reached")
    if await db.users.find_one({"email": body.email.lower()}):
        raise HTTPException(400, "Email already exists")
    user = {
        "id": str(uuid.uuid4()),
        "email": body.email.lower(),
        "name": body.name,
        "password_hash": hash_pwd(body.password),
        "role": "member",
        "created_at": now_utc(),
    }
    await db.users.insert_one(user)

    html = f"""
    <div style='font-family:Arial,sans-serif;max-width:520px;margin:auto;background:#F9F8F6;padding:32px;border-radius:16px'>
      <h2 style='color:#1B2E1C'>Welcome to HydroManager</h2>
      <p>You've been invited by the admin. Use these credentials to log in:</p>
      <p><b>Email:</b> {body.email}<br/><b>Password:</b> {body.password}</p>
      <p style='color:#888'>Please change your password after first login.</p>
    </div>
    """
    send_email(body.email, "You've been invited to HydroManager", html)
    return {"id": user["id"], "email": user["email"], "name": user["name"]}


@api.delete("/users/{user_id}")
async def delete_user(user_id: str, admin=Depends(admin_required)):
    if user_id == admin["id"]:
        raise HTTPException(400, "Cannot delete yourself")
    res = await db.users.delete_one({"id": user_id, "role": {"$ne": "admin"}})
    if res.deleted_count == 0:
        raise HTTPException(404, "User not found or is admin")
    return {"ok": True}


# ============================================================
# DAILY / WEEKLY / MONTHLY CHECKS
# ============================================================
async def _save_check(collection: str, body_dict: dict, user: dict):
    body_dict["id"] = str(uuid.uuid4())
    body_dict["user_id"] = user["id"]
    body_dict["user_name"] = user["name"]
    body_dict["created_at"] = now_utc()
    await db[collection].insert_one(body_dict.copy())
    body_dict.pop("_id", None)
    return body_dict


@api.post("/checks/daily")
async def create_daily(body: DailyCheckIn, user=Depends(current_user)):
    d = body.model_dump()
    return await _save_check("daily_checks", d, user)


@api.get("/checks/daily")
async def list_daily(date: Optional[str] = None, user=Depends(current_user)):
    q = {}
    if date:
        q["check_date"] = date
    items = await db.daily_checks.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@api.post("/checks/weekly")
async def create_weekly(body: WeeklyCheckIn, user=Depends(current_user)):
    return await _save_check("weekly_checks", body.model_dump(), user)


@api.get("/checks/weekly")
async def list_weekly(date: Optional[str] = None, user=Depends(current_user)):
    q = {}
    if date:
        q["check_date"] = date
    items = await db.weekly_checks.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@api.post("/checks/monthly")
async def create_monthly(body: MonthlyCheckIn, user=Depends(current_user)):
    return await _save_check("monthly_checks", body.model_dump(), user)


@api.get("/checks/monthly")
async def list_monthly(date: Optional[str] = None, user=Depends(current_user)):
    q = {}
    if date:
        q["check_date"] = date
    items = await db.monthly_checks.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


# ============================================================
# CALENDAR
# ============================================================
@api.get("/calendar")
async def calendar(start: str, end: str, user=Depends(current_user)):
    """Return all activities between two dates plus pending tasks for that range."""
    daily = await db.daily_checks.find(
        {"check_date": {"$gte": start, "$lte": end}}, {"_id": 0}
    ).to_list(1000)
    weekly = await db.weekly_checks.find(
        {"check_date": {"$gte": start, "$lte": end}}, {"_id": 0}
    ).to_list(1000)
    monthly = await db.monthly_checks.find(
        {"check_date": {"$gte": start, "$lte": end}}, {"_id": 0}
    ).to_list(1000)
    reminders = await db.reminders.find(
        {"remind_at": {
            "$gte": datetime.fromisoformat(start).replace(tzinfo=timezone.utc),
            "$lte": datetime.fromisoformat(end).replace(tzinfo=timezone.utc) + timedelta(days=1),
        }}, {"_id": 0}
    ).to_list(1000)
    return {"daily": daily, "weekly": weekly, "monthly": monthly, "reminders": reminders}


@api.get("/calendar/day/{day}")
async def day_detail(day: str, user=Depends(current_user)):
    daily = await db.daily_checks.find({"check_date": day}, {"_id": 0}).to_list(100)
    weekly = await db.weekly_checks.find({"check_date": day}, {"_id": 0}).to_list(100)
    monthly = await db.monthly_checks.find({"check_date": day}, {"_id": 0}).to_list(100)
    # reminders on that day
    start_dt = datetime.fromisoformat(day).replace(tzinfo=timezone.utc)
    end_dt = start_dt + timedelta(days=1)
    reminders = await db.reminders.find(
        {"remind_at": {"$gte": start_dt, "$lt": end_dt}}, {"_id": 0}
    ).to_list(100)

    # Determine if it's past, today, future
    today_str = now_utc().strftime("%Y-%m-%d")
    is_future = day > today_str
    is_today = day == today_str

    return {
        "date": day,
        "is_future": is_future,
        "is_today": is_today,
        "daily": daily,
        "weekly": weekly,
        "monthly": monthly,
        "reminders": reminders,
        "expected_tasks": _expected_tasks(day, is_future, is_today),
    }


def _expected_tasks(day: str, is_future: bool, is_today: bool):
    """Return list of expected tasks for a given day."""
    tasks = [
        {"type": "daily", "label": "pH / EC / Temperature check"},
        {"type": "daily", "label": "Seedling watering & pH/EC"},
        {"type": "daily", "label": "Tank water levels (4 tower, 2 pad, 2 RO)"},
        {"type": "daily", "label": "Temperature & humidity check"},
        {"type": "daily", "label": "Pest check"},
        {"type": "daily", "label": "Spoiled leaf cleaning & damaged plant removal"},
    ]
    try:
        d = datetime.fromisoformat(day)
        # Monday = weekly
        if d.weekday() == 0:
            tasks += [
                {"type": "weekly", "label": "Meter calibration"},
                {"type": "weekly", "label": "Nutrition quantity"},
                {"type": "weekly", "label": "Tank filters cleaning"},
            ]
        # 1st of month = monthly
        if d.day == 1:
            tasks += [
                {"type": "monthly", "label": "Tanks cleaning"},
                {"type": "monthly", "label": "Salt formation check"},
                {"type": "monthly", "label": "A/B/C solutions qty & order"},
                {"type": "monthly", "label": "Seeds qty & order"},
            ]
    except Exception:
        pass
    return tasks


# ============================================================
# CROPS LIBRARY
# ============================================================
@api.get("/crops")
async def list_crops(user=Depends(current_user)):
    return await db.crops.find({}, {"_id": 0}).sort("name", 1).to_list(100)


@api.post("/crops")
async def create_crop(body: CropIn, user=Depends(current_user)):
    crop = body.model_dump()
    crop["id"] = str(uuid.uuid4())
    crop["created_at"] = now_utc()
    crop["created_by"] = user["id"]
    await db.crops.insert_one(crop.copy())
    crop.pop("_id", None)
    return crop


@api.put("/crops/{crop_id}")
async def update_crop(crop_id: str, body: CropIn, user=Depends(current_user)):
    update = body.model_dump()
    update["updated_at"] = now_utc()
    res = await db.crops.update_one({"id": crop_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Crop not found")
    crop = await db.crops.find_one({"id": crop_id}, {"_id": 0})
    return crop


@api.delete("/crops/{crop_id}")
async def delete_crop(crop_id: str, user=Depends(current_user)):
    await db.crops.delete_one({"id": crop_id})
    return {"ok": True}


# ============================================================
# REMINDERS (custom text reminders with notifications)
# ============================================================
@api.get("/reminders")
async def list_reminders(user=Depends(current_user)):
    items = await db.reminders.find({"user_id": user["id"]}, {"_id": 0}).sort("remind_at", 1).to_list(500)
    return items


@api.post("/reminders")
async def create_reminder(body: ReminderIn, user=Depends(current_user)):
    r = body.model_dump()
    r["id"] = str(uuid.uuid4())
    r["user_id"] = user["id"]
    r["user_email"] = user["email"]
    r["fired"] = False
    r["created_at"] = now_utc()
    if r["remind_at"].tzinfo is None:
        r["remind_at"] = r["remind_at"].replace(tzinfo=timezone.utc)
    await db.reminders.insert_one(r.copy())
    r.pop("_id", None)
    return r


@api.delete("/reminders/{rid}")
async def delete_reminder(rid: str, user=Depends(current_user)):
    await db.reminders.delete_one({"id": rid, "user_id": user["id"]})
    return {"ok": True}


# ============================================================
# DASHBOARD SUMMARY
# ============================================================
@api.get("/dashboard")
async def dashboard(user=Depends(current_user)):
    today = now_utc().strftime("%Y-%m-%d")
    daily_today = await db.daily_checks.find({"check_date": today}, {"_id": 0}).to_list(50)

    last_daily = await db.daily_checks.find_one(
        {}, {"_id": 0}, sort=[("created_at", -1)]
    )
    upcoming = await db.reminders.find(
        {"user_id": user["id"], "remind_at": {"$gte": now_utc()}, "fired": False},
        {"_id": 0}
    ).sort("remind_at", 1).limit(5).to_list(5)

    total_users = await db.users.count_documents({})
    crops_count = await db.crops.count_documents({})

    return {
        "today": today,
        "daily_completed": len(daily_today),
        "last_daily_check": last_daily,
        "upcoming_reminders": upcoming,
        "total_users": total_users,
        "max_users": MAX_USERS,
        "crops_count": crops_count,
        "expected_today": _expected_tasks(today, False, True),
    }


# ============================================================
# SCHEDULER - fire reminders
# ============================================================
async def reminder_worker():
    try:
        cursor = db.reminders.find({"fired": False, "remind_at": {"$lte": now_utc()}})
        async for r in cursor:
            try:
                if r.get("notify_email", True):
                    html = f"""
                    <div style='font-family:Arial,sans-serif;max-width:520px;margin:auto;background:#F9F8F6;padding:32px;border-radius:16px'>
                      <h2 style='color:#1B2E1C'>🌱 HydroManager Reminder</h2>
                      <h3 style='color:#4A5D23'>{r.get('title','')}</h3>
                      <p>{r.get('description','')}</p>
                    </div>
                    """
                    send_email(r["user_email"], f"Reminder: {r.get('title','')}", html)
                await db.reminders.update_one({"id": r["id"]}, {"$set": {"fired": True, "fired_at": now_utc()}})
            except Exception as e:
                logger.error(f"Reminder fire error: {e}")
    except Exception as e:
        logger.error(f"Worker error: {e}")


# ============================================================
# STARTUP - seed admin & example crops
# ============================================================
@app.on_event("startup")
async def startup():
    # Seed admin
    if not await db.users.find_one({"email": ADMIN_EMAIL.lower()}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": ADMIN_EMAIL.lower(),
            "name": "Admin",
            "password_hash": hash_pwd(ADMIN_PASSWORD),
            "role": "admin",
            "created_at": now_utc(),
        })
        logger.info(f"Seeded admin {ADMIN_EMAIL}")

    # Seed example crops
    if await db.crops.count_documents({}) == 0:
        examples = [
            {
                "id": str(uuid.uuid4()),
                "name": "Lettuce",
                "description": "Leafy green, fast-growing hydroponic favorite.",
                "stages": [
                    {"name": "seedling", "ph_min": 5.8, "ph_max": 6.2, "ec_min": 0.4, "ec_max": 0.8,
                     "temp_min": 18, "temp_max": 22, "humidity_min": 60, "humidity_max": 75,
                     "duration_days": 14, "notes": "Germinate in rockwool"},
                    {"name": "vegetative", "ph_min": 5.5, "ph_max": 6.5, "ec_min": 0.8, "ec_max": 1.2,
                     "temp_min": 18, "temp_max": 24, "humidity_min": 50, "humidity_max": 70,
                     "duration_days": 21, "notes": "Increase light intensity"},
                    {"name": "harvest", "ph_min": 5.5, "ph_max": 6.5, "ec_min": 1.2, "ec_max": 1.8,
                     "temp_min": 16, "temp_max": 22, "humidity_min": 50, "humidity_max": 65,
                     "duration_days": 7, "notes": "Harvest when leaves are firm"},
                ],
                "created_at": now_utc(),
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Tomato",
                "description": "Fruiting crop requiring strong support.",
                "stages": [
                    {"name": "seedling", "ph_min": 5.8, "ph_max": 6.2, "ec_min": 0.8, "ec_max": 1.2,
                     "temp_min": 20, "temp_max": 25, "humidity_min": 65, "humidity_max": 75,
                     "duration_days": 21, "notes": ""},
                    {"name": "vegetative", "ph_min": 5.8, "ph_max": 6.3, "ec_min": 1.8, "ec_max": 2.5,
                     "temp_min": 20, "temp_max": 26, "humidity_min": 60, "humidity_max": 70,
                     "duration_days": 28, "notes": ""},
                    {"name": "flowering", "ph_min": 5.8, "ph_max": 6.5, "ec_min": 2.0, "ec_max": 3.0,
                     "temp_min": 21, "temp_max": 26, "humidity_min": 55, "humidity_max": 65,
                     "duration_days": 21, "notes": "Reduce humidity to prevent disease"},
                    {"name": "fruiting", "ph_min": 6.0, "ph_max": 6.5, "ec_min": 2.5, "ec_max": 3.5,
                     "temp_min": 22, "temp_max": 27, "humidity_min": 55, "humidity_max": 65,
                     "duration_days": 60, "notes": ""},
                ],
                "created_at": now_utc(),
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Basil",
                "description": "Aromatic herb, high turnover crop.",
                "stages": [
                    {"name": "seedling", "ph_min": 5.5, "ph_max": 6.5, "ec_min": 0.6, "ec_max": 1.0,
                     "temp_min": 20, "temp_max": 25, "humidity_min": 60, "humidity_max": 75,
                     "duration_days": 14, "notes": ""},
                    {"name": "vegetative", "ph_min": 5.5, "ph_max": 6.5, "ec_min": 1.0, "ec_max": 1.6,
                     "temp_min": 20, "temp_max": 26, "humidity_min": 50, "humidity_max": 65,
                     "duration_days": 35, "notes": "Pinch tops for bushier growth"},
                    {"name": "harvest", "ph_min": 5.5, "ph_max": 6.5, "ec_min": 1.0, "ec_max": 1.6,
                     "temp_min": 20, "temp_max": 26, "humidity_min": 50, "humidity_max": 65,
                     "duration_days": 7, "notes": "Continuous harvest"},
                ],
                "created_at": now_utc(),
            },
        ]
        await db.crops.insert_many(examples)
        logger.info("Seeded example crops")

    # start scheduler
    scheduler.add_job(reminder_worker, "interval", minutes=1, id="reminder_worker", replace_existing=True)
    if not scheduler.running:
        scheduler.start()
    logger.info("Scheduler started")


@app.on_event("shutdown")
async def shutdown():
    try:
        scheduler.shutdown(wait=False)
    except Exception:
        pass
    client.close()


# ============================================================
# Health
# ============================================================
@api.get("/")
async def root():
    return {"service": "HydroManager API", "status": "ok"}


@api.get("/health")
async def health():
    return {"status": "healthy", "time": now_utc().isoformat()}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
