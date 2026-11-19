import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { HeroCard } from '../../components/HeroCard';
import { DecidixCard } from '../../components/DecidixCard';
import { StatWell } from '../../components/StatWell';
import { DecidixButton } from '../../components/DecidixButton';
import { DecidixIcon } from '../../components/DecidixIcon';
import { useToast } from '../../components/Toast';

export const AccountScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, changePassword, resendVerification, refreshProfile, deleteAccount } = useAuth();
  const { isRTL } = useLanguage();
  const { success, error: toastError } = useToast();

  // Danger Zone Deletion State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  // Copy ID State
  const [copiedId, setCopiedId] = useState(false);

  // Calculate Password Strength (0-4)
  const calculatePasswordStrength = (pass: string): { score: number; labelEn: string; labelAr: string; color: string } => {
    if (!pass) return { score: 0, labelEn: '', labelAr: '', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, labelEn: 'Weak', labelAr: 'ضعيفة', color: 'bg-rose-500' };
      case 2:
        return { score: 2, labelEn: 'Fair', labelAr: 'متوسطة', color: 'bg-amber-500' };
      case 3:
        return { score: 3, labelEn: 'Good', labelAr: 'جيدة', color: 'bg-blue' };
      case 4:
        return { score: 4, labelEn: 'Strong', labelAr: 'قوية جداً', color: 'bg-emerald-500' };
      default:
        return { score: 1, labelEn: 'Too Short', labelAr: 'قصيرة جداً', color: 'bg-rose-500' };
    }
  };

  const passwordStrength = calculatePasswordStrength(newPassword);

  const handleCopyUserId = async () => {
    if (!user?.id) return;
    try {
      await navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      success(
        isRTL ? 'تم نسخ معرّف الحساب إلى الحافظة' : 'User ID copied to clipboard',
        isRTL ? 'تم النسخ' : 'Copied'
      );
      setTimeout(() => setCopiedId(false), 2500);
    } catch {
      toastError(isRTL ? 'تعذر نسخ المعرف' : 'Failed to copy User ID');
    }
  };

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
      const msg = res.message || (isRTL ? 'تم تغيير كلمة المرور بنجاح!' : 'Password successfully updated!');
      setPasswordSuccess(msg);
      success(msg, isRTL ? 'تم التحديث' : 'Security Updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const errMsg = err?.message || (isRTL ? 'فشل تغيير كلمة المرور. تأكد من صحة كلمة المرور الحالية.' : 'Failed to update password. Please check your current password.');
      setPasswordError(errMsg);
      toastError(errMsg, isRTL ? 'خطأ في الأمان' : 'Update Failed');
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
      const msg = res.message || (isRTL ? 'تم إرسال رابط تأكيد جديد إلى بريدك الإلكتروني.' : 'Verification link has been sent to your email.');
      setResendSuccess(msg);
      success(msg, isRTL ? 'تم الإرسال' : 'Verification Sent');
      await refreshProfile();
    } catch (err: any) {
      const errMsg = err?.message || (isRTL ? 'تعذر إرسال رسالة التأكيد.' : 'Failed to dispatch verification email.');
      setResendError(errMsg);
      toastError(errMsg);
    } finally {
      setResendLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
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
    <div className="space-y-7 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <TwoToneHeading
            eyebrow={isRTL ? 'إعدادات الحساب والأمان' : 'ACCOUNT & IDENTITY MANAGEMENT'}
            first={isRTL ? 'ملف' : 'User'}
            second={isRTL ? 'المستخدم وإعدادات الأمان' : 'Profile & Security'}
            level={1}
            className="text-2xl md:text-3xl font-bold"
          />
          <p className="text-xs md:text-sm text-slate-500 mt-1 leading-relaxed">
            {isRTL
              ? 'إدارة بيانات حسابك، صلاحيات الأدوار، حالة التوثيق، وتأمين كلمات المرور'
              : 'Manage authenticated credentials, RBAC privileges, email verification, and session security'}
          </p>
        </div>

        <DecidixButton
          variant="outlined"
          compact
          onClick={handleSignOut}
          className="self-start text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300 flex items-center gap-1.5"
        >
          <span>{isRTL ? 'تسجيل الخروج' : 'Sign Out Session'}</span>
          <DecidixIcon name="arrow_right" size={13} color="currentColor" />
        </DecidixButton>
      </div>

      {/* 1. Profile Hero Card (Decluttered, Balanced Layout) */}
      <HeroCard className="p-6 md:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* User Info Block */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-blue text-white flex items-center justify-center font-bold text-2xl shadow-xs shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>

            <div className="space-y-1.5 min-w-0">
              {/* Aligned User Name & Clean Badges */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold text-navy tracking-tight truncate">
                  {user?.name || 'Decidix User'}
                </h2>
                {user?.arabic_name && (
                  <span className="text-sm font-medium text-slate-500" dir="rtl">
                    ({user.arabic_name})
                  </span>
                )}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 text-blue font-bold text-[11px] uppercase tracking-wider border border-blue-200/60">
                  {isRTL ? currentRole.ar : currentRole.en}
                </span>
              </div>

              {/* Email & Verified Status in one clean row */}
              <div className="flex items-center gap-3 text-xs flex-wrap">
                <div className="flex items-center gap-1.5 text-slate-500 font-mono">
                  <DecidixIcon name="mail" size={13} color="#94A3B8" />
                  <span>{user?.email}</span>
                </div>

                <span className="text-slate-300">•</span>

                {user?.email_verified ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                    <DecidixIcon name="check" size={12} color="#059669" />
                    <span>{isRTL ? 'موثق' : 'Verified'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-xs">
                    <DecidixIcon name="warning" size={12} color="#D97706" />
                    <span>{isRTL ? 'قيد التوثيق' : 'Unverified'}</span>
                  </span>
                )}

                <span className="text-slate-300">•</span>

                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wide">
                  {user?.status || 'active'}
                </span>
              </div>
            </div>
          </div>

          {/* Compact Right Stat Boxes (Role & Registration Date) */}
          <div className="grid grid-cols-2 gap-3 min-w-[260px] sm:min-w-[280px]">
            <StatWell
              label={isRTL ? 'الصلاحيات' : 'Account Tier'}
              value={user?.role?.toUpperCase() || 'VIEWER'}
              subtext={isRTL ? 'معتمد عبر RBAC' : 'RBAC Assigned'}
            />
            <StatWell
              label={isRTL ? 'تاريخ التسجيل' : 'Registered'}
              value={
                user?.created_at
                  ? new Date(user.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Active'
              }
              subtext={isRTL ? 'عضوية معتمدة' : 'Active Account'}
            />
          </div>
        </div>
      </HeroCard>

      {/* Email Verification Alert Banner (if unverified) */}
      {!user?.email_verified && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                <DecidixIcon name="mail" size={16} color="#B45309" />
                <span>{isRTL ? 'البريد الإلكتروني بحاجة إلى توثيق' : 'Email Verification Required'}</span>
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed max-w-2xl">
                {isRTL
                  ? 'يرجى تأكيد بريدك الإلكتروني لتمكين رفع مجموعات البيانات والمشاركة في نماذج المحاكاة الاستراتيجية.'
                  : 'Please verify your email address to enable dataset uploads and participate in strategic policy simulations.'}
              </p>
              {resendSuccess && (
                <p className="text-xs font-semibold text-emerald-700 pt-1 flex items-center gap-1.5">
                  <DecidixIcon name="check" size={12} color="#059669" />
                  <span>{resendSuccess}</span>
                </p>
              )}
              {resendError && (
                <p className="text-xs font-semibold text-rose-600 pt-1 flex items-center gap-1.5">
                  <DecidixIcon name="close" size={12} color="#E11D48" />
                  <span>{resendError}</span>
                </p>
              )}
            </div>

            <DecidixButton
              variant="outlined"
              compact
              onClick={handleResendVerification}
              disabled={resendLoading}
              className="shrink-0 bg-white border-amber-300 text-amber-900 hover:bg-amber-100/60"
            >
              {resendLoading
                ? isRTL ? 'جارٍ الإرسال...' : 'Sending...'
                : isRTL ? 'إعادة إرسال الرابط' : 'Resend Link'}
            </DecidixButton>
          </div>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* 2. Account Details Card: Clean Divided List (divide-y divide-slate-100) */}
        <DecidixCard variant="card" className="space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue flex items-center justify-center p-2">
              <DecidixIcon name="account" size={18} color="#2563EB" />
            </div>
            <div>
              <h3 className="font-bold text-navy text-sm sm:text-base">
                {isRTL ? 'بيانات الحساب الأساسية' : 'Personal & Identity Details'}
              </h3>
              <p className="text-xs text-slate-500">
                {isRTL ? 'المعلومات المعتمدة في قاعدة بيانات المنظومة' : 'Verified institutional profile records'}
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {/* User ID Row with One-Click Copy */}
            <div className="flex items-center justify-between py-3">
              <span className="font-medium text-slate-500">{isRTL ? 'معرّف الحساب (User ID):' : 'Account UUID:'}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-navy font-semibold tabular-nums text-xs truncate max-w-[200px] sm:max-w-[260px]">
                  {user?.id}
                </span>
                <button
                  type="button"
                  onClick={handleCopyUserId}
                  className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-navy transition focus:outline-none focus:ring-1 focus:ring-blue"
                  title={copiedId ? (isRTL ? 'تم النسخ!' : 'Copied!') : (isRTL ? 'نسخ المعرف' : 'Copy UUID')}
                >
                  <DecidixIcon
                    name={copiedId ? 'check' : 'copy'}
                    size={14}
                    color={copiedId ? '#059669' : 'currentColor'}
                  />
                </button>
              </div>
            </div>

            {/* Name English */}
            <div className="flex items-center justify-between py-3">
              <span className="font-medium text-slate-500">{isRTL ? 'الاسم بالإنجليزية:' : 'Full Name (English):'}</span>
              <span className="font-semibold text-navy text-xs sm:text-sm">{user?.name}</span>
            </div>

            {/* Name Arabic */}
            <div className="flex items-center justify-between py-3">
              <span className="font-medium text-slate-500">{isRTL ? 'الاسم بالعربية:' : 'Name (Arabic):'}</span>
              <span className="font-semibold text-navy text-xs sm:text-sm" dir="rtl">
                {user?.arabic_name || (isRTL ? 'غير محدد' : 'Not set')}
              </span>
            </div>

            {/* Email */}
            <div className="flex items-center justify-between py-3">
              <span className="font-medium text-slate-500">{isRTL ? 'البريد الإلكتروني:' : 'Email Address:'}</span>
              <span className="font-mono font-semibold text-navy text-xs sm:text-sm">{user?.email}</span>
            </div>

            {/* Role & Permissions */}
            <div className="flex items-center justify-between py-3">
              <span className="font-medium text-slate-500">{isRTL ? 'الدور الوظيفي (RBAC):' : 'Role & Permissions:'}</span>
              <span className="font-bold text-blue uppercase text-xs tracking-wider">{user?.role}</span>
            </div>

            {/* Verification Status */}
            <div className="flex items-center justify-between py-3">
              <span className="font-medium text-slate-500">{isRTL ? 'حالة التوثيق:' : 'Verification Status:'}</span>
              <span className={`font-semibold text-xs ${user?.email_verified ? 'text-emerald-700' : 'text-amber-700'}`}>
                {user?.email_verified ? (isRTL ? 'موثق رسمياً' : 'Verified') : (isRTL ? 'بانتظار التأكيد' : 'Pending Verification')}
              </span>
            </div>
          </div>
        </DecidixCard>

        {/* 3. Password & Security Form with Strength Indicator */}
        <DecidixCard variant="card" className="space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue flex items-center justify-center p-2">
              <DecidixIcon name="lock" size={18} color="#2563EB" />
            </div>
            <div>
              <h3 className="font-bold text-navy text-sm sm:text-base">
                {isRTL ? 'تغيير كلمة المرور' : 'Security & Password Update'}
              </h3>
              <p className="text-xs text-slate-500">
                {isRTL
                  ? 'تحديث كلمة المرور وإلغاء كافة الجلسات النشطة لحماية الحساب'
                  : 'Updating your password invalidates all existing JWT sessions'}
              </p>
            </div>
          </div>

          {passwordSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200 flex items-center gap-2">
              <DecidixIcon name="check" size={14} color="#059669" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200 flex items-center gap-2">
              <DecidixIcon name="close" size={14} color="#E11D48" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-semibold text-navy mb-1.5">
                {isRTL ? 'كلمة المرور الحالية' : 'Current Password'} *
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="decidix-input text-xs sm:text-sm w-full ltr:pr-10 rtl:pl-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy p-1 transition"
                  title={showCurrent ? 'Hide password' : 'Show password'}
                >
                  <DecidixIcon name={showCurrent ? 'eye_slash' : 'eye'} size={15} color="currentColor" />
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-navy mb-1.5">
                {isRTL ? 'كلمة المرور الجديدة' : 'New Password (Min. 8 characters)'} *
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="decidix-input text-xs sm:text-sm w-full ltr:pr-10 rtl:pl-10"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy p-1 transition"
                  title={showNew ? 'Hide password' : 'Show password'}
                >
                  <DecidixIcon name={showNew ? 'eye_slash' : 'eye'} size={15} color="currentColor" />
                </button>
              </div>

              {/* Password Strength Meter */}
              {newPassword && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">
                      {isRTL ? 'قوة كلمة المرور:' : 'Password strength:'}
                    </span>
                    <span className="font-bold text-navy">
                      {isRTL ? passwordStrength.labelAr : passwordStrength.labelEn}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-1.5">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`rounded-full transition-all duration-200 ${
                          passwordStrength.score >= level ? passwordStrength.color : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-navy mb-1.5">
                {isRTL ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'} *
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="decidix-input text-xs sm:text-sm w-full ltr:pr-10 rtl:pl-10"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy p-1 transition"
                  title={showConfirm ? 'Hide password' : 'Show password'}
                >
                  <DecidixIcon name={showConfirm ? 'eye_slash' : 'eye'} size={15} color="currentColor" />
                </button>
              </div>
            </div>

            <div className="pt-2">
              <DecidixButton
                type="submit"
                variant="primary"
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

      {/* 4. Teams & Institutional Collaboration Card */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue/10 text-blue flex items-center justify-center font-bold text-base shrink-0">
            <DecidixIcon name="users" size={20} color="#0052FF" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#061A3A]">
              {isRTL ? 'العمل الجماعي والفرق المؤسسية' : 'Teams & Institutional Workspaces'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isRTL
                ? 'أنشئ فرق عمل، وشارك المعرف الخاص بك لإضافة زملائك، وتشاركوا مجموعات البيانات والتحليلات في مساحة موحدة.'
                : 'Collaborate with colleagues. Share your User ID to join or form shared teams with pooled datasets.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/team')}
          className="h-9 px-4 rounded-xl bg-blue hover:bg-blue-hover text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <span>{isRTL ? 'إدارة فرق العمل' : 'Manage Teams'}</span>
          <span>→</span>
        </button>
      </div>

      {/* 5. Danger Zone: Account Deletion (Subtle Red-Tinted Border) */}
      <div className="pt-2">
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/30 p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <DecidixIcon name="close" size={16} color="#BE123C" />
                <span>{isRTL ? 'منطقة الخطر: حذف الحساب والبيانات' : 'Danger Zone: Account Deletion'}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                {isRTL
                  ? 'حذف الحساب يؤدي إلى إنهاء جميع جلسات الدخول فوراً وإلغاء تنشيط الحساب نهائياً، وفق متطلبات متجر Google Play.'
                  : 'Permanently deletes your account and terminates all active sessions in compliance with Google Play Store data privacy guidelines.'}
              </p>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => navigate('/delete-account')}
                className="px-3 py-2 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-100/70 text-xs font-semibold transition"
              >
                {isRTL ? 'صفحة الحذف المستقلة' : 'Deletion Portal'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition shadow-xs active:scale-98"
              >
                {isRTL ? 'حذف الحساب نهائياً' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <DecidixIcon name="close" size={24} color="#E11D48" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-navy">
                {isRTL ? 'تأكيد حذف الحساب' : 'Confirm Account Deletion'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {isRTL
                  ? 'سيتم إلغاء جميع الجلسات وإغلاق حسابك نهائياً. هل أنت متأكد من رغبتك في المتابعة؟'
                  : 'All sessions will be revoked and your account will be permanently deactivated. Are you sure you wish to proceed?'}
              </p>
            </div>

            {deleteError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {deleteError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeletingAccount}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-navy hover:bg-slate-50 transition"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsDeletingAccount(true);
                  setDeleteError(null);
                  try {
                    await deleteAccount();
                    navigate('/login', { replace: true });
                  } catch (err: any) {
                    setDeleteError(err?.message || (isRTL ? 'فشل حذف الحساب' : 'Failed to delete account'));
                    setIsDeletingAccount(false);
                  }
                }}
                disabled={isDeletingAccount}
                className="flex-1 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition shadow-xs"
              >
                {isDeletingAccount
                  ? isRTL ? 'جارٍ الحذف...' : 'Deleting...'
                  : isRTL ? 'نعم، احذف الحساب' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
