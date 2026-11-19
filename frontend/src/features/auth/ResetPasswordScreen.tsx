import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useLanguage } from '../../context/LanguageContext';
import { DecidixIcon } from '../../components/DecidixIcon';
import { DecidixButton } from '../../components/DecidixButton';

export const ResetPasswordScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { isRTL, toggleLanguage, language } = useLanguage();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Password Strength
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
    setErrorMessage(null);

    if (!token) {
      setErrorMessage(isRTL ? 'رمز إعادة التعيين مفقود من الرابط.' : 'Reset token is missing from the URL.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage(isRTL ? 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.' : 'Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(isRTL ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await authService.resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      setErrorMessage(err?.message || (isRTL ? 'تعذر إعادة تعيين كلمة المرور. قد يكون الرابط منتهي الصلاحية.' : 'Failed to reset password. The link may be expired or already used.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Language Toggle */}
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
            {isRTL ? 'كلمة مرور جديدة' : 'Choose New Password'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
            {isRTL
              ? 'أدخل كلمة مرور قوية جديدة لتأمين حسابك في ديسيديكس'
              : 'Create a new secure password for your Decidix account'}
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 mb-5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200/80 flex items-start gap-2.5 animate-in fade-in">
            <DecidixIcon name="warning" size={16} color="#E11D48" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {!token ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-danger border border-rose-200/80 flex items-center justify-center mx-auto shadow-2xs">
              <DecidixIcon name="close" size={18} color="#E11D48" />
            </div>
            <h3 className="font-bold text-navy text-sm">
              {isRTL ? 'رابط إعادة التعيين غير صالح' : 'Incomplete or Invalid Link'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {isRTL
                ? 'لم يتم تضمين رمز إعادة التعيين في الرابط. يرجى طلب رابط جديد.'
                : 'No reset token was found in this link. Please request a new password reset.'}
            </p>
            <div className="pt-2">
              <Link to="/forgot-password">
                <DecidixButton variant="primary" size="md" fullWidth>
                  {isRTL ? 'طلب رابط جديد' : 'Request New Reset Link'}
                </DecidixButton>
              </Link>
            </div>
          </div>
        ) : success ? (
          <div className="text-center py-4 space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center mx-auto shadow-2xs">
              <DecidixIcon name="check" size={24} color="#059669" />
            </div>
            <h3 className="font-bold text-navy text-sm">
              {isRTL ? 'تم تغيير كلمة المرور بنجاح!' : 'Password Successfully Updated!'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {isRTL
                ? 'تم تحديث كلمة المرور وإلغاء الجلسات السابقة. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.'
                : 'Your password has been reset and all previous sessions revoked. You can now sign in with your new password.'}
            </p>
            <div className="pt-2">
              <DecidixButton
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => navigate('/login')}
              >
                {isRTL ? 'تسجيل الدخول الآن' : 'Sign In Now'}
              </DecidixButton>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-navy mb-1.5">
                {isRTL ? 'كلمة المرور الجديدة' : 'New Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 ltr:pl-3.5 ltr:pr-10 rtl:pr-3.5 rtl:pl-10 rounded-lg border border-slate-200/80 text-xs text-navy placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue/15 focus:border-blue transition-colors bg-slate-50 outline-none"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy p-1 transition"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  <DecidixIcon name={showPassword ? 'eye_slash' : 'eye'} size={15} color="currentColor" />
                </button>
              </div>

              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">{isRTL ? 'قوة كلمة المرور:' : 'Strength:'}</span>
                    <span className="font-bold text-navy">{strength.label}</span>
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
              <label className="block text-xs font-semibold text-navy mb-1.5">
                {isRTL ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full h-10 ltr:pl-3.5 ltr:pr-10 rtl:pr-3.5 rtl:pl-10 rounded-lg border text-xs text-navy placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue/15 focus:border-blue transition-colors bg-slate-50 outline-none ${
                    confirmPassword && confirmPassword !== password ? 'border-danger' : 'border-slate-200/80'
                  }`}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy p-1 transition"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  <DecidixIcon name={showConfirmPassword ? 'eye_slash' : 'eye'} size={15} color="currentColor" />
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
                disabled={isSubmitting || !password || !confirmPassword}
              >
                {isSubmitting
                  ? isRTL ? 'جارٍ الحفظ...' : 'Saving Password...'
                  : isRTL ? 'حفظ كلمة المرور الجديدة' : 'Save New Password'}
              </DecidixButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
