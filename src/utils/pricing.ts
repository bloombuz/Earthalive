/**
 * Earthalive Resort Pricing and Calculation Engine
 */

export interface PricingConfig {
  treehouseBasePrice: number;       // default 6000
  treehouseBaseGuests: number;      // default 4
  treehouseExtraGuestPrice: number; // default 1500
  treehouseMaxGuests: number;       // default 6
  bunkbedPricePerPerson: number;    // default 1250
  serviceChargePercent: number;     // default 10
  vegFoodPrice: number;             // default 400
  nonVegFoodPrice: number;          // default 600
  foodChargingBasis: 'per_stay' | 'per_night'; // default 'per_stay'
  holidayPricing: {
    enabled: boolean;
    treehouseBasePrice: number;
    treehouseExtraGuestPrice: number;
    bunkbedPricePerPerson: number;
    holidayDateRanges: { startDate: string; endDate: string; name?: string }[];
  };
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  treehouseBasePrice: 6000,
  treehouseBaseGuests: 4,
  treehouseExtraGuestPrice: 1500,
  treehouseMaxGuests: 6,
  bunkbedPricePerPerson: 1250,
  serviceChargePercent: 10,
  vegFoodPrice: 400,
  nonVegFoodPrice: 600,
  foodChargingBasis: 'per_stay',
  holidayPricing: {
    enabled: false,
    treehouseBasePrice: 6000,
    treehouseExtraGuestPrice: 1500,
    bunkbedPricePerPerson: 1250,
    holidayDateRanges: [],
  },
};

export type AccommodationType = 'treehouse' | 'bunkbeds';

export interface BookingCalculationInput {
  accommodationType: AccommodationType;
  guestCount: number;
  bedCount?: number;
  nights: number;
  isHolidayPricing?: boolean;
  holidayNightsCount?: number; // if specified, subset of nights that are holidays
  discountType?: 'none' | 'percentage' | 'fixed';
  discountValue?: number;
  foodAvailed?: boolean;
  vegCount?: number;
  nonVegCount?: number;
  mealCount?: number; // servings multiplier, default 1
  foodChargingBasis?: 'per_stay' | 'per_night';
  advancePaid?: number;
  pricingConfig?: PricingConfig;
}

export interface BookingCalculationResult {
  nightlyRates: number[];
  accommodationSubtotal: number;
  discountType: 'none' | 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  discountedAccommodationSubtotal: number;
  serviceChargeRate: number;
  serviceChargeAmount: number;
  foodAvailed: boolean;
  vegCount: number;
  nonVegCount: number;
  vegPrice: number;
  nonVegPrice: number;
  mealCount: number;
  totalFoodCharge: number;
  grandTotal: number;
  advancePaid: number;
  remainingAmount: number;
  isOverpaid: boolean;
  overpaidAmount: number;
  paymentStatus: 'unpaid' | 'partially_paid' | 'paid' | 'overdue';
}

/**
 * Calculates nightly accommodation rate for a treehouse
 */
export function calculateTreehouseNightlyRate(
  guests: number,
  isHoliday: boolean = false,
  config: PricingConfig = DEFAULT_PRICING_CONFIG
): number {
  const cappedGuests = Math.min(Math.max(1, guests), config.treehouseMaxGuests);
  const basePrice = isHoliday && config.holidayPricing.enabled
    ? config.holidayPricing.treehouseBasePrice
    : config.treehouseBasePrice;

  const extraRate = isHoliday && config.holidayPricing.enabled
    ? config.holidayPricing.treehouseExtraGuestPrice
    : config.treehouseExtraGuestPrice;

  const extraGuests = Math.max(0, cappedGuests - config.treehouseBaseGuests);
  return basePrice + extraGuests * extraRate;
}

/**
 * Calculates nightly accommodation rate for bunkbeds
 */
export function calculateBunkbedsNightlyRate(
  bedsOrGuests: number,
  isHoliday: boolean = false,
  config: PricingConfig = DEFAULT_PRICING_CONFIG
): number {
  const ratePerBed = isHoliday && config.holidayPricing.enabled
    ? config.holidayPricing.bunkbedPricePerPerson
    : config.bunkbedPricePerPerson;

  return Math.max(0, bedsOrGuests) * ratePerBed;
}

/**
 * Complete Booking Price Calculation
 */
export function calculateBookingPrice(
  input: BookingCalculationInput
): BookingCalculationResult {
  const config = input.pricingConfig || DEFAULT_PRICING_CONFIG;
  const nights = Math.max(1, input.nights || 1);
  const isGlobalHoliday = !!input.isHolidayPricing;
  const holidayNights = input.holidayNightsCount !== undefined
    ? Math.min(nights, Math.max(0, input.holidayNightsCount))
    : (isGlobalHoliday ? nights : 0);
  const standardNights = nights - holidayNights;

  const nightlyRates: number[] = [];

  let standardNightRate = 0;
  let holidayNightRate = 0;

  if (input.accommodationType === 'treehouse') {
    standardNightRate = calculateTreehouseNightlyRate(input.guestCount, false, config);
    holidayNightRate = calculateTreehouseNightlyRate(input.guestCount, true, config);
  } else {
    const beds = input.bedCount || input.guestCount;
    standardNightRate = calculateBunkbedsNightlyRate(beds, false, config);
    holidayNightRate = calculateBunkbedsNightlyRate(beds, true, config);
  }

  for (let i = 0; i < standardNights; i++) {
    nightlyRates.push(standardNightRate);
  }
  for (let i = 0; i < holidayNights; i++) {
    nightlyRates.push(holidayNightRate);
  }

  const accommodationSubtotal = nightlyRates.reduce((acc, curr) => acc + curr, 0);

  // Discount calculation (applies to accommodation only)
  const discountType = input.discountType || 'none';
  const discountValue = Math.max(0, input.discountValue || 0);
  let discountAmount = 0;

  if (discountType === 'percentage') {
    const pct = Math.min(100, discountValue);
    discountAmount = Math.round((accommodationSubtotal * pct) / 100);
  } else if (discountType === 'fixed') {
    discountAmount = Math.min(accommodationSubtotal, discountValue);
  }

  const discountedAccommodationSubtotal = Math.max(0, accommodationSubtotal - discountAmount);

  // Service charge: 10% on discounted accommodation only
  const serviceChargeRate = config.serviceChargePercent;
  const serviceChargeAmount = Math.round((discountedAccommodationSubtotal * serviceChargeRate) / 100);

  // Food calculation:
  // If basis is 'per_night', food charge multiplies by the number of nights.
  // Default is 'per_stay' (multiplier = 1).
  let totalFoodCharge = 0;
  const foodAvailed = !!input.foodAvailed;
  const vegCount = Math.max(0, input.vegCount || 0);
  const nonVegCount = Math.max(0, input.nonVegCount || 0);
  const mealCount = Math.max(1, input.mealCount || 1);
  const foodBasis = input.foodChargingBasis || config.foodChargingBasis || 'per_stay';
  const foodNightsMultiplier = foodBasis === 'per_night' ? nights : 1;
  const vegPrice = config.vegFoodPrice;
  const nonVegPrice = config.nonVegFoodPrice;

  if (foodAvailed) {
    totalFoodCharge = (vegCount * vegPrice + nonVegCount * nonVegPrice) * mealCount * foodNightsMultiplier;
  }

  // Grand total
  const grandTotal = discountedAccommodationSubtotal + serviceChargeAmount + totalFoodCharge;

  // Payments & Balance
  const advancePaid = Math.max(0, input.advancePaid || 0);
  const remainingAmount = Math.max(0, grandTotal - advancePaid);
  const isOverpaid = advancePaid > grandTotal;
  const overpaidAmount = isOverpaid ? advancePaid - grandTotal : 0;

  let paymentStatus: 'unpaid' | 'partially_paid' | 'paid' | 'overdue' = 'unpaid';
  if (advancePaid >= grandTotal && grandTotal > 0) {
    paymentStatus = 'paid';
  } else if (advancePaid > 0) {
    paymentStatus = 'partially_paid';
  }

  return {
    nightlyRates,
    accommodationSubtotal,
    discountType,
    discountValue,
    discountAmount,
    discountedAccommodationSubtotal,
    serviceChargeRate,
    serviceChargeAmount,
    foodAvailed,
    vegCount,
    nonVegCount,
    vegPrice,
    nonVegPrice,
    mealCount,
    totalFoodCharge,
    grandTotal,
    advancePaid,
    remainingAmount,
    isOverpaid,
    overpaidAmount,
    paymentStatus,
  };
}

/**
 * Masking sensitive guest information for privacy compliance (Section 4)
 */
export function maskGuestName(name: string): string {
  if (!name || name.trim().length === 0) return 'Guest';
  const parts = name.trim().split(/\s+/);
  return parts
    .map(p => {
      if (p.length <= 1) return p;
      if (p.length === 2) return p[0] + '*';
      return p[0] + '*'.repeat(p.length - 2) + p[p.length - 1];
    })
    .join(' ');
}

export function maskPhoneNumber(phone: string): string {
  if (!phone) return '******';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '******' + digits;
  const last4 = digits.slice(-4);
  return '*'.repeat(Math.max(6, digits.length - 4)) + last4;
}

/**
 * Format currency in Indian Rupees
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Validate accommodation capacity
 * Treehouses hold a maximum of 6 guests. Hard cap, 7th guest rejected.
 * Bunkbeds hold up to 24 guests across 4 containers.
 */
export function validateAccommodationCapacity(
  type: AccommodationType,
  guestCount: number
): { valid: boolean; error?: string } {
  if (guestCount <= 0) {
    return { valid: false, error: 'Guest count must be at least 1' };
  }
  if (type === 'treehouse' && guestCount > 6) {
    return {
      valid: false,
      error: `Treehouses hold a maximum of 6 guests. A 7th guest is not permitted (requested ${guestCount} guests).`,
    };
  }
  if (type === 'bunkbeds' && guestCount > 24) {
    return {
      valid: false,
      error: `Bunkbeds hold a maximum of 24 spaces across 4 containers (requested ${guestCount} spaces).`,
    };
  }
  return { valid: true };
}

/**
 * Validate holiday pricing configuration
 * Holiday prices must be configured; do not invent a surcharge.
 */
export function validateHolidayPricing(
  config: PricingConfig,
  isHolidayBooking: boolean
): { configured: boolean; message?: string } {
  if (!isHolidayBooking) return { configured: true };
  if (
    !config.holidayPricing.enabled ||
    config.holidayPricing.treehouseBasePrice <= 0 ||
    config.holidayPricing.bunkbedPricePerPerson <= 0
  ) {
    return {
      configured: false,
      message: 'Holiday rates are not configured. Set holiday rates in Settings before saving holiday bookings.',
    };
  }
  return { configured: true };
}
