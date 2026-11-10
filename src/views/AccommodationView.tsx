import React, { useState, useMemo } from 'react';
import {
  Layers,
  Users,
  Calendar,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle2,
  Wrench,
  Sparkles,
} from 'lucide-react';
import { ACCOMMODATIONS, CONTAINERS, AccommodationId, MaintenanceBlock } from '../types/index.ts';
import { useResort } from '../context/ResortContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { formatINR } from '../utils/pricing.ts';
import { getKolkataDateString, addDays, isInventoryReservingBooking } from '../utils/availability.ts';

export const AccommodationView: React.FC = () => {
  const { bookings, maintenanceBlocks, addMaintenanceBlock, removeMaintenanceBlock, isAccommodationAvailable } = useResort();
  const { isAdmin } = useAuth();

  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [selectedAccommId, setSelectedAccommId] = useState<AccommodationId>('firefly');
  const [blockStartDate, setBlockStartDate] = useState(() => getKolkataDateString());
  const [blockEndDate, setBlockEndDate] = useState(() => addDays(getKolkataDateString(), 2));
  const [blockReason, setBlockReason] = useState('Routine timber inspection & pest control');
  const [selectedContainer, setSelectedContainer] = useState('all');

  const todayStr = useMemo(() => getKolkataDateString(), []);
  const tomorrowStr = useMemo(() => addDays(todayStr, 1), [todayStr]);

  // Helper for treehouse next bookings
  const getNextBooking = (accId: AccommodationId) => {
    const future = bookings
      .filter((b) => b.accommodationId === accId && isInventoryReservingBooking(b) && b.checkOutDate >= todayStr)
      .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));
    return future[0] || null;
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    await addMaintenanceBlock({
      accommodationId: selectedAccommId,
      containerId: selectedAccommId === 'bunkbeds' && selectedContainer !== 'all' ? selectedContainer : undefined,
      startDate: blockStartDate,
      endDate: blockEndDate,
      reason: blockReason,
    });
    setMaintenanceModalOpen(false);
  };

  // Bunkbed stats for today
  const bunkbedsBookedToday = useMemo(() => {
    let booked = 0;
    bookings.forEach((b) => {
      if (
        b.accommodationId === 'bunkbeds' &&
        isInventoryReservingBooking(b) &&
        b.checkInDate <= todayStr &&
        b.checkOutDate > todayStr
      ) {
        booked += b.bedNumbers?.length || b.guestCount || 1;
      }
    });
    return booked;
  }, [bookings, todayStr]);

  const bunkbedsMaintenanceToday = useMemo(() => {
    let count = 0;
    maintenanceBlocks.forEach((mb) => {
      if (mb.accommodationId === 'bunkbeds' && mb.startDate <= todayStr && mb.endDate > todayStr) {
        count += mb.containerId ? 6 : 24;
      }
    });
    return Math.min(24, count);
  }, [maintenanceBlocks, todayStr]);

  const bunkbedsAvailableToday = Math.max(0, 24 - bunkbedsBookedToday - bunkbedsMaintenanceToday);
  const bunkbedsOccupancyPct = Math.round((bunkbedsBookedToday / 24) * 100);

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#092D26] tracking-tight">
              Accommodation
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#092D26] text-white">
              4 Physical Units
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Bangalore resort inventory: 3 Luxury Treehouses and 24 Bunkbeds across 4 containers.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setMaintenanceModalOpen(true)}
            className="px-5 py-2.5 rounded-full text-xs font-bold bg-amber-800 hover:bg-amber-900 text-white flex items-center gap-2 self-start sm:self-auto shadow-sm cursor-pointer"
          >
            <Wrench className="w-4 h-4" />
            <span>Schedule Maintenance</span>
          </button>
        )}
      </div>

      {/* Treehouses Grid (3 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ACCOMMODATIONS.filter((a) => a.type === 'treehouse').map((acc) => {
          const isAvailToday = isAccommodationAvailable(acc.id, todayStr, tomorrowStr);
          const nextBk = getNextBooking(acc.id);

          return (
            <div
              key={acc.id}
              className="bg-white rounded-3xl shadow-lg border border-emerald-100 overflow-hidden flex flex-col justify-between group"
            >
              {/* Photo & Badge */}
              <div className="relative h-48 sm:h-52 overflow-hidden">
                <img
                  src={acc.image}
                  alt={acc.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/90 backdrop-blur-md text-[#092D26] shadow-sm">
                  {acc.badge}
                </span>
                <span
                  className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${
                    isAvailToday
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-600 text-white'
                  }`}
                >
                  {isAvailToday ? 'Available Today' : 'Occupied'}
                </span>
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h3 className="text-lg font-bold leading-tight">{acc.name}</h3>
                  <p className="text-xs text-white/80">{acc.wing}</p>
                </div>
              </div>

              {/* Details */}
              <div className="p-5 flex flex-col gap-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  {acc.description}
                </p>

                <div className="grid grid-cols-2 gap-2 bg-[#f5fbf8] p-3 rounded-2xl border border-emerald-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Max Capacity</span>
                    <span className="text-sm font-bold text-[#092D26]">Up to 6 guests</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Base Price</span>
                    <span className="text-sm font-bold text-[#092D26]">
                      {formatINR(acc.basePrice)} <span className="text-[10px] font-normal text-slate-500">/ 4 guests</span>
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Additional guest:</span>
                    <span className="font-semibold text-slate-700">₹1,500 / night</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Next Check-in:</span>
                    <span className="font-semibold text-[#092D26]">
                      {nextBk ? nextBk.checkInDate : 'None Scheduled'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Next Check-out:</span>
                    <span className="font-semibold text-slate-700">
                      {nextBk ? nextBk.checkOutDate : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bunkbeds Master Card */}
      <div className="bg-white rounded-3xl shadow-lg border border-emerald-100 p-6 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-50">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900">
                Eco-Container Complex
              </span>
              <h2 className="text-xl font-bold text-[#092D26]">Bunkbeds Inventory Management</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              4 containers with 6 individually numbered handcrafted teak bunkbeds each (24 beds total).
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs text-slate-400 uppercase font-bold block">Base Rate</span>
              <span className="text-base font-extrabold text-[#092D26]">₹1,250</span>
              <span className="text-[10px] text-slate-500 block">/ bed / night</span>
            </div>
          </div>
        </div>

        {/* 4 Metric Pills for Bunkbeds */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#f5fbf8] p-3.5 rounded-2xl border border-emerald-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Beds</span>
            <span className="text-xl font-extrabold text-[#092D26]">24</span>
            <span className="text-[10px] text-slate-500 block">Across 4 containers</span>
          </div>

          <div className="bg-[#f5fbf8] p-3.5 rounded-2xl border border-emerald-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Available Today</span>
            <span className="text-xl font-extrabold text-emerald-700">{bunkbedsAvailableToday}</span>
            <span className="text-[10px] text-emerald-600 block">Ready for guest stay</span>
          </div>

          <div className="bg-[#f5fbf8] p-3.5 rounded-2xl border border-emerald-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Booked Today</span>
            <span className="text-xl font-extrabold text-amber-700">{bunkbedsBookedToday}</span>
            <span className="text-[10px] text-slate-500 block">Active reservations</span>
          </div>

          <div className="bg-[#f5fbf8] p-3.5 rounded-2xl border border-emerald-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Occupancy Rate</span>
            <span className="text-xl font-extrabold text-[#092D26]">{bunkbedsOccupancyPct}%</span>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all"
                style={{ width: `${bunkbedsOccupancyPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Container breakdown grid (Container 1..4) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CONTAINERS.map((c) => {
            return (
              <div
                key={c.id}
                className="p-4 rounded-2xl bg-[#ebf8f2]/60 border border-[#cce8dc] flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#092D26]">{c.name}</h4>
                  <span className="text-[11px] font-semibold text-emerald-800">
                    6 Beds Total
                  </span>
                </div>

                {/* Individual bed tiles (6 beds) */}
                <div className="grid grid-cols-3 gap-1.5">
                  {c.bedNumbers.map((bedNum) => {
                    const isOccupiedToday = bookings.some(
                      (b) =>
                        b.accommodationId === 'bunkbeds' &&
                        isInventoryReservingBooking(b) &&
                        b.checkInDate <= todayStr &&
                        b.checkOutDate > todayStr &&
                        b.bedNumbers?.includes(bedNum)
                    );

                    return (
                      <div
                        key={bedNum}
                        className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center shadow-2xs ${
                          isOccupiedToday
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <span className="text-[10px] text-slate-400 font-bold">Bed</span>
                        <span className="text-xs font-bold text-[#092D26]">{bedNum}</span>
                        <span
                          className={`text-[9px] font-medium mt-0.5 ${
                            isOccupiedToday ? 'text-amber-700' : 'text-emerald-600'
                          }`}
                        >
                          {isOccupiedToday ? 'Occupied' : 'Free'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Maintenance Blocks */}
      {maintenanceBlocks.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Active Maintenance Blocks ({maintenanceBlocks.length})
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {maintenanceBlocks.map((mb) => (
              <div
                key={mb.id}
                className="bg-white p-3 rounded-2xl border border-amber-200 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-[#092D26] block">
                    {mb.accommodationId.toUpperCase()}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {mb.startDate} → {mb.endDate} · {mb.reason}
                  </span>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => removeMaintenanceBlock(mb.id)}
                    className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                    title="Remove block"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Maintenance Modal */}
      {maintenanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-emerald-100 w-full max-w-md p-6 text-xs text-[#1C3048]">
            <h3 className="text-sm font-bold text-[#092D26] mb-3">
              Add Maintenance Hold
            </h3>
            <form onSubmit={handleCreateBlock} className="flex flex-col gap-3">
              <div>
                <label className="font-semibold block mb-1">Accommodation</label>
                <select
                  value={selectedAccommId}
                  onChange={(e) => setSelectedAccommId(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
                >
                  <option value="firefly">Firefly Treehouse</option>
                  <option value="sunbird">Sunbird Treehouse</option>
                  <option value="woodpecker">Woodpecker Treehouse</option>
                  <option value="bunkbeds">Bunkbeds</option>
                </select>
              </div>

              {selectedAccommId === 'bunkbeds' && (
                <div>
                  <label className="font-semibold block mb-1">Container</label>
                  <select
                    value={selectedContainer}
                    onChange={(e) => setSelectedContainer(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
                  >
                    <option value="all">All Containers (24 beds)</option>
                    <option value="c1">Container 1 (6 beds)</option>
                    <option value="c2">Container 2 (6 beds)</option>
                    <option value="c3">Container 3 (6 beds)</option>
                    <option value="c4">Container 4 (6 beds)</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={blockStartDate}
                    onChange={(e) => setBlockStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={blockEndDate}
                    onChange={(e) => setBlockEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Reason</label>
                <input
                  type="text"
                  required
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMaintenanceModalOpen(false)}
                  className="px-4 py-2 rounded-full font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full font-bold bg-[#092D26] text-white hover:bg-[#0c3c33] cursor-pointer"
                >
                  Save Maintenance Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
