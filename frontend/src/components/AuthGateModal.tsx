import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { DecidixIcon } from './DecidixIcon';
import { GoogleSignInButton } from './GoogleSignInButton';

export const AuthGateModal: React.FC = () => {
  const { authGateRequest, closeAuthGate, login, googleLogin } = useAuth();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<'quick' | 'direct'>('quick');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!authGateRequest) return null;

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(isRTL ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور.' : 'Please enter email and password.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      const onProceed = authGateRequest.onProceed;
      closeAuthGate();
      if (onProceed) {
        onProceed();
      }
    } catch (err: any) {
      setError(
        err?.message ||
          (isRTL
            ? 'فشل تسجيل الدخول. يرجى التحقق من بيانات الاعتماد.'
            : 'Authentication failed. Please verify your credentials.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (idToken: string) => {
    setError(null);
    try {
      await googleLogin(idToken);
      const onProceed = authGateRequest.onProceed;
      closeAuthGate();
      if (onProceed) {
        onProceed();
      }
    } catch (err: any) {
      setError(
        err?.message ||
          (isRTL ? 'فشل تسجيل الدخول عبر Google.' : 'Google authentication failed.')
      );
    }
  };

  const handleRedirectToLogin = () => {
    closeAuthGate();
    navigate('/login', {
      state: {
        from: location,
        authMessage: authGateRequest.message,
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-card shadow-hero max-w-md w-full border border-hairline overflow-hidden relative animate-scaleUp">
        {/* Header Bar (100% Light Theme) */}
        <div className="bg-white px-6 py-5 border-b border-[#E2E8F0] text-[#061A3A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DecidixIcon name="splash_mark" size={30} className="shrink-0" />
            <div>
              <div className="text-base font-bold tracking-tight text-[#061A3A]">
                {authGateRequest.title || (isRTL ? 'تسجيل الدخول مطلوب' : 'Authentication Required')}
              </div>
              <div className="text-[10px] text-[#64748B] uppercase font-semibold tracking-wider">
                {isRTL ? 'منظومة ديسيدكس الوطنية' : 'Decidix National Intelligence'}
              </div>
            </div>
          </div>
          <button
            onClick={closeAuthGate}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#061A3A] hover:bg-[#F1F5F9] transition"
            aria-label="Close"
          >
            <DecidixIcon name="close" size={16} color="#061A3A" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <p className="text-sm text-ink mb-5 leading-relaxed">
            {authGateRequest.message ||
              (isRTL
                ? 'يتطلب تنفيذ هذا الإجراء تسجيل الدخول إلى حسابك المعتمد في المنصة.'
                : 'Authentication is required to perform this action. Guests can browse public data freely, but protected actions require sign-in.')}
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <DecidixIcon name="warning" size={14} color="#E11D48" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'quick' ? (
            <div className="space-y-3">
              {/* Google One-Click Button */}
              <div className="w-full">
                <GoogleSignInButton
                  onSuccess={handleGoogleSuccess}
                  onError={(msg) => setError(msg)}
                />
              </div>

              <div className="flex items-center my-3">
                <div className="flex-1 h-px bg-[#E9EEF5]"></div>
                <span className="px-3 text-faded-ink text-[11px] font-semibold uppercase whitespace-nowrap shrink-0">
                  {isRTL ? 'أو بالبريد الإلكتروني' : 'or with email'}
                </span>
                <div className="flex-1 h-px bg-[#E9EEF5]"></div>
              </div>

              {/* Email / Password Quick Toggle */}
              <button
                type="button"
                onClick={() => setMode('direct')}
                className="w-full h-11 px-4 rounded-pill border border-line bg-white hover:bg-well text-navy font-semibold text-xs flex items-center justify-center gap-2 transition"
              >
                <span>{isRTL ? 'إدخال البريد وكلمة المرور' : 'Enter email and password'}</span>
              </button>

              <button
                type="button"
                onClick={handleRedirectToLogin}
                className="w-full h-11 px-4 rounded-pill bg-blue hover:bg-blue-hover text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-sm"
              >
                <span>{isRTL ? 'الانتقال لصفحة تسجيل الدخول الكاملة' : 'Go to Full Login Page'}</span>
                <DecidixIcon name="arrow_right" size={13} color="#FFFFFF" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleQuickSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  {isRTL ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@decidix.gov"
                  className="w-full h-10 px-3.5 rounded-well border border-line text-sm text-navy focus:outline-none focus:border-blue bg-well/50"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  {isRTL ? 'كلمة المرور' : 'Password'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 ltr:pl-3.5 ltr:pr-10 rtl:pr-3.5 rtl:pl-10 rounded-xl border border-[#E3E9F2] text-sm text-navy focus:outline-none focus:border-blue bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 flex items-center text-[#7D8AA0] hover:text-navy text-xs p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <DecidixIcon name={showPassword ? 'eye_slash' : 'eye'} size={15} color="currentColor" />
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMode('quick')}
                  className="w-1/3 h-10 rounded-pill border border-line text-xs font-semibold text-ink hover:bg-well transition"
                >
                  {isRTL ? 'رجوع' : 'Back'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-2/3 h-10 rounded-pill bg-navy hover:bg-navy-deep text-white text-xs font-bold transition flex items-center justify-center shadow-sm disabled:opacity-50"
                >
                  {isSubmitting
                    ? isRTL ? 'جارٍ التحقق...' : 'Signing in...'
                    : isRTL ? 'تسجيل الدخول' : 'Sign In'}
                </button>
              </div>
            </form>
          )}

          {/* Dismiss button */}
          <div className="mt-5 pt-3 border-t border-hairline text-center">
            <button
              onClick={closeAuthGate}
              className="text-xs font-medium text-faded-ink hover:text-navy underline transition"
            >
              {isRTL ? 'متابعة التصفح كزائر' : 'Continue browsing as guest'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
