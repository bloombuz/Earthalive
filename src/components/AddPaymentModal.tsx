import React, { useState } from 'react';
import { X, CreditCard, DollarSign, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { Booking } from '../types/index.ts';
import { useResort } from '../context/ResortContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { formatINR, maskGuestName } from '../utils/pricing.ts';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
}

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  isOpen,
  onClose,
  booking,
}) => {
  const { addPaymentInstallment } = useResort();
  const { profile, canViewUnmaskedData } = useAuth();

  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Cash' | 'Bank Transfer' | 'Card' | 'Other'>('UPI');
  const [collectorName, setCollectorName] = useState(profile?.displayName || 'Staff Member');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  const displayName = canViewUnmaskedData ? booking.guestName : maskGuestName(booking.guestName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (amount <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addPaymentInstallment(booking.id, {
        amount,
        paymentDate,
        paymentMethod,
        collectedByMemberId: profile?.uid || 'staff-01',
        collectedByMemberName: collectorName.trim() || profile?.displayName || 'Staff Member',
        transactionRef: transactionRef.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-payment-title"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-emerald-100 w-full max-w-md overflow-hidden text-[#1C3048] animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b border-emerald-50 flex items-center justify-between bg-[#ebf8f2]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#092D26] text-white flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <h2 id="add-payment-title" className="text-sm font-bold text-[#092D26]">
                Record Payment Installment
              </h2>
              <p className="text-[11px] text-slate-500">{booking.bookingNumber} · {displayName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="w-7 h-7 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 text-xs">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 bg-[#f5fbf8] p-3 rounded-2xl border border-emerald-100">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Outstanding</span>
              <span className="text-sm font-extrabold text-amber-700">{formatINR(booking.remainingAmount)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Already Paid</span>
              <span className="text-sm font-extrabold text-emerald-700">{formatINR(booking.advancePaid || 0)}</span>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-600 block mb-1">
              Payment Amount (₹) *
            </label>
            <input
              type="number"
              required
              min="1"
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="e.g. 5000"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm font-bold text-[#092D26]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Payment Date</label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
              >
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Card">Card</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-600 block mb-1">
              Payment Collected By (Staff Member)
            </label>
            <input
              type="text"
              required
              value={collectorName}
              onChange={(e) => setCollectorName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-600 block mb-1">
              Transaction / Reference ID (Optional)
            </label>
            <input
              type="text"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. UPI / IMPS Ref #"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
            />
          </div>

          <div className="pt-3 border-t border-emerald-50 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || amount <= 0}
              className="px-5 py-2 rounded-full font-bold bg-[#092D26] hover:bg-[#0c3c33] text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>{isSubmitting ? 'Recording...' : 'Save Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
