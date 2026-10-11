# Enterprise Examination Management System (EMS)

> **Architectural Standard:** Strictly engineered to the **Examination Management System Software Requirements Specification (SRS), Version 1.0**.  
> **Stack:** PostgreSQL (Prisma ORM) • Express.js • React (Vite) • Node.js • Tailwind CSS • Vitest

---

## 1. System Overview & Core Capabilities

The **Examination Management System (EMS)** is an enterprise-grade academic platform built to manage the full examination lifecycle with relational data integrity, role-based access control, and automated governance.

### Architectural Highlights
- **Three-Tier Architecture:** Client (React + Vite), Application Layer (Express REST APIs), Data Layer (PostgreSQL via Prisma ORM).
- **Relational Integrity:** Zero document databases. All student records, attendance quotas, exam timetables, question banks, answers, marks, and audit logs are modeled in relational PostgreSQL tables with strict foreign keys, cascading actions, and unique constraints.
- **Append-Only Audit Logging:** Immutable security trails tracking every authentication attempt, schedule change, paper generation, marks entry, moderation action, and tab-switch violation.
- **Strict Business Logic Enforcement:**
  - **Account Lockout:** 5 consecutive failed login attempts trigger an automated 15-minute account lock.
  - **Admit Card Eligibility:** Requires ≥ 75% cumulative attendance threshold. Ineligible students have ticket issuance denied with specific rationale.
  - **Schedule Conflict Detection:** Rejects room overlap at the same venue and student batch concurrency conflicts.
  - **Proctored Online Exam Room:** Server-side deadline countdown, incremental question response auto-save, browser blur/tab-switch event detection, and auto-submit.
  - **Marks Governance:** Evaluated marks validated against maximum marks (`0 <= marks <= max_marks`); results locked upon publication.
  - **Official GPA Formula:** `GPA = Σ(Credits × GradePoints) / Σ(Credits)`.

---

## 2. Default Seed Accounts & One-Click Demo Access

The database is pre-seeded with accounts for all four user roles. The login screen also features 1-click credential autofill buttons for testing:

| Role | Email Address | Password | Profile Details / Demo Context |
|---|---|---|---|
| **Administrator** | `admin@ems.edu` | `AdminPassword123!` | System Registrar & Examination Controller |
| **Faculty** | `faculty1@ems.edu` | `FacultyPassword123!` | Prof. Alan Turing (Computer Science & Engineering) |
| **Faculty** | `faculty2@ems.edu` | `FacultyPassword123!` | Dr. Grace Hopper (Information Technology) |
| **Examiner** | `examiner@ems.edu` | `ExaminerPassword123!` | Chief External Examiner & Paper Moderator |
| **Student (Eligible)** | `student1@ems.edu` | `StudentPassword123!` | Alice Smith (88.5% Attendance, Admit Card Ready) |
| **Student (Ineligible)** | `student2@ems.edu` | `StudentPassword123!` | Bob Jones (71.0% Attendance, Below 75% Threshold Demo) |

---

## 3. Technology Stack

### Backend
- **Runtime:** Node.js 18+ (Express.js)
- **Database:** PostgreSQL 16
- **ORM:** Prisma ORM 5.x with explicit relations, indexes, and migrations
- **Authentication:** JWT Access Tokens (15m) + Secure HTTP-only Refresh Tokens (7d), bcrypt with work factor ≥ 12
- **Security:** Helmet headers, Express Rate Limiting, CORS whitelist, Parameterized SQL queries
- **Document Engines:** PDFKit (Hall Tickets & Grade Cards), SheetJS/xlsx (Excel Analytics)
- **Notification Services:** In-app notification queue + Nodemailer (configurable SMTP with 3-retry delivery)

### Frontend
- **Framework:** React 18 with Vite
- **Styling:** Vanilla CSS + Tailwind CSS (Navy/Indigo design language)
- **State & Context:** React AuthContext with Axios interceptor (silent JWT refresh)
- **Icons & Data Viz:** Lucide React, Recharts (Responsive bar, line, and pie charts)
- **Forms & Validation:** Zod schema validation

---

## 4. Quick Start & Local Setup

### Prerequisites
1. **Node.js** v18+ and **npm** v9+ installed.
2. **PostgreSQL** 14+ instance running locally or in Docker.

### Step 1: Clone & Configure Server
```bash
cd server
cp .env.example .env
```
Ensure your `DATABASE_URL` in `server/.env` points to your PostgreSQL database:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ems_db?schema=public"
JWT_ACCESS_SECRET="your_strong_access_secret_at_least_32_chars"
JWT_REFRESH_SECRET="your_strong_refresh_secret_at_least_32_chars"
PORT=5000
CLIENT_URL="http://localhost:5173"
```

### Step 2: Push Prisma Schema & Seed Database
```bash
# Push schema to PostgreSQL
npx prisma db push

# Seed master courses, subjects, users, schedules, and questions
node prisma/seed.js
```

### Step 3: Run Backend Server
```bash
npm run dev
# Server starts on http://localhost:5000
```

### Step 4: Run Frontend Client
```bash
cd ../client
npm install
npm run dev
# Frontend starts on http://localhost:5173
```

---

## 5. Docker Deployment

Deploy the entire stack (PostgreSQL, Express backend, and Nginx React frontend) with a single command:

```bash
docker-compose up --build -d
```
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000/api
- **PostgreSQL Database:** `localhost:5432`

---

## 6. Automated Testing

The system includes automated unit and integration tests powered by **Vitest** and **Supertest**:

```bash
cd server
npm test
```

### Test Coverage Highlights
- ✅ **Grade & GPA Engine:** Letter grade thresholds (O, A+, A, B+, B, C, P, F) and weighted formula calculation.
- ✅ **Schedule Conflict Engine:** Overlapping time windows and duplicate venue booking rejection.
- ✅ **Role-Based Access Control:** Unauthorized route prevention (Students blocked from Admin endpoints).
- ✅ **Hall Ticket Eligibility:** Verification of attendance ≥ 75% requirement and rejection of students below threshold.
- ✅ **Marks Validation:** Enforcement of `0 <= marks <= max_marks` bounds.
- ✅ **5-Failed Login Policy:** Automatic 15-minute account lock after 5 consecutive failed passwords.
- ✅ **Online Exam Lifecycle:** Attempt creation, server-side timer verification, incremental auto-save, and tab-switch audit tracking.
- ✅ **Attendance Integrity:** Prevention of duplicate session attendance records via database unique constraints.
- ✅ **Append-Only Audit Trail:** Verification that audit log events cannot be purged or altered.

---

## 7. Disaster Recovery & Backup Strategy (SRS § 23)

In accordance with institutional requirements:
- **Recovery Time Objective (RTO):** ≤ 4 Hours.
- **Recovery Point Objective (RPO):** ≤ 1 Hour.
- **Backup Regimen:**
  - Full daily snapshot at **02:00 local time** using `pg_dump -Fc`.
  - Incremental WAL archiving every **6 hours**.
  - Encrypted backup storage with **90-day retention**.
  - Examination and audit log records preserved for **5 years**.
- **Restoration Drill Command:**
  ```bash
  # Restore point-in-time snapshot
  pg_restore -U postgres -d ems_db -c /backups/ems_daily_20261011.dump
  ```

---

## 8. Requirements Traceability Matrix

For detailed cross-referencing between SRS sections, database models, controllers, and frontend views, please consult:
👉 [`docs/REQUIREMENTS_TRACEABILITY.md`](docs/REQUIREMENTS_TRACEABILITY.md)  
👉 [`docs/ERD.md`](docs/ERD.md)