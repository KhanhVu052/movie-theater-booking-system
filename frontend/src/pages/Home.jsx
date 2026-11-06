import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Play,
  Ticket,
  Clock,
  Calendar,
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
  Star,
} from 'lucide-react';
import Navbar, { CinemaBadgeIcon } from '../components/Navbar';
import { movieApi } from '../api/movieApi';
import MoviePoster from '../components/MoviePoster';
import CustomDatePicker from '../components/CustomDatePicker';
import { toLocalDateStr } from '../utils/dates';

// Normalize and extract data from Backend ApiResponse<T> or PageResponse<T>
const extractPayload = (response) => {
  const raw = response?.data?.data ?? response?.data;
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.items)) return raw.items; // PageResponse DTO
  if (raw && Array.isArray(raw.content)) return raw.content; // Spring Data Page
  return [];
};

// Normalize genre display string
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

// Normalize actor list string (prevent React child crash on ActorResponse objects)
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

// Format release date (YYYY-MM-DD -> DD/MM/YYYY)
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

// Format showtime hour from ISO string
const formatShowtimeHour = (isoString) => {
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

// Convert regular YouTube URL to Iframe Embed URL
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

  // Data States
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
    () => toLocalDateStr()
  );
  const [selectedShowtimeId, setSelectedShowtimeId] = useState('');

  // Modals & Copy
  const [trailerModal, setTrailerModal] = useState(null);
  const [copiedCode, setCopiedCode] = useState('');

  // 1. Fetch initial Movies, Cinemas, Vouchers from Backend
  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      setLoading(true);
      setError('');
      try {
        const [moviesRes, cinemasRes, vouchersRes] = await Promise.allSettled([
          movieApi.getAllMovies({ page: 1, size: 1000 }),
          movieApi.getAllCinemas(),
          movieApi.getActiveVouchers(),
        ]);

        if (!isMounted) return;

        if (moviesRes.status === 'fulfilled') {
          const movieList = extractPayload(moviesRes.value);
          setMovies(movieList);

          // If paramMovieId exists in URL, preselect that movie
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
          setError('Unable to load movie list from server.');
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
          setError('Connection error to the backend server.');
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

  // 2. Query showtimes when Movie, Cinema, or Date changes
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
          bookableOnly: true,
        });

        if (!isMounted) return;
        const showtimeList = extractPayload(res).filter((st) => st.status === 'SCHEDULED');

        // Filter by cinema if selected
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

  // Spotlight movies for Hero Banner
  const spotlightMovies = useMemo(
    () => movies.filter((m) => m.status === 'NOW_SHOWING').slice(0, 5),
    [movies]
  );

  const currentHero = spotlightMovies[heroIndex] || movies[0] || null;

  // Auto-advance hero carousel
  useEffect(() => {
    if (spotlightMovies.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % spotlightMovies.length);
    }, 7500);
    return () => clearInterval(timer);
  }, [spotlightMovies.length]);

  // Extract unique genres
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

  // Filter movies by Tab, Genre, and Search Query
  const isSearching = !!searchQuery.trim();
  const filteredMovies = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return movies.filter((movie) => {
      // If user is actively searching, search across all movies regardless of status
      const matchesTab = isSearching || movie.status === activeTab;

      const genreStr = formatGenreText(movie).toLowerCase();
      const matchesGenre =
        selectedGenre === 'ALL' ||
        genreStr.includes(selectedGenre.toLowerCase());

      const actorStr = formatActorText(movie).toLowerCase();
      const directorStr = (movie.director || '').toLowerCase();
      const titleStr = (movie.title || '').toLowerCase();

      const matchesSearch =
        !keyword ||
        titleStr.includes(keyword) ||
        genreStr.includes(keyword) ||
        directorStr.includes(keyword) ||
        actorStr.includes(keyword);

      return matchesTab && matchesGenre && matchesSearch;
    });
  }, [movies, activeTab, selectedGenre, searchQuery, isSearching]);

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
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        movies={movies}
        onSearchSubmit={() => {
          setTimeout(() => {
            document.getElementById('movies-section')?.scrollIntoView({ behavior: 'smooth' });
          }, 50);
        }}
      />

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center py-32 gap-3.5">
          <Loader2 className="w-10 h-10 animate-spin text-[#e6c27a]" />
          <p className="text-sm font-medium text-[#ab9a84]">
            Loading movies and showtimes from GoToro Cinema...
          </p>
        </div>
      )}

      {/* Server Error State */}
      {!loading && error && (
        <div className="max-w-3xl mx-auto my-12 px-6 w-full">
          <div className="p-6 rounded-2xl bg-red-950/30 border border-red-800/60 flex items-start gap-4 text-red-200">
            <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-red-300">{error}</p>
              <p className="text-xs text-red-300/80 mt-1">
                Please ensure the backend service (port 8080) is running and refresh the page.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
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
                      Spotlight
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
                        {currentHero.durationMinutes || currentHero.duration} mins
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
                        <strong className="text-[#d4c3ad]">Director:</strong>{' '}
                        {currentHero.director}
                      </p>
                    )}
                    {formatActorText(currentHero) && (
                      <p className="line-clamp-1">
                        <strong className="text-[#d4c3ad]">Cast:</strong>{' '}
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
                      <span>Book Tickets Now</span>
                    </button>

                    {currentHero.trailerUrl && (
                      <button
                        type="button"
                        onClick={() => setTrailerModal(currentHero)}
                        className="px-6 py-3.5 rounded-xl bg-[#1a140e]/90 hover:bg-[#261d14] border border-[#4d3c26] hover:border-[#e6c27a] text-[#f2e8dc] font-body font-semibold text-sm flex items-center gap-2.5 transition-all cursor-pointer"
                      >
                        <Play className="w-4 h-4 text-[#e6c27a] fill-[#e6c27a]" />
                        <span>Watch Trailer</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="hidden lg:flex lg:col-span-4 justify-end">
                  <div className="relative w-64 rounded-2xl overflow-hidden border-2 border-[#4d3c26] shadow-[0_24px_60px_rgba(0,0,0,0.9)] group">
                    <MoviePoster
                      src={currentHero.posterUrl}
                      title={currentHero.title}
                      genre={formatGenreText(currentHero)}
                      className="w-full h-[360px] object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {currentHero.trailerUrl && (
                      <div className="absolute bottom-3 right-3">
                        <button
                          type="button"
                          onClick={() => setTrailerModal(currentHero)}
                          title="Watch Trailer"
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
                    title="Previous movie"
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
                        aria-label={`Go to movie ${idx + 1}`}
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
                    title="Next movie"
                    className="w-9 h-9 rounded-lg bg-[#16110b]/90 border border-[#3d2f1d] hover:border-[#e6c27a] flex items-center justify-center text-[#d4c3ad] hover:text-[#e6c27a] transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </section>
          )}

          {/* 3. QUICK BOOKING BAR */}
          <section
            id="quick-booking"
            className="w-full max-w-7xl mx-auto px-6 lg:px-12 -mt-7 relative z-20"
          >
            <form
              onSubmit={handleQuickBookSubmit}
              className="bg-[#1a140e] border border-[#4d3c26] rounded-2xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.85)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end"
            >
              {/* Select Movie */}
              <div className="lg:col-span-3">
                <label className="block text-xs font-semibold tracking-wider text-[#b89d72] mb-2 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5" />
                  Select Movie
                </label>
                <select
                  value={quickMovieId}
                  onChange={(e) => setQuickMovieId(e.target.value)}
                  className="w-full bg-[#120d09] border border-[#3d3020] rounded-lg px-3.5 py-2.5 text-sm text-[#f5ece0] focus:outline-none focus:border-[#e0b354] transition-colors"
                >
                  <option value="">-- Select a movie --</option>
                  {movies
                    .filter((m) => m.status === 'NOW_SHOWING')
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                </select>
              </div>

              {/* Select Cinema */}
              <div className="lg:col-span-3">
                <label className="block text-xs font-semibold tracking-wider text-[#b89d72] mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Cinema
                </label>
                <select
                  value={quickCinemaId}
                  onChange={(e) => setQuickCinemaId(e.target.value)}
                  className="w-full bg-[#120d09] border border-[#3d3020] rounded-lg px-3.5 py-2.5 text-sm text-[#f5ece0] focus:outline-none focus:border-[#e0b354] transition-colors"
                >
                  <option value="">-- Select a cinema --</option>
                  {cinemas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Show Date (Visual Click-to-Choose DatePicker) */}
              <div className="lg:col-span-2">
                <CustomDatePicker
                  value={quickDate}
                  onChange={(newDate) => setQuickDate(newDate)}
                  label="Show Date"
                />
              </div>

              {/* Showtime */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold tracking-wider text-[#b89d72] mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Showtime
                </label>
                <select
                  value={selectedShowtimeId}
                  onChange={(e) => setSelectedShowtimeId(e.target.value)}
                  disabled={loadingShowtimes || availableShowtimes.length === 0}
                  className="w-full bg-[#120d09] border border-[#3d3020] rounded-lg px-3.5 py-2.5 text-sm text-[#f5ece0] focus:outline-none focus:border-[#e0b354] disabled:opacity-50 transition-colors"
                >
                  {loadingShowtimes ? (
                    <option value="">Loading showtimes...</option>
                  ) : availableShowtimes.length === 0 ? (
                    <option value="">No showtimes available</option>
                  ) : (
                    availableShowtimes.map((st) => (
                      <option key={st.id} value={st.id}>
                        {formatShowtimeHour(st.startTime)} {st.roomName ? `• ${st.roomName}` : ''} {st.format ? `(${st.format})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Submit CTA */}
              <div className="lg:col-span-2">
                <button
                  type="submit"
                  disabled={!quickMovieId}
                  className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-b from-[#f3cb62] to-[#dda938] hover:from-[#f7d576] hover:to-[#e5b344] text-[#1a1209] font-body font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                >
                  <Ticket className="w-4 h-4" />
                  <span>Reserve Seats</span>
                </button>
              </div>
            </form>
          </section>

          {/* 4. MOVIE LIST SECTION */}
          <section
            id="movies-section"
            className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-16 flex-1"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#2e2316] pb-6 mb-8">
              <div>
                <h2 className="font-body font-bold text-2xl sm:text-3xl text-[#f7efe4] tracking-tight">
                  Now & Upcoming Releases
                </h2>
                <p className="text-sm text-[#9c8b75] mt-1">
                  Real-time showtimes across all GoToro Cinema locations.
                </p>
              </div>

              <div className="inline-flex bg-[#15100b] border border-[#3d2f1d] p-1 rounded-xl self-start">
                <button
                  type="button"
                  onClick={() => setActiveTab('NOW_SHOWING')}
                  className={`px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    activeTab === 'NOW_SHOWING'
                      ? 'bg-gradient-to-b from-[#f3cb62] to-[#dda938] text-[#1a1209] shadow-sm'
                      : 'text-[#ab9a84] hover:text-[#f2e8dc]'
                  }`}
                >
                  Now Showing
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('COMING_SOON')}
                  className={`px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    activeTab === 'COMING_SOON'
                      ? 'bg-gradient-to-b from-[#f3cb62] to-[#dda938] text-[#1a1209] shadow-sm'
                      : 'text-[#ab9a84] hover:text-[#f2e8dc]'
                  }`}
                >
                  Coming Soon
                </button>
              </div>
            </div>

            {/* Genre Filter */}
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
                  {genre === 'ALL' ? 'All Genres' : genre}
                </button>
              ))}
            </div>

            {/* Movies Grid */}
            {filteredMovies.length === 0 ? (
              <div className="bg-[#15100b] border border-[#2e2316] rounded-2xl p-12 text-center">
                <Film className="w-10 h-10 text-[#8a765d] mx-auto mb-3" />
                <p className="text-base font-semibold text-[#e6c27a]">
                  No movies found matching your search criteria
                </p>
                <p className="text-xs text-[#9c8b75] mt-1.5">
                  Try adjusting your search keywords or selecting a different genre.
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
                        <MoviePoster
                          src={movie.posterUrl}
                          title={movie.title}
                          genre={formatGenreText(movie)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#18120c] via-transparent to-black/30 pointer-events-none" />

                        <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
                          {movie.ageRating && (
                            <span className="px-2 py-0.5 rounded bg-[#e0b354] text-[#140e08] text-[11px] font-black">
                              {movie.ageRating}
                            </span>
                          )}
                          {isSearching && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              movie.status === 'NOW_SHOWING'
                                ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-600/50'
                                : movie.status === 'COMING_SOON'
                                ? 'bg-blue-950/90 text-blue-300 border border-blue-600/50'
                                : 'bg-zinc-800/90 text-zinc-300 border border-zinc-600/50'
                            }`}>
                              {movie.status === 'NOW_SHOWING' ? 'Now Showing' : movie.status === 'COMING_SOON' ? 'Coming Soon' : 'Ended'}
                            </span>
                          )}
                        </div>

                        {movie.status === 'NOW_SHOWING' && (
                          <div className="absolute top-3 right-3 pointer-events-none">
                            <span className="px-2 py-0.5 rounded-md bg-[#181109]/90 backdrop-blur-md border border-[#e0b354]/60 text-[#f3cb62] text-[10px] font-bold flex items-center gap-1 shadow-sm">
                              <Star className="w-3 h-3 fill-[#f3cb62]" />
                              Top Rated
                            </span>
                          </div>
                        )}

                        {movie.trailerUrl && (
                          <button
                            type="button"
                            onClick={() => setTrailerModal(movie)}
                            title={`Watch ${movie.title} Trailer`}
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
                            <strong className="text-[#c7b59d]">Cast:</strong>{' '}
                            {formatActorText(movie)}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-xs text-[#b8a690] mt-3 pt-3 border-t border-[#2b2015]">
                          {(movie.durationMinutes || movie.duration) && (
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-[#8a765d]" />
                              {movie.durationMinutes || movie.duration} mins
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
                            ? 'Book Tickets'
                            : movie.status === 'COMING_SOON'
                            ? 'Coming Soon'
                            : 'View Details'}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 5. VOUCHERS & PROMOTIONS SECTION */}
          {vouchers.length > 0 && (
            <section
              id="vouchers-section"
              className="w-full bg-[#130e09] border-t border-b border-[#2e2316] py-16"
            >
              <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                  <div>
                    <h2 className="font-body font-bold text-2xl sm:text-3xl text-[#f7efe4]">
                      Exclusive Online Promotions
                    </h2>
                    <p className="text-sm text-[#9c8b75] mt-1">
                      Applicable when booking tickets online via GoToro Cinema website or mobile app.
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
                              ? `${voucher.discountValue}% OFF`
                              : `${Number(voucher.discountValue).toLocaleString('en-US')} VND OFF`}
                          </span>
                          {(voucher.endAt || voucher.expirationDate) && (
                            <span className="text-[11px] text-[#8a765d]">
                              Expires:{' '}
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
                              Min Order:{' '}
                              <strong className="text-[#d4c3ad]">
                                {Number(voucher.minOrderValue).toLocaleString('en-US')} VND
                              </strong>
                            </p>
                          )}
                          {voucher.maxDiscountAmount > 0 && (
                            <p>
                              Max Discount:{' '}
                              <strong className="text-[#d4c3ad]">
                                {Number(voucher.maxDiscountAmount).toLocaleString('en-US')} VND
                              </strong>
                            </p>
                          )}
                          {voucher.remainingQuota != null && (
                            <p className="text-[#ab9a84]">
                              Remaining:{' '}
                              <span className="text-[#f3cb62] font-semibold">
                                {voucher.remainingQuota}
                              </span>{' '}
                              left
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
                              <span className="text-emerald-300">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-[#e6c27a]" />
                              <span>Copy</span>
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
                Premium Cinema Experience &bull; Instant Real-time Online Booking
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-[#ab9a84]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#e0b354]" />
              Instant 10-Min Seat Hold
            </span>
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-[#e0b354]" />
              Secure VNPAY Payment Gateway
            </span>
            <span className="flex items-center gap-1.5">
              <Ticket className="w-4 h-4 text-[#e0b354]" />
              Instant E-Ticket & QR Check-in
            </span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>&copy; 2026 GoToro Cinema. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <span>Hotline: 1900 6868</span>
            <span>Terms of Service</span>
            <span>Privacy Policy</span>
          </div>
        </div>
      </footer>

      {/* 7. TRAILER MODAL */}
      {trailerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-[#18120c] border border-[#4d3c26] rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 border-b border-[#362919] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-[#e6c27a]" />
                <span className="font-body font-bold text-sm text-[#f7efe4] truncate max-w-md">
                  {trailerModal.title} &mdash; Official Trailer
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTrailerModal(null)}
                title="Close trailer"
                className="text-[#ab9a84] hover:text-[#f3cb62] p-1 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                src={getEmbedTrailerUrl(trailerModal.trailerUrl)}
                title={`${trailerModal.title} Official Trailer`}
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
