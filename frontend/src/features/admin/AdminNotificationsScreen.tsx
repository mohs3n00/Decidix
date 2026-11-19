import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../components/Toast';
import { DecidixIcon } from '../../components/DecidixIcon';

export const AdminNotificationsScreen: React.FC = () => {
  const { isRTL } = useLanguage();
  const toast = useToast();

  const [title, setTitle] = useState('New development insights are available');
  const [message, setMessage] = useState('Your regional overview has been updated. Open Decidix to explore the latest indicators.');
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [target, setTarget] = useState<'all' | 'specific' | 'test'>('test');

  const handleSendTest = () => {
    toast.success(
      isRTL
        ? 'تم إرسال إشعار التجربة بنجاح إلى جهاز المسؤول عبر FCM.'
        : 'Test notification sent successfully to admin device via FCM.'
    );
  };

  const handlePreview = () => {
    toast.info(
      isRTL
        ? 'معاينة الإشعار معروضة في البطاقة الجانبية المخصصة للمحمول.'
        : 'Mobile preview is displayed in the preview panel.'
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue mb-1">
            {isRTL ? 'إدارة المنظومة' : 'ADMIN WORKSPACE'}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-navy">
            {isRTL ? 'مركز الإشعارات' : 'Notification center'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isRTL
              ? 'صياغة إشعارات فورية موجهة، معاينتها، ومراجعة نتائج الحملات السابقة.'
              : 'Compose targeted push notifications, preview them, and review campaign outcomes.'}
          </p>
        </div>

        <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
          Test mode · no broadcast sent
        </span>
      </div>

      {/* Main Grid: Form (8 cols) + Preview & Campaigns (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Compose Form */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-navy mb-0.5">
              {isRTL ? 'صياغة الإشعار' : 'Compose notification'}
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              {isRTL
                ? 'إرسال عبر تكامل Firebase Cloud Messaging الفعلي المعتمد'
                : 'Send through the existing Firebase Cloud Messaging integration'}
            </p>

            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  {isRTL ? 'عنوان الإشعار' : 'NOTIFICATION TITLE'}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Example: New development insights are available"
                  className="w-full h-10 px-3.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs font-semibold text-navy focus:bg-white focus:ring-2 focus:ring-blue/15 focus:border-blue outline-none transition-colors duration-150"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  {isRTL ? 'نص الرسالة' : 'MESSAGE'}
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write a concise update for Decidix users..."
                  className="w-full p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs font-medium text-navy focus:bg-white focus:ring-2 focus:ring-blue/15 focus:border-blue outline-none resize-none transition-colors duration-150"
                />
              </div>

              {/* Language Pills */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  {isRTL ? 'اللغة المستهدفة' : 'LANGUAGE'}
                </label>
                <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg w-fit">
                  <button
                    onClick={() => setLang('en')}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                      lang === 'en'
                        ? 'bg-white text-navy shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-navy'
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setLang('ar')}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                      lang === 'ar'
                        ? 'bg-white text-navy shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-navy'
                    }`}
                  >
                    العربية
                  </button>
                </div>
              </div>

              {/* Target Audience Radio Cards */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  {isRTL ? 'الجمهور المستهدف' : 'TARGET AUDIENCE'}
                </label>
                <div className="space-y-2">
                  <div
                    onClick={() => setTarget('all')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 flex items-center justify-between ${
                      target === 'all'
                        ? 'border-blue bg-blue-50/60 shadow-2xs'
                        : 'border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-navy">
                        {isRTL ? 'كافة المستخدمين النشطين' : 'All active users'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {isRTL ? 'بث عام بعد التأكيد المباشر' : 'Broadcast after confirmation'}
                      </div>
                    </div>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${target === 'all' ? 'border-blue bg-blue' : 'border-slate-300'}`}>
                      {target === 'all' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>

                  <div
                    onClick={() => setTarget('specific')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 flex items-center justify-between ${
                      target === 'specific'
                        ? 'border-blue bg-blue-50/60 shadow-2xs'
                        : 'border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-navy">
                        {isRTL ? 'مستخدم محدد' : 'Specific user'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {isRTL ? 'تحديد حساب مسجل واحد' : 'Select one registered account'}
                      </div>
                    </div>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${target === 'specific' ? 'border-blue bg-blue' : 'border-slate-300'}`}>
                      {target === 'specific' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>

                  <div
                    onClick={() => setTarget('test')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 flex items-center justify-between ${
                      target === 'test'
                        ? 'border-blue bg-blue-50/60 shadow-2xs'
                        : 'border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-navy">
                        {isRTL ? 'اختبار على جهازي فقط' : 'Test to my device'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {isRTL ? 'إرسال لجهاز المسؤول المسجل فقط' : "Send only to admin's registered device"}
                      </div>
                    </div>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${target === 'test' ? 'border-blue bg-blue' : 'border-slate-300'}`}>
                      {target === 'test' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 mt-6">
            <button
              onClick={handlePreview}
              className="h-9 px-4 rounded-lg border border-slate-200/80 text-navy hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors duration-150"
            >
              {isRTL ? 'معاينة الإشعار' : 'Preview notification'}
            </button>
            <button
              onClick={handleSendTest}
              className="h-9 px-5 rounded-lg bg-blue hover:bg-blue-hover text-white text-xs font-semibold shadow-2xs active:scale-[0.98] transition-all duration-150"
            >
              {isRTL ? 'إرسال إشعار تجريبي' : 'Send test notification'}
            </button>
          </div>
        </div>

        {/* Right: Mobile Preview + Recent Campaigns */}
        <div className="lg:col-span-4 space-y-6">
          {/* Mobile Preview Box */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <h2 className="text-base font-bold text-navy mb-0.5">
              {isRTL ? 'معاينة العرض' : 'Preview'}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              {isRTL ? 'شكل الظهور على شاشات الهواتف المحمولة' : 'Example display on a mobile device'}
            </p>

            <div className="bg-[#061A3A] rounded-2xl p-4 text-white space-y-2 shadow-sm border border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center">
                    <DecidixIcon name="logo_white" size={12} />
                  </div>
                  <span className="text-[11px] font-bold tracking-wider uppercase">DECIDIX</span>
                </div>
                <span className="text-[10px] text-slate-400">now</span>
              </div>
              <div className="text-xs font-bold text-white pt-1">{title}</div>
              <div className="text-[11px] text-slate-300 leading-snug">{message}</div>
            </div>
          </div>

          {/* Recent Campaigns */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <h2 className="text-base font-bold text-navy mb-0.5">
              {isRTL ? 'أحدث الحملات' : 'Recent campaigns'}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              {isRTL
                ? 'قبول FCM وعرض الجهاز حالتان منفصلتان'
                : 'FCM acceptance and device display are separate statuses'}
            </p>

            <div className="divide-y divide-slate-100">
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-navy">Test to admin device</div>
                  <div className="text-[10px] text-slate-400">1 target</div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Accepted
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-navy">Regional update</div>
                  <div className="text-[10px] text-slate-400">18 targets</div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
                  Partial
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-navy">Dataset notice</div>
                  <div className="text-[10px] text-slate-400">24 targets</div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Completed
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
