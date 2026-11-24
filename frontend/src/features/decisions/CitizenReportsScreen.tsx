import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { DecidixIcon } from '../../components/DecidixIcon';
import { decisionsService } from '../../services/decisionsService';
import { CitizenReportsResponse } from '../../types';

export const CitizenReportsScreen: React.FC = () => {
  const { isRTL } = useLanguage();
  const { requireAuth } = useAuth();
  const toast = useToast();

  const [reportsData, setReportsData] = useState<CitizenReportsResponse | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchReports = async () => {
      setIsLoading(true);
      try {
        const res = await decisionsService.getCitizenReports({
          category: selectedCategory as any,
        });
        if (isMounted) setReportsData(res);
      } catch (err) {
        console.warn('Citizen reports fetch error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchReports();
    return () => {
      isMounted = false;
    };
  }, [selectedCategory]);

  const summary = reportsData?.summary || {
    open_this_week: { value: 0, change: 0, higher_is_better: false },
    resolved_rate: { value: 25, change: 0, higher_is_better: true },
  };

  const items = reportsData?.items || [];

  const handleSubmitReport = () => {
    requireAuth(
      isRTL
        ? 'يتطلب إرسال بلاغات أو مشاركات المواطنين تسجيل الدخول للتحقق من هوية المرسل.'
        : 'Sign in to submit or upvote verified citizen community reports.',
      () => {
        toast.info(
          isRTL
            ? 'نافذة تقديم بلاغ مواطن قيد التجهيز.'
            : 'Submit citizen feedback form initiated.'
        );
      },
      isRTL ? 'تقديم بلاغ مواطن' : 'Citizen Feedback'
    );
  };

  const handleToggleLike = (reportId: string) => {
    requireAuth(
      isRTL
        ? 'يتطلب تأييد بلاغات المواطنين تسجيل الدخول للتحقق من الهوية.'
        : 'Sign in to upvote community reports.',
      async () => {
        try {
          const updated = await decisionsService.toggleLikeReport(reportId);
          setReportsData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              items: prev.items.map((item) =>
                item.id === reportId
                  ? {
                      ...item,
                      likes: typeof updated?.likes === 'number' ? updated.likes : item.liked_by_me ? Math.max(0, item.likes - 1) : item.likes + 1,
                      liked_by_me: typeof updated?.liked === 'boolean' ? updated.liked : !item.liked_by_me,
                    }
                  : item
              ),
            };
          });
        } catch (err: any) {
          toast.error(err?.message || (isRTL ? 'تعذر تحديث التأييد' : 'Failed to update vote'));
        }
      },
      isRTL ? 'تأييد بلاغ مواطن' : 'Upvote Report'
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return {
          label: isRTL ? 'تم الحل' : 'Resolved',
          className: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
        };
      case 'escalated':
        return {
          label: isRTL ? 'مرفوع للإدارة' : 'Escalated',
          className: 'bg-rose-50 text-rose-700 border border-rose-200/60',
        };
      case 'under_review':
      default:
        return {
          label: isRTL ? 'قيد الفحص' : 'Under Review',
          className: 'bg-amber-50 text-amber-700 border border-amber-200/60',
        };
    }
  };

  const CATEGORIES = [
    { id: 'all', labelEn: 'All Categories', labelAr: 'جميع الفئات' },
    { id: 'roads', labelEn: 'Roads & Bridges', labelAr: 'طرق وجسور' },
    { id: 'health', labelEn: 'Health & Clinics', labelAr: 'صحة ورعاية' },
    { id: 'water', labelEn: 'Water & Utilities', labelAr: 'مياه ومرافق' },
    { id: 'schools', labelEn: 'Schools & Education', labelAr: 'مدارس وتعليم' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue mb-1">
            {isRTL ? 'دعم القرار والمشاركات المجتمعية' : 'DECISIONS'}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-navy">
            {isRTL ? 'مشاركات وبلاغات المواطنين' : 'Citizen Community Reports'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isRTL
              ? 'مراجعة القضايا المقدمة من المجتمعات المحلية وتتبع المعالجة والحلول الإقليمية.'
              : 'Review community-submitted issues and track resolution across monitored governorates.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="h-9 px-4 rounded-lg bg-white border border-slate-200/80 text-navy hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors duration-150"
          >
            {isRTL ? 'تصدير التقارير' : 'Export reports'}
          </button>
          <button
            onClick={handleSubmitReport}
            className="h-9 px-4 rounded-lg bg-blue hover:bg-blue-hover text-white text-xs font-semibold shadow-2xs active:scale-[0.98] transition-all duration-150 flex items-center gap-1.5"
          >
            <DecidixIcon name="chat" size={14} color="#FFFFFF" />
            <span>{isRTL ? 'تقديم بلاغ' : 'Submit report'}</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Open Reports */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue mb-3">
            <DecidixIcon name="decisions" size={16} color="var(--color-blue)" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'بلاغات جديدة هذا الأسبوع' : 'Open Reports This Week'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">
              {summary.open_this_week.value}
            </span>
            <span className="text-[11px] font-bold text-blue bg-blue-50 px-2.5 py-0.5 rounded-full">
              {isRTL ? 'فترة نشطة' : 'Active tracking'}
            </span>
          </div>
        </div>

        {/* Resolution Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
            <DecidixIcon name="arrow_up_right" size={16} color="currentColor" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'نسبة الحل والمعالجة' : 'Resolution Rate'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">
              {summary.resolved_rate.value}%
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
              {isRTL ? 'مغلق ومحقق' : 'Verified'}
            </span>
          </div>
        </div>

        {/* Total Ingested Reports */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue mb-3">
            <DecidixIcon name="search" size={16} color="var(--color-blue)" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'إجمالي البلاغات المقيدة' : 'Registered Reports'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">{items.length}</span>
            <span className="text-[11px] font-bold text-blue bg-blue-50 px-2.5 py-0.5 rounded-full">
              {isRTL ? 'سجلات فعلية' : 'Canonical store'}
            </span>
          </div>
        </div>

        {/* Under Review or Escalated */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 mb-3">
            <DecidixIcon name="arrow_down_right" size={16} color="currentColor" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'قيد المتابعة والتدخل' : 'Pending Action'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">
              {items.filter((i) => i.status !== 'resolved').length}
            </span>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60">
              {isRTL ? 'تتطلب معالجة' : 'Action pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Recent Citizen Reports Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-bold text-navy">
              {isRTL ? 'سجل بلاغات ومشاركات المواطنين' : 'Citizen Reports Register'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isRTL
                ? 'مشاركات معتمدة ومقترنة بعدد التأييدات والمنطقة الجغرافية'
                : 'Verified submissions with community support and location metadata'}
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold overflow-x-auto max-w-full">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-md whitespace-nowrap transition-all duration-150 ${
                  selectedCategory === cat.id
                    ? 'bg-white text-navy shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-navy'
                }`}
              >
                {isRTL ? cat.labelAr : cat.labelEn}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            {isRTL ? 'جاري تحميل البلاغات...' : 'Loading citizen reports...'}
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            {isRTL ? 'لا توجد بلاغات مسجلة في هذا التصنيف.' : 'No reports found in this category.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((r) => {
              const badge = getStatusBadge(r.status);
              const formattedDate = new Date(r.created_at).toLocaleDateString(
                isRTL ? 'ar-EG' : 'en-US',
                { month: 'short', day: 'numeric', year: 'numeric' }
              );
              return (
                <div
                  key={r.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 px-3 rounded-xl transition-colors duration-150"
                >
                  <div className="flex-1">
                    <div className="text-sm font-bold text-navy">
                      {isRTL ? r.arabic_title || r.title : r.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-blue bg-blue-50 px-2 py-0.5 rounded text-[11px] uppercase">
                        {r.category}
                      </span>
                      <span>·</span>
                      <span className="font-semibold text-navy">
                        {isRTL ? r.region.arabic_name : r.region.name}
                      </span>
                      <span>·</span>
                      <span className="tabular-nums">{formattedDate}</span>
                      <span>·</span>
                      <span className="font-bold text-navy tabular-nums">
                        {r.likes} {isRTL ? 'تأييد مجتمعي' : 'upvotes'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleToggleLike(r.id)}
                      className={`h-8 px-3 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
                        r.liked_by_me
                          ? 'bg-blue text-white border-blue'
                          : 'bg-slate-50 text-navy border-slate-200 hover:bg-blue-50 hover:text-blue'
                      }`}
                    >
                      <DecidixIcon name="trend_up" size={13} color="currentColor" />
                      <span className="tabular-nums">{r.likes}</span>
                    </button>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full text-center ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
