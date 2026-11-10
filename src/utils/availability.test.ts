import test from 'node:test';
import assert from 'node:assert/strict';
import {
  doesStayOverlap,
  calculateNights,
  getOccupiedNights,
  checkAccommodationAvailability,
  calculateBunkbedAvailability,
  isInventoryReservingBooking,
} from './availability.ts';
import { Booking } from '../types/index.ts';

const createMockBooking = (overrides: Partial<Booking>): Booking => ({
  id: 'b1',
  bookingNumber: 'EA-1001',
  guestName: 'John Doe',
  guestPhone: '+91 99999 88888',
  guestCount: 2,
  checkInDate: '2026-11-10',
  checkOutDate: '2026-11-12',
  nights: 2,
  accommodationId: 'firefly',
  accommodationName: 'Firefly Treehouse',
  isHolidayPricing: false,
  discountType: 'none',
  discountValue: 0,
  accommodationSubtotal: 12000,
  discountAmount: 0,
  discountedAccommodationSubtotal: 12000,
  serviceChargeRate: 0.1,
  serviceChargeAmount: 1200,
  foodAvailed: false,
  foodDetails: {
    vegCount: 0,
    nonVegCount: 0,
    noFoodCount: 2,
    mealCount: 1,
    vegPrice: 400,
    nonVegPrice: 600,
    totalFoodCharge: 0,
  },
  grandTotal: 13200,
  advancePaid: 13200,
  remainingAmount: 0,
  paymentStatus: 'paid',
  bookingStatus: 'confirmed',
  bookingSourceMemberId: 'staff-1',
  bookingSourceMemberName: 'Staff Member',
  createdBy: 'staff-1',
  createdByName: 'Staff Member',
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
  ...overrides,
});

test('Stay overlap invariant: same-day checkout and check-in must NOT overlap', () => {
  // Existing: Nov 10 to Nov 12
  // Requested: Nov 12 to Nov 14 (check-in on checkout date)
  assert.equal(doesStayOverlap('2026-11-10', '2026-11-12', '2026-11-12', '2026-11-14'), false);

  // Requested: Nov 8 to Nov 10 (checkout on checkin date)
  assert.equal(doesStayOverlap('2026-11-10', '2026-11-12', '2026-11-08', '2026-11-10'), false);

  // Partial overlap: Nov 11 to Nov 13 -> TRUE
  assert.equal(doesStayOverlap('2026-11-10', '2026-11-12', '2026-11-11', '2026-11-13'), true);

  // Enclosing overlap: Nov 09 to Nov 13 -> TRUE
  assert.equal(doesStayOverlap('2026-11-10', '2026-11-12', '2026-11-09', '2026-11-13'), true);
});

test('Treehouse isolation: booking Firefly leaves Sunbird and Woodpecker 100% available', () => {
  const existingBookings = [
    createMockBooking({
      id: 'firefly-booking',
      accommodationId: 'firefly',
      checkInDate: '2026-11-10',
      checkOutDate: '2026-11-14',
      bookingStatus: 'confirmed',
    }),
  ];

  // Firefly is booked
  const fireflyCheck = checkAccommodationAvailability(
    'firefly',
    '2026-11-11',
    '2026-11-13',
    existingBookings
  );
  assert.equal(fireflyCheck.isAvailable, false);
  assert.equal(fireflyCheck.status, 'booked');

  // Sunbird is available
  const sunbirdCheck = checkAccommodationAvailability(
    'sunbird',
    '2026-11-11',
    '2026-11-13',
    existingBookings
  );
  assert.equal(sunbirdCheck.isAvailable, true);
  assert.equal(sunbirdCheck.status, 'available');

  // Woodpecker is available
  const woodpeckerCheck = checkAccommodationAvailability(
    'woodpecker',
    '2026-11-11',
    '2026-11-13',
    existingBookings
  );
  assert.equal(woodpeckerCheck.isAvailable, true);
  assert.equal(woodpeckerCheck.status, 'available');
});

test('Status exclusion: cancelled or deleted bookings NEVER block inventory', () => {
  const cancelledBooking = [
    createMockBooking({
      id: 'cancelled-bk',
      accommodationId: 'firefly',
      checkInDate: '2026-11-10',
      checkOutDate: '2026-11-14',
      bookingStatus: 'cancelled',
    }),
  ];

  const check = checkAccommodationAvailability(
    'firefly',
    '2026-11-11',
    '2026-11-13',
    cancelledBooking
  );
  assert.equal(check.isAvailable, true);
  assert.equal(check.status, 'available');
});

test('Self exclusion: editing a booking with excludeBookingId avoids self-collision', () => {
  const myBooking = [
    createMockBooking({
      id: 'my-edit-bk',
      accommodationId: 'firefly',
      checkInDate: '2026-11-10',
      checkOutDate: '2026-11-14',
      bookingStatus: 'confirmed',
    }),
  ];

  // Without excludeBookingId, it would collide
  const withoutExclude = checkAccommodationAvailability(
    'firefly',
    '2026-11-10',
    '2026-11-15',
    myBooking
  );
  assert.equal(withoutExclude.isAvailable, false);

  // With excludeBookingId: allows updating dates or guest details on the same unit
  const withExclude = checkAccommodationAvailability(
    'firefly',
    '2026-11-10',
    '2026-11-15',
    myBooking,
    [],
    'my-edit-bk'
  );
  assert.equal(withExclude.isAvailable, true);
});

test('Missing or empty dates: must show dates_required and NOT default to Booked', () => {
  const checkEmpty = checkAccommodationAvailability('firefly', '', '', []);
  assert.equal(checkEmpty.isAvailable, true);
  assert.equal(checkEmpty.status, 'dates_required');

  const checkReversed = checkAccommodationAvailability('firefly', '2026-11-15', '2026-11-10', []);
  assert.equal(checkReversed.isAvailable, true);
  assert.equal(checkReversed.status, 'dates_required');
});

test('Bunkbeds night-by-night availability across 24 beds', () => {
  const bunkBookings = [
    createMockBooking({
      id: 'bunk-1',
      accommodationId: 'bunkbeds',
      checkInDate: '2026-11-10',
      checkOutDate: '2026-11-12', // 2 nights
      guestCount: 6,
      bedNumbers: [1, 2, 3, 4, 5, 6],
      bookingStatus: 'confirmed',
    }),
    createMockBooking({
      id: 'bunk-2',
      accommodationId: 'bunkbeds',
      checkInDate: '2026-11-11',
      checkOutDate: '2026-11-13', // 2 nights
      guestCount: 4,
      bedNumbers: [7, 8, 9, 10],
      bookingStatus: 'confirmed',
    }),
  ];

  // Stay: Nov 10 to Nov 12
  // Night 10: 6 beds booked (18 available)
  // Night 11: 6 + 4 = 10 beds booked (14 available)
  // minAvailable across stay is 14
  const avail = calculateBunkbedAvailability('2026-11-10', '2026-11-12', bunkBookings);
  assert.equal(avail.minAvailableBedsAcrossStay, 14);
  assert.equal(avail.maxBookedBedsAcrossStay, 10);
});
