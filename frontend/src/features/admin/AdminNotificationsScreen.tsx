import React, { useState, useEffect } from 'react';
import { adminService, SendNotificationPayload } from '../../services/adminService';
import { NotificationDispatch } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { DecidixCard } from '../../components/DecidixCard';
import { DecidixChip } from '../../components/DecidixChip';
import { DecidixButton } from '../../components/DecidixButton';
import { useLanguage } from '../../context/LanguageContext';

export const AdminNotificationsScreen: React.FC = () => {
  const { isRTL } = useLanguage();
  const [history, setHistory] = useState<NotificationDispatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [arabicTitle, setArabicTitle] = useState('');
  const [arabicBody, setArabicBody] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'user' | 'test'>('test');
  const [targetUserId, setTargetUserId] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const data = await adminService.getNotificationHistory();
      setHistory(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setIsSending(true);

    try {
      const payload: SendNotificationPayload = {
        title,
        body,
        target_audience: targetAudience,
        target_user_id: targetAudience === 'user' ? targetUserId : undefined,
        arabic_title: arabicTitle || undefined,
        arabic_body: arabicBody || undefined,
      };

      await adminService.sendNotification(payload);
      setStatusMessage({
        text: isRTL ? 'تم إرسال الإشعار بنجاح عبر خدمة FCM!' : 'Push notification successfully broadcasted via FCM!',
      });
      setTitle('');
      setBody('');
      setArabicTitle('');
      setArabicBody('');
      await fetchHistory();
    } catch (err: any) {
      setStatusMessage({
        text: err?.message || 'Failed to dispatch notification',
        isError: true,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-pill bg-rose-50 text-danger border border-rose-200/60 text-[11px] font-bold uppercase tracking-wider mb-2">
            🔒 {isRTL ? 'مركز البث الإداري (FCM)' : 'FCM Push Broadcast Center'}
          </div>
          <TwoToneHeading
            eyebrow={isRTL ? 'مركز البث والرسائل التنبيهية' : 'PUSH DISPATCH CONSOLE'}
            first={isRTL ? 'إرسال' : 'Push'}
            second={isRTL ? 'الإشعارات الفورية' : 'Notifications'}
            level={1}
            className="text-3xl font-extrabold"
          />
          <p className="text-sm text-faded-ink mt-1">
            {isRTL
              ? 'إرسال التنبيهات المباشرة إلى الهواتف وتطبيقات الويب عبر Firebase Cloud Messaging'
              : 'Direct push dispatch with bilingual payload support & Firebase Cloud Messaging'}
          </p>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-card text-sm font-semibold flex items-center justify-between ${
            statusMessage.isError
              ? 'bg-rose-50 border border-rose-200 text-danger'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}
        >
          <span>{statusMessage.isError ? '✕' : '✓'} {statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)}>✕</button>
        </div>
      )}

      {/* Dispatch Form Card */}
      <DecidixCard variant="card" className="p-6 md:p-8 bg-white border border-line">
        <h3 className="font-bold text-navy text-base mb-4">
          {isRTL ? 'صياغة إشعار جديد' : 'Compose Notification'}
        </h3>

        <form onSubmit={handleSend} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink uppercase mb-1">
                {isRTL ? 'عنوان الإشعار (بالإنجليزية)' : 'Title (English)'}
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Critical Update: Cairo Dataset Activated"
                className="decidix-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink uppercase mb-1">
                {isRTL ? 'عنوان الإشعار (بالعربية - اختياري)' : 'Title (Arabic - Optional)'}
              </label>
              <input
                type="text"
                value={arabicTitle}
                onChange={(e) => setArabicTitle(e.target.value)}
                placeholder="مثال: تحديث عاجل: تم تفعيل بيانات القاهرة"
                className="decidix-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink uppercase mb-1">
                {isRTL ? 'نص الرسالة (بالإنجليزية)' : 'Body (English)'}
              </label>
              <textarea
                required
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Brief notification summary..."
                className="decidix-input resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink uppercase mb-1">
                {isRTL ? 'نص الرسالة (بالعربية - اختياري)' : 'Body (Arabic - Optional)'}
              </label>
              <textarea
                rows={3}
                value={arabicBody}
                onChange={(e) => setArabicBody(e.target.value)}
                placeholder="ملخص الإشعار..."
                className="decidix-input resize-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-semibold text-ink uppercase mb-2">
              {isRTL ? 'الجمهور المستهدف' : 'Target Audience'}
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              <DecidixChip
                label={isRTL ? 'اختبار النظام' : 'Test Device Only'}
                selected={targetAudience === 'test'}
                onClick={() => setTargetAudience('test')}
              />
              <DecidixChip
                label={isRTL ? 'كافة المستخدمين' : 'All Registered Users'}
                selected={targetAudience === 'all'}
                onClick={() => setTargetAudience('all')}
              />
              <DecidixChip
                label={isRTL ? 'مستخدم محدد' : 'Specific User'}
                selected={targetAudience === 'user'}
                onClick={() => setTargetAudience('user')}
              />
            </div>

            {targetAudience === 'user' && (
              <div className="mt-2">
                <label className="block text-xs font-semibold text-ink uppercase mb-1">
                  Target User ID
                </label>
                <input
                  type="text"
                  required
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="UUID string"
                  className="decidix-input"
                />
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end">
            <DecidixButton
              type="submit"
              variant="primary"
              disabled={isSending || !title || !body}
            >
              {isSending
                ? isRTL ? 'جارٍ الإرسال عبر FCM...' : 'Broadcasting...'
                : isRTL ? 'إرسال الإشعار الآن' : 'Dispatch Push Notification'}
            </DecidixButton>
          </div>
        </form>
      </DecidixCard>

      {/* Dispatch History Table */}
      <DecidixCard variant="card" className="p-6">
        <h3 className="font-bold text-navy text-base mb-4">
          {isRTL ? 'سجل الإشعارات المرسلة' : 'Dispatch History Log'}
        </h3>

        {isLoading ? (
          <LoadingSpinner message="" />
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-ink text-sm">
            <p>{isRTL ? 'لم يتم إرسال إشعارات حتى الآن.' : 'No notification dispatches recorded yet.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-bold text-faded-ink uppercase">
                  <th className="py-3 px-4">{isRTL ? 'العنوان' : 'Title'}</th>
                  <th className="py-3 px-4">{isRTL ? 'الجمهور' : 'Audience'}</th>
                  <th className="py-3 px-4">{isRTL ? 'المرسل' : 'Sent By'}</th>
                  <th className="py-3 px-4">{isRTL ? 'التوقيت' : 'Sent At'}</th>
                  <th className="py-3 px-4">{isRTL ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-well/50 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-navy">{h.title}</div>
                      <div className="text-xs text-ink line-clamp-1">{h.body}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-pill bg-well text-navy uppercase">
                        {h.target_audience}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-faded-ink truncate max-w-xs">
                      {h.sent_by_user_id || 'System Admin'}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-faded-ink">
                      {new Date(h.sent_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="decidix-pill-badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        {h.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DecidixCard>
    </div>
  );
};
