import { useState, useRef, useMemo, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Ticket, LogOut, User, Menu, X, ShieldAlert } from 'lucide-react';
import UserProfileModal from './UserProfileModal';
import MoviePoster from './MoviePoster';

export function CinemaBadgeIcon({ className = "w-9 h-9" }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="navBadgeGold" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FCE092" />
          <stop offset="50%" stopColor="#DCA43E" />
          <stop offset="100%" stopColor="#8F5D14" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="#18120B" stroke="url(#navBadgeGold)" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="21" stroke="#5E431E" strokeWidth="1" strokeDasharray="3 3" />
      <path
        d="M20 24H44C45.1 24 46 24.9 46 26V29.5C43.8 29.5 42 31.3 42 33.5C42 35.7 43.8 37.5 46 37.5V41C46 42.1 45.1 43 44 43H20C18.9 43 18 42.1 18 41V37.5C20.2 37.5 22 35.7 22 33.5C22 31.3 20.2 29.5 18 29.5V26C18 24.9 18.9 24 20 24Z"
        fill="url(#navBadgeGold)"
      />
      <line x1="27" y1="25" x2="27" y2="42" stroke="#18120B" strokeWidth="1.8" strokeDasharray="2.5 2.5" />
      <polygon points="34,30 34,37 40,33.5" fill="#18120B" />
    </svg>
  );
}

export default function Navbar({ searchQuery = '', onSearchChange, onSearchSubmit, movies = [] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [internalQuery, setInternalQuery] = useState(searchQuery);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);

  const currentSearch = onSearchChange ? searchQuery : internalQuery;

  const handleQueryChange = (val) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setInternalQuery(val);
    }
    setDropdownOpen(!!val.trim());
  };

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setDropdownOpen(false);
    if (onSearchSubmit) {
      onSearchSubmit(currentSearch);
    } else {
      navigate(`/?q=${encodeURIComponent(currentSearch)}#movies-section`);
      setTimeout(() => {
        document.getElementById('movies-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  };

  const liveMatches = useMemo(() => {
    const q = currentSearch.trim().toLowerCase();
    if (!q || !movies || movies.length === 0) return [];
    return movies.filter((m) => {
      const title = (m.title || '').toLowerCase();
      const genre = (typeof m.genre === 'string' ? m.genre : Array.isArray(m.genres) ? m.genres.map(g => g.name || g).join(' ') : '').toLowerCase();
      const director = (m.director || '').toLowerCase();
      return title.includes(q) || genre.includes(q) || director.includes(q);
    }).slice(0, 6);
  }, [currentSearch, movies]);

  const token = localStorage.getItem('token');
  const user = (() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();
  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const scrollToSection = (sectionId) => {
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#120d09]/95 backdrop-blur-md border-b border-[#362919] px-4 sm:px-8 lg:px-12 h-16 flex items-center justify-between select-none">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <CinemaBadgeIcon className="w-9 h-9 transition-transform group-hover:scale-105" />
            <div className="flex flex-col">
              <span className="font-body font-extrabold text-2xl tracking-tight text-[#e6c27a] leading-none">
                GoToro
              </span>
              <span className="text-[10px] tracking-[0.2em] uppercase text-[#8a765d] font-medium mt-0.5">
                Cinema
              </span>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#c7b59d]">
            <button
              type="button"
              onClick={() => scrollToSection('movies-section')}
              className="hover:text-[#f3cb62] transition-colors cursor-pointer"
            >
              Movies
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('quick-booking')}
              className="hover:text-[#f3cb62] transition-colors cursor-pointer"
            >
              Showtimes
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('vouchers-section')}
              className="hover:text-[#f3cb62] transition-colors cursor-pointer"
            >
              Vouchers
            </button>
            {token && (
              <Link
                to="/my-bookings"
                className="hover:text-[#f3cb62] transition-colors cursor-pointer"
              >
                My Bookings
              </Link>
            )}

          </nav>
        </div>

        {/* Right: Search Bar & Auth Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div ref={searchContainerRef} className="relative hidden sm:block w-64 lg:w-72">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <button
                type="submit"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-[#8a765d] hover:text-[#e0b354] transition-colors cursor-pointer"
                title="Click to search"
              >
                <Search className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={currentSearch}
                onFocus={() => { if (currentSearch.trim()) setDropdownOpen(true); }}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Search movies, genres, cast..."
                className="w-full bg-[#1a130d] border border-[#3d3020] focus:border-[#e0b354] rounded-lg pl-9 pr-8 py-1.5 text-xs text-[#f5ece0] placeholder:text-[#6e5d49] focus:outline-none transition-colors"
              />
              {currentSearch && (
                <button
                  type="button"
                  onClick={() => { handleQueryChange(''); setDropdownOpen(false); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a765d] hover:text-[#f3cb62] transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            {/* Live Search Results Dropdown */}
            {dropdownOpen && currentSearch.trim() && (
              <div className="absolute top-full mt-2 left-0 right-0 w-80 lg:w-96 bg-[#16100b] border-2 border-[#5e4727] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden z-50 animate-in fade-in duration-150">
                <div className="p-2.5 border-b border-[#2b2015] flex items-center justify-between text-[11px] text-[#ab9a84]">
                  <span className="font-semibold">Matching Movies ({liveMatches.length})</span>
                  <span className="text-[10px] text-[#8a765d]">Press Enter to view all</span>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-[#22180e]">
                  {liveMatches.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#ab9a84]">
                      No movies found for "<span className="text-[#f3cb62]">{currentSearch}</span>"
                    </div>
                  ) : (
                    liveMatches.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => { setDropdownOpen(false); navigate('/movies/' + m.id); }}
                        className="p-2.5 hover:bg-[#241a10] flex items-center gap-3 transition-colors cursor-pointer group"
                      >
                        <div className="w-10 h-14 rounded overflow-hidden shrink-0 bg-[#0c0805]">
                          <MoviePoster src={m.posterUrl} title={m.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#f5ece0] group-hover:text-[#f3cb62] transition-colors truncate">
                            {m.title}
                          </p>
                          <p className="text-[10px] text-[#a8957c] truncate mt-0.5">
                            {m.releaseDate ? m.releaseDate.split('-')[0] : ''} {m.durationMinutes ? '• ' + m.durationMinutes + 'm' : ''}
                          </p>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${
                          m.status === 'NOW_SHOWING' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50' :
                          m.status === 'COMING_SOON' ? 'bg-blue-950 text-blue-300 border border-blue-700/50' :
                          'bg-zinc-800 text-zinc-400'
                        }`}>
                          {m.status === 'NOW_SHOWING' ? 'Showing' : m.status === 'COMING_SOON' ? 'Soon' : 'Ended'}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSearchSubmit}
                  className="w-full py-2 bg-[#21170e] hover:bg-[#2c1f13] border-t border-[#3d2f1d] text-[11px] font-bold text-[#f3cb62] text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Search className="w-3 h-3" />
                  <span>View all results for "{currentSearch}"</span>
                </button>
              </div>
            )}
          </div>

          {token ? (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#1a130d] border border-[#3d2f1d] hover:border-[#e0b354] text-xs font-semibold text-[#f3cb62] transition-colors cursor-pointer group"
                title="View Account Profile"
              >
                <div className="w-5 h-5 rounded-full bg-[#241a10] border border-[#e0b354] flex items-center justify-center text-[10px] text-[#f3cb62]">
                  <User className="w-3 h-3 text-[#f3cb62]" />
                </div>
                {user?.fullName && (
                  <span className="hidden md:inline-block max-w-[120px] truncate">
                    {user.fullName}
                  </span>
                )}
              </button>

              {isAdmin && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/80 border border-red-700 text-xs font-bold text-red-300 hover:bg-red-900/80 transition-colors cursor-pointer"
                  title="Open Admin Operations Console"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  <span>Admin Console</span>
                </Link>
              )}
              <Link
                to="/my-bookings"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1f1912] border border-[#4d3c26] text-xs font-medium text-[#e6c27a] hover:border-[#e0b354] transition-colors cursor-pointer"
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>My Tickets</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign Out"
                className="px-3 py-1.5 rounded-lg bg-[#1a130d] border border-[#3d3020] hover:border-red-800/70 text-xs text-[#c7b59d] hover:text-red-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                to="/login"
                className="px-4 py-1.5 rounded-lg bg-[#1f1912] border border-[#4d3c26] hover:border-[#e0b354] text-xs font-semibold text-[#e6c27a] transition-colors flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
              <Link
                to="/register"
                className="hidden sm:inline-flex px-4 py-1.5 rounded-lg bg-gradient-to-b from-[#f3cb62] to-[#dda938] hover:from-[#f7d576] hover:to-[#e5b344] text-[#1a1209] font-bold text-xs shadow-sm transition-all"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-[#c7b59d] hover:text-[#e6c27a] p-1 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="absolute top-16 left-0 w-full bg-[#15100b] border-b border-[#362919] p-4 flex flex-col gap-3 md:hidden z-50">
            <form
              onSubmit={(e) => {
                handleSearchSubmit(e);
                setMobileMenuOpen(false);
              }}
              className="relative w-full"
            >
              <button
                type="submit"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-[#8a765d] hover:text-[#e0b354] transition-colors cursor-pointer"
                title="Search"
              >
                <Search className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={currentSearch}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Search movies, genres, cast..."
                className="w-full bg-[#1a130d] border border-[#3d3020] rounded-lg pl-9 pr-8 py-2 text-xs text-[#f5ece0] focus:outline-none focus:border-[#e0b354]"
              />
              {currentSearch && (
                <button
                  type="button"
                  onClick={() => handleQueryChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a765d] hover:text-[#f3cb62] transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>
            <button
              type="button"
              onClick={() => scrollToSection('movies-section')}
              className="text-left py-2 text-sm text-[#e6c27a] font-medium border-b border-[#2e2316]"
            >
              Movies
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('quick-booking')}
              className="text-left py-2 text-sm text-[#c7b59d] border-b border-[#2e2316]"
            >
              Quick Showtimes
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('vouchers-section')}
              className="text-left py-2 text-sm text-[#c7b59d] border-b border-[#2e2316]"
            >
              Promo Vouchers
            </button>
            {token && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setProfileModalOpen(true);
                  }}
                  className="text-left py-2 text-sm text-[#f5ece0] font-semibold border-b border-[#2e2316] flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-[#e0b354]" />
                  <span>My Profile &amp; Account</span>
                </button>
                <Link
                  to="/my-bookings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-left py-2 text-sm text-[#f3cb62] font-semibold border-b border-[#2e2316]"
                >
                  My Bookings &amp; Tickets
                </Link>
              </>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="text-left py-2 text-sm text-red-300 font-bold"
              >
                Admin Operations Console
              </Link>
            )}
          </div>
        )}
      </header>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onLogout={handleLogout}
      />
    </>
  );
}
