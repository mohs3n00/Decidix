import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { DecidixIcon } from '../../components/DecidixIcon';
import { DecidixButton } from '../../components/DecidixButton';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { GrainOverlay } from '../../components/GrainOverlay';

export const RegisterScreen: React.FC = () => {
  const { register, googleLogin } = useAuth();
  const { isRTL, toggleLanguage, language } = useLanguage();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  // Password Strength Calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 1, label: isRTL ? 'ضعيفة' : 'Weak', color: 'bg-rose-500' };
    if (score === 2) return { score: 2, label: isRTL ? 'متوسطة' : 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, label: isRTL ? 'جيدة' : 'Good', color: 'bg-blue' };
    return { score: 4, label: isRTL ? 'قوية جداً' : 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(isRTL ? 'الرجاء إدخال الاسم الكامل.' : 'Please enter your full name.');
      return;
    }

    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError(isRTL ? 'الرجاء إدخال بريد إلكتروني صالح.' : 'Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError(isRTL ? 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.' : 'Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError(isRTL ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        name,
        email,
        password,
      });

      navigate('/', { replace: true, state: { registered: true, email } });
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('already exists') || msg.includes('EMAIL_ALREADY_EXISTS')) {
        setError(isRTL ? 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.' : 'An account with this email already exists. Please sign in instead.');
      } else {
        setError(msg || (isRTL ? 'فشل إنشاء الحساب. يرجى التحقق من المدخلات.' : 'Registration failed. Please verify your details.'));
      }
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
      setError(err?.message || (isRTL ? 'فشل التسجيل عبر Google.' : 'Google authentication failed.'));
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row select-none font-cairo overflow-x-hidden">
      {/* 1. Visual Showcase Column (Desktop Hero Panel) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-7/12 bg-hero-dark text-white p-8 xl:p-14 flex-col justify-between relative overflow-hidden border-e border-slate-800/40">
        <GrainOverlay />
        <div className="absolute -top-32 -start-32 w-96 h-96 bg-blue/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -end-32 w-96 h-96 bg-cyan/15 rounded-full blur-3xl pointer-events-none" />

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
            <span>{isRTL ? 'عضوية بحثية مفتوحة' : 'Open Research Access'}</span>
          </div>
        </div>

        <div className="relative z-10 my-auto py-8 space-y-6 max-w-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue/20 border border-blue/40 text-blue-200 text-xs font-bold mb-3">
              <DecidixIcon name="user" size={13} color="#93C5FD" />
              <span>{isRTL ? 'انضم إلى شبكة الباحثين والمخططين' : 'Join Planners & Analysts'}</span>
            </div>
            <h2 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight tracking-tight">
              {isRTL
                ? 'ابنِ دراساتك التنموية ومحاكاة سياساتك بأعلى دقة إحصائية'
                : 'Build Regional Policy Simulations with Statistical Precision'}
            </h2>
            <p className="text-xs xl:text-sm text-slate-300 mt-2.5 leading-relaxed">
              {isRTL
                ? 'أنشئ حسابك للوصول إلى أدوات محاكاة السياسات الاستثمارية، رفع مجموعات البيانات الخاصة وتدقيقها، واستشارة المساعد الذكي المدعوم ببيانات الجهاز المركزي للتعبئة العامة والإحصاء.'
                : 'Create an account to run investment policy simulations, ingest and audit datasets, and query AI decision support grounded in official CAPMAS statistics.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3.5 pt-2">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <div className="w-8 h-8 rounded-xl bg-blue/30 flex items-center justify-center text-cyan mb-2">
                <DecidixIcon name="dataset" size={16} color="#21EAF4" />
              </div>
              <div className="text-xs font-bold text-white mb-1">{isRTL ? 'رفع وتدقيق البيانات' : 'Dataset Ingestion'}</div>
              <div className="text-[11px] text-slate-300 leading-relaxed">{isRTL ? 'رفع ملفات CSV وExcel وتوليد مؤشرات فورية' : 'Ingest CSV/Excel and generate indicators'}</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <div className="w-8 h-8 rounded-xl bg-cyan/20 flex items-center justify-center text-cyan mb-2">
                <DecidixIcon name="robot" size={16} color="#21EAF4" />
              </div>
              <div className="text-xs font-bold text-white mb-1">{isRTL ? 'المساعد الذكي المؤصل' : 'Grounded AI Copilot'}</div>
              <div className="text-[11px] text-slate-300 leading-relaxed">{isRTL ? 'إجابات مدعومة بسجلات إحصائية موثقة' : 'Answers grounded in authoritative evidence'}</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span>{isRTL ? 'منظومة ديسيدكس © 2026' : 'DECIDIX System © 2026'}</span>
          <span>{isRTL ? 'حماية البيانات وفق القانون المصري 151 لسنة 2020' : 'Data Protected under Law 151/2020'}</span>
        </div>
      </div>

      {/* 2. Registration Widget Column */}
      <div className="w-full lg:w-1/2 xl:w-5/12 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 bg-white overflow-y-auto">
        <div className="flex items-center justify-between pb-4">
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

        <div className="max-w-md w-full mx-auto my-auto py-2">
          <div className="mb-5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue mb-1">
              {isRTL ? 'تسجيل عضوية جديدة' : 'ACCOUNT REGISTRATION'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#061A3A] tracking-tight">
              {isRTL ? 'إنشاء حساب جديد' : 'Create an Account'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {isRTL
                ? 'انضم إلى نخبة الباحثين وصناع القرار في المنظومة الوطنية.'
                : 'Join researchers and decision-makers in the national system.'}
            </p>
          </div>

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

          <div className="mb-4">
            <GoogleSignInButton
              onSuccess={handleGoogleSuccess}
              onError={(err) => setError(err)}
              isLoading={isGoogleSubmitting}
            />
          </div>

          <div className="flex items-center my-4">
            <div className="flex-1 h-px bg-slate-200/80" />
            <span className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap shrink-0">
              {isRTL ? 'أو عبر البريد الإلكتروني' : 'or with email'}
            </span>
            <div className="flex-1 h-px bg-slate-200/80" />
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-[#061A3A] mb-1">
                {isRTL ? 'الاسم الكامل' : 'Full Name'} *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-[#061A3A] placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue/15 focus:border-blue transition-colors bg-slate-50/70 outline-none"
                placeholder={isRTL ? 'د. أحمد حسن' : 'Dr. Ahmed Hassan'}
                autoComplete="name"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#061A3A] mb-1">
                {isRTL ? 'البريد الإلكتروني' : 'Email Address'} *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-[#061A3A] placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue/15 focus:border-blue transition-colors bg-slate-50/70 outline-none"
                placeholder="user@decidixapp.tech"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#061A3A] mb-1">
                {isRTL ? 'كلمة المرور' : 'Password'} *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 ltr:pl-3.5 ltr:pr-10 rtl:pr-3.5 rtl:pl-10 rounded-xl border border-slate-200 text-xs text-[#061A3A] placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue/15 focus:border-blue transition-colors bg-slate-50/70 outline-none font-mono"
                  placeholder="••••••••"
                  autoComplete="new-password"
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

              {password && (
                <div className="mt-1.5 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">{isRTL ? 'قوة كلمة المرور:' : 'Password strength:'}</span>
                    <span className="font-bold text-[#061A3A]">{strength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-full flex-1 transition-all ${
                          step <= strength.score ? strength.color : 'bg-transparent'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#061A3A] mb-1">
                {isRTL ? 'تأكيد كلمة المرور' : 'Confirm Password'} *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full h-10 ltr:pl-3.5 ltr:pr-10 rtl:pr-3.5 rtl:pl-10 rounded-xl border text-xs text-[#061A3A] placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue/15 focus:border-blue transition-colors bg-slate-50/70 outline-none font-mono ${
                    confirmPassword && confirmPassword !== password ? 'border-rose-400' : 'border-slate-200'
                  }`}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#061A3A] p-1 transition"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  <DecidixIcon name={showConfirmPassword ? 'eye_slash' : 'eye'} size={15} color="currentColor" />
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="text-[11px] text-rose-600 font-medium mt-1">
                  {isRTL ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match'}
                </p>
              )}
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
                  ? (isRTL ? 'جارٍ إنشاء الحساب...' : 'Creating Account...')
                  : (isRTL ? 'إنشاء حساب جديد' : 'Create Account')}
              </DecidixButton>
            </div>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 text-center space-y-2.5">
            <p className="text-xs text-slate-600">
              {isRTL ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
              <Link
                to="/login"
                className="font-bold text-blue hover:text-blue-600 transition"
              >
                {isRTL ? 'تسجيل الدخول' : 'Sign In'}
              </Link>
            </p>
            <div>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-[#061A3A] transition shadow-2xs"
              >
                <span>{isRTL ? 'تصفح المنظومة كزائر' : 'Browse Decidix as Guest'}</span>
                <DecidixIcon name="arrow_right" size={13} color="currentColor" />
              </Link>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400">
          <span>{isRTL ? 'منظومة ديسيدكس الوطنية للذكاء التنموي لدعم القرار الإقليمي' : 'Decidix National Decision Support Intelligence System'}</span>
        </div>
      </div>
    </div>
  );
};
