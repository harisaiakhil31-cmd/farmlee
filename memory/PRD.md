# HydroManager – Product Requirements

## Overview
Expo React Native mobile app for hydroponic farm operations. Three-person team management with 2FA, daily/weekly/monthly check logging, crop library, calendar view, and custom reminders (push + email).

## Auth
- Custom JWT auth, email + password, 6-digit email OTP 2FA (SendGrid, dev fallback to console/dev_otp response).
- Admin (seeded `akhilharisai@gmail.com` / `Admin@123`) can invite up to 3 users total.

## Core features
1. **Daily check** – pH/EC/Temperature/Humidity with per-reading editable ranges and live in/out-of-range badges; seedling watering + pH/EC; 8 tank levels (4 tower, 2 pad, 2 RO – low/medium/high); pest check & spoiled-leaf cleaning toggles.
2. **Weekly check** – meter calibration, nutrition qty, tank-filter cleaning.
3. **Monthly check** – tank cleaning, salt formation, A/B/C solutions qty + order flags, seeds qty + order flags.
4. **Calendar** – marks dates with logged activity & reminders; tapping any date opens day-detail (history for past/today, expected tasks for future).
5. **Crops library** – CRUD with per-stage parameters (pH, EC, temp, humidity, duration). Pre-seeded Lettuce / Tomato / Basil.
6. **Custom reminders** – title, description, date/time, push (local notification) + email; APScheduler fires every minute server-side.
7. **Profile/team** – admin view with team list, invite, remove non-admin user, sign out.

## Tech
- FastAPI + Motor (MongoDB) + APScheduler + SendGrid + PyJWT + bcrypt.
- Expo SDK 54 + expo-router, react-native-calendars, expo-notifications, @react-native-async-storage/async-storage, axios, date-fns.

## Smart business enhancement
- **Compliance log export** (future): the daily/weekly/monthly logs + range validations form an audit-grade history that the farm can sell as proof-of-quality to B2B buyers and certifications (GAP, organic).
