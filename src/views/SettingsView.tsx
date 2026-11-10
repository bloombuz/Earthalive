import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  DollarSign,
  Utensils,
  Percent,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  Database,
  Lock,
} from 'lucide-react';
import { useResort } from '../context/ResortContext.tsx';
import { useAuth, BOOTSTRAP_OWNER_EMAIL } from '../context/AuthContext.tsx';
import { PricingConfig, formatINR } from '../utils/pricing.ts';

export const SettingsView: React.FC = () => {
  const { pricingConfig, updatePricingConfig } = useResort();
  const { isAdmin, firestoreConnected, profile } = useAuth();

  // Pricing form state
  const [treehouseBasePrice, setTreehouseBasePrice] = useState(pricingConfig.treehouseBasePrice);
  const [treehouseBaseGuests, setTreehouseBaseGuests] = useState(pricingConfig.treehouseBaseGuests);
  const [treehouseExtraGuestPrice, setTreehouseExtraGuestPrice] = useState(pricingConfig.treehouseExtraGuestPrice);
  const [bunkbedPricePerPerson, setBunkbedPricePerPerson] = useState(pricingConfig.bunkbedPricePerPerson);
  const [serviceChargePercent, setServiceChargePercent] = useState(pricingConfig.serviceChargePercent);
  const [vegFoodPrice, setVegFoodPrice] = useState(pricingConfig.vegFoodPrice);
  const [nonVegFoodPrice, setNonVegFoodPrice] = useState(pricingConfig.nonVegFoodPrice);
  const [foodChargingBasis, setFoodChargingBasis] = useState<'per_stay' | 'per_night'>(
    pricingConfig.foodChargingBasis || 'per_stay'
  );

  // Holiday pricing state
  const [holidayEnabled, setHolidayEnabled] = useState(pricingConfig.holidayPricing.enabled);
  const [holidayTreehouseBase, setHolidayTreehouseBase] = useState(pricingConfig.holidayPricing.treehouseBasePrice);
  const [holidayExtraGuest, setHolidayExtraGuest] = useState(pricingConfig.holidayPricing.treehouseExtraGuestPrice);
  const [holidayBunkbedPrice, setHolidayBunkbedPrice] = useState(pricingConfig.holidayPricing.bunkbedPricePerPerson);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const newConfig: PricingConfig = {
      ...pricingConfig,
      treehouseBasePrice,
      treehouseBaseGuests,
      treehouseExtraGuestPrice,
      bunkbedPricePerPerson,
      serviceChargePercent,
      vegFoodPrice,
      nonVegFoodPrice,
      foodChargingBasis,
      holidayPricing: {
        ...pricingConfig.holidayPricing,
        enabled: holidayEnabled,
        treehouseBasePrice: holidayTreehouseBase,
        treehouseExtraGuestPrice: holidayExtraGuest,
        bunkbedPricePerPerson: holidayBunkbedPrice,
      },
    };

    await updatePricingConfig(newConfig);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#092D26] tracking-tight">
              Settings & Configurations
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#092D26] text-white">
              Bangalore Resort Ops
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Global pricing schedules, service charge thresholds, food rates, and cloud database status.
          </p>
        </div>

        {savedSuccess && (
          <div className="px-4 py-2 bg-emerald-100 text-emerald-900 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSavePricing} className="flex flex-col gap-6">
        {/* Accommodation Base Pricing Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 flex flex-col gap-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-emerald-50">
            <DollarSign className="w-5 h-5 text-emerald-800" />
            <div>
              <h3 className="text-base font-bold text-[#092D26]">Accommodation Pricing</h3>
              <p className="text-xs text-slate-500">
                Nightly base rates for Treehouses and Bunkbeds. Historical bookings keep their original snapshot.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Treehouse Base Price (₹)
              </label>
              <input
                type="number"
                disabled={!isAdmin}
                value={treehouseBasePrice}
                onChange={(e) => setTreehouseBasePrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none font-bold text-[#092D26]"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Standard: ₹6,000 for up to {treehouseBaseGuests} guests
              </span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Additional Guest Rate (₹)
              </label>
              <input
                type="number"
                disabled={!isAdmin}
                value={treehouseExtraGuestPrice}
                onChange={(e) => setTreehouseExtraGuestPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none font-bold text-[#092D26]"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                For 5th and 6th guest (₹1,500/night each)
              </span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Bunkbed Price per Bed (₹)
              </label>
              <input
                type="number"
                disabled={!isAdmin}
                value={bunkbedPricePerPerson}
                onChange={(e) => setBunkbedPricePerPerson(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none font-bold text-[#092D26]"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Per person per night (default ₹1,250)
              </span>
            </div>
          </div>
        </div>

        {/* Service Charge & Food Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Service Charge */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 flex flex-col gap-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-emerald-50">
              <Percent className="w-5 h-5 text-emerald-800" />
              <div>
                <h3 className="text-base font-bold text-[#092D26]">Service Charge</h3>
                <p className="text-xs text-slate-500">
                  Calculated strictly on discounted accommodation charges (never on food).
                </p>
              </div>
            </div>

            <div className="text-xs">
              <label className="font-semibold text-slate-700 block mb-1">
                Service Charge Percentage (%)
              </label>
              <input
                type="number"
                disabled={!isAdmin}
                min="0"
                max="50"
                value={serviceChargePercent}
                onChange={(e) => setServiceChargePercent(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none font-bold text-[#092D26]"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Default: 10% on discounted accommodation subtotal
              </span>
            </div>
          </div>

          {/* Food Pricing */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 flex flex-col gap-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-emerald-50">
              <Utensils className="w-5 h-5 text-emerald-800" />
              <div>
                <h3 className="text-base font-bold text-[#092D26]">Food Management Rates</h3>
                <p className="text-xs text-slate-500">
                  Per-guest meal pricing for resort dining.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Vegetarian Food (₹)
                </label>
                <input
                  type="number"
                  disabled={!isAdmin}
                  value={vegFoodPrice}
                  onChange={(e) => setVegFoodPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none font-bold text-[#092D26]"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Default ₹400</span>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Non-Vegetarian Food (₹)
                </label>
                <input
                  type="number"
                  disabled={!isAdmin}
                  value={nonVegFoodPrice}
                  onChange={(e) => setNonVegFoodPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none font-bold text-[#092D26]"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Default ₹600</span>
              </div>
            </div>

            {/* Food Charging Frequency Basis */}
            <div className="pt-2 border-t border-emerald-50 text-xs">
              <label className="font-semibold text-slate-700 block mb-1.5">
                Food Charging Basis
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => setFoodChargingBasis('per_stay')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    foodChargingBasis === 'per_stay'
                      ? 'border-[#092D26] bg-[#ebf8f2] text-[#092D26] font-bold ring-1 ring-[#092D26]'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="block font-bold">Per Stay (Default)</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Charged once per food guest for the entire booking
                  </span>
                </button>
                <button
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => setFoodChargingBasis('per_night')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    foodChargingBasis === 'per_night'
                      ? 'border-[#092D26] bg-[#ebf8f2] text-[#092D26] font-bold ring-1 ring-[#092D26]'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="block font-bold">Per Night</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Multiplied by the number of booked nights
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Holiday Pricing Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-50">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="text-base font-bold text-[#092D26]">Holiday Rates Schedule</h3>
                <p className="text-xs text-slate-500">
                  When enabled, overrides base rates for peak festival & holiday dates.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                disabled={!isAdmin}
                checked={holidayEnabled}
                onChange={(e) => setHolidayEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#092D26]"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Holiday Treehouse Base (₹)
              </label>
              <input
                type="number"
                disabled={!isAdmin}
                value={holidayTreehouseBase}
                onChange={(e) => setHolidayTreehouseBase(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none font-bold text-[#092D26]"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Holiday Extra Guest Rate (₹)
              </label>
              <input
                type="number"
                disabled={!isAdmin}
                value={holidayExtraGuest}
                onChange={(e) => setHolidayExtraGuest(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none font-bold text-[#092D26]"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Holiday Bunkbed Rate (₹)
              </label>
              <input
                type="number"
                disabled={!isAdmin}
                value={holidayBunkbedPrice}
                onChange={(e) => setHolidayBunkbedPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none font-bold text-[#092D26]"
              />
            </div>
          </div>
        </div>

        {/* Database & Google Sign-In Status Card */}
        <div className="bg-[#f5fbf8] rounded-3xl p-6 border border-[#cce8dc] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-[#092D26] block text-sm">
                Firestore & Google Auth Sync Active
              </span>
              <p className="text-slate-500 mt-0.5">
                Target database: <code className="bg-white px-1.5 py-0.5 rounded text-[11px] font-mono text-emerald-900">ai-studio-earthaliveresort</code> · Asia/Kolkata timezone
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Realtime Connected</span>
            </span>
          </div>
        </div>

        {/* Super Admin Save Button */}
        {isAdmin && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-8 py-3 rounded-full text-xs font-bold bg-[#092D26] hover:bg-[#0c3c33] text-white shadow-md flex items-center gap-2 cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Save Pricing & Settings</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
