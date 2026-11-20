import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { DecidixIcon } from '../../components/DecidixIcon';
import { DecidixButton } from '../../components/DecidixButton';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { GrainOverlay } from '../../components/GrainOverlay';

export const LoginScreen: React.FC = () => {
  const { login, googleLogin } = useAuth();
  const { isRTL, toggleLanguage, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const targetPath = (location.state as any)?.from?.pathname || (location.state as any)?.from || '/';
  const authMessage = (location.state as any)?.authMessage;

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
      navigate(targetPath, { replace: true });
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
      navigate(targetPath, { replace: true });
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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row select-none font-cairo overflow-x-hidden">
      {/* 1. Visual Showcase Column (Desktop Hero Panel) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-7/12 bg-hero-dark text-white p-8 xl:p-14 flex-col justify-between relative overflow-hidden border-e border-slate-800/40">
        <GrainOverlay />
        {/* Subtle Ambient Glowing Spheres */}
        <div className="absolute -top-32 -start-32 w-96 h-96 bg-blue/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -end-32 w-96 h-96 bg-cyan/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header in Showcase */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DecidixIcon name="splash_mark" size={38} className="brightness-110 drop-shadow-md" />
            <div>
              <div className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>DECIDIX</span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
              </div>
              <div className="text-[10px] text-slate-300 font-medium">
                {isRTL ? 'المنظومة الوطنية لدعم اتخاذ القرار' : 'National Decision Support System'}
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] text-cyan-200">
            <span className="w-2 h-2 rounded-full bg-[#21EAF4] animate-ping" />
            <span>{isRTL ? 'إحصاءات موثقة 2024' : 'Verified Statistics 2024'}</span>
          </div>
        </div>

        {/* Center: Vector Illustration & Infographic Presentation */}
        <div className="relative z-10 my-auto py-8 space-y-6 max-w-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue/20 border border-blue/40 text-blue-200 text-xs font-bold mb-3">
              <DecidixIcon name="globe" size={13} color="#93C5FD" />
              <span>{isRTL ? 'المنظومة الوطنية الموحدة' : 'Unified National Ecosystem'}</span>
            </div>
            <h2 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight tracking-tight">
              {isRTL
                ? 'توجيه السياسات التنموية بالأدلة الإحصائية والذكاء الاصطناعي'
                : 'Guiding Regional Development through Evidence and Smart Analytics'}
            </h2>
            <p className="text-xs xl:text-sm text-slate-300 mt-2.5 leading-relaxed">
              {isRTL
                ? 'منصة وطنية متكاملة لرصد مؤشرات التنمية المستدامة، كشف الفجوات الإقليمية للمحافظات الـ 27، ومحاكاة أثر المشروعات والموازنات لدعم اتخاذ القرار المؤسسي.'
                : 'An integrated national platform tracking sustainable indicators across Egypt’s 27 governorates, uncovering disparities and simulating policy interventions.'}
            </p>
          </div>

          {/* Interactive Vector Dashboard Preview Widget */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 shadow-2xl space-y-4">
            {/* Top Bar: National Composite Score */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue/30 flex items-center justify-center text-cyan">
                  <DecidixIcon name="chart" size={18} color="#21EAF4" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-300 font-medium">
                    {isRTL ? 'المؤشر الوطني العام للتنمية (CAPMAS)' : 'National Composite Index (CAPMAS)'}
                  </div>
                  <div className="text-lg font-bold text-white font-mono flex items-center gap-2">
                    <span>74.2 / 100</span>
                    <span className="text-[10px] text-[#21EAF4] font-bold bg-[#21EAF4]/20 px-2 py-0.5 rounded-full border border-[#21EAF4]/30">
                      +1.8% {isRTL ? 'نمو سنوي' : 'YoY'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-end">
                <div className="text-[10px] text-slate-300">{isRTL ? 'التغطية الجغرافية' : 'Coverage'}</div>
                <div className="text-xs font-bold text-cyan">{isRTL ? '27 محافظة مصرية' : '27 Governorates'}</div>
              </div>
            </div>

            {/* Vector Progress Bars: 4 Key Sectors */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300">{isRTL ? 'الرعاية الصحية' : 'Healthcare'}</span>
                  <span className="text-[#21EAF4] font-bold font-mono">78.4%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-[#21EAF4] w-[78%]" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300">{isRTL ? 'التعليم والتأهيل' : 'Education'}</span>
                  <span className="text-blue-400 font-bold font-mono">71.9%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-400 w-[72%]" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300">{isRTL ? 'الاقتصاد والتشغيل' : 'Economy'}</span>
                  <span className="text-purple-400 font-bold font-mono">68.5%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-purple-400 w-[68%]" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300">{isRTL ? 'البنية التحتية' : 'Infrastructure'}</span>
                  <span className="text-amber-400 font-bold font-mono">79.1%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-amber-400 w-[79%]" />
                </div>
              </div>
            </div>

            {/* Vector Governorates Geographic Pins Preview */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
              <div className="flex items-center gap-1.5">
                <DecidixIcon name="location" size={13} color="#21EAF4" />
                <span>{isRTL ? 'أعلى المحافظات أداءً:' : 'Top Governorates:'}</span>
                <span className="text-white font-bold">{isRTL ? 'القاهرة • الإسكندرية • بورسعيد' : 'Cairo • Alex • Port Said'}</span>
              </div>
              <span className="text-[10px] text-cyan font-mono">{isRTL ? 'تحديث لحظي' : 'Live Sync'}</span>
            </div>
          </div>

          {/* 3 Trust Provenance Pillars */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
              <div className="text-sm font-bold text-white mb-0.5 font-mono">100%</div>
              <div className="text-[10px] text-slate-300">{isRTL ? 'مطابقة المؤشرات الرسمية' : 'Official Alignment'}</div>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
              <div className="text-sm font-bold text-white mb-0.5 font-mono">27</div>
              <div className="text-[10px] text-slate-300">{isRTL ? 'محافظة مرصودة' : 'Governorates'}</div>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
              <div className="text-sm font-bold text-white mb-0.5 font-mono">Zero API</div>
              <div className="text-[10px] text-slate-300">{isRTL ? 'سياسة استدامة مجانية' : 'Permanent Zero Cost'}</div>
            </div>
          </div>
        </div>

        {/* Bottom Footer in Showcase */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span>{isRTL ? 'منظومة ديسيدكس © 2026' : 'DECIDIX System © 2026'}</span>
          <span>{isRTL ? 'الجهاز المركزي للتعبئة العامة والإحصاء (CAPMAS)' : 'Verified Statistical Foundation'}</span>
        </div>
      </div>

      {/* 2. Authentication Widget Column (Placed cleanly on the side on Web) */}
      <div className="w-full lg:w-1/2 xl:w-5/12 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 bg-white overflow-y-auto">
        {/* Top Action Bar with Language Toggle */}
        <div className="flex items-center justify-between pb-6">
          <Link to="/" className="inline-flex items-center gap-2 lg:hidden">
            <DecidixIcon name="splash_mark" size={32} />
            <span className="text-lg font-bold text-[#061A3A]">DECIDIX</span>
          </Link>

          <div className="ms-auto">
            <button
              type="button"
              onClick={toggleLanguage}
              className="h-8 px-3 text-xs font-bold rounded-lg bg-slate-50 hover:bg-slate-100 text-[#061A3A] transition border border-slate-200 shadow-2xs flex items-center gap-1.5"
            >
              <DecidixIcon name="globe" size={13} color="#0052FF" />
              <span>{language === 'en' ? 'العربية' : 'English'}</span>
            </button>
          </div>
        </div>

        {/* Center: The Core Login Form Widget */}
        <div className="max-w-md w-full mx-auto my-auto py-4">
          <div className="mb-6">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue mb-1">
              {isRTL ? 'بوابة الدخول للمنظومة' : 'PLATFORM ACCESS GATEWAY'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#061A3A] tracking-tight">
              {isRTL ? 'تسجيل الدخول' : 'Sign In to Decidix'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {isRTL
                ? 'أدخل بيانات حسابك المعتمد لاستعراض التحليلات ومجموعات البيانات والذكاء الاصطناعي.'
                : 'Enter your credentials to access national analytics, datasets, and decision intelligence.'}
            </p>
          </div>

          {/* Authentication Notice if redirected */}
          {authMessage && (
            <div className="p-3.5 mb-5 rounded-xl bg-blue-50/80 text-blue text-xs font-semibold border border-blue-200/80 flex items-start gap-2.5">
              <DecidixIcon name="info" size={16} color="#0052FF" />
              <div className="flex-1 leading-relaxed">{authMessage}</div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 mb-5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200/80 flex items-start gap-2.5 animate-in fade-in">
              <DecidixIcon name="warning" size={16} color="#E11D48" />
              <div className="flex-1 leading-relaxed">{error}</div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-rose-500 hover:text-rose-700 p-0.5 rounded transition"
              >
                <DecidixIcon name="x" size={14} color="currentColor" />
              </button>
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
          <div className="flex items-center my-5">
            <div className="flex-1 h-px bg-slate-200/80" />
            <span className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap shrink-0">
              {isRTL ? 'أو عبر البريد الإلكتروني' : 'or with email'}
            </span>
            <div className="flex-1 h-px bg-slate-200/80" />
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#061A3A] mb-1.5">
                {isRTL ? 'البريد الإلكتروني المؤسسي أو الشخصي' : 'Email Address'} *
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs text-[#061A3A] placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue/15 focus:border-blue transition-colors bg-slate-50/70 outline-none"
                  placeholder="analyst@decidix.gov"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#061A3A]">
                  {isRTL ? 'كلمة المرور' : 'Password'} *
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-bold text-blue hover:text-blue-600 transition"
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
                  className="w-full h-11 ltr:pl-3.5 ltr:pr-10 rtl:pr-3.5 rtl:pl-10 rounded-xl border border-slate-200 text-xs text-[#061A3A] placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue/15 focus:border-blue transition-colors bg-slate-50/70 outline-none font-mono"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#061A3A] p-1 transition"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  <DecidixIcon name={showPassword ? 'eye_slash' : 'eye'} size={15} color="currentColor" />
                </button>
              </div>
            </div>

            {/* Remember Session */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue rounded border-slate-300 focus:ring-blue/20"
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
                className="h-11 rounded-xl text-xs font-bold shadow-sm"
              >
                {isSubmitting
                  ? (isRTL ? 'جارٍ التحقق...' : 'Authenticating...')
                  : (isRTL ? 'تسجيل الدخول' : 'Sign In')}
              </DecidixButton>
            </div>
          </form>

          {/* Switch to Registration & Guest Browsing */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-3">
            <p className="text-xs text-slate-600">
              {isRTL ? 'ليس لديك حساب بعد؟' : "Don't have an account yet?"}{' '}
              <Link
                to="/register"
                className="font-bold text-blue hover:text-blue-600 transition"
              >
                {isRTL ? 'إنشاء حساب جديد' : 'Create an Account'}
              </Link>
            </p>
            <div>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-[#061A3A] transition shadow-2xs"
              >
                <span>{isRTL ? 'تصفح المنظومة كزائر' : 'Browse Decidix as Guest'}</span>
                <DecidixIcon name="arrow_right" size={13} color="currentColor" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Footer Notice */}
        <div className="pt-6 border-t border-slate-100 text-center text-[11px] text-slate-400">
          <span>{isRTL ? 'منظومة ديسيدكس الوطنية للذكاء التنموي لدعم القرار الإقليمي' : 'Decidix National Decision Support Intelligence System'}</span>
        </div>
      </div>
    </div>
  );
};
