import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Ticket, LogOut, User, Menu, X, ShieldAlert } from 'lucide-react';

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

export default function Navbar({ searchQuery = '', onSearchChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          {isAdmin && (
            <Link
              to="/admin"
              className="text-red-300 hover:text-white font-bold transition-colors cursor-pointer flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-red-950/80 border border-red-700"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span>Admin Portal</span>
            </Link>
          )}
        </nav>
      </div>

      {/* Right: Search Bar & Auth Actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        {onSearchChange && (
          <div className="relative hidden sm:block w-56 lg:w-64">
            <Search className="w-4 h-4 text-[#8a765d] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search movies, genres..."
              className="w-full bg-[#1a130d] border border-[#3d3020] rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-[#f5ece0] placeholder:text-[#6e5d49] focus:outline-none focus:border-[#e0b354] transition-colors"
            />
          </div>
        )}

        {token ? (
          <div className="flex items-center gap-2.5">
            {user?.fullName && (
              <span className="hidden md:inline-block text-xs font-semibold text-[#f3cb62] max-w-[120px] truncate" title={user.fullName}>
                {user.fullName}
              </span>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/60 border border-red-700 text-xs font-bold text-red-300 hover:bg-red-900/60 transition-colors cursor-pointer"
              >
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
          className="md:hidden text-[#c7b59d] hover:text-[#e6c27a] p-1"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {mobileMenuOpen && (
        <div className="absolute top-16 left-0 w-full bg-[#15100b] border-b border-[#362919] p-4 flex flex-col gap-3 md:hidden z-50">
          {onSearchChange && (
            <div className="relative w-full">
              <Search className="w-4 h-4 text-[#8a765d] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search movies, genres..."
                className="w-full bg-[#1a130d] border border-[#3d3020] rounded-lg pl-9 pr-4 py-2 text-xs text-[#f5ece0] focus:outline-none focus:border-[#e0b354]"
              />
            </div>
          )}
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
            <Link
              to="/my-bookings"
              onClick={() => setMobileMenuOpen(false)}
              className="text-left py-2 text-sm text-[#f3cb62] font-semibold border-b border-[#2e2316]"
            >
              My Bookings &amp; Tickets
            </Link>
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
  );
}
