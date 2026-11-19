import React, { useState } from 'react';
import { authService } from '../../services/authService';
import { useLanguage } from '../../context/LanguageContext';
import { DecidixIcon } from '../../components/DecidixIcon';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const { isRTL } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError(isRTL ? 'يجب أن لا تقل كلمة المرور الجديدة عن 8 أحرف.' : 'New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(isRTL ? 'كلمتا المرور غير متطابقتين.' : 'New password and confirmation do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      await authService.changePassword(currentPassword, newPassword);
      setSuccess(
        isRTL
          ? 'تم تغيير كلمة المرور بنجاح وتم إلغاء الجلسات السابقة بأمان.'
          : 'Password changed successfully. Existing sessions have been revoked.'
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed to change password. Verify your current password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 backdrop-blur-sm p-4">
      <div className="max-w-md w-full p-6 bg-white rounded-2xl border border-slate-200/80 shadow-card relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 ltr:right-4 rtl:left-4 text-slate-400 hover:text-navy w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <DecidixIcon name="close" size={16} />
        </button>

        <h3 className="text-xl font-bold text-navy mb-1">
          {isRTL ? 'تغيير كلمة المرور' : 'Change Password'}
        </h3>
        <p className="text-xs text-slate-500 mb-5">
          {isRTL
            ? 'قم بتحديث كلمة المرور الخاصة بحسابك لتعزيز أمان المنصة.'
            : 'Update your account credentials to maintain strict system security.'}
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200/80">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 mb-4 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/80">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-navy uppercase mb-1.5">
              {isRTL ? 'كلمة المرور الحالية' : 'Current Password'}
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full h-10 px-3.5 rounded-lg border border-slate-200/80 text-xs text-navy placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue/15 focus:border-blue transition-colors bg-slate-50 outline-none"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy uppercase mb-1.5">
              {isRTL ? 'كلمة المرور الجديدة (8 أحرف فأكثر)' : 'New Password (8+ characters)'}
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full h-10 px-3.5 rounded-lg border border-slate-200/80 text-xs text-navy placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue/15 focus:border-blue transition-colors bg-slate-50 outline-none"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy uppercase mb-1.5">
              {isRTL ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-10 px-3.5 rounded-lg border border-slate-200/80 text-xs text-navy placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue/15 focus:border-blue transition-colors bg-slate-50 outline-none"
              placeholder="••••••••"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-9 rounded-lg border border-slate-200/80 text-slate-600 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors"
              disabled={isSubmitting}
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="flex-1 h-9 rounded-lg bg-blue hover:bg-blue-hover text-white text-xs font-semibold shadow-2xs active:scale-[0.98] transition-all"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? isRTL ? 'جارٍ التحديث...' : 'Updating...'
                : isRTL ? 'حفظ التغييرات' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
