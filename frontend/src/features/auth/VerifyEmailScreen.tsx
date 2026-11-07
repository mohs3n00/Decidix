import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { DecidixIcon } from '../../components/DecidixIcon';
import { DecidixButton } from '../../components/DecidixButton';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export const VerifyEmailScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';
  const { isRTL, toggleLanguage, language } = useLanguage();
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [tokenInput, setTokenInput] = useState(tokenFromUrl);
  const [resendEmail, setResendEmail] = useState(user?.email || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  const executeVerification = async (tok: string) => {
    if (!tok) return;
    setIsVerifying(true);
    setVerifyError(null);
    setVerifySuccess(null);

    try {
      const res = await authService.verifyEmail(tok);
      setVerifySuccess(res.message || (isRTL ? 'تم تأكيد البريد الإلكتروني بنجاح!' : 'Email successfully verified!'));
      await refreshProfile();
    } catch (err: any) {
      setVerifyError(err?.message || (isRTL ? 'الرابط غير صالح أو انتهت صلاحيته (صلاحية الرابط 24 ساعة).' : 'Verification link is invalid or expired.'));
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (tokenFromUrl) {
      executeVerification(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  const handleManualVerify = (e: React.FormEvent) => {
    e.preventDefault();
    executeVerification(tokenInput);
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;

    setIsResending(true);
    setResendError(null);
    setResendSuccess(null);

    try {
      const res = await authService.resendVerification(resendEmail);
      setResendSuccess(res.message || (isRTL ? 'تم إرسال رابط تأكيد جديد إلى بريدك الإلكتروني.' : 'A new verification link has been sent to your email.'));
    } catch (err: any) {
      setResendError(err?.message || (isRTL ? 'تعذر إرسال رسالة التأكيد.' : 'Failed to send verification email.'));
    } finally {
      setIsResending(false);
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
            {isRTL ? 'تأكيد البريد الإلكتروني' : 'Email Verification'}
          </h1>
          <p className="text-xs text-faded-ink mt-1 max-w-xs leading-relaxed">
            {isRTL
              ? 'تأكيد ملكية الحساب لتفعيل كافة الصلاحيات التحليلية في منصة ديسيدكس'
              : 'Verify your email to activate full analytical access across the Decidix platform'}
          </p>
        </div>

        {/* Verification Status */}
        {isVerifying ? (
          <div className="py-8 text-center">
            <LoadingSpinner message={isRTL ? 'جارٍ التحقق من رمز التأكيد...' : 'Verifying email token...'} />
          </div>
        ) : verifySuccess ? (
          <div className="text-center py-4 space-y-4 animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-3xl mx-auto shadow-sm">
              ✓
            </div>
            <h2 className="text-lg font-black text-navy">
              {isRTL ? 'تم توثيق الحساب بنجاح!' : 'Email Verified Successfully!'}
            </h2>
            <p className="text-xs text-ink leading-relaxed">
              {verifySuccess}
            </p>
            <div className="pt-2">
              <DecidixButton
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => navigate('/')}
              >
                {isRTL ? 'متابعة إلى المنصة' : 'Proceed to Dashboard'}
              </DecidixButton>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {verifyError && (
              <div className="p-3.5 rounded-well bg-rose-50 text-danger text-xs font-semibold border border-rose-200/80 flex items-start gap-2 animate-in fade-in">
                <span className="shrink-0 text-base leading-none">⚠️</span>
                <div className="flex-1">{verifyError}</div>
              </div>
            )}

            {/* Manual Token Verification Form */}
            <form onSubmit={handleManualVerify} className="space-y-3">
              <label className="block text-xs font-bold text-navy">
                {isRTL ? 'رمز التأكيد (من الرابط)' : 'Verification Token'}
              </label>
              <input
                type="text"
                required
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="e.g. 64-char hex token"
                className="decidix-input font-mono text-xs w-full"
              />
              <DecidixButton
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                disabled={isVerifying || !tokenInput}
              >
                {isRTL ? 'تأكيد الحساب الآن' : 'Verify Token'}
              </DecidixButton>
            </form>

            {/* Resend Section */}
            <div className="pt-5 border-t border-line space-y-3">
              <h3 className="text-xs font-bold text-navy">
                {isRTL ? 'لم تستلم رسالة التأكيد؟' : "Didn't receive the email?"}
              </h3>

              {resendSuccess && (
                <div className="p-3 rounded-well bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                  ✓ {resendSuccess}
                </div>
              )}

              {resendError && (
                <div className="p-3 rounded-well bg-rose-50 text-danger text-xs font-semibold border border-rose-200">
                  ✕ {resendError}
                </div>
              )}

              <form onSubmit={handleResend} className="space-y-3">
                <input
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="user@decidixapp.tech"
                  className="decidix-input text-xs w-full"
                />
                <DecidixButton
                  type="submit"
                  variant="outlined"
                  size="md"
                  fullWidth
                  disabled={isResending || !resendEmail}
                >
                  {isResending
                    ? isRTL ? 'جارٍ الإرسال عبر Resend...' : 'Dispatching via Resend...'
                    : isRTL ? 'إعادة إرسال رابط التأكيد' : 'Resend Verification Email'}
                </DecidixButton>
              </form>
            </div>

            <div className="pt-2 text-center">
              <Link to="/" className="text-xs font-semibold text-blue hover:underline">
                {isRTL ? '← العودة إلى المنصة' : '← Back to Platform'}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
