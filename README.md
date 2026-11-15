<div align="center">

# 💙 CareCircle

### One shared place for the whole family to care for an elderly parent

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Open_App-10b981?style=for-the-badge)](https://carecircle-o10i.onrender.com)
[![API Health](https://img.shields.io/badge/💚_API_Health-Check-0ea5e9?style=for-the-badge)](https://carecircle-o10i.onrender.com/api/health)

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![Firebase](https://img.shields.io/badge/Firestore-FFCA28?logo=firebase&logoColor=black)
![Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?logo=google&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)
![Render](https://img.shields.io/badge/Hosted_on-Render-46E3B7?logo=render&logoColor=black)

**🔗 Live link:** [https://carecircle-o10i.onrender.com](https://carecircle-o10i.onrender.com)

> ⏳ Hosted on Render's free plan. If the app was idle, the first load can take 30-50 seconds to wake up.

</div>

---

## 📑 Table of Contents

- [🎯 Problem](#-problem)
- [💡 Solution](#-solution)
- [✨ Features](#-features)
- [🧰 Tech Stack](#-tech-stack)
- [🏗️ Architecture](#️-architecture)
- [⚙️ Setup](#️-setup)
- [🔐 Environment Variables](#-environment-variables)
- [⏰ Cron Setup](#-cron-setup)
- [🌐 Google Services Used](#-google-services-used)
- [🚀 Deployment](#-deployment)
- [🛣️ Future Work](#️-future-work)

---

## 🎯 Problem

When an elderly parent takes several medicines and many relatives help look after them, important things get lost:

- ❓ Nobody is sure whether the morning tablet was taken
- 📞 Two relatives both call about the same missed dose, or nobody does
- 📉 Medicine stock runs out without anyone noticing
- 💬 Doctor instructions get buried in WhatsApp groups

## 💡 Solution

**CareCircle** gives every family member one shared view of the parent's care. Everyone sees the same medicines, doses, appointments and notes, updated live, with clear accountability for who did what.

---

## ✨ Features

### 💊 Medicines & Doses
- Add medicines with schedules and stock counts
- Mark doses **taken** or **skipped**, with a **15-minute undo**
- Stock reduces automatically, and the circle is alerted when it runs low

### 🚨 Missed Dose Flow
- When a dose is missed, any member taps **"I'm handling this"**
- Every member sees who is handling it, and gets a notification
- If a second member tries, they get a clear message that someone already has it, so no duplicate effort

### 📅 Appointments
- Schedule doctor visits with location and notes
- A member can volunteer to **accompany** the parent
- One click adds the visit to **Google Calendar**

### 📝 Care Notes Thread
- Shared thread for the whole circle
- Pin, edit and delete with **undo**
- Draft **autosave** and `Ctrl + Enter` to post

### 📣 Shared Activity Feed
- Every action by every member in one live feed

### 📊 Adherence Reports
- Daily taken / skipped / missed charts
- Adherence %, current streak, best streak
- Per-medicine breakdown

### 👨‍👩‍👧 Circle & Access
- Care circle with **passcode login**, no complicated sign-up
- Admin and member roles
- Circle directory, invite page
- Changing the passcode logs out all old sessions

### ⚡ Experience
- 🔄 **Live updates:** auto-refresh every 15 seconds and on tab focus
- ⚡ Optimistic UI, so actions feel instant
- 💀 Skeleton loaders and friendly empty states
- 🌙 Dark mode
- 👴 Elder Mode page, pricing page, custom 404 page
- 🔔 In-app notifications

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| 🎨 Client | React 18, Vite, Tailwind CSS, React Router, TanStack Query, TanStack Table, Recharts, Lucide icons |
| 🖥️ Server | Node.js, Express, Zod validation, Helmet, rate limiting |
| 🗄️ Database | Google Firestore (Firebase Admin SDK) |
| ✉️ Email | Nodemailer |
| 🤖 AI | Google Gemini (`@google/generative-ai`) |
| ☁️ Hosting | Render |

---

## 🏗️ Architecture

```
┌──────────────┐   fetch /api    ┌───────────────┐        ┌─────────────┐
│ React (Vite) │ ──────────────▶ │  Express API  │ ─────▶ │  Firestore  │
│  TanStack Q  │ ◀── polls 15s ─ │  (Zod, JWT)   │        └─────────────┘
└──────────────┘                 └───────┬───────┘
                                         ├────▶ Nodemailer (email)
                                         └────▶ Gemini (AI)

External cron ── X-Cron-Secret ──▶ /api/cron/*  (reminders, missed-dose checks)
```

- In production, Express serves the built client from `client/dist`, so **one Render service hosts everything**.
- Auth uses a signed session token in an HTTP-only cookie.
- Every request is checked against the member's own care profile, so there is no cross-profile access.
- Main collections: `profiles`, `members`, `medications`, `doseLogs`, `appointments`, `careNotes`, `activities`, `notifications`.

---

## ⚙️ Setup

**Requirements:** Node 18+, a Firebase project with Firestore enabled.

```bash
# 1. Clone
git clone https://github.com/[your-username]/[your-repo].git
cd [your-repo]

# 2. Server
cd server
npm install
cp .env.example .env      # fill in the values (see below)
npm run dev

# 3. Client (new terminal)
cd client
npm install
npm run dev
```

- Client: `http://localhost:5173`
- Server: the port set in your `.env`
- Optional demo data: `cd server && npm run seed`

### 🗂️ Firestore indexes (required)

Create these composite indexes in **Firebase Console → Firestore → Indexes**:

| Collection | Field 1 | Field 2 |
|---|---|---|
| `careNotes` | `profileId` ↑ | `createdAt` ↓ |
| `activities` | `profileId` ↑ | `createdAt` ↓ |
| `doseLogs` | `profileId` ↑ | `scheduledDate` ↑ |

---

## 🔐 Environment Variables

> ✏️ Replace the names below with the exact ones from `server/src/config/env.js`.

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development` or `production` |
| `PORT` | Server port |
| `CLIENT_URL` | Public URL of the app (`https://carecircle-o10i.onrender.com`) |
| `[JWT_SECRET]` | Signs session tokens |
| `[FIREBASE_...]` | Firebase Admin service account credentials |
| `[SMTP_HOST / SMTP_USER / SMTP_PASS]` | Nodemailer email sending |
| `[GEMINI_API_KEY]` | Google Gemini API key |
| `CRON_SECRET` | Shared secret protecting cron endpoints |

---

## ⏰ Cron Setup

Reminders and missed-dose checks run through endpoints protected by the `X-Cron-Secret` header. Any scheduler works, for example [cron-job.org](https://cron-job.org) (free):

| Setting | Value |
|---|---|
| URL | `https://carecircle-o10i.onrender.com/api/cron/[endpoint]` |
| Header | `X-Cron-Secret: <your CRON_SECRET>` |
| Schedule | Every 5 minutes |

The exact endpoint paths are in `server/src/routes/cronRoutes.js`. Pinging the server regularly also keeps the free Render instance awake.

---

## 🌐 Google Services Used

| Service | How it is used |
|---|---|
| 🔥 **Cloud Firestore** (Firebase Admin SDK) | Primary database for all care data |
| 🤖 **Google Gemini API** | AI features |
| 📅 **Google Calendar** | Appointments open as pre-filled calendar events |

---

## 🚀 Deployment

Deployed on **Render** as a single web service.

| Setting | Value |
|---|---|
| Build command | `cd client && npm install --include=dev && npm run build && cd ../server && npm install` |
| Start command | `cd server && npm start` |
| Health check | `/api/health` |

A `render.yaml` is included in the repository root.

---

## 🛣️ Future Work

- 🆘 SOS emergency button that emails the whole circle
- 📷 Medicine scan with camera and Gemini vision
- 🎙️ Voice commands in English and Hindi, plus read-aloud
- 💬 Medicine explainer using Gemini
- 🇮🇳 Complete Hindi / English interface
- ⌨️ Command palette, bulk actions
- 📲 PWA / offline support
- 🧪 Automated tests for newer features

---

<div align="center">

Made with 💙 for families who care

[🚀 Open the live app](https://carecircle-o10i.onrender.com)

</div>
