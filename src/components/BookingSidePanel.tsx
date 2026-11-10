import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  Phone,
  User,
  Utensils,
  CreditCard,
  Edit3,
  Calendar,
  AlertCircle,
  Tag,
  DollarSign,
  ArrowUpRight,
  Trash2,
  Ban,
} from 'lucide-react';
import { Booking, ACCOMMODATIONS } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useResort } from '../context/ResortContext.tsx';
import { formatINR } from '../utils/pricing.ts';

interface BookingSidePanelProps {
  booking: Booking | null;
  onClose: () => void;
  onOpenEditModal: (booking: Booking) => void;
  onOpenPaymentModal: (booking: Booking) => void;
  onOpenCancelModal: (booking: Booking) => void;
  onOpenDeleteModal: (booking: Booking) => void;
}

export const BookingSidePanel: React.FC<BookingSidePanelProps> = ({
  booking,
  onClose,
  onOpenEditModal,
  onOpenPaymentModal,
  onOpenCancelModal,
  onOpenDeleteModal,
}) => {
  const { isAdmin } = useAuth();
  const { updateBookingStatus } = useResort();
  const [updatingStatus, setUpdatingStatus] = useState(false);

  if (!booking) {
    return (
      <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-[#cce8dc]/70 shadow-xl flex flex-col items-center justify-center text-center min-h-[500px]">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-800 mb-4">
          <Calendar className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-[#092D26]">No Booking Selected</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
          Select any reservation from the arrivals or bookings table to inspect guest details, payments, and food orders.
        </p>
      </div>
    );
  }

  const accomm = ACCOMMODATIONS.find((a) => a.id === booking.accommodationId) || ACCOMMODATIONS[0];
  const isCancelled = booking.bookingStatus === 'cancelled';

  const handleNextStatus = async () => {
    setUpdatingStatus(true);
    try {
      if (booking.bookingStatus === 'confirmed') {
        await updateBookingStatus(booking.id, 'checked_in');
      } else if (booking.bookingStatus === 'checked_in') {
        await updateBookingStatus(booking.id, 'checked_out');
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <aside
      aria-label="Booking Details"
      className="bg-white rounded-3xl shadow-xl border border-slate-100 p-5 flex flex-col gap-4 sticky top-6 text-[#1C3048] animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Hero Accommodation Banner (Image 1 top right card) */}
      <div className="relative w-full h-48 sm:h-52 rounded-2xl overflow-hidden shadow-sm group">
        <img
          src={accomm.image}
          alt={accomm.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Top Floating Pill Badge & Close Button */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between">
          <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-white/90 backdrop-blur-md text-[#092D26] shadow-sm">
            {accomm.badge}
          </span>
          <button
            onClick={onClose}
            aria-label="Close Booking Details"
            className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Accommodation Info Overlay */}
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <h4 className="text-sm font-bold tracking-tight leading-tight drop-shadow-sm">
            {booking.accommodationName}
          </h4>
          <p className="text-[11px] text-white/80 font-medium">
            {accomm.wing} · {booking.guestCount} {booking.guestCount === 1 ? 'guest' : 'guests'}
          </p>
        </div>
      </div>

      {/* Guest Name & Subtitle */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-[#092D26] tracking-tight leading-tight">
            {booking.guestName}
          </h3>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isCancelled
                ? 'bg-red-100 text-red-900 border border-red-200'
                : booking.bookingStatus === 'checked_in'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                : booking.bookingStatus === 'checked_out'
                ? 'bg-slate-100 text-slate-700 border border-slate-200'
                : 'bg-teal-50 text-teal-800 border border-teal-200'
            }`}
          >
            {booking.bookingStatus.replace('_', ' ')}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {booking.checkInDate} to {booking.checkOutDate} · {booking.nights} {booking.nights === 1 ? 'night' : 'nights'} · Ref #{booking.bookingNumber}
        </p>
        {booking.guestPhone && (
          <p className="text-[11px] text-emerald-800 font-medium mt-0.5 flex items-center gap-1">
            <Phone className="w-3 h-3 text-emerald-600" />
            <span>{booking.guestPhone}</span>
          </p>
        )}
      </div>

      {/* 3 Metric Tiles (Grand Total, Advance Paid, Remaining Balance) */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#f5fbf8] border border-[#d8f0e5] rounded-2xl p-3 flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Grand Total</span>
          <span className="text-sm font-extrabold text-[#092D26] mt-0.5">
            {formatINR(booking.grandTotal)}
          </span>
          <span className="text-[9px] text-slate-400 mt-0.5">
            {booking.isHolidayPricing ? 'Holiday Rates' : 'Standard Rates'}
          </span>
        </div>

        <div className="bg-[#f5fbf8] border border-[#d8f0e5] rounded-2xl p-3 flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Advance Paid</span>
          <span className="text-sm font-extrabold text-emerald-700 mt-0.5">
            {formatINR(booking.advancePaid || 0)}
          </span>
          <span className="text-[9px] text-emerald-600 font-medium mt-0.5">
            {booking.paymentStatus === 'paid' ? 'Fully Settled' : 'Installment'}
          </span>
        </div>

        <div className="bg-[#f5fbf8] border border-[#d8f0e5] rounded-2xl p-3 flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remaining</span>
          <span className={`text-sm font-extrabold mt-0.5 ${booking.remainingAmount > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
            {formatINR(booking.remainingAmount)}
          </span>
          <span className="text-[9px] text-slate-400 mt-0.5">
            {booking.remainingAmount > 0 ? 'Pending' : 'Zero Balance'}
          </span>
        </div>
      </div>

      {/* Food Plan / Kitchen Alert Banner */}
      <div className="bg-[#ddf5e8]/80 border border-[#bfead2] rounded-2xl p-3 flex items-start gap-2.5">
        <Utensils className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-bold text-[#092D26] leading-tight">
            {booking.foodAvailed ? 'Food Service Availed' : 'No Food Service Availed'}
          </p>
          {booking.foodAvailed && booking.foodDetails ? (
            <p className="text-[11px] text-emerald-950/80 mt-0.5 leading-snug">
              {booking.foodDetails.vegCount} Vegetarian (₹{booking.foodDetails.vegPrice}),{' '}
              {booking.foodDetails.nonVegCount} Non-Vegetarian (₹{booking.foodDetails.nonVegPrice})
              {booking.foodDetails.noFoodCount > 0 && ` · ${booking.foodDetails.noFoodCount} not taking food`}
              {' '}· Total food: {formatINR(booking.foodDetails.totalFoodCharge)}.
            </p>
          ) : (
            <p className="text-[11px] text-emerald-900/70 mt-0.5">
              Accommodation only. Food charges = ₹0 (no service charge applied).
            </p>
          )}
        </div>
      </div>

      {/* Preferences / Tags */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Preferences & Details
        </span>
        <div className="flex flex-wrap gap-1.5">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#f0f8f4] text-[#1C3048] border border-[#d2ebe0]">
            {booking.accommodationId === 'bunkbeds'
              ? `Bunkbeds: ${(booking.bedNumbers || []).join(', ') || `${booking.guestCount} beds`}`
              : `${booking.guestCount} Guests · ${accomm.wing}`}
          </span>
          {booking.discountAmount > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200">
              Discount: {booking.discountType === 'percentage' ? `${booking.discountValue}%` : formatINR(booking.discountAmount)}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#f0f8f4] text-[#1C3048] border border-[#d2ebe0]">
            10% Service Charge ({formatINR(booking.serviceChargeAmount)})
          </span>
          {booking.preferences?.map((pref, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#f0f8f4] text-[#1C3048] border border-[#d2ebe0]"
            >
              {pref}
            </span>
          ))}
        </div>
      </div>

      {/* Guest Feedback / Notes Quote */}
      {booking.notes && (
        <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Booking Notes
          </span>
          <p className="text-xs text-slate-700 italic font-serif leading-relaxed">
            "{booking.notes}"
          </p>
        </div>
      )}

      {/* Attribution & Team Source */}
      <div className="text-[11px] text-slate-500 bg-[#f7faf8] rounded-xl p-2.5 border border-[#e2efe8] flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span>Booking Source:</span>
          <span className="font-semibold text-[#092D26]">
            {booking.bookingSourceMemberName || 'Staff Member'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Created by:</span>
          <span className="font-medium text-slate-700">{booking.createdByName || 'Staff Member'}</span>
        </div>
        {booking.cancelledAt && (
          <div className="flex items-center justify-between text-red-700 pt-1 border-t border-red-100">
            <span>Cancelled At:</span>
            <span>{new Date(booking.cancelledAt).toLocaleDateString()} by {booking.cancelledBy || 'Staff'}</span>
          </div>
        )}
      </div>

      {/* Primary Status Progression Button */}
      {!isCancelled && (
        <div className="flex items-center gap-2 pt-1">
          {booking.bookingStatus === 'confirmed' && (
            <button
              onClick={handleNextStatus}
              disabled={updatingStatus}
              className="flex-1 bg-[#092D26] hover:bg-[#0c3c33] text-white text-xs font-bold py-2.5 px-4 rounded-full transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Mark Checked In</span>
            </button>
          )}

          {booking.bookingStatus === 'checked_in' && (
            <button
              onClick={handleNextStatus}
              disabled={updatingStatus}
              className="flex-1 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold py-2.5 px-4 rounded-full transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark Checked Out</span>
            </button>
          )}

          {booking.bookingStatus === 'checked_out' && (
            <div className="flex-1 text-center py-2 text-xs font-semibold text-slate-500 bg-slate-100 rounded-full">
              Stay Completed
            </div>
          )}

          {/* Add Payment Installment Button */}
          {booking.remainingAmount > 0 && (
            <button
              onClick={() => onOpenPaymentModal(booking)}
              className="flex-1 bg-white hover:bg-emerald-50 text-[#092D26] border border-[#cce8dc] text-xs font-bold py-2.5 px-4 rounded-full transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
              <span>Add Payment</span>
            </button>
          )}
        </div>
      )}

      {/* Secondary Actions Toolbar: Edit, Cancel, Delete */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <button
          onClick={() => onOpenEditModal(booking)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#092D26] bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
          <span>Edit Booking</span>
        </button>

        <div className="flex items-center gap-1.5">
          {!isCancelled && (
            <button
              onClick={() => onOpenCancelModal(booking)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5 text-amber-700" />
              <span>Cancel</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => onOpenDeleteModal(booking)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
              title="Delete Reservation (Admin Only)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
