import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Ticket,
  Clock,
  Calendar,
  MapPin,
  Film,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowRight,
  Loader2,
  Copy,
  Check,
  Star,
  MessageSquare,
  X,
  CreditCard,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { bookingApi } from '../api/bookingApi';
import { reviewApi } from '../api/reviewApi';
import ETicketModal from '../components/ETicketModal';
import { useToast } from '../context/ToastContext';

import { formatCurrency, formatHour, formatDate } from '../utils/formatters';

export default function MyBookings() {
  const { showToast, confirm } = useToast();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [copiedId, setCopiedId] = useState('');
  const [currentTime] = useState(() => Date.now());

  // Review modal states
  const [reviewModalData, setReviewModalData] = useState(null); // { movieId, bookingId, movieTitle }
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [reviewError, setReviewError] = useState('');

  // Cancelling state
  const [cancellingId, setCancellingId] = useState(null);
  const [selectedTicketBooking, setSelectedTicketBooking] = useState(null);

  const token = localStorage.getItem('token');

  // Fetch bookings
  const fetchMyBookings = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await bookingApi.getMyBookings({ page: 1, size: 50 });
      const raw = res?.data?.data ?? res?.data;
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw?.content)
        ? raw.content
        : [];
      setBookings(list);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load booking history.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMyBookings();
  }, [fetchMyBookings]);

  // Filter bookings by active tab
  const filteredBookings = useMemo(() => {
    if (activeTab === 'CONFIRMED') {
      return bookings.filter((b) => b.status === 'CONFIRMED');
    }
    if (activeTab === 'PENDING_PAYMENT') {
      return bookings.filter((b) => b.status === 'PENDING_PAYMENT');
    }
    if (activeTab === 'PAST') {
      return bookings.filter((b) => b.status === 'CANCELLED' || b.status === 'EXPIRED');
    }
    return bookings;
  }, [bookings, activeTab]);

  const handleCopyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const handleCancelBooking = async (id) => {
    const confirmed = await confirm({
      title: 'Cancel Reservation',
      message: 'Are you sure you want to cancel this pending booking? The held seats will be released back to the auditorium.',
      confirmText: 'Yes, Cancel Booking',
      cancelText: 'Keep Booking',
      isDestructive: true,
    });
    if (!confirmed) return;

    setCancellingId(id);
    try {
      await bookingApi.cancelBooking(id);
      showToast('Booking reservation cancelled.', 'info');
      fetchMyBookings();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel booking.', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  // Cancel Confirmed Booking within 60-minute refund window (G2-05)
  const handleCancelConfirmedBooking = async (id, movieTitle) => {
    const confirmed = await confirm({
      title: 'Hủy vé & Yêu cầu hoàn tiền',
      message: `Bạn có chắc chắn muốn hủy đơn vé xem phim "${movieTitle}"? Toàn bộ ghế đã chọn sẽ được trả lại và yêu cầu hoàn tiền sẽ được chuyển tới ban quản trị rạp.`,
      confirmText: 'Xác nhận hủy vé & hoàn tiền',
      cancelText: 'Giữ vé',
      isDestructive: true,
    });
    if (!confirmed) return;

    setCancellingId(id);
    try {
      await bookingApi.cancelConfirmedBooking(id);
      showToast('Đã hủy vé thành công. Yêu cầu hoàn tiền đang được ban quản lý xử lý.', 'info');
      fetchMyBookings();
    } catch (err) {
      const resData = err.response?.data;
      const code = resData?.code;
      if (code === 1508) {
        showToast('Đã quá thời hạn hủy vé (chỉ được hủy trước giờ chiếu tối thiểu 60 phút).', 'error');
      } else {
        showToast(resData?.message || 'Không thể hủy vé.', 'error');
      }
    } finally {
      setCancellingId(null);
    }
  };

  // Submit review handler
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewModalData) return;

    setSubmittingReview(true);
    setReviewError('');
    setReviewSuccess('');

    try {
      await reviewApi.createReview({
        movieId: reviewModalData.movieId,
        rating: Number(rating),
        comment: comment.trim(),
      });

      setReviewSuccess('Thank you! Your review has been submitted successfully.');
      setTimeout(() => {
        setReviewModalData(null);
        setReviewSuccess('');
        setComment('');
        setRating(5);
      }, 1800);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit review.';
      setReviewError(msg);
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0e0a07] text-[#f2e8dc] font-body flex flex-col select-none">
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2e2316] pb-6 mb-8">
          <div>
            <h1 className="font-body font-extrabold text-3xl sm:text-4xl text-[#f7efe4] tracking-tight flex items-center gap-2.5">
              <Ticket className="w-8 h-8 text-[#e0b354]" />
              <span>My Tickets &amp; Bookings</span>
            </h1>
            <p className="text-xs text-[#ab9a84] mt-1">
              View your active admissions, digital QR e-tickets, and screening history.
            </p>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1f1710] border border-[#4d3c26] text-xs font-semibold text-[#e6c27a] hover:border-[#e0b354] transition-colors self-start sm:self-center"
          >
            <Film className="w-3.5 h-3.5" />
            <span>Browse More Movies</span>
          </Link>
        </div>

        {/* Guest Guard */}
        {!token && (
          <div className="p-8 rounded-2xl bg-[#140f0a] border border-[#362919] text-center max-w-lg mx-auto my-12 space-y-4">
            <Ticket className="w-12 h-12 text-[#e0b354] mx-auto opacity-80" />
            <h2 className="font-body font-bold text-xl text-[#f7efe4]">
              Sign in to view your tickets
            </h2>
            <p className="text-xs text-[#ab9a84] leading-relaxed">
              Log in to your GoToro account to access your reserved seats, download digital e-tickets, and manage orders.
            </p>
            <Link
              to="/login?redirect=/my-bookings"
              className="inline-flex px-6 py-2.5 rounded-lg bg-gradient-to-b from-[#f3cb62] to-[#dda938] text-[#1a1209] font-bold text-xs shadow-md"
            >
              Sign In to GoToro
            </Link>
          </div>
        )}

        {token && (
          <>
            {/* Filter Tabs */}
            <div className="flex items-center gap-2 border-b border-[#241a10] pb-3 mb-6 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'ALL'
                    ? 'bg-[#241a10] border border-[#e0b354] text-[#f3cb62]'
                    : 'text-[#ab9a84] hover:text-[#f2e8dc]'
                }`}
              >
                All Bookings ({bookings.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('CONFIRMED')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'CONFIRMED'
                    ? 'bg-[#241a10] border border-[#e0b354] text-[#f3cb62]'
                    : 'text-[#ab9a84] hover:text-[#f2e8dc]'
                }`}
              >
                Confirmed Tickets ({bookings.filter((b) => b.status === 'CONFIRMED').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('PENDING_PAYMENT')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'PENDING_PAYMENT'
                    ? 'bg-[#241a10] border border-[#e0b354] text-[#f3cb62]'
                    : 'text-[#ab9a84] hover:text-[#f2e8dc]'
                }`}
              >
                Awaiting Payment ({bookings.filter((b) => b.status === 'PENDING_PAYMENT').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('PAST')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'PAST'
                    ? 'bg-[#241a10] border border-[#e0b354] text-[#f3cb62]'
                    : 'text-[#ab9a84] hover:text-[#f2e8dc]'
                }`}
              >
                Cancelled / Expired ({bookings.filter((b) => b.status === 'CANCELLED' || b.status === 'EXPIRED').length})
              </button>
            </div>

            {/* Loading */}
            {loading && (
              <div className="py-24 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#e6c27a]" />
                <p className="text-xs text-[#ab9a84]">Loading your bookings...</p>
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/60 text-xs text-red-200 flex items-center gap-3 mb-6">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && filteredBookings.length === 0 && (
              <div className="p-12 rounded-2xl bg-[#140f0a] border border-[#2e2316] text-center max-w-md mx-auto my-8 space-y-3">
                <Ticket className="w-10 h-10 text-[#8a765d] mx-auto" />
                <h3 className="font-body font-bold text-lg text-[#f7efe4]">
                  No bookings found
                </h3>
                <p className="text-xs text-[#ab9a84]">
                  You have no reservations matching this category. Ready for a cinematic night?
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-gradient-to-b from-[#f3cb62] to-[#dda938] text-[#1a1209] font-bold text-xs shadow-md mt-2"
                >
                  <span>Explore Now Showing Movies</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Bookings List */}
            {!loading && !error && filteredBookings.length > 0 && (
              <div className="space-y-4">
                {filteredBookings.map((b) => {
                  const isConfirmed = b.status === 'CONFIRMED';
                  // SRS FR-REV-01: a review is allowed only after the showtime has ended.
                  const canReview = isConfirmed && !!b.endTime && new Date(b.endTime) < new Date();
                  const isPending = b.status === 'PENDING_PAYMENT';
                  const isExpired = b.status === 'EXPIRED';
                  const isCancelled = b.status === 'CANCELLED';

                  return (
                    <div
                      key={b.id}
                      className="bg-[#16100b] border border-[#362919] hover:border-[#5e4727] rounded-xl p-5 sm:p-6 transition-all shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6"
                    >
                      {/* Left: Film & Booking details */}
                      <div className="space-y-2.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {isConfirmed && (
                            <span className="px-2.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-600/80 text-emerald-400 text-[11px] font-black uppercase flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Confirmed
                            </span>
                          )}
                          {isPending && (
                            <span className="px-2.5 py-0.5 rounded bg-amber-950/80 border border-amber-600/80 text-amber-300 text-[11px] font-black uppercase flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Awaiting Payment
                            </span>
                          )}
                          {isExpired && (
                            <span className="px-2.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-400 text-[11px] font-bold uppercase">
                              Expired
                            </span>
                          )}
                          {isCancelled && (
                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-0.5 rounded bg-red-950/80 border border-red-700 text-red-400 text-[11px] font-bold uppercase flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                {b.showtimeStatus === 'CANCELLED' ? 'Showtime Cancelled' : 'Cancelled'}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-700/80 text-amber-300 text-[10px] font-bold">
                                Đang chờ hoàn tiền
                              </span>
                            </div>
                          )}

                          <span className="text-xs text-[#8a765d]">•</span>

                          <span className="text-xs font-mono font-bold text-[#e6c27a] flex items-center gap-1">
                            {b.bookingCode}
                            <button
                              type="button"
                              onClick={() => handleCopyCode(b.bookingCode, b.id)}
                              title="Copy booking code"
                              className="text-[#ab9a84] hover:text-[#f3cb62] cursor-pointer"
                            >
                              {copiedId === b.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </span>
                        </div>

                        <h3 className="font-body font-extrabold text-xl text-[#f7efe4]">
                          {b.movieTitle}
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#ab9a84]">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#e6c27a]" />
                            {b.cinemaName} • {b.roomName}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#e6c27a]" />
                            {formatDate(b.startTime)}
                          </span>
                          <span className="flex items-center gap-1.5 font-bold text-[#f5ece0]">
                            <Clock className="w-3.5 h-3.5 text-[#e6c27a]" />
                            {formatHour(b.startTime)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-xs font-semibold text-[#8a765d] mr-1">
                            Seats:
                          </span>
                          {b.items?.map((item) => (
                            <span
                              key={item.id}
                              className="px-2 py-0.5 rounded bg-[#1f1710] border border-[#4d3c26] text-[11px] font-bold text-[#f3cb62]"
                            >
                              {item.rowName}
                              {item.seatNumber}
                            </span>
                          ))}
                        </div>

                        {isCancelled && b.showtimeStatus === 'CANCELLED' && (
                          <div className="bg-red-950/40 border border-red-800/60 rounded-lg p-2.5 text-xs text-red-300 flex items-start gap-2 mt-2">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block font-semibold">Screening Cancelled by Theater Operations</strong>
                              <span>This showtime schedule was cancelled by the cinema. If you completed payment, your full refund has been requested and is currently being processed by administration.</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right: Price & Action CTAs */}
                      <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#241a10] shrink-0">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] uppercase font-bold text-[#8a765d] block">
                            Total Amount
                          </span>
                          <span className="font-body font-extrabold text-lg text-[#f3cb62]">
                            {formatCurrency(b.finalAmount)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isConfirmed && (
                            <>
                              <button
                                type="button"
                                onClick={() => setSelectedTicketBooking(b)}
                                className="px-4 py-2 rounded-lg bg-gradient-to-b from-[#f3cb62] to-[#dda938] hover:from-[#f7d576] hover:to-[#e5b344] text-[#1a1209] font-body font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
                              >
                                <Ticket className="w-3.5 h-3.5" />
                                <span>View E-Ticket</span>
                              </button>

                              {b.startTime && new Date(b.startTime).getTime() - currentTime >= 60 * 60 * 1000 && (
                                <button
                                  type="button"
                                  onClick={() => handleCancelConfirmedBooking(b.id, b.movieTitle)}
                                  disabled={cancellingId === b.id}
                                  className="px-3.5 py-2 rounded-lg bg-[#241a10] border border-red-900/60 hover:bg-red-950/40 text-xs font-semibold text-red-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                  title="Hủy vé trước giờ chiếu tối thiểu 60 phút để nhận hoàn tiền"
                                >
                                  {cancellingId === b.id ? 'Đang hủy...' : 'Cancel & request refund'}
                                </button>
                              )}

                              {canReview && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReviewModalData({
                                      movieId: b.movieId,
                                      bookingId: b.id,
                                      movieTitle: b.movieTitle,
                                    })
                                  }
                                  className="px-3.5 py-2 rounded-lg bg-[#241a10] hover:bg-[#332416] border border-[#5e4727] text-xs font-semibold text-[#e6c27a] flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Star className="w-3.5 h-3.5 text-[#f3cb62]" />
                                  <span>Review</span>
                                </button>
                              )}
                            </>
                          )}

                          {isPending && (
                            <>
                              <Link
                                to={`/payment/${b.id}`}
                                className="px-4 py-2 rounded-lg bg-gradient-to-b from-[#f3cb62] to-[#dda938] text-[#1a1209] font-body font-bold text-xs shadow-sm flex items-center gap-1.5"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Pay Now</span>
                              </Link>

                              <button
                                type="button"
                                onClick={() => handleCancelBooking(b.id)}
                                disabled={cancellingId === b.id}
                                className="px-3 py-2 rounded-lg bg-[#241a10] border border-[#3d2f1d] hover:border-red-800 text-xs font-semibold text-[#ab9a84] hover:text-red-300 transition-colors cursor-pointer"
                              >
                                {cancellingId === b.id ? 'Cancelling...' : 'Cancel'}
                              </button>
                            </>
                          )}

                          {isCancelled && (
                            <button
                              type="button"
                              onClick={() => setSelectedTicketBooking(b)}
                              className="px-3.5 py-1.5 rounded-lg bg-[#241a10] border border-[#3d2f1d] hover:border-[#5e4727] text-xs font-semibold text-[#ab9a84] hover:text-[#f2e8dc] flex items-center gap-1.5 cursor-pointer"
                            >
                              <Ticket className="w-3.5 h-3.5" />
                              <span>Ticket Details</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Review Modal */}
      {reviewModalData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#18120c] border border-[#4d3c26] rounded-2xl overflow-hidden shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#2e2316] pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#e0b354]" />
                <h2 className="font-body font-bold text-base text-[#f7efe4]">
                  Rate &amp; Review Movie
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalData(null)}
                className="text-[#ab9a84] hover:text-[#f3cb62] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <span className="text-xs text-[#ab9a84]">Movie:</span>
              <h3 className="font-body font-extrabold text-lg text-[#f3cb62]">
                {reviewModalData.movieTitle}
              </h3>
            </div>

            {reviewSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-700/80 text-xs text-emerald-300 flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{reviewSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                {/* 5-Star Picker */}
                <div>
                  <label className="block text-xs font-semibold text-[#ab9a84] mb-2">
                    Your Rating (1 to 5 Stars):
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                        className="p-1 cursor-pointer transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            star <= (hoverRating || rating)
                              ? 'text-[#f3cb62] fill-[#f3cb62]'
                              : 'text-[#453422]'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-[#e6c27a] ml-2">
                      {hoverRating || rating} / 5 Stars
                    </span>
                  </div>
                </div>

                {/* Comment Textarea */}
                <div>
                  <label className="block text-xs font-semibold text-[#d4c3ad] mb-1.5">
                    Your Review &amp; Comments:
                  </label>
                  <textarea
                    rows={4}
                    maxLength={2000}
                    required
                    placeholder="Share what you liked about the plot, cinematography, performance, and atmosphere..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full bg-[#120d09] border border-[#3d3020] rounded-lg p-3 text-xs text-[#f5ece0] placeholder:text-[#6e5d49] focus:outline-none focus:border-[#e0b354] transition-colors"
                  />
                </div>

                {reviewError && (
                  <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800 text-xs text-red-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{reviewError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReviewModalData(null)}
                    className="px-4 py-2 rounded-lg bg-[#241a10] text-xs font-semibold text-[#ab9a84] hover:text-[#f2e8dc] cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submittingReview || !comment.trim()}
                    className="px-5 py-2 rounded-lg bg-gradient-to-b from-[#f3cb62] to-[#dda938] text-[#1a1209] font-body font-bold text-xs shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {submittingReview ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* DIGITAL E-TICKET MODAL */}
      <ETicketModal
        booking={selectedTicketBooking}
        isOpen={!!selectedTicketBooking}
        onClose={() => setSelectedTicketBooking(null)}
      />
    </div>
  );
}
