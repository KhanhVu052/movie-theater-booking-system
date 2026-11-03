import { Link } from 'react-router-dom';
import { Film, Home, Ticket, ArrowLeft } from 'lucide-react';
import Navbar, { CinemaBadgeIcon } from '../components/Navbar';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full bg-[#0e0a07] text-[#f2e8dc] font-body flex flex-col select-none">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-6 max-w-lg mx-auto text-center">
        <div className="p-8 sm:p-10 rounded-3xl bg-[#140f0a] border border-[#3d2f1d] shadow-[0_20px_50px_rgba(0,0,0,0.85)] space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-[#1c140c] border-2 border-[#e0b354] flex items-center justify-center mx-auto shadow-inner">
            <Film className="w-10 h-10 text-[#f3cb62]" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-[#8a765d]">
              Error Code: 404
            </span>
            <h1 className="font-body font-black text-3xl sm:text-4xl text-[#f7efe4] tracking-tight">
              The Reel Has Ended
            </h1>
            <p className="text-xs text-[#ab9a84] leading-relaxed max-w-sm mx-auto">
              The scene or screening you are looking for is not on today&apos;s schedule, or the projectionist may have switched to an alternate reel.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#f3cb62] to-[#dda938] hover:from-[#f7d576] hover:to-[#e5b344] text-[#1a1209] font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Back to Box Office</span>
            </Link>

            <Link
              to="/my-bookings"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#1c140c] border border-[#3d2f1d] hover:border-[#e0b354] text-xs font-semibold text-[#f5ece0] hover:text-[#f3cb62] flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Ticket className="w-4 h-4 text-[#e0b354]" />
              <span>My Reservations</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
