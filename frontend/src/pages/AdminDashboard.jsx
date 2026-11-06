import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  TrendingUp,
  CreditCard,
  Film,
  Tag,
  MessageSquare,
  ShieldAlert,
  Loader2,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Calendar,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  ArrowLeft,
  X,
  Clock,
  Check,
  Percent,
  Banknote,
  Sparkles,
  Ban,
} from 'lucide-react';
import Navbar, { CinemaBadgeIcon } from '../components/Navbar';
import CustomDatePicker from '../components/CustomDatePicker';
import { adminApi } from '../api/adminApi';
import { movieApi } from '../api/movieApi';
import { useToast } from '../context/ToastContext';

import { formatCurrency, formatDateTime } from '../utils/formatters';
import { toLocalDateStr, localDateStrFromToday } from '../utils/dates';
import {
  filterShowtimes,
  getScreeningPhase,
  onSearchTextChange,
  onMovieFilterChange,
} from '../utils/showtimeFilters';

export default function AdminDashboard() {
  const { showToast, confirm } = useToast();

  // Active Tab: REVENUE | SHOWTIMES | PAYMENTS | MOVIES | VOUCHERS | REVIEWS
  const [activeTab, setActiveTab] = useState('REVENUE');

  // Auth check
  const user = (() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();
  const isAdmin = user?.role === 'ADMIN';

  // 1. REVENUE REPORT STATE (FR-REP-01)
  const [revenueData, setRevenueData] = useState(null);
  const [fromDate, setFromDate] = useState(() => localDateStrFromToday(-30));
  const [toDate, setToDate] = useState(() => toLocalDateStr());
  const [loadingRevenue, setLoadingRevenue] = useState(false);

  // 2. SHOWTIMES STATE (FR-SHOW-01)
  const [showtimesList, setShowtimesList] = useState([]);
  const [loadingShowtimes, setLoadingShowtimes] = useState(false);
  const [cinemasList, setCinemasList] = useState([]);
  const [roomsList, setRoomsList] = useState([]);
  const [selectedCinemaId, setSelectedCinemaId] = useState('');
  const [filterShowtimeMovie, setFilterShowtimeMovie] = useState('');
  const [filterShowtimeRoom, setFilterShowtimeRoom] = useState('');
  const [filterShowtimeDate, setFilterShowtimeDate] = useState('');
  const [filterShowtimeMovieStatus, setFilterShowtimeMovieStatus] = useState('ALL');
  const [showtimePage, setShowtimePage] = useState(1);
  const [showtimeTotalPages, setShowtimeTotalPages] = useState(1);
  const [showtimeSearchText, setShowtimeSearchText] = useState('');
  const [showAddShowtimeModal, setShowAddShowtimeModal] = useState(false);
  const [schedulingError, setSchedulingError] = useState('');
  const [newShowtime, setNewShowtime] = useState({
    movieId: '',
    roomId: '',
    format: '2D',
    translationType: 'SUBTITLE',
    startTime: '',
    basePrice: 80000,
  });

  // 3. PAYMENTS & REFUNDS STATE (FR-PAY-02)
  const [payments, setPayments] = useState([]);
  const [paymentFilterStatus, setPaymentFilterStatus] = useState('');
  const [paymentRefundFilter, setPaymentRefundFilter] = useState('');
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [refundingId, setRefundingId] = useState(null);

  // 4. MOVIES STATE
  const [moviesList, setMoviesList] = useState([]);
  const [_loadingMovies, setLoadingMovies] = useState(false);
  const [showAddMovieModal, setShowAddMovieModal] = useState(false);
  const [newMovie, setNewMovie] = useState({
    title: '',
    description: '',
    director: '',
    durationMinutes: 120,
    releaseDate: toLocalDateStr(),
    ageRating: 'P',
    originalLanguage: 'English',
    posterUrl: '',
    trailerUrl: '',
    status: 'NOW_SHOWING',
    genreIds: [1],
    actorIds: [],
  });

  // 5. VOUCHERS STATE
  const getInitialVoucherState = () => {
    const now = new Date();
    const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const toInputString = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${mins}`;
    };

    return {
      code: '',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      maxDiscountAmount: 50000,
      minOrderValue: 100000,
      usageLimit: 100,
      perUserLimit: 1,
      startAt: toInputString(now),
      endAt: toInputString(future),
    };
  };

  const [vouchersList, setVouchersList] = useState([]);
  const [_loadingVouchers, setLoadingVouchers] = useState(false);
  const [showAddVoucherModal, setShowAddVoucherModal] = useState(false);
  const [newVoucher, setNewVoucher] = useState(getInitialVoucherState);
  const [voucherError, setVoucherError] = useState('');
  const [voucherSubmitting, setVoucherSubmitting] = useState(false);

  const generateRandomVoucherCode = (type) => {
    const prefix = type === 'PERCENTAGE' ? 'SALE' : 'SAVE';
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    setNewVoucher((prev) => ({ ...prev, code: `${prefix}${rand}` }));
  };

  // 6. REVIEWS STATE (FR-REV-01)
  const [reviewsList, setReviewsList] = useState([]);
  const [_loadingReviews, setLoadingReviews] = useState(false);

  // Global notice / feedback
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');

  // 1. Fetch Revenue Report
  const fetchRevenue = useCallback(async (customFrom, customTo) => {
    if (!isAdmin) return;
    const start = customFrom !== undefined ? customFrom : fromDate;
    const end = customTo !== undefined ? customTo : toDate;

    if (start && end && start > end) {
      showToast('Start date cannot be after end date.', 'error');
      return;
    }

    setLoadingRevenue(true);
    setActionError('');
    try {
      const res = await adminApi.getRevenueReport({
        fromDate: start || undefined,
        toDate: end || undefined,
      });
      const data = res?.data?.data ?? res?.data;
      setRevenueData(data);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to fetch revenue metrics.');
    } finally {
      setLoadingRevenue(false);
    }
  }, [isAdmin, showToast, fromDate, toDate]);

  // 2. Fetch Showtimes & Cinema/Room metadata
  const fetchShowtimes = useCallback(async (customOverrides = {}) => {
    setLoadingShowtimes(true);
    try {
      const pageToUse = customOverrides.page !== undefined ? customOverrides.page : showtimePage;
      const res = await adminApi.getShowtimes({
        movieId: customOverrides.movieId !== undefined ? customOverrides.movieId : (filterShowtimeMovie || undefined),
        roomId: customOverrides.roomId !== undefined ? customOverrides.roomId : (filterShowtimeRoom || undefined),
        showDate: customOverrides.showDate !== undefined ? customOverrides.showDate : (filterShowtimeDate || undefined),
        page: pageToUse,
        size: 100,
      });
      const raw = res?.data?.data ?? res?.data;
      setShowtimesList(Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : []);
      setShowtimeTotalPages(raw?.totalPages || 1);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to fetch showtimes.');
    } finally {
      setLoadingShowtimes(false);
    }
  }, [filterShowtimeMovie, filterShowtimeRoom, filterShowtimeDate, showtimePage]);

  const fetchCinemasAndRooms = useCallback(async () => {
    try {
      const cRes = await adminApi.getCinemas();
      const cinemas = cRes?.data?.data ?? cRes?.data ?? [];
      setCinemasList(cinemas);

      if (cinemas.length > 0) {
        const defaultCinemaId = cinemas[0].id;
        setSelectedCinemaId(defaultCinemaId);
        const rRes = await adminApi.getRooms(defaultCinemaId);
        const rooms = rRes?.data?.data ?? rRes?.data ?? [];
        setRoomsList(rooms);
      }
    } catch (err) {
      console.error('Failed to load cinema locations:', err);
    }
  }, []);

  const handleCinemaChange = async (cinemaId) => {
    setSelectedCinemaId(cinemaId);
    try {
      const rRes = await adminApi.getRooms(cinemaId);
      const rooms = rRes?.data?.data ?? rRes?.data ?? [];
      setRoomsList(rooms);
      if (rooms.length > 0) {
        setNewShowtime((prev) => ({ ...prev, roomId: rooms[0].id }));
      }
    } catch (err) {
      console.error('Failed to update rooms for cinema:', err);
    }
  };

  // 3. Fetch Payments
  const fetchPayments = useCallback(async (customOverrides = {}) => {
    if (!isAdmin) return;
    setLoadingPayments(true);
    try {
      const res = await adminApi.getAllPayments({
        status: customOverrides.status !== undefined ? customOverrides.status : (paymentFilterStatus || undefined),
        refundStatus: customOverrides.refundStatus !== undefined ? customOverrides.refundStatus : (paymentRefundFilter || undefined),
        page: customOverrides.page || 1,
        size: 100,
      });
      const raw = res?.data?.data ?? res?.data;
      setPayments(Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : []);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to fetch payment ledger.');
    } finally {
      setLoadingPayments(false);
    }
  }, [isAdmin, paymentFilterStatus, paymentRefundFilter]);

  // 4. Fetch Movies
  const fetchMovies = useCallback(async () => {
    setLoadingMovies(true);
    try {
      const res = await movieApi.getAllMovies({ page: 1, size: 100 });
      const raw = res?.data?.data ?? res?.data;
      const items = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : [];
      setMoviesList(items);
      if (items.length > 0) {
        setNewShowtime((prev) => ({ ...prev, movieId: prev.movieId || items[0].id }));
      }
    } catch {
      setActionError('Failed to fetch movies catalog.');
    } finally {
      setLoadingMovies(false);
    }
  }, []);

  // 5. Fetch Vouchers
  const fetchVouchers = useCallback(async () => {
    setLoadingVouchers(true);
    try {
      const res = await movieApi.getAllVouchers();
      const raw = res?.data?.data ?? res?.data;
      setVouchersList(Array.isArray(raw) ? raw : []);
    } catch {
      setActionError('Failed to fetch vouchers.');
    } finally {
      setLoadingVouchers(false);
    }
  }, []);

  // 6. Fetch Reviews
  const fetchReviews = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingReviews(true);
    try {
      const res = await adminApi.getAllReviews({ page: 1, size: 50 });
      const raw = res?.data?.data ?? res?.data;
      setReviewsList(Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : []);
    } catch {
      setActionError('Failed to fetch reviews.');
    } finally {
      setLoadingReviews(false);
    }
  }, [isAdmin]);

  // Initial Load based on tab
  useEffect(() => {
    if (activeTab === 'REVENUE') fetchRevenue(fromDate, toDate);
    else if (activeTab === 'SHOWTIMES') {
      fetchShowtimes();
      fetchCinemasAndRooms();
      fetchMovies();
    } else if (activeTab === 'PAYMENTS') fetchPayments();
    else if (activeTab === 'MOVIES') fetchMovies();
    else if (activeTab === 'VOUCHERS') fetchVouchers();
    else if (activeTab === 'REVIEWS') fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Handle Manual Refund Confirmation
  const handleConfirmRefund = async (paymentId) => {
    const confirmed = await confirm({
      title: 'Confirm Manual Refund Settlement',
      message: `Are you sure you want to confirm manual refund settlement for Payment #${paymentId}? This will update the transaction to REFUNDED.`,
      confirmText: 'Confirm Refund',
      cancelText: 'Cancel',
      isDestructive: false,
    });
    if (!confirmed) return;

    setRefundingId(paymentId);
    try {
      await adminApi.confirmManualRefund(paymentId);
      showToast(`Payment #${paymentId} confirmed as REFUNDED.`, 'success');
      fetchPayments();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to confirm refund.', 'error');
    } finally {
      setRefundingId(null);
    }
  };

  // Toggle Voucher status
  const handleToggleVoucher = async (id, currentStatus) => {
    try {
      await adminApi.toggleVoucherStatus(id, !currentStatus);
      fetchVouchers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update voucher status.', 'error');
    }
  };

  // Toggle Review status
  const handleToggleReviewStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE';
    try {
      await adminApi.updateReviewStatus(id, nextStatus);
      fetchReviews();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update review visibility.', 'error');
    }
  };

  // Create Showtime Form Submit (FR-SHOW-01)
  const handleCreateShowtimeSubmit = async (e) => {
    e.preventDefault();
    setSchedulingError('');
    try {
      if (!newShowtime.movieId || !newShowtime.roomId || !newShowtime.startTime) {
        setSchedulingError('Please fill in Movie, Room, and Start Time.');
        return;
      }

      const formattedStartTime =
        newShowtime.startTime.length === 16 ? `${newShowtime.startTime}:00` : newShowtime.startTime;

      await adminApi.createShowtime({
        movieId: Number(newShowtime.movieId),
        roomId: Number(newShowtime.roomId),
        format: newShowtime.format,
        translationType: newShowtime.translationType,
        startTime: formattedStartTime,
        basePrice: Number(newShowtime.basePrice),
      });

      setShowAddShowtimeModal(false);
      setNotice('Showtime scheduled successfully! Seat inventory initialized.');
      fetchShowtimes();
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      const serverMsg = err.response?.data?.message || '';
      const validationErrors = err.response?.data?.errors;
      let detailedMsg;

      if (serverMsg.includes('ENDED') || serverMsg.includes('AVAILABLE_FOR_SHOWTIME')) {
        detailedMsg = 'Cannot schedule showtime: This movie has status ENDED. Please select a NOW_SHOWING or COMING_SOON movie, or update its status in the Movie Catalog tab.';
      } else if (serverMsg.includes('conflict') || serverMsg.includes('overlaps') || serverMsg.includes('TIME_CONFLICT')) {
        detailedMsg = 'Room collision detected: This auditorium room is already booked for another showtime during this window (including the 15-minute cleanup buffer). Please select a different room or time slot.';
      } else if (serverMsg.includes('future') || serverMsg.includes('past')) {
        detailedMsg = 'Invalid start time: Showtime start time must be in the future.';
      } else if (validationErrors && typeof validationErrors === 'object') {
        detailedMsg = Object.entries(validationErrors)
          .map(([field, error]) => `${field}: ${error}`)
          .join(' | ');
      } else {
        detailedMsg = serverMsg || 'Validation error: Please verify that start time is in the future, price is > 0, and the room is free.';
      }

      setSchedulingError(detailedMsg);
      showToast(detailedMsg, 'error');
    }
  };

  // Cancel Showtime
  const handleCancelShowtime = async (id) => {
    const confirmed = await confirm({
      title: 'Cancel Showtime Schedule',
      message: `Are you sure you want to cancel Showtime #${id}? Any active customer bookings will be automatically cancelled, seats released, and customer payments queued for refund settlement in the Payments & Refunds tab.`,
      confirmText: 'Yes, Cancel Showtime',
      cancelText: 'Keep Scheduled',
      isDestructive: true,
    });
    if (!confirmed) return;

    try {
      await adminApi.cancelShowtime(id);
      showToast(`Showtime #${id} has been cancelled. Any active bookings were cancelled and queued for refund.`, 'info');
      fetchShowtimes();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel showtime.', 'error');
    }
  };

  // Discontinue Movie (G2-04)
  const handleDiscontinueMovie = async (id, title) => {
    const confirmed = await confirm({
      title: 'Ngừng chiếu phim',
      message: `Bạn có chắc chắn muốn ngừng chiếu phim "${title}"? Trạng thái của phim sẽ được chuyển thành ENDED.`,
      confirmText: 'Xác nhận ngừng chiếu',
      cancelText: 'Hủy',
      isDestructive: true,
    });
    if (!confirmed) return;

    try {
      await adminApi.deleteMovie(id);
      showToast(`Phim "${title}" đã được chuyển sang trạng thái ENDED.`, 'info');
      setNotice(`Phim "${title}" đã chuyển sang trạng thái ENDED.`);
      setTimeout(() => setNotice(''), 4000);
      fetchMovies();
    } catch (err) {
      const resData = err.response?.data;
      const code = resData?.code;
      if (code === 1207 || err.response?.status === 409) {
        const errorMsg = 'Phim vẫn còn các suất chiếu sắp diễn ra. Vui lòng hủy các suất chiếu này trước khi ngừng chiếu phim.';
        showToast(errorMsg, 'error');
        setActionError(errorMsg);
        setTimeout(() => setActionError(''), 5000);
      } else {
        const msg = resData?.message || 'Failed to discontinue movie.';
        showToast(msg, 'error');
        setActionError(msg);
        setTimeout(() => setActionError(''), 5000);
      }
    }
  };

  // Create Movie Form Submit
  const handleCreateMovieSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createMovie(newMovie);
      setShowAddMovieModal(false);
      setNotice('Movie published successfully.');
      fetchMovies();
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create movie.', 'error');
    }
  };

   // Create Voucher Form Submit
  const handleCreateVoucherSubmit = async (e) => {
    e.preventDefault();
    setVoucherError('');

    const discountVal = Number(newVoucher.discountValue);

    if (!newVoucher.code.trim()) {
      setVoucherError('Voucher code cannot be empty.');
      return;
    }
    if (newVoucher.discountType === 'PERCENTAGE' && (discountVal <= 0 || discountVal > 100)) {
      setVoucherError('Percentage discount must be between 1% and 100%.');
      return;
    }
    if (newVoucher.discountType === 'FIXED_AMOUNT' && discountVal <= 0) {
      setVoucherError('Fixed discount amount must be greater than 0 VND.');
      return;
    }
    if (newVoucher.startAt && newVoucher.endAt && newVoucher.startAt >= newVoucher.endAt) {
      setVoucherError('Expiration date must be after the start date.');
      return;
    }

    setVoucherSubmitting(true);
    try {
      const payload = {
        code: newVoucher.code.trim().toUpperCase(),
        discountType: newVoucher.discountType,
        discountValue: Number(newVoucher.discountValue),
        minOrderValue: Number(newVoucher.minOrderValue || 0),
        maxDiscountAmount:
          newVoucher.discountType === 'PERCENTAGE' && newVoucher.maxDiscountAmount
            ? Number(newVoucher.maxDiscountAmount)
            : newVoucher.discountType === 'FIXED_AMOUNT'
            ? Number(newVoucher.discountValue)
            : null,
        usageLimit: Number(newVoucher.usageLimit || 1),
        perUserLimit: Number(newVoucher.perUserLimit || 1),
        startAt: newVoucher.startAt.length === 16 ? `${newVoucher.startAt}:00` : newVoucher.startAt,
        endAt: newVoucher.endAt.length === 16 ? `${newVoucher.endAt}:00` : newVoucher.endAt,
      };

      await adminApi.createVoucher(payload);
      showToast('Voucher campaign activated successfully!', 'success');
      setShowAddVoucherModal(false);
      setNewVoucher(getInitialVoucherState());
      fetchVouchers();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create voucher campaign.';
      setVoucherError(msg);
      showToast(msg, 'error');
    } finally {
      setVoucherSubmitting(false);
    }
  };

  const movieMap = useMemo(() => {
    return new Map(moviesList.map((m) => [m.id, m]));
  }, [moviesList]);

  const filteredShowtimes = useMemo(() => {
    return filterShowtimes({
      showtimesList,
      filterTab: filterShowtimeMovieStatus,
      searchText: showtimeSearchText,
      movieMap,
    });
  }, [showtimesList, showtimeSearchText, filterShowtimeMovieStatus, movieMap]);

  return (
    <div className="min-h-screen w-full bg-[#0e0a07] text-[#f2e8dc] font-body flex flex-col select-none">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2e2316] pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#1c140c] border border-[#e0b354] flex items-center justify-center">
              <CinemaBadgeIcon className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-body font-extrabold text-2xl sm:text-3xl text-[#f7efe4] tracking-tight">
                  Admin Operations Console
                </h1>
                <span className="px-2 py-0.5 rounded bg-red-950/80 border border-red-700 text-red-300 text-[10px] font-black uppercase">
                  Admin Role
                </span>
              </div>
              <p className="text-xs text-[#ab9a84] mt-0.5">
                Real-time cinema auditing, revenue reporting (FR-REP-01), showtime scheduling (FR-SHOW-01), refunds (FR-PAY-02), and catalog controls.
              </p>
            </div>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1a130d] border border-[#3d2f1d] text-xs font-semibold text-[#c7b59d] hover:text-[#f3cb62] transition-colors self-start sm:self-center"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go to Customer Portal</span>
          </Link>
        </div>

        {/* Access Guard */}
        {!isAdmin && (
          <div className="p-8 rounded-2xl bg-[#140f0a] border border-red-800/80 text-center max-w-md mx-auto my-16 space-y-4">
            <ShieldAlert className="w-12 h-12 text-red-400 mx-auto" />
            <h2 className="font-body font-bold text-xl text-[#f7efe4]">
              Administrator Privileges Required
            </h2>
            <p className="text-xs text-[#ab9a84] leading-relaxed">
              You must be authenticated with an authorized System Administrator account to access operational metrics and catalog controls.
            </p>
            <Link
              to="/login?redirect=/admin"
              className="inline-flex px-6 py-2.5 rounded-lg bg-gradient-to-b from-[#f3cb62] to-[#dda938] text-[#1a1209] font-bold text-xs shadow-md"
            >
              Sign In as Administrator
            </Link>
          </div>
        )}

        {isAdmin && (
          <>
            {/* Feedback Notifications */}
            {notice && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-700/80 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{notice}</span>
              </div>
            )}
            {actionError && (
              <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/80 text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Admin Console Tabs */}
            <div className="flex items-center gap-2 border-b border-[#241a10] pb-3 mb-8 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('REVENUE')}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'REVENUE'
                    ? 'bg-[#241a10] border border-[#e0b354] text-[#f3cb62]'
                    : 'text-[#ab9a84] hover:text-[#f2e8dc]'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-[#e0b354]" />
                <span>Revenue Reports (FR-REP-01)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('SHOWTIMES')}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'SHOWTIMES'
                    ? 'bg-[#241a10] border border-[#e0b354] text-[#f3cb62]'
                    : 'text-[#ab9a84] hover:text-[#f2e8dc]'
                }`}
              >
                <Clock className="w-4 h-4 text-[#e0b354]" />
                <span>Showtime Scheduling (FR-SHOW-01)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('PAYMENTS')}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'PAYMENTS'
                    ? 'bg-[#241a10] border border-[#e0b354] text-[#f3cb62]'
                    : 'text-[#ab9a84] hover:text-[#f2e8dc]'
                }`}
              >
                <CreditCard className="w-4 h-4 text-[#e0b354]" />
                <span>Payments &amp; Refunds</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('MOVIES')}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'MOVIES'
                    ? 'bg-[#241a10] border border-[#e0b354] text-[#f3cb62]'
                    : 'text-[#ab9a84] hover:text-[#f2e8dc]'
                }`}
              >
                <Film className="w-4 h-4 text-[#e0b354]" />
                <span>Movie Catalog</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('VOUCHERS')}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'VOUCHERS'
                    ? 'bg-[#241a10] border border-[#e0b354] text-[#f3cb62]'
                    : 'text-[#ab9a84] hover:text-[#f2e8dc]'
                }`}
              >
                <Tag className="w-4 h-4 text-[#e0b354]" />
                <span>Promotional Vouchers</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('REVIEWS')}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'REVIEWS'
                    ? 'bg-[#241a10] border border-[#e0b354] text-[#f3cb62]'
                    : 'text-[#ab9a84] hover:text-[#f2e8dc]'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-[#e0b354]" />
                <span>Review Moderation</span>
              </button>
            </div>

            {/* TAB 1: REVENUE REPORTING (FR-REP-01) */}
            {activeTab === 'REVENUE' && (
              <div className="space-y-6">
                {/* Date Filter Bar */}
                <div className="bg-[#140f0a] border border-[#2e2316] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-semibold text-[#ab9a84] flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#e0b354]" />
                      Date Window:
                    </span>
                    <CustomDatePicker
                      value={fromDate}
                      onChange={setFromDate}
                      label=""
                      className="w-36"
                    />
                    <span className="text-xs text-[#8a765d]">to</span>
                    <CustomDatePicker
                      value={toDate}
                      onChange={setToDate}
                      label=""
                      className="w-36"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => fetchRevenue(fromDate, toDate)}
                    disabled={loadingRevenue}
                    className="px-4 py-2 rounded-lg bg-[#241a10] border border-[#3d2f1d] text-xs font-semibold text-[#e6c27a] hover:border-[#e0b354] transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingRevenue ? 'animate-spin' : ''}`} />
                    <span>Apply Filter</span>
                  </button>
                </div>

                {/* Calculation Windows Explanation (G2-06) */}
                <div className="bg-[#1a130b] border border-[#3d2f1d] rounded-xl p-3.5 text-xs text-[#ab9a84] flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-[#e0b354] shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-[#f5ece0] font-medium">
                      Quy tắc thống kê doanh thu &amp; công suất:
                    </p>
                    <ul className="list-disc list-inside text-[11px] text-[#ab9a84] space-y-0.5">
                      <li>Doanh thu và số vé bán ra được tính theo ngày thanh toán thành công (pay_date).</li>
                      <li>Tổng số ghế và tỷ lệ lấp đầy (occupancy) được tính theo thời gian suất chiếu diễn ra (start_time).</li>
                    </ul>
                  </div>
                </div>

                {loadingRevenue && (
                  <div className="p-12 text-center text-[#ab9a84] flex items-center justify-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-[#e0b354]" />
                    <span>Aggregating financial reports...</span>
                  </div>
                )}

                {!loadingRevenue && revenueData && (
                  <>
                    {/* Top KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-[#140f0a] border border-[#2e2316] rounded-xl p-5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#ab9a84] uppercase tracking-wider">
                            Realized Revenue
                          </span>
                          <DollarSign className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="text-2xl font-bold font-mono text-[#f3cb62]">
                          {formatCurrency(revenueData.totalRealizedRevenue)}
                        </div>
                        <p className="text-[11px] text-[#8a765d]">
                          Strictly settled SUCCESS payments (refund_status = NONE).
                        </p>
                      </div>

                      <div className="bg-[#140f0a] border border-[#2e2316] rounded-xl p-5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#ab9a84] uppercase tracking-wider">
                            Successful Transactions
                          </span>
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="text-2xl font-bold font-mono text-[#f7efe4]">
                          {revenueData.totalSuccessPayments || 0}
                        </div>
                        <p className="text-[11px] text-[#8a765d]">
                          Completed VNPay checkouts within hold expiration.
                        </p>
                      </div>

                      <div className="bg-[#140f0a] border border-[#2e2316] rounded-xl p-5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#ab9a84] uppercase tracking-wider">
                            Tickets Issued
                          </span>
                          <Film className="w-5 h-5 text-[#e0b354]" />
                        </div>
                        <div className="text-2xl font-bold font-mono text-[#f7efe4]">
                          {revenueData.totalTicketsSold || 0}
                        </div>
                        <p className="text-[11px] text-[#8a765d]">
                          Confirmed seats across all auditoriums.
                        </p>
                      </div>

                      <div className="bg-[#140f0a] border border-[#2e2316] rounded-xl p-5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#ab9a84] uppercase tracking-wider">
                            Pending Refunds
                          </span>
                          <ShieldAlert className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="text-2xl font-bold font-mono text-amber-300">
                          {revenueData.totalPendingRefunds || 0}
                        </div>
                        <p className="text-[11px] text-[#8a765d]">
                          Payments requiring manual admin settlement (FR-PAY-02).
                        </p>
                      </div>
                    </div>

                    {/* Movie-by-Movie Revenue Breakdown */}
                    <div className="bg-[#140f0a] border border-[#2e2316] rounded-xl p-6 space-y-4">
                      <h2 className="font-body font-bold text-lg text-[#f7efe4] flex items-center gap-2">
                        <Film className="w-4 h-4 text-[#e0b354]" />
                        <span>Movie Performance Breakdown</span>
                      </h2>

                      {(!revenueData.movieBreakdowns || revenueData.movieBreakdowns.length === 0) ? (
                        <div className="text-center py-8 text-xs text-[#6e5d49]">
                          No revenue breakdown data recorded for this date window.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[#1c140c] text-[#ab9a84] uppercase text-[10px] tracking-wider">
                              <tr>
                                <th className="py-3 px-4">Movie Title</th>
                                <th className="py-3 px-4 text-center">Tickets Sold</th>
                                <th className="py-3 px-4 text-center">Screenings</th>
                                <th className="py-3 px-4 text-center">Avg Occupancy</th>
                                <th className="py-3 px-4 text-right">Realized Revenue</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#241a10]">
                              {revenueData.movieBreakdowns.map((m, idx) => (
                                <tr key={idx} className="hover:bg-[#1f1710]/50 transition-colors">
                                  <td className="py-3 px-4 font-semibold text-[#f5ece0]">
                                    {m.movieTitle}
                                  </td>
                                  <td className="py-3 px-4 text-center text-[#ab9a84] font-mono">
                                    {m.ticketsSold ?? m.totalBookings ?? 0}
                                  </td>
                                  <td className="py-3 px-4 text-center text-[#ab9a84] font-mono">
                                    {m.totalScreenings ?? ((m.ticketsSold || m.totalBookings || 0) > 0 ? 1 : 0)}
                                  </td>
                                  <td className="py-3 px-4 text-center font-mono">
                                    <span className="px-2 py-0.5 rounded bg-[#241a10] border border-[#3d2f1d] text-[#e6c27a] text-[11px]">
                                      {m.occupancyRate !== undefined && m.occupancyRate !== null
                                        ? `${Number(m.occupancyRate).toFixed(1)}%`
                                        : '0.0%'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono font-bold text-[#f3cb62]">
                                    {formatCurrency(m.revenue)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB 2: SHOWTIME SCHEDULING (FR-SHOW-01) */}
            {activeTab === 'SHOWTIMES' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-body font-bold text-lg text-[#f7efe4] flex items-center gap-2">
                      <Clock className="w-5 h-5 text-[#e0b354]" />
                      <span>Auditorium Showtime Schedules (FR-SHOW-01)</span>
                    </h2>
                    <p className="text-xs text-[#ab9a84]">
                      Schedules are protected against hall overlaps with an enforced 15-minute cleaning buffer.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSchedulingError('');
                      setShowAddShowtimeModal(true);
                    }}
                    className="px-4 py-2 rounded-lg bg-gradient-to-b from-[#f3cb62] to-[#dda938] text-[#1a1209] font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Schedule Showtime</span>
                  </button>
                </div>

                {/* Movie Status Segmentation Tabs */}
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'ALL', label: 'All Showtimes' },
                    { id: 'UPCOMING', label: 'Upcoming & Live' },
                    { id: 'PAST', label: 'Past Screenings' },
                    { id: 'NOW_SHOWING', label: 'Now Showing Films' },
                    { id: 'COMING_SOON', label: 'Coming Soon Films' },
                    { id: 'ENDED', label: 'Ended Movies' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilterShowtimeMovieStatus(tab.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                        filterShowtimeMovieStatus === tab.id
                          ? 'bg-gradient-to-b from-[#f3cb62] to-[#dda938] text-[#1a1209] font-bold shadow-md'
                          : 'bg-[#18120c] border border-[#2e2316] text-[#ab9a84] hover:text-[#f5ece0] hover:border-[#42321e]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Filters */}
                <div className="bg-[#140f0a] border border-[#2e2316] rounded-xl p-4 flex flex-wrap items-center gap-3">
                  {/* Date Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#ab9a84] font-semibold flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#e0b354]" />
                      Date:
                    </span>
                    <CustomDatePicker
                      value={filterShowtimeDate}
                      onChange={setFilterShowtimeDate}
                      label=""
                      placeholder="All Dates"
                      className="w-36"
                    />
                    {filterShowtimeDate && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterShowtimeDate('');
                          fetchShowtimes({ showDate: '', page: 1 });
                        }}
                        className="text-[11px] text-[#8a765d] hover:text-[#f3cb62] underline cursor-pointer"
                        title="Clear date filter"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#ab9a84] font-semibold">Filter Movie:</span>
                    <select
                      value={filterShowtimeMovie}
                      onChange={(e) => {
                        const sync = onMovieFilterChange(e.target.value);
                        setFilterShowtimeMovie(sync.movieFilter);
                        setShowtimeSearchText(sync.searchText);
                      }}
                      className="bg-[#120d09] border border-[#3d2f1d] rounded-lg px-3 py-1.5 text-xs text-[#f5ece0]"
                    >
                      <option value="">All Movies</option>
                      {moviesList.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#ab9a84] font-semibold">Filter Hall:</span>
                    <select
                      value={filterShowtimeRoom}
                      onChange={(e) => setFilterShowtimeRoom(e.target.value)}
                      className="bg-[#120d09] border border-[#3d2f1d] rounded-lg px-3 py-1.5 text-xs text-[#f5ece0]"
                    >
                      <option value="">All Rooms</option>
                      {roomsList.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative flex-1 min-w-[200px]">
                    <input
                      type="text"
                      placeholder="Search showtime by movie, cinema, hall..."
                      value={showtimeSearchText}
                      onChange={(e) => {
                        const sync = onSearchTextChange(e.target.value, filterShowtimeMovie);
                        setShowtimeSearchText(sync.searchText);
                        if (sync.movieFilter !== filterShowtimeMovie) {
                          setFilterShowtimeMovie(sync.movieFilter);
                          fetchShowtimes({ movieId: undefined, page: 1 });
                        }
                      }}
                      className="w-full bg-[#120d09] border border-[#3d3020] rounded-lg pl-8 pr-8 py-1.5 text-xs text-[#f5ece0] placeholder-[#5c4a35] focus:outline-none focus:border-[#e0b354] transition-colors"
                    />
                    <Search className="w-3.5 h-3.5 text-[#8a765d] absolute left-2.5 top-2.5" />
                    {showtimeSearchText && (
                      <button
                        type="button"
                        onClick={() => setShowtimeSearchText('')}
                        className="absolute right-2.5 top-2.5 text-[#8a765d] hover:text-[#f3cb62] cursor-pointer"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => fetchShowtimes({ page: 1 })}
                    disabled={loadingShowtimes}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-b from-[#f3cb62] to-[#dda938] text-[#1a1209] text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>Apply Filter</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fetchShowtimes({ page: 1 })}
                    disabled={loadingShowtimes}
                    className="px-3.5 py-1.5 rounded-lg bg-[#241a10] border border-[#3d2f1d] text-xs font-semibold text-[#e6c27a] flex items-center gap-1.5 cursor-pointer shrink-0 hover:border-[#e0b354]"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingShowtimes ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {/* Showtimes Table */}
                <div className="bg-[#140f0a] border border-[#2e2316] rounded-xl overflow-hidden">
                  {loadingShowtimes ? (
                    <div className="p-12 text-center text-[#ab9a84] flex items-center justify-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-[#e0b354]" />
                      <span>Loading scheduled screenings...</span>
                    </div>
                  ) : filteredShowtimes.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                      {filterShowtimeMovieStatus === 'ENDED' ? (
                        <div className="max-w-md mx-auto space-y-2">
                          <div className="text-sm font-bold text-[#e6c27a]">
                            No Showtimes for Ended Movies
                          </div>
                          <p className="text-xs text-[#8a765d] leading-relaxed">
                            Titles with status <strong className="text-[#c7b59d]">ENDED</strong> have completed their theatrical run and license window. Ended movies cannot have active or future showtimes scheduled.
                          </p>
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => setActiveTab('MOVIES')}
                              className="px-3 py-1.5 rounded-lg bg-[#241a10] border border-[#4d3c26] text-xs font-semibold text-[#f3cb62] hover:border-[#e0b354] transition-colors cursor-pointer"
                            >
                              View Ended Catalog in Movie Tab &rarr;
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[#6e5d49]">
                          No scheduled showtimes found for the selected criteria.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#1c140c] text-[#ab9a84] uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="py-3 px-4">Movie</th>
                            <th className="py-3 px-4">Hall / Cinema</th>
                            <th className="py-3 px-4">Format</th>
                            <th className="py-3 px-4">Screening Window</th>
                            <th className="py-3 px-4">Cleaning End</th>
                            <th className="py-3 px-4">Ticket Price</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#241a10]">
                          {filteredShowtimes.map((st) => {
                            const phase = getScreeningPhase(st);
                            const movieStatus = st.movieStatus || movieMap.get(st.movieId)?.status;

                            return (
                              <tr key={st.id} className="hover:bg-[#1f1710]/50 transition-colors">
                                <td className="py-3 px-4">
                                  <div className="font-bold text-[#f5ece0]">{st.movieTitle}</div>
                                  <div className="text-[10px] text-[#8a765d] flex items-center gap-1.5 mt-0.5">
                                    <span>ID #{st.movieId || st.id}</span>
                                    <span>•</span>
                                    <span className="text-[#c7b59d]">
                                      Film: {movieStatus === 'NOW_SHOWING' ? 'Now Showing' : movieStatus === 'COMING_SOON' ? 'Coming Soon' : 'Ended'}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-[#ab9a84]">
                                  <div className="font-semibold text-[#e6c27a]">{st.roomName}</div>
                                  <div className="text-[10px] text-[#8a765d]">{st.cinemaName}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="px-2 py-0.5 rounded bg-[#241a10] border border-[#4d3c26] text-[#f3cb62] font-mono text-[10px] font-bold">
                                    {st.format} • {st.translationType}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-[#f5ece0]">
                                  <div className="font-mono text-emerald-400">
                                    {formatDateTime(st.startTime)}
                                  </div>
                                  <div className="text-[10px] text-[#8a765d]">
                                    Ends: {formatDateTime(st.endTime)}
                                  </div>
                                  <div className="mt-1">
                                    {phase === 'CANCELLED' ? (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-950/80 text-red-400 border border-red-800">
                                        CANCELLED
                                      </span>
                                    ) : phase === 'COMPLETED' ? (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-800/80 text-zinc-400 border border-zinc-700">
                                        COMPLETED
                                      </span>
                                    ) : phase === 'LIVE NOW' ? (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-950/90 text-blue-300 border border-blue-700 animate-pulse">
                                        LIVE NOW
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700">
                                        UPCOMING
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 font-mono text-[#c7b59d]">
                                  {formatDateTime(st.cleaningEndTime)}
                                </td>
                                <td className="py-3 px-4 font-mono font-bold text-[#f3cb62]">
                                  {formatCurrency(st.basePrice)}
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      st.status === 'SCHEDULED'
                                        ? 'bg-emerald-950 border border-emerald-700 text-emerald-300'
                                        : 'bg-red-950 border border-red-800 text-red-400'
                                    }`}
                                  >
                                    {st.status}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  {st.status === 'SCHEDULED' && (
                                    <button
                                      type="button"
                                      onClick={() => handleCancelShowtime(st.id)}
                                      className="p-1.5 rounded bg-[#241a10] border border-red-800/80 text-red-400 hover:bg-red-950/60 cursor-pointer"
                                      title="Cancel Showtime"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {showtimeTotalPages > 1 && (
                    <div className="p-3 bg-[#18120c] border-t border-[#2e2316] flex items-center justify-between text-xs text-[#ab9a84]">
                      <span>Page {showtimePage} of {showtimeTotalPages}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={showtimePage <= 1 || loadingShowtimes}
                          onClick={() => {
                            const next = showtimePage - 1;
                            setShowtimePage(next);
                            fetchShowtimes({ page: next });
                          }}
                          className="px-3 py-1 rounded bg-[#241a10] border border-[#3d2f1d] disabled:opacity-40 cursor-pointer"
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          disabled={showtimePage >= showtimeTotalPages || loadingShowtimes}
                          onClick={() => {
                            const next = showtimePage + 1;
                            setShowtimePage(next);
                            fetchShowtimes({ page: next });
                          }}
                          className="px-3 py-1 rounded bg-[#241a10] border border-[#3d2f1d] disabled:opacity-40 cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: PAYMENTS & REFUNDS (FR-PAY-02) */}
            {activeTab === 'PAYMENTS' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-body font-bold text-lg text-[#f7efe4] flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-[#e0b354]" />
                      <span>Payment Transactions &amp; Refund Settlement (FR-PAY-02)</span>
                    </h2>
                    <p className="text-xs text-[#ab9a84]">
                      Audit all payment attempts and settle transactions marked as REFUND_REQUIRED.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchPayments}
                    className="px-3.5 py-1.5 rounded-lg bg-[#241a10] border border-[#3d2f1d] text-xs font-semibold text-[#e6c27a] flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingPayments ? 'animate-spin' : ''}`} />
                    <span>Refresh Ledger</span>
                  </button>
                </div>

                {/* Filters */}
                <div className="bg-[#140f0a] border border-[#2e2316] rounded-xl p-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#ab9a84] font-semibold">Payment Status:</span>
                    <select
                      value={paymentFilterStatus}
                      onChange={(e) => setPaymentFilterStatus(e.target.value)}
                      className="bg-[#120d09] border border-[#3d2f1d] rounded-lg px-3 py-1.5 text-xs text-[#f5ece0]"
                    >
                      <option value="">All Statuses</option>
                      <option value="PENDING">PENDING</option>
                      <option value="SUCCESS">SUCCESS</option>
                      <option value="FAILED">FAILED</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#ab9a84] font-semibold">Refund Status:</span>
                    <select
                      value={paymentRefundFilter}
                      onChange={(e) => setPaymentRefundFilter(e.target.value)}
                      className="bg-[#120d09] border border-[#3d2f1d] rounded-lg px-3 py-1.5 text-xs text-[#f5ece0]"
                    >
                      <option value="">All Refunds</option>
                      <option value="NONE">NONE</option>
                      <option value="REFUND_REQUIRED">REFUND_REQUIRED</option>
                      <option value="REFUNDED">REFUNDED</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => fetchPayments()}
                    disabled={loadingPayments}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-b from-[#f3cb62] to-[#dda938] text-[#1a1209] text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>Apply Filter</span>
                  </button>
                </div>

                {/* Payments Table */}
                <div className="bg-[#140f0a] border border-[#2e2316] rounded-xl overflow-hidden">
                  {loadingPayments ? (
                    <div className="p-12 text-center text-[#ab9a84] flex items-center justify-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-[#e0b354]" />
                      <span>Loading payment ledger...</span>
                    </div>
                  ) : payments.length === 0 ? (
                    <div className="p-12 text-center text-[#6e5d49]">
                      No payment transactions match the active criteria.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#1c140c] text-[#ab9a84] uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="py-3 px-4">ID</th>
                            <th className="py-3 px-4">Booking Ref</th>
                            <th className="py-3 px-4">VNPay Txn Ref</th>
                            <th className="py-3 px-4">Amount</th>
                            <th className="py-3 px-4">Payment Status</th>
                            <th className="py-3 px-4">Refund Status</th>
                            <th className="py-3 px-4">Paid At</th>
                            <th className="py-3 px-4 text-right">Settlement Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#241a10]">
                          {payments.map((p) => {
                            const isRefundNeeded = p.refundStatus === 'REFUND_REQUIRED';
                            return (
                              <tr
                                key={p.id}
                                className={`hover:bg-[#1f1710]/50 transition-colors ${
                                  isRefundNeeded ? 'bg-amber-950/20' : ''
                                }`}
                              >
                                <td className="py-3 px-4 font-mono text-[#8a765d]">#{p.id}</td>
                                <td className="py-3 px-4 font-bold text-[#f5ece0]">
                                  Booking #{p.bookingId}
                                </td>
                                <td className="py-3 px-4 font-mono text-[11px] text-[#ab9a84]">
                                  {p.transactionRef}
                                </td>
                                <td className="py-3 px-4 font-mono font-bold text-[#f3cb62]">
                                  {formatCurrency(p.amount)}
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      p.status === 'SUCCESS'
                                        ? 'bg-emerald-950 border border-emerald-700 text-emerald-300'
                                        : p.status === 'FAILED'
                                        ? 'bg-red-950 border border-red-800 text-red-300'
                                        : 'bg-zinc-900 border border-zinc-700 text-zinc-400'
                                    }`}
                                  >
                                    {p.status}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      p.refundStatus === 'REFUND_REQUIRED'
                                        ? 'bg-amber-950 border border-amber-600 text-amber-300 animate-pulse'
                                        : p.refundStatus === 'REFUNDED'
                                        ? 'bg-blue-950 border border-blue-700 text-blue-300'
                                        : 'bg-zinc-900 border border-zinc-700 text-zinc-500'
                                    }`}
                                  >
                                    {p.refundStatus}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-mono text-[11px] text-[#ab9a84]">
                                  {p.payDate ? formatDateTime(p.payDate) : '-'}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  {isRefundNeeded ? (
                                    <button
                                      type="button"
                                      disabled={refundingId === p.id}
                                      onClick={() => handleConfirmRefund(p.id)}
                                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[11px] shadow-sm flex items-center gap-1.5 ml-auto cursor-pointer"
                                    >
                                      {refundingId === p.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Check className="w-3 h-3 stroke-[3]" />
                                      )}
                                      <span>Confirm Refund</span>
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-[#5e4e3d]">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: MOVIE CATALOG */}
            {activeTab === 'MOVIES' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="font-body font-bold text-lg text-[#f7efe4]">
                    Cinema Titles &amp; Catalog Management
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowAddMovieModal(true)}
                    className="px-4 py-2 rounded-lg bg-gradient-to-b from-[#f3cb62] to-[#dda938] text-[#1a1209] font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Publish Movie</span>
                  </button>
                </div>

                <div className="bg-[#140f0a] border border-[#2e2316] rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#1c140c] text-[#ab9a84] uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Title</th>
                          <th className="py-3 px-4">Director</th>
                          <th className="py-3 px-4">Duration</th>
                          <th className="py-3 px-4">Rating</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#241a10]">
                        {moviesList.map((m) => (
                          <tr key={m.id} className="hover:bg-[#1f1710]/50 transition-colors">
                            <td className="py-3 px-4 font-bold text-[#f5ece0]">
                              <div className="flex items-center gap-2">
                                <Film className="w-4 h-4 text-[#e0b354] shrink-0" />
                                <span>{m.title}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-[#ab9a84]">{m.director || '-'}</td>
                            <td className="py-3 px-4 font-mono text-[#c7b59d]">
                              {m.durationMinutes} min
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded bg-[#241a10] border border-[#4d3c26] text-[#e6c27a] font-mono text-[10px]">
                                {m.ageRating}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  m.status === 'NOW_SHOWING'
                                    ? 'bg-emerald-950 border border-emerald-700 text-emerald-300'
                                    : m.status === 'COMING_SOON'
                                    ? 'bg-amber-950 border border-amber-700 text-amber-300'
                                    : 'bg-rose-950 border border-rose-700 text-rose-300'
                                }`}
                              >
                                {m.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  to={`/movies/${m.id}`}
                                  className="px-2.5 py-1 rounded bg-[#241a10] border border-[#3d2f1d] text-xs font-semibold text-[#ab9a84] hover:text-[#f3cb62] inline-flex items-center gap-1"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View</span>
                                </Link>
                                {m.status !== 'ENDED' && (
                                  <button
                                    type="button"
                                    onClick={() => handleDiscontinueMovie(m.id, m.title)}
                                    className="px-2.5 py-1 rounded bg-red-950/40 border border-red-800/60 text-xs font-semibold text-red-300 hover:bg-red-900/60 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                    title="Ngừng chiếu phim (chuyển sang ENDED)"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                    <span>Ngừng chiếu</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: VOUCHERS */}
            {activeTab === 'VOUCHERS' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="font-body font-bold text-lg text-[#f7efe4]">
                    Promotional Campaigns &amp; Discount Vouchers
                  </h2>
                  <button
                    type="button"
                    onClick={() => { setVoucherError(''); setNewVoucher(getInitialVoucherState()); setShowAddVoucherModal(true); }}
                    className="px-4 py-2 rounded-lg bg-gradient-to-b from-[#f3cb62] to-[#dda938] text-[#1a1209] font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Voucher</span>
                  </button>
                </div>

                <div className="bg-[#140f0a] border border-[#2e2316] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#1c140c] text-[#ab9a84] uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Voucher Code</th>
                        <th className="py-3 px-4">Discount</th>
                        <th className="py-3 px-4">Min Order</th>
                        <th className="py-3 px-4">Quota (Used / Total)</th>
                        <th className="py-3 px-4">Active</th>
                        <th className="py-3 px-4 text-right">Toggle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#241a10]">
                      {vouchersList.map((v) => (
                        <tr key={v.id} className="hover:bg-[#1f1710]/50">
                          <td className="py-3 px-4 font-mono font-bold text-[#f3cb62]">{v.code}</td>
                          <td className="py-3 px-4 font-bold text-[#f5ece0]">
                            {v.discountType === 'PERCENTAGE'
                              ? `${v.discountValue}% OFF`
                              : formatCurrency(v.discountValue)}
                          </td>
                          <td className="py-3 px-4 text-[#ab9a84]">
                            {formatCurrency(v.minOrderValue)}
                          </td>
                          <td className="py-3 px-4 text-[#ab9a84]">
                            {v.usedCount || 0} / {v.usageLimit}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                v.isActive
                                  ? 'bg-emerald-950 border border-emerald-700 text-emerald-300'
                                  : 'bg-zinc-900 border border-zinc-700 text-zinc-400'
                              }`}
                            >
                              {v.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleVoucher(v.id, v.isActive)}
                              className="px-3 py-1 rounded bg-[#241a10] border border-[#4d3c26] text-xs font-semibold text-[#e6c27a] hover:border-[#e0b354] cursor-pointer"
                            >
                              {v.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 6: REVIEWS MODERATION */}
            {activeTab === 'REVIEWS' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-body font-bold text-lg text-[#f7efe4]">
                    Viewer Feedback &amp; Moderation
                  </h2>
                  <button
                    type="button"
                    onClick={fetchReviews}
                    className="px-3.5 py-1.5 rounded-lg bg-[#241a10] border border-[#3d2f1d] text-xs font-semibold text-[#e6c27a] flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {reviewsList.length === 0 ? (
                    <div className="p-12 text-center text-[#6e5d49] bg-[#140f0a] border border-[#2e2316] rounded-xl">
                      No reviews found to moderate.
                    </div>
                  ) : (
                    reviewsList.map((r) => (
                      <div
                        key={r.id}
                        className="bg-[#18120c] border border-[#362919] rounded-xl p-4 flex items-center justify-between gap-4"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#e6c27a]">
                              {r.userFullName}
                            </span>
                            <span className="text-[10px] text-[#8a765d]">•</span>
                            <span className="text-xs text-[#f3cb62] font-bold">
                              ★ {r.rating} / 5
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                r.status === 'VISIBLE' ? 'text-emerald-400' : 'text-red-400'
                              }`}
                            >
                              [{r.status}]
                            </span>
                          </div>
                          <p className="text-xs text-[#b8a690] leading-relaxed">{r.comment}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleReviewStatus(r.id, r.status)}
                          className="px-3 py-1.5 rounded-lg bg-[#241a10] border border-[#4d3c26] text-xs font-semibold text-[#e6c27a] cursor-pointer shrink-0"
                        >
                          {r.status === 'VISIBLE' ? 'Hide Review' : 'Approve Review'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* SCHEDULE SHOWTIME MODAL (FR-SHOW-01) */}
      {showAddShowtimeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#18120c] border border-[#4d3c26] rounded-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#2e2316] pb-3">
              <h2 className="font-body font-bold text-base text-[#f7efe4] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#e0b354]" />
                <span>Schedule New Showtime (FR-SHOW-01)</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowAddShowtimeModal(false)}
                className="text-[#ab9a84] hover:text-[#f3cb62]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {schedulingError && (
              <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{schedulingError}</span>
              </div>
            )}

            <form onSubmit={handleCreateShowtimeSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#ab9a84] mb-1 font-semibold">Select Movie</label>
                <select
                  required
                  value={newShowtime.movieId}
                  onChange={(e) => setNewShowtime({ ...newShowtime, movieId: e.target.value })}
                  className="w-full bg-[#120d09] border border-[#3d3020] rounded-lg p-2.5 text-[#f5ece0]"
                >
                  <option value="">-- Choose Movie --</option>
                  <optgroup label="Now Showing (Available)">
                    {moviesList.filter(m => m.status === 'NOW_SHOWING').map(m => (
                      <option key={m.id} value={m.id}>
                        {m.title} ({m.durationMinutes} mins)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Coming Soon">
                    {moviesList.filter(m => m.status === 'COMING_SOON').map(m => (
                      <option key={m.id} value={m.id}>
                        {m.title} ({m.durationMinutes} mins)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Ended (Unavailable)">
                    {moviesList.filter(m => m.status === 'ENDED').map(m => (
                      <option key={m.id} value={m.id} disabled className="text-zinc-600">
                        {m.title} ({m.durationMinutes} mins) — [ENDED: Unavailable]
                      </option>
                    ))}
                  </optgroup>
                </select>
                {newShowtime.movieId && (() => {
                  const sel = moviesList.find(m => String(m.id) === String(newShowtime.movieId));
                  if (!sel) return null;
                  return (
                    <div className="mt-1.5 p-2 rounded-lg bg-[#241a10] border border-[#3d2f1d] flex items-center justify-between text-[11px]">
                      <span className="text-[#f5ece0] font-semibold">{sel.title} ({sel.durationMinutes}m)</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sel.status === 'NOW_SHOWING'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : sel.status === 'COMING_SOON'
                          ? 'bg-amber-950 text-amber-300 border border-amber-700'
                          : 'bg-zinc-900 text-zinc-400 border border-zinc-700'
                      }`}>
                        {sel.status === 'NOW_SHOWING' ? 'Now Showing' : sel.status === 'COMING_SOON' ? 'Coming Soon' : 'Ended'}
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#ab9a84] mb-1 font-semibold">Cinema Location</label>
                  <select
                    value={selectedCinemaId}
                    onChange={(e) => handleCinemaChange(e.target.value)}
                    className="w-full bg-[#120d09] border border-[#3d3020] rounded-lg p-2.5 text-[#f5ece0]"
                  >
                    {cinemasList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#ab9a84] mb-1 font-semibold">Auditorium / Hall</label>
                  <select
                    required
                    value={newShowtime.roomId}
                    onChange={(e) => setNewShowtime({ ...newShowtime, roomId: e.target.value })}
                    className="w-full bg-[#120d09] border border-[#3d3020] rounded-lg p-2.5 text-[#f5ece0]"
                  >
                    <option value="">-- Choose Hall --</option>
                    {roomsList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.totalSeats} seats)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#ab9a84] mb-1 font-semibold">Format</label>
                  <select
                    value={newShowtime.format}
                    onChange={(e) => setNewShowtime({ ...newShowtime, format: e.target.value })}
                    className="w-full bg-[#120d09] border border-[#3d3020] rounded-lg p-2.5 text-[#f5ece0]"
                  >
                    <option value="2D">2D Digital</option>
                    <option value="3D">3D Digital</option>
                    <option value="IMAX">IMAX Experience</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#ab9a84] mb-1 font-semibold">Audio / Translation</label>
                  <select
                    value={newShowtime.translationType}
                    onChange={(e) =>
                      setNewShowtime({ ...newShowtime, translationType: e.target.value })
                    }
                    className="w-full bg-[#120d09] border border-[#3d3020] rounded-lg p-2.5 text-[#f5ece0]"
                  >
                    <option value="SUBTITLE">Subtitled (Vietsub)</option>
                    <option value="DUBBED">Dubbed (Long Tieng)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#ab9a84] mb-1 font-semibold">Start Date &amp; Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={newShowtime.startTime}
                    onChange={(e) => setNewShowtime({ ...newShowtime, startTime: e.target.value })}
                    className="w-full bg-[#120d09] border border-[#3d3020] rounded-lg p-2.5 text-[#f5ece0]"
                  />
                </div>

                <div>
                  <label className="block text-[#ab9a84] mb-1 font-semibold">Base Ticket Price (VND)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={newShowtime.basePrice}
                    onChange={(e) =>
                      setNewShowtime({ ...newShowtime, basePrice: Number(e.target.value) })
                    }
                    className="w-full bg-[#120d09] border border-[#3d3020] rounded-lg p-2.5 text-[#f5ece0]"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#140f0a] border border-[#3d2f1d] text-[11px] text-[#ab9a84] leading-relaxed">
                <span className="font-bold text-[#e6c27a]">Buffer Lock Rule:</span> The database automatically locks the room and computes <code className="text-[#f3cb62]">cleaning_end_time = end_time + 15m</code>. Overlapping schedules in the same hall will trigger a 409 Conflict rejection.
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddShowtimeModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#241a10] text-[#ab9a84]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-gradient-to-b from-[#f3cb62] to-[#dda938] text-[#1a1209] font-bold"
                >
                  Confirm &amp; Initialize Seats
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE MOVIE MODAL */}
      {showAddMovieModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#18120c] border border-[#4d3c26] rounded-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#2e2316] pb-3">
              <h2 className="font-body font-bold text-base text-[#f7efe4]">
                Publish New Title to Catalog
              </h2>
              <button
                type="button"
                onClick={() => setShowAddMovieModal(false)}
                className="text-[#ab9a84] hover:text-[#f3cb62]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMovieSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#ab9a84] mb-1 font-semibold">Title</label>
                <input
                  type="text"
                  required
                  value={newMovie.title}
                  onChange={(e) => setNewMovie({ ...newMovie, title: e.target.value })}
                  className="w-full bg-[#120d09] border border-[#3d3020] rounded-lg p-2.5 text-[#f5ece0]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#ab9a84] mb-1 font-semibold">Director</label>
                  <input
                    type="text"
                    value={newMovie.director}
                    onChange={(e) => setNewMovie({ ...newMovie, director: e.target.value })}
                    className="w-full bg-[#120d09] border border-[#3d3020] rounded-lg p-2.5 text-[#f5ece0]"
                  />
                </div>
                <div>
                  <label className="block text-[#ab9a84] mb-1 font-semibold">Duration (mins)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newMovie.durationMinutes}
                    onChange={(e) =>
                      setNewMovie({ ...newMovie, durationMinutes: Number(e.target.value) })
                    }
                    className="w-full bg-[#120d09] border border-[#3d3020] rounded-lg p-2.5 text-[#f5ece0]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#ab9a84] mb-1 font-semibold">Age Rating</label>
                  <select
                    value={newMovie.ageRating}
                    onChange={(e) => setNewMovie({ ...newMovie, ageRating: e.target.value })}
                    className="w-full bg-[#120d09] border border-[#3d3020] rounded-lg p-2.5 text-[#f5ece0]"
                  >
                    <option value="P">P (General)</option>
                    <option value="K">K (Kids under 13)</option>
                    <option value="T13">T13 (13+)</option>
                    <option value="T16">T16 (16+)</option>
                    <option value="T18">T18 (18+)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#ab9a84] mb-1 font-semibold">Status</label>
                  <select
                    value={newMovie.status}
                    onChange={(e) => setNewMovie({ ...newMovie, status: e.target.value })}
                    className="w-full bg-[#120d09] border border-[#3d3020] rounded-lg p-2.5 text-[#f5ece0]"
                  >
                    <option value="NOW_SHOWING">NOW_SHOWING</option>
                    <option value="COMING_SOON">COMING_SOON</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#ab9a84] mb-1 font-semibold">Poster Image URL</label>
                <input
                  type="url"
                  value={newMovie.posterUrl}
                  onChange={(e) => setNewMovie({ ...newMovie, posterUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-[#120d09] border border-[#3d3020] rounded-lg p-2.5 text-[#f5ece0]"
                />
              </div>

              <div>
                <label className="block text-[#ab9a84] mb-1 font-semibold">Synopsis</label>
                <textarea
                  rows={3}
                  value={newMovie.description}
                  onChange={(e) => setNewMovie({ ...newMovie, description: e.target.value })}
                  className="w-full bg-[#120d09] border border-[#3d3020] rounded-lg p-2.5 text-[#f5ece0]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddMovieModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#241a10] text-[#ab9a84]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-gradient-to-b from-[#f3cb62] to-[#dda938] text-[#1a1209] font-bold"
                >
                  Publish Title
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

            {/* CREATE VOUCHER MODAL */}
      {showAddVoucherModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#18120c] border border-[#4d3c26] rounded-2xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#2e2316] pb-3">
              <div>
                <h2 className="font-body font-bold text-lg text-[#f7efe4] flex items-center gap-2">
                  <Tag className="w-5 h-5 text-[#e0b354]" />
                  <span>Create Promotional Voucher</span>
                </h2>
                <p className="text-xs text-[#ab9a84] mt-0.5">
                  Choose between percentage-based or direct fixed deduction discounts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddVoucherModal(false)}
                className="text-[#ab9a84] hover:text-[#f3cb62] p-1 rounded-lg hover:bg-[#241a10] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVoucherSubmit} className="space-y-4 text-xs">
              {/* Discount Type Selector (Segmented buttons) */}
              <div>
                <label className="block text-xs font-bold text-[#ab9a84] uppercase tracking-wider mb-2">
                  Discount Mechanism
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setNewVoucher((prev) => ({
                        ...prev,
                        discountType: 'PERCENTAGE',
                        discountValue: prev.discountType === 'PERCENTAGE' ? prev.discountValue : 20,
                        maxDiscountAmount: 50000,
                      }))
                    }
                    className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                      newVoucher.discountType === 'PERCENTAGE'
                        ? 'border-[#e0b354] bg-[#241a10] shadow-[0_2px_15px_rgba(224,179,84,0.15)]'
                        : 'border-[#2e2316] bg-[#120d09] hover:border-[#4d3c26] text-[#8a765d]'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                        newVoucher.discountType === 'PERCENTAGE'
                          ? 'bg-[#e0b354] text-[#1a1209]'
                          : 'bg-[#1c140c] text-[#ab9a84]'
                      }`}
                    >
                      <Percent className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-body font-bold text-sm text-[#f5ece0]">
                        Percentage (%)
                      </div>
                      <div className="text-[11px] text-[#8a765d] mt-0.5">
                        e.g. 10%, 20%, 50% discount
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setNewVoucher((prev) => ({
                        ...prev,
                        discountType: 'FIXED_AMOUNT',
                        discountValue: prev.discountType === 'FIXED_AMOUNT' ? prev.discountValue : 30000,
                        maxDiscountAmount: 30000,
                      }))
                    }
                    className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                      newVoucher.discountType === 'FIXED_AMOUNT'
                        ? 'border-[#e0b354] bg-[#241a10] shadow-[0_2px_15px_rgba(224,179,84,0.15)]'
                        : 'border-[#2e2316] bg-[#120d09] hover:border-[#4d3c26] text-[#8a765d]'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                        newVoucher.discountType === 'FIXED_AMOUNT'
                          ? 'bg-[#e0b354] text-[#1a1209]'
                          : 'bg-[#1c140c] text-[#ab9a84]'
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-body font-bold text-sm text-[#f5ece0]">
                        Fixed Amount (VND)
                      </div>
                      <div className="text-[11px] text-[#8a765d] mt-0.5">
                        e.g. 30,000 VND direct cut
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Voucher Code */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#ab9a84]">
                    Voucher Code <span className="text-amber-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => generateRandomVoucherCode(newVoucher.discountType)}
                    className="text-[11px] text-[#e0b354] hover:text-[#f7d576] flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Random Code</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. SUMMER2026, FLASH50K"
                  value={newVoucher.code}
                  onChange={(e) =>
                    setNewVoucher({ ...newVoucher, code: e.target.value.toUpperCase() })
                  }
                  className="w-full bg-[#120d09] border border-[#3d3020] rounded-xl px-3.5 py-2.5 text-[#f5ece0] uppercase font-mono font-bold tracking-wider placeholder-[#5c4a35] focus:border-[#e0b354] focus:outline-none transition-colors"
                />
              </div>

              {/* Discount Value & Max Discount Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#ab9a84] mb-1.5">
                    {newVoucher.discountType === 'PERCENTAGE'
                      ? 'Discount Rate (%)'
                      : 'Direct Discount Amount (VND)'}{' '}
                    <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={newVoucher.discountType === 'PERCENTAGE' ? 1 : 1000}
                      max={newVoucher.discountType === 'PERCENTAGE' ? 100 : 10000000}
                      step="any"
                      value={newVoucher.discountValue ?? ''}
                      onChange={(e) =>
                        setNewVoucher({
                          ...newVoucher,
                          discountValue: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                      className="w-full bg-[#120d09] border border-[#3d3020] rounded-xl px-3.5 py-2.5 text-[#f5ece0] font-mono pr-12 focus:border-[#e0b354] focus:outline-none"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs font-mono font-bold text-[#e0b354]">
                      {newVoucher.discountType === 'PERCENTAGE' ? '%' : 'VND'}
                    </span>
                  </div>
                </div>

                {newVoucher.discountType === 'PERCENTAGE' ? (
                  <div>
                    <label className="block text-xs font-semibold text-[#ab9a84] mb-1.5">
                      Max Discount Cap (VND)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        placeholder="e.g. 50000"
                        value={newVoucher.maxDiscountAmount || ''}
                        onChange={(e) =>
                          setNewVoucher({
                            ...newVoucher,
                            maxDiscountAmount: e.target.value === '' ? '' : Number(e.target.value),
                          })
                        }
                        className="w-full bg-[#120d09] border border-[#3d3020] rounded-xl px-3.5 py-2.5 text-[#f5ece0] font-mono pr-12 focus:border-[#e0b354] focus:outline-none"
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs font-mono font-bold text-[#8a765d]">
                        VND
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-[#ab9a84] mb-1.5">
                      Minimum Order Value (VND) <span className="text-amber-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        min={0}
                        step="any"
                        value={newVoucher.minOrderValue ?? ''}
                        onChange={(e) =>
                          setNewVoucher({
                            ...newVoucher,
                            minOrderValue: e.target.value === '' ? '' : Number(e.target.value),
                          })
                        }
                        className="w-full bg-[#120d09] border border-[#3d3020] rounded-xl px-3.5 py-2.5 text-[#f5ece0] font-mono pr-12 focus:border-[#e0b354] focus:outline-none"
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs font-mono font-bold text-[#8a765d]">
                        VND
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* If percentage, show Min Order Value in separate row */}
              {newVoucher.discountType === 'PERCENTAGE' && (
                <div>
                  <label className="block text-xs font-semibold text-[#ab9a84] mb-1.5">
                    Minimum Order Value (VND) <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={0}
                      step="any"
                      value={newVoucher.minOrderValue ?? ''}
                      onChange={(e) =>
                        setNewVoucher({
                          ...newVoucher,
                          minOrderValue: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                      className="w-full bg-[#120d09] border border-[#3d3020] rounded-xl px-3.5 py-2.5 text-[#f5ece0] font-mono pr-12 focus:border-[#e0b354] focus:outline-none"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs font-mono font-bold text-[#8a765d]">
                      VND
                    </span>
                  </div>
                </div>
              )}

              {/* Usage Limits */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#ab9a84] mb-1.5">
                    Total Campaign Usage Limit <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    step={1}
                    value={newVoucher.usageLimit ?? ''}
                    onChange={(e) =>
                      setNewVoucher({
                        ...newVoucher,
                        usageLimit: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#120d09] border border-[#3d3020] rounded-xl px-3.5 py-2.5 text-[#f5ece0] font-mono focus:border-[#e0b354] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#ab9a84] mb-1.5">
                    Per-Customer Limit <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    step={1}
                    value={newVoucher.perUserLimit ?? ''}
                    onChange={(e) =>
                      setNewVoucher({
                        ...newVoucher,
                        perUserLimit: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#120d09] border border-[#3d3020] rounded-xl px-3.5 py-2.5 text-[#f5ece0] font-mono focus:border-[#e0b354] focus:outline-none"
                  />
                </div>
              </div>

              {/* Validity Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#ab9a84] mb-1.5">
                    Valid From (Start Date &amp; Time) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newVoucher.startAt}
                    onChange={(e) => setNewVoucher({ ...newVoucher, startAt: e.target.value })}
                    className="w-full bg-[#120d09] border border-[#3d3020] rounded-xl px-3.5 py-2.5 text-[#f5ece0] focus:border-[#e0b354] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#ab9a84] mb-1.5">
                    Valid Until (Expiration Date) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={typeof newVoucher.endAt === 'string' ? newVoucher.endAt : ''}
                    onChange={(e) => setNewVoucher({ ...newVoucher, endAt: e.target.value })}
                    className="w-full bg-[#120d09] border border-[#3d3020] rounded-xl px-3.5 py-2.5 text-[#f5ece0] focus:border-[#e0b354] focus:outline-none"
                  />
                </div>
              </div>

              {/* Live Preview Banner */}
              <div className="p-3.5 rounded-xl bg-[#140e08] border border-[#3d2f1d] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#241a10] border border-[#e0b354] flex items-center justify-center text-[#f3cb62] font-black text-sm">
                    {newVoucher.discountType === 'PERCENTAGE'
                      ? `${newVoucher.discountValue || 0}%`
                      : '₫'}
                  </div>
                  <div>
                    <div className="font-mono font-bold text-sm text-[#f3cb62]">
                      {newVoucher.code || 'YOUR_CODE'}
                    </div>
                    <div className="text-[11px] text-[#ab9a84]">
                      {newVoucher.discountType === 'PERCENTAGE'
                        ? `${newVoucher.discountValue || 0}% OFF (Capped at ${formatCurrency(newVoucher.maxDiscountAmount || 0)})`
                        : `${formatCurrency(newVoucher.discountValue || 0)} OFF direct deduction`}
                      {' • '}Min order: {formatCurrency(newVoucher.minOrderValue || 0)}
                    </div>
                  </div>
                </div>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 border border-amber-700 text-amber-300">
                  Preview
                </span>
              </div>

              {/* Error Notice */}
              {voucherError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-200 flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{voucherError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddVoucherModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#241a10] border border-[#3d2f1d] text-[#ab9a84] hover:text-[#f7efe4] font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={voucherSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-b from-[#f3cb62] to-[#dda938] hover:from-[#f7d576] hover:to-[#e5b344] text-[#1a1209] font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {voucherSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Activating Campaign...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Activate Campaign</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}