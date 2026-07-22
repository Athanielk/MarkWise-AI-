# 📘 MarkWise AI

**Smarter marking, better teaching.**

A professional, mobile-friendly AI-powered web application that helps teachers mark handwritten Mathematics examination scripts quickly, fairly and accurately. Reduces teacher workload while providing rich learner-performance analytics and question-level analysis.

---

## ✨ Features

- 🔐 **Secure Authentication** — Email/phone + password, forgot password, registration, JWT cookies.
- 🏠 **Home Dashboard** — Welcome, quick stats, recent activity, subscription/usage, notifications.
- 📝 **Assessment Setup** — Grade, class, subject, type, paper, total marks.
- 📤 **Uploads** — Memorandum, question paper, multiple learner scripts (PDF/images, phone & scanner friendly).
- 🧑‍🏫 **Teacher Instructions** — Optional free-text marking rules (accept alternative methods, follow-through marks, etc.).
- 🤖 **AI Marking (simulated in MVP)** — Reads handwritten maths, compares to memo, allocates marks, flags low-confidence answers for review. Marks are NEVER published until a teacher approves them.
- ✅ **Moderation** — Split-screen review of learner script vs memo, AI explanation & marks awarded. One-click Approve / Adjust / Flag. System suggests highest, lowest, and low-confidence scripts.
- 📊 **Results Dashboard** — KPI cards, top learners, pass/fail donut, mark distribution chart, per-student table.
- 📈 **Question Analysis** — Average per question, strong questions, weak questions, with future features highlighted.
- 📄 **Export** — CSV, printable HTML/PDF report, Excel-compatible export.
- 🎨 **Modern UI** — Blue/white/grey palette, Poppins/Inter typography, Font Awesome icons, Chart.js visualisations, fully responsive.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3 (Flexbox/Grid), vanilla JavaScript (ES6+), Chart.js, Font Awesome |
| Backend | Node.js, Express.js |
| Database | SQLite (via `better-sqlite3` — zero-config, file-based) |
| Auth | JWT + bcrypt password hashing + HTTP-only cookies |
| Uploads | Multer (multi-file, disk storage) |
| Extras | UUID, cookie-parser, CORS ready |

The architecture is designed for easy future expansion — plug in real OCR/AI marking, cloud storage (S3), or role-based school accounts without touching the core UI.

---

## 🚀 Getting Started

```bash
cd markwise-ai
npm install
npm run seed     # seed demo data (optional but recommended)
npm start
```

Then open **http://localhost:3000** in your browser.

### Demo Login

| Field | Value |
|---|---|
| Email | `teacher@demo.com` |
| Password | `password123` |

The demo account comes pre-seeded with 3 past assessments and ~136 learner scripts so you can immediately click through every screen.

---

## 📁 Project Structure

```
markwise-ai/
├── server.js               # Express entry point
├── db.js                   # SQLite schema & connection
├── seed.js                 # Demo data seeder
├── package.json
├── routes/
│   ├── auth.js             # Register, login, forgot-password, me, logout
│   └── api.js              # Assessments, uploads, AI marking, moderation, results, export
├── middleware/
│   └── auth.js             # JWT auth middleware
├── uploads/                # Persisted uploads (memos, scripts, papers)
└── public/                 # Front-end
    ├── index.html          # Login / Sign Up
    ├── dashboard.html      # SPA shell (sidebar + topbar + view container)
    ├── css/style.css       # Entire design system
    ├── js/
    │   ├── app.js          # API client, router, auth, utilities
    │   └── dashboard.js    # All SPA views (dashboard, setup, upload, moderation, results, etc.)
    └── assets/
        └── logo.svg
```

---

## 🔄 Core Workflow

1. **Login** → lands on Dashboard.
2. Click **New Assessment** → fills setup form → Continue to Upload.
3. **Upload** memo, question paper and learner scripts (drag-drop or click). Optionally add teacher instructions.
4. **Start AI Marking** → backend simulates AI marking, generates marks, confidence scores and per-question stats.
5. **Moderation** → split-screen view. AI suggests highest, lowest and low-confidence scripts. Teacher can Approve, Adjust, or Flag.
6. **Results Dashboard** → KPI cards, top learners table, pass/fail donut, distribution chart.
7. **Question Analysis** → per-question averages, strong/weak question highlighting.
8. **Export** → CSV, PDF/print, or Excel-compatible HTML report.

---

## 🎨 Design

- **Colours**: `#0D47A1` primary, `#1565C0`, `#42A5F5`, neutrals `#F5F7FA` → `#1E293B`.
- **Fonts**: Poppins (headings), Inter (body) — Google Fonts.
- **Icons**: Font Awesome 6.
- **Charts**: Chart.js 4.
- **Responsive**: Collapses to mobile-friendly single-column layout below 768px with a slide-in sidebar.

---

## 🔮 Roadmap / Future-ready

The codebase is architected so the following can be added easily:

- Real AI / OCR integration (Google Cloud Vision, Mathpix, OpenAI, etc.) — replace the simulated marking block in `routes/api.js`.
- Cloud storage (S3/GCS) — swap out `multer.diskStorage`.
- Item & Error Analysis, Topic Weakness, Common Mistakes, Reteaching suggestions.
- Additional subjects — Physical Sciences, Accounting, more.
- School / department role-based access (RBAC scaffolding is already in via `user.role`).

---

## 🔒 Security Notes

- Passwords are hashed with bcrypt (10 rounds).
- JWT is issued on login and stored in an HTTP-only cookie.
- All API routes (except register/login/me/forgot) require valid auth.
- File uploads are size-limited and stored with UUID filenames to prevent guessing.
- For production: change `JWT_SECRET`, run over HTTPS, and consider rate limiting and CSRF protection.

---

## 📜 License

MVP Demo — built for classroom testing and evaluation.

> **Reduce workload. Improve accuracy. Better learning outcomes.**
