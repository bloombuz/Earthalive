import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Calendar,
  User,
  Phone,
  Users,
  Utensils,
  Percent,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  AccommodationId,
  ACCOMMODATIONS,
  CONTAINERS,
  Booking,
} from '../types/index.ts';
import { useResort } from '../context/ResortContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import {
  calculateBookingPrice,
  formatINR,
  validateHolidayPricing,
  validateAccommodationCapacity,
  DEFAULT_PRICING_CONFIG,
} from '../utils/pricing.ts';
import { getKolkataDateString, addDays, calculateNights } from '../utils/availability.ts';

interface CreateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedAccommodationId?: AccommodationId;
  preselectedDate?: string;
}

export const CreateBookingModal: React.FC<CreateBookingModalProps> = ({
  isOpen,
  onClose,
  preselectedAccommodationId,
  preselectedDate,
}) => {
  const {
    pricingConfig,
    createBooking,
    getAccommodationAvailabilityStatus,
    getBunkbedAvailabilityForDates,
  } = useResort();
  const { profile, allStaffUsers } = useAuth();

  // Today & tomorrow in Asia/Kolkata
  const todayStr = useMemo(() => {
    return preselectedDate || getKolkataDateString();
  }, [preselectedDate]);

  const tomorrowStr = useMemo(() => {
    return addDays(todayStr, 1);
  }, [todayStr]);

  // Form State
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestCount, setGuestCount] = useState<number>(2);
  const [checkInDate, setCheckInDate] = useState(todayStr);
  const [checkOutDate, setCheckOutDate] = useState(tomorrowStr);
  const [accommodationId, setAccommodationId] = useState<AccommodationId>(
    preselectedAccommodationId || 'firefly'
  );
  const [selectedBeds, setSelectedBeds] = useState<number[]>([1, 2]);

  // Holiday & Discounts
  const [isHolidayPricing, setIsHolidayPricing] = useState(false);
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(10);

  // Food
  const [foodAvailed, setFoodAvailed] = useState(false);
  const [vegCount, setVegCount] = useState<number>(0);
  const [nonVegCount, setNonVegCount] = useState<number>(0);
  const [mealCount, setMealCount] = useState<number>(1);

  // Payment
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(todayStr);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Cash' | 'Bank Transfer' | 'Card' | 'Other'>('UPI');
  const [transactionRef, setTransactionRef] = useState('');

  // Attribution (Simple person selectors without teams)
  const [bookingSourceMemberName, setBookingSourceMemberName] = useState('');
  const [paymentCollectorName, setPaymentCollectorName] = useState('');

  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync props when modal opens
  useEffect(() => {
    if (preselectedAccommodationId) {
      setAccommodationId(preselectedAccommodationId);
    }
    if (preselectedDate) {
      setCheckInDate(preselectedDate);
      setCheckOutDate(addDays(preselectedDate, 1));
    }
    if (profile) {
      setBookingSourceMemberName(profile.displayName || 'Staff Member');
      setPaymentCollectorName(profile.displayName || 'Staff Member');
    }
  }, [isOpen, preselectedAccommodationId, preselectedDate, profile]);

  // Calculate nights
  const nights = useMemo(() => {
    return calculateNights(checkInDate, checkOutDate);
  }, [checkInDate, checkOutDate]);

  // Adjust guestCount bounds if treehouse vs bunkbeds
  const handleAccommodationChange = (newAccId: AccommodationId) => {
    setAccommodationId(newAccId);
    if (newAccId !== 'bunkbeds' && guestCount > 6) {
      setGuestCount(6);
    }
  };

  // Check live availability for selected unit
  const availabilityStatus = useMemo(() => {
    return getAccommodationAvailabilityStatus(accommodationId, checkInDate, checkOutDate);
  }, [accommodationId, checkInDate, checkOutDate, getAccommodationAvailabilityStatus]);

  const isAvailable = availabilityStatus.isAvailable;

  const bunkbedAvailability = useMemo(() => {
    if (accommodationId !== 'bunkbeds') return null;
    return getBunkbedAvailabilityForDates(checkInDate, checkOutDate);
  }, [accommodationId, checkInDate, checkOutDate, getBunkbedAvailabilityForDates]);

  // Centralized calculations
  const calculation = useMemo(() => {
    return calculateBookingPrice({
      accommodationType: accommodationId === 'bunkbeds' ? 'bunkbeds' : 'treehouse',
      guestCount,
      bedCount: accommodationId === 'bunkbeds' ? selectedBeds.length || guestCount : guestCount,
      nights: Math.max(1, nights),
      isHolidayPricing,
      discountType: hasDiscount ? discountType : 'none',
      discountValue: hasDiscount ? discountValue : 0,
      foodAvailed,
      vegCount,
      nonVegCount,
      mealCount,
      advancePaid: advanceAmount,
      pricingConfig,
    });
  }, [
    accommodationId,
    guestCount,
    selectedBeds,
    nights,
    isHolidayPricing,
    hasDiscount,
    discountType,
    discountValue,
    foodAvailed,
    vegCount,
    nonVegCount,
    mealCount,
    advanceAmount,
    pricingConfig,
  ]);

  if (!isOpen) return null;

  const currentAccomm = ACCOMMODATIONS.find((a) => a.id === accommodationId) || ACCOMMODATIONS[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent duplicate submissions
    setErrorMessage(null);

    if (!guestName.trim()) {
      setErrorMessage('Please provide a guest name.');
      return;
    }
    if (!guestPhone.trim()) {
      setErrorMessage('Please provide a contact phone number.');
      return;
    }
    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) {
      setErrorMessage('Check-out date must be strictly after check-in date.');
      return;
    }
    if (accommodationId !== 'bunkbeds') {
      const capCheck = validateAccommodationCapacity('treehouse', guestCount);
      if (!capCheck.valid) {
        setErrorMessage(capCheck.error || 'Treehouses can accommodate up to 6 guests maximum.');
        return;
      }
    }
    if (isHolidayPricing) {
      const holidayCheck = validateHolidayPricing(pricingConfig, true);
      if (!holidayCheck.configured) {
        setErrorMessage(holidayCheck.message || 'Holiday rates are not configured. Set holiday rates in Settings before saving.');
        return;
      }
    }
    if (!isAvailable) {
      setErrorMessage(`${currentAccomm.name} is not available for these dates: ${availabilityStatus.message}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await createBooking(
        {
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim(),
          guestCount,
          checkInDate,
          checkOutDate,
          nights,
          accommodationId,
          accommodationName: currentAccomm.name,
          bedNumbers: accommodationId === 'bunkbeds' ? selectedBeds : undefined,
          isHolidayPricing,
          discountType: hasDiscount ? discountType : 'none',
          discountValue: hasDiscount ? discountValue : 0,
          accommodationSubtotal: calculation.accommodationSubtotal,
          discountAmount: calculation.discountAmount,
          discountedAccommodationSubtotal: calculation.discountedAccommodationSubtotal,
          serviceChargeRate: calculation.serviceChargeRate,
          serviceChargeAmount: calculation.serviceChargeAmount,
          foodAvailed,
          foodDetails: {
            vegCount,
            nonVegCount,
            noFoodCount: Math.max(0, guestCount - (vegCount + nonVegCount)),
            mealCount,
            vegPrice: calculation.vegPrice,
            nonVegPrice: calculation.nonVegPrice,
            totalFoodCharge: calculation.totalFoodCharge,
          },
          grandTotal: calculation.grandTotal,
          advancePaid: advanceAmount,
          remainingAmount: calculation.remainingAmount,
          paymentStatus: calculation.paymentStatus,
          bookingStatus: 'confirmed',
          bookingSourceMemberId: profile?.uid || 'staff-01',
          bookingSourceMemberName: bookingSourceMemberName.trim() || profile?.displayName || 'Staff Member',
          notes: notes.trim() || undefined,
        },
        advanceAmount > 0
          ? {
              amount: advanceAmount,
              paymentDate,
              paymentMethod,
              collectedByMemberId: profile?.uid || 'staff-01',
              collectedByMemberName: paymentCollectorName.trim() || profile?.displayName || 'Staff Member',
              transactionRef: transactionRef.trim() || undefined,
            }
          : undefined
      );

      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create reservation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-booking-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-emerald-100 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden text-[#1C3048] animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-emerald-50 flex items-center justify-between bg-gradient-to-r from-[#ebf8f2] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#092D26] text-white flex items-center justify-center font-bold text-sm">
              EA
            </div>
            <div>
              <h2 id="new-booking-title" className="text-base font-bold text-[#092D26]">
                New Reservation — Earthalive Resort
              </h2>
              <p className="text-xs text-slate-500">
                Bangalore, India · Live rate calculation & inventory protection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-[#092D26] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-6">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section A: Guest Information */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#092D26]">
                Section A — Guest Details
              </h4>
              <span className="text-[11px] text-slate-400">Step 1 of 5</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Guest Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Anna Hartmann"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Contact Phone Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Dates & Guest Count */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Booking From (Check-in) *
                </label>
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
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Booking To (Check-out) *
                </label>
                <input
                  type="date"
                  required
                  value={checkOutDate}
                  min={checkInDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Number of Guests ({nights} {nights === 1 ? 'night' : 'nights'})
                </label>
                <input
                  type="number"
                  min="1"
                  max={accommodationId === 'bunkbeds' ? 24 : 6}
                  value={guestCount}
                  onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section B: Accommodation Selection */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#092D26]">
                Section B — Accommodation Selection
              </h4>
              <span
                className={`text-[11px] font-semibold ${
                  availabilityStatus.status === 'dates_required'
                    ? 'text-slate-500'
                    : isAvailable
                    ? 'text-emerald-700'
                    : 'text-red-600'
                }`}
              >
                {availabilityStatus.status === 'dates_required'
                  ? 'Select dates to check availability'
                  : isAvailable
                  ? '✓ Available for requested dates'
                  : '✕ Overlap Collision (Booked)'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {ACCOMMODATIONS.map((acc) => {
                const isSelected = accommodationId === acc.id;
                const statusInfo = getAccommodationAvailabilityStatus(acc.id, checkInDate, checkOutDate);
                const unitAvail = statusInfo.isAvailable;
                const isDatesRequired = statusInfo.status === 'dates_required';

                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => handleAccommodationChange(acc.id)}
                    className={`relative p-2.5 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#092D26] bg-[#ebf8f2] ring-2 ring-[#092D26]/20'
                        : unitAvail
                        ? 'border-slate-200 hover:border-emerald-300 bg-white'
                        : 'border-red-200 bg-red-50/50 opacity-60'
                    }`}
                  >
                    <div className="w-full h-20 rounded-xl overflow-hidden mb-2">
                      <img src={acc.image} alt={acc.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-[#092D26] leading-tight truncate">
                        {acc.name}
                      </h5>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {acc.id === 'bunkbeds'
                          ? '₹1,250 / bed / night'
                          : '₹6,000 for 4 (+₹1.5k/extra)'}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-slate-600">Max {acc.maxCapacity}</span>
                      <span
                        className={`font-bold ${
                          isDatesRequired
                            ? 'text-slate-500'
                            : unitAvail
                            ? 'text-emerald-700'
                            : 'text-red-600'
                        }`}
                      >
                        {isDatesRequired ? 'Select Dates' : unitAvail ? 'Available' : 'Booked'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bunkbed Container distribution if bunkbeds selected */}
            {accommodationId === 'bunkbeds' && bunkbedAvailability && (
              <div className="p-3 bg-[#f5fbf8] rounded-2xl border border-emerald-100 text-xs">
                <p className="font-semibold text-[#092D26] mb-1.5">
                  Bunkbed Inventory: {bunkbedAvailability.availableBedsCount} of 24 beds available across requested dates
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {bunkbedAvailability.containerBreakdown.map((c) => (
                    <div key={c.containerId} className="bg-white p-2 rounded-xl border border-slate-200">
                      <span className="font-bold text-[#092D26] block text-[11px]">{c.name}</span>
                      <span className="text-[10px] text-emerald-700 font-medium">
                        {c.available}/{c.total} beds free
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section C: Pricing & Calculations */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#092D26]">
                Section C — Pricing & Breakdown
              </h4>
              <span className="text-[11px] text-emerald-800 font-semibold">10% Accommodation Service Charge</span>
            </div>

            {/* Holiday Pricing Toggle */}
            <div className="flex flex-col gap-2 p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-800" />
                  <div>
                    <span className="text-xs font-bold text-[#092D26] block">Holiday Pricing</span>
                    <span className="text-[10px] text-slate-500">Apply configured holiday rates</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isHolidayPricing}
                    onChange={(e) => setIsHolidayPricing(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#092D26]"></div>
                </label>
              </div>

              {isHolidayPricing && !validateHolidayPricing(pricingConfig, true).configured && (
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center justify-between animate-in fade-in">
                  <span>Holiday pricing is unconfigured.</span>
                  <span className="font-bold underline text-[#092D26]">Configure in Settings</span>
                </div>
              )}
            </div>

            {/* Discounts Toggle */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-emerald-800" />
                  <div>
                    <span className="text-xs font-bold text-[#092D26] block">Discount (Accommodation Only)</span>
                    <span className="text-[10px] text-slate-500">Service charge will compute on discounted subtotal</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasDiscount}
                    onChange={(e) => setHasDiscount(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#092D26]"></div>
                </label>
              </div>

              {hasDiscount && (
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200">
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 outline-none"
                  >
                    <option value="percentage">Percentage Discount (%)</option>
                    <option value="fixed">Fixed Amount Discount (₹)</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    max={discountType === 'percentage' ? 100 : calculation.accommodationSubtotal}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    placeholder={discountType === 'percentage' ? 'e.g. 10%' : 'e.g. 1000'}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 outline-none"
                  />
                </div>
              )}
            </div>

            {/* Food Section */}
            <div className="p-3 bg-emerald-50/40 rounded-2xl border border-emerald-100 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-emerald-800" />
                  <div>
                    <span className="text-xs font-bold text-[#092D26] block">Food Management</span>
                    <span className="text-[10px] text-slate-500">
                      Veg (₹{pricingConfig.vegFoodPrice}) · Non-Veg (₹{pricingConfig.nonVegFoodPrice}) · 0% Service Charge on Food
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-white p-1 rounded-full border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setFoodAvailed(false)}
                    className={`px-3 py-1 text-[11px] font-semibold rounded-full transition-colors cursor-pointer ${
                      !foodAvailed ? 'bg-[#092D26] text-white' : 'text-slate-600 hover:text-black'
                    }`}
                  >
                    N/A
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFoodAvailed(true);
                      if (vegCount === 0 && nonVegCount === 0) setVegCount(guestCount);
                    }}
                    className={`px-3 py-1 text-[11px] font-semibold rounded-full transition-colors cursor-pointer ${
                      foodAvailed ? 'bg-[#092D26] text-white' : 'text-slate-600 hover:text-black'
                    }`}
                  >
                    Availed
                  </button>
                </div>
              </div>

              {foodAvailed && (
                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-emerald-100 text-xs">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                      Vegetarian ({formatINR(pricingConfig.vegFoodPrice)})
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={guestCount}
                      value={vegCount}
                      onChange={(e) => setVegCount(parseInt(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                      Non-Vegetarian ({formatINR(pricingConfig.nonVegFoodPrice)})
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={guestCount}
                      value={nonVegCount}
                      onChange={(e) => setNonVegCount(parseInt(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                      Meals Count
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={mealCount}
                      onChange={(e) => setMealCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Live Pricing Breakdown Card */}
            <div className="bg-[#f0f8f4] border border-[#d2ebe0] rounded-2xl p-4 flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Accommodation Subtotal ({nights} {nights === 1 ? 'night' : 'nights'}):</span>
                <span className="font-semibold text-slate-900">{formatINR(calculation.accommodationSubtotal)}</span>
              </div>
              {calculation.discountAmount > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Discount ({calculation.discountType === 'percentage' ? `${calculation.discountValue}%` : 'Fixed'}):</span>
                  <span className="font-semibold">-{formatINR(calculation.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Service Charge (10% on discounted accommodation):</span>
                <span className="font-semibold text-slate-900">{formatINR(calculation.serviceChargeAmount)}</span>
              </div>
              {calculation.totalFoodCharge > 0 && (
                <div className="flex justify-between text-emerald-800">
                  <span>Food Charges ({calculation.vegCount} Veg, {calculation.nonVegCount} Non-Veg):</span>
                  <span className="font-semibold">{formatINR(calculation.totalFoodCharge)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-[#092D26] pt-2 border-t border-[#d2ebe0]">
                <span>Grand Total:</span>
                <span>{formatINR(calculation.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Section D: Payment Details */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#092D26]">
              Section D — Payment & Advance
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Advance Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  max={calculation.grandTotal}
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none"
                >
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Card</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Remaining Balance
                </label>
                <div className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 font-bold text-[#092D26]">
                  {formatINR(calculation.remainingAmount)}
                </div>
              </div>
            </div>
          </div>

          {/* Section E: Attribution & Notes (No Teams) */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#092D26]">
              Section E — Attribution & Notes
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Booking Came From (Staff / Lead Name)
                </label>
                <input
                  type="text"
                  value={bookingSourceMemberName}
                  onChange={(e) => setBookingSourceMemberName(e.target.value)}
                  placeholder="e.g. Sofia R."
                  list="staff-user-list"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none"
                />
                <datalist id="staff-user-list">
                  {allStaffUsers.map((u) => (
                    <option key={u.uid} value={u.displayName} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Money Collected By
                </label>
                <input
                  type="text"
                  value={paymentCollectorName}
                  onChange={(e) => setPaymentCollectorName(e.target.value)}
                  placeholder="e.g. Staff Member"
                  list="staff-user-list"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Booking Notes / Special Requests (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Guest celebrating anniversary, requested sunset deck view."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-emerald-50 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isAvailable}
              className="px-6 py-2.5 rounded-full text-xs font-bold bg-[#092D26] hover:bg-[#0c3c33] disabled:opacity-50 text-white shadow-sm flex items-center gap-2 cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>{isSubmitting ? 'Securing Booking...' : 'Confirm Reservation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
