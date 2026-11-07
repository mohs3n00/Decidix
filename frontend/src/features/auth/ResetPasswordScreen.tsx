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
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Language Toggle */}
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
            {isRTL ? 'كلمة مرور جديدة' : 'Choose New Password'}
          </h1>
          <p className="text-xs text-faded-ink mt-1 max-w-xs leading-relaxed">
            {isRTL
              ? 'أدخل كلمة مرور قوية جديدة لتأمين حسابك في ديسيديكس'
              : 'Create a new secure password for your Decidix account'}
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 mb-5 rounded-well bg-rose-50 text-danger text-xs font-semibold border border-rose-200/80 flex items-start gap-2 animate-in fade-in">
            <span className="shrink-0 text-base leading-none">⚠️</span>
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {!token ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-danger border border-rose-200 flex items-center justify-center text-2xl mx-auto">
              ✕
            </div>
            <h3 className="font-bold text-navy text-sm">
              {isRTL ? 'رابط إعادة التعيين غير صالح' : 'Incomplete or Invalid Link'}
            </h3>
            <p className="text-xs text-ink leading-relaxed">
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
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-2xl mx-auto shadow-sm">
              ✓
            </div>
            <h3 className="font-bold text-navy text-sm">
              {isRTL ? 'تم تغيير كلمة المرور بنجاح!' : 'Password Successfully Updated!'}
            </h3>
            <p className="text-xs text-ink leading-relaxed">
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
              <label className="block text-xs font-bold text-navy mb-1.5">
                {isRTL ? 'كلمة المرور الجديدة' : 'New Password'}
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

              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-faded-ink">{isRTL ? 'قوة كلمة المرور:' : 'Strength:'}</span>
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
                {isRTL ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
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
