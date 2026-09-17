'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface PlanCalendarBarProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  plansCountMap?: Record<string, number>;
}

const ENG_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const ENG_DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ENG_DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateYMD(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function formatEngDateFull(dateStr: string): string {
  const dateObj = parseDateYMD(dateStr);
  const dayName = ENG_DAYS_FULL[dateObj.getDay()];
  const monthName = ENG_MONTHS_SHORT[dateObj.getMonth()];
  return `${dayName}, ${monthName} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
}

export default function PlanCalendarBar({
  selectedDate,
  onSelectDate,
  plansCountMap = {},
}: PlanCalendarBarProps) {
  const todayStr = formatDateYMD(new Date());

  // Generate 7 days around current selected date (Monday to Sunday)
  const selectedDateObj = parseDateYMD(selectedDate);

  // Compute start of week (Monday)
  const dayOfWeek = selectedDateObj.getDay(); // 0 is Sun, 1 is Mon
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const mondayObj = new Date(selectedDateObj);
  mondayObj.setDate(selectedDateObj.getDate() + distanceToMonday);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mondayObj);
    d.setDate(mondayObj.getDate() + i);
    const dateStr = formatDateYMD(d);
    const isSelected = dateStr === selectedDate;
    const isToday = dateStr === todayStr;
    const count = plansCountMap[dateStr] || 0;

    return {
      dateStr,
      dayNum: d.getDate(),
      dayLabel: ENG_DAYS_SHORT[d.getDay()],
      isSelected,
      isToday,
      count,
    };
  });

  const handlePrevDay = () => {
    const prev = new Date(selectedDateObj);
    prev.setDate(prev.getDate() - 1);
    onSelectDate(formatDateYMD(prev));
  };

  const handleNextDay = () => {
    const next = new Date(selectedDateObj);
    next.setDate(next.getDate() + 1);
    onSelectDate(formatDateYMD(next));
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs p-3.5 sm:p-5 space-y-3 sm:space-y-4">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#148277] flex items-center justify-center shrink-0 border border-teal-100">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Plan Date Selection
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              {formatEngDateFull(selectedDate)}
            </h2>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onSelectDate(todayStr)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedDate === todayStr
                ? 'bg-teal-100 text-[#148277] border border-teal-200'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Today
          </button>

          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
            <button
              onClick={handlePrevDay}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition-all"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) onSelectDate(e.target.value);
              }}
              className="text-xs font-semibold bg-transparent text-slate-700 outline-none px-1 cursor-pointer"
            />
            <button
              onClick={handleNextDay}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition-all"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Week Day Pills Strip */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {weekDays.map((item) => (
          <button
            key={item.dateStr}
            onClick={() => onSelectDate(item.dateStr)}
            className={`flex flex-col items-center justify-center py-2 sm:py-2.5 px-1 rounded-xl sm:rounded-2xl transition-all relative ${
              item.isSelected
                ? 'bg-[#1b9b8e] text-white shadow-md shadow-teal-700/20 scale-[1.03]'
                : item.isToday
                ? 'bg-teal-50 text-[#148277] border border-teal-300/80 hover:bg-teal-100'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
            }`}
          >
            <span className={`text-[10px] sm:text-[11px] font-semibold ${item.isSelected ? 'text-teal-100' : 'text-slate-400'}`}>
              {item.dayLabel}
            </span>
            <span className="text-sm sm:text-base font-black my-0.5">
              {item.dayNum}
            </span>
            {item.count > 0 ? (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  item.isSelected
                    ? 'bg-white text-[#148277]'
                    : 'bg-teal-100 text-[#148277]'
                }`}
              >
                {item.count}
              </span>
            ) : (
              <span className="text-[10px] text-transparent select-none">-</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
