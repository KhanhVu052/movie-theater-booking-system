import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Play,
  Ticket,
  Clock,
  Calendar,
  Star,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  X,
  Film,
  MapPin,
  Globe,
  ShieldCheck,
  CreditCard,
  Loader2,
  AlertCircle,
  Tag,
} from 'lucide-react';
import Navbar, { CinemaBadgeIcon } from '../components/Navbar';
import { movieApi } from '../api/movieApi';

// Chuẩn hóa và bóc tách dữ liệu từ cấu trúc ApiResponse<T> hoặc PageResponse<T> của Backend
const extractPayload = (response) => {
  const raw = response?.data?.data ?? response?.data;
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.items)) return raw.items; // PageResponse DTO
  if (raw && Array.isArray(raw.content)) return raw.content; // Spring Data Page
  return [];
};

// Chuẩn hóa chuỗi hiển thị thể loại
const formatGenreText = (movie) => {
  if (!movie) return '';
  if (typeof movie.genre === 'string' && movie.genre) return movie.genre;
  if (Array.isArray(movie.genres)) {
    return movie.genres
      .map((g) => (typeof g === 'string' ? g : g?.name))
      .filter(Boolean)
      .join(', ');
  }
  return '';
};

// Chuẩn hóa chuỗi hiển thị diễn viên (ngăn lỗi crash React khi actors là mảng đối tượng ActorResponse)
const formatActorText = (movie) => {
  if (!movie) return '';
  if (typeof movie.actors === 'string') return movie.actors;
  if (Array.isArray(movie.actors)) {
    return movie.actors
      .map((a) => (typeof a === 'string' ? a : a?.name))
      .filter(Boolean)
      .join(', ');
  }
  return '';
};

// Chuẩn hóa ngày phát hành (YYYY-MM-DD -> DD/MM/YYYY)
const formatReleaseDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

// Format giờ chiếu từ chuỗi ISO startTime
const formatShowtimeHour = (isoString) => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return isoString;
  }
};

// Chuyển đổi URL Youtube thường sang URL Embed cho Iframe Modal
const getEmbedTrailerUrl = (url) => {
  if (!url) return '';
  if (url.includes('youtube.com/embed/')) return url;
  const ytMatch = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})/
  );
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
  }
  return url;
};

export default function Home() {
  const navigate = useNavigate();
  const { id: paramMovieId } = useParams();

  // Data States kết nối với Backend
  const [movies, setMovies] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [availableShowtimes, setAvailableShowtimes] = useState([]);

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [loadingShowtimes, setLoadingShowtimes] = useState(false);
  const [error, setError] = useState('');

  // UI Filter States
  const [activeTab, setActiveTab] = useState('NOW_SHOWING');
  const [selectedGenre, setSelectedGenre] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [heroIndex, setHeroIndex] = useState(0);

  // Quick Booking Bar States
  const [quickMovieId, setQuickMovieId] = useState('');
  const [quickCinemaId, setQuickCinemaId] = useState('');
  const [quickDate, setQuickDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [selectedShowtimeId, setSelectedShowtimeId] = useState('');

  // Modals & Copy
  const [trailerModal, setTrailerModal] = useState(null);
  const [copiedCode, setCopiedCode] = useState('');

  // 1. Tải danh sách Movies, Cinemas, Vouchers từ Backend
  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      setLoading(true);
      setError('');
      try {
        const [moviesRes, cinemasRes, vouchersRes] = await Promise.allSettled([
          movieApi.getAllMovies(),
          movieApi.getAllCinemas(),
          movieApi.getActiveVouchers(),
        ]);

        if (!isMounted) return;

        if (moviesRes.status === 'fulfilled') {
          const movieList = extractPayload(moviesRes.value);
          setMovies(movieList);

          // Nếu có paramMovieId trên URL, ưu tiên chọn phim đó
          if (paramMovieId) {
            setQuickMovieId(String(paramMovieId));
          } else {
            const firstNowShowing = movieList.find(
              (m) => m.status === 'NOW_SHOWING'
            );
            if (firstNowShowing) {
              setQuickMovieId(String(firstNowShowing.id));
            }
          }
        } else {
          setError('Không thể tải danh sách phim từ máy chủ.');
        }

        if (cinemasRes.status === 'fulfilled') {
          const cinemaList = extractPayload(cinemasRes.value);
          setCinemas(cinemaList);
          if (cinemaList.length > 0) {
            setQuickCinemaId(String(cinemaList[0].id));
          }
        }

        if (vouchersRes.status === 'fulfilled') {
          setVouchers(extractPayload(vouchersRes.value));
        }
      } catch {
        if (isMounted) {
          setError('Lỗi kết nối tới hệ thống máy chủ.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchInitialData();
    return () => {
      isMounted = false;
    };
  }, [paramMovieId]);

  // 2. Tự động truy vấn suất chiếu thực tế khi thay đổi Phim, Rạp hoặc Ngày chiếu
  useEffect(() => {
    if (!quickMovieId || !quickDate) {
      setAvailableShowtimes([]);
      setSelectedShowtimeId('');
      return;
    }

    let isMounted = true;
    const fetchShowtimes = async () => {
      setLoadingShowtimes(true);
      try {
        const res = await movieApi.getShowtimes({
          movieId: quickMovieId,
          showDate: quickDate,
        });

        if (!isMounted) return;
        const showtimeList = extractPayload(res);

        // Lọc theo cụm rạp nếu người dùng đã chọn cụm rạp
        const filtered = quickCinemaId
          ? showtimeList.filter(
              (st) => String(st.cinemaId) === String(quickCinemaId)
            )
          : showtimeList;

        setAvailableShowtimes(filtered);
        setSelectedShowtimeId(
          filtered.length > 0 ? String(filtered[0].id) : ''
        );
      } catch {
        if (isMounted) {
          setAvailableShowtimes([]);
          setSelectedShowtimeId('');
        }
      } finally {
        if (isMounted) {
          setLoadingShowtimes(false);
        }
      }
    };

    fetchShowtimes();
    return () => {
      isMounted = false;
    };
  }, [quickMovieId, quickCinemaId, quickDate]);

  // Danh sách phim đang chiếu cho Hero Spotlight
  const spotlightMovies = useMemo(
    () => movies.filter((m) => m.status === 'NOW_SHOWING').slice(0, 5),
    [movies]
  );

  const currentHero = spotlightMovies[heroIndex] || movies[0] || null;

  // Tự động chuyển Hero Spotlight sau 7.5 giây
  useEffect(() => {
    if (spotlightMovies.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % spotlightMovies.length);
    }, 7500);
    return () => clearInterval(timer);
  }, [spotlightMovies.length]);

  // Trích xuất danh sách thể loại từ dữ liệu thực tế
  const genres = useMemo(() => {
    const set = new Set(['ALL']);
    movies.forEach((m) => {
      if (typeof m.genre === 'string') {
        m.genre.split(',').forEach((g) => {
          if (g.trim()) set.add(g.trim());
        });
      } else if (Array.isArray(m.genres)) {
        m.genres.forEach((g) => {
          const name = typeof g === 'string' ? g : g?.name;
          if (name) set.add(name.trim());
        });
      }
    });
    return Array.from(set);
  }, [movies]);

  // Lọc danh sách phim theo Tab, Thể loại và Từ khóa tìm kiếm
  const filteredMovies = useMemo(() => {
    return movies.filter((movie) => {
      const matchesTab = movie.status === activeTab;
      const genreStr = formatGenreText(movie).toLowerCase();
      const matchesGenre =
        selectedGenre === 'ALL' ||
        genreStr.includes(selectedGenre.toLowerCase());

      const keyword = searchQuery.trim().toLowerCase();
      const actorStr = formatActorText(movie).toLowerCase();
      const matchesSearch =
        !keyword ||
        (movie.title && movie.title.toLowerCase().includes(keyword)) ||
        genreStr.includes(keyword) ||
        (movie.director && movie.director.toLowerCase().includes(keyword)) ||
        actorStr.includes(keyword);

      return matchesTab && matchesGenre && matchesSearch;
    });
  }, [movies, activeTab, selectedGenre, searchQuery]);

  // Xử lý chuyển hướng đặt vé
  const handleBookMovie = useCallback(
    (movieId) => {
      navigate(`/movies/${movieId}`);
    },
    [navigate]
  );

  const handleQuickBookSubmit = (e) => {
    e.preventDefault();
    if (selectedShowtimeId) {
      navigate(`/booking/${selectedShowtimeId}`);
    } else if (quickMovieId) {
      navigate(
        `/movies/${quickMovieId}?cinemaId=${quickCinemaId}&date=${quickDate}`
      );
    }
  };

  const handleCopyVoucher = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2200);
  };

  return (
    <div className="min-h-screen w-full bg-[#0e0a07] text-[#f2e8dc] font-body flex flex-col select-none">
      {/* 1. Header & Navigation */}
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* Trạng thái đang tải */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center py-32 gap-3.5">
          <Loader2 className="w-10 h-10 animate-spin text-[#e6c27a]" />
          <p className="text-sm font-medium text-[#ab9a84]">
            Đang tải dữ liệu phim và lịch chiếu từ GoToro Cinema...
          </p>
        </div>
      )}

      {/* Trạng thái lỗi máy chủ */}
      {!loading && error && (
        <div className="max-w-3xl mx-auto my-12 px-6 w-full">
          <div className="p-6 rounded-2xl bg-red-950/30 border border-red-800/60 flex items-start gap-4 text-red-200">
            <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-red-300">{error}</p>
              <p className="text-xs text-red-300/80 mt-1">
                Vui lòng kiểm tra lại dịch vụ Backend (cổng 8080) và tải lại trang.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Nội dung chính */}
      {!loading && !error && (
        <>
          {/* 2. HERO SPOTLIGHT BANNER */}
          {currentHero && (
            <section className="relative w-full min-h-[560px] lg:min-h-[640px] flex items-center border-b border-[#2e2316] overflow-hidden">
              <div className="absolute inset-0 z-0 pointer-events-none">
                <img
                  src={currentHero.posterUrl}
                  alt={currentHero.title}
                  className="w-full h-full object-cover object-center opacity-25 scale-105 transition-all duration-700"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(90deg, #0e0a07 0%, rgba(14,10,7,0.92) 48%, rgba(14,10,7,0.45) 100%)',
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(14,10,7,0.2) 0%, transparent 40%, #0e0a07 100%)',
                  }}
                />
              </div>

              <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-8 space-y-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-3 py-1 rounded-md bg-[#1f1912] border border-[#5e4727] text-xs font-bold text-[#e6c27a] tracking-wider uppercase flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Phim Nổi Bật
                    </span>
                    {currentHero.ageRating && (
                      <span className="px-2.5 py-1 rounded-md bg-[#e0b354] text-[#140e08] text-xs font-black tracking-wide">
                        {currentHero.ageRating}
                      </span>
                    )}
                  </div>

                  <h1 className="font-body font-extrabold text-4xl sm:text-5xl lg:text-6xl text-[#f7efe4] tracking-tight leading-[1.08]">
                    {currentHero.title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs sm:text-sm text-[#c7b59d]">
                    {(currentHero.durationMinutes || currentHero.duration) && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[#ab9a84]" />
                        {currentHero.durationMinutes || currentHero.duration} phút
                      </span>
                    )}
                    {(currentHero.originalLanguage || currentHero.language) && (
                      <span className="flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-[#ab9a84]" />
                        {currentHero.originalLanguage || currentHero.language}
                      </span>
                    )}
                    {formatGenreText(currentHero) && (
                      <span className="flex items-center gap-1.5">
                        <Film className="w-4 h-4 text-[#ab9a84]" />
                        {formatGenreText(currentHero)}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-[#a89680] space-y-1">
                    {currentHero.director && (
                      <p>
                        <strong className="text-[#d4c3ad]">Đạo diễn:</strong>{' '}
                        {currentHero.director}
                      </p>
                    )}
                    {formatActorText(currentHero) && (
                      <p className="line-clamp-1">
                        <strong className="text-[#d4c3ad]">Diễn viên:</strong>{' '}
                        {formatActorText(currentHero)}
                      </p>
                    )}
                  </div>

                  {currentHero.description && (
                    <p className="text-sm text-[#b8a690] max-w-2xl leading-relaxed line-clamp-3 pt-1">
                      {currentHero.description}
                    </p>
                  )}

                  <div className="pt-2 flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={() => handleBookMovie(currentHero.id)}
                      className="px-7 py-3.5 rounded-xl bg-gradient-to-b from-[#f3cb62] to-[#dda938] hover:from-[#f7d576] hover:to-[#e5b344] text-[#1a1209] font-body font-bold text-sm shadow-[0_6px_20px_rgba(221,169,56,0.3)] flex items-center gap-2.5 transition-all cursor-pointer active:scale-[0.99]"
                    >
                      <Ticket className="w-4 h-4" />
                      <span>Đặt Vé Ngay</span>
                    </button>

                    {currentHero.trailerUrl && (
                      <button
                        type="button"
                        onClick={() => setTrailerModal(currentHero)}
                        className="px-6 py-3.5 rounded-xl bg-[#1a140e]/90 hover:bg-[#261d14] border border-[#4d3c26] hover:border-[#e6c27a] text-[#f2e8dc] font-body font-semibold text-sm flex items-center gap-2.5 transition-all cursor-pointer"
                      >
                        <Play className="w-4 h-4 text-[#e6c27a] fill-[#e6c27a]" />
                        <span>Xem Trailer</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="hidden lg:flex lg:col-span-4 justify-end">
                  <div className="relative w-64 rounded-2xl overflow-hidden border-2 border-[#4d3c26] shadow-[0_24px_60px_rgba(0,0,0,0.9)] group">
                    <img
                      src={currentHero.posterUrl}
                      alt={currentHero.title}
                      className="w-full h-[360px] object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {currentHero.trailerUrl && (
                      <div className="absolute bottom-3 right-3">
                        <button
                          type="button"
                          onClick={() => setTrailerModal(currentHero)}
                          title="Xem Trailer"
                          className="w-11 h-11 rounded-full bg-[#120d09]/90 border border-[#e6c27a] flex items-center justify-center text-[#e6c27a] hover:scale-110 transition-transform cursor-pointer shadow-lg"
                        >
                          <Play className="w-5 h-5 fill-[#e6c27a] ml-0.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Slider Controls */}
              {spotlightMovies.length > 1 && (
                <div className="absolute bottom-5 right-6 lg:right-12 z-20 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setHeroIndex(
                        (prev) =>
                          (prev - 1 + spotlightMovies.length) %
                          spotlightMovies.length
                      )
                    }
                    title="Phim trước"
                    className="w-9 h-9 rounded-lg bg-[#16110b]/90 border border-[#3d2f1d] hover:border-[#e6c27a] flex items-center justify-center text-[#d4c3ad] hover:text-[#e6c27a] transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1.5 px-2">
                    {spotlightMovies.map((item, idx) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setHeroIndex(idx)}
                        aria-label={`Đi tới phim ${idx + 1}`}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          idx === heroIndex
                            ? 'w-6 bg-[#e6c27a]'
                            : 'w-2 bg-[#4d3c26]'
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setHeroIndex((prev) => (prev + 1) % spotlightMovies.length)
                    }
                    title="Phim tiếp theo"
                    className="w-9 h-9 rounded-lg bg-[#16110b]/90 border border-[#3d2f1d] hover:border-[#e6c27a] flex items-center justify-center text-[#d4c3ad] hover:text-[#e6c27a] transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </section>
          )}

          {/* 3. THANH ĐẶT VÉ NHANH */}
          <section
            id="quick-booking"
            className="w-full max-w-7xl mx-auto px-6 lg:px-12 -mt-7 relative z-20"
          >
            <form
              onSubmit={handleQuickBookSubmit}
              className="bg-[#1a140e] border border-[#4d3c26] rounded-2xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.85)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end"
            >
              {/* Chọn Phim */}
              <div className="lg:col-span-3">
                <label className="block text-xs font-semibold tracking-wider text-[#b89d72] mb-2 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5" />
                  Chọn Phim
                </label>
                <select
                  value={quickMovieId}
                  onChange={(e) => setQuickMovieId(e.target.value)}
                  className="w-full bg-[#120d09] border border-[#3d3020] rounded-lg px-3.5 py-2.5 text-sm text-[#f5ece0] focus:outline-none focus:border-[#e0b354] transition-colors"
                >
                  <option value="">-- Chọn phim --</option>
                  {movies
                    .filter((m) => m.status === 'NOW_SHOWING')
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                </select>
              </div>

              {/* Chọn Cụm Rạp */}
              <div className="lg:col-span-3">
                <label className="block text-xs font-semibold tracking-wider text-[#b89d72] mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Cụm Rạp
                </label>
                <select
                  value={quickCinemaId}
                  onChange={(e) => setQuickCinemaId(e.target.value)}
                  className="w-full bg-[#120d09] border border-[#3d3020] rounded-lg px-3.5 py-2.5 text-sm text-[#f5ece0] focus:outline-none focus:border-[#e0b354] transition-colors"
                >
                  <option value="">-- Chọn rạp --</option>
                  {cinemas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ngày Chiếu */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold tracking-wider text-[#b89d72] mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Ngày Chiếu
                </label>
                <input
                  type="date"
                  value={quickDate}
                  onChange={(e) => setQuickDate(e.target.value)}
                  className="w-full bg-[#120d09] border border-[#3d3020] rounded-lg px-3.5 py-2.5 text-sm text-[#f5ece0] focus:outline-none focus:border-[#e0b354] transition-colors"
                />
              </div>

              {/* Suất Chiếu từ Backend */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold tracking-wider text-[#b89d72] mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Suất Chiếu
                </label>
                <select
                  value={selectedShowtimeId}
                  onChange={(e) => setSelectedShowtimeId(e.target.value)}
                  disabled={loadingShowtimes || availableShowtimes.length === 0}
                  className="w-full bg-[#120d09] border border-[#3d3020] rounded-lg px-3.5 py-2.5 text-sm text-[#f5ece0] focus:outline-none focus:border-[#e0b354] disabled:opacity-50 transition-colors"
                >
                  {loadingShowtimes ? (
                    <option value="">Đang tải suất chiếu...</option>
                  ) : availableShowtimes.length === 0 ? (
                    <option value="">Không có suất chiếu</option>
                  ) : (
                    availableShowtimes.map((st) => (
                      <option key={st.id} value={st.id}>
                        {formatShowtimeHour(st.startTime)} {st.roomName ? `• ${st.roomName}` : ''} {st.format ? `(${st.format})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Nút Đặt Vé */}
              <div className="lg:col-span-2">
                <button
                  type="submit"
                  disabled={!quickMovieId}
                  className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-b from-[#f3cb62] to-[#dda938] hover:from-[#f7d576] hover:to-[#e5b344] text-[#1a1209] font-body font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                >
                  <Ticket className="w-4 h-4" />
                  <span>Giữ Ghế Ngay</span>
                </button>
              </div>
            </form>
          </section>

          {/* 4. DANH SÁCH PHIM */}
          <section
            id="movies-section"
            className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-16 flex-1"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#2e2316] pb-6 mb-8">
              <div>
                <h2 className="font-body font-bold text-2xl sm:text-3xl text-[#f7efe4] tracking-tight">
                  Lịch Phim Chiếu Rạp
                </h2>
                <p className="text-sm text-[#9c8b75] mt-1">
                  Cập nhật lịch chiếu theo thời gian thực tại toàn bộ hệ thống GoToro.
                </p>
              </div>

              <div className="inline-flex bg-[#15100b] border border-[#3d2f1d] p-1 rounded-xl self-start">
                <button
                  type="button"
                  onClick={() => setActiveTab('NOW_SHOWING')}
                  className={`px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    activeTab === 'NOW_SHOWING'
                      ? 'bg-gradient-to-b from-[#f3cb62] to-[#dda938] text-[#1a1209] shadow-sm'
                      : 'text-[#ab9a84] hover:text-[#f2e8dc]'
                  }`}
                >
                  Phim Đang Chiếu (
                  {movies.filter((m) => m.status === 'NOW_SHOWING').length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('COMING_SOON')}
                  className={`px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    activeTab === 'COMING_SOON'
                      ? 'bg-gradient-to-b from-[#f3cb62] to-[#dda938] text-[#1a1209] shadow-sm'
                      : 'text-[#ab9a84] hover:text-[#f2e8dc]'
                  }`}
                >
                  Phim Sắp Chiếu (
                  {movies.filter((m) => m.status === 'COMING_SOON').length})
                </button>
              </div>
            </div>

            {/* Thể loại */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
              {genres.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setSelectedGenre(genre)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all cursor-pointer ${
                    selectedGenre === genre
                      ? 'bg-[#2b2015] border-[#e0b354] text-[#f3cb62]'
                      : 'bg-[#140f0a] border-[#2e2316] text-[#9c8b75] hover:border-[#5e4727] hover:text-[#e6c27a]'
                  }`}
                >
                  {genre === 'ALL' ? 'Tất cả thể loại' : genre}
                </button>
              ))}
            </div>

            {/* Grid danh sách phim */}
            {filteredMovies.length === 0 ? (
              <div className="bg-[#15100b] border border-[#2e2316] rounded-2xl p-12 text-center">
                <Film className="w-10 h-10 text-[#8a765d] mx-auto mb-3" />
                <p className="text-base font-semibold text-[#e6c27a]">
                  Không tìm thấy bộ phim nào phù hợp với điều kiện tìm kiếm
                </p>
                <p className="text-xs text-[#9c8b75] mt-1.5">
                  Vui lòng thử tìm với từ khóa khác hoặc chọn lại thể loại phim.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredMovies.map((movie) => (
                  <div
                    key={movie.id}
                    className="bg-[#18120c] border border-[#362919] hover:border-[#6e522b] rounded-xl overflow-hidden flex flex-col justify-between transition-all duration-300 shadow-[0_12px_30px_rgba(0,0,0,0.65)] group"
                  >
                    <div>
                      <div className="relative h-80 w-full overflow-hidden bg-[#100c08]">
                        <img
                          src={movie.posterUrl}
                          alt={movie.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#18120c] via-transparent to-black/30 pointer-events-none" />

                        <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
                          {movie.ageRating && (
                            <span className="px-2 py-0.5 rounded bg-[#e0b354] text-[#140e08] text-[11px] font-black">
                              {movie.ageRating}
                            </span>
                          )}
                        </div>

                        {movie.trailerUrl && (
                          <button
                            type="button"
                            onClick={() => setTrailerModal(movie)}
                            title={`Xem Trailer ${movie.title}`}
                            className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                          >
                            <div className="w-12 h-12 rounded-full bg-[#1a130d]/95 border border-[#e6c27a] flex items-center justify-center text-[#e6c27a] shadow-lg transform group-hover:scale-110 transition-transform">
                              <Play className="w-5 h-5 fill-[#e6c27a] ml-0.5" />
                            </div>
                          </button>
                        )}
                      </div>

                      <div className="p-5">
                        <h3 className="font-body font-bold text-lg text-[#f7efe4] group-hover:text-[#f3cb62] transition-colors line-clamp-1">
                          {movie.title}
                        </h3>
                        <p className="text-xs text-[#e0b354] font-medium mt-1 line-clamp-1">
                          {formatGenreText(movie)}
                        </p>

                        {formatActorText(movie) && (
                          <p className="text-[11px] text-[#9c8b75] mt-1.5 line-clamp-1">
                            <strong className="text-[#c7b59d]">Diễn viên:</strong>{' '}
                            {formatActorText(movie)}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-xs text-[#b8a690] mt-3 pt-3 border-t border-[#2b2015]">
                          {(movie.durationMinutes || movie.duration) && (
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-[#8a765d]" />
                              {movie.durationMinutes || movie.duration} phút
                            </span>
                          )}
                          {movie.releaseDate && (
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-[#8a765d]" />
                              {formatReleaseDate(movie.releaseDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="px-5 pb-5">
                      <button
                        type="button"
                        onClick={() => handleBookMovie(movie.id)}
                        className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-b from-[#f3cb62] to-[#dda938] hover:from-[#f7d576] hover:to-[#e5b344] text-[#1a1209] font-body font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
                      >
                        <Ticket className="w-4 h-4" />
                        <span>
                          {movie.status === 'NOW_SHOWING'
                            ? 'Mua Vé Ngay'
                            : 'Xem Chi Tiết'}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 5. VOUCHERS ƯU ĐÃI THÀNH VIÊN */}
          {vouchers.length > 0 && (
            <section
              id="vouchers-section"
              className="w-full bg-[#130e09] border-t border-b border-[#2e2316] py-16"
            >
              <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                  <div>
                    <h2 className="font-body font-bold text-2xl sm:text-3xl text-[#f7efe4]">
                      Mã Ưu Đãi Đặt Vé Trực Tuyến
                    </h2>
                    <p className="text-sm text-[#9c8b75] mt-1">
                      Áp dụng khi thanh toán đặt vé online qua ứng dụng hoặc website GoToro Cinema.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {vouchers.map((voucher) => (
                    <div
                      key={voucher.id || voucher.code}
                      className="bg-[#1b140e] border border-[#453522] rounded-xl p-5 flex flex-col justify-between shadow-[0_10px_25px_rgba(0,0,0,0.5)]"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="px-2.5 py-1 rounded bg-[#2b2014] border border-[#6e522b] text-xs font-extrabold text-[#f3cb62] flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5" />
                            {voucher.discountType === 'PERCENTAGE'
                              ? `GIẢM ${voucher.discountValue}%`
                              : `GIẢM ${Number(voucher.discountValue).toLocaleString('vi-VN')}đ`}
                          </span>
                          {(voucher.endAt || voucher.expirationDate) && (
                            <span className="text-[11px] text-[#8a765d]">
                              HSD:{' '}
                              {formatReleaseDate(
                                (voucher.endAt || voucher.expirationDate).split('T')[0]
                              )}
                            </span>
                          )}
                        </div>

                        <h3 className="font-body font-bold text-base text-[#f5ece0]">
                          {voucher.code}
                        </h3>

                        <div className="text-xs text-[#a89680] mt-2 space-y-1">
                          {voucher.minOrderValue > 0 && (
                            <p>
                              Đơn tối thiểu:{' '}
                              <strong className="text-[#d4c3ad]">
                                {Number(voucher.minOrderValue).toLocaleString('vi-VN')}đ
                              </strong>
                            </p>
                          )}
                          {voucher.maxDiscountAmount > 0 && (
                            <p>
                              Giảm tối đa:{' '}
                              <strong className="text-[#d4c3ad]">
                                {Number(voucher.maxDiscountAmount).toLocaleString('vi-VN')}đ
                              </strong>
                            </p>
                          )}
                          {voucher.remainingQuota != null && (
                            <p className="text-[#ab9a84]">
                              Còn lại:{' '}
                              <span className="text-[#f3cb62] font-semibold">
                                {voucher.remainingQuota}
                              </span>{' '}
                              lượt
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 pt-3.5 border-t border-dashed border-[#362919] flex items-center justify-between">
                        <code className="text-xs font-mono font-bold text-[#e6c27a] bg-[#120d09] px-3 py-1.5 rounded border border-[#362919]">
                          {voucher.code}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopyVoucher(voucher.code)}
                          className="px-3 py-1.5 rounded-lg bg-[#261d14] hover:bg-[#33271b] border border-[#4d3c26] text-xs font-semibold text-[#f2e8dc] flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {copiedCode === voucher.code ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-300">Đã sao chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-[#e6c27a]" />
                              <span>Sao chép</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* 6. FOOTER */}
      <footer className="w-full bg-[#0c0906] px-6 lg:px-12 py-10 text-xs text-[#8a765d] mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-[#241b12]">
          <div className="flex items-center gap-3">
            <CinemaBadgeIcon className="w-9 h-9" />
            <div>
              <span className="font-body font-bold text-lg text-[#e6c27a]">
                GoToro Cinema
              </span>
              <p className="text-xs text-[#75644f]">
                Hệ thống rạp chiếu phim hiện đại &bull; Đặt vé và giữ chỗ trực tuyến
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-[#ab9a84]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#e0b354]" />
              Khóa giữ ghế tức thì
            </span>
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-[#e0b354]" />
              Cổng thanh toán bảo mật VNPAY
            </span>
            <span className="flex items-center gap-1.5">
              <Ticket className="w-4 h-4 text-[#e0b354]" />
              Vé điện tử QR tại rạp
            </span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>&copy; 2026 GoToro Cinema. Toàn quyền bảo lưu.</span>
          <div className="flex items-center gap-6">
            <span>Hotline: 1900 6868</span>
            <span>Điều khoản sử dụng</span>
            <span>Chính sách bảo mật</span>
          </div>
        </div>
      </footer>

      {/* 7. MODAL TRAILER */}
      {trailerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-[#18120c] border border-[#4d3c26] rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 border-b border-[#362919] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-[#e6c27a]" />
                <span className="font-body font-bold text-sm text-[#f7efe4] truncate max-w-md">
                  {trailerModal.title} &mdash; Trailer
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTrailerModal(null)}
                title="Đóng trailer"
                className="text-[#ab9a84] hover:text-[#f3cb62] p-1 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                src={getEmbedTrailerUrl(trailerModal.trailerUrl)}
                title={`${trailerModal.title} Trailer`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
