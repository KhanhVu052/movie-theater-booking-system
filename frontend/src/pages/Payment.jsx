import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  ShieldCheck,
  CreditCard,
  AlertCircle,
  Loader2,
  ArrowLeft,
  XCircle,
  ExternalLink,
  MapPin,
  Calendar,
  Ticket,
} from 'lucide-react';
import Navbar, { CinemaBadgeIcon } from '../components/Navbar';
import { bookingApi } from '../api/bookingApi';
import { paymentApi } from '../api/paymentApi';

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

export default function Payment() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 10-minute live countdown timer
  const [timeLeft, setTimeLeft] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  // Payment creation state
  const [initiatingPayment, setInitiatingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // 1. Fetch booking details
  const fetchBooking = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await bookingApi.getBookingById(bookingId);
      const data = res?.data?.data ?? res?.data;
      if (data) {
        setBooking(data);

        // Check if already confirmed
        if (data.status === 'CONFIRMED') {
          navigate(`/payment/result?bookingId=${data.id}`);
          return;
        }

        // Calculate initial remaining seconds
        if (data.expiresAt) {
          const diffMs = new Date(data.expiresAt).getTime() - Date.now();
          const diffSec = Math.floor(diffMs / 1000);
          if (diffSec <= 0 || data.status === 'EXPIRED') {
            setIsExpired(true);
            setTimeLeft(0);
          } else {
            setTimeLeft(diffSec);
          }
        }
      } else {
        setError('Booking reservation not found.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load booking details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [bookingId, navigate]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  // Live countdown timer interval
  useEffect(() => {
    if (timeLeft === null || isExpired) return;

    if (timeLeft <= 0) {
      setIsExpired(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isExpired]);

  // Format MM:SS for countdown display
  const countdownFormatted = useMemo(() => {
    if (timeLeft === null || timeLeft <= 0) return '00:00';
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [timeLeft]);

  // Handle Pay with VNPAY Sandbox
  const handleProceedPayment = async () => {
    if (isExpired || !booking) return;

    setInitiatingPayment(true);
    setPaymentError('');

    try {
      const res = await paymentApi.createVnPayUrl({
        bookingId: Number(bookingId),
        bankCode: null, // Let customer select bank on VNPAY gateway
      });

      const paymentData = res?.data?.data ?? res?.data;
      if (paymentData?.paymentUrl) {
        // Redirect to VNPAY Sandbox gateway
        window.location.href = paymentData.paymentUrl;
      } else {
        setPaymentError('Unable to generate payment checkout link. Please try again.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Payment initiation failed. Please try again.';
      setPaymentError(msg);
    } finally {
      setInitiatingPayment(false);
    }
  };

  // Handle Cancel Booking
  const handleCancelReservation = async () => {
    if (!window.confirm('Are you sure you want to cancel this seat reservation?')) {
      return;
    }

    setCancelling(true);
    try {
      await bookingApi.cancelBooking(bookingId);
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to cancel reservation.';
      setPaymentError(msg);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0e0a07] text-[#f2e8dc] font-body flex flex-col select-none">
      <Navbar />

      {/* Loading state */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#e6c27a]" />
          <p className="text-sm font-medium text-[#ab9a84]">
            Retrieving reservation details and payment gateway...
          </p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="max-w-2xl mx-auto my-16 px-6 w-full">
          <div className="p-6 rounded-2xl bg-red-950/30 border border-red-800/60 flex items-start gap-4 text-red-200">
            <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-300">{error}</p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 mt-3 text-xs text-[#e6c27a] hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Home</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Payment Checkout Screen */}
      {!loading && !error && booking && (
        <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full flex flex-col">
          {/* Top Bar: Title & 10-Minute Countdown */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2e2316] pb-5 mb-8">
            <div>
              <h1 className="font-body font-bold text-2xl sm:text-3xl text-[#f7efe4] tracking-tight">
                Complete Your Payment
              </h1>
              <p className="text-xs text-[#ab9a84] mt-1">
                Booking Reference:{' '}
                <span className="font-mono font-bold text-[#e6c27a]">
                  {booking.bookingCode || `#${booking.id}`}
                </span>
              </p>
            </div>

            {/* Countdown Badge */}
            <div
              className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-colors ${
                isExpired
                  ? 'bg-red-950/50 border-red-800/80 text-red-300'
                  : 'bg-[#1c140c] border-[#5e4727] text-[#f3cb62]'
              }`}
            >
              <Clock className={`w-4 h-4 ${isExpired ? 'text-red-400' : 'animate-pulse text-[#f3cb62]'}`} />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-[#ab9a84] font-semibold">
                  {isExpired ? 'Status' : 'Seat Hold Time'}
                </span>
                <span className="font-mono text-lg font-black leading-none">
                  {isExpired ? 'EXPIRED' : countdownFormatted}
                </span>
              </div>
            </div>
          </div>

          {/* Expired Warning Banner */}
          {isExpired && (
            <div className="mb-8 p-5 rounded-xl bg-red-950/30 border border-red-800/60 text-xs text-red-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-bold text-sm text-red-300">
                  Seat Reservation Expired
                </p>
                <p className="text-red-200/90 leading-relaxed">
                  The 10-minute hold window for this booking has lapsed. In accordance with theater concurrency policy, your seats have been released back to the public pool.
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-900/40 border border-red-700 text-xs font-semibold text-white hover:bg-red-900/60 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Choose New Seats</span>
                </Link>
              </div>
            </div>
          )}

          {/* Checkout Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Left: Booking Details */}
            <div className="md:col-span-7 bg-[#140f0a] border border-[#2e2316] rounded-2xl p-6 space-y-6 shadow-md">
              <div className="border-b border-[#241a10] pb-4">
                <h2 className="font-body font-bold text-lg text-[#f7efe4] mb-3 flex items-center gap-2">
                  <Film className="w-4 h-4 text-[#e0b354]" />
                  <span>Screening Information</span>
                </h2>

                <h3 className="font-body font-extrabold text-xl text-[#f3cb62]">
                  {booking.movieTitle}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#ab9a84] mt-3">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#e6c27a]" />
                    {booking.cinemaName} • {booking.roomName}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#e6c27a]" />
                    {formatDate(booking.startTime)}
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-[#f5ece0]">
                    <Clock className="w-3.5 h-3.5 text-[#e6c27a]" />
                    {formatHour(booking.startTime)}
                  </span>
                </div>
              </div>

              {/* Reserved Seats */}
              <div className="border-b border-[#241a10] pb-4">
                <label className="block text-xs font-semibold text-[#ab9a84] mb-2 flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-[#e0b354]" />
                  <span>Reserved Seats</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {booking.items?.map((item) => (
                    <span
                      key={item.id}
                      className="px-3 py-1.5 rounded-lg bg-[#1f1710] border border-[#523d24] text-xs font-bold text-[#f3cb62]"
                    >
                      {item.rowName}
                      {item.seatNumber}{' '}
                      <span className="text-[10px] text-[#ab9a84] font-normal">
                        ({item.seatType})
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Customer Info */}
              <div className="text-xs text-[#ab9a84] space-y-1">
                <p>
                  <strong>Customer Account:</strong> {booking.userEmail}
                </p>
                <p className="text-[11px] text-[#786754]">
                  E-ticket and check-in confirmation will be sent to this email address.
                </p>
              </div>
            </div>

            {/* Right: Payment Method & Payment Action */}
            <div className="md:col-span-5 space-y-6">
              <div className="bg-[#18120c] border border-[#362919] rounded-2xl p-6 space-y-5 shadow-lg">
                <h2 className="font-body font-bold text-base text-[#f7efe4] border-b border-[#2e2316] pb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#e0b354]" />
                  <span>Select Payment Method</span>
                </h2>

                {/* VNPAY Provider Card */}
                <div className="p-3.5 rounded-xl bg-[#241a10] border border-[#e0b354] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center p-1 font-bold text-[#005ba6] text-xs">
                      VNPAY
                    </div>
                    <div>
                      <span className="font-bold text-xs text-[#f7efe4] block">
                        VNPAY Sandbox Gateway
                      </span>
                      <span className="text-[11px] text-[#ab9a84]">
                        QR Code, ATM, Visa, MasterCard
                      </span>
                    </div>
                  </div>
                  <span className="w-4 h-4 rounded-full border-4 border-[#e6c27a] bg-[#1a1209]" />
                </div>

                {/* Price Breakdown */}
                <div className="pt-3 border-t border-[#2e2316] space-y-2 text-xs">
                  <div className="flex justify-between text-[#ab9a84]">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-[#f5ece0]">
                      {formatCurrency(booking.subtotalAmount)}
                    </span>
                  </div>

                  {booking.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Voucher ({booking.voucherCode}):</span>
                      <span className="font-semibold">
                        -{formatCurrency(booking.discountAmount)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-baseline pt-2 border-t border-[#2e2316]">
                    <span className="text-sm font-bold text-[#f7efe4]">
                      Total Payable:
                    </span>
                    <span className="font-body font-extrabold text-xl text-[#f3cb62]">
                      {formatCurrency(booking.finalAmount)}
                    </span>
                  </div>
                </div>

                {paymentError && (
                  <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{paymentError}</span>
                  </div>
                )}

                {/* Primary Payment CTA */}
                <button
                  type="button"
                  onClick={handleProceedPayment}
                  disabled={isExpired || initiatingPayment || cancelling}
                  className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-b from-[#f3cb62] to-[#dda938] hover:from-[#f7d576] hover:to-[#e5b344] active:scale-[0.99] text-[#1a1209] font-body font-bold text-sm shadow-[0_6px_20px_rgba(221,169,56,0.3)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {initiatingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Connecting to VNPAY...</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4" />
                      <span>Pay with VNPAY ({formatCurrency(booking.finalAmount)})</span>
                    </>
                  )}
                </button>

                {/* Cancel Booking Action */}
                {!isExpired && (
                  <button
                    type="button"
                    onClick={handleCancelReservation}
                    disabled={cancelling || initiatingPayment}
                    className="w-full py-2 text-center text-xs text-[#ab9a84] hover:text-red-400 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{cancelling ? 'Cancelling...' : 'Cancel Reservation'}</span>
                  </button>
                )}

                <div className="text-[11px] text-[#786754] text-center pt-2 border-t border-[#241a10]">
                  <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-[#e0b354]" />
                  <span>Up to 3 payment attempts permitted while your seat hold remains active.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
