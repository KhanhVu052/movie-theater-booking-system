# 🎬 GoToro Cinema — Movie Theater Booking System

[![CI Pipeline](https://github.com/KhanhVu052/movie-theater-booking-system/actions/workflows/ci.yml/badge.svg)](https://github.com/KhanhVu052/movie-theater-booking-system/actions/workflows/ci.yml)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.3-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Java-21-ED8B00?logo=openjdk&logoColor=white)](https://www.oracle.com/java/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-5.1-FCC72B?logo=vitest&logoColor=black)](https://vitest.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)

A modern, production-grade movie theater booking and auditorium operations platform designed for high-concurrency seat reservation, strict financial transaction settlement, and an immersive Japanese Lacquer (*Urushi*) & Gold Leaf (*Kinpaku*) cinematic aesthetic.

---

## 🌟 Key Features

### 👤 Customer Experience
* **Hero Spotlight & Movie Catalog**: Interactive browsing for Now Showing and Coming Soon titles, genre filters, and trailer modal previews.
* **Interactive Auditorium Seat Layout (FR-BOOK-01)**: Real-time visual seat map supporting Standard, VIP, and Couple seating tiers.
* **10-Minute Hold Concurrency Guarantee (FR-BOOK-02)**: Concurrency-safe seat reservation powered by Database Pessimistic Write Locks (`SELECT ... FOR UPDATE`), strictly preventing double bookings across concurrent users.
* **Promotional Voucher Engine (FR-VOUC-01)**: Dynamic quota reservation supporting percentage and fixed discounts with minimum order thresholds and maximum discount ceilings.
* **VNPAY Sandbox Gateway Integration (FR-PAY-01)**: Online payment checkout with up to 3 payment retry attempts per reservation and live hold countdown clock.
* **Digital Admission Pass & E-Ticket (FR-PAY-02)**: Instant QR Code graphic, simulated barcode, and printable admission pass (`window.print()`).
* **Reservations History & Reviews (FR-REV-01)**: Customer booking ledger, in-page E-Ticket viewer modal, and verified post-screening ratings (1–5 stars) and reviews.
* **User Profile & Account Drawer**: Live account details fetched from `GET /api/v1/auth/me`.

### 🛡️ Administrative Operations Console (`/admin`)
* **Realized Revenue Reports (FR-REP-01)**: Date-range filtered financial auditing strictly aggregating confirmed `SUCCESS` transactions with `refund_status = 'NONE'`.
* **Auditorium Showtime Scheduling (FR-SHOW-01)**: Conflict detection engine enforcing room database locks and an automatic 15-minute hall cleaning buffer (`cleaning_end_time = end_time + 15m`).
* **Payment Ledger & Manual Refund Settlement (FR-PAY-02)**: Comprehensive audit log tracking VNPay transaction references and providing one-click manual refund settlement for transactions flagged as `REFUND_REQUIRED`.
* **Movie Catalog & Voucher Controls**: Publishing new cinema titles and activating promotional voucher campaigns with usage quotas.
* **Viewer Feedback Moderation**: Administrative moderation for customer reviews and star ratings.

---

## 🏗️ System Architecture

The application is structured as a **Modular Monolith** combined with a layered domain pattern:

```
movie-theater-booking-system/
├── backend/                  # Spring Boot 3 + Java 21 REST API
│   ├── src/main/java/com/example/cinema/
│   │   ├── auth/             # JWT Authentication & RBAC (CUSTOMER, ADMIN)
│   │   ├── movie/            # Movie catalog, genres, cast
│   │   ├── showtime/         # Cinemas, auditoriums, physical & showtime seats
│   │   ├── booking/          # Pessimistic lock seat holding & 10m expiry scheduler
│   │   ├── payment/          # VNPAY Sandbox integration, IPN callback & refunds
│   │   ├── voucher/          # Campaign quotas & redemption rules
│   │   ├── review/           # Customer rating & post-screening reviews
│   │   └── common/           # Global exception handler, BaseResponse, Security
├── frontend/                 # React 19 + Vite SPA
│   ├── src/
│   │   ├── api/              # Axios HTTP client with 401 interceptor
│   │   ├── components/       # Navbar, UserProfileModal, ETicketModal
│   │   ├── context/          # ToastContext & confirmation dialogs
│   │   ├── pages/            # Home, Detail, SeatSelection, Payment, MyBookings, Admin
│   │   ├── utils/            # formatters, voucherUtils, bookingUtils
│   │   └── test/             # Vitest automated business rule test suite
└── docs/
    └── SRS.md                # Software Requirements Specification (v2.9)
```

---

## 🔒 Concurrency & Lock Ordering Rules

To prevent Deadlocks under high concurrency (e.g. 50 users simultaneously requesting the same seat):
1. **Lock Ordering Hierarchy**:
   1. `users` table (`SELECT ... FOR UPDATE` in `createBooking` to lock user row first and enforce pending limit)
   2. `showtimes` table (`SELECT ... FOR UPDATE` when cancelling showtime, or `SELECT ... FOR SHARE` when creating booking)
   3. `bookings` table (`SELECT ... FOR UPDATE ORDER BY id ASC`)
   4. `showtime_seats` table (`SELECT ... FOR UPDATE ORDER BY id ASC`)
   5. `vouchers` table (`SELECT ... FOR UPDATE`)
2. **Expired Hold Recovery**:
   - If an existing reservation holding a seat has expired (`expires_at < NOW()`), the booking is transitioned to `EXPIRED`, voucher quota is released, and the seat is made `AVAILABLE` atomically for the waiting transaction.
3. **Automated Cleanup Scheduler**:
   - A background `@Scheduled` job sweeps every 30 seconds to reclaim unpurchased expired holds without blocking active payment callbacks.

---

## 🚀 Quick Start Guide

### Prerequisites
* **Java**: JDK 21+
* **Node.js**: v20 or v22 LTS
* **Database**: MySQL 8.0+
* **Build Tools**: Maven Wrapper (`mvnw`), npm

---

### 1. Database Setup
The easiest way is Docker Compose, which creates the `cinema_booking_db` database for you:
```bash
docker compose up -d mysql
```

Using your own MySQL instead? Create the database and point the app at it with environment variables (see step 2):
```sql
CREATE DATABASE cinema_booking_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
Defaults match `docker-compose.yml` (`root` / `root` on `localhost:3306`). Override with `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`.

---

### 2. Configure Secrets (environment variables)
Secrets are **not** stored in the repository. Copy `.env.example` to `.env` and fill it in:
```bash
cp .env.example .env
# JWT secret (required): paste the output into JWT_SECRET in .env
openssl rand -base64 48
```
| Variable | Required | Purpose |
|---|---|---|
| `JWT_SECRET` | yes | Base64 signing key for JWT, at least 32 bytes. The app refuses to start without it. |
| `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` | for first run | Creates the first `ADMIN` account when the database has none (password min 8 chars). |
| `DEV_TOOLS_ENABLED` | no (default `false`) | `true` enables the demo-only "simulate payment" endpoint (SRS FR-DEV-01). |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | no | Database connection overrides. |
| `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_RETURN_URL` | no | VNPay sandbox credentials. |

Load the file into your shell before starting the backend:
```bash
set -a; source .env; set +a
```

---

### 3. Run the Backend
```bash
cd backend
# Linux / macOS
./mvnw spring-boot:run

# Windows
mvnw.cmd spring-boot:run
```
The REST API will launch at `http://localhost:8080`.

#### Accounts
* **Administrator**: created on first start from `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` (Role: `ADMIN`). There is no built-in default password.
* **Customer**: Self-register via the UI or `POST /api/v1/auth/register`

#### Demo without a public VNPay callback
VNPay confirms payments by calling the IPN URL (server-to-server), which cannot reach `localhost`. For a local demo, set `DEV_TOOLS_ENABLED=true` and run the frontend with `npm run dev`: the payment page then offers an extra "Instant Test Payment" option. It follows the same rules as a real in-time IPN (booking must be `PENDING_PAYMENT`, not expired, seats still held) and is never shown in production builds.

---

### 4. Run the Frontend
```bash
cd frontend
npm install
npm run dev
```
The development server will launch at `http://localhost:5173`.

---

## 🧪 Testing & Code Quality

### Comprehensive Test Suite (Frontend + API QA)
To execute all frontend unit/integration tests and backend QA API checks in one go, ensure the backend is running and provide administrator credentials:
```bash
# On Windows command prompt:
set ADMIN_EMAIL=admin@cinema.com
set ADMIN_PASSWORD=YourPassword
run-all-tests.bat

# Or via npm inside frontend directory:
cd frontend
ADMIN_EMAIL=admin@cinema.com ADMIN_PASSWORD=YourPassword npm run test:all
```

### Frontend Automated Testing (Vitest)
```bash
cd frontend
# Run all automated test suites
npm test

# Run tests in watch mode
npm run test:watch
```

### Frontend Code Quality (ESLint)
```bash
cd frontend
npm run lint
```
*Current Status: 0 errors, 0 warnings.*

### Backend Tests (Maven)
```bash
cd backend
./mvnw test
```
> Backend integration tests (such as `ShowtimeWorkflowIntegrationTest`) run with Spring profile `test` (`@ActiveProfiles("test")`, configuring `application-test.yaml`). MySQL must be running to verify database constraints and concurrency locks. Connection parameters default to `localhost:3306`, `root`, blank password, but can be customized using environment variables:
> - `DB_URL` (default: `jdbc:mysql://localhost:3306/cinema_booking_db?useSSL=false&serverTimezone=Asia/Ho_Chi_Minh&allowPublicKeyRetrieval=true`)
> - `DB_USERNAME` (default: `root`)
> - `DB_PASSWORD` (default: empty)

---

## 📜 Specification Compliance
This project strictly implements and fulfills the software specification outlined in `docs/SRS.md`:
* **FR-SHOW-01**: Showtime scheduling with room collision prevention and 15m cleaning end time.
* **FR-SHOW-02**: Showtime cancellation with automated refund pipeline (`REFUND_REQUIRED`), voucher restoration, and strict deadlock-free locking order.
* **FR-BOOK-01**: Real-time seat inventory projection based on hold expiration state.
* **FR-BOOK-02**: Concurrency-safe seat holding for up to 8 seats per order.
* **FR-BOOK-03**: Background hold reclamation scheduler every 30 seconds.
* **FR-BOOK-04**: Pending reservation ceiling enforcement (max 2 active holds per user, HTTP 429).
* **FR-VOUC-01**: Voucher validation, quota reservation, and ceiling caps.
* **FR-PAY-01**: VNPAY payment attempt generation with retry limit of 3.
* **FR-PAY-02**: Server-to-Server IPN verification and `REFUND_REQUIRED` handling.
* **FR-REV-01**: Post-screening verified customer review policy.
* **FR-REP-01**: Realized revenue calculation excluding refund-required payments.
* **FR-DEV-01**: Demo-only payment simulation and showtime fast-forward, off by default (`DEV_TOOLS_ENABLED`).
* **NFR-SEC-02**: No secrets in the repository; JWT secret and first-admin credentials come from environment variables.

For the parts of the SRS roadmap that are not built yet (Notification/RabbitMQ, Redis caching, Swagger, high-concurrency stress tests IT-01 through IT-04) see SRS section 7.3.

---

## 📄 License
This project is developed for educational and demonstration purposes. All rights reserved.
