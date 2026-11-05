/**
 * AUTOMATED END-TO-END QA SUITE FOR GOTORO CINEMA ADMIN DASHBOARD
 * -------------------------------------------------------------
 * Executes all core test cases from the comprehensive specification
 * and verifies API contracts, domain validation, and business pipelines.
 *
 * Run with: node scripts/test-admin-suite.js
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080/api/v1';

let authToken = '';
const results = [];

function pass(tc, name, durationMs) {
  results.push({ tc, name, status: 'PASSED', durationMs });
  console.log(`\x1b[32m✔ [PASSED]\x1b[0m \x1b[1m${tc}\x1b[0m: ${name} (${durationMs}ms)`);
}

function fail(tc, name, error, durationMs) {
  results.push({ tc, name, status: 'FAILED', error: error.message || String(error), durationMs });
  console.error(`\x1b[31m✖ [FAILED]\x1b[0m \x1b[1m${tc}\x1b[0m: ${name} - ${error.message} (${durationMs}ms)`);
}

async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return {
    status: response.status,
    ok: response.ok,
    data: json?.data !== undefined ? json.data : json,
    raw: json,
  };
}

async function runTest(tc, name, fn) {
  const start = Date.now();
  try {
    await fn();
    pass(tc, name, Date.now() - start);
  } catch (err) {
    fail(tc, name, err, Date.now() - start);
  }
}

async function main() {
  console.log('\n\x1b[33m===============================================================');
  console.log('  GOTORO CINEMA - AUTOMATED ADMIN OPERATIONS TEST SUITE (QA)');
  console.log('===============================================================\x1b[0m\n');

  // TC-AUTH-01: Admin Login
  await runTest('TC-AUTH-01', 'Authenticate System Administrator and obtain Bearer JWT', async () => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@cinema.com',
        password: 'Admin123@',
      }),
    });

    const token = res.data?.accessToken || res.data?.token;
    if (res.status !== 200 || !token) {
      throw new Error(`Authentication failed: status ${res.status}`);
    }
    authToken = token;
  });

  // TC-REP-01: Revenue Reports
  await runTest('TC-REP-01', 'Fetch Realized Revenue Reports & Metrics (FR-REP-01)', async () => {
    const res = await apiRequest('/payments/reports/revenue?startDate=2026-10-01T00:00:00&endDate=2026-11-10T23:59:59');
    if (!res.ok) throw new Error(`Revenue fetch failed: ${res.status}`);

    const report = res.data;
    if (typeof report.totalRevenue !== 'number' || report.totalRevenue < 0) {
      throw new Error('Invalid totalRevenue in revenue report');
    }
    if (report.totalSuccessfulTransactions === undefined || report.totalTicketsSold === undefined) {
      throw new Error('Missing totalSuccessfulTransactions or totalTicketsSold metrics');
    }
    if (!Array.isArray(report.movieBreakdown)) {
      throw new Error('movieBreakdown must be an array');
    }
  });

  // TC-SHOW-01: Showtime Schedules
  await runTest('TC-SHOW-01', 'Fetch Showtime Schedules with Hall & Cinema Mapping', async () => {
    const res = await apiRequest('/showtimes?page=1&size=20');
    if (!res.ok) throw new Error(`Showtimes fetch failed: ${res.status}`);

    const items = res.data?.items || res.data;
    if (!Array.isArray(items)) throw new Error('Showtimes list must be an array');
    if (items.length > 0) {
      const st = items[0];
      if (!st.movieTitle || !st.roomName || !st.startTime || !st.status) {
        throw new Error('Showtime item missing required contract fields');
      }
    }
  });

  // TC-SHOW-02: Date Window Filtering
  await runTest('TC-SHOW-02', 'Filter showtimes by date window (Sync with customer calendar)', async () => {
    const res = await apiRequest('/showtimes?fromTime=2026-11-05T00:00:00&toTime=2026-11-05T23:59:59&size=100');
    if (!res.ok) throw new Error(`Showtimes date filter failed: ${res.status}`);

    const items = res.data?.items || res.data || [];
    for (const st of items) {
      const showDate = st.startTime.split('T')[0];
      if (showDate !== '2026-11-05') {
        throw new Error(`Showtime date mismatch: expected 2026-11-05, got ${showDate}`);
      }
    }
  });

  // TC-SHOW-03: Block Showtime Creation for Ended Movie
  await runTest('TC-SHOW-03', 'Enforce licensing policy: Reject showtime creation for ENDED movie', async () => {
    // 1. Find an ended movie
    const moviesRes = await apiRequest('/movies?status=ENDED&size=5');
    const endedList = moviesRes.data?.items || moviesRes.data || [];
    if (endedList.length === 0) return;
    const endedMovieId = endedList[0].id;

    // 2. Fetch active room
    const cinemasRes = await apiRequest('/cinemas');
    const cinemas = cinemasRes.data || [];
    if (cinemas.length === 0) return;

    const roomsRes = await apiRequest(`/rooms?cinemaId=${cinemas[0].id}`);
    const rooms = roomsRes.data || [];
    if (rooms.length === 0) return;
    const roomId = rooms[0].id;

    // 3. Attempt to schedule showtime for ended movie
    const createRes = await apiRequest('/showtimes', {
      method: 'POST',
      body: JSON.stringify({
        movieId: endedMovieId,
        roomId: roomId,
        format: '2D',
        translationType: 'SUBTITLE',
        startTime: '2026-12-01T10:00:00',
        basePrice: 80000,
      }),
    });

    if (createRes.ok || createRes.status === 201) {
      throw new Error('Security/Business violation: System allowed creating showtime for an ENDED movie!');
    }
  });

  // TC-PAY-01: Payment Ledger & Refund Filter
  await runTest('TC-PAY-01', 'Query Payment Transactions and verify Refund Auditing (FR-PAY-02)', async () => {
    const res = await apiRequest('/payments?page=1&size=20');
    if (!res.ok) throw new Error(`Payment ledger fetch failed: ${res.status}`);

    const items = res.data?.items || res.data;
    if (!Array.isArray(items)) throw new Error('Payments list must be an array');
    if (items.length > 0) {
      const p = items[0];
      if (!p.transactionRef || p.amount === undefined || !p.status || !p.refundStatus) {
        throw new Error('Payment item missing required auditing fields');
      }
    }
  });

  // TC-MOV-01: Movie Catalog
  await runTest('TC-MOV-01', 'Inspect Cinema Movie Catalog and Status Lifecycle', async () => {
    const res = await apiRequest('/movies?page=1&size=50');
    if (!res.ok) throw new Error(`Movie catalog fetch failed: ${res.status}`);

    const items = res.data?.items || res.data || [];
    const validStatuses = new Set(['NOW_SHOWING', 'COMING_SOON', 'ENDED']);
    for (const m of items) {
      if (!validStatuses.has(m.status)) {
        throw new Error(`Invalid movie status detected: ${m.status}`);
      }
    }
  });

  // TC-VOU-01: Promotional Vouchers
  await runTest('TC-VOU-01', 'Verify Voucher Administration & Redemption Configuration', async () => {
    const res = await apiRequest('/vouchers');
    if (!res.ok) throw new Error(`Vouchers fetch failed: ${res.status}`);

    const vouchers = res.data || [];
    if (Array.isArray(vouchers) && vouchers.length > 0) {
      const v = vouchers[0];
      if (!v.code || v.discountValue === undefined || v.isActive === undefined) {
        throw new Error('Voucher missing code, discountValue, or isActive flag');
      }
    }
  });

  // TC-REV-01: Review Moderation
  await runTest('TC-REV-01', 'Verify Review Moderation Ledger for Administrator (FR-REV-01)', async () => {
    const res = await apiRequest('/reviews?page=1&size=20');
    if (!res.ok) throw new Error(`Reviews fetch failed: ${res.status}`);
  });

  // Print Summary
  const passed = results.filter((r) => r.status === 'PASSED').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;
  const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);

  console.log('\n\x1b[33m---------------------------------------------------------------');
  console.log(`  QA SUMMARY: ${passed}/${results.length} PASSED  |  ${failed} FAILED  (${totalDuration}ms)`);
  console.log('---------------------------------------------------------------\x1b[0m\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
