import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Filter,
  Search,
  CheckCircle2,
  Calendar,
  Users,
  Plus,
  ArrowUpRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { PaymentRecord, Booking } from '../types/index.ts';
import { useResort } from '../context/ResortContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { formatINR } from '../utils/pricing.ts';
import { getKolkataDateString, isInventoryReservingBooking } from '../utils/availability.ts';

interface PaymentsViewProps {
  onOpenPaymentModal: (booking: Booking) => void;
  onSelectBooking: (booking: Booking) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  onOpenPaymentModal,
  onSelectBooking,
}) => {
  const { payments, bookings } = useResort();

  const [dateFilterMode, setDateFilterMode] = useState<'payment_date' | 'stay_date'>('payment_date');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'this_week' | 'this_month'>('all');
  const [selectedCollector, setSelectedCollector] = useState<string>('all');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const todayStr = useMemo(() => getKolkataDateString(), []);

  // Map booking info for each payment
  const bookingMap = useMemo(() => {
    const map = new Map<string, Booking>();
    bookings.forEach((b) => map.set(b.id, b));
    return map;
  }, [bookings]);

  // Filter payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const b = bookingMap.get(p.bookingId);

      // Date filtering
      const dateToCheck = dateFilterMode === 'payment_date' ? p.paymentDate : (b?.checkInDate || p.paymentDate);

      if (datePreset === 'today') {
        if (dateToCheck !== todayStr) return false;
      } else if (datePreset === 'this_week') {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        if (dateToCheck < oneWeekAgo) return false;
      } else if (datePreset === 'this_month') {
        const currentMonth = todayStr.slice(0, 7);
        if (!dateToCheck.startsWith(currentMonth)) return false;
      }

      // Method filter
      if (selectedMethod !== 'all' && p.paymentMethod !== selectedMethod) return false;

      // Collector filter
      if (selectedCollector !== 'all' && p.collectedByMemberId !== selectedCollector) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const bRef = b?.bookingNumber.toLowerCase() || '';
        const gName = (b?.guestName || '').toLowerCase();
        const colName = (p.collectedByMemberName || '').toLowerCase();
        const txRef = (p.transactionRef || '').toLowerCase();
        if (!bRef.includes(q) && !gName.includes(q) && !colName.includes(q) && !txRef.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [payments, bookingMap, dateFilterMode, datePreset, selectedMethod, selectedCollector, searchQuery, todayStr]);

  // Aggregate metrics
  const totalCollections = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [filteredPayments]);

  const totalBookingValue = useMemo(() => {
    return bookings
      .filter((b) => isInventoryReservingBooking(b))
      .reduce((sum, b) => sum + b.grandTotal, 0);
  }, [bookings]);

  const totalAllTimeCollected = useMemo(() => {
    return payments.reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const outstandingResortBalance = Math.max(0, totalBookingValue - totalAllTimeCollected);

  // Method distribution
  const methodStats = useMemo(() => {
    const stats: Record<string, { count: number; total: number }> = {
      UPI: { count: 0, total: 0 },
      Cash: { count: 0, total: 0 },
      'Bank Transfer': { count: 0, total: 0 },
      Card: { count: 0, total: 0 },
      Other: { count: 0, total: 0 },
    };
    filteredPayments.forEach((p) => {
      const m = p.paymentMethod || 'Other';
      if (!stats[m]) stats[m] = { count: 0, total: 0 };
      stats[m].count++;
      stats[m].total += p.amount;
    });
    return stats;
  }, [filteredPayments]);

  // Member collections breakdown
  const memberCollections = useMemo(() => {
    const map = new Map<string, { name: string; count: number; total: number }>();
    filteredPayments.forEach((p) => {
      const memId = p.collectedByMemberId || p.collectedByMemberName || 'staff';
      const existing = map.get(memId);
      if (existing) {
        existing.count += 1;
        existing.total += p.amount;
      } else {
        map.set(memId, {
          name: p.collectedByMemberName || 'Staff Member',
          count: 1,
          total: p.amount,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredPayments]);

  // Outstanding bookings (due for collection)
  const dueBookings = useMemo(() => {
    return bookings
      .filter((b) => isInventoryReservingBooking(b) && b.remainingAmount > 0)
      .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));
  }, [bookings]);

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
      {/* Page Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#092D26] tracking-tight">
              Payments
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#092D26] text-white">
              INR (₹) Tracker
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Realized cash collections, advance installments, member attribution, and outstanding balances.
          </p>
        </div>

        {/* Date Filter & Preset Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode toggle: Payment Date vs Stay Date */}
          <div className="flex items-center bg-white/80 backdrop-blur-md border border-[#cce8dc] p-1 rounded-full text-xs shadow-sm">
            <button
              onClick={() => setDateFilterMode('payment_date')}
              className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                dateFilterMode === 'payment_date'
                  ? 'bg-[#092D26] text-white'
                  : 'text-slate-600 hover:bg-emerald-50'
              }`}
            >
              By Payment Date
            </button>
            <button
              onClick={() => setDateFilterMode('stay_date')}
              className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                dateFilterMode === 'stay_date'
                  ? 'bg-[#092D26] text-white'
                  : 'text-slate-600 hover:bg-emerald-50'
              }`}
            >
              By Stay Date
            </button>
          </div>

          {/* Range Presets */}
          <div className="flex items-center bg-white/80 backdrop-blur-md border border-[#cce8dc] p-1 rounded-full text-xs shadow-sm">
            {(['all', 'today', 'this_week', 'this_month'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => setDatePreset(preset)}
                className={`px-3 py-1 rounded-full font-bold capitalize transition-all cursor-pointer ${
                  datePreset === preset ? 'bg-[#092D26] text-white' : 'text-slate-600 hover:bg-emerald-50'
                }`}
              >
                {preset.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top 4 KPI Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Filtered Collections */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Filtered Collections</span>
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-emerald-800">
              {formatINR(totalCollections)}
            </span>
            <span className="text-[11px] text-emerald-600 block mt-0.5">
              {filteredPayments.length} transactions in selected view
            </span>
          </div>
        </div>

        {/* Outstanding Resort Balance */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Outstanding Balance</span>
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-700">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-amber-700">
              {formatINR(outstandingResortBalance)}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Across {dueBookings.length} bookings pending settlement
            </span>
          </div>
        </div>

        {/* All-Time Realized Cash */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">All-Time Realized</span>
            <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-800">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-[#092D26]">
              {formatINR(totalAllTimeCollected)}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Cumulative collections across all bookings
            </span>
          </div>
        </div>

        {/* Payment Channels Split */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Payment Channels</span>
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex flex-col gap-0.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">UPI:</span>
              <span className="font-bold text-[#092D26]">{formatINR(methodStats['UPI']?.total || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cash:</span>
              <span className="font-bold text-emerald-700">{formatINR(methodStats['Cash']?.total || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Bank / Card:</span>
              <span className="font-bold text-slate-700">
                {formatINR((methodStats['Bank Transfer']?.total || 0) + (methodStats['Card']?.total || 0))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 70/30 Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Payments Table (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Search and Secondary Filter Bar */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-3 border border-[#cce8dc] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-sm">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ref #, guest, member, or txn..."
                className="w-full pl-8 pr-3 py-1.5 rounded-full border border-slate-200 outline-none focus:border-emerald-500 text-xs text-[#092D26]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="px-3 py-1.5 rounded-full border border-slate-200 outline-none text-xs bg-white text-slate-700"
              >
                <option value="all">All Channels</option>
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Card">Card</option>
              </select>

              <span className="text-slate-400 font-mono">
                {filteredPayments.length} {filteredPayments.length === 1 ? 'record' : 'records'}
              </span>
            </div>
          </div>

          {/* Payments List Table Container */}
          <div className="bg-[#eef9f4]/90 backdrop-blur-md rounded-3xl p-4 sm:p-6 shadow-sm border border-[#cce8dc] overflow-hidden">
            {filteredPayments.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-800 mb-3">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-[#092D26]">No Payment Records Found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  {searchQuery || datePreset !== 'all'
                    ? 'No payments match your active filters. Try adjusting the date range or clear search.'
                    : 'Payments will appear here when recorded upon reservation creation or checkout.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#cce8dc]/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Booking Ref</th>
                      <th className="py-3 px-3">Guest & Room</th>
                      <th className="py-3 px-3">Channel</th>
                      <th className="py-3 px-3">Collector</th>
                      <th className="py-3 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#cce8dc]/40">
                    {filteredPayments.map((p) => {
                      const b = bookingMap.get(p.bookingId);
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-white/80 transition-colors group cursor-pointer"
                          onClick={() => b && onSelectBooking(b)}
                        >
                          <td className="py-3 px-3 whitespace-nowrap text-slate-700 font-medium">
                            {p.paymentDate}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#cce8dc] text-[#092D26] shadow-2xs">
                              {b?.bookingNumber || 'EA-REF'}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-[#092D26]">
                                {b?.guestName || 'Guest'}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {b?.accommodationName || 'Accommodation'}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-emerald-900 border border-emerald-100">
                              {p.paymentMethod}
                            </span>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-semibold text-slate-800">
                              {p.collectedByMemberName}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <span className="font-extrabold text-[#092D26] text-sm">
                              {formatINR(p.amount)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Detail Panel: Member Totals & Due Collections (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-5 sticky top-6">
          {/* Member Collections Summary Card */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-100 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-50">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-800" />
                <h3 className="text-sm font-bold text-[#092D26]">Collector Attribution</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {memberCollections.length} collectors
              </span>
            </div>

            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
              {memberCollections.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  No payment collections attributed in this period.
                </p>
              ) : (
                memberCollections.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-2xl bg-[#f5fbf8] border border-emerald-100/70 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#092D26] block leading-tight">{m.name}</span>
                      <span className="text-[10px] text-slate-500">
                        {m.count} {m.count === 1 ? 'collection' : 'collections'}
                      </span>
                    </div>
                    <span className="font-extrabold text-emerald-800">{formatINR(m.total)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending / Outstanding Balances Follow-up */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-100 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-50">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-[#092D26]">Due Balances</h3>
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                {dueBookings.length} Pending
              </span>
            </div>

            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
              {dueBookings.length === 0 ? (
                <div className="p-4 rounded-2xl bg-emerald-50 text-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 mx-auto mb-1" />
                  <p className="text-xs font-bold text-[#092D26]">All Bookings Paid</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    No outstanding balance due from guests.
                  </p>
                </div>
              ) : (
                dueBookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-2.5 rounded-2xl bg-amber-50/40 border border-amber-200/60 flex items-center justify-between text-xs hover:bg-amber-50 transition-colors"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#092D26]">
                          {b.guestName}
                        </span>
                        <span className="font-mono text-[9px] px-1 py-0.2 bg-white rounded text-slate-600 border border-slate-200">
                          {b.bookingNumber}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        Check-in: {b.checkInDate} · Due: {formatINR(b.remainingAmount)}
                      </span>
                    </div>

                    <button
                      onClick={() => onOpenPaymentModal(b)}
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#092D26] hover:bg-[#0c3c33] text-white transition-all shadow-2xs shrink-0 cursor-pointer"
                    >
                      Collect
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
