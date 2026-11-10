import React, { useState } from 'react';
import { X, AlertTriangle, Calendar, CheckCircle2 } from 'lucide-react';
import { Booking } from '../types/index.ts';
import { useResort } from '../context/ResortContext.tsx';
import { formatINR } from '../utils/pricing.ts';

interface CancelBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
}

export const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  isOpen,
  onClose,
  booking,
}) => {
  const { cancelBooking } = useResort();
  const [reason, setReason] = useState('Guest requested cancellation');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !booking) return null;

  const handleConfirmCancel = async () => {
    setIsSubmitting(true);
    try {
      await cancelBooking(booking.id, reason.trim() || undefined);
      onClose();
    } catch (err) {
      console.error('Failed to cancel reservation:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-booking-title"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-amber-100 w-full max-w-md overflow-hidden text-[#1C3048] animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b border-amber-100 flex items-center justify-between bg-amber-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <h2 id="cancel-booking-title" className="text-sm font-bold text-[#092D26]">
                Cancel Reservation
              </h2>
              <p className="text-[11px] text-slate-500">Ref #{booking.bookingNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Are you sure you want to cancel the reservation for <strong>{booking.guestName}</strong>?
          </p>

          <div className="bg-[#f5fbf8] p-3.5 rounded-2xl border border-emerald-100 flex flex-col gap-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Accommodation:</span>
              <span className="font-bold text-[#092D26]">{booking.accommodationName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Stay Dates:</span>
              <span className="font-semibold text-slate-800">
                {booking.checkInDate} to {booking.checkOutDate} ({booking.nights} nights)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Value:</span>
              <span className="font-semibold text-slate-800">{formatINR(booking.grandTotal)}</span>
            </div>
            {booking.advancePaid > 0 && (
              <div className="flex justify-between text-emerald-800 font-semibold pt-1 border-t border-emerald-100">
                <span>Advance Collected:</span>
                <span>{formatINR(booking.advancePaid)}</span>
              </div>
            )}
          </div>

          <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-200/60 text-[11px] text-amber-900 leading-normal">
            Inventory for <strong>{booking.accommodationName}</strong> ({booking.checkInDate} to {booking.checkOutDate}) will be immediately released and made available for new bookings.
          </div>

          <div>
            <label className="font-semibold text-slate-600 block mb-1">
              Cancellation Reason (Optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Guest travel dates changed"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none text-xs"
            />
          </div>

          <div className="pt-3 border-t border-emerald-50 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-full font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Keep Reservation
            </button>
            <button
              type="button"
              onClick={handleConfirmCancel}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-full font-bold bg-amber-700 hover:bg-amber-800 text-white flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
