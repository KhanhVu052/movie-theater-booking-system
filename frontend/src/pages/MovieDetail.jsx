import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Play,
  Clock,
  Calendar,
  Star,
  Film,
  MapPin,
  Globe,
  ArrowLeft,
  Loader2,
  AlertCircle,
  X,
  MessageSquare,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { movieApi } from '../api/movieApi';
import MoviePoster from '../components/MoviePoster';
import { toLocalDateStr } from '../utils/dates';

// Helpers
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

// Generate 7 days starting today
const getUpcomingDates = () => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = toLocalDateStr(d);
    const label =
      i === 0
        ? 'Today'
        : i === 1
        ? 'Tomorrow'
        : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    dates.push({ dateStr, label, dayName: d.toLocaleDateString('en-US', { weekday: 'short' }), dayNum: d.getDate() });
  }
  return dates;
};

export default function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [movie, setMovie] = useState(null);
  const [showtimes, setShowtimes] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [reviewSummary, setReviewSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingShowtimes, setLoadingShowtimes] = useState(false);
  const [error, setError] = useState('');

  const availableDates = useMemo(() => getUpcomingDates(), []);
  const [selectedDate, setSelectedDate] = useState(availableDates[0].dateStr);
  const [selectedCinemaId, setSelectedCinemaId] = useState('ALL');
  const [trailerOpen, setTrailerOpen] = useState(false);

  // 1. Fetch Movie details, Cinemas, and Review summary
  useEffect(() => {
    let isMounted = true;
    const fetchMovieData = async () => {
      setLoading(true);
      setError('');
      try {
        const [movieRes, cinemasRes, reviewsRes] = await Promise.allSettled([
          movieApi.getMovieById(id),
          movieApi.getAllCinemas(),
          movieApi.getMovieReviews(id),
        ]);

        if (!isMounted) return;

        if (movieRes.status === 'fulfilled') {
          const raw = movieRes.value?.data?.data ?? movieRes.value?.data;
          setMovie(raw);
        } else {
          setError('Movie not found or failed to load movie details.');
        }

        if (cinemasRes.status === 'fulfilled') {
          const rawCinemas = cinemasRes.value?.data?.data ?? cinemasRes.value?.data ?? [];
          setCinemas(Array.isArray(rawCinemas) ? rawCinemas : []);
        }

        if (reviewsRes.status === 'fulfilled') {
          const rawReviews = reviewsRes.value?.data?.data ?? reviewsRes.value?.data;
          setReviewSummary(rawReviews);
        }
      } catch {
        if (isMounted) setError('Unable to connect to the cinema service.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMovieData();
    return () => {
      isMounted = false;
    };
  }, [id]);

  // 2. Fetch showtimes for selected date
  useEffect(() => {
    if (!id || !selectedDate) return;
    let isMounted = true;

    const fetchDateShowtimes = async () => {
      setLoadingShowtimes(true);
      try {
        const res = await movieApi.getShowtimes({
          movieId: id,
          showDate: selectedDate,
          bookableOnly: true,
        });

        if (!isMounted) return;
        const raw = res?.data?.data ?? res?.data;
        const list = (Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.items)
          ? raw.items
          : Array.isArray(raw?.content)
          ? raw.content
          : []).filter((st) => st.status === 'SCHEDULED');

        setShowtimes(list);
      } catch {
        if (isMounted) setShowtimes([]);
      } finally {
        if (isMounted) setLoadingShowtimes(false);
      }
    };

    fetchDateShowtimes();
    return () => {
      isMounted = false;
    };
  }, [id, selectedDate]);

  // Group showtimes by Cinema
  const groupedShowtimes = useMemo(() => {
    const map = new Map();

    showtimes.forEach((st) => {
      const cId = st.cinemaId || 1;
      const cName = st.cinemaName || 'GoToro Cinema';

      if (selectedCinemaId !== 'ALL' && String(cId) !== String(selectedCinemaId)) {
        return;
      }

      if (!map.has(cId)) {
        map.set(cId, {
          cinemaId: cId,
          cinemaName: cName,
          showtimes: [],
        });
      }
      map.get(cId).showtimes.push(st);
    });

    return Array.from(map.values());
  }, [showtimes, selectedCinemaId]);

  const handleSelectShowtime = useCallback(
    (showtimeId) => {
      navigate(`/booking/${showtimeId}`);
    },
    [navigate]
  );

  return (
    <div className="min-h-screen w-full bg-[#0e0a07] text-[#f2e8dc] font-body flex flex-col select-none">
      <Navbar />

      {/* Loading state */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#e6c27a]" />
          <p className="text-sm font-medium text-[#ab9a84]">
            Loading movie details and showtimes...
          </p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="max-w-3xl mx-auto my-16 px-6 w-full">
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

      {/* Movie Details Content */}
      {!loading && !error && movie && (
        <>
          {/* Back Nav Link */}
          <div className="w-full max-w-7xl mx-auto px-6 lg:px-12 pt-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#ab9a84] hover:text-[#f3cb62] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Movies</span>
            </Link>
          </div>

          {/* Hero Banner Section */}
          <section className="relative w-full max-w-7xl mx-auto px-6 lg:px-12 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start border-b border-[#2e2316]">
            {/* Left: Poster Card */}
            <div className="lg:col-span-4 flex flex-col items-center sm:items-start">
              <div className="relative w-full max-w-[320px] rounded-2xl overflow-hidden border-2 border-[#4d3c26] shadow-[0_20px_50px_rgba(0,0,0,0.85)] group">
                <MoviePoster
                  src={movie.posterUrl}
                  title={movie.title}
                  genre={formatGenreText(movie)}
                  className="w-full h-[450px] object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                {movie.trailerUrl && (
                  <button
                    type="button"
                    onClick={() => setTrailerOpen(true)}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-90 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <div className="w-14 h-14 rounded-full bg-[#1a130d]/95 border-2 border-[#e6c27a] flex items-center justify-center text-[#e6c27a] shadow-xl group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 fill-[#e6c27a] ml-0.5" />
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Right: Movie Details */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                {movie.ageRating && (
                  <span className="px-2.5 py-1 rounded-md bg-[#e0b354] text-[#140e08] text-xs font-black">
                    {movie.ageRating}
                  </span>
                )}
                <span className="px-3 py-1 rounded-md bg-[#1f1912] border border-[#5e4727] text-xs font-semibold text-[#e6c27a] uppercase">
                  {movie.status === 'NOW_SHOWING' ? 'Now Showing' : movie.status === 'COMING_SOON' ? 'Coming Soon' : 'Ended'}
                </span>
                {reviewSummary?.averageRating != null && (
                  <span className="px-3 py-1 rounded-md bg-[#18120c] border border-[#3d2f1d] text-xs font-bold text-[#f3cb62] flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-[#f3cb62]" />
                    <span>{reviewSummary.averageRating.toFixed(1)} / 5</span>
                    <span className="text-[#8a765d] text-[11px]">
                      ({reviewSummary.totalReviews || 0} reviews)
                    </span>
                  </span>
                )}
              </div>

              <h1 className="font-body font-extrabold text-3xl sm:text-4xl lg:text-5xl text-[#f7efe4] tracking-tight leading-tight">
                {movie.title}
              </h1>

              <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs sm:text-sm text-[#c7b59d]">
                {(movie.durationMinutes || movie.duration) && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#ab9a84]" />
                    {movie.durationMinutes || movie.duration} mins
                  </span>
                )}
                {movie.releaseDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#ab9a84]" />
                    {formatReleaseDate(movie.releaseDate)}
                  </span>
                )}
                {(movie.originalLanguage || movie.language) && (
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-[#ab9a84]" />
                    {movie.originalLanguage || movie.language}
                  </span>
                )}
                {formatGenreText(movie) && (
                  <span className="flex items-center gap-1.5">
                    <Film className="w-4 h-4 text-[#ab9a84]" />
                    {formatGenreText(movie)}
                  </span>
                )}
              </div>

              <div className="text-xs sm:text-sm text-[#ab9a84] space-y-1 pt-2">
                {movie.director && (
                  <p>
                    <strong className="text-[#d4c3ad]">Director:</strong>{' '}
                    {movie.director}
                  </p>
                )}
                {formatActorText(movie) && (
                  <p>
                    <strong className="text-[#d4c3ad]">Cast:</strong>{' '}
                    {formatActorText(movie)}
                  </p>
                )}
              </div>

              {movie.description && (
                <div className="pt-3">
                  <h3 className="text-xs uppercase tracking-wider font-bold text-[#e0b354] mb-1.5">
                    Synopsis
                  </h3>
                  <p className="text-sm text-[#b8a690] leading-relaxed max-w-3xl">
                    {movie.description}
                  </p>
                </div>
              )}

              {movie.trailerUrl && (
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => setTrailerOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1a140e] border border-[#4d3c26] hover:border-[#e6c27a] text-xs font-semibold text-[#f2e8dc] transition-all cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 text-[#e6c27a] fill-[#e6c27a]" />
                    <span>Watch Official Trailer</span>
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Showtimes & Booking Section */}
          <section id="showtimes-section" className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-12 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[#2e2316] pb-4">
              <div>
                <h2 className="font-body font-bold text-2xl sm:text-3xl text-[#f7efe4] tracking-tight">
                  Select Showtime & Cinema
                </h2>
                <p className="text-xs text-[#9c8b75] mt-1">
                  Pick your preferred date, theater, and seat reservation time.
                </p>
              </div>

              {/* Cinema Filter Dropdown */}
              {cinemas.length > 0 && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#e0b354]" />
                  <select
                    value={selectedCinemaId}
                    onChange={(e) => setSelectedCinemaId(e.target.value)}
                    className="bg-[#16110b] border border-[#3d2f1d] rounded-lg px-3 py-1.5 text-xs text-[#f5ece0] focus:outline-none focus:border-[#e0b354]"
                  >
                    <option value="ALL">All Cinema Locations</option>
                    {cinemas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Date Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
              {availableDates.map((item) => {
                const isActive = selectedDate === item.dateStr;
                return (
                  <button
                    key={item.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(item.dateStr)}
                    className={`flex flex-col items-center justify-center min-w-[80px] px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-b from-[#f3cb62] to-[#dda938] border-[#dda938] text-[#1a1209] shadow-md font-bold'
                        : 'bg-[#140f0a] border-[#2e2316] text-[#ab9a84] hover:border-[#5e4727] hover:text-[#f2e8dc]'
                    }`}
                  >
                    <span className="text-[11px] uppercase tracking-wider">
                      {item.dayName}
                    </span>
                    <span className="text-lg font-extrabold mt-0.5 leading-none">
                      {item.dayNum}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Showtimes Grid Grouped by Cinema */}
            {loadingShowtimes ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#e6c27a]" />
                <p className="text-xs text-[#ab9a84]">Loading showtimes for {selectedDate}...</p>
              </div>
            ) : groupedShowtimes.length === 0 ? (
              <div className="bg-[#15100b] border border-[#2e2316] rounded-2xl p-12 text-center">
                <Clock className="w-10 h-10 text-[#8a765d] mx-auto mb-3" />
                <p className="text-base font-semibold text-[#e6c27a]">
                  No showtimes scheduled for this date
                </p>
                <p className="text-xs text-[#9c8b75] mt-1.5">
                  Please pick another date above or select a different cinema location.
                </p>
                {availableDates.length > 0 && selectedDate !== availableDates[0].dateStr && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate(availableDates[0].dateStr)}
                    className="mt-4 px-4 py-2 rounded-lg bg-[#21170e] hover:bg-[#2b1f13] border border-[#e0b354]/40 text-[#f3cb62] text-xs font-bold transition-all cursor-pointer"
                  >
                    View Today's Showtimes
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {groupedShowtimes.map((group) => (
                  <div
                    key={group.cinemaId}
                    className="bg-[#18120c] border border-[#362919] rounded-xl p-6 shadow-md"
                  >
                    <div className="flex items-center gap-2 border-b border-[#2b2015] pb-3 mb-4">
                      <MapPin className="w-4 h-4 text-[#e0b354]" />
                      <h3 className="font-body font-bold text-base text-[#f7efe4]">
                        {group.cinemaName}
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {group.showtimes.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => handleSelectShowtime(st.id)}
                          className="group relative flex flex-col items-center px-4 py-2.5 rounded-lg bg-[#140f0a] border border-[#3d2f1d] hover:border-[#e0b354] hover:bg-[#21170e] transition-all cursor-pointer shadow-sm text-left"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-body font-extrabold text-base text-[#f3cb62] group-hover:text-[#ffdf88]">
                              {formatHour(st.startTime)}
                            </span>
                            {st.format && (
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#2b2014] text-[#c7b59d]">
                                {st.format}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#8a765d] mt-0.5">
                            {st.roomName || 'Screen'} {st.translationType ? `• ${st.translationType}` : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Customer Reviews Section */}
          {reviewSummary?.reviews?.items && reviewSummary.reviews.items.length > 0 && (
            <section className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-10 border-t border-[#2e2316]">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="font-body font-bold text-xl text-[#f7efe4] flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#e0b354]" />
                    <span>Verified Customer Reviews</span>
                  </h3>
                  <p className="text-xs text-[#9c8b75] mt-1">
                    Reviews from viewers who have attended screenings of this movie.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviewSummary.reviews.items.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl bg-[#140f0a] border border-[#2e2316] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#e6c27a]">
                        {r.userFullName || 'Cinema Guest'}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-[#f3cb62]">
                        <Star className="w-3.5 h-3.5 fill-[#f3cb62]" />
                        <span>{r.rating} / 5</span>
                      </div>
                    </div>
                    {r.comment && (
                      <p className="text-xs text-[#b8a690] leading-relaxed">
                        {r.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Trailer Modal */}
      {trailerOpen && movie?.trailerUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-[#18120c] border border-[#4d3c26] rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 border-b border-[#362919] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-[#e6c27a]" />
                <span className="font-body font-bold text-sm text-[#f7efe4]">
                  {movie.title} &mdash; Official Trailer
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTrailerOpen(false)}
                className="text-[#ab9a84] hover:text-[#f3cb62] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                src={getEmbedTrailerUrl(movie.trailerUrl)}
                title={`${movie.title} Trailer`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full bg-[#0c0906] px-6 lg:px-12 py-8 text-xs text-[#8a765d] border-t border-[#241b12] mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>&copy; 2026 GoToro Cinema. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <span>Hotline: 1900 6868</span>
            <span>Terms of Service</span>
            <span>Privacy Policy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
