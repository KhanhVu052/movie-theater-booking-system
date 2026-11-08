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
  Sparkles,
  Lock,
  X,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useToast } from '../context/ToastContext';
import { movieApi } from '../api/movieApi';
import { bookingApi } from '../api/bookingApi';
import { useSeatMapPolling } from '../hooks/useSeatMapPolling';

import { formatCurrency, formatHour, formatDate } from '../utils/formatters';
import { causesOrphanSeat, getCouplePartner, isCouplePairAvailable } from '../utils/seatGap';
import { computePricingBadges, resolveSeatPrices } from '../utils/priceTags';

export default function SeatSelection() {
  const { showtimeId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Data states
  const [showtime, setShowtime] = useState(null);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selection states
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [selectionNotice, setSelectionNotice] = useState('');

  // Voucher states
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
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
        if (rawShowtime?.status === 'CANCELLED') {
          setError('This showtime has been cancelled. Please choose another screening.');
        } else {
          setShowtime(rawShowtime);
        }
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

  // Periodic Seat Map Polling (G4-04)
  const handleSeatUnavailable = useCallback((unavailableSeats, updatedSeats) => {
    const unavailableIdSet = new Set(unavailableSeats.map((s) => s.id));
    unavailableSeats.forEach((seat) => {
      if (seat.pairGroup) {
        updatedSeats
          .filter((s) => s.pairGroup === seat.pairGroup)
          .forEach((s) => unavailableIdSet.add(s.id));
      }
    });

    setSelectedSeatIds((prev) => prev.filter((id) => !unavailableIdSet.has(id)));

    unavailableSeats.forEach((seat) => {
      const seatLabel = `${seat.rowName || ''}${seat.seatNumber || ''}`;
      showToast(`Ghế ${seatLabel} vừa có người khác giữ`, 'warning');
    });
  }, [showToast]);

  const handleSeatsUpdated = useCallback((updatedSeats) => {
    setSeats(updatedSeats);
  }, []);

  useSeatMapPolling(showtimeId, handleSeatsUpdated, 8000, {
    enabled: !loading && !submitting && !error && showtime?.status === 'SCHEDULED',
    selectedSeatIds,
    onSeatUnavailable: handleSeatUnavailable,
  });

  // Fetch all active vouchers on mount
  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        const res = await movieApi.getAllVouchers();
        const raw = res?.data?.data ?? res?.data ?? [];
        if (Array.isArray(raw)) {
          setAvailableVouchers(raw.filter((v) => v.isActive));
        }
      } catch {
        // Fallback silently if voucher list cannot be fetched
      }
    };
    fetchVouchers();
  }, []);

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

  const hasCoupleSeats = useMemo(
    () => seats.some((s) => s.seatType === 'COUPLE' || s.pairGroup != null),
    [seats]
  );
  const hasCoupleSeatsInRoom = hasCoupleSeats;

  // Map of selected seat objects
  const selectedSeatObjects = useMemo(() => {
    const idSet = new Set(selectedSeatIds);
    return seats.filter((s) => idSet.has(s.id));
  }, [seats, selectedSeatIds]);

  // Subtotal calculation
  const subtotal = useMemo(() => {
    return selectedSeatObjects.reduce((sum, s) => sum + (s.price || 0), 0);
  }, [selectedSeatObjects]);

  // Breakdown of selected seats by type
  const seatTypeBreakdown = useMemo(() => {
    const counts = { NORMAL: 0, VIP: 0, COUPLE: 0 };
    selectedSeatObjects.forEach((s) => {
      const type = s.seatType || 'NORMAL';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [selectedSeatObjects]);

  // Dynamic seat prices for legend and breakdown (reads server showtime.seatTypePrices or seat inventory)
  const seatPrices = useMemo(() => resolveSeatPrices(showtime, seats), [showtime, seats]);

  // Dynamic pricing matrix badges for Header Bar (Early Bird, Peak Hour, Weekend)
  const pricingBadges = useMemo(() => computePricingBadges(showtime), [showtime]);

  // Auto-unapply voucher if subtotal drops below required minOrderValue
  useEffect(() => {
    if (appliedVoucher && appliedVoucher.minOrderValue && subtotal < appliedVoucher.minOrderValue) {
      setAppliedVoucher(null);
      setSelectionNotice(
        `Voucher ${appliedVoucher.code} unapplied: order subtotal (${formatCurrency(subtotal)}) is below min requirement (${formatCurrency(appliedVoucher.minOrderValue)}).`
      );
    }
  }, [subtotal, appliedVoucher]);

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

  // Seat toggle handler (Min 1, Max 8 seats, with orphan seat warning & atomic couple pair selection)
  const handleToggleSeat = (seat) => {
    if (seat.status !== 'AVAILABLE' || seat.selectable === false) return;

    setBookingError('');
    setSelectionNotice('');

    const partner = getCouplePartner(seat, seats);
    const isCouple = seat.seatType === 'COUPLE' || seat.pairGroup != null;

    if (isCouple && !isCouplePairAvailable(seat, seats)) {
      const unavailMsg = 'This couple seat pair is currently unavailable.';
      setSelectionNotice(unavailMsg);
      showToast(unavailMsg, 'warning');
      return;
    }

    let nextSelected;
    if (partner) {
      if (selectedSeatIds.includes(seat.id)) {
        nextSelected = selectedSeatIds.filter((id) => id !== seat.id && id !== partner.id);
      } else {
        if (selectedSeatIds.length + 2 > 8) {
          const maxMsg = 'You can only select up to 8 seats per booking.';
          setSelectionNotice(maxMsg);
          showToast(maxMsg, 'warning');
          return;
        }
        nextSelected = [...selectedSeatIds, seat.id, partner.id];
      }
    } else {
      if (selectedSeatIds.includes(seat.id)) {
        nextSelected = selectedSeatIds.filter((id) => id !== seat.id);
      } else {
        if (selectedSeatIds.length >= 8) {
          const maxMsg = 'You can only select up to 8 seats per booking.';
          setSelectionNotice(maxMsg);
          showToast(maxMsg, 'warning');
          return;
        }
        nextSelected = [...selectedSeatIds, seat.id];
      }
    }

    setSelectedSeatIds(nextSelected);

    if (causesOrphanSeat(seats, nextSelected)) {
      const warningMsg = 'Cannot leave a single empty seat (orphan seat). Please select adjacent seats.';
      setSelectionNotice(warningMsg);
      showToast(warningMsg, 'warning');
    }
  };

  // Voucher apply handler via manual form
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

    if (causesOrphanSeat(seats, selectedSeatIds)) {
      const msg = 'Cannot leave a single empty seat (orphan seat). Please select adjacent seats.';
      setBookingError(msg);
      showToast(msg, 'error');
      return;
    }

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
        if (bookingData?.status === 'CONFIRMED' || bookingData?.finalAmount === 0) {
          showToast('Booking placed successfully (100% Free Discount)!', 'success');
          navigate('/my-bookings');
        } else {
          // Direct to payment checkout page
          navigate(`/payment/${bookingData.id}`);
        }
      }
    } catch (err) {
      const resData = err.response?.data;
      const status = err.response?.status;
      const code = resData?.code;

      if (code === 1502) {
        const msg = 'This showtime is closed for booking or has been cancelled.';
        setBookingError(msg);
        showToast(msg, 'error');
      } else if (code === 1509 || (status === 400 && resData?.message?.toLowerCase().includes('orphan'))) {
        const msg = resData?.message || 'Cannot leave a single empty seat (orphan seat). Please select adjacent seats.';
        setBookingError(msg);
        showToast(msg, 'error');
      } else if (code === 1510 || (status === 400 && resData?.message?.toLowerCase().includes('couple'))) {
        const msg = resData?.message || 'Couple seats must be selected and booked together as a complete pair.';
        setBookingError(msg);
        showToast(msg, 'error');
      } else if (code === 1507 || status === 429) {
        const msg = resData?.message || 'Please pay or cancel your existing reservations first';
        setBookingError(msg);
        showToast(msg, 'error');
      } else if (resData?.message) {
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
                {pricingBadges.map((badge) => (
                  <span
                    key={badge.id}
                    data-testid={`pricing-badge-${badge.id}`}
                    className={`px-2 py-0.5 rounded border text-[11px] font-bold ${badge.color}`}
                  >
                    {badge.text}
                  </span>
                ))}
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
              {/* Cinema Screen Projection Graphic - 100% Pure English */}
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
                <span className="text-[11px] uppercase tracking-[0.35em] font-extrabold text-[#dca43e] mt-2.5">
                  CINEMA SCREEN
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
                    className="px-4 py-1.5 rounded-lg bg-[#21170e] hover:bg-[#332415] border border-[#5e4727] text-xs font-bold text-[#f3cb62] transition-colors cursor-pointer"
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
                        const partner = getCouplePartner(seat, seats);
                        const isCouple = seat.seatType === 'COUPLE' || seat.pairGroup != null;
                        const isCoupleAvail = isCouple ? isCouplePairAvailable(seat, seats) : true;
                        const isPartnerHeld = partner && partner.status === 'HELD';
                        const isPartnerBooked = partner && partner.status === 'BOOKED';

                        const isHeld = seat.status === 'HELD' || (isCouple && isPartnerHeld);
                        const isBooked = seat.status === 'BOOKED' || (isCouple && isPartnerBooked);
                        const isSelectable = (seat.selectable !== undefined ? seat.selectable : seat.status === 'AVAILABLE') && isCoupleAvail;
                        const isInactive = !isSelectable && seat.status === 'AVAILABLE' && !isHeld && !isBooked;

                        // Seat color styling by seat type
                        let seatBg =
                          'bg-[#1a140c] border-[#3d2b17] text-[#c7b59d] hover:border-[#e0b354] hover:bg-[#251c12]';
                        if (seat.seatType === 'VIP') {
                          seatBg =
                            'bg-[#2b1b0b] border-[#966b28] text-[#fce092] hover:border-[#ffd700] hover:bg-[#38230e]';
                        } else if (isCouple) {
                          seatBg =
                            'bg-[#2e131e] border-[#8a2449] text-[#fda4af] hover:border-[#f43f5e] hover:bg-[#3d1827]';
                        }

                        if (isInactive) {
                          seatBg =
                            'bg-[#141210] border-[#29221b] text-[#554b3f] cursor-not-allowed opacity-30 line-through';
                        } else if (isSelected) {
                          seatBg = isCouple
                            ? 'bg-gradient-to-b from-[#f43f5e] to-[#be123c] border-[#fda4af] text-white font-black ring-2 ring-[#f43f5e]/40 shadow-[0_0_12px_rgba(244,63,94,0.6)]'
                            : 'bg-gradient-to-b from-[#f3cb62] to-[#dda938] border-[#fce092] text-[#140e08] font-black ring-2 ring-[#f3cb62]/40 shadow-[0_0_12px_rgba(243,203,98,0.6)]';
                        } else if (isHeld) {
                          seatBg =
                            'bg-[#18181b]/80 border-[#27272a] text-[#52525b] cursor-not-allowed opacity-60';
                        } else if (isBooked) {
                          seatBg =
                            'bg-[#12100e] border-[#1f1a15] text-[#3f352a] cursor-not-allowed opacity-40';
                        }

                        // Shape styling for couple pill sofa
                        let shapeClasses = 'w-8 h-8 rounded-t-lg rounded-b-sm border text-[10px]';
                        if (isCouple && partner) {
                          if (seat.seatNumber < partner.seatNumber) {
                            shapeClasses = 'w-8 h-8 rounded-l-xl rounded-r-none border-r-0 mr-[-8px] z-10 text-[10px]';
                          } else {
                            shapeClasses = 'w-8 h-8 rounded-r-xl rounded-l-none border-l border-l-[#fda4af]/30 text-[10px]';
                          }
                        }

                        return (
                          <button
                            key={seat.id}
                            type="button"
                            disabled={!isSelectable}
                            onClick={() => handleToggleSeat(seat)}
                            title={
                              isInactive
                                ? `${seat.rowName}${seat.seatNumber} • Maintenance / Inactive`
                                : isCouple
                                  ? `${seat.rowName}${seat.seatNumber} • Couple Seat • ${formatCurrency(seat.price)}/seat`
                                  : `${seat.rowName}${seat.seatNumber} • ${seat.seatType} • ${formatCurrency(seat.price)}`
                            }
                            className={`${shapeClasses} font-bold flex items-center justify-center transition-all cursor-pointer ${seatBg}`}
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
                  <span className="w-4 h-4 rounded-t border bg-[#1a140c] border-[#3d2b17]" />
                  <span>Regular ({formatCurrency(seatPrices.NORMAL)})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-t border bg-[#2b1b0b] border-[#966b28]" />
                  <span className="text-[#fce092] font-semibold">VIP ({formatCurrency(seatPrices.VIP)})</span>
                </div>
                {hasCoupleSeats && (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-t border bg-[#2e131e] border-[#8a2449]" />
                    <span className="text-[#fda4af] font-semibold">
                      Couple ({formatCurrency(seatPrices.COUPLE_PAIR)}/pair)
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-t border bg-gradient-to-b from-[#f3cb62] to-[#dda938] border-[#fce092]" />
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
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-[#ab9a84]">
                      Selected Seats ({selectedSeatObjects.length} / 8)
                    </label>
                    {selectedSeatObjects.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedSeatIds([])}
                        className="text-[11px] text-[#8a765d] hover:text-[#f3cb62] transition-colors cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {selectedSeatObjects.length === 0 ? (
                    <p className="text-xs text-[#6e5d49] italic">
                      Please click on available seats in the theater layout to make your selection.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {selectedSeatObjects.map((s) => {
                          let badgeColor = 'bg-[#241a10] border-[#523d24] text-[#d4c3ad]';
                          if (s.seatType === 'VIP') {
                            badgeColor = 'bg-[#2f1f0d] border-[#b8862d] text-[#fce092]';
                          } else if (s.seatType === 'COUPLE') {
                            badgeColor = 'bg-[#331420] border-[#9f2b55] text-[#fda4af]';
                          }
                          return (
                            <span
                              key={s.id}
                              className={`px-2.5 py-1 rounded border text-xs font-bold flex items-center gap-1.5 shadow-sm ${badgeColor}`}
                            >
                              <span>
                                {s.rowName}
                                {s.seatNumber}
                              </span>
                              <span className="text-[10px] opacity-75 uppercase">
                                ({s.seatType})
                              </span>
                            </span>
                          );
                        })}
                      </div>

                      {/* Seat breakdown summary tags */}
                      <div className="text-[11px] text-[#8a765d] pt-1 flex flex-wrap gap-x-3 gap-y-1">
                        {seatTypeBreakdown.NORMAL > 0 && (
                          <span>{seatTypeBreakdown.NORMAL}x Regular ({formatCurrency(seatPrices.NORMAL)})</span>
                        )}
                        {seatTypeBreakdown.VIP > 0 && (
                          <span className="text-[#fce092]">{seatTypeBreakdown.VIP}x VIP ({formatCurrency(seatPrices.VIP)})</span>
                        )}
                        {seatTypeBreakdown.COUPLE > 0 && (
                          <span className="text-[#fda4af]">{Math.floor(seatTypeBreakdown.COUPLE / 2)}x Couple Pair ({formatCurrency(seatPrices.COUPLE_PAIR)})</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Promotional Voucher Section */}
                <div className="pt-2 border-t border-[#2e2316]">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-[#ab9a84] flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-[#e0b354]" />
                      <span>Promotional Voucher</span>
                    </label>
                    {availableVouchers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsVoucherModalOpen(true)}
                        className="text-[11px] font-semibold text-[#f3cb62] hover:text-[#fce092] flex items-center gap-1 hover:underline transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Browse ({availableVouchers.length})</span>
                      </button>
                    )}
                  </div>

                  {appliedVoucher ? (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-[#291e12] to-[#1e150d] border border-[#b8862d] text-xs shadow-md">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#3d2b17] border border-[#785325] flex items-center justify-center text-[#fce092]">
                          <Check className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-[#fce092]">
                              {appliedVoucher.code}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 font-bold uppercase">
                              Applied
                            </span>
                          </div>
                          <p className="text-[11px] text-[#ab9a84]">
                            -{formatCurrency(discountAmount)} discount applied
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsVoucherModalOpen(true)}
                          className="text-xs text-[#f3cb62] hover:text-[#fce092] font-semibold cursor-pointer"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveVoucher}
                          className="text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Quick Browse Button */}
                      <button
                        type="button"
                        onClick={() => setIsVoucherModalOpen(true)}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[#21170e] hover:bg-[#2c1f13] border border-[#4d3c26] hover:border-[#f3cb62] text-xs font-semibold text-[#f5ece0] transition-all cursor-pointer group"
                      >
                        <span className="flex items-center gap-2 text-[#f3cb62]">
                          <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                          <span>Select from Available Vouchers</span>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#382613] text-[10px] font-bold text-[#fce092]">
                          {availableVouchers.length} Vouchers
                        </span>
                      </button>

                      {/* Manual Code Input Form */}
                      <form onSubmit={handleApplyVoucher} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="OR ENTER CODE"
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
                    </div>
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
                  <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-200 flex flex-col gap-1.5">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span>{bookingError}</span>
                    </div>
                    {(bookingError.toLowerCase().includes('reservations') ||
                      bookingError.toLowerCase().includes('pending')) && (
                      <Link
                        to="/my-bookings"
                        className="text-[#e6c27a] hover:underline font-semibold text-xs ml-6 inline-flex items-center gap-1"
                      >
                        Go to My Bookings &rarr;
                      </Link>
                    )}
                    {(bookingError.toLowerCase().includes('closed') ||
                      bookingError.toLowerCase().includes('cancelled')) && (
                      <Link
                        to={showtime?.movieId ? `/movies/${showtime.movieId}` : '/'}
                        className="text-[#e6c27a] hover:underline font-semibold text-xs ml-6 inline-flex items-center gap-1"
                      >
                        Choose another showtime &rarr;
                      </Link>
                    )}
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

      {/* Interactive Voucher Selection Modal */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#140e09] border border-[#3d2b17] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#2e2316]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#291e12] border border-[#785325] flex items-center justify-center text-[#fce092]">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-body font-bold text-lg text-[#f7efe4]">
                    Select Promotional Voucher
                  </h3>
                  <p className="text-xs text-[#ab9a84]">
                    Eligible vouchers unlock automatically based on your order subtotal.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVoucherModalOpen(false)}
                className="text-[#8a765d] hover:text-[#f7efe4] p-1.5 rounded-lg hover:bg-[#241a10] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Subtotal Snapshot Banner */}
            <div className="my-4 p-3 rounded-xl bg-[#1f160e] border border-[#4a3620] flex items-center justify-between">
              <span className="text-xs text-[#ab9a84]">Current Ticket Subtotal:</span>
              <span className="font-body font-extrabold text-base text-[#f3cb62]">
                {formatCurrency(subtotal)}
              </span>
            </div>

            {/* Voucher List Scrollable Area */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {availableVouchers.length === 0 ? (
                <p className="text-center text-xs text-[#8a765d] py-8">
                  No promotional vouchers currently active.
                </p>
              ) : (
                availableVouchers.map((voucher) => {
                  const minOrder = voucher.minOrderValue || 0;
                  const isUserLimitReached =
                    voucher.remainingUserQuota !== undefined &&
                    voucher.remainingUserQuota !== null &&
                    voucher.remainingUserQuota <= 0;
                  const isEligible = subtotal >= minOrder && subtotal > 0 && !isUserLimitReached;
                  const isApplied = appliedVoucher?.code === voucher.code;
                  const shortage = minOrder - subtotal;

                  return (
                    <div
                      key={voucher.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isApplied
                          ? 'border-[#f3cb62] bg-[#291e12] ring-1 ring-[#f3cb62]/50 shadow-[0_0_15px_rgba(243,203,98,0.2)]'
                          : isEligible
                          ? 'border-[#785325] hover:border-[#f3cb62] bg-[#1f160e] hover:bg-[#241a10] shadow-[0_2px_10px_rgba(0,0,0,0.3)]'
                          : isUserLimitReached
                          ? 'border-red-950/40 bg-[#120d09] opacity-50'
                          : 'border-[#291e13] bg-[#120d09] opacity-55'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono font-black text-sm px-2 py-0.5 rounded ${
                                isEligible
                                  ? 'bg-[#382613] text-[#fce092] border border-[#785325]'
                                  : 'bg-[#1a140d] text-[#8a765d] border border-[#2e2316]'
                              }`}
                            >
                              {voucher.code}
                            </span>
                            {isApplied && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 font-bold uppercase">
                                Active
                              </span>
                            )}
                            {isUserLimitReached ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950/80 border border-red-700/60 text-red-300 font-bold flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" />
                                <span>Limit Reached</span>
                              </span>
                            ) : !isEligible ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#241a10] border border-[#3d2b17] text-[#8a765d] flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" />
                                <span>Locked</span>
                              </span>
                            ) : null}
                          </div>
                          <p
                            className={`text-xs font-semibold ${
                              isEligible ? 'text-[#f5ece0]' : 'text-[#8a765d]'
                            }`}
                          >
                            {voucher.discountType === 'PERCENTAGE'
                              ? `${voucher.discountValue}% OFF (up to ${formatCurrency(
                                  voucher.maxDiscountAmount || 0
                                )})`
                              : `${formatCurrency(voucher.discountValue)} Flat Discount`}
                          </p>
                          <p className="text-[11px] text-[#8a765d]">
                            Min. Order: {formatCurrency(minOrder)}
                          </p>
                        </div>

                        {/* Action button */}
                        <div>
                          {isApplied ? (
                            <button
                              type="button"
                              onClick={handleRemoveVoucher}
                              className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/50 border border-red-800/60 text-xs font-bold text-red-300 transition-colors cursor-pointer"
                            >
                              Remove
                            </button>
                          ) : isEligible ? (
                            <button
                              type="button"
                              onClick={() => {
                                setAppliedVoucher(voucher);
                                setVoucherInput(voucher.code);
                                setVoucherError('');
                                setIsVoucherModalOpen(false);
                              }}
                              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#f3cb62] to-[#dda938] hover:from-[#f7d576] hover:to-[#e5b344] text-[#140e08] text-xs font-extrabold shadow-[0_2px_8px_rgba(243,203,98,0.3)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                            >
                              Apply
                            </button>
                          ) : isUserLimitReached ? (
                            <button
                              type="button"
                              disabled
                              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-bold text-zinc-500 cursor-not-allowed"
                            >
                              Limit Reached
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="px-3 py-1.5 rounded-lg bg-[#1a140d] border border-[#2e2316] text-xs font-semibold text-[#5a4836] cursor-not-allowed"
                            >
                              Locked
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Notice */}
                      {isUserLimitReached ? (
                        <div className="mt-2.5 pt-2 border-t border-[#1f160e] text-[11px] text-red-400/80 flex items-center gap-1.5">
                          <Lock className="w-3 h-3 shrink-0" />
                          <span>
                            You have reached the usage limit for this voucher ({voucher.userUsedCount}/{voucher.perUserLimit} used).
                          </span>
                        </div>
                      ) : !isEligible ? (
                        <div className="mt-2.5 pt-2 border-t border-[#1f160e] text-[11px] text-amber-500/70 flex items-center gap-1.5">
                          <Info className="w-3 h-3 shrink-0" />
                          <span>
                            {subtotal === 0
                              ? 'Select seats in the auditorium to unlock this voucher.'
                              : `Add ${formatCurrency(
                                  shortage
                                )} more to your ticket selection to qualify.`}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 mt-4 border-t border-[#2e2316] flex justify-end">
              <button
                type="button"
                onClick={() => setIsVoucherModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#21170e] hover:bg-[#2c1f13] border border-[#4d3c26] text-xs font-semibold text-[#f5ece0] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
