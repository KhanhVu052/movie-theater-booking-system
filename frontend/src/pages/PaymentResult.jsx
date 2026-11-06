import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Printer,
  Copy,
  Check,
  Loader2,
  Home,
  Clock,
  RefreshCw,
} from 'lucide-react';
import Navbar, { CinemaBadgeIcon } from '../components/Navbar';
import { paymentApi } from '../api/paymentApi';
import { bookingApi } from '../api/bookingApi';

import { formatCurrency, formatHour, formatDate } from '../utils/formatters';

// SVG QR Code Placeholder Pattern
function QRCodeGraphic({ value: _value = "GOTORO-TICKET" }) {
  return (
    <svg viewBox="0 0 100 100" className="w-28 h-28 bg-white p-2 rounded-lg shadow-inner">
      <rect x="5" y="5" width="25" height="25" fill="#140e08" />
      <rect x="10" y="10" width="15" height="15" fill="#ffffff" />
      <rect x="13" y="13" width="9" height="9" fill="#140e08" />

      <rect x="70" y="5" width="25" height="25" fill="#140e08" />
      <rect x="75" y="10" width="15" height="15" fill="#ffffff" />
      <rect x="78" y="13" width="9" height="9" fill="#140e08" />

      <rect x="5" y="70" width="25" height="25" fill="#140e08" />
      <rect x="10" y="75" width="15" height="15" fill="#ffffff" />
      <rect x="13" y="78" width="9" height="9" fill="#140e08" />

      {/* Scattered matrix dots */}
      <rect x="36" y="8" width="6" height="6" fill="#140e08" />
      <rect x="46" y="14" width="6" height="6" fill="#140e08" />
      <rect x="56" y="8" width="6" height="6" fill="#140e08" />
      <rect x="38" y="24" width="6" height="6" fill="#140e08" />
      <rect x="48" y="32" width="6" height="6" fill="#140e08" />
      <rect x="58" y="24" width="6" height="6" fill="#140e08" />

      <rect x="8" y="38" width="6" height="6" fill="#140e08" />
      <rect x="18" y="46" width="6" height="6" fill="#140e08" />
      <rect x="28" y="38" width="6" height="6" fill="#140e08" />
      <rect x="14" y="58" width="6" height="6" fill="#140e08" />

      <rect x="38" y="42" width="18" height="18" fill="#140e08" />
      <rect x="42" y="46" width="10" height="10" fill="#ffffff" />

      <rect x="70" y="40" width="6" height="6" fill="#140e08" />
      <rect x="82" y="46" width="6" height="6" fill="#140e08" />
      <rect x="76" y="58" width="6" height="6" fill="#140e08" />

      <rect x="38" y="72" width="6" height="6" fill="#140e08" />
      <rect x="48" y="80" width="6" height="6" fill="#140e08" />
      <rect x="62" y="72" width="6" height="6" fill="#140e08" />
      <rect x="74" y="80" width="6" height="6" fill="#140e08" />
      <rect x="84" y="72" width="6" height="6" fill="#140e08" />
    </svg>
  );
}

export default function PaymentResult() {
  const [searchParams] = useSearchParams();

  // 'VERIFYING' | 'PROCESSING' | 'SUCCESS' | 'FAILED'
  const [pageStatus, setPageStatus] = useState('VERIFYING');
  const [returnStatus, setReturnStatus] = useState(null);
  const [booking, setBooking] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [backoffAttempt, setBackoffAttempt] = useState(0);

  // Extract all params
  const queryParams = useMemo(() => {
    const params = {};
    searchParams.forEach((val, key) => {
      params[key] = val;
    });
    return params;
  }, [searchParams]);

  // Handle Verification & Exponential Backoff Polling (G4-05, HP-06)
  const verifyPaymentAndBooking = useCallback(async (signal = { cancelled: false }) => {
    setPageStatus('VERIFYING');
    let resolvedBookingId = queryParams.bookingId;
    let gatewaySuccess = false;

    try {
      // 1. If redirected from VNPAY, verify signature and gateway response with backend
      if (queryParams.vnp_ResponseCode || queryParams.vnp_TxnRef) {
        const returnRes = await paymentApi.handleVnPayReturn(queryParams);
        if (signal.cancelled) return;
        const returnData = returnRes?.data?.data ?? returnRes?.data;
        setReturnStatus(returnData);

        if (returnData?.bookingId) {
          resolvedBookingId = returnData.bookingId;
        }

        gatewaySuccess = Boolean(returnData?.gatewaySuccess && queryParams.vnp_ResponseCode === '00');

        if (!gatewaySuccess) {
          if (resolvedBookingId) {
            try {
              const res = await bookingApi.getBookingById(resolvedBookingId);
              if (signal.cancelled) return;
              setBooking(res?.data?.data ?? res?.data);
            } catch {
              // Ignore failure to fetch booking for failed payments
            }
          }
          if (signal.cancelled) return;
          setPageStatus('FAILED');
          return;
        }
      }

      if (signal.cancelled) return;

      // 2. Fetch booking status and apply Exponential Backoff if still PENDING_PAYMENT
      if (resolvedBookingId) {
        const initialRes = await bookingApi.getBookingById(resolvedBookingId);
        if (signal.cancelled) return;
        const initialBooking = initialRes?.data?.data ?? initialRes?.data;
        if (initialBooking) {
          setBooking(initialBooking);

          if (initialBooking.status === 'CONFIRMED') {
            setPageStatus('SUCCESS');
            return;
          }

          if (initialBooking.status === 'CANCELLED' || initialBooking.status === 'EXPIRED') {
            setPageStatus('FAILED');
            return;
          }

          // If still PENDING_PAYMENT: Enter Exponential Backoff polling (2s, 4s, 8s, 16s ~30s max)
          if (initialBooking.status === 'PENDING_PAYMENT') {
            setPageStatus('PROCESSING');

            const delays = [2000, 4000, 8000, 16000];
            let confirmed = false;

            for (let i = 0; i < delays.length; i++) {
              if (signal.cancelled) return;
              setBackoffAttempt(i + 1);
              await new Promise((r) => setTimeout(r, delays[i]));
              if (signal.cancelled) return;

              try {
                const pollRes = await bookingApi.getBookingById(resolvedBookingId);
                if (signal.cancelled) return;
                const pollData = pollRes?.data?.data ?? pollRes?.data;
                if (pollData) {
                  setBooking(pollData);
                  if (pollData.status === 'CONFIRMED') {
                    confirmed = true;
                    setPageStatus('SUCCESS');
                    break;
                  }
                  if (pollData.status === 'CANCELLED' || pollData.status === 'EXPIRED') {
                    setPageStatus('FAILED');
                    return;
                  }
                }
              } catch {
                // Ignore transient network errors during backoff polling
              }
            }

            if (signal.cancelled) return;
            if (!confirmed) {
              setPageStatus('PROCESSING');
            }
            return;
          }
        }
      }

      if (signal.cancelled) return;
      setPageStatus(gatewaySuccess ? 'SUCCESS' : 'FAILED');
    } catch (err) {
      if (signal.cancelled) return;
      console.error('Payment outcome check error:', err);
      setPageStatus('FAILED');
    }
  }, [queryParams]);

  useEffect(() => {
    const signal = { cancelled: false };
    verifyPaymentAndBooking(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [verifyPaymentAndBooking]);

  const handleManualRecheck = async () => {
    const bookingId = booking?.id || returnStatus?.bookingId || queryParams.bookingId;
    if (!bookingId) return;

    setRechecking(true);
    try {
      const res = await bookingApi.getBookingById(bookingId);
      const data = res?.data?.data ?? res?.data;
      if (data) {
        setBooking(data);
        if (data.status === 'CONFIRMED') {
          setPageStatus('SUCCESS');
        } else if (data.status === 'CANCELLED' || data.status === 'EXPIRED') {
          setPageStatus('FAILED');
        }
      }
    } catch (err) {
      console.error('Manual recheck error:', err);
    } finally {
      setRechecking(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const isSuccess = pageStatus === 'SUCCESS';
  const isProcessing = pageStatus === 'PROCESSING';

  return (
    <div className="min-h-screen w-full bg-[#0e0a07] text-[#f2e8dc] font-body flex flex-col select-none">
      <Navbar />

      {/* Verifying Spinner */}
      {pageStatus === 'VERIFYING' && (
        <div className="flex-1 flex flex-col items-center justify-center py-32 gap-3.5">
          <Loader2 className="w-10 h-10 animate-spin text-[#e6c27a]" />
          <p className="text-sm font-medium text-[#ab9a84]">
            Verifying payment transaction with banking gateway...
          </p>
        </div>
      )}

      {/* Main Result Screen */}
      {pageStatus !== 'VERIFYING' && (
        <div className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 w-full flex flex-col items-center">
          {/* SUCCESS: DIGITAL E-TICKET */}
          {isSuccess && booking ? (
            <div className="w-full space-y-6">
              {/* Success Badge */}
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-emerald-950/60 border-2 border-emerald-500/80 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h1 className="font-body font-extrabold text-3xl sm:text-4xl text-[#f7efe4] tracking-tight">
                  Payment Successful!
                </h1>
                <p className="text-sm text-[#ab9a84]">
                  Your reservation is confirmed. Please present your digital e-ticket at the theater check-in counter.
                </p>
              </div>

              {/* VIP Golden E-Ticket Card */}
              <div
                id="printable-ticket"
                className="relative w-full rounded-2xl overflow-hidden border-2 border-[#5e4727] shadow-[0_25px_60px_rgba(0,0,0,0.95)]"
                style={{
                  background:
                    'radial-gradient(circle at 50% 20%, #261e15 0%, #15100b 60%, #0d0906 100%)',
                }}
              >
                {/* Gold Top Trim */}
                <div className="h-2 w-full bg-gradient-to-r from-[#f3cb62] via-[#e6c27a] to-[#dda938]" />

                <div className="p-6 sm:p-8 space-y-6">
                  {/* Ticket Header */}
                  <div className="flex items-center justify-between border-b border-[#362919] pb-4">
                    <div className="flex items-center gap-2.5">
                      <CinemaBadgeIcon className="w-8 h-8" />
                      <div>
                        <span className="font-body font-bold text-lg text-[#e6c27a] leading-none">
                          GoToro Cinema
                        </span>
                        <span className="text-[10px] tracking-widest uppercase text-[#8a765d] block mt-0.5">
                          Official E-Ticket
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-[#ab9a84] block">
                        Booking Code
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono font-extrabold text-base text-[#f3cb62]">
                          {booking.bookingCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(booking.bookingCode)}
                          title="Copy booking code"
                          className="text-[#ab9a84] hover:text-[#f3cb62] transition-colors cursor-pointer"
                        >
                          {copiedCode ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Movie Info */}
                  <div className="space-y-1">
                    <h2 className="font-body font-extrabold text-2xl sm:text-3xl text-[#f7efe4] tracking-tight">
                      {booking.movieTitle}
                    </h2>
                    <p className="text-xs text-[#e0b354] font-semibold">
                      {booking.cinemaName} • {booking.roomName}
                    </p>
                  </div>

                  {/* Screening Timing & Seats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#120d09]/80 border border-[#362919] text-xs">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#8a765d] font-bold block">
                        Date
                      </span>
                      <span className="font-bold text-[#f5ece0] mt-0.5 block">
                        {formatDate(booking.startTime)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#8a765d] font-bold block">
                        Showtime
                      </span>
                      <span className="font-extrabold text-[#f3cb62] mt-0.5 block text-sm">
                        {formatHour(booking.startTime)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#8a765d] font-bold block">
                        Seats ({booking.items?.length})
                      </span>
                      <span className="font-extrabold text-[#f5ece0] mt-0.5 block">
                        {booking.items?.map((i) => `${i.rowName}${i.seatNumber}`).join(', ')}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#8a765d] font-bold block">
                        Total Paid
                      </span>
                      <span className="font-extrabold text-[#f3cb62] mt-0.5 block">
                        {formatCurrency(booking.finalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Tear Strip Dotted Line */}
                  <div className="relative py-2">
                    <div className="border-t-2 border-dashed border-[#453422] w-full" />
                    <div className="absolute -left-10 top-0 w-6 h-6 rounded-full bg-[#0e0a07] border-r-2 border-[#5e4727]" />
                    <div className="absolute -right-10 top-0 w-6 h-6 rounded-full bg-[#0e0a07] border-l-2 border-[#5e4727]" />
                  </div>

                  {/* Ticket Footer & QR Code Check-in */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-1">
                    <div className="space-y-1.5 text-center sm:text-left">
                      <span className="text-xs font-bold text-[#e6c27a] block">
                        Fast-Track Cinema Entrance
                      </span>
                      <p className="text-[11px] text-[#ab9a84] max-w-sm leading-relaxed">
                        Scan this QR code at the automated entrance turnstile or show it to cinema staff for instant admission.
                      </p>
                      <p className="text-[10px] text-[#786754]">
                        Holder: {booking.userEmail}
                      </p>
                    </div>

                    <div className="shrink-0">
                      <QRCodeGraphic value={booking.bookingCode} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-6 py-3 rounded-xl bg-[#1c140c] border border-[#5e4727] hover:border-[#e6c27a] text-xs font-bold text-[#f3cb62] flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save Ticket</span>
                </button>

                <Link
                  to="/"
                  className="px-6 py-3 rounded-xl bg-gradient-to-b from-[#f3cb62] to-[#dda938] hover:from-[#f7d576] hover:to-[#e5b344] text-[#1a1209] font-body font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  <span>Return to Home</span>
                </Link>
              </div>
            </div>
          ) : isProcessing ? (
            /* PROCESSING STATE (G4-05) */
            <div className="w-full max-w-lg text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-amber-950/60 border-2 border-amber-500/80 flex items-center justify-center mx-auto text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                <Clock className="w-9 h-9 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h1 className="font-body font-extrabold text-3xl text-[#f7efe4] tracking-tight">
                  Confirming Your Reservation...
                </h1>
                <p className="text-xs text-[#ab9a84] leading-relaxed">
                  We have received your payment information from VNPay. The cinema reservation system is finalizing your booking confirmation.
                </p>
                {backoffAttempt > 0 && (
                  <p className="text-[11px] font-mono text-[#e6c27a]">
                    Checking confirmation attempt {backoffAttempt} of 4...
                  </p>
                )}
              </div>

              {booking && (
                <div className="p-4 rounded-xl bg-[#18120c] border border-[#362919] text-xs text-left space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#ab9a84]">Movie:</span>
                    <span className="font-bold text-[#f5ece0]">{booking.movieTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#ab9a84]">Booking Code:</span>
                    <span className="font-mono text-[#f3cb62]">{booking.bookingCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#ab9a84]">Status:</span>
                    <span className="font-bold uppercase text-amber-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                      Awaiting Confirmation
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleManualRecheck}
                  disabled={rechecking}
                  className="px-6 py-3 rounded-xl bg-gradient-to-b from-[#f3cb62] to-[#dda938] hover:from-[#f7d576] hover:to-[#e5b344] text-[#1a1209] font-body font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${rechecking ? 'animate-spin' : ''}`} />
                  <span>{rechecking ? 'Checking...' : 'Check Status Again'}</span>
                </button>

                <Link
                  to="/my-bookings"
                  className="px-6 py-3 rounded-xl bg-[#1c140c] border border-[#3d2f1d] text-xs font-semibold text-[#ab9a84] hover:text-[#f5ece0] transition-colors"
                >
                  My Bookings
                </Link>

                <Link
                  to="/"
                  className="px-6 py-3 rounded-xl bg-[#1c140c] border border-[#3d2f1d] text-xs font-semibold text-[#ab9a84] hover:text-[#f5ece0] transition-colors"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          ) : (
            /* PAYMENT FAILED OR EXPIRED STATE */
            <div className="w-full max-w-lg text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-red-950/60 border-2 border-red-500/80 flex items-center justify-center mx-auto text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                <XCircle className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h1 className="font-body font-extrabold text-3xl text-[#f7efe4] tracking-tight">
                  Payment Unsuccessful
                </h1>
                <p className="text-xs text-[#ab9a84] leading-relaxed">
                  {returnStatus?.message ||
                    'The transaction was cancelled or could not be verified by the banking gateway.'}
                </p>
              </div>

              {booking && (
                <div className="p-4 rounded-xl bg-[#18120c] border border-[#362919] text-xs text-left space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#ab9a84]">Movie:</span>
                    <span className="font-bold text-[#f5ece0]">{booking.movieTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#ab9a84]">Booking Code:</span>
                    <span className="font-mono text-[#f3cb62]">{booking.bookingCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#ab9a84]">Booking Status:</span>
                    <span className="font-bold uppercase text-red-400">{booking.status}</span>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                {booking?.id && booking.status === 'PENDING_PAYMENT' ? (
                  <Link
                    to={`/payment/${booking.id}`}
                    className="px-6 py-3 rounded-xl bg-gradient-to-b from-[#f3cb62] to-[#dda938] hover:from-[#f7d576] hover:to-[#e5b344] text-[#1a1209] font-body font-bold text-xs shadow-md transition-all"
                  >
                    Retry Payment
                  </Link>
                ) : (
                  <Link
                    to="/"
                    className="px-6 py-3 rounded-xl bg-gradient-to-b from-[#f3cb62] to-[#dda938] hover:from-[#f7d576] hover:to-[#e5b344] text-[#1a1209] font-body font-bold text-xs shadow-md transition-all"
                  >
                    Choose New Seats
                  </Link>
                )}

                <Link
                  to="/"
                  className="px-6 py-3 rounded-xl bg-[#1c140c] border border-[#3d2f1d] text-xs font-semibold text-[#ab9a84] hover:text-[#f5ece0] transition-colors"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
