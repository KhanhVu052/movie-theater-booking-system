import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { authApi } from '../api/authApi';

function GoldenTicketIcon({ className = "w-11 h-8" }) {
  return (
    <svg
      viewBox="0 0 56 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="ticketGoldReg" x1="0" y1="0" x2="56" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F6D379" />
          <stop offset="50%" stopColor="#DDA843" />
          <stop offset="100%" stopColor="#B37D24" />
        </linearGradient>
      </defs>
      <path
        d="M4 3H52C53.1 3 54 3.9 54 5V13C50.7 13 48 15.7 48 19C48 22.3 50.7 25 54 25V33C54 34.1 53.1 35 52 35H4C2.9 35 2 34.1 2 33V25C5.3 25 8 22.3 8 19C8 15.7 5.3 13 2 13V5C2 3.9 2.9 3 4 3Z"
        fill="url(#ticketGoldReg)"
        stroke="#4A2F0D"
        strokeWidth="1.5"
      />
      <line x1="17" y1="5" x2="17" y2="33" stroke="#3D2508" strokeWidth="2" strokeDasharray="3 3" />
      <line x1="39" y1="5" x2="39" y2="33" stroke="#3D2508" strokeWidth="2" strokeDasharray="3 3" />
    </svg>
  );
}

function CinemaBadgeIcon({ className = "w-10 h-10" }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="badgeGoldReg" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FCE092" />
          <stop offset="50%" stopColor="#DCA43E" />
          <stop offset="100%" stopColor="#8F5D14" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="#18120B" stroke="url(#badgeGoldReg)" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="21" stroke="#5E431E" strokeWidth="1" strokeDasharray="3 3" />
      <path
        d="M20 24H44C45.1 24 46 24.9 46 26V29.5C43.8 29.5 42 31.3 42 33.5C42 35.7 43.8 37.5 46 37.5V41C46 42.1 45.1 43 44 43H20C18.9 43 18 42.1 18 41V37.5C20.2 37.5 22 35.7 22 33.5C22 31.3 20.2 29.5 18 29.5V26C18 24.9 18.9 24 20 24Z"
        fill="url(#badgeGoldReg)"
      />
      <line x1="27" y1="25" x2="27" y2="42" stroke="#18120B" strokeWidth="1.8" strokeDasharray="2.5 2.5" />
      <polygon points="34,30 34,37 40,33.5" fill="#18120B" />
    </svg>
  );
}

function CinemaCenterpiece({ className = "w-56 h-56" }) {
  return (
    <svg
      viewBox="0 0 260 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient id="centerGlowReg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E6B34A" stopOpacity="0.28" />
          <stop offset="60%" stopColor="#8A5A1E" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#0D0906" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="crestGoldReg" x1="40" y1="30" x2="220" y2="210" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF0B8" />
          <stop offset="35%" stopColor="#E8B854" />
          <stop offset="75%" stopColor="#B87E22" />
          <stop offset="100%" stopColor="#70450A" />
        </linearGradient>
        <linearGradient id="darkPlateReg" x1="60" y1="40" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#261D14" />
          <stop offset="100%" stopColor="#120D08" />
        </linearGradient>
      </defs>

      <circle cx="130" cy="120" r="115" fill="url(#centerGlowReg)" />
      <circle cx="130" cy="120" r="84" fill="url(#darkPlateReg)" stroke="url(#crestGoldReg)" strokeWidth="2.5" />
      <circle cx="130" cy="120" r="74" stroke="#5C4322" strokeWidth="1" strokeDasharray="4 4" />

      <path d="M130 22L133 30L141 33L133 36L130 44L127 36L119 33L127 30Z" fill="#E8B854" />
      <path d="M130 196L132 202L138 204L132 206L130 212L128 206L122 204L128 202Z" fill="#B88632" />
      <circle cx="34" cy="120" r="3" fill="#B88632" />
      <circle cx="226" cy="120" r="3" fill="#B88632" />

      <g opacity="0.9">
        <circle cx="108" cy="106" r="34" fill="#17110B" stroke="url(#crestGoldReg)" strokeWidth="2.5" />
        <circle cx="108" cy="106" r="8" fill="url(#crestGoldReg)" />
        <circle cx="108" cy="84" r="5.5" fill="#2A1F14" stroke="#D9A648" strokeWidth="1.5" />
        <circle cx="108" cy="128" r="5.5" fill="#2A1F14" stroke="#D9A648" strokeWidth="1.5" />
        <circle cx="86" cy="106" r="5.5" fill="#2A1F14" stroke="#D9A648" strokeWidth="1.5" />
        <circle cx="130" cy="106" r="5.5" fill="#2A1F14" stroke="#D9A648" strokeWidth="1.5" />
      </g>

      <g transform="rotate(-12 145 132)">
        <path
          d="M92 104H198C201.3 104 204 106.7 204 110V121C197.9 121 193 125.9 193 132C193 138.1 197.9 143 204 143V154C204 157.3 201.3 160 198 160H92C88.7 160 86 157.3 86 154V143C92.1 143 97 138.1 97 132C97 125.9 92.1 121 86 121V110C86 106.7 88.7 104 92 104Z"
          fill="url(#crestGoldReg)"
          stroke="#2A1A08"
          strokeWidth="2.5"
        />
        <line x1="116" y1="107" x2="116" y2="157" stroke="#2A1A08" strokeWidth="2" strokeDasharray="3.5 3.5" />
        <line x1="176" y1="107" x2="176" y2="157" stroke="#2A1A08" strokeWidth="2" strokeDasharray="3.5 3.5" />
        <text
          x="146"
          y="137"
          textAnchor="middle"
          fill="#1F1407"
          fontSize="13"
          fontFamily="'Albert Sans', sans-serif"
          fontWeight="900"
          letterSpacing="3"
        >
          VIP PASS
        </text>
      </g>
    </svg>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cập nhật State chuẩn bất biến (Functional Updater)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authApi.register(formData);
      navigate('/login');
    } catch (err) {
      const resData = err.response?.data;
      if (resData?.errors && typeof resData.errors === 'object') {
        setError(Object.values(resData.errors).join(', '));
      } else {
        setError(
          resData?.message || 'Registration failed. Please check your details.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0e0a07] text-[#f2e8dc] font-body flex flex-col select-none">
      {/* Top Navbar */}
      <header className="w-full h-14 bg-[#120d09] border-b border-[#362919] px-6 lg:px-10 flex items-center justify-between shrink-0">
        <button
          type="button"
          className="text-[#b89d72] hover:text-[#f0c869] transition-colors cursor-pointer"
          aria-label="Menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <Link to="/login" className="flex items-center gap-2.5">
          <CinemaBadgeIcon className="w-8 h-8" />
          <span className="font-body font-bold text-2xl tracking-tight text-[#e6c27a]">
            GoToro
          </span>
        </Link>

        <Link
          to="/login"
          title="Sign In"
          className="w-9 h-9 rounded-full bg-[#1c140d] border border-[#6e522b] flex items-center justify-center overflow-hidden hover:border-[#e6c27a] transition-colors"
        >
          <CinemaBadgeIcon className="w-7 h-7" />
        </Link>
      </header>

      {/* Main Split Grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 w-full">
        {/* CỘT TRÁI */}
        <section
          className="lg:col-span-7 border-b lg:border-b-0 lg:border-r border-[#2e2316] px-6 py-10 flex flex-col items-center justify-center text-center relative overflow-hidden"
          style={{
            background:
              'radial-gradient(circle at 50% 42%, rgba(145, 96, 30, 0.22) 0%, rgba(40, 26, 12, 0.15) 48%, #0d0906 85%)',
          }}
        >
          <div className="max-w-md w-full flex flex-col items-center">
            <CinemaCenterpiece className="w-56 h-56 sm:w-64 sm:h-64 drop-shadow-[0_18px_28px_rgba(0,0,0,0.85)]" />

            <div className="flex items-center justify-center gap-3 mt-1">
              <span className="font-body font-extrabold text-4xl sm:text-[2.6rem] tracking-tight text-[#e0b354]">
                GoToro
              </span>
              <GoldenTicketIcon className="w-11 h-8 mt-1" />
            </div>

            <p className="text-base sm:text-lg text-[#d9cbb8] font-normal tracking-wide mt-2">
              &ldquo;Chill movie nights start here.&rdquo;
            </p>

            <div className="mt-7 px-8 py-3.5 rounded-xl bg-[#15100b]/90 border border-[#3d2f1d] shadow-[0_8px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,215,130,0.08)]">
              <span className="font-body font-bold text-base sm:text-lg text-[#e8c682] tracking-wide">
                Your Golden Ticket Awaits
              </span>
            </div>
          </div>
        </section>

        {/* CỘT PHẢI: Khung Sign Up đồng bộ */}
        <section
          className="lg:col-span-5 px-6 py-10 flex flex-col items-center justify-center"
          style={{
            background:
              'radial-gradient(circle at 70% 30%, #261e15 0%, #19130d 55%, #120e09 100%)',
          }}
        >
          <div className="w-full max-w-[390px] bg-[#1f1912]/95 border border-[#4d3c26] rounded-xl p-7 sm:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.8),0_0_25px_rgba(212,165,75,0.05)]">
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="font-body font-bold text-3xl text-[#f7efe4] tracking-tight">
                  Sign Up
                </div>
                <p className="text-sm text-[#ab9a84] mt-1">
                  Join GoToro Free Today
                </p>
              </div>
              <CinemaBadgeIcon className="w-12 h-12 shrink-0" />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-950/40 border border-red-800/60 rounded-lg flex items-center gap-2.5 text-xs text-red-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-[#d4c3ad] mb-1"
                >
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  name="fullName"
                  required
                  maxLength={100}
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full bg-[#140f0a] border border-[#3d3020] rounded-lg px-4 py-2.5 text-sm text-[#f5ece0] focus:outline-none focus:border-[#e0b354] focus:ring-1 focus:ring-[#e0b354]/30 transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[#d4c3ad] mb-1"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-[#140f0a] border border-[#3d3020] rounded-lg px-4 py-2.5 text-sm text-[#f5ece0] focus:outline-none focus:border-[#e0b354] focus:ring-1 focus:ring-[#e0b354]/30 transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-[#d4c3ad] mb-1"
                >
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  required
                  placeholder="0912345678"
                  pattern="^(0|\+84)[0-9]{9}$"
                  title="Vietnamese phone number: 10 digits starting with 0 or +84"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full bg-[#140f0a] border border-[#3d3020] rounded-lg px-4 py-2.5 text-sm text-[#f5ece0] placeholder:text-[#6e5d49] focus:outline-none focus:border-[#e0b354] focus:ring-1 focus:ring-[#e0b354]/30 transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[#d4c3ad] mb-1"
                >
                  Password (min 6 characters)
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    minLength={6}
                    maxLength={50}
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full bg-[#140f0a] border border-[#3d3020] rounded-lg pl-4 pr-10 py-2.5 text-sm text-[#f5ece0] focus:outline-none focus:border-[#e0b354] focus:ring-1 focus:ring-[#e0b354]/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a765d] hover:text-[#e6c27a] transition-colors cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-5 rounded-lg bg-gradient-to-b from-[#f3cb62] to-[#dda938] hover:from-[#f7d576] hover:to-[#e5b344] active:scale-[0.99] text-[#1a1209] font-body font-bold text-sm shadow-[0_4px_15px_rgba(221,169,56,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#1a1209]" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Create Free Account</span>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-5 text-center">
              <Link
                to="/login"
                className="text-sm text-[#c7b59d] hover:text-[#f3cb62] underline underline-offset-4 transition-colors"
              >
                Already have an account? Sign In
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
