/**
 * Date and Availability Engine for Earthalive Resort (Asia/Kolkata timezone)
 * 
 * Rules:
 * 1. Stay interval is half-open: [checkIn, checkOut).
 *    A checkout on date X allows a new check-in on date X (same-day turnover).
 * 2. Overlap invariant:
 *    existing.checkIn < requested.checkOut AND existing.checkOut > requested.checkIn
 * 3. Only inventory-reserving statuses block dates:
 *    - 'confirmed'
 *    - 'checked_in'
 *    - 'checked_out' (historical for its occupied dates)
 *    Exclude: 'cancelled', 'deleted', drafts, or isDeleted === true.
 * 4. Treehouses (Firefly, Sunbird, Woodpecker) are 3 independent units.
 *    Booking one MUST NOT block the other two.
 * 5. Bunkbeds: 24 total beds across 4 containers (6 beds each).
 *    Calculated night-by-night across every night of the stay.
 * 6. If dates are missing or invalid, availability must NOT default to Booked.
 */

import { AccommodationId, Booking, MaintenanceBlock, CONTAINERS } from '../types/index.ts';

/**
 * Format a Date object to YYYY-MM-DD in Asia/Kolkata timezone
 */
export function getKolkataDateString(d: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(d);
  } catch {
    return d.toISOString().split('T')[0];
  }
}

/**
 * Add days to a YYYY-MM-DD string without timezone skew
 */
export function addDays(dateStr: string, days: number): string {
  if (!dateStr || !dateStr.includes('-')) return dateStr;
  const parts = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + days));
  return date.toISOString().split('T')[0];
}

/**
 * Calculate the number of nights between checkIn and checkOut
 */
export function calculateNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut || checkOut <= checkIn) return 0;
  const start = new Date(checkIn + 'T00:00:00Z');
  const end = new Date(checkOut + 'T00:00:00Z');
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Return an array of occupied night strings for [checkIn, checkOut)
 */
export function getOccupiedNights(checkIn: string, checkOut: string): string[] {
  if (!checkIn || !checkOut || checkOut <= checkIn) return [];
  const nights: string[] = [];
  let curr = checkIn;
  while (curr < checkOut) {
    nights.push(curr);
    curr = addDays(curr, 1);
  }
  return nights;
}

/**
 * Check if two date intervals [startA, endA) and [startB, endB) overlap
 */
export function doesStayOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  if (!startA || !endA || !startB || !endB) return false;
  return startA < endB && endA > startB;
}

/**
 * Check whether a booking record is inventory-reserving
 */
export function isInventoryReservingBooking(b: Booking): boolean {
  if (b.isDeleted) return false;
  const status = b.bookingStatus;
  if (!status || status === 'cancelled' || (status as string) === 'deleted') {
    return false;
  }
  return status === 'confirmed' || status === 'checked_in' || status === 'checked_out';
}

/**
 * Check if a specific accommodation unit is available for requested dates
 */
export function checkAccommodationAvailability(
  accId: AccommodationId,
  checkIn: string,
  checkOut: string,
  bookings: Booking[],
  maintenanceBlocks: MaintenanceBlock[] = [],
  excludeBookingId?: string
): {
  isAvailable: boolean;
  status: 'available' | 'booked' | 'maintenance' | 'dates_required';
  message: string;
} {
  // If dates are missing or invalid, do NOT default to booked
  if (!checkIn || !checkOut || checkOut <= checkIn) {
    return {
      isAvailable: true,
      status: 'dates_required',
      message: 'Select check-in and check-out dates to check live availability.',
    };
  }

  // Check maintenance blocks
  const maintenanceConflict = maintenanceBlocks.find((mb) => {
    if (mb.accommodationId !== accId) return false;
    return doesStayOverlap(mb.startDate, mb.endDate, checkIn, checkOut);
  });

  if (maintenanceConflict) {
    return {
      isAvailable: false,
      status: 'maintenance',
      message: `Scheduled maintenance: ${maintenanceConflict.reason}`,
    };
  }

  // Treehouses: exactly 1 unit per accommodationId
  if (accId !== 'bunkbeds') {
    const conflictingBooking = bookings.find((b) => {
      if (excludeBookingId && b.id === excludeBookingId) return false;
      if (b.accommodationId !== accId) return false;
      if (!isInventoryReservingBooking(b)) return false;
      return doesStayOverlap(b.checkInDate, b.checkOutDate, checkIn, checkOut);
    });

    if (conflictingBooking) {
      return {
        isAvailable: false,
        status: 'booked',
        message: `Already reserved by ${conflictingBooking.bookingNumber} (${conflictingBooking.checkInDate} to ${conflictingBooking.checkOutDate})`,
      };
    }

    return {
      isAvailable: true,
      status: 'available',
      message: 'Available for requested stay dates',
    };
  }

  // Bunkbeds: 24 total beds
  const bunkStats = calculateBunkbedAvailability(checkIn, checkOut, bookings, maintenanceBlocks, excludeBookingId);
  if (bunkStats.minAvailableBedsAcrossStay > 0) {
    return {
      isAvailable: true,
      status: 'available',
      message: `${bunkStats.minAvailableBedsAcrossStay} of 24 beds available`,
    };
  } else {
    return {
      isAvailable: false,
      status: 'booked',
      message: 'All 24 bunkbeds are fully reserved on one or more requested nights',
    };
  }
}

/**
 * Detailed bunkbed availability calculation across every night of the stay
 */
export function calculateBunkbedAvailability(
  checkIn: string,
  checkOut: string,
  bookings: Booking[],
  maintenanceBlocks: MaintenanceBlock[] = [],
  excludeBookingId?: string
) {
  const stayNights = getOccupiedNights(checkIn, checkOut);
  if (stayNights.length === 0) {
    return {
      totalBeds: 24,
      minAvailableBedsAcrossStay: 24,
      maxBookedBedsAcrossStay: 0,
      containerBreakdown: CONTAINERS.map((c) => ({
        containerId: c.id,
        name: c.name,
        available: 6,
        total: 6,
      })),
      occupiedBedNumbers: [] as number[],
    };
  }

  let minAvailableBedsAcrossStay = 24;
  let maxBookedBedsAcrossStay = 0;
  const allOccupiedBedNumbersAcrossStay = new Set<number>();

  stayNights.forEach((night) => {
    let bookedBedsOnNight = 0;

    bookings.forEach((b) => {
      if (excludeBookingId && b.id === excludeBookingId) return;
      if (b.accommodationId !== 'bunkbeds') return;
      if (!isInventoryReservingBooking(b)) return;

      // Check if booking covers this night
      if (b.checkInDate <= night && b.checkOutDate > night) {
        const bedCount = b.bedNumbers && b.bedNumbers.length > 0 ? b.bedNumbers.length : (b.guestCount || 1);
        bookedBedsOnNight += bedCount;
        b.bedNumbers?.forEach((bed) => allOccupiedBedNumbersAcrossStay.add(bed));
      }
    });

    // Account for bunkbed maintenance
    maintenanceBlocks.forEach((mb) => {
      if (mb.accommodationId !== 'bunkbeds') return;
      if (mb.startDate <= night && mb.endDate > night) {
        const maintCount = mb.bedNumbers?.length || (mb.containerId ? 6 : 24);
        bookedBedsOnNight += maintCount;
        mb.bedNumbers?.forEach((bed) => allOccupiedBedNumbersAcrossStay.add(bed));
      }
    });

    if (bookedBedsOnNight > maxBookedBedsAcrossStay) {
      maxBookedBedsAcrossStay = bookedBedsOnNight;
    }

    const availableOnNight = Math.max(0, 24 - bookedBedsOnNight);
    if (availableOnNight < minAvailableBedsAcrossStay) {
      minAvailableBedsAcrossStay = availableOnNight;
    }
  });

  // Breakdown per container
  const containerBreakdown = CONTAINERS.map((c) => {
    let occupiedInContainer = 0;
    c.bedNumbers.forEach((bedNum) => {
      if (allOccupiedBedNumbersAcrossStay.has(bedNum)) {
        occupiedInContainer++;
      }
    });
    return {
      containerId: c.id,
      name: c.name,
      available: Math.max(0, c.totalBeds - occupiedInContainer),
      total: c.totalBeds,
    };
  });

  return {
    totalBeds: 24,
    minAvailableBedsAcrossStay,
    maxBookedBedsAcrossStay,
    containerBreakdown,
    occupiedBedNumbers: Array.from(allOccupiedBedNumbersAcrossStay),
  };
}
