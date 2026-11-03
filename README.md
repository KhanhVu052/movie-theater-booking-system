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
    └── SRS.md                # Software Requirements Specification (v2.2)
```

---

## 🔒 Concurrency & Lock Ordering Rules

To prevent Deadlocks under high concurrency (e.g. 50 users simultaneously requesting the same seat):
1. **Lock Ordering Hierarchy**:
   1. `bookings` table (`SELECT ... FOR UPDATE`)
   2. `showtime_seats` table (`SELECT ... FOR UPDATE ORDER BY id ASC`)
   3. `vouchers` table (`SELECT ... FOR UPDATE`)
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
Create the MySQL database:
```sql
CREATE DATABASE cinema_booking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Configure connection parameters in `backend/src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/cinema_booking?useSSL=false&serverTimezone=Asia/Ho_Chi_Minh
spring.datasource.username=root
spring.datasource.password=your_password
```

---

### 2. Run the Backend
```bash
cd backend
# Linux / macOS
./mvnw spring-boot:run

# Windows
mvnw.cmd spring-boot:run
```
The REST API will launch at `http://localhost:8080`.

#### Default Credentials
* **Administrator**: `admin@cinema.com` / `Admin123@` (Role: `ADMIN`)
* **Customer**: Self-register via the UI or `POST /api/v1/auth/register`

---

### 3. Run the Frontend
```bash
cd frontend
npm install
npm run dev
```
The development server will launch at `http://localhost:5173`.

---

## 🧪 Testing & Code Quality

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

---

## 📜 Specification Compliance
This project strictly implements and fulfills the software specification outlined in `docs/SRS.md`:
* **FR-SHOW-01**: Showtime scheduling with room collision prevention and 15m cleaning end time.
* **FR-BOOK-01**: Real-time seat inventory projection based on hold expiration state.
* **FR-BOOK-02**: Concurrency-safe seat holding for up to 8 seats per order.
* **FR-BOOK-03**: Background hold reclamation scheduler every 30 seconds.
* **FR-VOUC-01**: Voucher validation, quota reservation, and ceiling caps.
* **FR-PAY-01**: VNPAY payment attempt generation with retry limit of 3.
* **FR-PAY-02**: Server-to-Server IPN verification and `REFUND_REQUIRED` handling.
* **FR-REV-01**: Post-screening verified customer review policy.
* **FR-REP-01**: Realized revenue calculation excluding refund-required payments.

---

## 📄 License
This project is developed for educational and demonstration purposes. All rights reserved.
