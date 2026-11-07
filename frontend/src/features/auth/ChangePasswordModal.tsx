import React, { useState } from 'react';
import { authService } from '../../services/authService';
import { useLanguage } from '../../context/LanguageContext';

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
      <div className="decidix-card max-w-md w-full p-6 bg-white relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink hover:text-navy text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-well"
          aria-label="Close"
        >
          ✕
        </button>

        <h3 className="text-xl font-bold text-navy mb-1">
          {isRTL ? 'تغيير كلمة المرور' : 'Change Password'}
        </h3>
        <p className="text-sm text-faded-ink mb-5">
          {isRTL
            ? 'قم بتحديث كلمة المرور الخاصة بحسابك لتعزيز أمان المنصة.'
            : 'Update your account credentials to maintain strict system security.'}
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-well bg-rose-50 text-danger text-sm font-medium border border-rose-200">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 mb-4 rounded-well bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-200">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink uppercase mb-1">
              {isRTL ? 'كلمة المرور الحالية' : 'Current Password'}
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="decidix-input"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink uppercase mb-1">
              {isRTL ? 'كلمة المرور الجديدة (8 أحرف فأكثر)' : 'New Password (8+ characters)'}
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="decidix-input"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink uppercase mb-1">
              {isRTL ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="decidix-input"
              placeholder="••••••••"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="decidix-btn-secondary flex-1"
              disabled={isSubmitting}
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="decidix-btn-primary flex-1"
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
