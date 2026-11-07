import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { DecidixIcon } from '../../components/DecidixIcon';
import { DecidixButton } from '../../components/DecidixButton';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';

export const RegisterScreen: React.FC = () => {
  const { register, googleLogin } = useAuth();
  const { isRTL, toggleLanguage, language } = useLanguage();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [arabicName, setArabicName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  // Post-Registration Verification-Pending State
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Password Strength Calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-line' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 1, label: isRTL ? 'ضعيفة' : 'Weak', color: 'bg-danger' };
    if (score === 2) return { score: 2, label: isRTL ? 'متوسطة' : 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, label: isRTL ? 'جيدة' : 'Good', color: 'bg-blue' };
    return { score: 4, label: isRTL ? 'قوية جداً' : 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
        arabic_name: arabicName || undefined,
        email,
        password,
      });

      setRegisteredEmail(email);
      setRegistrationComplete(true);
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
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background accents */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Language Switcher */}
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
        {/* Verification-Pending Success State */}
        {registrationComplete ? (
          <div className="text-center py-4 space-y-5 animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center text-3xl mx-auto shadow-sm">
              ✉️
            </div>

            <div>
              <h2 className="text-xl font-black text-navy">
                {isRTL ? 'تم إنشاء الحساب بنجاح!' : 'Account Created Successfully!'}
              </h2>
              <p className="text-xs text-faded-ink mt-2 leading-relaxed">
                {isRTL
                  ? `أرسلنا رسالة تأكيد إلكترونية إلى:`
                  : 'A verification link has been dispatched to:'}
              </p>
              <div className="inline-block px-3 py-1 bg-well text-blue font-mono text-xs font-bold rounded-pill mt-2 border border-line">
                {registeredEmail}
              </div>
            </div>

            {/* Verification Notice */}
            <div className="p-4 rounded-well bg-blue/5 border border-blue/20 text-xs text-ink text-start space-y-2">
              <div className="font-bold text-navy flex items-center gap-1.5">
                <span>🛡️</span>
                <span>{isRTL ? 'حالة التوثيق (Verification Pending)' : 'Email Verification Pending'}</span>
              </div>
              <p className="leading-relaxed">
                {isRTL
                  ? 'تم إنشاء حسابك بدور (Viewer). يرجى النقر على الرابط المرسل إلى بريدك الإلكتروني لتأكيد ملكية الحساب وتمكين كافة صلاحيات التحليل والرفع.'
                  : 'Your account has been provisioned with the Viewer role. Please check your inbox and click the verification link to confirm ownership and activate full analytical access.'}
              </p>
            </div>

            <div className="pt-2 space-y-3">
              <DecidixButton
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => navigate('/')}
              >
                {isRTL ? 'متابعة إلى لوحة التحكم' : 'Proceed to Dashboard'}
              </DecidixButton>

              <Link
                to="/verify-email"
                className="block text-xs font-bold text-blue hover:underline text-center"
              >
                {isRTL ? 'إدخال رمز التأكيد يدوياً أو إعادة الإرسال' : 'Enter verification token or resend email'} →
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Brand Header */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-navy rounded-2xl flex items-center justify-center p-3 shadow-lg mb-3 border border-white/10">
                <DecidixIcon name="logo_white" size={40} />
              </div>
              <h1 className="text-2xl font-black text-navy tracking-tight font-display">DECIDIX</h1>
              <p className="text-xs text-faded-ink mt-1 max-w-xs leading-relaxed">
                {isRTL
                  ? 'إنشاء حساب جديد في منصة دعم القرار الإقليمي'
                  : 'Create an account to access regional intelligence'}
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

            {/* Google Fast Register */}
            <div className="mb-5">
              <GoogleSignInButton
                onSuccess={handleGoogleSuccess}
                onError={(err) => setError(err)}
                isLoading={isGoogleSubmitting}
              />
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center mb-5">
              <div className="border-t border-line w-full"></div>
              <span className="bg-white px-3 text-[11px] font-semibold text-faded-ink uppercase tracking-wider">
                {isRTL ? 'أو التسجيل عبر البريد' : 'or register with email'}
              </span>
              <div className="border-t border-line w-full"></div>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy mb-1.5">
                  {isRTL ? 'الاسم الكامل' : 'Full Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="decidix-input text-sm w-full"
                  placeholder="e.g. Dr. Ahmed Hassan"
                  autoComplete="name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy mb-1.5">
                  {isRTL ? 'الاسم بالعربية (اختياري)' : 'Arabic Name (Optional)'}
                </label>
                <input
                  type="text"
                  value={arabicName}
                  onChange={(e) => setArabicName(e.target.value)}
                  className="decidix-input text-sm w-full"
                  placeholder="مثال: د. أحمد حسن"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy mb-1.5">
                  {isRTL ? 'البريد الإلكتروني' : 'Email Address'} *
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
                <label className="block text-xs font-bold text-navy mb-1.5">
                  {isRTL ? 'كلمة المرور' : 'Password'} *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="decidix-input text-sm w-full ltr:pr-10 rtl:pl-10"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 text-faded-ink hover:text-navy text-xs font-bold p-1"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-faded-ink">{isRTL ? 'قوة كلمة المرور:' : 'Password strength:'}</span>
                      <span className="font-bold text-navy">{strength.label}</span>
                    </div>
                    <div className="h-1.5 w-full bg-line rounded-full overflow-hidden flex gap-1">
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
                <label className="block text-xs font-bold text-navy mb-1.5">
                  {isRTL ? 'تأكيد كلمة المرور' : 'Confirm Password'} *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`decidix-input text-sm w-full ltr:pr-10 rtl:pl-10 ${
                      confirmPassword && confirmPassword !== password ? 'border-danger' : ''
                    }`}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 text-faded-ink hover:text-navy text-xs font-bold p-1"
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-[11px] text-danger font-medium mt-1">
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
                >
                  {isSubmitting
                    ? isRTL ? 'جارٍ إنشاء الحساب...' : 'Creating Account...'
                    : isRTL ? 'إنشاء حساب جديد' : 'Create Account'}
                </DecidixButton>
              </div>
            </form>

            {/* Switch to Login */}
            <div className="mt-6 pt-5 border-t border-line text-center">
              <p className="text-xs text-ink">
                {isRTL ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
                <Link
                  to="/login"
                  className="font-bold text-blue hover:underline"
                >
                  {isRTL ? 'تسجيل الدخول' : 'Sign In'}
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
