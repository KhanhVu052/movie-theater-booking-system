import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Calendar,
  Ticket,
  Tag,
  Check,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Info,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { movieApi } from '../api/movieApi';
import { bookingApi } from '../api/bookingApi';

import { formatCurrency, formatHour, formatDate } from '../utils/formatters';

export default function SeatSelection() {
  const { showtimeId } = useParams();
  const navigate = useNavigate();

  // Data states
  const [showtime, setShowtime] = useState(null);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selection states
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [selectionNotice, setSelectionNotice] = useState('');

  // Voucher states
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherError, setVoucherError] = useState('');
  const [checkingVoucher, setCheckingVoucher] = useState(false);

  // Booking submit state
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // 1. Fetch Showtime Info and Seat Map
  const fetchSeatMap = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [showtimeRes, seatsRes] = await Promise.allSettled([
        movieApi.getShowtimeById(showtimeId),
        movieApi.getShowtimeSeats(showtimeId),
      ]);

      if (showtimeRes.status === 'fulfilled') {
        const rawShowtime = showtimeRes.value?.data?.data ?? showtimeRes.value?.data;
        setShowtime(rawShowtime);
      } else {
        setError('Showtime details not found.');
      }

      if (seatsRes.status === 'fulfilled') {
        const rawSeats = seatsRes.value?.data?.data ?? seatsRes.value?.data ?? [];
        setSeats(Array.isArray(rawSeats) ? rawSeats : []);
      } else {
        setError('Unable to load seat map for this screening.');
      }
    } catch {
      setError('Connection failure while loading seat layout.');
    } finally {
      setLoading(false);
    }
  }, [showtimeId]);

  useEffect(() => {
    fetchSeatMap();
  }, [fetchSeatMap]);

  // Group seats by rowName and sort by seatNumber
  const rowGroups = useMemo(() => {
    const map = new Map();
    seats.forEach((seat) => {
      const row = seat.rowName || 'A';
      if (!map.has(row)) {
        map.set(row, []);
      }
      map.get(row).push(seat);
    });

    // Sort rows alphabetically and seats by seatNumber ascending
    const sortedRows = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    sortedRows.forEach(([, seatList]) => {
      seatList.sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));
    });

    return sortedRows;
  }, [seats]);

  // Maximum seat count in any row for column number header
  const maxSeatsInRow = useMemo(() => {
    let max = 0;
    rowGroups.forEach(([, seatList]) => {
      if (seatList.length > max) max = seatList.length;
    });
    return max;
  }, [rowGroups]);

  // Map of selected seat objects
  const selectedSeatObjects = useMemo(() => {
    const idSet = new Set(selectedSeatIds);
    return seats.filter((s) => idSet.has(s.id));
  }, [seats, selectedSeatIds]);

  // Subtotal calculation
  const subtotal = useMemo(() => {
    return selectedSeatObjects.reduce((sum, s) => sum + (s.price || 0), 0);
  }, [selectedSeatObjects]);

  // Discount calculation
  const discountAmount = useMemo(() => {
    if (!appliedVoucher || subtotal === 0) return 0;
    if (appliedVoucher.discountType === 'PERCENTAGE') {
      const pctDiscount = Math.round((subtotal * appliedVoucher.discountValue) / 100);
      if (appliedVoucher.maxDiscountAmount && appliedVoucher.maxDiscountAmount > 0) {
        return Math.min(pctDiscount, appliedVoucher.maxDiscountAmount);
      }
      return pctDiscount;
    }
    return Math.min(appliedVoucher.discountValue || 0, subtotal);
  }, [appliedVoucher, subtotal]);

  const finalAmount = Math.max(0, subtotal - discountAmount);

  // Seat toggle handler (Min 1, Max 8 seats)
  const handleToggleSeat = (seat) => {
    if (seat.status !== 'AVAILABLE') return;

    setBookingError('');
    setSelectionNotice('');

    setSelectedSeatIds((prev) => {
      if (prev.includes(seat.id)) {
        return prev.filter((id) => id !== seat.id);
      }
      if (prev.length >= 8) {
        setSelectionNotice('Maximum of 8 seats allowed per booking.');
        return prev;
      }
      return [...prev, seat.id];
    });
  };

  // Voucher apply handler
  const handleApplyVoucher = async (e) => {
    e.preventDefault();
    const code = voucherInput.trim().toUpperCase();
    if (!code) return;

    setCheckingVoucher(true);
    setVoucherError('');
    try {
      const res = await movieApi.getVoucherByCode(code);
      const voucher = res?.data?.data ?? res?.data;

      if (!voucher || !voucher.isActive) {
        setVoucherError('This voucher code is inactive or invalid.');
        setAppliedVoucher(null);
        return;
      }

      if (voucher.minOrderValue && subtotal < voucher.minOrderValue) {
        setVoucherError(
          `Minimum order value for this voucher is ${formatCurrency(voucher.minOrderValue)}.`
        );
        setAppliedVoucher(null);
        return;
      }

      setAppliedVoucher(voucher);
      setVoucherError('');
    } catch (err) {
      const msg = err.response?.data?.message || 'Voucher code not found or expired.';
      setVoucherError(msg);
      setAppliedVoucher(null);
    } finally {
      setCheckingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherInput('');
    setVoucherError('');
  };

  // Booking submission handler
  const handleConfirmBooking = async () => {
    if (selectedSeatIds.length === 0) return;

    // Check auth
    const token = localStorage.getItem('token');
    if (!token) {
      navigate(`/login?redirect=/booking/${showtimeId}`);
      return;
    }

    setSubmitting(true);
    setBookingError('');

    try {
      const payload = {
        showtimeId: Number(showtimeId),
        showtimeSeatIds: selectedSeatIds,
        voucherCode: appliedVoucher ? appliedVoucher.code : null,
      };

      const res = await bookingApi.createBooking(payload);
      const bookingData = res?.data?.data ?? res?.data;

      if (bookingData?.id) {
        // Direct to payment checkout page
        navigate(`/payment/${bookingData.id}`);
      }
    } catch (err) {
      const resData = err.response?.data;
      if (resData?.message) {
        setBookingError(resData.message);
      } else {
        setBookingError(
          'One or more selected seats were just taken. Please refresh and pick alternative seats.'
        );
      }
      // Refresh seat status from backend
      fetchSeatMap();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0e0a07] text-[#f2e8dc] font-body flex flex-col select-none">
      <Navbar />

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#e6c27a]" />
          <p className="text-sm font-medium text-[#ab9a84]">
            Loading theater room layout and live seat availability...
          </p>
        </div>
      )}

      {/* Error */}
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

      {/* Main Seat Selection Screen */}
      {!loading && !error && showtime && (
        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-6 w-full flex flex-col">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2e2316] pb-4 mb-6">
            <div>
              <Link
                to={`/movies/${showtime.movieId}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#ab9a84] hover:text-[#f3cb62] mb-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Showtime</span>
              </Link>
              <h1 className="font-body font-bold text-2xl sm:text-3xl text-[#f7efe4] tracking-tight">
                {showtime.movieTitle}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#ab9a84] mt-1">
                <span className="flex items-center gap-1 text-[#e6c27a]">
                  <MapPin className="w-3.5 h-3.5" />
                  {showtime.cinemaName} ({showtime.roomName})
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(showtime.startTime)}
                </span>
                <span className="flex items-center gap-1 font-semibold text-[#f3cb62]">
                  <Clock className="w-3.5 h-3.5" />
                  {formatHour(showtime.startTime)}
                </span>
                {showtime.format && (
                  <span className="px-1.5 py-0.5 rounded bg-[#1f1912] border border-[#4d3c26] text-[10px] uppercase font-bold text-[#c7b59d]">
                    {showtime.format}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center px-3.5 py-1.5 rounded-lg bg-[#140f0a] border border-[#3d2f1d] text-xs text-[#ab9a84]">
              <ShieldCheck className="w-4 h-4 text-[#e0b354]" />
              <span>10-Minute Instant Seat Reservation</span>
            </div>
          </div>

          {/* Grid Layout: Left Seat Matrix & Right Order Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Screen & Seat Matrix */}
            <div className="lg:col-span-8 bg-[#140f0a] border border-[#2e2316] rounded-2xl p-6 sm:p-8 flex flex-col items-center shadow-lg overflow-x-auto">
              {/* Cinema Screen Projection Graphic */}
              <div className="w-full max-w-xl flex flex-col items-center mb-8 relative">
                {/* Projected Light Beam */}
                <div
                  className="w-full h-10 mb-[-4px] pointer-events-none opacity-25"
                  style={{
                    background:
                      'radial-gradient(ellipse 60% 100% at 50% 0%, #fce092 0%, rgba(220,164,62,0.3) 40%, transparent 100%)',
                  }}
                />
                {/* Glowing Curved Screen Bar */}
                <div
                  className="w-full h-3.5 rounded-t-full border-t border-[#fce092]/70 shadow-[0_8px_30px_rgba(243,203,98,0.45)]"
                  style={{
                    background:
                      'linear-gradient(90deg, rgba(30,20,12,0.2) 0%, rgba(252,224,146,0.6) 25%, #fce092 50%, rgba(252,224,146,0.6) 75%, rgba(30,20,12,0.2) 100%)',
                  }}
                />
                <span className="text-[11px] uppercase tracking-[0.35em] font-extrabold text-[#dca43e] mt-2.5 flex items-center gap-2">
                  <span>SCREEN</span>
                  <span className="opacity-40">•</span>
                  <span>MÀN HÌNH CHÍNH</span>
                </span>
              </div>

              {/* Selection Notification / Limit Warning */}
              {selectionNotice && (
                <div className="mb-4 px-4 py-2 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{selectionNotice}</span>
                </div>
              )}

              {/* Empty Seats Notice */}
              {seats.length === 0 && !loading && (
                <div className="p-8 text-center text-[#ab9a84] flex flex-col items-center gap-3">
                  <AlertCircle className="w-8 h-8 text-[#e0b354]" />
                  <p className="text-sm font-semibold text-[#f5ece0]">No seat layout found for this room.</p>
                  <button
                    type="button"
                    onClick={fetchSeatMap}
                    className="px-4 py-1.5 rounded-lg bg-[#21170e] hover:bg-[#332415] border border-[#5e4727] text-xs font-bold text-[#f3cb62] transition-colors"
                  >
                    Reload Seats
                  </button>
                </div>
              )}

              {/* Matrix of Seats */}
              <div className="flex flex-col gap-2.5 items-center w-full min-w-[500px]">
                {/* Column Numbers Header */}
                {maxSeatsInRow > 0 && (
                  <div className="flex items-center gap-2.5 mb-1.5 pointer-events-none">
                    <span className="w-6 text-center" />
                    <div className="flex items-center gap-2">
                      {Array.from({ length: maxSeatsInRow }, (_, i) => (
                        <span
                          key={i}
                          className="w-8 text-center text-[10px] font-bold text-[#8a765d]"
                        >
                          {i + 1}
                        </span>
                      ))}
                    </div>
                    <span className="w-6 text-center" />
                  </div>
                )}

                {rowGroups.map(([rowName, rowSeats]) => (
                  <div key={rowName} className="flex items-center gap-2.5">
                    {/* Row Label Left */}
                    <span className="w-6 text-center text-xs font-bold text-[#8a765d]">
                      {rowName}
                    </span>

                    {/* Seats in this row */}
                    <div className="flex items-center gap-2">
                      {rowSeats.map((seat) => {
                        const isSelected = selectedSeatIds.includes(seat.id);
                        const isHeld = seat.status === 'HELD';
                        const isBooked = seat.status === 'BOOKED';
                        const isAvailable = seat.status === 'AVAILABLE';

                        // Seat color styling
                        let seatBg = 'bg-[#1e1710] border-[#453422] text-[#c7b59d] hover:border-[#e0b354]';
                        if (seat.seatType === 'VIP') {
                          seatBg = 'bg-[#291b0f] border-[#785325] text-[#f7d576] hover:border-[#f3cb62]';
                        } else if (seat.seatType === 'COUPLE') {
                          seatBg = 'bg-[#2b161f] border-[#6b2c45] text-[#fca5a5] hover:border-[#f43f5e]';
                        }

                        if (isSelected) {
                          seatBg =
                            'bg-gradient-to-b from-[#f3cb62] to-[#dda938] border-[#f3cb62] text-[#140e08] font-black shadow-[0_0_12px_rgba(230,194,122,0.5)]';
                        } else if (isHeld) {
                          seatBg = 'bg-[#18181b]/80 border-[#27272a] text-[#52525b] cursor-not-allowed opacity-60';
                        } else if (isBooked) {
                          seatBg = 'bg-[#12100e] border-[#1f1a15] text-[#3f352a] cursor-not-allowed opacity-40';
                        }

                        return (
                          <button
                            key={seat.id}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => handleToggleSeat(seat)}
                            title={`${seat.rowName}${seat.seatNumber} • ${seat.seatType} • ${formatCurrency(seat.price)}`}
                            className={`w-8 h-8 rounded-t-lg rounded-b-sm border text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer ${seatBg}`}
                          >
                            {seat.rowName}{seat.seatNumber}
                          </button>
                        );
                      })}
                    </div>

                    {/* Row Label Right */}
                    <span className="w-6 text-center text-xs font-bold text-[#8a765d]">
                      {rowName}
                    </span>
                  </div>
                ))}
              </div>

              {/* Seat Legend */}
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mt-10 pt-6 border-t border-[#241a10] text-xs text-[#ab9a84]">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-t border bg-[#1e1710] border-[#453422]" />
                  <span>Regular ({formatCurrency(showtime.basePrice)})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-t border bg-[#291b0f] border-[#785325]" />
                  <span>VIP (+20k)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-t border bg-[#2b161f] border-[#6b2c45]" />
                  <span>Couple (+40k)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-t border bg-gradient-to-b from-[#f3cb62] to-[#dda938] border-[#f3cb62]" />
                  <span className="font-semibold text-[#f3cb62]">Selected</span>
                </div>
                <div className="flex items-center gap-2 opacity-60">
                  <span className="w-4 h-4 rounded-t border bg-[#18181b] border-[#27272a]" />
                  <span>Held / In Progress</span>
                </div>
                <div className="flex items-center gap-2 opacity-40">
                  <span className="w-4 h-4 rounded-t border bg-[#12100e] border-[#1f1a15]" />
                  <span>Sold Out</span>
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary & Voucher */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-[#18120c] border border-[#362919] rounded-2xl p-6 shadow-lg space-y-5">
                <h2 className="font-body font-bold text-lg text-[#f7efe4] border-b border-[#2e2316] pb-3 flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-[#e0b354]" />
                  <span>Booking Summary</span>
                </h2>

                {/* Selected Seats List */}
                <div>
                  <label className="block text-xs font-semibold text-[#ab9a84] mb-2">
                    Selected Seats ({selectedSeatObjects.length} / 8)
                  </label>
                  {selectedSeatObjects.length === 0 ? (
                    <p className="text-xs text-[#6e5d49] italic">
                      Please click on available seats in the theater layout to make your selection.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedSeatObjects.map((s) => (
                        <span
                          key={s.id}
                          className="px-2.5 py-1 rounded bg-[#241a10] border border-[#523d24] text-xs font-bold text-[#f3cb62] flex items-center gap-1.5"
                        >
                          <span>
                            {s.rowName}
                            {s.seatNumber}
                          </span>
                          <span className="text-[10px] text-[#ab9a84]">
                            ({s.seatType})
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Voucher Code Form */}
                <div className="pt-2 border-t border-[#2e2316]">
                  <label className="block text-xs font-semibold text-[#ab9a84] mb-2 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#e0b354]" />
                    <span>Promotional Voucher</span>
                  </label>

                  {appliedVoucher ? (
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#241a10] border border-[#5e4727] text-xs">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <span className="font-mono font-bold text-[#f3cb62]">
                            {appliedVoucher.code}
                          </span>
                          <p className="text-[11px] text-[#ab9a84]">
                            -{formatCurrency(discountAmount)} applied
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveVoucher}
                        className="text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyVoucher} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="ENTER CODE"
                        value={voucherInput}
                        onChange={(e) => setVoucherInput(e.target.value)}
                        className="flex-1 bg-[#120d09] border border-[#3d3020] rounded-lg px-3 py-2 text-xs font-mono uppercase text-[#f5ece0] focus:outline-none focus:border-[#e0b354]"
                      />
                      <button
                        type="submit"
                        disabled={checkingVoucher || !voucherInput.trim()}
                        className="px-3.5 py-2 rounded-lg bg-[#261d14] hover:bg-[#382b1d] border border-[#4d3c26] text-xs font-semibold text-[#f2e8dc] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {checkingVoucher ? 'Checking...' : 'Apply'}
                      </button>
                    </form>
                  )}

                  {voucherError && (
                    <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{voucherError}</span>
                    </p>
                  )}
                </div>

                {/* Price Breakdown */}
                <div className="pt-3 border-t border-[#2e2316] space-y-2 text-xs">
                  <div className="flex justify-between text-[#ab9a84]">
                    <span>Ticket Subtotal:</span>
                    <span className="font-semibold text-[#f5ece0]">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Voucher Discount:</span>
                      <span className="font-semibold">
                        -{formatCurrency(discountAmount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-2 border-t border-[#2e2316]">
                    <span className="text-sm font-bold text-[#f7efe4]">
                      Total Payable:
                    </span>
                    <span className="font-body font-extrabold text-xl text-[#f3cb62]">
                      {formatCurrency(finalAmount)}
                    </span>
                  </div>
                </div>

                {/* Booking Error Display */}
                {bookingError && (
                  <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{bookingError}</span>
                  </div>
                )}

                {/* Submit Checkout Button */}
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  disabled={selectedSeatIds.length === 0 || submitting}
                  className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-b from-[#f3cb62] to-[#dda938] hover:from-[#f7d576] hover:to-[#e5b344] active:scale-[0.99] text-[#1a1209] font-body font-bold text-sm shadow-[0_6px_20px_rgba(221,169,56,0.3)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Holding Seats...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Reserve Seats &amp; Checkout</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-[#786754] text-center leading-relaxed">
                  Upon clicking, your seats will be locked exclusively for you for 10 minutes to complete payment via VNPAY.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
