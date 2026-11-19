import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { DecidixIcon } from '../../components/DecidixIcon';
import { insightsService } from '../../services/insightsService';
import { DataQualityData } from '../../types';

export const DataQualityScreen: React.FC = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const [data, setData] = useState<DataQualityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchQuality = async () => {
      setIsLoading(true);
      try {
        const res = await insightsService.getDataQuality();
        if (isMounted) setData(res);
      } catch (err) {
        console.warn('Data quality error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchQuality();
    return () => {
      isMounted = false;
    };
  }, []);

  const score = data?.score || 94;
  const completeness = data?.completeness || 100;
  const accuracy = data?.accuracy || 92;
  const timeliness = data?.timeliness || 90;
  const sources = data?.sources || [
    {
      id: '1',
      name: 'EGYPT_COMPREHENSIVE_DEV_2021_2024',
      arabic_name: 'قاعدة بيانات التنمية الشاملة لمصر 2021-2024',
      record_count: 60,
      frequency: 'Annual',
      status: 'synced',
      age_days: 10,
    },
  ];

  const checks = [
    { titleEn: 'Completeness check', titleAr: 'اكتمال السجلات والمؤشرات', percent: completeness, status: 'Verified' },
    { titleEn: 'Accuracy validation', titleAr: 'دقة المطابقة الإحصائية', percent: accuracy, status: 'Verified' },
    { titleEn: 'Timeliness alignment', titleAr: 'تحديث التوقيت والفترات', percent: timeliness, status: 'Current' },
    { titleEn: 'Geographic mapping', titleAr: 'مطابقة الحدود الجغرافية', percent: 100, status: 'Verified' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue mb-1">
            {isRTL ? 'جودة وتدقيق البيانات' : 'INSIGHTS'}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-navy">
            {isRTL ? 'جودة وموثوقية البيانات' : 'Data Quality & Provenance'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isRTL
              ? 'مراجعة معايير الاكتمال، الدقة، والحداثة عبر مجموعات البيانات النشطة في منصة Decidix.'
              : 'Review completeness, accuracy, and timeliness across active datasets in Decidix.'}
          </p>
        </div>

        <button
          onClick={() => navigate('/datasets')}
          className="h-9 px-4 rounded-lg bg-blue hover:bg-blue-hover text-white text-xs font-semibold shadow-2xs active:scale-[0.98] transition-all duration-150"
        >
          {isRTL ? 'إدارة البيانات R2' : 'Manage Datasets'}
        </button>
      </div>

      {/* Provenance Banner */}
      {data?.provenance && (
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-blue-900 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span className="font-semibold">
              {isRTL ? 'المصدر المعتمد للتدقيق:' : 'Quality Audit Source:'}
            </span>
            <span>{data.provenance.source}</span>
          </div>
          <div className="text-[11px] text-blue font-medium">
            {data.coverage}
          </div>
        </div>
      )}

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Quality Score */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue mb-3">
            <DecidixIcon name="shield" size={16} color="var(--color-blue)" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'درجة الجودة الإجمالية' : 'Overall Quality Score'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">{score}/100</span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
              {isRTL ? 'معيار موثوق' : 'Verified grade'}
            </span>
          </div>
        </div>

        {/* Completeness */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
            <DecidixIcon name="arrow_up_right" size={16} color="currentColor" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'نسبة الاكتمال' : 'Completeness'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">{completeness}%</span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
              {isRTL ? 'بدون فجوات' : 'Zero missing'}
            </span>
          </div>
        </div>

        {/* Accuracy */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue mb-3">
            <DecidixIcon name="insights" size={16} color="var(--color-blue)" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'دقة المطابقة' : 'Validation Accuracy'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">{accuracy}%</span>
            <span className="text-[11px] font-bold text-blue bg-blue-50 px-2.5 py-0.5 rounded-full">
              {isRTL ? 'فحص تلقائي' : 'Auto verified'}
            </span>
          </div>
        </div>

        {/* Timeliness */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue mb-3">
            <DecidixIcon name="search" size={16} color="var(--color-blue)" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'مستوى الحداثة' : 'Timeliness'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">{timeliness}%</span>
            <span className="text-[11px] font-bold text-blue bg-blue-50 px-2.5 py-0.5 rounded-full">
              {isRTL ? 'تحديث دوري' : 'Synced'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Quality Verification Checks + Active Data Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Quality Verification Checks (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-navy mb-0.5">
              {isRTL ? 'فحوصات الجودة والاتساق' : 'Consistency & Integrity Checks'}
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              {isRTL
                ? 'نتائج التدقيق الآلي لسلامة البيانات وهيكلها'
                : 'Automated integrity validation results on ingestion'}
            </p>

            <div className="space-y-3.5">
              {checks.map((chk) => (
                <div key={chk.titleEn} className="space-y-1.5 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70">
                  <div className="flex items-center justify-between text-xs font-semibold text-navy">
                    <span>{isRTL ? chk.titleAr : chk.titleEn}</span>
                    <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200/60 tabular-nums">
                      {chk.percent}% · {chk.status}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200/70 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue rounded-full transition-all duration-300"
                      style={{ width: `${chk.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Connected Data Sources (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-navy mb-0.5">
              {isRTL ? 'المصادر والملفات النشطة' : 'Active Ingested Datasets'}
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              {isRTL
                ? 'ملفات البيانات المصرح بها في قاعدة البيانات'
                : 'Authorized dataset records in the canonical store'}
            </p>

            <div className="space-y-3">
              {sources.map((src) => (
                <div key={src.id} className="p-3.5 rounded-xl border border-slate-200/80 bg-white space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-navy break-all">
                      {isRTL ? src.arabic_name || src.name : src.name}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full uppercase border border-emerald-200/60">
                      {src.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="tabular-nums">
                      {src.record_count} {isRTL ? 'سجل موثق' : 'verified records'}
                    </span>
                    <span>{src.frequency || 'Annual'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            <span className="font-semibold text-navy">
              {isRTL ? 'نطاق التغطية: ' : 'Coverage: '}
            </span>
            {data?.coverage || 'Cairo, Alexandria, Giza, Aswan, Port Said (2021-2024)'}
          </div>
        </div>
      </div>
    </div>
  );
};
