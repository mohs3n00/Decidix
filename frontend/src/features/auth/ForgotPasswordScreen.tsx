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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Language Switcher */}
      <div className="absolute top-6 ltr:right-6 rtl:left-6 z-20">
        <button
          type="button"
          onClick={toggleLanguage}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 text-navy transition-colors border border-slate-200/80 shadow-2xs"
        >
          {language === 'en' ? 'العربية' : 'English'}
        </button>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-xs border border-slate-200/80 relative z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center mb-6">
          <DecidixIcon name="splash_mark" size={54} className="mb-3" />
          <h1 className="text-xl font-bold text-navy tracking-tight font-display">
            {isRTL ? 'استعادة كلمة المرور' : 'Reset Your Password'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
            {isRTL
              ? 'أدخل بريدك الإلكتروني وسنرسل لك رابطاً آمناً لإعادة تعيين كلمة المرور'
              : 'Enter your email address to receive a secure password reset link'}
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 mb-5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200/80 flex items-start gap-2.5 animate-in fade-in">
            <DecidixIcon name="warning" size={16} color="#E11D48" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {successMessage ? (
          <div className="text-center py-4 space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center mx-auto shadow-2xs">
              <DecidixIcon name="check" size={24} color="#059669" />
            </div>
            <h3 className="font-bold text-navy text-sm">
              {isRTL ? 'تم إرسال الرابط بنجاح!' : 'Reset Link Dispatched!'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {successMessage}
            </p>
            <p className="text-[11px] text-slate-400">
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
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-navy mb-1.5">
                {isRTL ? 'البريد الإلكتروني' : 'Email Address'}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg border border-slate-200/80 text-xs text-navy placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue/15 focus:border-blue transition-colors bg-slate-50 outline-none"
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
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? isRTL ? 'جارٍ الإرسال...' : 'Dispatching Link...'
                  : isRTL ? 'إرسال رابط إعادة التعيين' : 'Send Reset Link'}
              </DecidixButton>
            </div>

            <div className="text-center pt-3">
              <Link
                to="/login"
                className="text-xs font-semibold text-blue hover:text-blue-hover transition"
              >
                {isRTL ? 'الرجوع إلى تسجيل الدخول' : 'Return to Sign In'}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
