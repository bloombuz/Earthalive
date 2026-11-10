import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Percent,
  Utensils,
  Sparkles,
  Calendar,
  User,
  Phone,
  Home,
} from 'lucide-react';
import { Booking, AccommodationId, ACCOMMODATIONS } from '../types/index.ts';
import { useResort } from '../context/ResortContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import {
  calculateBookingPrice,
  formatINR,
  validateAccommodationCapacity,
  validateHolidayPricing,
} from '../utils/pricing.ts';
import {
  calculateNights,
  checkAccommodationAvailability,
  addDays,
} from '../utils/availability.ts';

interface EditBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
}

export const EditBookingModal: React.FC<EditBookingModalProps> = ({
  isOpen,
  onClose,
  booking,
}) => {
  const { updateBooking, pricingConfig, bookings, maintenanceBlocks } = useResort();
  const { allStaffUsers } = useAuth();

  const [guestName, setGuestName] = useState(booking?.guestName || '');
  const [guestPhone, setGuestPhone] = useState(booking?.guestPhone || '');
  const [checkInDate, setCheckInDate] = useState(booking?.checkInDate || '');
  const [checkOutDate, setCheckOutDate] = useState(booking?.checkOutDate || '');
  const [accommodationId, setAccommodationId] = useState<AccommodationId>(booking?.accommodationId || 'firefly');
  const [guestCount, setGuestCount] = useState(booking?.guestCount || 2);
  const [isHolidayPricing, setIsHolidayPricing] = useState(booking?.isHolidayPricing || false);
  const [hasDiscount, setHasDiscount] = useState((booking?.discountAmount || 0) > 0 || (booking?.discountValue || 0) > 0);
  const [discountType, setDiscountType] = useState(booking?.discountType || 'none');
  const [discountValue, setDiscountValue] = useState(booking?.discountValue || 0);
  const [foodAvailed, setFoodAvailed] = useState(booking?.foodAvailed || false);
  const [vegCount, setVegCount] = useState(booking?.foodDetails?.vegCount || 0);
  const [nonVegCount, setNonVegCount] = useState(booking?.foodDetails?.nonVegCount || 0);
  const [mealCount, setMealCount] = useState(booking?.foodDetails?.mealCount || 1);
  const [bookingSourceMemberName, setBookingSourceMemberName] = useState(booking?.bookingSourceMemberName || '');
  const [notes, setNotes] = useState(booking?.notes || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when booking changes
  useEffect(() => {
    if (booking) {
      setGuestName(booking.guestName);
      setGuestPhone(booking.guestPhone);
      setCheckInDate(booking.checkInDate);
      setCheckOutDate(booking.checkOutDate);
      setAccommodationId(booking.accommodationId);
      setGuestCount(booking.guestCount);
      setIsHolidayPricing(booking.isHolidayPricing);
      setHasDiscount(booking.discountAmount > 0 || booking.discountValue > 0);
      setDiscountType(booking.discountType);
      setDiscountValue(booking.discountValue);
      setFoodAvailed(booking.foodAvailed);
      setVegCount(booking.foodDetails?.vegCount || 0);
      setNonVegCount(booking.foodDetails?.nonVegCount || 0);
      setMealCount(booking.foodDetails?.mealCount || 1);
      setBookingSourceMemberName(booking.bookingSourceMemberName || '');
      setNotes(booking.notes || '');
      setError(null);
    }
  }, [booking]);

  const nights = useMemo(() => {
    return calculateNights(checkInDate, checkOutDate);
  }, [checkInDate, checkOutDate]);

  // Live availability check EXCLUDING this booking's own ID
  const availability = useMemo(() => {
    if (!booking) return { isAvailable: true, message: '' };
    return checkAccommodationAvailability(
      accommodationId,
      checkInDate,
      checkOutDate,
      bookings,
      maintenanceBlocks,
      booking.id // Exclude self!
    );
  }, [accommodationId, checkInDate, checkOutDate, bookings, maintenanceBlocks, booking]);

  // Recalculate preview with current system rates
  const preview = useMemo(() => {
    if (!booking) {
      return {
        accommodationSubtotal: 0,
        holidaySurchargeTotal: 0,
        discountedSubtotal: 0,
        serviceCharge: 0,
        vegPrice: pricingConfig.vegFoodPrice,
        nonVegPrice: pricingConfig.nonVegFoodPrice,
        totalFoodCharge: 0,
        grandTotal: 0,
        remainingAmount: 0,
      };
    }
    return calculateBookingPrice({
      accommodationType: accommodationId === 'bunkbeds' ? 'bunkbeds' : 'treehouse',
      guestCount,
      bedCount: accommodationId === 'bunkbeds' ? booking.bedNumbers?.length || guestCount : guestCount,
      nights: Math.max(1, nights),
      isHolidayPricing,
      discountType: hasDiscount ? discountType : 'none',
      discountValue: hasDiscount ? discountValue : 0,
      foodAvailed,
      vegCount,
      nonVegCount,
      mealCount,
      advancePaid: booking.advancePaid || 0,
      pricingConfig,
    });
  }, [
    accommodationId,
    guestCount,
    nights,
    isHolidayPricing,
    hasDiscount,
    discountType,
    discountValue,
    foodAvailed,
    vegCount,
    nonVegCount,
    mealCount,
    booking,
    pricingConfig,
  ]);

  if (!isOpen || !booking) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    if (!guestName.trim()) {
      setError('Please provide a guest name.');
      return;
    }
    if (!guestPhone.trim()) {
      setError('Please provide a contact phone number.');
      return;
    }
    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) {
      setError('Check-out date must be strictly after check-in date.');
      return;
    }

    if (accommodationId !== 'bunkbeds') {
      const capCheck = validateAccommodationCapacity('treehouse', guestCount);
      if (!capCheck.valid) {
        setError(capCheck.error || 'Treehouses can accommodate up to 6 guests maximum.');
        return;
      }
    }

    if (isHolidayPricing) {
      const holidayCheck = validateHolidayPricing(pricingConfig, true);
      if (!holidayCheck.configured) {
        setError(holidayCheck.message || 'Holiday rates are not configured. Set holiday rates in Settings before saving.');
        return;
      }
    }

    if (!availability.isAvailable) {
      setError(`Selected accommodation is unavailable: ${availability.message}`);
      return;
    }

    const selectedAccommObj = ACCOMMODATIONS.find((a) => a.id === accommodationId) || ACCOMMODATIONS[0];

    setIsSubmitting(true);
    try {
      await updateBooking(booking.id, {
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        checkInDate,
        checkOutDate,
        nights,
        accommodationId,
        accommodationName: selectedAccommObj.name,
        guestCount,
        isHolidayPricing,
        discountType: hasDiscount ? discountType : 'none',
        discountValue: hasDiscount ? discountValue : 0,
        foodAvailed,
        foodDetails: {
          vegCount,
          nonVegCount,
          noFoodCount: Math.max(0, guestCount - (vegCount + nonVegCount)),
          mealCount,
          vegPrice: preview.vegPrice,
          nonVegPrice: preview.nonVegPrice,
          totalFoodCharge: preview.totalFoodCharge,
        },
        bookingSourceMemberName: bookingSourceMemberName.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update reservation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-booking-title"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-emerald-100 w-full max-w-xl overflow-hidden text-[#1C3048] animate-in fade-in zoom-in-95 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-emerald-50 flex items-center justify-between bg-gradient-to-r from-[#ebf8f2] to-white shrink-0">
          <div>
            <h2 id="edit-booking-title" className="text-sm font-bold text-[#092D26]">
              Modify Reservation — {booking.bookingNumber}
            </h2>
            <p className="text-[11px] text-slate-500">
              Live updates for {booking.guestName} · Real-time inventory collision check
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="w-7 h-7 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 text-xs overflow-y-auto">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Guest Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Guest Full Name *</label>
              <input
                type="text"
                required
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Contact Phone *</label>
              <input
                type="tel"
                required
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Dates & Accommodation Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Check-in Date *</label>
              <input
                type="date"
                required
                value={checkInDate}
                onChange={(e) => {
                  const newIn = e.target.value;
                  setCheckInDate(newIn);
                  if (checkOutDate <= newIn) {
                    setCheckOutDate(addDays(newIn, 1));
                  }
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Check-out Date *</label>
              <input
                type="date"
                required
                value={checkOutDate}
                min={checkInDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Accommodation Selection with live availability */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-600 block">Accommodation Unit *</label>
              <span
                className={`text-[10px] font-bold ${
                  availability.isAvailable ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                {availability.isAvailable ? '✓ Unit Available' : '✕ Dates Collision'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ACCOMMODATIONS.map((acc) => {
                const isSelected = accommodationId === acc.id;
                const statusCheck = checkAccommodationAvailability(
                  acc.id,
                  checkInDate,
                  checkOutDate,
                  bookings,
                  maintenanceBlocks,
                  booking.id
                );
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      setAccommodationId(acc.id);
                      if (acc.id !== 'bunkbeds' && guestCount > 6) setGuestCount(6);
                    }}
                    className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#092D26] bg-[#ebf8f2] ring-2 ring-[#092D26]/20'
                        : statusCheck.isAvailable
                        ? 'border-slate-200 hover:border-emerald-300 bg-white'
                        : 'border-red-200 bg-red-50/50 opacity-60'
                    }`}
                  >
                    <span className="font-bold text-[#092D26] block leading-tight text-[11px] truncate">
                      {acc.name}
                    </span>
                    <span
                      className={`text-[9px] font-semibold mt-1 block ${
                        statusCheck.isAvailable ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {statusCheck.isAvailable ? 'Available' : 'Booked'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Guest Count & Holiday Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-600 block mb-1">
                Guest Count ({nights} {nights === 1 ? 'night' : 'nights'})
              </label>
              <input
                type="number"
                min="1"
                max={accommodationId === 'bunkbeds' ? 24 : 6}
                value={guestCount}
                onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Max {accommodationId === 'bunkbeds' ? '24' : '6'} guests
              </span>
            </div>

            <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-[#092D26] block">Holiday Pricing</span>
                <span className="text-[10px] text-slate-500">Apply peak holiday rates</span>
              </div>
              <input
                type="checkbox"
                checked={isHolidayPricing}
                onChange={(e) => setIsHolidayPricing(e.target.checked)}
                className="w-4 h-4 text-[#092D26] rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Discount Section */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-700 block">Apply Discount</span>
                <span className="text-[10px] text-slate-500">Service charge will compute on discounted subtotal</span>
              </div>
              <input
                type="checkbox"
                checked={hasDiscount}
                onChange={(e) => setHasDiscount(e.target.checked)}
                className="w-4 h-4 text-[#092D26] rounded cursor-pointer"
              />
            </div>
            {hasDiscount && (
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200">
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="px-2 py-1.5 rounded-xl border border-slate-300 outline-none"
                >
                  <option value="percentage">% Discount</option>
                  <option value="fixed">Fixed ₹ Discount</option>
                </select>
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="px-2 py-1.5 rounded-xl border border-slate-300 outline-none"
                />
              </div>
            )}
          </div>

          {/* Food Management */}
          <div className="p-3 bg-emerald-50/40 rounded-2xl border border-emerald-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-[#092D26] block">Food Management</span>
                <span className="text-[10px] text-slate-500">Veg (₹{pricingConfig.vegFoodPrice}) · Non-Veg (₹{pricingConfig.nonVegFoodPrice})</span>
              </div>
              <input
                type="checkbox"
                checked={foodAvailed}
                onChange={(e) => setFoodAvailed(e.target.checked)}
                className="w-4 h-4 text-[#092D26] rounded cursor-pointer"
              />
            </div>
            {foodAvailed && (
              <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-emerald-100">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Veg</label>
                  <input
                    type="number"
                    min="0"
                    max={guestCount}
                    value={vegCount}
                    onChange={(e) => setVegCount(parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Non-Veg</label>
                  <input
                    type="number"
                    min="0"
                    max={guestCount}
                    value={nonVegCount}
                    onChange={(e) => setNonVegCount(parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Meals Count</label>
                  <input
                    type="number"
                    min="1"
                    value={mealCount}
                    onChange={(e) => setMealCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-2 py-1 rounded-lg border border-slate-200"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Attribution & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Booking Came From</label>
              <input
                type="text"
                value={bookingSourceMemberName}
                onChange={(e) => setBookingSourceMemberName(e.target.value)}
                placeholder="Staff Member Name"
                list="edit-staff-list"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
              />
              <datalist id="edit-staff-list">
                {allStaffUsers.map((u) => (
                  <option key={u.uid} value={u.displayName} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special requests, anniversary, etc."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
              />
            </div>
          </div>

          {/* Live Totals & Balance Preview */}
          <div className="p-3 bg-[#f0f8f4] rounded-2xl border border-emerald-100 flex flex-col gap-1">
            <div className="flex justify-between font-semibold text-slate-700">
              <span>Recalculated Grand Total:</span>
              <span className="text-[#092D26] font-bold">{formatINR(preview.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Advance Paid (Preserved):</span>
              <span className="text-emerald-700 font-semibold">{formatINR(booking.advancePaid || 0)}</span>
            </div>
            <div className="flex justify-between font-bold text-xs pt-1 border-t border-emerald-200/60">
              <span>Remaining Balance Due:</span>
              <span className={preview.remainingAmount > 0 ? 'text-amber-700' : 'text-slate-700'}>
                {formatINR(preview.remainingAmount)}
              </span>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-2 border-t border-emerald-50 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-full font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !availability.isAvailable}
              className="px-5 py-2 rounded-full font-bold bg-[#092D26] hover:bg-[#0c3c33] disabled:opacity-50 text-white flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>{isSubmitting ? 'Saving Changes...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
