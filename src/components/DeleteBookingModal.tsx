import React, { useState } from 'react';
import { X, Trash2, AlertOctagon } from 'lucide-react';
import { Booking } from '../types/index.ts';
import { useResort } from '../context/ResortContext.tsx';
import { formatINR } from '../utils/pricing.ts';

interface DeleteBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
}

export const DeleteBookingModal: React.FC<DeleteBookingModalProps> = ({
  isOpen,
  onClose,
  booking,
}) => {
  const { deleteBooking } = useResort();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !booking) return null;

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteBooking(booking.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete reservation:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-booking-title"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-red-200 w-full max-w-md overflow-hidden text-[#1C3048] animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b border-red-100 flex items-center justify-between bg-red-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <div>
              <h2 id="delete-booking-title" className="text-sm font-bold text-red-900">
                Delete Reservation (Admin Only)
              </h2>
              <p className="text-[11px] text-red-600 font-mono">#{booking.bookingNumber}</p>
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
          <p className="text-slate-700 leading-relaxed font-medium">
            Are you sure you want to permanently delete reservation <strong>{booking.bookingNumber}</strong> for <strong>{booking.guestName}</strong>?
          </p>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col gap-1.5 text-slate-600">
            <div className="flex justify-between">
              <span>Accommodation:</span>
              <span className="font-bold text-[#092D26]">{booking.accommodationName}</span>
            </div>
            <div className="flex justify-between">
              <span>Dates:</span>
              <span>{booking.checkInDate} to {booking.checkOutDate}</span>
            </div>
            <div className="flex justify-between">
              <span>Grand Total:</span>
              <span>{formatINR(booking.grandTotal)}</span>
            </div>
          </div>

          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-[11px] text-red-800 leading-normal">
            <strong>Warning:</strong> This permanently removes the booking record from active views and calendar occupancy, immediately releasing all reserved dates.
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 rounded-full font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="px-5 py-2 rounded-full font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Deleting...' : 'Permanently Delete'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
