import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Cloud, LogIn, Mail, UserPlus, KeyRound, ShieldCheck, Smartphone, AlertCircle, X, Check, RefreshCw, UserCheck } from 'lucide-react';
import {
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  loginAnonymously
} from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<'google' | 'email' | 'register' | 'guest'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleAuth = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await loginWithGoogle();
      setLoading(false);
      onClose();
    } catch (err: any) {
      setLoading(false);
      if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Sign-in popup was closed before completing.');
      } else if (err?.code === 'auth/disallowed-webview' || err?.message?.includes('disallowed')) {
        setErrorMsg('Google OAuth is restricted in Android WebViews. Please use Email/Password or Guest Sync below!');
      } else {
        setErrorMsg(err?.message || 'Google Auth failed. Try Email/Password or Guest login.');
      }
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please provide both email and password.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      await loginWithEmail(email, password);
      setLoading(false);
      onClose();
    } catch (err: any) {
      setLoading(false);
      if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password') {
        setErrorMsg('Invalid email or password.');
      } else if (err?.code === 'auth/user-not-found') {
        setErrorMsg('No account found with this email. Click "Register Account" below.');
      } else {
        setErrorMsg(err?.message || 'Failed to sign in with email.');
      }
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName) {
      setErrorMsg('Please fill in name, email, and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      await registerWithEmail(email, password, displayName);
      setLoading(false);
      onClose();
    } catch (err: any) {
      setLoading(false);
      if (err?.code === 'auth/email-already-in-use') {
        setErrorMsg('An account with this email already exists. Please sign in instead.');
      } else {
        setErrorMsg(err?.message || 'Registration failed.');
      }
    }
  };

  const handleGuestAuth = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await loginAnonymously();
      setLoading(false);
      onClose();
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err?.message || 'Guest Cloud Sync failed.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-55 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 15 }}
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border-2 border-emerald-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] max-h-[90dvh] my-auto"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 p-5 text-white flex justify-between items-center relative">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 rounded-2xl border border-emerald-400/30">
              <Cloud className="w-6 h-6 text-emerald-300 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-wide">Cloud Sync & Login</h3>
              <p className="text-xs text-emerald-200/90 font-medium">Backup scores across devices & APKs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* APK Compatibility Note */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <Smartphone className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">APK / Mobile Tip:</span> Android WebViews often block Google OAuth popups. If Google login fails inside an APK, use <span className="font-black underline">Email/Password</span> or <span className="font-black underline">Guest Sync</span> for 100% working cloud backup!
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-bold">
            <button
              onClick={() => { setTab('google'); setErrorMsg(null); }}
              className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1 ${
                tab === 'google'
                  ? 'bg-emerald-600 text-white shadow-sm font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Google
            </button>
            <button
              onClick={() => { setTab('email'); setErrorMsg(null); }}
              className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1 ${
                tab === 'email' || tab === 'register'
                  ? 'bg-emerald-600 text-white shadow-sm font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              Email
            </button>
            <button
              onClick={() => { setTab('guest'); setErrorMsg(null); }}
              className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1 ${
                tab === 'guest'
                  ? 'bg-emerald-600 text-white shadow-sm font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Guest
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Google Tab */}
          {tab === 'google' && (
            <div className="space-y-4 text-center py-2">
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Sign in with your Google account to automatically sync your score history and saved games across all web browsers and connected devices.
              </p>
              <button
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full py-3.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-2 border-slate-200 dark:border-slate-700 font-extrabold text-slate-800 dark:text-white rounded-2xl text-sm transition shadow-md flex items-center justify-center gap-3"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                )}
                <span>{loading ? 'Connecting Google...' : 'Sign in with Google'}</span>
              </button>
            </div>
          )}

          {/* Email Tab */}
          {(tab === 'email' || tab === 'register') && (
            <form onSubmit={tab === 'email' ? handleEmailLogin : handleEmailRegister} className="space-y-3">
              {tab === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="e.g. Farkle King"
                    className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl text-sm transition shadow-md flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                <span>{loading ? 'Processing...' : tab === 'email' ? 'Sign In with Email' : 'Create Account & Sync'}</span>
              </button>

              <div className="text-center pt-2">
                {tab === 'email' ? (
                  <button
                    type="button"
                    onClick={() => { setTab('register'); setErrorMsg(null); }}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
                  >
                    Don't have an account? Register here
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setTab('email'); setErrorMsg(null); }}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
                  >
                    Already registered? Back to Sign In
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Guest Tab */}
          {tab === 'guest' && (
            <div className="space-y-4 text-center py-2">
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Want instant cloud backup without entering an email or password? Create an instant Guest Cloud Sync account. Works 100% reliably inside native APKs!
              </p>
              <button
                onClick={handleGuestAuth}
                disabled={loading}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl text-sm transition shadow-md flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                <span>{loading ? 'Starting Guest Sync...' : 'Start Guest Cloud Sync'}</span>
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
