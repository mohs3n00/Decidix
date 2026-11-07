import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { DecidixIcon } from '../../components/DecidixIcon';
import { DecidixButton } from '../../components/DecidixButton';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';

export const LoginScreen: React.FC = () => {
  const { login, googleLogin } = useAuth();
  const { isRTL, toggleLanguage, language } = useLanguage();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(isRTL ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور.' : 'Please enter both email and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      if (rememberMe) {
        localStorage.setItem('decidix_remember_email', email);
      } else {
        localStorage.removeItem('decidix_remember_email');
      }
      navigate('/');
    } catch (err: any) {
      setError(err?.message || (isRTL ? 'بيانات الاعتماد غير صحيحة. يرجى التأكد من البريد وكلمة المرور.' : 'Invalid credentials. Please verify your email and password.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (idToken: string) => {
    setError(null);
    setIsGoogleSubmitting(true);
    try {
      await googleLogin(idToken);
      navigate('/');
    } catch (err: any) {
      setError(err?.message || (isRTL ? 'فشل تسجيل الدخول عبر Google. يرجى المحاولة مرة أخرى.' : 'Google authentication failed. Please try again.'));
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleGoogleError = (errMessage: string) => {
    setError(errMessage);
  };

  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Luminous Background Ambient Blurs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Language Toggle in Corner */}
      <div className="absolute top-6 ltr:right-6 rtl:left-6 z-20">
        <button
          type="button"
          onClick={toggleLanguage}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-pill bg-white/10 hover:bg-white/20 text-white transition border border-white/20 shadow-sm backdrop-blur-sm"
        >
          {language === 'en' ? 'العربية' : 'English'}
        </button>
      </div>

      <div className="w-full max-w-md bg-white rounded-hero p-8 shadow-decidix-hero border border-hairline relative z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Brand Presentation */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-navy rounded-2xl flex items-center justify-center p-3 shadow-lg mb-3 border border-white/10">
            <DecidixIcon name="logo_white" size={40} />
          </div>
          <h1 className="text-2xl font-black text-navy tracking-tight font-display">DECIDIX</h1>
          <p className="text-xs text-faded-ink mt-1 max-w-xs leading-relaxed">
            {isRTL
              ? 'المنصة الوطنية المتكاملة لدعم اتخاذ القرار الإقليمي'
              : 'Intelligent Regional Decision Support System'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 mb-5 rounded-well bg-rose-50 text-danger text-xs font-semibold border border-rose-200/80 flex items-start gap-2 animate-in fade-in">
            <span className="shrink-0 text-base leading-none">⚠️</span>
            <div className="flex-1">{error}</div>
            <button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-danger font-bold text-sm leading-none">✕</button>
          </div>
        )}

        {/* Google Sign-In Integration */}
        <div className="mb-5">
          <GoogleSignInButton
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            isLoading={isGoogleSubmitting}
          />
        </div>

        {/* Or Divider */}
        <div className="relative flex items-center justify-center mb-5">
          <div className="border-t border-line w-full"></div>
          <span className="bg-white px-3 text-[11px] font-semibold text-faded-ink uppercase tracking-wider">
            {isRTL ? 'أو عبر البريد الإلكتروني' : 'or with email'}
          </span>
          <div className="border-t border-line w-full"></div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-navy mb-1.5">
              {isRTL ? 'البريد الإلكتروني' : 'Email Address'}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="decidix-input text-sm w-full"
              placeholder="user@decidixapp.tech"
              autoComplete="email"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-navy">
                {isRTL ? 'كلمة المرور' : 'Password'}
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-blue hover:underline"
              >
                {isRTL ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="decidix-input text-sm w-full ltr:pr-10 rtl:pl-10"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 text-faded-ink hover:text-navy text-xs font-bold p-1"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {/* Remember Session */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-ink">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-blue rounded border-line"
              />
              <span>{isRTL ? 'تذكر بيانات الجلسة' : 'Remember this session'}</span>
            </label>
          </div>

          <div className="pt-2">
            <DecidixButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isSubmitting || isGoogleSubmitting}
            >
              {isSubmitting
                ? isRTL ? 'جارٍ التحقق...' : 'Authenticating...'
                : isRTL ? 'تسجيل الدخول' : 'Sign In'}
            </DecidixButton>
          </div>
        </form>

        {/* Switch to Registration */}
        <div className="mt-6 pt-5 border-t border-line text-center">
          <p className="text-xs text-ink">
            {isRTL ? 'ليس لديك حساب بعد؟' : "Don't have an account yet?"}{' '}
            <Link
              to="/register"
              className="font-bold text-blue hover:underline"
            >
              {isRTL ? 'إنشاء حساب جديد' : 'Create an Account'}
            </Link>
          </p>
        </div>

        {/* Security & Staging Info */}
        <div className="mt-5 p-2.5 rounded-well bg-well text-[11px] text-faded-ink text-center border border-line">
          🔒 {isRTL ? 'جلسة مشفرة عبر JWT & HTTPS — خوادم Heroku Staging' : 'Protected by HS256 JWT & HTTPS on Heroku Staging'}
        </div>
      </div>
    </div>
  );
};
