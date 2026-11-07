import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { HeroCard } from '../../components/HeroCard';
import { DecidixCard } from '../../components/DecidixCard';
import { StatWell } from '../../components/StatWell';
import { DecidixButton } from '../../components/DecidixButton';
import { DecidixIcon } from '../../components/DecidixIcon';

export const AccountScreen: React.FC = () => {
  const { user, logout, changePassword, resendVerification, refreshProfile } = useAuth();
  const { isRTL } = useLanguage();

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Verification Resend State
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError(isRTL ? 'يجب أن تكون كلمة المرور الجديدة 8 أحرف على الأقل.' : 'New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(isRTL ? 'كلمتا المرور غير متطابقتين.' : 'New passwords do not match.');
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await changePassword(currentPassword, newPassword);
      setPasswordSuccess(res.message || (isRTL ? 'تم تغيير كلمة المرور بنجاح!' : 'Password successfully updated!'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err?.message || (isRTL ? 'فشل تغيير كلمة المرور. تأكد من صحة كلمة المرور الحالية.' : 'Failed to update password. Please check your current password.'));
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user?.email) return;
    setResendLoading(true);
    setResendError(null);
    setResendSuccess(null);

    try {
      const res = await resendVerification(user.email);
      setResendSuccess(res.message || (isRTL ? 'تم إرسال رابط تأكيد جديد إلى بريدك الإلكتروني.' : 'Verification link has been sent to your email.'));
      await refreshProfile();
    } catch (err: any) {
      setResendError(err?.message || (isRTL ? 'تعذر إرسال رسالة التأكيد.' : 'Failed to dispatch verification email.'));
    } finally {
      setResendLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (window.confirm(isRTL ? 'هل أنت متأكد من تسجيل الخروج؟' : 'Are you sure you want to sign out of this session?')) {
      await logout();
      window.location.href = '/login';
    }
  };

  const roleLabels: Record<string, { en: string; ar: string }> = {
    admin: { en: 'Platform Administrator', ar: 'مدير المنصة' },
    analyst: { en: 'Regional Data Analyst', ar: 'محلل بيانات إقليمي' },
    decision_maker: { en: 'Executive Decision Maker', ar: 'صانع قرار تنفيذي' },
    planner: { en: 'Strategic Planner', ar: 'مخطط استراتيجي' },
    viewer: { en: 'Standard Viewer', ar: 'مستعرض عام' },
  };

  const currentRole = user?.role ? roleLabels[user.role] || { en: user.role, ar: user.role } : { en: 'User', ar: 'مستخدم' };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <TwoToneHeading
            eyebrow={isRTL ? 'إعدادات الحساب والأمان' : 'ACCOUNT & IDENTITY MANAGEMENT'}
            first={isRTL ? 'ملف' : 'User'}
            second={isRTL ? 'المستخدم وإعدادات الأمان' : 'Profile & Security'}
            level={1}
            className="text-3xl font-extrabold"
          />
          <p className="text-sm text-faded-ink mt-1">
            {isRTL
              ? 'إدارة بيانات حسابك، صلاحيات الأدوار، حالة التوثيق، وتأمين كلمات المرور'
              : 'Manage authenticated credentials, RBAC privileges, email verification, and session security'}
          </p>
        </div>

        <DecidixButton
          variant="outlined"
          size="sm"
          onClick={handleSignOut}
          className="self-start text-danger border-rose-200 hover:bg-rose-50"
        >
          {isRTL ? 'تسجيل الخروج ←' : 'Sign Out Session →'}
        </DecidixButton>
      </div>

      {/* Account Hero Summary Card */}
      <HeroCard className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-navy text-cyan border-2 border-cyan/40 flex items-center justify-center font-black text-2xl shadow-decidix shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl md:text-2xl font-black text-navy">
                  {user?.name || 'Decidix User'}
                </h2>
                {user?.arabic_name && (
                  <span className="text-sm font-semibold text-faded-ink" dir="rtl">
                    ({user.arabic_name})
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-pill bg-blue/10 text-blue font-bold text-xs uppercase tracking-wider border border-blue/20">
                  {isRTL ? currentRole.ar : currentRole.en}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-ink font-mono">
                <DecidixIcon name="account" size={14} className="text-faded-ink" />
                <span>{user?.email}</span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                {user?.email_verified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                    ✓ {isRTL ? 'البريد موثق' : 'Email Verified'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                    ⚠️ {isRTL ? 'في انتظار التوثيق' : 'Verification Pending'}
                  </span>
                )}

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill bg-well text-navy border border-hairline text-[11px] font-bold uppercase">
                  {user?.status || 'active'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 min-w-[240px]">
            <StatWell
              label={isRTL ? 'الصلاحيات' : 'Account Tier'}
              value={user?.role?.toUpperCase() || 'VIEWER'}
              subtext={isRTL ? 'معتمد عبر RBAC' : 'RBAC Assigned'}
            />
            <StatWell
              label={isRTL ? 'تاريخ التسجيل' : 'Registered'}
              value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Active'}
              subtext="Heroku Staging"
            />
          </div>
        </div>
      </HeroCard>

      {/* Email Verification Alert Banner (if unverified) */}
      {!user?.email_verified && (
        <DecidixCard variant="well" className="p-5 bg-amber-50/60 border border-amber-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                <span>✉️</span>
                <span>{isRTL ? 'البريد الإلكتروني بحاجة إلى توثيق' : 'Email Verification Required'}</span>
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed max-w-2xl">
                {isRTL
                  ? 'يرجى تأكيد بريدك الإلكتروني لتمكين رفع مجموعات البيانات والمشاركة في نماذج المحاكاة الاستراتيجية.'
                  : 'Please verify your email address to enable dataset uploads and participate in strategic policy simulations.'}
              </p>
              {resendSuccess && (
                <p className="text-xs font-bold text-emerald-700 pt-1">✓ {resendSuccess}</p>
              )}
              {resendError && (
                <p className="text-xs font-bold text-danger pt-1">✕ {resendError}</p>
              )}
            </div>

            <DecidixButton
              variant="outlined"
              size="sm"
              onClick={handleResendVerification}
              disabled={resendLoading}
              className="shrink-0 bg-white border-amber-300 text-amber-900 hover:bg-amber-100/50"
            >
              {resendLoading
                ? isRTL ? 'جارٍ الإرسال...' : 'Sending via Resend...'
                : isRTL ? 'إعادة إرسال الرابط' : 'Resend Verification Link'}
            </DecidixButton>
          </div>
        </DecidixCard>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information Card */}
        <DecidixCard variant="card" className="p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <div className="w-10 h-10 rounded-xl bg-blue/10 text-blue flex items-center justify-center p-2">
              <DecidixIcon name="account" size={20} className="text-blue" />
            </div>
            <div>
              <h3 className="font-bold text-navy text-base">
                {isRTL ? 'بيانات الحساب الأساسية' : 'Personal & Identity Details'}
              </h3>
              <p className="text-xs text-faded-ink">
                {isRTL ? 'المعلومات المسترجعة من قاعدة بيانات المنظومة' : 'Canonical attributes from PostgreSQL profile records'}
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-inner bg-well border border-line">
              <span className="font-semibold text-faded-ink">{isRTL ? 'معرّف الحساب (User ID):' : 'Account UUID:'}</span>
              <span className="font-mono text-navy font-bold truncate max-w-[220px]">{user?.id}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-inner bg-well border border-line">
              <span className="font-semibold text-faded-ink">{isRTL ? 'الاسم بالإنجليزية:' : 'Full Name (English):'}</span>
              <span className="font-bold text-navy">{user?.name}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-inner bg-well border border-line">
              <span className="font-semibold text-faded-ink">{isRTL ? 'الاسم بالعربية:' : 'Name (Arabic):'}</span>
              <span className="font-bold text-navy" dir="rtl">{user?.arabic_name || (isRTL ? 'غير محدد' : 'Not set')}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-inner bg-well border border-line">
              <span className="font-semibold text-faded-ink">{isRTL ? 'البريد الإلكتروني:' : 'Email Address:'}</span>
              <span className="font-mono font-bold text-navy">{user?.email}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-inner bg-well border border-line">
              <span className="font-semibold text-faded-ink">{isRTL ? 'الدور الوظيفي (RBAC):' : 'Role & Permissions:'}</span>
              <span className="font-bold text-blue uppercase">{user?.role}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-inner bg-well border border-line">
              <span className="font-semibold text-faded-ink">{isRTL ? 'حالة التوثيق:' : 'Verification Status:'}</span>
              <span className={`font-bold ${user?.email_verified ? 'text-emerald-700' : 'text-amber-700'}`}>
                {user?.email_verified ? (isRTL ? 'موثق رسمياً' : 'Verified') : (isRTL ? 'بانتظار التأكيد' : 'Pending Verification')}
              </span>
            </div>
          </div>
        </DecidixCard>

        {/* Change Password Card */}
        <DecidixCard variant="card" className="p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <div className="w-10 h-10 rounded-xl bg-navy text-white flex items-center justify-center p-2 font-bold text-lg">
              🔒
            </div>
            <div>
              <h3 className="font-bold text-navy text-base">
                {isRTL ? 'تغيير كلمة المرور' : 'Security & Password Update'}
              </h3>
              <p className="text-xs text-faded-ink">
                {isRTL
                  ? 'تحديث كلمة المرور وإلغاء كافة الجلسات النشطة لحماية الحساب'
                  : 'Updating your password invalidates all existing JWT sessions'}
              </p>
            </div>
          </div>

          {passwordSuccess && (
            <div className="p-3.5 rounded-well bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
              ✓ {passwordSuccess}
            </div>
          )}

          {passwordError && (
            <div className="p-3.5 rounded-well bg-rose-50 text-danger text-xs font-semibold border border-rose-200">
              ✕ {passwordError}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-navy mb-1.5">
                {isRTL ? 'كلمة المرور الحالية' : 'Current Password'} *
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="decidix-input text-xs w-full ltr:pr-10 rtl:pl-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 text-faded-ink hover:text-navy text-xs font-bold p-1"
                >
                  {showCurrent ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-navy mb-1.5">
                {isRTL ? 'كلمة المرور الجديدة' : 'New Password (Min. 8 characters)'} *
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="decidix-input text-xs w-full ltr:pr-10 rtl:pl-10"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 text-faded-ink hover:text-navy text-xs font-bold p-1"
                >
                  {showNew ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-navy mb-1.5">
                {isRTL ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'} *
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="decidix-input text-xs w-full ltr:pr-10 rtl:pl-10"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 text-faded-ink hover:text-navy text-xs font-bold p-1"
                >
                  {showConfirm ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <DecidixButton
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
              >
                {passwordLoading
                  ? isRTL ? 'جارٍ الحفظ...' : 'Saving Password...'
                  : isRTL ? 'تحديث كلمة المرور' : 'Update Password'}
              </DecidixButton>
            </div>
          </form>
        </DecidixCard>
      </div>

      {/* Security Architecture & Staging Footnote */}
      <div className="p-4 rounded-card bg-white border border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-faded-ink">
        <div className="flex items-center gap-2">
          <span>🔒</span>
          <span>
            {isRTL
              ? 'المنظومة محمية بواسطة تشفير JWT HS256 مع تدوير الرموز عبر خوادم Heroku Staging وPostgreSQL'
              : 'Protected by HS256 JWT encryption with rotating refresh tokens on Heroku Staging & PostgreSQL'}
          </span>
        </div>
        <div className="font-mono text-navy font-bold">
          API: decidix-backend-staging
        </div>
      </div>
    </div>
  );
};
