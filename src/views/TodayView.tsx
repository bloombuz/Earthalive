import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
  AlertCircle,
  ChevronDown,
  Layers,
  User,
  Plus,
} from 'lucide-react';
import { Booking, AccommodationId, ACCOMMODATIONS } from '../types/index.ts';
import { useResort } from '../context/ResortContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { BookingSidePanel } from '../components/BookingSidePanel.tsx';
import { formatINR } from '../utils/pricing.ts';
import { getKolkataDateString, isInventoryReservingBooking } from '../utils/availability.ts';

interface TodayViewProps {
  onNewBookingClick: () => void;
  onOpenEditModal: (booking: Booking) => void;
  onOpenPaymentModal: (booking: Booking) => void;
  onOpenCancelModal: (booking: Booking) => void;
  onOpenDeleteModal: (booking: Booking) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  onNewBookingClick,
  onOpenEditModal,
  onOpenPaymentModal,
  onOpenCancelModal,
  onOpenDeleteModal,
}) => {
  const { bookings, selectedBooking, setSelectedBooking } = useResort();

  const [activeSubTab, setActiveSubTab] = useState<'all' | 'arrivals' | 'departures' | 'in_house'>('arrivals');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccommodation, setSelectedAccommodation] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const todayStr = useMemo(() => getKolkataDateString(), []);

  // Filter today's operational arrivals and departures
  const todayArrivals = useMemo(() => {
    return bookings.filter(
      (b) => b.checkInDate === todayStr && isInventoryReservingBooking(b)
    );
  }, [bookings, todayStr]);

  const todayDepartures = useMemo(() => {
    return bookings.filter(
      (b) => b.checkOutDate === todayStr && isInventoryReservingBooking(b)
    );
  }, [bookings, todayStr]);

  const currentInHouse = useMemo(() => {
    return bookings.filter(
      (b) =>
        isInventoryReservingBooking(b) &&
        (b.bookingStatus === 'checked_in' || (b.checkInDate <= todayStr && b.checkOutDate > todayStr))
    );
  }, [bookings, todayStr]);

  // Operational metrics for the pill badges
  const occupiedTreehousesCount = useMemo(() => {
    const activeTreehouseBookings = bookings.filter(
      (b) =>
        b.accommodationId !== 'bunkbeds' &&
        isInventoryReservingBooking(b) &&
        b.checkInDate <= todayStr &&
        b.checkOutDate > todayStr
    );
    return activeTreehouseBookings.length;
  }, [bookings, todayStr]);

  const availableBedsToday = useMemo(() => {
    let booked = 0;
    bookings.forEach((b) => {
      if (
        b.accommodationId === 'bunkbeds' &&
        isInventoryReservingBooking(b) &&
        b.checkInDate <= todayStr &&
        b.checkOutDate > todayStr
      ) {
        booked += b.bedNumbers?.length || b.guestCount || 1;
      }
    });
    return Math.max(0, 24 - booked);
  }, [bookings, todayStr]);

  const pendingPaymentsCount = useMemo(() => {
    return bookings.filter(
      (b) => b.remainingAmount > 0 && isInventoryReservingBooking(b)
    ).length;
  }, [bookings]);

  // Filter table list
  const filteredList = useMemo(() => {
    let list = bookings.filter((b) => b.bookingStatus !== 'cancelled');

    if (activeSubTab === 'arrivals') {
      list = list.filter((b) => b.checkInDate === todayStr || b.bookingStatus === 'confirmed');
    } else if (activeSubTab === 'departures') {
      list = list.filter((b) => b.checkOutDate === todayStr || b.bookingStatus === 'checked_in');
    } else if (activeSubTab === 'in_house') {
      list = list.filter((b) => b.bookingStatus === 'checked_in');
    }

    if (selectedAccommodation !== 'all') {
      list = list.filter((b) => b.accommodationId === selectedAccommodation);
    }

    if (selectedStatus !== 'all') {
      list = list.filter((b) => b.bookingStatus === selectedStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (b) =>
          b.bookingNumber.toLowerCase().includes(q) ||
          b.accommodationName.toLowerCase().includes(q) ||
          (b.guestName || '').toLowerCase().includes(q) ||
          (b.guestPhone || '').includes(q)
      );
    }

    return list;
  }, [bookings, activeSubTab, todayStr, selectedAccommodation, selectedStatus, searchQuery]);

  const formattedToday = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, []);

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
      {/* Top Section Heading & Operational KPI Pills (Recreating Reference Image 1) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#092D26] tracking-tight">
              Arrivals
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#092D26] text-white shadow-sm">
              {todayArrivals.length} today
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {formattedToday}. Peak check-in between 12:00 and 15:00 · Bangalore Forest Sanctuary.
          </p>
        </div>

        {/* Compact KPI Indicators in Rounded Pills (Replicating Image 1 pills) */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          <div className="bg-white/80 backdrop-blur-md border border-[#cce8dc] px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-sm text-xs">
            <span className="w-5 h-5 rounded-full bg-[#092D26] text-white flex items-center justify-center text-[10px] font-bold">
              {todayArrivals.length}
            </span>
            <span className="font-semibold text-[#092D26]">Arrivals</span>
          </div>

          <div className="bg-white/80 backdrop-blur-md border border-[#cce8dc] px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-sm text-xs">
            <span className="w-5 h-5 rounded-full bg-emerald-800 text-white flex items-center justify-center text-[10px] font-bold">
              {occupiedTreehousesCount}/3
            </span>
            <span className="font-semibold text-[#092D26]">Treehouses booked</span>
          </div>

          <div className="bg-white/80 backdrop-blur-md border border-[#cce8dc] px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-sm text-xs">
            <span className="w-5 h-5 rounded-full bg-teal-800 text-white flex items-center justify-center text-[10px] font-bold">
              {availableBedsToday}
            </span>
            <span className="font-semibold text-[#092D26]">Available beds</span>
          </div>

          <div className="bg-white/80 backdrop-blur-md border border-[#cce8dc] px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-sm text-xs">
            <span className="w-5 h-5 rounded-full bg-amber-700 text-white flex items-center justify-center text-[10px] font-bold">
              {pendingPaymentsCount}
            </span>
            <span className="font-semibold text-[#092D26]">Pending Balances</span>
          </div>
        </div>
      </div>

      {/* Main Content Layout Split: Left Translucent Table & Right Selected Guest Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Translucent Table Container */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          {/* Sub-navigation tabs & filter controls (Matching Image 1 filter row) */}
          <div className="bg-white/80 backdrop-blur-md border border-[#cce8dc]/80 rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setActiveSubTab('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                  activeSubTab === 'all'
                    ? 'bg-[#092D26] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-emerald-50'
                }`}
              >
                All {bookings.length}
              </button>
              <button
                onClick={() => setActiveSubTab('arrivals')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                  activeSubTab === 'arrivals'
                    ? 'bg-[#092D26] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-emerald-50'
                }`}
              >
                Arrivals {todayArrivals.length}
              </button>
              <button
                onClick={() => setActiveSubTab('departures')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                  activeSubTab === 'departures'
                    ? 'bg-[#092D26] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-emerald-50'
                }`}
              >
                Departures {todayDepartures.length}
              </button>
              <button
                onClick={() => setActiveSubTab('in_house')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                  activeSubTab === 'in_house'
                    ? 'bg-[#092D26] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-emerald-50'
                }`}
              >
                In-house {currentInHouse.length}
              </button>
            </div>

            {/* Dropdown Filters & Search */}
            <div className="flex items-center gap-2 flex-grow sm:flex-grow-0 justify-end">
              <select
                value={selectedAccommodation}
                onChange={(e) => setSelectedAccommodation(e.target.value)}
                className="bg-white/90 border border-slate-200 text-slate-700 text-xs px-2.5 py-1.5 rounded-full outline-none font-medium"
              >
                <option value="all">Accommodation ▾</option>
                <option value="firefly">Firefly Treehouse</option>
                <option value="sunbird">Sunbird Treehouse</option>
                <option value="woodpecker">Woodpecker Treehouse</option>
                <option value="bunkbeds">Bunkbeds (24 Beds)</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search guest or room..."
                  className="bg-white/90 pl-8 pr-3 py-1.5 text-xs rounded-full border border-slate-200 focus:border-emerald-600 outline-none w-36 sm:w-48 text-[#092D26]"
                />
              </div>
            </div>
          </div>

          {/* Translucent Table (Image 1 table styling) */}
          <div className="bg-[#f4fbf8]/80 backdrop-blur-md rounded-3xl p-3 sm:p-4 shadow-sm border border-[#cbebe0]/70 overflow-hidden">
            {filteredList.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-800 mb-3">
                  <Calendar className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-[#092D26]">No Reservations Found</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  {searchQuery
                    ? 'No bookings match your current search criteria.'
                    : 'Earthalive has no guest reservations scheduled for this view.'}
                </p>
                <button
                  onClick={onNewBookingClick}
                  className="mt-4 px-5 py-2 rounded-full text-xs font-bold bg-[#092D26] hover:bg-[#0c3c33] text-white flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Create First Booking</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-[#e2efe8] pb-2">
                      <th className="py-2.5 px-3">Guest</th>
                      <th className="py-2.5 px-2">Ref Code</th>
                      <th className="py-2.5 px-2">Dates</th>
                      <th className="py-2.5 px-2">Room / Bed</th>
                      <th className="py-2.5 px-2">Status</th>
                      <th className="py-2.5 px-2">Food / Notes</th>
                      <th className="py-2.5 px-2">Attribution</th>
                      <th className="py-2.5 px-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8f4ee]">
                    {filteredList.map((b) => {
                      const isSelected = selectedBooking?.id === b.id;
                      const accomm = ACCOMMODATIONS.find((a) => a.id === b.accommodationId) || ACCOMMODATIONS[0];

                      return (
                        <tr
                          key={b.id}
                          onClick={() => setSelectedBooking(b)}
                          className={`cursor-pointer transition-all duration-150 group ${
                            isSelected
                              ? 'bg-[#e2f5ee] rounded-2xl shadow-sm'
                              : 'hover:bg-white/60'
                          }`}
                        >
                          {/* Guest thumbnail & Name */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={accomm.image}
                                alt=""
                                className="w-9 h-9 rounded-xl object-cover shrink-0 shadow-xs border border-white"
                              />
                              <div>
                                <span className="font-bold text-[#092D26] block leading-tight">
                                  {b.guestName}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {b.guestCount} {b.guestCount === 1 ? 'guest' : 'guests'} · {formatINR(b.grandTotal)}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Ref code badge */}
                          <td className="py-3 px-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#092D26] text-white font-mono">
                              {b.bookingNumber}
                            </span>
                          </td>

                          {/* Dates */}
                          <td className="py-3 px-2 font-medium text-slate-700 whitespace-nowrap">
                            {b.checkInDate.slice(5)} → {b.checkOutDate.slice(5)}
                          </td>

                          {/* Room */}
                          <td className="py-3 px-2">
                            <span className="font-semibold text-[#092D26] block leading-tight">
                              {b.accommodationId === 'bunkbeds'
                                ? `Bunkbeds (${b.bedNumbers?.length || b.guestCount} beds)`
                                : b.accommodationName}
                            </span>
                            <span className="text-[10px] text-slate-500">{accomm.wing}</span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                                b.bookingStatus === 'checked_in'
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                  : b.bookingStatus === 'checked_out'
                                  ? 'bg-slate-200 text-slate-700'
                                  : 'bg-teal-50 text-teal-800 border border-teal-200'
                              }`}
                            >
                              {b.bookingStatus === 'checked_in'
                                ? 'Checked In'
                                : b.bookingStatus === 'checked_out'
                                ? 'Departed'
                                : 'Ready'}
                            </span>
                          </td>

                          {/* Food / Preference */}
                          <td className="py-3 px-2 text-slate-600 max-w-[130px] truncate text-[11px]">
                            {b.foodAvailed
                              ? `${b.foodDetails.vegCount}V / ${b.foodDetails.nonVegCount}NV food`
                              : 'Room only'}
                          </td>

                          {/* Attribution */}
                          <td className="py-3 px-2 text-slate-700 font-medium whitespace-nowrap text-[11px]">
                            {b.bookingSourceMemberName?.split(' ')[0] || 'Staff'}
                          </td>

                          {/* Arrow Action */}
                          <td className="py-3 px-2 text-right">
                            <button
                              aria-label={`View details for ${b.guestName}`}
                              className="w-7 h-7 rounded-full bg-white/70 hover:bg-[#092D26] hover:text-white flex items-center justify-center text-slate-600 transition-colors shadow-xs ml-auto cursor-pointer"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table Footer Summary */}
            <div className="pt-3 mt-2 border-t border-[#e2efe8] flex items-center justify-between text-[11px] text-slate-500 px-2">
              <span>Showing {filteredList.length} of {bookings.length} reservations</span>
              <span className="text-emerald-800 font-medium">Asia/Kolkata Timezone · Realtime</span>
            </div>
          </div>
        </div>

        {/* Right Selected Guest Detail Card (Matching Reference Image 1) */}
        <div className="lg:col-span-5 xl:col-span-4">
          <BookingSidePanel
            booking={selectedBooking}
            onClose={() => setSelectedBooking(null)}
            onOpenEditModal={onOpenEditModal}
            onOpenPaymentModal={onOpenPaymentModal}
            onOpenCancelModal={onOpenCancelModal}
            onOpenDeleteModal={onOpenDeleteModal}
          />
        </div>
      </div>
    </div>
  );
};
