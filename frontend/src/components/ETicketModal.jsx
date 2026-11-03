import { useState } from 'react';
import {
  X,
  Printer,
  Copy,
  Check,
  MapPin,
  Calendar,
} from 'lucide-react';
import { CinemaBadgeIcon } from './Navbar';
import { formatCurrency, formatHour, formatDate } from '../utils/formatters';

// High-fidelity SVG QR Code graphic
function TicketQRCode({ code = 'GOTORO' }) {
  return (
    <svg viewBox="0 0 100 100" className="w-28 h-28 bg-white p-2 rounded-lg shadow-inner">
      <title>{code}</title>
      <rect x="5" y="5" width="25" height="25" fill="#140e08" />
      <rect x="10" y="10" width="15" height="15" fill="#ffffff" />
      <rect x="13" y="13" width="9" height="9" fill="#140e08" />

      <rect x="70" y="5" width="25" height="25" fill="#140e08" />
      <rect x="75" y="10" width="15" height="15" fill="#ffffff" />
      <rect x="78" y="13" width="9" height="9" fill="#140e08" />

      <rect x="5" y="70" width="25" height="25" fill="#140e08" />
      <rect x="10" y="75" width="15" height="15" fill="#ffffff" />
      <rect x="13" y="78" width="9" height="9" fill="#140e08" />

      {/* Scattered matrix dots */}
      <rect x="36" y="8" width="6" height="6" fill="#140e08" />
      <rect x="46" y="14" width="6" height="6" fill="#140e08" />
      <rect x="56" y="8" width="6" height="6" fill="#140e08" />
      <rect x="38" y="24" width="6" height="6" fill="#140e08" />
      <rect x="48" y="32" width="6" height="6" fill="#140e08" />
      <rect x="58" y="24" width="6" height="6" fill="#140e08" />

      <rect x="8" y="38" width="6" height="6" fill="#140e08" />
      <rect x="18" y="46" width="6" height="6" fill="#140e08" />
      <rect x="28" y="38" width="6" height="6" fill="#140e08" />
      <rect x="14" y="58" width="6" height="6" fill="#140e08" />

      <rect x="38" y="42" width="18" height="18" fill="#140e08" />
      <rect x="42" y="46" width="10" height="10" fill="#ffffff" />

      <rect x="70" y="40" width="6" height="6" fill="#140e08" />
      <rect x="82" y="46" width="6" height="6" fill="#140e08" />
      <rect x="76" y="58" width="6" height="6" fill="#140e08" />

      <rect x="38" y="72" width="6" height="6" fill="#140e08" />
      <rect x="48" y="80" width="6" height="6" fill="#140e08" />
      <rect x="62" y="72" width="6" height="6" fill="#140e08" />
      <rect x="74" y="80" width="6" height="6" fill="#140e08" />
      <rect x="84" y="72" width="6" height="6" fill="#140e08" />
    </svg>
  );
}

export default function ETicketModal({ booking, isOpen, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !booking) return null;

  const ticketCode = `GOTORO-${String(booking.id).padStart(8, '0')}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(ticketCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fadeIn">
      <div
        className="w-full max-w-lg bg-[#16100a] border border-[#5e4727] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ticket Header */}
        <div className="relative bg-gradient-to-r from-[#2a1d11] via-[#1c140c] to-[#2a1d11] p-5 border-b border-[#3d2f1d] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CinemaBadgeIcon className="w-8 h-8" />
            <div>
              <span className="font-body font-extrabold text-sm tracking-wider uppercase text-[#e6c27a] block">
                GoToro Digital E-Ticket
              </span>
              <span className="text-[10px] text-[#8a765d] uppercase tracking-widest font-mono">
                Official Admission Pass
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-[#241a10] border border-[#4d3c26] text-xs font-semibold text-[#f3cb62] hover:border-[#e0b354] flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Print E-Ticket"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#241a10] border border-[#3d2f1d] hover:border-[#e0b354] text-[#ab9a84] hover:text-[#f3cb62] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Ticket Content */}
        <div className="p-6 space-y-5 overflow-y-auto print:p-0">
          {/* Movie Title & Details */}
          <div className="space-y-2 border-b border-[#2e2316] pb-4">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#241a10] border border-[#4d3c26] text-[#e0b354] font-mono text-[10px] font-bold">
                {booking.format || 'IMAX 2D'}
              </span>
              <span className="text-xs text-[#8a765d]">•</span>
              <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                Confirmed
              </span>
            </div>

            <h2 className="font-body font-black text-2xl text-[#f7efe4] tracking-tight">
              {booking.movieTitle}
            </h2>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div className="flex items-center gap-2 text-[#ab9a84]">
                <MapPin className="w-4 h-4 text-[#e0b354] shrink-0" />
                <span>
                  {booking.cinemaName} • <strong className="text-[#f5ece0]">{booking.roomName}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-[#ab9a84]">
                <Calendar className="w-4 h-4 text-[#e0b354] shrink-0" />
                <span>{formatDate(booking.startTime)}</span>
              </div>
            </div>
          </div>

          {/* Screening Time & Seats Highlight */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#120d09] border border-[#2e2316] rounded-2xl p-4 text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#8a765d] tracking-wider block">
                Showtime
              </span>
              <div className="text-2xl font-black font-mono text-[#f3cb62]">
                {formatHour(booking.startTime)}
              </div>
              <span className="text-[10px] text-[#8a765d]">Please arrive 15m early</span>
            </div>

            <div className="bg-[#120d09] border border-[#2e2316] rounded-2xl p-4 text-center space-y-1 flex flex-col justify-center">
              <span className="text-[10px] uppercase font-bold text-[#8a765d] tracking-wider block">
                Reserved Seats
              </span>
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5">
                {booking.items?.map((item) => (
                  <span
                    key={item.id}
                    className="px-2 py-0.5 rounded bg-[#241a10] border border-[#5e4727] text-xs font-black font-mono text-[#f3cb62]"
                  >
                    {item.rowName}
                    {item.seatNumber}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Ticket QR & Reference Bar */}
          <div className="bg-[#120d09] border border-[#3d2f1d] rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-5">
            <TicketQRCode code={ticketCode} />

            <div className="space-y-2 text-center sm:text-left flex-1">
              <span className="text-[10px] uppercase font-bold text-[#8a765d] tracking-wider block">
                Digital Pass Reference
              </span>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="font-mono font-bold text-base text-[#f7efe4] tracking-wider">
                  {ticketCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-1 rounded bg-[#1e1710] border border-[#4d3c26] text-[#ab9a84] hover:text-[#f3cb62] transition-colors cursor-pointer"
                  title="Copy pass code"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-[#8a765d] leading-relaxed">
                Scan this QR code at the cinema usher gate for direct entry without box-office check-in.
              </p>
            </div>
          </div>

          {/* Tear Strip Simulation */}
          <div className="relative flex items-center justify-center my-2">
            <div className="w-full border-t border-dashed border-[#4d3c26]" />
            <span className="absolute bg-[#16100a] px-3 text-[10px] uppercase font-mono text-[#6e5d49] tracking-widest">
              Entry Tear Strip
            </span>
          </div>

          {/* Barcode Strip */}
          <div className="space-y-1 text-center">
            <div className="h-9 w-full bg-[#120d09] border border-[#2e2316] rounded flex items-center justify-center overflow-hidden px-4">
              <div className="w-full flex justify-between h-6 opacity-75">
                {[...Array(38)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-full ${
                      i % 3 === 0
                        ? 'w-1 bg-[#e0b354]'
                        : i % 2 === 0
                        ? 'w-0.5 bg-[#8a765d]'
                        : 'w-1.5 bg-[#c7b59d]'
                    }`}
                  />
                ))}
              </div>
            </div>
            <span className="text-[9px] font-mono text-[#6e5d49] tracking-[0.3em]">
              *{ticketCode}*
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#120d09] border-t border-[#2e2316] flex items-center justify-between">
          <div className="text-xs">
            <span className="text-[#8a765d] mr-1.5">Paid:</span>
            <span className="font-mono font-bold text-[#f3cb62]">
              {formatCurrency(booking.finalAmount)}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-gradient-to-b from-[#f3cb62] to-[#dda938] hover:from-[#f7d576] hover:to-[#e5b344] text-[#1a1209] font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
