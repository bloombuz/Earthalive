import React, { useState } from 'react';
import {
  Calendar,
  Layers,
  DollarSign,
  Users,
  Settings,
  Search,
  Bell,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { EarthaliveLogo } from './EarthaliveLogo.tsx';
import { useAuth } from '../context/AuthContext.tsx';

export type NavTab =
  | 'overview'
  | 'calendar'
  | 'bookings'
  | 'payments'
  | 'settings';

interface NavigationProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenSearch?: () => void;
  onNewBookingClick?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  onOpenSearch,
  onNewBookingClick,
}) => {
  const { user, profile, isAdmin, isStaff, signOut, switchDevRole } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const navItems: { id: NavTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'bookings', label: 'Bookings' },
    { id: 'payments', label: 'Payments' },
  ];

  return (
    <header className="relative z-30 w-full px-4 sm:px-8 pt-5 pb-3">
      <div className="max-w-[1520px] mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo on Top-Left */}
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => onSelectTab('overview')}>
          <EarthaliveLogo size="md" variant="dark" />
        </div>

        {/* Center Floating Pill Navigation Bar (Identical to Reference Image 1) */}
        <nav
          aria-label="Main Navigation"
          className="hidden md:flex items-center bg-white/85 backdrop-blur-md rounded-full px-2 py-1.5 shadow-[0_4px_20px_rgba(9,45,38,0.06)] border border-[#cce8dc]/70"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`relative px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[#092D26] text-white shadow-sm font-semibold'
                    : 'text-[#1C3048]/80 hover:text-[#092D26] hover:bg-[#ebf8f2]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right-Side Utility Actions (Search, Notifications, Profile, New Booking) */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* New Booking quick CTA */}
          {onNewBookingClick && (
            <button
              onClick={onNewBookingClick}
              className="hidden lg:flex items-center gap-2 bg-[#092D26] hover:bg-[#0c3c33] text-white text-xs font-semibold px-4 py-2.5 rounded-full transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              <span>+ New Booking</span>
            </button>
          )}

          {/* Search Button */}
          <button
            onClick={onOpenSearch}
            aria-label="Search Bookings"
            className="w-10 h-10 rounded-full bg-white/85 backdrop-blur-md border border-[#cce8dc]/70 flex items-center justify-center text-[#1C3048] hover:bg-[#ebf8f2] transition-colors cursor-pointer shadow-sm"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications Button */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label="Notifications"
              className="relative w-10 h-10 rounded-full bg-white/85 backdrop-blur-md border border-[#cce8dc]/70 flex items-center justify-center text-[#1C3048] hover:bg-[#ebf8f2] transition-colors cursor-pointer shadow-sm"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-white"></span>
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-emerald-100 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-3 border-b border-emerald-50">
                  <h4 className="text-xs font-bold text-[#092D26] uppercase tracking-wider">
                    Notifications
                  </h4>
                  <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                    Live
                  </span>
                </div>
                <div className="py-3 text-xs text-slate-600 space-y-2">
                  <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-100/60">
                    <p className="font-medium text-[#092D26]">Earthalive Operations Active</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Ready for arrival check-ins & Bangalore forest inventory management.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar and Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full bg-white/85 backdrop-blur-md border border-[#cce8dc]/70 hover:bg-[#ebf8f2] transition-all shadow-sm cursor-pointer"
            >
              <img
                src={
                  profile?.photoURL ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
                }
                alt={profile?.displayName || 'User Avatar'}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-200"
              />
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-[#092D26] leading-none truncate max-w-[100px]">
                  {profile?.displayName?.split(' ')[0] || 'User'}
                </span>
                <span className="text-[10px] text-emerald-700 font-medium leading-tight">
                  {isAdmin ? 'Admin' : 'Staff'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-emerald-100 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3 pb-3 border-b border-emerald-50">
                  <img
                    src={
                      profile?.photoURL ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
                    }
                    alt=""
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-200"
                  />
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-bold text-[#092D26] truncate">
                      {profile?.displayName || 'User'}
                    </span>
                    <span className="text-xs text-slate-500 truncate">{profile?.email || 'Authenticated User'}</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-900">
                        {isAdmin ? 'Verified Admin' : 'Staff Member'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Role Switcher for Admin vs Staff testing */}
                <div className="mt-3 py-2 border-b border-emerald-50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Active Role
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => {
                        switchDevRole?.('admin');
                        setProfileDropdownOpen(false);
                      }}
                      className={`text-xs px-2.5 py-1.5 rounded-lg text-left font-medium transition-colors cursor-pointer ${
                        isAdmin
                          ? 'bg-[#092D26] text-white font-semibold'
                          : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                      }`}
                    >
                      Admin
                    </button>
                    <button
                      onClick={() => {
                        switchDevRole?.('staff');
                        setProfileDropdownOpen(false);
                      }}
                      className={`text-xs px-2.5 py-1.5 rounded-lg text-left font-medium transition-colors cursor-pointer ${
                        !isAdmin
                          ? 'bg-[#092D26] text-white font-semibold'
                          : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                      }`}
                    >
                      Staff
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 italic">
                    {isAdmin
                      ? 'Admin permissions: Create, view, edit, cancel & delete bookings, pricing & maintenance.'
                      : 'Staff permissions: Create, view, edit & cancel bookings, record payments.'}
                  </p>
                </div>

                <div className="mt-2 pt-2 flex flex-col gap-1">
                  {isAdmin && (
                    <button
                      onClick={() => {
                        onSelectTab('settings');
                        setProfileDropdownOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-500" />
                      <span>Resort Settings</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      signOut();
                      setProfileDropdownOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden flex items-center justify-around bg-white/95 backdrop-blur-md rounded-2xl mt-3 p-1.5 border border-emerald-100 shadow-lg overflow-x-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#092D26] text-white font-semibold'
                  : 'text-[#1C3048]/80 hover:bg-emerald-50'
              }`}
            >
              {item.label}
            </button>
          );
        })}
        {isAdmin && (
          <button
            onClick={() => onSelectTab('settings')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-[#092D26] text-white font-semibold'
                : 'text-[#1C3048]/80 hover:bg-emerald-50'
            }`}
          >
            Settings
          </button>
        )}
      </div>
    </header>
  );
};
