import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function CustomDatePicker({
  value,
  onChange,
  label = 'Show Date',
  minDate: _minDate,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState('day'); // 'day' | 'month' | 'year'
  const containerRef = useRef(null);

  // Parse current value or fallback to today
  const selectedDate = (() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  })();

  // Navigation calendar view year and month
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  // Keep view in sync when value changes externally
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m] = value.split('-').map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }, [value]);

  // Click outside listener to close calendar
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setViewMode('day');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePrev = (e) => {
    e.stopPropagation();
    if (viewMode === 'day') {
      if (viewMonth === 0) {
        setViewYear((prev) => prev - 1);
        setViewMonth(11);
      } else {
        setViewMonth((prev) => prev - 1);
      }
    } else if (viewMode === 'month') {
      setViewYear((prev) => prev - 1);
    } else if (viewMode === 'year') {
      setViewYear((prev) => prev - 12);
    }
  };

  const handleNext = (e) => {
    e.stopPropagation();
    if (viewMode === 'day') {
      if (viewMonth === 11) {
        setViewYear((prev) => prev + 1);
        setViewMonth(0);
      } else {
        setViewMonth((prev) => prev + 1);
      }
    } else if (viewMode === 'month') {
      setViewYear((prev) => prev + 1);
    } else if (viewMode === 'year') {
      setViewYear((prev) => prev + 12);
    }
  };

  const formatIsoDate = (year, month, day) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${year}-${pad(month + 1)}-${pad(day)}`;
  };

  const handleSelectDay = (day) => {
    const dateStr = formatIsoDate(viewYear, viewMonth, day);
    onChange(dateStr);
    setIsOpen(false);
    setViewMode('day');
  };

  const handleSelectMonth = (monthIndex) => {
    setViewMonth(monthIndex);
    setViewMode('day');
  };

  const handleSelectYear = (yearNum) => {
    setViewYear(yearNum);
    setViewMode('month');
  };

  const handleQuickSelect = (daysOffset) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const dateStr = formatIsoDate(d.getFullYear(), d.getMonth(), d.getDate());
    onChange(dateStr);
    setIsOpen(false);
    setViewMode('day');
  };

  // Calendar matrix calculations
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Format display string DD/MM/YYYY
  const displayFormatted = (() => {
    if (!value) return 'Select date';
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  })();

  const todayStr = (() => {
    const now = new Date();
    return formatIsoDate(now.getFullYear(), now.getMonth(), now.getDate());
  })();

  // Year range for year selector mode
  const yearStart = Math.floor(viewYear / 12) * 12;
  const years = Array.from({ length: 12 }, (_, i) => yearStart + i);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-semibold tracking-wider text-[#b89d72] mb-2 flex items-center gap-1.5">
          <CalendarIcon className="w-3.5 h-3.5" />
          {label}
        </label>
      )}

      {/* Clickable Date Display Trigger Box */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full bg-[#120d09] border border-[#3d3020] hover:border-[#e0b354] rounded-lg px-3.5 py-2.5 text-sm text-[#f5ece0] flex items-center justify-between transition-colors cursor-pointer group text-left shadow-inner"
        title="Click to choose Year, Month, Day"
      >
        <span className="font-semibold text-[#f5ece0] font-mono tracking-wide">
          {displayFormatted}
        </span>
        <CalendarIcon className="w-4 h-4 text-[#8a765d] group-hover:text-[#e0b354] transition-colors" />
      </button>

      {/* Interactive Calendar Popover */}
      {isOpen && (
        <div className="absolute z-50 top-full mt-2 left-0 sm:left-auto right-auto w-80 bg-[#15100b] border-2 border-[#5e4727] rounded-xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-md select-none animate-in fade-in duration-150">
          {/* Quick chips: Today, Tomorrow, Weekend */}
          <div className="flex items-center gap-1.5 pb-3 mb-3 border-b border-[#2b2015] overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => handleQuickSelect(0)}
              className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#21170e] hover:bg-[#332415] text-[#f3cb62] border border-[#5e4727] transition-colors whitespace-nowrap cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect(1)}
              className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#21170e] hover:bg-[#332415] text-[#f3cb62] border border-[#5e4727] transition-colors whitespace-nowrap cursor-pointer"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect(2)}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#1a140e] hover:bg-[#281e13] text-[#c7b59d] border border-[#3d2f1d] transition-colors whitespace-nowrap cursor-pointer"
            >
              +2 Days
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect(3)}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#1a140e] hover:bg-[#281e13] text-[#c7b59d] border border-[#3d2f1d] transition-colors whitespace-nowrap cursor-pointer"
            >
              +3 Days
            </button>
          </div>

          {/* Month & Year Navigation Header with Click-to-Pick Mode Buttons */}
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              onClick={handlePrev}
              className="w-7 h-7 rounded-lg bg-[#21170e] hover:bg-[#332415] border border-[#3d2f1d] hover:border-[#e0b354] flex items-center justify-center text-[#d4c3ad] hover:text-[#f3cb62] transition-colors cursor-pointer"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Clickable Month & Year Selectors */}
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'month' ? 'day' : 'month')}
                className={`px-2 py-1 rounded-md border flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'month'
                    ? 'bg-[#e0b354] text-[#1a1209] border-[#e0b354] font-black'
                    : 'bg-[#21170e] hover:bg-[#332415] text-[#f5ece0] hover:text-[#f3cb62] border-[#3d2f1d]'
                }`}
                title="Click to choose Month"
              >
                <span>{MONTH_NAMES[viewMonth]}</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'year' ? 'day' : 'year')}
                className={`px-2 py-1 rounded-md border flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'year'
                    ? 'bg-[#e0b354] text-[#1a1209] border-[#e0b354] font-black'
                    : 'bg-[#21170e] hover:bg-[#332415] text-[#f5ece0] hover:text-[#f3cb62] border-[#3d2f1d]'
                }`}
                title="Click to choose Year"
              >
                <span>{viewYear}</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="w-7 h-7 rounded-lg bg-[#21170e] hover:bg-[#332415] border border-[#3d2f1d] hover:border-[#e0b354] flex items-center justify-center text-[#d4c3ad] hover:text-[#f3cb62] transition-colors cursor-pointer"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* VIEW MODE 1: MONTH SELECTION GRID (12 MONTH TILES) */}
          {viewMode === 'month' && (
            <div className="py-1">
              <p className="text-[11px] text-[#ab9a84] font-medium mb-2 text-center">
                Select a Month for <span className="text-[#f3cb62] font-bold">{viewYear}</span>
              </p>
              <div className="grid grid-cols-3 gap-2">
                {MONTH_SHORT.map((name, idx) => {
                  const isCurrentMonth = viewMonth === idx;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleSelectMonth(idx)}
                      className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isCurrentMonth
                          ? 'bg-gradient-to-b from-[#f3cb62] to-[#dda938] text-[#1a1209] shadow-md scale-105'
                          : 'bg-[#1e150d] text-[#d4c3ad] hover:bg-[#2c1f13] hover:text-[#f3cb62] border border-[#362717]'
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW MODE 2: YEAR SELECTION GRID (12 YEAR TILES) */}
          {viewMode === 'year' && (
            <div className="py-1">
              <p className="text-[11px] text-[#ab9a84] font-medium mb-2 text-center">
                Select a Year ({yearStart} - {yearStart + 11})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {years.map((y) => {
                  const isCurrentYear = viewYear === y;
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => handleSelectYear(y)}
                      className={`py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        isCurrentYear
                          ? 'bg-gradient-to-b from-[#f3cb62] to-[#dda938] text-[#1a1209] shadow-md scale-105'
                          : 'bg-[#1e150d] text-[#d4c3ad] hover:bg-[#2c1f13] hover:text-[#f3cb62] border border-[#362717]'
                      }`}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW MODE 3: DAY SELECTION GRID (DEFAULT 7x5/6 GRID) */}
          {viewMode === 'day' && (
            <>
              {/* Day of Week Labels */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                {DAYS_OF_WEEK.map((d) => (
                  <span key={d} className="text-[11px] font-bold text-[#8a765d]">
                    {d}
                  </span>
                ))}
              </div>

              {/* Day Number Cells Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty slots before first day */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-8" />
                ))}

                {/* Days in current month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const cellDateStr = formatIsoDate(viewYear, viewMonth, day);
                  const isSelected = value === cellDateStr;
                  const isToday = cellDateStr === todayStr;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleSelectDay(day)}
                      className={`h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-b from-[#f3cb62] to-[#dda938] text-[#1a1209] font-black shadow-md scale-105'
                          : isToday
                          ? 'border border-[#e0b354] text-[#f3cb62] bg-[#21170e]'
                          : 'text-[#d4c3ad] hover:bg-[#261c12] hover:text-[#f5ece0]'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
