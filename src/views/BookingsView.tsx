import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Filter,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Trash2,
  Edit3,
  Ban,
} from 'lucide-react';
import { Booking, AccommodationId, ACCOMMODATIONS } from '../types/index.ts';
import { useResort } from '../context/ResortContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { BookingSidePanel } from '../components/BookingSidePanel.tsx';
import { formatINR } from '../utils/pricing.ts';

interface BookingsViewProps {
  onNewBookingClick: () => void;
  onOpenEditModal: (booking: Booking) => void;
  onOpenPaymentModal: (booking: Booking) => void;
  onOpenCancelModal: (booking: Booking) => void;
  onOpenDeleteModal: (booking: Booking) => void;
}

export const BookingsView: React.FC<BookingsViewProps> = ({
  onNewBookingClick,
  onOpenEditModal,
  onOpenPaymentModal,
  onOpenCancelModal,
  onOpenDeleteModal,
}) => {
  const { bookings, selectedBooking, setSelectedBooking } = useResort();
  const { isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterAccommodation, setFilterAccommodation] = useState<string>('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all');
  const [filterBookingStatus, setFilterBookingStatus] = useState<string>('all');

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (filterAccommodation !== 'all' && b.accommodationId !== filterAccommodation) return false;
      if (filterPaymentStatus !== 'all' && b.paymentStatus !== filterPaymentStatus) return false;
      if (filterBookingStatus !== 'all' && b.bookingStatus !== filterBookingStatus) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNumber = b.bookingNumber.toLowerCase().includes(q);
        const matchesAccomm = b.accommodationName.toLowerCase().includes(q);
        const matchesSource = (b.bookingSourceMemberName || '').toLowerCase().includes(q);
        const matchesName = (b.guestName || '').toLowerCase().includes(q);
        const matchesPhone = (b.guestPhone || '').includes(q);

        if (!matchesNumber && !matchesAccomm && !matchesSource && !matchesName && !matchesPhone) {
          return false;
        }
      }

      return true;
    });
  }, [
    bookings,
    filterAccommodation,
    filterPaymentStatus,
    filterBookingStatus,
    searchQuery,
  ]);

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
      {/* Header and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#092D26] tracking-tight">
              Reservations
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#092D26] text-white">
              {bookings.length} Total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Complete inventory records, financial snapshots & guest allocations.
          </p>
        </div>

        <button
          onClick={onNewBookingClick}
          className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#092D26] hover:bg-[#0c3c33] text-white flex items-center gap-2 self-start sm:self-auto shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4 text-emerald-300" />
          <span>New Reservation</span>
        </button>
      </div>

      {/* Main Grid: Left Table, Right Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          {/* Filters Bar */}
          <div className="bg-white/80 backdrop-blur-md border border-[#cce8dc]/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2.5 shadow-sm text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterAccommodation}
                onChange={(e) => setFilterAccommodation(e.target.value)}
                className="bg-white px-3 py-1.5 rounded-full border border-slate-200 outline-none text-slate-700 font-medium"
              >
                <option value="all">All Accommodations</option>
                <option value="firefly">Firefly Treehouse</option>
                <option value="sunbird">Sunbird Treehouse</option>
                <option value="woodpecker">Woodpecker Treehouse</option>
                <option value="bunkbeds">Bunkbeds (24 Beds)</option>
              </select>

              <select
                value={filterPaymentStatus}
                onChange={(e) => setFilterPaymentStatus(e.target.value)}
                className="bg-white px-3 py-1.5 rounded-full border border-slate-200 outline-none text-slate-700 font-medium"
              >
                <option value="all">All Payment Statuses</option>
                <option value="paid">Fully Paid</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>

              <select
                value={filterBookingStatus}
                onChange={(e) => setFilterBookingStatus(e.target.value)}
                className="bg-white px-3 py-1.5 rounded-full border border-slate-200 outline-none text-slate-700 font-medium"
              >
                <option value="all">All Stay Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="checked_in">Checked In</option>
                <option value="checked_out">Checked Out</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search booking #, room, guest..."
                className="bg-white pl-8 pr-3 py-1.5 rounded-full border border-slate-200 outline-none w-48 sm:w-56 text-[#092D26]"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-[#f4fbf8]/80 backdrop-blur-md rounded-3xl p-4 shadow-sm border border-[#cbebe0]/70 overflow-hidden">
            {filteredBookings.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center">
                <Calendar className="w-10 h-10 text-emerald-800 mb-2 opacity-60" />
                <h4 className="text-sm font-bold text-[#092D26]">No Bookings Found</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Adjust filters or create a new reservation for Earthalive.
                </p>
                <button
                  onClick={onNewBookingClick}
                  className="mt-4 px-5 py-2 rounded-full text-xs font-bold bg-[#092D26] hover:bg-[#0c3c33] text-white flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Create Booking</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-[#e2efe8]">
                      <th className="py-2.5 px-3">Ref & Guest</th>
                      <th className="py-2.5 px-2">Accommodation</th>
                      <th className="py-2.5 px-2">Dates</th>
                      <th className="py-2.5 px-2">Guests</th>
                      <th className="py-2.5 px-2">Total Amount</th>
                      <th className="py-2.5 px-2">Advance</th>
                      <th className="py-2.5 px-2">Balance</th>
                      <th className="py-2.5 px-2">Status</th>
                      <th className="py-2.5 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8f4ee]">
                    {filteredBookings.map((b) => {
                      const isSelected = selectedBooking?.id === b.id;
                      const isCancelled = b.bookingStatus === 'cancelled';

                      return (
                        <tr
                          key={b.id}
                          onClick={() => setSelectedBooking(b)}
                          className={`cursor-pointer transition-all ${
                            isSelected ? 'bg-[#e2f5ee] font-medium' : 'hover:bg-white/60'
                          } ${isCancelled ? 'opacity-60 bg-slate-50/50' : ''}`}
                        >
                          <td className="py-3 px-3">
                            <span className="font-bold text-[#092D26] block leading-tight">
                              {b.guestName}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {b.bookingNumber}
                            </span>
                          </td>

                          <td className="py-3 px-2 font-medium text-slate-800">
                            {b.accommodationId === 'bunkbeds'
                              ? `Bunkbeds (${b.bedNumbers?.length || b.guestCount} beds)`
                              : b.accommodationName}
                          </td>

                          <td className="py-3 px-2 text-slate-600 whitespace-nowrap">
                            {b.checkInDate.slice(5)} → {b.checkOutDate.slice(5)} ({b.nights}n)
                          </td>

                          <td className="py-3 px-2 text-slate-700">
                            {b.guestCount}
                          </td>

                          <td className="py-3 px-2 font-bold text-[#092D26]">
                            {formatINR(b.grandTotal)}
                          </td>

                          <td className="py-3 px-2 text-emerald-700 font-semibold">
                            {formatINR(b.advancePaid || 0)}
                          </td>

                          <td className="py-3 px-2 font-semibold">
                            <span className={b.remainingAmount > 0 ? 'text-amber-700' : 'text-slate-500'}>
                              {formatINR(b.remainingAmount)}
                            </span>
                          </td>

                          <td className="py-3 px-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isCancelled
                                  ? 'bg-red-100 text-red-900 border border-red-200'
                                  : b.bookingStatus === 'checked_in'
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                  : b.paymentStatus === 'paid'
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {b.bookingStatus}
                            </span>
                          </td>

                          <td className="py-3 px-2 text-right">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              {/* Edit Button */}
                              <button
                                onClick={() => onOpenEditModal(b)}
                                aria-label={`Edit ${b.bookingNumber}`}
                                className="w-7 h-7 rounded-full text-slate-600 hover:text-[#092D26] hover:bg-emerald-100 flex items-center justify-center transition-colors cursor-pointer"
                                title="Edit Booking"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Cancel Button */}
                              {!isCancelled && (
                                <button
                                  onClick={() => onOpenCancelModal(b)}
                                  aria-label={`Cancel ${b.bookingNumber}`}
                                  className="w-7 h-7 rounded-full text-amber-700 hover:bg-amber-100 flex items-center justify-center transition-colors cursor-pointer"
                                  title="Cancel Booking"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Admin Delete Button */}
                              {isAdmin && (
                                <button
                                  onClick={() => onOpenDeleteModal(b)}
                                  aria-label={`Delete ${b.bookingNumber}`}
                                  className="w-7 h-7 rounded-full text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors cursor-pointer"
                                  title="Delete Booking (Admin Only)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* View Detail Arrow */}
                              <button
                                onClick={() => setSelectedBooking(b)}
                                aria-label={`View ${b.bookingNumber}`}
                                className="w-7 h-7 rounded-full bg-white/80 hover:bg-[#092D26] hover:text-white flex items-center justify-center text-slate-700 transition-colors shadow-xs ml-0.5 cursor-pointer"
                              >
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Detail Card */}
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
