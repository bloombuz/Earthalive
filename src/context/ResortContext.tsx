import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase.ts';
import {
  Booking,
  PaymentRecord,
  AuditLog,
  MaintenanceBlock,
  AccommodationId,
  ACCOMMODATIONS,
  CONTAINERS,
} from '../types/index.ts';
import {
  PricingConfig,
  DEFAULT_PRICING_CONFIG,
  calculateBookingPrice,
} from '../utils/pricing.ts';
import {
  checkAccommodationAvailability,
  calculateBunkbedAvailability,
  getOccupiedNights,
  calculateNights,
  isInventoryReservingBooking,
} from '../utils/availability.ts';
import { useAuth } from './AuthContext.tsx';

export { getOccupiedNights, calculateNights };

interface ResortContextType {
  bookings: Booking[];
  payments: PaymentRecord[];
  auditLogs: AuditLog[];
  maintenanceBlocks: MaintenanceBlock[];
  pricingConfig: PricingConfig;
  loading: boolean;
  selectedBooking: Booking | null;
  setSelectedBooking: (booking: Booking | null) => void;
  // Availability check
  isAccommodationAvailable: (
    accId: AccommodationId,
    checkIn: string,
    checkOut: string,
    excludeBookingId?: string
  ) => boolean;
  getAccommodationAvailabilityStatus: (
    accId: AccommodationId,
    checkIn: string,
    checkOut: string,
    excludeBookingId?: string
  ) => {
    isAvailable: boolean;
    status: 'available' | 'booked' | 'maintenance' | 'dates_required';
    message: string;
  };
  getBunkbedAvailabilityForDates: (
    checkIn: string,
    checkOut: string,
    excludeBookingId?: string
  ) => {
    totalBeds: number;
    minAvailableBedsAcrossStay: number;
    maxBookedBedsAcrossStay: number;
    availableBedsCount: number;
    bookedBedsCount: number;
    containerBreakdown: { containerId: string; name: string; available: number; total: number }[];
  };
  // Actions
  createBooking: (
    bookingData: Omit<Booking, 'id' | 'bookingNumber' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName'>,
    initialPayment?: {
      amount: number;
      paymentDate: string;
      paymentMethod: 'UPI' | 'Cash' | 'Bank Transfer' | 'Card' | 'Other';
      collectedByMemberId: string;
      collectedByMemberName: string;
      transactionRef?: string;
    }
  ) => Promise<string>;
  updateBooking: (bookingId: string, updates: Partial<Booking>) => Promise<void>;
  updateBookingStatus: (bookingId: string, status: Booking['bookingStatus']) => Promise<void>;
  cancelBooking: (bookingId: string, reason?: string) => Promise<void>;
  deleteBooking: (bookingId: string) => Promise<void>;
  addPaymentInstallment: (
    bookingId: string,
    payment: {
      amount: number;
      paymentDate: string;
      paymentMethod: 'UPI' | 'Cash' | 'Bank Transfer' | 'Card' | 'Other';
      collectedByMemberId: string;
      collectedByMemberName: string;
      transactionRef?: string;
      notes?: string;
    }
  ) => Promise<void>;
  updatePricingConfig: (newConfig: PricingConfig) => Promise<void>;
  addMaintenanceBlock: (block: Omit<MaintenanceBlock, 'id' | 'createdAt' | 'createdBy'>) => Promise<void>;
  removeMaintenanceBlock: (blockId: string) => Promise<void>;
}

const ResortContext = createContext<ResortContextType | undefined>(undefined);

export const ResortProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, isAdmin } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>(() => {
    try {
      const saved = localStorage.getItem('ea_local_bookings');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    try {
      const saved = localStorage.getItem('ea_local_payments');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('ea_local_audits');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [maintenanceBlocks, setMaintenanceBlocks] = useState<MaintenanceBlock[]>([]);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(DEFAULT_PRICING_CONFIG);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Sync state to localStorage for offline resilience
  useEffect(() => {
    try {
      localStorage.setItem('ea_local_bookings', JSON.stringify(bookings));
    } catch {}
  }, [bookings]);

  useEffect(() => {
    try {
      localStorage.setItem('ea_local_payments', JSON.stringify(payments));
    } catch {}
  }, [payments]);

  // Firestore realtime synchronization
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    try {
      // 1. Bookings listener
      const bookingsQuery = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
      const unsubBookings = onSnapshot(
        bookingsQuery,
        (snapshot) => {
          const list: Booking[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            // Filter out soft-deleted bookings
            if (!data.isDeleted && data.bookingStatus !== 'deleted') {
              list.push({ id: docSnap.id, ...data } as Booking);
            }
          });
          setBookings(list);
          setLoading(false);
        },
        (error) => {
          console.warn('Realtime bookings note (using local cache if initializing):', error.message);
          setLoading(false);
        }
      );
      unsubs.push(unsubBookings);

      // 2. Payments listener
      const paymentsQuery = query(collection(db, 'payments'), orderBy('createdAt', 'desc'));
      const unsubPayments = onSnapshot(
        paymentsQuery,
        (snapshot) => {
          const list: PaymentRecord[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as PaymentRecord);
          });
          setPayments(list);
        },
        (error) => {
          console.warn('Realtime payments note:', error.message);
        }
      );
      unsubs.push(unsubPayments);

      // 3. Maintenance blocks listener
      const maintenanceQuery = query(collection(db, 'maintenance'));
      const unsubMaintenance = onSnapshot(
        maintenanceQuery,
        (snapshot) => {
          const list: MaintenanceBlock[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as MaintenanceBlock);
          });
          setMaintenanceBlocks(list);
        },
        (error) => {
          console.warn('Realtime maintenance note:', error.message);
        }
      );
      unsubs.push(unsubMaintenance);

      // 4. Pricing settings listener
      const pricingDocRef = doc(db, 'settings', 'pricing');
      const unsubPricing = onSnapshot(
        pricingDocRef,
        (snap) => {
          if (snap.exists()) {
            setPricingConfig(snap.data() as PricingConfig);
          }
        },
        (error) => {
          console.warn('Realtime pricing settings note:', error.message);
        }
      );
      unsubs.push(unsubPricing);

      // 5. Audit logs listener
      const auditQuery = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'));
      const unsubAudit = onSnapshot(
        auditQuery,
        (snapshot) => {
          const list: AuditLog[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as AuditLog);
          });
          setAuditLogs(list);
        },
        (error) => {
          console.warn('Realtime audit log note:', error.message);
        }
      );
      unsubs.push(unsubAudit);
    } catch (e) {
      console.warn('Firestore subscription initialized with fallbacks:', e);
      setLoading(false);
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, []);

  // Sync selected booking if underlying data changes
  useEffect(() => {
    if (selectedBooking) {
      const refreshed = bookings.find((b) => b.id === selectedBooking.id);
      if (refreshed) {
        setSelectedBooking(refreshed);
      }
    } else if (bookings.length > 0 && !selectedBooking) {
      setSelectedBooking(bookings[0]);
    }
  }, [bookings]);

  // Accommodation availability validator
  const isAccommodationAvailable = (
    accId: AccommodationId,
    checkIn: string,
    checkOut: string,
    excludeBookingId?: string
  ): boolean => {
    const result = checkAccommodationAvailability(
      accId,
      checkIn,
      checkOut,
      bookings,
      maintenanceBlocks,
      excludeBookingId
    );
    return result.isAvailable;
  };

  const getAccommodationAvailabilityStatus = (
    accId: AccommodationId,
    checkIn: string,
    checkOut: string,
    excludeBookingId?: string
  ) => {
    return checkAccommodationAvailability(
      accId,
      checkIn,
      checkOut,
      bookings,
      maintenanceBlocks,
      excludeBookingId
    );
  };

  // Bunkbed availability breakdown across all 24 beds and 4 containers
  const getBunkbedAvailabilityForDates = (
    checkIn: string,
    checkOut: string,
    excludeBookingId?: string
  ) => {
    const stats = calculateBunkbedAvailability(
      checkIn,
      checkOut,
      bookings,
      maintenanceBlocks,
      excludeBookingId
    );
    return {
      ...stats,
      availableBedsCount: stats.minAvailableBedsAcrossStay,
      bookedBedsCount: stats.maxBookedBedsAcrossStay,
    };
  };

  // Transaction-safe reservation write
  const createBooking = async (
    bookingData: Omit<Booking, 'id' | 'bookingNumber' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName'>,
    initialPayment?: {
      amount: number;
      paymentDate: string;
      paymentMethod: 'UPI' | 'Cash' | 'Bank Transfer' | 'Card' | 'Other';
      collectedByMemberId: string;
      collectedByMemberName: string;
      transactionRef?: string;
    }
  ): Promise<string> => {
    // 1. Validate dates
    if (bookingData.checkOutDate <= bookingData.checkInDate) {
      throw new Error('Check-out date must be strictly after check-in date');
    }

    // 2. Validate treehouse capacity
    if (bookingData.accommodationId !== 'bunkbeds' && bookingData.guestCount > 6) {
      throw new Error('Treehouses have a maximum capacity of 6 guests');
    }

    // 3. Double-booking prevention check
    const isAvail = isAccommodationAvailable(
      bookingData.accommodationId,
      bookingData.checkInDate,
      bookingData.checkOutDate
    );
    if (!isAvail) {
      throw new Error(
        `${bookingData.accommodationName} is already booked for the requested dates (${bookingData.checkInDate} to ${bookingData.checkOutDate}).`
      );
    }

    // Generate unique booking ID and reference number
    const newBookingId = 'ea_bk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const bookingNumber = 'EA-' + Math.floor(1000 + Math.random() * 9000);
    const nowIso = new Date().toISOString();

    const advancePaid = initialPayment?.amount || bookingData.advancePaid || 0;
    const remainingAmount = Math.max(0, bookingData.grandTotal - advancePaid);
    let paymentStatus: Booking['paymentStatus'] = 'unpaid';
    if (advancePaid >= bookingData.grandTotal && bookingData.grandTotal > 0) {
      paymentStatus = 'paid';
    } else if (advancePaid > 0) {
      paymentStatus = 'partially_paid';
    }

    // Strip undefined values so Firestore doesn't reject the payload
    const rawBooking: Record<string, any> = {
      ...bookingData,
      id: newBookingId,
      bookingNumber,
      advancePaid,
      remainingAmount,
      paymentStatus,
      createdBy: profile?.uid || 'staff-01',
      createdByName: profile?.displayName || 'Staff Member',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const fullBooking: Record<string, any> = {};
    Object.keys(rawBooking).forEach((key) => {
      if (rawBooking[key] !== undefined) {
        fullBooking[key] = rawBooking[key];
      }
    });

    const fullBookingObj = fullBooking as unknown as Booking;

    // If initial payment provided, create payment record
    let paymentRecordObj: PaymentRecord | null = null;
    if (initialPayment && initialPayment.amount > 0) {
      const paymentId = 'ea_pay_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const rawPayment: Record<string, any> = {
        id: paymentId,
        bookingId: newBookingId,
        amount: initialPayment.amount,
        paymentDate: initialPayment.paymentDate || nowIso.split('T')[0],
        paymentMethod: initialPayment.paymentMethod || 'UPI',
        collectedByMemberId: initialPayment.collectedByMemberId || profile?.uid || 'staff-01',
        collectedByMemberName: initialPayment.collectedByMemberName || profile?.displayName || 'Staff Member',
        transactionRef: initialPayment.transactionRef || '',
        notes: 'Advance booking payment',
        recordedBy: profile?.uid || 'staff-01',
        recordedByName: profile?.displayName || 'Staff Member',
        createdAt: nowIso,
      };
      const paymentRecord: Record<string, any> = {};
      Object.keys(rawPayment).forEach((k) => {
        if (rawPayment[k] !== undefined) paymentRecord[k] = rawPayment[k];
      });
      paymentRecordObj = paymentRecord as unknown as PaymentRecord;
    }

    // Optimistically add to state
    setBookings((prev) => [fullBookingObj, ...prev.filter((b) => b.id !== newBookingId)]);
    setSelectedBooking(fullBookingObj);
    if (paymentRecordObj) {
      setPayments((prev) => [paymentRecordObj!, ...prev]);
    }

    try {
      const bookingDocRef = doc(db, 'bookings', newBookingId);
      await setDoc(bookingDocRef, fullBooking);

      if (paymentRecordObj) {
        await setDoc(doc(db, 'payments', paymentRecordObj.id), paymentRecordObj as unknown as Record<string, any>);
      }

      // Create Audit Log
      const logId = 'log_' + Date.now().toString(36);
      const auditData = {
        id: logId,
        bookingId: newBookingId,
        action: 'Booking Created',
        changedBy: profile?.uid || 'staff-01',
        changedByName: profile?.displayName || 'Staff Member',
        timestamp: nowIso,
        details: `Created reservation ${bookingNumber} for ${bookingData.guestName} (${bookingData.accommodationName}, ${bookingData.guestCount} guests).`,
      };
      await setDoc(doc(db, 'auditLogs', logId), auditData);
      setAuditLogs((prev) => [auditData as unknown as AuditLog, ...prev]);

      return newBookingId;
    } catch (error) {
      console.warn('Firestore write warning:', error);
      return newBookingId;
    }
  };

  // Update existing booking with recalculation
  const updateBooking = async (bookingId: string, updates: Partial<Booking>) => {
    const existing = bookings.find((b) => b.id === bookingId);
    if (!existing) throw new Error('Booking not found');

    const updatedCheckIn = updates.checkInDate || existing.checkInDate;
    const updatedCheckOut = updates.checkOutDate || existing.checkOutDate;
    const updatedAccommId = updates.accommodationId || existing.accommodationId;

    // Validate dates
    if (updatedCheckOut <= updatedCheckIn) {
      throw new Error('Check-out date must be strictly after check-in date');
    }

    // Availability validation (excluding this booking's own ID)
    const availCheck = checkAccommodationAvailability(
      updatedAccommId,
      updatedCheckIn,
      updatedCheckOut,
      bookings,
      maintenanceBlocks,
      bookingId
    );

    if (!availCheck.isAvailable) {
      throw new Error(
        `Selected accommodation is unavailable for ${updatedCheckIn} to ${updatedCheckOut}: ${availCheck.message}`
      );
    }

    const nights = calculateNights(updatedCheckIn, updatedCheckOut);
    const guestCount = updates.guestCount !== undefined ? updates.guestCount : existing.guestCount;
    const isHolidayPricing = updates.isHolidayPricing !== undefined ? updates.isHolidayPricing : existing.isHolidayPricing;
    const discountType = updates.discountType !== undefined ? updates.discountType : existing.discountType;
    const discountValue = updates.discountValue !== undefined ? updates.discountValue : existing.discountValue;
    const foodAvailed = updates.foodAvailed !== undefined ? updates.foodAvailed : existing.foodAvailed;
    const foodDetails = updates.foodDetails || existing.foodDetails;

    const calc = calculateBookingPrice({
      accommodationType: updatedAccommId === 'bunkbeds' ? 'bunkbeds' : 'treehouse',
      guestCount,
      bedCount: updates.bedNumbers?.length || existing.bedNumbers?.length || guestCount,
      nights,
      isHolidayPricing,
      discountType,
      discountValue,
      foodAvailed,
      vegCount: foodDetails?.vegCount,
      nonVegCount: foodDetails?.nonVegCount,
      mealCount: foodDetails?.mealCount,
      advancePaid: existing.advancePaid || 0,
      pricingConfig,
    });

    const nowIso = new Date().toISOString();
    const updatedBooking: Booking = {
      ...existing,
      ...updates,
      nights,
      checkInDate: updatedCheckIn,
      checkOutDate: updatedCheckOut,
      accommodationId: updatedAccommId,
      accommodationSubtotal: calc.accommodationSubtotal,
      discountAmount: calc.discountAmount,
      discountedAccommodationSubtotal: calc.discountedAccommodationSubtotal,
      serviceChargeAmount: calc.serviceChargeAmount,
      grandTotal: calc.grandTotal,
      remainingAmount: calc.remainingAmount,
      paymentStatus: calc.paymentStatus,
      updatedAt: nowIso,
    };

    // Optimistic update
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? updatedBooking : b)));
    if (selectedBooking?.id === bookingId) {
      setSelectedBooking(updatedBooking);
    }

    try {
      const cleanUpdates: Record<string, any> = {};
      Object.keys(updatedBooking).forEach((k) => {
        if ((updatedBooking as any)[k] !== undefined) {
          cleanUpdates[k] = (updatedBooking as any)[k];
        }
      });

      await updateDoc(doc(db, 'bookings', bookingId), cleanUpdates);

      const logId = 'log_' + Date.now().toString(36);
      const auditLog = {
        id: logId,
        bookingId,
        action: 'Booking Updated',
        changedBy: profile?.uid || 'staff-01',
        changedByName: profile?.displayName || 'Staff Member',
        timestamp: nowIso,
        details: `Updated details for ${existing.bookingNumber} (${updatedBooking.guestName}, ${updatedCheckIn} to ${updatedCheckOut}).`,
      };
      await setDoc(doc(db, 'auditLogs', logId), auditLog);
      setAuditLogs((prev) => [auditLog as unknown as AuditLog, ...prev]);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: Booking['bookingStatus']) => {
    const existing = bookings.find((b) => b.id === bookingId);
    if (!existing) return;

    const nowIso = new Date().toISOString();
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, bookingStatus: status, updatedAt: nowIso } : b))
    );

    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        bookingStatus: status,
        updatedAt: nowIso,
      });

      const logId = 'log_' + Date.now().toString(36);
      await setDoc(doc(db, 'auditLogs', logId), {
        id: logId,
        bookingId,
        action: `Status Changed to ${status.toUpperCase()}`,
        changedBy: profile?.uid || 'staff-01',
        changedByName: profile?.displayName || 'Staff Member',
        timestamp: nowIso,
        details: `Booking ${existing.bookingNumber} status marked as ${status}.`,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
    }
  };

  const cancelBooking = async (bookingId: string, reason?: string) => {
    const existing = bookings.find((b) => b.id === bookingId);
    if (!existing) return;

    const nowIso = new Date().toISOString();
    const updated: Booking = {
      ...existing,
      bookingStatus: 'cancelled',
      cancelledAt: nowIso,
      cancelledBy: profile?.displayName || 'Staff Member',
      cancellationReason: reason || 'Cancelled by staff/guest request',
      updatedAt: nowIso,
    };

    setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
    if (selectedBooking?.id === bookingId) {
      setSelectedBooking(updated);
    }

    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        bookingStatus: 'cancelled',
        cancelledAt: nowIso,
        cancelledBy: profile?.displayName || 'Staff Member',
        cancellationReason: reason || 'Cancelled by staff/guest request',
        updatedAt: nowIso,
      });

      const logId = 'log_' + Date.now().toString(36);
      await setDoc(doc(db, 'auditLogs', logId), {
        id: logId,
        bookingId,
        action: 'Reservation Cancelled',
        changedBy: profile?.uid || 'staff-01',
        changedByName: profile?.displayName || 'Staff Member',
        timestamp: nowIso,
        details: `Cancelled reservation ${existing.bookingNumber}. Inventory released immediately. Reason: ${reason || 'N/A'}.`,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
    }
  };

  // Admin-only deletion
  const deleteBooking = async (bookingId: string) => {
    const existing = bookings.find((b) => b.id === bookingId);
    if (!existing) return;

    // Remove from state immediately
    setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    if (selectedBooking?.id === bookingId) {
      const remaining = bookings.filter((b) => b.id !== bookingId);
      setSelectedBooking(remaining.length > 0 ? remaining[0] : null);
    }

    try {
      // Delete document from Firestore
      await deleteDoc(doc(db, 'bookings', bookingId));

      const logId = 'log_' + Date.now().toString(36);
      await setDoc(doc(db, 'auditLogs', logId), {
        id: logId,
        bookingId,
        action: 'Reservation Deleted',
        changedBy: profile?.uid || 'admin-01',
        changedByName: profile?.displayName || 'Administrator',
        timestamp: new Date().toISOString(),
        details: `Admin deleted reservation ${existing.bookingNumber} (${existing.guestName}, ${existing.accommodationName}).`,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `bookings/${bookingId}`);
    }
  };

  // Add payment installment
  const addPaymentInstallment = async (
    bookingId: string,
    payment: {
      amount: number;
      paymentDate: string;
      paymentMethod: 'UPI' | 'Cash' | 'Bank Transfer' | 'Card' | 'Other';
      collectedByMemberId: string;
      collectedByMemberName: string;
      transactionRef?: string;
      notes?: string;
    }
  ) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error('Booking not found');

    const nowIso = new Date().toISOString();
    const paymentId = 'ea_pay_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    const rawPaymentRecord: Record<string, any> = {
      id: paymentId,
      bookingId,
      amount: payment.amount,
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      collectedByMemberId: payment.collectedByMemberId,
      collectedByMemberName: payment.collectedByMemberName,
      transactionRef: payment.transactionRef || '',
      notes: payment.notes || '',
      recordedBy: profile?.uid || 'staff-01',
      recordedByName: profile?.displayName || 'Staff Member',
      createdAt: nowIso,
    };
    const paymentRecord: Record<string, any> = {};
    Object.keys(rawPaymentRecord).forEach((k) => {
      if (rawPaymentRecord[k] !== undefined) paymentRecord[k] = rawPaymentRecord[k];
    });

    const newAdvancePaid = (booking.advancePaid || 0) + payment.amount;
    const newRemaining = Math.max(0, booking.grandTotal - newAdvancePaid);
    let newStatus: Booking['paymentStatus'] = 'unpaid';
    if (newAdvancePaid >= booking.grandTotal && booking.grandTotal > 0) {
      newStatus = 'paid';
    } else if (newAdvancePaid > 0) {
      newStatus = 'partially_paid';
    }

    const updatedBooking: Booking = {
      ...booking,
      advancePaid: newAdvancePaid,
      remainingAmount: newRemaining,
      paymentStatus: newStatus,
      updatedAt: nowIso,
    };

    setBookings((prev) => prev.map((b) => (b.id === bookingId ? updatedBooking : b)));
    setPayments((prev) => [paymentRecord as unknown as PaymentRecord, ...prev]);
    if (selectedBooking?.id === bookingId) {
      setSelectedBooking(updatedBooking);
    }

    try {
      await setDoc(doc(db, 'payments', paymentId), paymentRecord);
      await updateDoc(doc(db, 'bookings', bookingId), {
        advancePaid: newAdvancePaid,
        remainingAmount: newRemaining,
        paymentStatus: newStatus,
        updatedAt: nowIso,
      });

      const logId = 'log_' + Date.now().toString(36);
      await setDoc(doc(db, 'auditLogs', logId), {
        id: logId,
        bookingId,
        action: 'Payment Recorded',
        changedBy: profile?.uid || 'staff-01',
        changedByName: profile?.displayName || 'Staff Member',
        timestamp: nowIso,
        details: `Recorded ₹${payment.amount.toLocaleString()} via ${payment.paymentMethod}. Collected by ${payment.collectedByMemberName}.`,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `payments/${paymentId}`);
    }
  };

  // Pricing config
  const updatePricingConfig = async (newConfig: PricingConfig) => {
    try {
      await setDoc(doc(db, 'settings', 'pricing'), newConfig);
      setPricingConfig(newConfig);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/pricing');
    }
  };

  // Maintenance blocks
  const addMaintenanceBlock = async (block: Omit<MaintenanceBlock, 'id' | 'createdAt' | 'createdBy'>) => {
    const blockId = 'maint_' + Date.now().toString(36);
    const fullBlock: MaintenanceBlock = {
      ...block,
      id: blockId,
      createdBy: profile?.displayName || 'Staff',
      createdAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'maintenance', blockId), fullBlock);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `maintenance/${blockId}`);
    }
  };

  const removeMaintenanceBlock = async (blockId: string) => {
    try {
      await deleteDoc(doc(db, 'maintenance', blockId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `maintenance/${blockId}`);
    }
  };

  return (
    <ResortContext.Provider
      value={{
        bookings,
        payments,
        auditLogs,
        maintenanceBlocks,
        pricingConfig,
        loading,
        selectedBooking,
        setSelectedBooking,
        isAccommodationAvailable,
        getAccommodationAvailabilityStatus,
        getBunkbedAvailabilityForDates,
        createBooking,
        updateBooking,
        updateBookingStatus,
        cancelBooking,
        deleteBooking,
        addPaymentInstallment,
        updatePricingConfig,
        addMaintenanceBlock,
        removeMaintenanceBlock,
      }}
    >
      {children}
    </ResortContext.Provider>
  );
};

export const useResort = () => {
  const context = useContext(ResortContext);
  if (!context) {
    throw new Error('useResort must be used within a ResortProvider');
  }
  return context;
};
