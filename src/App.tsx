import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ResortProvider, useResort } from './context/ResortContext.tsx';
import { Navigation, NavTab } from './components/Navigation.tsx';
import { TodayView } from './views/TodayView.tsx';
import { BookingsView } from './views/BookingsView.tsx';
import { CalendarView } from './views/CalendarView.tsx';
import { PaymentsView } from './views/PaymentsView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { CreateBookingModal } from './components/CreateBookingModal.tsx';
import { EditBookingModal } from './components/EditBookingModal.tsx';
import { CancelBookingModal } from './components/CancelBookingModal.tsx';
import { DeleteBookingModal } from './components/DeleteBookingModal.tsx';
import { AddPaymentModal } from './components/AddPaymentModal.tsx';
import { GoogleSignInScreen } from './components/GoogleSignInScreen.tsx';
import { Booking, AccommodationId } from './types/index.ts';
import { Search, X } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { profile, loading } = useAuth();
  const { setSelectedBooking, bookings } = useResort();

  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [createBookingOpen, setCreateBookingOpen] = useState(false);
  const [preselectedDate, setPreselectedDate] = useState<string | undefined>(undefined);
  const [preselectedAccomm, setPreselectedAccomm] = useState<AccommodationId | undefined>(undefined);

  const [editBookingModalOpen, setEditBookingModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelingBooking, setCancelingBooking] = useState<Booking | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingBooking, setDeletingBooking] = useState<Booking | null>(null);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentTargetBooking, setPaymentTargetBooking] = useState<Booking | null>(null);

  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Signed-out visitors see the Google Sign-In screen
  if (!profile && !loading) {
    return <GoogleSignInScreen onBypassToPublicCalendar={() => setActiveTab('calendar')} />;
  }

  const handleOpenEditModal = (booking: Booking) => {
    setEditingBooking(booking);
    setEditBookingModalOpen(true);
  };

  const handleOpenCancelModal = (booking: Booking) => {
    setCancelingBooking(booking);
    setCancelModalOpen(true);
  };

  const handleOpenDeleteModal = (booking: Booking) => {
    setDeletingBooking(booking);
    setDeleteModalOpen(true);
  };

  const handleOpenPaymentModal = (booking: Booking) => {
    setPaymentTargetBooking(booking);
    setPaymentModalOpen(true);
  };

  const handleNewBookingForDate = (date: string, accommodationId?: AccommodationId) => {
    setPreselectedDate(date);
    setPreselectedAccomm(accommodationId);
    setCreateBookingOpen(true);
  };

  const handleSelectBookingFromSearch = (booking: Booking) => {
    setSelectedBooking(booking);
    setActiveTab('overview');
    setSearchOverlayOpen(false);
  };

  // Filtered search results
  const searchResults = globalSearch.trim()
    ? bookings.filter(
        (b) =>
          b.bookingNumber.toLowerCase().includes(globalSearch.toLowerCase()) ||
          b.accommodationName.toLowerCase().includes(globalSearch.toLowerCase()) ||
          (b.guestName || '').toLowerCase().includes(globalSearch.toLowerCase()) ||
          (b.guestPhone || '').includes(globalSearch)
      )
    : [];

  return (
    <div className="min-h-screen bg-[#ddf5e8]/40 text-[#1C3048] flex flex-col font-sans selection:bg-[#092D26] selection:text-white relative">
      {/* 
        Top Hero Background Resort Banner (Recreating Reference Image 1)
        Full-width luxury tropical resort photography with gentle canopy light fading into soft mint
      */}
      <div className="absolute top-0 left-0 right-0 h-[380px] sm:h-[440px] overflow-hidden z-0 pointer-events-none select-none bg-gradient-to-b from-[#1C3048]/30 via-[#cbeae0] to-[#ddf5e8]/40">
        <img
          src="https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=2000&q=80"
          alt=""
          role="presentation"
          className="w-full h-full object-cover object-top opacity-55 mix-blend-multiply"
        />
        {/* Soft mint & aqua gradient overlay fading into the page */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1C3048]/20 via-[#ddf5e8]/50 to-[#eef9f4]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#ddf5e8]/60 via-transparent to-[#ddf5e8]/60" />
      </div>

      {/* Floating Pill Navigation */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSearch={() => setSearchOverlayOpen(true)}
        onNewBookingClick={() => {
          setPreselectedDate(undefined);
          setPreselectedAccomm(undefined);
          setCreateBookingOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="relative z-10 flex-grow max-w-[1520px] w-full mx-auto px-4 sm:px-8 py-4 sm:py-6">
        {/* View Switcher: Overview, Calendar, Bookings, Payments, Settings */}
        {activeTab === 'overview' && (
          <TodayView
            onNewBookingClick={() => {
              setPreselectedDate(undefined);
              setPreselectedAccomm(undefined);
              setCreateBookingOpen(true);
            }}
            onOpenEditModal={handleOpenEditModal}
            onOpenPaymentModal={handleOpenPaymentModal}
            onOpenCancelModal={handleOpenCancelModal}
            onOpenDeleteModal={handleOpenDeleteModal}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            onNewBookingForDate={handleNewBookingForDate}
            onSelectBooking={(b) => {
              setSelectedBooking(b);
              setActiveTab('overview');
            }}
          />
        )}

        {activeTab === 'bookings' && (
          <BookingsView
            onNewBookingClick={() => {
              setPreselectedDate(undefined);
              setPreselectedAccomm(undefined);
              setCreateBookingOpen(true);
            }}
            onOpenEditModal={handleOpenEditModal}
            onOpenPaymentModal={handleOpenPaymentModal}
            onOpenCancelModal={handleOpenCancelModal}
            onOpenDeleteModal={handleOpenDeleteModal}
          />
        )}

        {activeTab === 'payments' && (
          <PaymentsView
            onOpenPaymentModal={handleOpenPaymentModal}
            onSelectBooking={handleSelectBookingFromSearch}
          />
        )}

        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Global Search Overlay Modal */}
      {searchOverlayOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-20 p-4"
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-emerald-100 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-emerald-50 flex items-center gap-3">
              <Search className="w-5 h-5 text-emerald-800" />
              <input
                type="text"
                autoFocus
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search by reservation #, guest name, accommodation, or phone..."
                className="w-full text-sm outline-none text-[#092D26] placeholder:text-slate-400"
              />
              <button
                onClick={() => setSearchOverlayOpen(false)}
                aria-label="Close search"
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-3">
              {globalSearch.trim() === '' ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  Type a guest name, booking code (e.g. EA-1042), or room name to search.
                </p>
              ) : searchResults.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  No matching reservations found for "{globalSearch}".
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {searchResults.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => handleSelectBookingFromSearch(b)}
                      className="p-3 rounded-2xl hover:bg-emerald-50/80 cursor-pointer transition-colors border border-transparent hover:border-emerald-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#092D26]">{b.guestName}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {b.bookingNumber}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {b.accommodationName} · {b.checkInDate} to {b.checkOutDate}
                        </span>
                      </div>
                      <span className="font-bold text-emerald-800">{b.paymentStatus}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateBookingModal
        isOpen={createBookingOpen}
        onClose={() => setCreateBookingOpen(false)}
        preselectedDate={preselectedDate}
        preselectedAccommodationId={preselectedAccomm}
      />

      <EditBookingModal
        isOpen={editBookingModalOpen}
        onClose={() => {
          setEditBookingModalOpen(false);
          setEditingBooking(null);
        }}
        booking={editingBooking}
      />

      <CancelBookingModal
        isOpen={cancelModalOpen}
        onClose={() => {
          setCancelModalOpen(false);
          setCancelingBooking(null);
        }}
        booking={cancelingBooking}
      />

      <DeleteBookingModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingBooking(null);
        }}
        booking={deletingBooking}
      />

      <AddPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setPaymentTargetBooking(null);
        }}
        booking={paymentTargetBooking}
      />

      {/* Footer */}
      <footer className="relative z-10 w-full py-6 px-8 text-center text-xs text-slate-500 border-t border-emerald-100/60 bg-white/40 mt-12 backdrop-blur-xs">
        <div className="max-w-[1520px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#092D26]">Earthalive Resort Management</span>
            <span>· Bangalore, India</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Treehouse & Bunkbeds Inventory System · Asia/Kolkata Timezone · Realtime Firebase Sync
          </p>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ResortProvider>
        <MainAppContent />
      </ResortProvider>
    </AuthProvider>
  );
}
