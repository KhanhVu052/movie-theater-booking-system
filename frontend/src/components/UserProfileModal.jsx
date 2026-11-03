import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  Ticket,
  LogOut,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { authApi } from '../api/authApi';
import { formatDate } from '../utils/formatters';

export default function UserProfileModal({ isOpen, onClose, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Read local stored user as immediate baseline
  const localUser = (() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchFreshProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await authApi.getCurrentUser();
        const data = res?.data?.data ?? res?.data;
        if (isMounted && data) {
          setProfile(data);
          // Sync localStorage with latest verified details
          const currentStored = localStorage.getItem('user');
          const parsed = currentStored ? JSON.parse(currentStored) : {};
          localStorage.setItem('user', JSON.stringify({ ...parsed, ...data }));
        }
      } catch (err) {
        if (isMounted) {
          // Graceful fallback to local cache
          const currentStored = localStorage.getItem('user');
          const parsed = currentStored ? JSON.parse(currentStored) : null;
          if (parsed) {
            setProfile(parsed);
          } else {
            setError(err.response?.data?.message || 'Failed to retrieve profile.');
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFreshProfile();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const activeUser = profile || localUser;
  const isAdmin = activeUser?.role === 'ADMIN';

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fadeIn">
      <div
        className="w-full max-w-md bg-[#16100a] border border-[#4d3c26] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative bg-gradient-to-b from-[#241a10] to-[#16100a] p-6 border-b border-[#362919] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#1c140c] border border-[#e0b354] flex items-center justify-center text-lg font-bold font-mono text-[#f3cb62] shadow-inner">
              {getInitials(activeUser?.fullName)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-body font-bold text-base text-[#f7efe4]">
                  {activeUser?.fullName || 'Cinema Member'}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                    isAdmin
                      ? 'bg-red-950/80 border border-red-700 text-red-300'
                      : 'bg-emerald-950/80 border border-emerald-700 text-emerald-300'
                  }`}
                >
                  {activeUser?.role || 'CUSTOMER'}
                </span>
              </div>
              <p className="text-xs text-[#ab9a84] mt-0.5 font-mono">{activeUser?.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#241a10] border border-[#3d2f1d] hover:border-[#e0b354] text-[#ab9a84] hover:text-[#f3cb62] flex items-center justify-center transition-colors cursor-pointer"
            title="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {loading && (
            <div className="py-6 flex items-center justify-center gap-2 text-xs text-[#ab9a84]">
              <Loader2 className="w-4 h-4 animate-spin text-[#e0b354]" />
              <span>Verifying account credentials...</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-200">
              {error}
            </div>
          )}

          {/* Account Details Cards */}
          <div className="bg-[#120d09] border border-[#2e2316] rounded-xl divide-y divide-[#241a10] text-xs">
            <div className="p-3.5 flex items-center justify-between">
              <span className="text-[#8a765d] flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-[#e0b354]" />
                Full Name
              </span>
              <span className="font-semibold text-[#f5ece0]">{activeUser?.fullName || '—'}</span>
            </div>

            <div className="p-3.5 flex items-center justify-between">
              <span className="text-[#8a765d] flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#e0b354]" />
                Email Address
              </span>
              <span className="font-mono text-[#f5ece0] text-[11px]">{activeUser?.email || '—'}</span>
            </div>

            <div className="p-3.5 flex items-center justify-between">
              <span className="text-[#8a765d] flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#e0b354]" />
                Phone Number
              </span>
              <span className="font-mono text-[#f5ece0]">{activeUser?.phone || '—'}</span>
            </div>

            <div className="p-3.5 flex items-center justify-between">
              <span className="text-[#8a765d] flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-[#e0b354]" />
                Account Status
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{activeUser?.isActive !== false ? 'Verified & Active' : 'Suspended'}</span>
              </span>
            </div>

            <div className="p-3.5 flex items-center justify-between">
              <span className="text-[#8a765d] flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#e0b354]" />
                Member Since
              </span>
              <span className="text-[#c7b59d]">{formatDate(activeUser?.createdAt) || 'Active Member'}</span>
            </div>
          </div>

          {/* Navigation Shortcuts */}
          <div className="space-y-2 pt-2">
            <Link
              to="/my-bookings"
              onClick={onClose}
              className="w-full px-4 py-2.5 rounded-xl bg-[#1c140c] border border-[#3d2f1d] hover:border-[#e0b354] text-xs font-semibold text-[#f5ece0] hover:text-[#f3cb62] flex items-center justify-between transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-[#e0b354]" />
                <span>My Reservations &amp; Tickets</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[#8a765d] group-hover:text-[#f3cb62] transition-colors" />
            </Link>

            {isAdmin && (
              <Link
                to="/admin"
                onClick={onClose}
                className="w-full px-4 py-2.5 rounded-xl bg-red-950/40 border border-red-800/80 hover:border-red-600 text-xs font-semibold text-red-200 hover:text-white flex items-center justify-between transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span>Admin Operations Console</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-red-400 group-hover:text-white transition-colors" />
              </Link>
            )}
          </div>
        </div>

        {/* Modal Footer / Logout CTA */}
        <div className="p-4 bg-[#120d09] border-t border-[#2e2316] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#1a140e] border border-[#3d2f1d] text-xs text-[#ab9a84] hover:text-[#f2e8dc] transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="px-4 py-2 rounded-lg bg-red-950/70 border border-red-800/80 hover:bg-red-900 text-xs font-bold text-red-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
