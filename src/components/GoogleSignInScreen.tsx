import React, { useState } from 'react';
import { EarthaliveLogo } from './EarthaliveLogo.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { ShieldCheck, AlertCircle, Loader2, Sparkles, Trees } from 'lucide-react';

interface GoogleSignInScreenProps {
  onBypassToPublicCalendar?: () => void;
}

export const GoogleSignInScreen: React.FC<GoogleSignInScreenProps> = ({
  onBypassToPublicCalendar,
}) => {
  const { signInWithGoogle, loading } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignIn = async () => {
    setErrorMsg(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Sign-in cancelled. Please complete the Google sign-in popup.');
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMsg('Popup was blocked by your browser. Please allow popups for this site and try again.');
      } else {
        setErrorMsg(err.message || 'Failed to authenticate with Google. Please try again.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ddf5e8]/60 text-[#1C3048] flex flex-col justify-between font-sans selection:bg-[#092D26] selection:text-white relative overflow-hidden">
      {/* Upper Luxury Canopy Background Photograph */}
      <div className="absolute top-0 left-0 right-0 h-[480px] sm:h-[550px] overflow-hidden z-0 pointer-events-none select-none bg-gradient-to-b from-[#1C3048]/35 via-[#cbeae0] to-[#ddf5e8]">
        <img
          src="https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=2000&q=80"
          alt=""
          role="presentation"
          className="w-full h-full object-cover object-top opacity-60 mix-blend-multiply"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1C3048]/20 via-[#ddf5e8]/60 to-[#ddf5e8]" />
      </div>

      {/* Top Header Branding */}
      <header className="relative z-10 w-full px-6 py-6 max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <EarthaliveLogo size="lg" variant="dark" />
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-[#092D26] bg-white/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-emerald-100 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
          <span>Bangalore Eco-Canopy Operations</span>
        </div>
      </header>

      {/* Centered Sign-In Card */}
      <main className="relative z-10 flex-grow flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 sm:p-10 shadow-[0_12px_40px_rgba(9,45,38,0.12)] border border-[#cce8dc] max-w-md w-full animate-in fade-in zoom-in-95 flex flex-col items-center text-center">
          {/* Circular Emblem Icon */}
          <div className="w-20 h-20 rounded-full bg-[#f2faf5] border border-[#cce8dc] flex items-center justify-center mb-5 text-[#092D26] shadow-inner">
            <EarthaliveLogo size="md" variant="dark" showText={false} />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#092D26] tracking-tight">
            Earthalive Resort
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Booking & Payment Management Portal · Bangalore
          </p>

          <div className="w-full h-px bg-emerald-50 my-6" />

          <p className="text-xs text-slate-600 leading-relaxed mb-6">
            Sign in with your Google account to access real-time treehouse inventory, bunkbed allocations, and payment tracking.
          </p>

          {/* Error Message */}
          {errorMsg && (
            <div className="w-full p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 text-left mb-4">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Google Sign-In Button */}
          <button
            onClick={handleSignIn}
            disabled={signingIn || loading}
            className="w-full py-3.5 px-6 rounded-full font-bold text-xs sm:text-sm bg-[#092D26] hover:bg-[#0c3c33] active:scale-[0.99] text-white shadow-md flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed group"
          >
            {signingIn || loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                {/* Official Google G SVG */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Security & Role Access Note */}
          <div className="mt-6 flex flex-col gap-1.5 text-[11px] text-slate-400">
            <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Staff & Admin Access</span>
            </div>
            <p>
              Direct real-time inventory management for Earthalive luxury treehouses and 24 eco-container bunkbeds.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-slate-500">
        <p className="text-[11px]">
          Earthalive Resort Management · Asia/Kolkata (IST) · Powered by Google Cloud & Firebase
        </p>
      </footer>
    </div>
  );
};
