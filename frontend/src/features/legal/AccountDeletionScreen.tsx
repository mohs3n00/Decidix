import React, { useState, useEffect } from 'react';
import { NavLink, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { authService } from '../../services/authService';
import { DecidixIcon } from '../../components/DecidixIcon';
import { DecidixButton } from '../../components/DecidixButton';
import { LegalFooter } from '../../components/LegalFooter';

export const AccountDeletionScreen: React.FC = () => {
  const { user, isAuthenticated, deleteAccount } = useAuth();
  const { isRTL, language, toggleLanguage } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tokenParam = searchParams.get('token');

  // Confirmation modal state for authenticated deletion
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [authDeleteSuccess, setAuthDeleteSuccess] = useState(false);
  const [authDeleteError, setAuthDeleteError] = useState<string | null>(null);

  // Email request state for unauthenticated flow
  const [email, setEmail] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Token confirmation state
  const [tokenInput, setTokenInput] = useState(tokenParam || '');
  const [isConfirmingToken, setIsConfirmingToken] = useState(false);
  const [tokenSuccess, setTokenSuccess] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  useEffect(() => {
    if (tokenParam) {
      setTokenInput(tokenParam);
    }
  }, [tokenParam]);

  const handleAuthenticatedDelete = async () => {
    setIsDeleting(true);
    setAuthDeleteError(null);
    try {
      await deleteAccount();
      setAuthDeleteSuccess(true);
      setShowConfirmModal(false);
    } catch (err: any) {
      setAuthDeleteError(err?.message || (isRTL ? 'فشل حذف الحساب. يرجى المحاولة مرة أخرى.' : 'Failed to delete account. Please try again.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRequestEmailDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsRequesting(true);
    setRequestError(null);
    setRequestSuccess(null);
    try {
      const res = await authService.requestAccountDeletion(email.trim());
      setRequestSuccess(
        res.message ||
          (isRTL
            ? 'إذا كان هذا البريد مسجلاً في منصة ديسيدكس، فقد تم إرسال رابط تأكيد الحذف إليه.'
            : 'If this email belongs to an active account, deletion confirmation instructions have been sent.')
      );
      setEmail('');
    } catch (err: any) {
      setRequestError(err?.message || (isRTL ? 'حدث خطأ أثناء إرسال الطلب.' : 'Failed to send deletion request.'));
    } finally {
      setIsRequesting(false);
    }
  };

  const handleConfirmWithToken = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tokenInput.trim()) return;
    setIsConfirmingToken(true);
    setTokenError(null);
    setTokenSuccess(null);
    try {
      const res = await authService.confirmAccountDeletion(tokenInput.trim());
      setTokenSuccess(
        res.message ||
          (isRTL
            ? 'تم حذف حسابك وإلغاء جميع الجلسات بنجاح.'
            : 'Your account has been deleted successfully. All active sessions have been revoked.')
      );
    } catch (err: any) {
      setTokenError(err?.message || (isRTL ? 'رمز الحذف غير صالح أو انتهت صلاحيته.' : 'Invalid or expired deletion token.'));
    } finally {
      setIsConfirmingToken(false);
    }
  };

  return (
    <div className={`min-h-screen bg-[#F8FAFC] flex flex-col text-navy ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header (100% Light Theme) */}
      <header className="bg-white text-[#061A3A] border-b border-[#E2E8F0] sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2.5">
            <DecidixIcon name="splash_mark" size={28} className="shrink-0" />
            <div>
              <span className="font-extrabold text-base tracking-tight text-[#061A3A] block leading-none">DECIDIX</span>
              <span className="text-[10px] text-rose-600 font-semibold tracking-wider uppercase block mt-0.5">
                {isRTL ? 'إدارة وحذف الحساب' : 'Account & Data Erasure'}
              </span>
            </div>
          </NavLink>

          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleLanguage}
              className="px-3 py-1.5 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#061A3A] text-xs font-semibold border border-[#E2E8F0] transition whitespace-nowrap"
            >
              {language === 'en' ? 'العربية' : 'English'}
            </button>
            <NavLink
              to="/"
              className="px-4 py-1.5 rounded-full bg-blue hover:bg-blue-hover text-white text-xs font-bold transition shadow-2xs whitespace-nowrap"
            >
              {isRTL ? 'الرئيسية' : 'Home'}
            </NavLink>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-8 py-10">
        <div className="bg-white rounded-2xl border border-[#E3E9F2] shadow-sm p-6 md:p-10 space-y-8">
          {/* Header Title */}
          <div className="border-b border-[#E3E9F2] pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold mb-3 border border-rose-200">
              <DecidixIcon name="close" size={12} color="#BE123C" />
              <span>{isRTL ? 'إجراء لا يمكن التراجع عنه' : 'Irreversible Action'}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-navy">
              {isRTL ? 'حذف الحساب ومحو البيانات الشخصية' : 'Delete Account & Erase Personal Data'}
            </h1>
            <p className="text-xs text-faded-ink mt-2 leading-relaxed">
              {isRTL
                ? 'متوافق مع متطلبات متجر Google Play لحذف بيانات المستخدمين. يتيح لك هذا الإجراء إغلاق حسابك بشكل دائم وإلغاء كافة الجلسات النشطة.'
                : 'Complies with Google Play Store account deletion requirements. This allows you to permanently close your account and revoke all active sessions.'}
            </p>
          </div>

          {/* Warning Banner */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-2">
            <div className="font-bold flex items-center gap-2">
              <DecidixIcon name="insights" size={15} color="#B45309" />
              <span>{isRTL ? 'الآثار المترتبة على الحذف:' : 'Consequences of Deleting Your Account:'}</span>
            </div>
            <ul className="list-disc ltr:pl-5 rtl:pr-5 space-y-1 text-[11px]">
              <li>{isRTL ? 'يتم تعطيل حسابك فوراً ومنع تسجيل الدخول به مستقبلاً.' : 'Your account will be immediately deactivated and login will be permanently barred.'}</li>
              <li>{isRTL ? 'يتم إبطال جميع جلسات الدخول على الويب وتطبيق الهاتف في التو واللحظة.' : 'All web and mobile active sessions and JWT refresh tokens are revoked immediately.'}</li>
              <li>{isRTL ? 'تُلغى جميع اشتراكات إشعارات الأجهزة (FCM).' : 'All registered push notification device tokens are deactivated.'}</li>
            </ul>
          </div>

          {/* Success screen after deletion */}
          {(authDeleteSuccess || tokenSuccess) && (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <DecidixIcon name="check" size={24} color="#059669" />
              </div>
              <h2 className="text-lg font-bold text-emerald-900">
                {isRTL ? 'تم حذف الحساب بنجاح' : 'Account Deleted Successfully'}
              </h2>
              <p className="text-xs text-emerald-800 leading-relaxed max-w-md mx-auto">
                {tokenSuccess ||
                  (isRTL
                    ? 'تم إغلاق حسابك وإلغاء جميع الجلسات المسجلة. يمكنك الآن العودة لتصفح المنصة بوضع الزائر.'
                    : 'Your account has been deleted and all sessions revoked. You may continue browsing public platform intelligence as a guest.')}
              </p>
              <div className="pt-2">
                <NavLink
                  to="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm"
                >
                  <span>{isRTL ? 'العودة للمنصة (وضع الزائر)' : 'Explore Platform as Guest'}</span>
                </NavLink>
              </div>
            </div>
          )}

          {/* Authenticated User Deletion Section */}
          {!authDeleteSuccess && !tokenSuccess && isAuthenticated && (
            <div className="p-6 rounded-2xl bg-white border border-[#E3E9F2] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-navy">
                    {isRTL ? 'أنت مسجل الدخول حالياً باسم:' : 'You are currently signed in as:'}
                  </h3>
                  <div className="text-xs font-semibold text-blue mt-0.5">{user?.name} ({user?.email})</div>
                  <div className="text-[11px] text-faded-ink uppercase tracking-wider mt-0.5">Role: {user?.role}</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue text-white flex items-center justify-center font-bold text-base">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              </div>

              {authDeleteError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {authDeleteError}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-2"
                >
                  <DecidixIcon name="close" size={14} color="#FFFFFF" />
                  <span>{isRTL ? 'حذف حسابي الآن نهائياً' : 'Permanently Delete My Account'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Unauthenticated User: Request Deletion via Email */}
          {!authDeleteSuccess && !tokenSuccess && !isAuthenticated && (
            <div className="space-y-6">
              {/* Option A: Quick Sign In */}
              <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E3E9F2] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-bold text-navy">
                    {isRTL ? 'الخيار الأول: تسجيل الدخول للحذف الفوري' : 'Option 1: Sign in to delete instantly'}
                  </h3>
                  <p className="text-[11px] text-faded-ink mt-0.5">
                    {isRTL
                      ? 'إذا كنت تتذكر بيانات حسابك، سجّل الدخول لحذف حسابك بضغطة زر واحدة.'
                      : 'If you remember your credentials, sign in to confirm deletion with one click.'}
                  </p>
                </div>
                <NavLink
                  to="/login?redirect=/delete-account"
                  className="shrink-0 px-4 py-2 rounded-xl bg-blue hover:bg-blue-hover text-white text-xs font-bold transition shadow-sm"
                >
                  {isRTL ? 'تسجيل الدخول' : 'Sign In Now'}
                </NavLink>
              </div>

              {/* Option B: Request via Email */}
              <div className="p-6 rounded-2xl bg-white border border-[#E3E9F2] shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-navy">
                    {isRTL ? 'الخيار الثاني: طلب رابط تأكيد الحذف عبر البريد' : 'Option 2: Request deletion confirmation link via email'}
                  </h3>
                  <p className="text-xs text-faded-ink mt-1">
                    {isRTL
                      ? 'أدخل بريدك الإلكتروني المسجل وسنرسل لك رابطاً مشفراً وآمناً لتأكيد الحذف دون الحاجة لتسجيل الدخول.'
                      : 'Enter your registered email address and we will dispatch a secure one-time link to confirm deletion.'}
                  </p>
                </div>

                {requestSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                    <DecidixIcon name="check" size={14} color="#059669" />
                    <span>{requestSuccess}</span>
                  </div>
                )}

                {requestError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                    {requestError}
                  </div>
                )}

                <form onSubmit={handleRequestEmailDeletion} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-navy mb-1.5">
                      {isRTL ? 'البريد الإلكتروني المسجل' : 'Registered Email Address'} *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="decidix-input text-xs w-full"
                    />
                  </div>
                  <DecidixButton
                    type="submit"
                    variant="danger"
                    size="md"
                    disabled={isRequesting || !email.trim()}
                  >
                    {isRequesting
                      ? isRTL ? 'جارٍ إرسال الرابط...' : 'Sending Link...'
                      : isRTL ? 'إرسال رابط تأكيد الحذف' : 'Send Deletion Confirmation Link'}
                  </DecidixButton>
                </form>
              </div>

              {/* Option C: Token confirmation if user has token */}
              <div className="p-6 rounded-2xl bg-white border border-[#E3E9F2] shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-navy">
                    {isRTL ? 'لديك رمز أو رابط تأكيد؟' : 'Have a deletion confirmation token?'}
                  </h3>
                  <p className="text-xs text-faded-ink mt-1">
                    {isRTL
                      ? 'إذا تلقيت رمز تأكيد الحذف عبر البريد الإلكتروني، ألصقه هنا لتأكيد الحذف نهائياً.'
                      : 'If you received a deletion token via email, paste it here to finalize deletion.'}
                  </p>
                </div>

                {tokenError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                    {tokenError}
                  </div>
                )}

                <form onSubmit={handleConfirmWithToken} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-navy mb-1.5">
                      {isRTL ? 'رمز التأكيد' : 'Confirmation Token'} *
                    </label>
                    <input
                      type="text"
                      required
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="Paste deletion token here..."
                      className="decidix-input text-xs w-full font-mono"
                    />
                  </div>
                  <DecidixButton
                    type="submit"
                    variant="danger"
                    size="md"
                    disabled={isConfirmingToken || !tokenInput.trim()}
                  >
                    {isConfirmingToken
                      ? isRTL ? 'جارٍ تأكيد الحذف...' : 'Confirming Deletion...'
                      : isRTL ? 'تأكيد وحذف الحساب نهائياً' : 'Confirm & Finalize Account Deletion'}
                  </DecidixButton>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Confirmation Modal for Authenticated User */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <DecidixIcon name="close" size={24} color="#E11D48" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-extrabold text-navy">
                {isRTL ? 'تأكيد الحذف النهائي للحساب' : 'Confirm Permanent Deletion'}
              </h3>
              <p className="text-xs text-faded-ink leading-relaxed">
                {isRTL
                  ? 'هل أنت متأكد تماماً من رغبتك في حذف حسابك؟ سيتم إبطال جميع جلسات الدخول وإلغاء تنشيط حسابك فوراً دون إمكانية للاسترجاع.'
                  : 'Are you sure you want to permanently delete your account? All active sessions will be terminated and your account will be irreversibly deactivated.'}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-bold text-navy hover:bg-slate-50 transition"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleAuthenticatedDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm"
              >
                {isDeleting
                  ? isRTL ? 'جارٍ الحذف...' : 'Deleting...'
                  : isRTL ? 'نعم، احذف الحساب' : 'Yes, Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      <LegalFooter />
    </div>
  );
};
