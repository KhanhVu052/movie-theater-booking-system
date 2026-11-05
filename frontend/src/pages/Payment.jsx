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
  Film,
  Zap,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { bookingApi } from '../api/bookingApi';
import { paymentApi } from '../api/paymentApi';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatHour, formatDate } from '../utils/formatters';

// Simulated payment is a local-demo shortcut: only shown by `npm run dev`, never in a production build.
const SIM_ENABLED = import.meta.env.DEV;

export default function Payment() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { showToast, confirm } = useToast();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 10-minute live countdown timer
  const [timeLeft, setTimeLeft] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  // Payment gateway choice: 'SIMULATED_TEST' or 'VNPAY'
  const [selectedGateway, setSelectedGateway] = useState(SIM_ENABLED ? 'SIMULATED_TEST' : 'VNPAY');

  // Payment processing state
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

        // Remaining seconds: prefer the server-computed value so the countdown does not depend on
        // the browser clock/timezone; fall back to expiresAt for older responses.
        if (typeof data.secondsRemaining === 'number' || data.expiresAt) {
          const diffSec =
            typeof data.secondsRemaining === 'number'
              ? data.secondsRemaining
              : Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000);
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
      const msg = err.response?.data?.message || 'Failed to retrieve reservation details.';
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
    if (timeLeft === null || timeLeft <= 0 || isExpired) return;

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

  // Handle Payment Proceed (Direct simulation or VNPay Gateway)
  const handleProceedPayment = async () => {
    if (isExpired || !booking) return;

    setInitiatingPayment(true);
    setPaymentError('');

    try {
      if (selectedGateway === 'SIMULATED_TEST') {
        // Direct simulation for seamless, reliable testing
        await paymentApi.simulateSuccess({
          bookingId: Number(bookingId),
        });
        showToast('Payment successful! Your tickets have been confirmed.', 'success');
        navigate(`/payment/result?bookingId=${booking.id}`);
      } else {
        // VNPay Sandbox gateway URL generation
        const res = await paymentApi.createVnPayUrl({
          bookingId: Number(bookingId),
          bankCode: null,
        });

        const paymentData = res?.data?.data ?? res?.data;
        if (paymentData?.paymentUrl) {
          window.location.href = paymentData.paymentUrl;
        } else {
          setPaymentError('Unable to generate payment checkout link. Please try again.');
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Payment processing failed. Please try again.';
      setPaymentError(msg);
    } finally {
      setInitiatingPayment(false);
    }
  };

  // Handle Cancel Booking
  const handleCancelReservation = async () => {
    const confirmed = await confirm({
      title: 'Cancel Reservation',
      message: 'Are you sure you want to cancel this seat reservation? Your held seats will be released immediately.',
      confirmText: 'Yes, Cancel Seats',
      cancelText: 'Keep Reservation',
      isDestructive: true,
    });
    if (!confirmed) return;

    setCancelling(true);
    try {
      await bookingApi.cancelBooking(bookingId);
      showToast('Reservation cancelled successfully.', 'info');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to cancel reservation.';
      setPaymentError(msg);
      showToast(msg, 'error');
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
        <div className="flex-1 max-w-lg mx-auto px-6 py-20 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-800/80 flex items-center justify-center mx-auto text-red-400">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="font-body font-bold text-xl text-[#f7efe4]">
            Reservation Unavailable
          </h2>
          <p className="text-xs text-[#ab9a84] leading-relaxed">{error}</p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#241a10] border border-[#4d3c26] text-xs font-semibold text-[#f3cb62] hover:border-[#e0b354] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      )}

      {/* Main Checkout View */}
      {!loading && !error && booking && (
        <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col">
          {/* Top Hold Banner */}
          <div
            className={`mb-8 p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${
              isExpired
                ? 'bg-red-950/40 border-red-800/80 text-red-200'
                : 'bg-[#18110b] border-[#e0b354]/60 text-[#f7efe4] shadow-[0_4px_25px_rgba(224,179,84,0.12)]'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                  isExpired
                    ? 'bg-red-900/40 border-red-700 text-red-300'
                    : 'bg-[#241a10] border-[#e0b354] text-[#f3cb62]'
                }`}
              >
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-body font-bold text-sm tracking-wide">
                  {isExpired
                    ? '10-Minute Seat Reservation Expired'
                    : 'Seats Held Exclusively For You'}
                </h3>
                <p className="text-xs text-[#ab9a84] mt-0.5">
                  {isExpired
                    ? 'Your held seats have been released. Please return to the seat layout to select seats again.'
                    : 'Complete payment before the timer expires to confirm your admission tickets.'}
                </p>
              </div>
            </div>

            {/* Live Clock Display */}
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-[#8a765d] font-semibold">
                Time Remaining:
              </span>
              <div
                className={`px-3 py-1.5 rounded-lg font-mono font-extrabold text-base tracking-widest border ${
                  isExpired
                    ? 'bg-red-900/60 border-red-700 text-red-300'
                    : 'bg-[#140e08] border-[#e0b354] text-[#f3cb62] animate-pulse'
                }`}
              >
                {countdownFormatted}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Payment Gateway Selection */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-[#140f0a] border border-[#2e2316] rounded-2xl p-6 space-y-5">
                <h2 className="font-body font-bold text-lg text-[#f7efe4] flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#e0b354]" />
                  <span>Select Payment Gateway</span>
                </h2>

                <div className="space-y-3">
                  {/* DEV-ONLY SIMULATED PAYMENT: hidden in production builds (SRS FR-DEV-01) */}
                  {SIM_ENABLED && (
                  <div
                    onClick={() => setSelectedGateway('SIMULATED_TEST')}
                    className={`relative flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedGateway === 'SIMULATED_TEST'
                        ? 'border-[#e0b354] bg-[#1c140c] shadow-[0_2px_15px_rgba(224,179,84,0.12)]'
                        : 'border-[#2e2316] bg-[#120d09] hover:border-[#4d3c26]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="SIMULATED_TEST"
                        checked={selectedGateway === 'SIMULATED_TEST'}
                        onChange={() => setSelectedGateway('SIMULATED_TEST')}
                        className="accent-[#e0b354] w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-body font-bold text-sm text-[#f5ece0]">
                            Instant Test Payment (Direct Simulation)
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-950 border border-amber-600 text-amber-300 flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-300" />
                            Dev only
                          </span>
                        </div>
                        <p className="text-xs text-[#8a765d] mt-0.5">
                          Local demo shortcut: confirms the booking without VNPay (needs DEV_TOOLS_ENABLED=true on the backend). Not available in production builds.
                        </p>
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 font-mono text-[10px] text-[#e0b354] bg-[#120d09] px-2 py-1 rounded border border-[#3d2f1d]">
                      <span>INSTANT</span>
                    </div>
                  </div>
                  )}

                  {/* VNPAY SANDBOX OPTION */}
                  <div
                    onClick={() => setSelectedGateway('VNPAY')}
                    className={`relative flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedGateway === 'VNPAY'
                        ? 'border-[#e0b354] bg-[#1c140c] shadow-[0_2px_15px_rgba(224,179,84,0.12)]'
                        : 'border-[#2e2316] bg-[#120d09] hover:border-[#4d3c26]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="VNPAY"
                        checked={selectedGateway === 'VNPAY'}
                        onChange={() => setSelectedGateway('VNPAY')}
                        className="accent-[#e0b354] w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-body font-bold text-sm text-[#f5ece0]">
                            VNPAY Sandbox Gateway
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-950 border border-blue-700 text-blue-300">
                            External Portal
                          </span>
                        </div>
                        <p className="text-xs text-[#8a765d] mt-0.5">
                          Domestic ATM Cards, VNPay QR, Internet Banking &amp; Visa/Mastercard (subject to VNPay sandbox server status).
                        </p>
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 font-mono text-[10px] text-[#e0b354] bg-[#120d09] px-2 py-1 rounded border border-[#3d2f1d]">
                      <span>VNPAY</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#1c140c] border border-[#3d2f1d] text-xs text-[#ab9a84] flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#e0b354] shrink-0 mt-0.5" />
                  <span>
                    Your transaction is encrypted end-to-end. Upon successful payment, your seats will be locked as Booked and an E-Ticket with QR code will be generated.
                  </span>
                </div>
              </div>

              {/* Payment Error Notice */}
              {paymentError && (
                <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-200 flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isExpired || initiatingPayment}
                  onClick={handleProceedPayment}
                  className="w-full sm:flex-1 py-3 px-6 rounded-xl bg-gradient-to-b from-[#f3cb62] to-[#dda938] hover:from-[#f7d576] hover:to-[#e5b344] text-[#1a1209] font-body font-bold text-sm shadow-[0_4px_20px_rgba(224,179,84,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                >
                  {initiatingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {selectedGateway === 'SIMULATED_TEST'
                          ? 'Confirming Instant Payment...'
                          : 'Opening VNPay Gateway...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        Pay {formatCurrency(booking.finalAmount)}{' '}
                        {selectedGateway === 'SIMULATED_TEST' && '(Instant Test)'}
                      </span>
                      {selectedGateway === 'VNPAY' ? (
                        <ExternalLink className="w-4 h-4" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={cancelling}
                  onClick={handleCancelReservation}
                  className="w-full sm:w-auto py-3 px-4 rounded-xl bg-[#1c140c] border border-[#3d2f1d] hover:border-red-800/80 text-xs font-semibold text-[#ab9a84] hover:text-red-300 transition-colors cursor-pointer"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Reservation'}
                </button>
              </div>
            </div>

            {/* Right: Booking Summary Receipt */}
            <div className="lg:col-span-5 bg-[#140f0a] border border-[#3d2f1d] rounded-2xl p-6 space-y-5 sticky top-24">
              <div className="border-b border-[#2e2316] pb-4">
                <div className="flex items-center gap-2 text-xs text-[#e0b354] font-semibold mb-1">
                  <Film className="w-3.5 h-3.5" />
                  <span>Booking Order #{booking.id}</span>
                </div>
                <h3 className="font-body font-bold text-xl text-[#f7efe4] leading-snug">
                  {booking.movieTitle}
                </h3>
              </div>

              {/* Theater & Showtime Details */}
              <div className="space-y-2 text-xs text-[#ab9a84] border-b border-[#2e2316] pb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#e0b354] shrink-0" />
                  <span>
                    {booking.cinemaName} • <strong className="text-[#f5ece0]">{booking.roomName}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-[#e0b354] shrink-0" />
                  <span>{formatDate(booking.startTime)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#e0b354] shrink-0" />
                  <span>
                    Showtime: <strong className="text-[#f3cb62]">{formatHour(booking.startTime)}</strong>
                  </span>
                </div>
              </div>

              {/* Selected Seats Table */}
              <div className="space-y-2.5 border-b border-[#2e2316] pb-4">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#8a765d] block">
                  Reserved Seats ({booking.items?.length || 0})
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {booking.items?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded bg-[#1c140c]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#f3cb62]">
                          {item.rowName}{item.seatNumber}
                        </span>
                        <span className="text-[10px] text-[#8a765d] uppercase">
                          ({item.seatType})
                        </span>
                      </div>
                      <span className="font-mono text-[#c7b59d]">
                        {formatCurrency(item.price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Calculation Lines */}
              <div className="space-y-2 text-xs pt-1">
                <div className="flex items-center justify-between text-[#ab9a84]">
                  <span>Subtotal</span>
                  <span className="font-mono text-[#f5ece0]">
                    {formatCurrency(booking.subtotalAmount ?? booking.totalAmount ?? 0)}
                  </span>
                </div>

                {booking.discountAmount > 0 && (
                  <div className="flex items-center justify-between text-emerald-400">
                    <span>Discount Voucher</span>
                    <span className="font-mono font-semibold">
                      -{formatCurrency(booking.discountAmount)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-[#2e2316]">
                  <span className="font-bold text-sm text-[#f7efe4]">Total Payable</span>
                  <span className="font-body font-black text-xl text-[#f3cb62]">
                    {formatCurrency(booking.finalAmount)}
                  </span>
                </div>
              </div>

              {/* Return to seat selection */}
              {!isExpired && (
                <div className="pt-2 text-center">
                  <Link
                    to={`/booking/${booking.showtimeId}`}
                    className="text-xs text-[#8a765d] hover:text-[#e0b354] transition-colors"
                  >
                    Modify Selected Seats
                  </Link>
                </div>
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
