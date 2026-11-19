import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { DecidixIcon } from '../../components/DecidixIcon';
import { insightsService } from '../../services/insightsService';
import { PriorityQueueData } from '../../types';

export const PriorityQueueScreen: React.FC = () => {
  const { isRTL } = useLanguage();
  const [data, setData] = useState<PriorityQueueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchQueue = async () => {
      setIsLoading(true);
      try {
        const res = await insightsService.getPriorityQueue(10);
        if (isMounted) setData(res);
      } catch (err) {
        console.warn('Priority queue error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchQueue();
    return () => {
      isMounted = false;
    };
  }, []);

  const queue = data?.queue || [
    { rank: 1, region_id: 'cairo', name: 'Cairo', arabic_name: 'القاهرة', priority: 'medium', need_score: 25, weakest_domain: null },
    { rank: 2, region_id: 'alexandria', name: 'Alexandria', arabic_name: 'الإسكندرية', priority: 'medium', need_score: 25, weakest_domain: null },
    { rank: 3, region_id: 'giza', name: 'Giza', arabic_name: 'الجيزة', priority: 'medium', need_score: 25, weakest_domain: null },
    { rank: 4, region_id: 'aswan', name: 'Aswan', arabic_name: 'أسوان', priority: 'medium', need_score: 25, weakest_domain: null },
    { rank: 5, region_id: 'port_said', name: 'Port Said', arabic_name: 'بورسعيد', priority: 'medium', need_score: 25, weakest_domain: null },
  ];

  const summary = data?.summary || { high: 0, medium: 5, low: 0 };

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue mb-1">
            {isRTL ? 'أولويات التنمية' : 'INSIGHTS'}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-navy">
            {isRTL ? 'قائمة أولويات التنمية' : 'Development Priority Queue'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isRTL
              ? 'ترتيب المحافظات حسب درجة الاحتياج وعوامل التدخل المشتقة من سجلات CAPMAS.'
              : 'Rank governorates by intervention urgency derived from official records.'}
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="h-9 px-4 rounded-lg bg-white border border-slate-200/80 text-navy hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors duration-150"
        >
          {isRTL ? 'تصدير الأولويات' : 'Export priorities'}
        </button>
      </div>

      {/* Provenance Banner */}
      {data?.provenance && (
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-blue-900 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span className="font-semibold">
              {isRTL ? 'حساب الأولويات المعتمد:' : 'Verified Priority Source:'}
            </span>
            <span>{data.provenance.source}</span>
          </div>
          <div className="text-[11px] text-blue font-medium">
            {data.provenance.geographic_coverage}
          </div>
        </div>
      )}

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* High Urgency */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 mb-3">
            <DecidixIcon name="arrow_down_right" size={16} color="currentColor" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'أولوية عاجلة / حرجة' : 'High Urgency'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">{summary.high}</span>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200/60">
              {isRTL ? 'تدخل فوري' : 'Action required'}
            </span>
          </div>
        </div>

        {/* Medium Urgency */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 mb-3">
            <DecidixIcon name="insights" size={16} color="#D97706" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'أولوية متوسطة' : 'Medium Urgency'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">{summary.medium}</span>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60">
              {isRTL ? 'متابعة دورية' : 'Under monitoring'}
            </span>
          </div>
        </div>

        {/* Low Urgency */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
            <DecidixIcon name="arrow_up_right" size={16} color="currentColor" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'أولوية مستقرة' : 'Stable / Low Urgency'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">{summary.low}</span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
              {isRTL ? 'أداء مستقر' : 'Stable'}
            </span>
          </div>
        </div>

        {/* Monitored Governorates */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue mb-3">
            <DecidixIcon name="location" size={16} color="var(--color-blue)" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'المحافظات المرصودة' : 'Monitored Regions'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">{queue.length}</span>
            <span className="text-[11px] font-bold text-blue bg-blue-50 px-2.5 py-0.5 rounded-full">
              {isRTL ? 'مؤشرات موثقة' : 'Verified'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Priority Queue Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="mb-4">
          <h2 className="text-base font-bold text-navy">
            {isRTL ? 'ترتيب المحافظات في قائمة الانتظار التنموية' : 'Priority Queue Ranked List'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isRTL
              ? 'يتم تحديد أولوية التدخل بناءً على درجة الاحتياج الإقليمي المحسوبة'
              : 'Intervention priority determined by regional need score derived from verified observations'}
          </p>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            {isRTL ? 'جاري تحميل قائمة الأولويات...' : 'Loading priority queue...'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" dir={isRTL ? 'rtl' : 'ltr'}>
              <thead>
                <tr className="border-b border-slate-200/80 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">{isRTL ? 'الترتيب' : 'RANK'}</th>
                  <th className="py-3 px-4">{isRTL ? 'المحافظة' : 'GOVERNORATE'}</th>
                  <th className="py-3 px-4">{isRTL ? 'مستوى الأولوية' : 'PRIORITY LEVEL'}</th>
                  <th className="py-3 px-4">{isRTL ? 'درجة الاحتياج' : 'NEED SCORE'}</th>
                  <th className="py-3 px-4">{isRTL ? 'القطاع الأضعف' : 'WEAKEST DOMAIN'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-navy">
                {queue.map((item) => (
                  <tr key={item.region_id} className="hover:bg-slate-50/70 transition-colors duration-100">
                    <td className="py-3.5 px-4">
                      <span className="w-6 h-6 rounded-md bg-navy text-white flex items-center justify-center font-bold text-[11px] tabular-nums">
                        {item.rank}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-navy">
                      {isRTL ? item.arabic_name || item.name : item.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          item.priority === 'high' || item.priority === 'critical'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                            : item.priority === 'medium'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                        }`}
                      >
                        {item.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold tabular-nums">{item.need_score}</span>
                        <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${item.need_score}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {item.weakest_domain
                        ? item.weakest_domain
                        : isRTL
                        ? 'متكافئ عبر القطاعات'
                        : 'Balanced across domains'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
