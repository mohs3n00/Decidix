import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useLanguage } from '../../context/LanguageContext';
import { DecidixIcon } from '../../components/DecidixIcon';
import { DecidixButton } from '../../components/DecidixButton';

export const ForgotPasswordScreen: React.FC = () => {
  const { isRTL, toggleLanguage, language } = useLanguage();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await authService.forgotPassword(email);
      setSuccessMessage(
        res.message ||
          (isRTL
            ? 'تم إرسال تعليمات إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.'
            : 'Password reset instructions have been dispatched to your email address.')
      );
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          (isRTL
            ? 'تعذر إرسال طلب إعادة التعيين. يرجى التأكد من صحة البريد الإلكتروني.'
            : 'Failed to dispatch reset request. Please check the email provided.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
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
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 bg-navy rounded-2xl flex items-center justify-center p-3 shadow-lg mb-3 border border-white/10">
            <DecidixIcon name="logo_white" size={32} />
          </div>
          <h1 className="text-xl font-black text-navy tracking-tight font-display">
            {isRTL ? 'استعادة كلمة المرور' : 'Reset Your Password'}
          </h1>
          <p className="text-xs text-faded-ink mt-1 max-w-xs leading-relaxed">
            {isRTL
              ? 'أدخل بريدك الإلكتروني وسنرسل لك رابطاً آمناً لإعادة تعيين كلمة المرور'
              : 'Enter your email address and we will dispatch a secure reset link via Resend SMTP'}
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 mb-5 rounded-well bg-rose-50 text-danger text-xs font-semibold border border-rose-200/80 flex items-start gap-2 animate-in fade-in">
            <span className="shrink-0 text-base leading-none">⚠️</span>
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {successMessage ? (
          <div className="text-center py-4 space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-2xl mx-auto shadow-sm">
              ✓
            </div>
            <h3 className="font-bold text-navy text-sm">
              {isRTL ? 'تم إرسال الرابط بنجاح!' : 'Reset Link Dispatched!'}
            </h3>
            <p className="text-xs text-ink leading-relaxed">
              {successMessage}
            </p>
            <p className="text-[11px] text-faded-ink">
              {isRTL
                ? 'يرجى فحص صندوق الوارد ورسائل الترويج/غير المرغوب فيها (صلاحية الرابط 1 ساعة).'
                : 'Please check your inbox and spam folder (link valid for 1 hour).'}
            </p>
            <div className="pt-2">
              <Link to="/login">
                <DecidixButton variant="outlined" size="md" fullWidth>
                  {isRTL ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}
                </DecidixButton>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-navy mb-1.5">
                {isRTL ? 'البريد الإلكتروني المسجل' : 'Registered Email Address'}
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

            <div className="pt-2">
              <DecidixButton
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={isSubmitting || !email}
              >
                {isSubmitting
                  ? isRTL ? 'جارٍ الإرسال...' : 'Dispatching Reset Link...'
                  : isRTL ? 'إرسال رابط إعادة التعيين' : 'Send Reset Link'}
              </DecidixButton>
            </div>

            <div className="pt-4 border-t border-line text-center">
              <Link
                to="/login"
                className="text-xs font-semibold text-blue hover:underline"
              >
                {isRTL ? '← العودة لتسجيل الدخول' : '← Back to Sign In'}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
