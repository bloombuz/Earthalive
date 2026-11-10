import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Grid3X3,
  ListFilter,
  SlidersHorizontal,
} from 'lucide-react';
import { AccommodationId, ACCOMMODATIONS, CONTAINERS, Booking } from '../types/index.ts';
import { useResort } from '../context/ResortContext.tsx';
import { formatINR } from '../utils/pricing.ts';
import {
  getKolkataDateString,
  addDays,
  getOccupiedNights,
  isInventoryReservingBooking,
} from '../utils/availability.ts';

interface CalendarViewProps {
  onNewBookingForDate: (date: string, accommodationId?: AccommodationId) => void;
  onSelectBooking: (booking: Booking) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  onNewBookingForDate,
  onSelectBooking,
}) => {
  const {
    bookings,
    maintenanceBlocks,
    isAccommodationAvailable,
    getAccommodationAvailabilityStatus,
    getBunkbedAvailabilityForDates,
  } = useResort();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'timeline'>('month');
  const [expandedContainerDate, setExpandedContainerDate] = useState<string | null>(null);
  const [inspectedDate, setInspectedDate] = useState<string>(() => getKolkataDateString());

  // Month navigation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = useMemo(() => {
    return new Date(year, month + 1, 0).getDate();
  }, [year, month]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(year, month, 1).getDay();
  }, [year, month]);

  const monthName = useMemo(() => {
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleTodayJump = () => {
    const today = new Date();
    setCurrentDate(today);
    setInspectedDate(getKolkataDateString());
  };

  // Build calendar matrix for month view
  const calendarDays = useMemo(() => {
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Prev month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, d);
      days.push({
        dateStr: prevDate.toISOString().split('T')[0],
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
      });
    }

    // Next month padding to fill grid
    const remaining = 35 - days.length > 0 ? 35 - days.length : (42 - days.length > 0 ? 42 - days.length : 0);
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      days.push({
        dateStr: nextDate.toISOString().split('T')[0],
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month, daysInMonth, firstDayOfWeek]);

  // Daily info helper
  const getDayStatus = (dateStr: string) => {
    const nextDateStr = addDays(dateStr, 1);

    const fireflyAvail = isAccommodationAvailable('firefly', dateStr, nextDateStr);
    const sunbirdAvail = isAccommodationAvailable('sunbird', dateStr, nextDateStr);
    const woodpeckerAvail = isAccommodationAvailable('woodpecker', dateStr, nextDateStr);

    const bunkbeds = getBunkbedAvailabilityForDates(dateStr, nextDateStr);

    const activeOnDate = bookings.filter((b) => {
      if (!isInventoryReservingBooking(b)) return false;
      return b.checkInDate <= dateStr && b.checkOutDate > dateStr;
    });

    return {
      fireflyAvail,
      sunbirdAvail,
      woodpeckerAvail,
      bunkbedsAvail: bunkbeds.minAvailableBedsAcrossStay,
      bunkbedsBooked: bunkbeds.maxBookedBedsAcrossStay,
      containerBreakdown: bunkbeds.containerBreakdown,
      bookings: activeOnDate,
    };
  };

  const inspectedStatus = useMemo(() => {
    return getDayStatus(inspectedDate);
  }, [inspectedDate, bookings, maintenanceBlocks]);

  // Timeline schedule rows: Firefly, Sunbird, Woodpecker, Container 1, Container 2, Container 3, Container 4
  const timelineRows = [
    { id: 'firefly', name: 'Firefly Treehouse', type: 'treehouse' as const },
    { id: 'sunbird', name: 'Sunbird Treehouse', type: 'treehouse' as const },
    { id: 'woodpecker', name: 'Woodpecker Treehouse', type: 'treehouse' as const },
    { id: 'c1', name: 'Container 1 (Beds 1–6)', type: 'container' as const, containerId: 'c1', bedNumbers: [1, 2, 3, 4, 5, 6] },
    { id: 'c2', name: 'Container 2 (Beds 7–12)', type: 'container' as const, containerId: 'c2', bedNumbers: [7, 8, 9, 10, 11, 12] },
    { id: 'c3', name: 'Container 3 (Beds 13–18)', type: 'container' as const, containerId: 'c3', bedNumbers: [13, 14, 15, 16, 17, 18] },
    { id: 'c4', name: 'Container 4 (Beds 19–24)', type: 'container' as const, containerId: 'c4', bedNumbers: [19, 20, 21, 22, 23, 24] },
  ];

  // Current month date list for timeline
  const monthDates = useMemo(() => {
    const list: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      list.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    return list;
  }, [year, month, daysInMonth]);

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
      {/* Calendar Header with Navigation and Views */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#092D26] tracking-tight">
              Calendar
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#092D26] text-white">
              Availability Matrix
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Check live occupancy for Treehouses and 24 Bunkbed containers across all dates.
          </p>
        </div>

        {/* View Mode Switcher and Month Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggle: Month vs Timeline */}
          <div className="flex items-center bg-white/80 backdrop-blur-md border border-[#cce8dc] p-1 rounded-full text-xs shadow-sm">
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                viewMode === 'month' ? 'bg-[#092D26] text-white' : 'text-slate-600 hover:bg-emerald-50'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>Month</span>
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                viewMode === 'timeline' ? 'bg-[#092D26] text-white' : 'text-slate-600 hover:bg-emerald-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Timeline</span>
            </button>
          </div>

          {/* Month Navigation Controls */}
          <div className="flex items-center gap-1 bg-white/80 backdrop-blur-md border border-[#cce8dc] p-1 rounded-full shadow-sm text-xs">
            <button
              onClick={handlePrevMonth}
              aria-label="Previous Month"
              className="w-7 h-7 rounded-full hover:bg-emerald-50 flex items-center justify-center text-[#092D26] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold text-[#092D26] px-2 min-w-[120px] text-center">
              {monthName}
            </span>

            <button
              onClick={handleNextMonth}
              aria-label="Next Month"
              className="w-7 h-7 rounded-full hover:bg-emerald-50 flex items-center justify-center text-[#092D26] transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleTodayJump}
              className="px-2.5 py-1 text-[11px] font-bold bg-[#092D26] text-white rounded-full hover:bg-[#0c3c33] transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'month' ? (
        /* Month Grid Mode */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 flex flex-col gap-3">
            {/* Day of Week Header */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider py-1">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.map((day, idx) => {
                const status = getDayStatus(day.dateStr);
                const isSelected = inspectedDate === day.dateStr;
                const isToday = day.dateStr === getKolkataDateString();

                return (
                  <div
                    key={idx}
                    onClick={() => setInspectedDate(day.dateStr)}
                    className={`min-h-[105px] sm:min-h-[125px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#092D26] bg-[#ebf8f2] shadow-md ring-2 ring-[#092D26]/20'
                        : day.isCurrentMonth
                        ? 'border-[#cbebe0]/70 bg-white/70 hover:bg-white hover:border-emerald-300'
                        : 'border-slate-100 bg-slate-50/50 opacity-40'
                    }`}
                  >
                    {/* Date number & Today dot */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold ${
                          isToday
                            ? 'w-6 h-6 rounded-full bg-[#092D26] text-white flex items-center justify-center'
                            : isSelected
                            ? 'text-[#092D26]'
                            : 'text-slate-700'
                        }`}
                      >
                        {day.dayNum}
                      </span>

                      {status.bookings.length > 0 && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-[#092D26] text-white">
                          {status.bookings.length}
                        </span>
                      )}
                    </div>

                    {/* Accommodation Availability Indicators */}
                    <div className="flex flex-col gap-1 my-1">
                      {/* Treehouse dots */}
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 font-medium">Treehouses</span>
                        <div className="flex items-center gap-1">
                          <span
                            title={`Firefly: ${status.fireflyAvail ? 'Available' : 'Booked'}`}
                            className={`w-2 h-2 rounded-full ${
                              status.fireflyAvail ? 'bg-emerald-500' : 'bg-red-400'
                            }`}
                          />
                          <span
                            title={`Sunbird: ${status.sunbirdAvail ? 'Available' : 'Booked'}`}
                            className={`w-2 h-2 rounded-full ${
                              status.sunbirdAvail ? 'bg-emerald-500' : 'bg-red-400'
                            }`}
                          />
                          <span
                            title={`Woodpecker: ${status.woodpeckerAvail ? 'Available' : 'Booked'}`}
                            className={`w-2 h-2 rounded-full ${
                              status.woodpeckerAvail ? 'bg-emerald-500' : 'bg-red-400'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Bunkbeds count */}
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 font-medium">Beds</span>
                        <span
                          className={`font-bold ${
                            status.bunkbedsAvail > 0 ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          {status.bunkbedsAvail}/24
                        </span>
                      </div>
                    </div>

                    {/* Bottom Quick Indicator */}
                    <div className="text-[9px] text-slate-400 truncate">
                      {status.bunkbedsAvail === 24 && status.fireflyAvail && status.sunbirdAvail && status.woodpeckerAvail
                        ? 'Fully Free'
                        : status.bunkbedsAvail === 0 && !status.fireflyAvail && !status.sunbirdAvail && !status.woodpeckerAvail
                        ? 'Sold Out'
                        : 'Partial Avail'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Day Inspector Side Panel */}
          <div className="lg:col-span-4 bg-white rounded-3xl shadow-xl border border-emerald-100 p-5 flex flex-col gap-4 sticky top-6">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-50">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Day Inspector
                </span>
                <h3 className="text-base font-bold text-[#092D26]">
                  {new Date(inspectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </h3>
              </div>
              <button
                onClick={() => onNewBookingForDate(inspectedDate)}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#092D26] hover:bg-[#0c3c33] text-white flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Book Date</span>
              </button>
            </div>

            {/* Treehouse Breakdown */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Treehouse Availability
              </span>

              {/* Firefly */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#f5fbf8] border border-emerald-100 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      inspectedStatus.fireflyAvail ? 'bg-emerald-500' : 'bg-red-400'
                    }`}
                  />
                  <span className="font-bold text-[#092D26]">Firefly Treehouse</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-bold ${
                      inspectedStatus.fireflyAvail ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {inspectedStatus.fireflyAvail ? 'Available' : 'Booked'}
                  </span>
                  {inspectedStatus.fireflyAvail && (
                    <button
                      onClick={() => onNewBookingForDate(inspectedDate, 'firefly')}
                      className="text-[10px] font-bold text-emerald-800 hover:underline cursor-pointer"
                    >
                      Select
                    </button>
                  )}
                </div>
              </div>

              {/* Sunbird */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#f5fbf8] border border-emerald-100 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      inspectedStatus.sunbirdAvail ? 'bg-emerald-500' : 'bg-red-400'
                    }`}
                  />
                  <span className="font-bold text-[#092D26]">Sunbird Treehouse</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-bold ${
                      inspectedStatus.sunbirdAvail ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {inspectedStatus.sunbirdAvail ? 'Available' : 'Booked'}
                  </span>
                  {inspectedStatus.sunbirdAvail && (
                    <button
                      onClick={() => onNewBookingForDate(inspectedDate, 'sunbird')}
                      className="text-[10px] font-bold text-emerald-800 hover:underline cursor-pointer"
                    >
                      Select
                    </button>
                  )}
                </div>
              </div>

              {/* Woodpecker */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#f5fbf8] border border-emerald-100 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      inspectedStatus.woodpeckerAvail ? 'bg-emerald-500' : 'bg-red-400'
                    }`}
                  />
                  <span className="font-bold text-[#092D26]">Woodpecker Treehouse</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-bold ${
                      inspectedStatus.woodpeckerAvail ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {inspectedStatus.woodpeckerAvail ? 'Available' : 'Booked'}
                  </span>
                  {inspectedStatus.woodpeckerAvail && (
                    <button
                      onClick={() => onNewBookingForDate(inspectedDate, 'woodpecker')}
                      className="text-[10px] font-bold text-emerald-800 hover:underline cursor-pointer"
                    >
                      Select
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Bunkbeds Availability & Container Expansion */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Bunkbed Inventory ({inspectedStatus.bunkbedsAvail}/24 Free)
                </span>
                <button
                  onClick={() =>
                    setExpandedContainerDate(expandedContainerDate === inspectedDate ? null : inspectedDate)
                  }
                  className="text-[11px] font-bold text-[#092D26] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Containers</span>
                  {expandedContainerDate === inspectedDate ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {expandedContainerDate === inspectedDate && (
                <div className="grid grid-cols-2 gap-2 p-2 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-xs animate-in fade-in">
                  {inspectedStatus.containerBreakdown.map((c) => (
                    <div key={c.containerId} className="bg-white p-2 rounded-xl border border-slate-200">
                      <span className="font-bold text-[#092D26] block text-[11px]">{c.name}</span>
                      <span className="text-[10px] text-emerald-700 font-medium">
                        {c.available} of {c.total} beds free
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Bookings on this date */}
            <div className="flex flex-col gap-2 pt-2 border-t border-emerald-50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Active Reservations on this Date ({inspectedStatus.bookings.length})
              </span>

              {inspectedStatus.bookings.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  No active bookings occupying the night of {inspectedDate}.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto">
                  {inspectedStatus.bookings.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => onSelectBooking(b)}
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 transition-colors cursor-pointer text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-[#092D26] block">
                          {b.guestName}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {b.accommodationName} · {b.guestCount} guests
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800">
                        {formatINR(b.grandTotal)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Timeline Schedule Mode (Accommodation rows x Date columns) */
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-4 sm:p-6 shadow-sm border border-[#cce8dc] flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-50">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#092D26]" />
              <h3 className="text-sm font-bold text-[#092D26]">Accommodation Gantt Timeline</h3>
              <span className="text-xs text-slate-500">
                · Continuous stays [check-in, check-out)
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {daysInMonth} Days in {monthName}
            </span>
          </div>

          {/* Timeline Table with internal horizontal scroll (prevents page overflow) */}
          <div className="overflow-x-auto border border-emerald-100 rounded-2xl pb-2">
            <div className="min-w-[980px]">
              {/* Header row with dates */}
              <div className="grid grid-cols-[200px_repeat(31,minmax(32px,1fr))] bg-[#f5fbf8] border-b border-emerald-100 text-center text-[10px] font-bold text-slate-600">
                <div className="p-2 text-left pl-3 text-[#092D26]">Accommodation</div>
                {monthDates.map((dateStr, idx) => {
                  const dayNum = idx + 1;
                  const isToday = dateStr === getKolkataDateString();
                  return (
                    <div
                      key={dateStr}
                      className={`p-1.5 border-l border-emerald-100/60 flex flex-col items-center justify-center ${
                        isToday ? 'bg-emerald-200/50 text-[#092D26] font-extrabold' : ''
                      }`}
                    >
                      <span>{dayNum}</span>
                    </div>
                  );
                })}
              </div>

              {/* Rows for Treehouses and Containers */}
              {timelineRows.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[200px_repeat(31,minmax(32px,1fr))] border-b border-emerald-50 hover:bg-emerald-50/20 text-xs items-center relative"
                >
                  {/* Row label */}
                  <div className="p-3 pl-3 font-semibold text-[#092D26] truncate bg-white sticky left-0 z-10 border-r border-emerald-100 shadow-2xs">
                    {row.name}
                  </div>

                  {/* Day cells */}
                  {monthDates.map((dateStr) => {
                    const matchingBooking = bookings.find((b) => {
                      if (!isInventoryReservingBooking(b)) return false;
                      if (!(b.checkInDate <= dateStr && b.checkOutDate > dateStr)) return false;

                      if (row.type === 'treehouse') {
                        return b.accommodationId === row.id;
                      } else {
                        // container check: check if any bed in this container is booked
                        if (b.accommodationId !== 'bunkbeds') return false;
                        if (b.bedNumbers && b.bedNumbers.length > 0) {
                          return b.bedNumbers.some((bed) => row.bedNumbers?.includes(bed));
                        }
                        return false;
                      }
                    });

                    return (
                      <div
                        key={dateStr}
                        onClick={() => {
                          if (matchingBooking) {
                            onSelectBooking(matchingBooking);
                          } else {
                            onNewBookingForDate(
                              dateStr,
                              row.type === 'treehouse' ? (row.id as AccommodationId) : 'bunkbeds'
                            );
                          }
                        }}
                        className={`h-11 border-l border-emerald-100/40 p-0.5 flex items-center justify-center cursor-pointer transition-colors ${
                          matchingBooking
                            ? 'bg-emerald-800 text-white font-bold text-[9px] hover:bg-emerald-900'
                            : 'hover:bg-emerald-100/50'
                        }`}
                        title={
                          matchingBooking
                            ? `${matchingBooking.bookingNumber} (${matchingBooking.guestName}) - Click to view`
                            : `Free on ${dateStr} - Click to book`
                        }
                      >
                        {matchingBooking && (
                          <span className="truncate px-0.5">
                            {matchingBooking.bookingNumber.replace('EA-', '')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
