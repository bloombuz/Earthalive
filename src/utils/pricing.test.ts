import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBookingPrice,
  calculateTreehouseNightlyRate,
  calculateBunkbedsNightlyRate,
  validateAccommodationCapacity,
  validateHolidayPricing,
  maskGuestName,
  maskPhoneNumber,
  DEFAULT_PRICING_CONFIG,
  PricingConfig,
} from './pricing.ts';

test('Example A: Treehouse, 2 guests, 1 night -> ₹6,600', () => {
  const result = calculateBookingPrice({
    accommodationType: 'treehouse',
    guestCount: 2,
    nights: 1,
  });

  assert.equal(result.accommodationSubtotal, 6000);
  assert.equal(result.serviceChargeAmount, 600);
  assert.equal(result.totalFoodCharge, 0);
  assert.equal(result.grandTotal, 6600);
  assert.equal(result.remainingAmount, 6600);
});

test('Example B: Treehouse, 6 guests, 1 night -> ₹9,900', () => {
  const result = calculateBookingPrice({
    accommodationType: 'treehouse',
    guestCount: 6,
    nights: 1,
  });

  assert.equal(result.accommodationSubtotal, 9000); // 6000 base + 2 * 1500
  assert.equal(result.serviceChargeAmount, 900);
  assert.equal(result.grandTotal, 9900);
});

test('Example C: Treehouse with food and advance -> Grand: ₹18,900, Remaining: ₹13,900', () => {
  const result = calculateBookingPrice({
    accommodationType: 'treehouse',
    guestCount: 5,
    nights: 2,
    foodAvailed: true,
    vegCount: 3,
    nonVegCount: 2,
    mealCount: 1,
    advancePaid: 5000,
  });

  // Base 6000 + 1 * 1500 = 7500 per night * 2 nights = 15000
  assert.equal(result.accommodationSubtotal, 15000);
  // Food: 3 * 400 + 2 * 600 = 1200 + 1200 = 2400
  assert.equal(result.totalFoodCharge, 2400);
  // Service charge: 10% on 15000 = 1500 (does not apply to food)
  assert.equal(result.serviceChargeAmount, 1500);
  // Grand total: 15000 + 1500 + 2400 = 18900
  assert.equal(result.grandTotal, 18900);
  assert.equal(result.advancePaid, 5000);
  assert.equal(result.remainingAmount, 13900);
  assert.equal(result.paymentStatus, 'partially_paid');
});

test('Example 6: 4 guests, 2 nights, 10% discount, 2 veg, 2 non-veg per stay -> ₹13,880', () => {
  // Treehouse 4 guests, 2 nights = 12,000
  // Discount: 10% on 12,000 = -1,200 => 10,800
  // 10% service charge on 10,800 = 1,080
  // Food (per stay): 2 * 400 + 2 * 600 = 2,000
  // Grand total = 10,800 + 1,080 + 2,000 = 13,880
  const result = calculateBookingPrice({
    accommodationType: 'treehouse',
    guestCount: 4,
    nights: 2,
    discountType: 'percentage',
    discountValue: 10,
    foodAvailed: true,
    vegCount: 2,
    nonVegCount: 2,
    foodChargingBasis: 'per_stay',
  });

  assert.equal(result.accommodationSubtotal, 12000);
  assert.equal(result.discountAmount, 1200);
  assert.equal(result.discountedAccommodationSubtotal, 10800);
  assert.equal(result.serviceChargeAmount, 1080);
  assert.equal(result.totalFoodCharge, 2000);
  assert.equal(result.grandTotal, 13880);
});

test('Example 7: 4 guests, 2 nights, ₹1,000 fixed discount, 2 veg, 2 non-veg per stay -> ₹14,100', () => {
  // Treehouse 4 guests, 2 nights = 12,000
  // Fixed discount: 1,000 => 11,000
  // 10% service charge on 11,000 = 1,100
  // Food (per stay): 2 * 400 + 2 * 600 = 2,000
  // Grand total = 11,000 + 1,100 + 2,000 = 14,100
  const result = calculateBookingPrice({
    accommodationType: 'treehouse',
    guestCount: 4,
    nights: 2,
    discountType: 'fixed',
    discountValue: 1000,
    foodAvailed: true,
    vegCount: 2,
    nonVegCount: 2,
    foodChargingBasis: 'per_stay',
  });

  assert.equal(result.accommodationSubtotal, 12000);
  assert.equal(result.discountAmount, 1000);
  assert.equal(result.discountedAccommodationSubtotal, 11000);
  assert.equal(result.serviceChargeAmount, 1100);
  assert.equal(result.totalFoodCharge, 2000);
  assert.equal(result.grandTotal, 14100);
});

test('Example 8: 3 bunkbeds, 1 night -> ₹4,125', () => {
  // 3 * 1,250 = 3,750
  // Service charge 10% = 375
  // Grand total = 4,125
  const result = calculateBookingPrice({
    accommodationType: 'bunkbeds',
    guestCount: 3,
    bedCount: 3,
    nights: 1,
  });

  assert.equal(result.accommodationSubtotal, 3750);
  assert.equal(result.serviceChargeAmount, 375);
  assert.equal(result.grandTotal, 4125);
});

test('Food charging basis: per_night multiplies by stay nights', () => {
  const result = calculateBookingPrice({
    accommodationType: 'treehouse',
    guestCount: 2,
    nights: 3,
    foodAvailed: true,
    vegCount: 2,
    nonVegCount: 0,
    foodChargingBasis: 'per_night',
  });

  // Food: 2 veg * 400 = 800 per night * 3 nights = 2,400
  assert.equal(result.totalFoodCharge, 2400);
});

test('Treehouse capacity validation: strictly caps at 6 and rejects 7th guest', () => {
  const valid6 = validateAccommodationCapacity('treehouse', 6);
  assert.equal(valid6.valid, true);

  const invalid7 = validateAccommodationCapacity('treehouse', 7);
  assert.equal(invalid7.valid, false);
  assert.match(invalid7.error!, /maximum of 6 guests/);

  const rateFor7 = calculateTreehouseNightlyRate(7, false, DEFAULT_PRICING_CONFIG);
  const rateFor6 = calculateTreehouseNightlyRate(6, false, DEFAULT_PRICING_CONFIG);
  assert.equal(rateFor7, rateFor6); // Capped at 6
  assert.equal(rateFor6, 9000);
});

test('Holiday pricing configuration check: blocks holiday bookings if rates unconfigured', () => {
  const unconfiguredConfig: PricingConfig = {
    ...DEFAULT_PRICING_CONFIG,
    holidayPricing: {
      enabled: false,
      treehouseBasePrice: 0,
      treehouseExtraGuestPrice: 0,
      bunkbedPricePerPerson: 0,
      holidayDateRanges: [],
    },
  };

  const validation = validateHolidayPricing(unconfiguredConfig, true);
  assert.equal(validation.configured, false);
  assert.match(validation.message!, /Set holiday rates/);

  const nonHoliday = validateHolidayPricing(unconfiguredConfig, false);
  assert.equal(nonHoliday.configured, true);
});

test('Privacy masking for guest names and phone numbers', () => {
  const maskedName = maskGuestName('Anna Hartmann');
  assert.equal(maskedName, 'A**a H******n');

  const maskedShort = maskGuestName('Kenji Sato');
  assert.equal(maskedShort, 'K***i S**o');

  const maskedPhone = maskPhoneNumber('+91 98765 43210');
  assert.equal(maskedPhone.endsWith('3210'), true);
  assert.equal(maskedPhone.startsWith('***'), true);
});
