import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  ArrowLeft,
  Copy,
  Check,
  MapPin,
  Calendar,
  Ticket,
  Film,
  Loader2,
  AlertCircle,
  Home,
} from 'lucide-react';
import Navbar, { CinemaBadgeIcon } from '../components/Navbar';
import { paymentApi } from '../api/paymentApi';
import { bookingApi } from '../api/bookingApi';

const formatCurrency = (amount) => {
  return `${Number(amount || 0).toLocaleString('en-US')} VND`;
};

const formatHour = (isoString) => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return isoString;
  }
};

const formatDate = (isoString) => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
};

// SVG QR Code Placeholder Pattern
function QRCodeGraphic({ value = "GOTORO-TICKET" }) {
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
  const navigate = useNavigate();

  const [verifying, setVerifying] = useState(true);
  const [returnStatus, setReturnStatus] = useState(null);
  const [booking, setBooking] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Extract all params
  const queryParams = useMemo(() => {
    const params = {};
    searchParams.forEach((val, key) => {
      params[key] = val;
    });
    return params;
  }, [searchParams]);

  // Handle Verification & Polling
  const verifyPaymentAndBooking = useCallback(async () => {
    setVerifying(true);
    let resolvedBookingId = queryParams.bookingId;

    try {
      // 1. If redirected from VNPAY, verify signature and gateway response with backend
      if (queryParams.vnp_ResponseCode || queryParams.vnp_TxnRef) {
        const returnRes = await paymentApi.handleVnPayReturn(queryParams);
        const returnData = returnRes?.data?.data ?? returnRes?.data;
        setReturnStatus(returnData);

        if (returnData?.bookingId) {
          resolvedBookingId = returnData.bookingId;
        }
      }

      // 2. Poll for booking status (max 4 polling attempts for asynchronous IPN processing)
      if (resolvedBookingId) {
        let attempts = 0;
        let isConfirmed = false;

        while (attempts < 4 && !isConfirmed) {
          const bookingRes = await bookingApi.getBookingById(resolvedBookingId);
          const data = bookingRes?.data?.data ?? bookingRes?.data;

          if (data) {
            setBooking(data);
            if (data.status === 'CONFIRMED' || data.status === 'EXPIRED' || data.status === 'CANCELLED') {
              isConfirmed = true;
              break;
            }
          }

          attempts++;
          if (!isConfirmed && attempts < 4) {
            await new Promise((r) => setTimeout(r, 1500));
          }
        }
      }
    } catch (err) {
      console.error('Payment outcome check error:', err);
    } finally {
      setVerifying(false);
    }
  }, [queryParams]);

  useEffect(() => {
    verifyPaymentAndBooking();
  }, [verifyPaymentAndBooking]);

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const isSuccess =
    booking?.status === 'CONFIRMED' ||
    (returnStatus?.gatewaySuccess && queryParams.vnp_ResponseCode === '00');

  return (
    <div className="min-h-screen w-full bg-[#0e0a07] text-[#f2e8dc] font-body flex flex-col select-none">
      <Navbar />

      {/* Verifying Spinner */}
      {verifying && (
        <div className="flex-1 flex flex-col items-center justify-center py-32 gap-3.5">
          <Loader2 className="w-10 h-10 animate-spin text-[#e6c27a]" />
          <p className="text-sm font-medium text-[#ab9a84]">
            Verifying payment transaction with banking gateway...
          </p>
        </div>
      )}

      {/* Main Result Screen */}
      {!verifying && (
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
