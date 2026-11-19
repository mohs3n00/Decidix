import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { DecidixIcon } from '../../components/DecidixIcon';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';

export const AdminDashboardScreen: React.FC = () => {
  const { isRTL } = useLanguage();

  const activityData = [
    { name: 'Overview', nameAr: 'الرئيسية', val: 78 },
    { name: 'Insights', nameAr: 'التحليلات', val: 64 },
    { name: 'Intelligence', nameAr: 'الذكاء', val: 51 },
    { name: 'Decisions', nameAr: 'القرارات', val: 42 },
    { name: 'Datasets', nameAr: 'البيانات', val: 87 },
    { name: 'Assistant', nameAr: 'المساعد', val: 73 },
  ];

  const formatDist = [
    { format: 'CSV', count: 12, percent: 80, color: 'bg-blue' },
    { format: 'JSON', count: 6, percent: 50, color: 'bg-cyan' },
    { format: 'TSV', count: 5, percent: 40, color: 'bg-emerald-500' },
    { format: 'XLSX', count: 5, percent: 40, color: 'bg-amber-500' },
    { format: 'JSONL', count: 5, percent: 40, color: 'bg-rose-500' },
  ];

  const recentLogs = [
    { actionEn: 'Dataset uploaded', actionAr: 'رفع مجموعة بيانات', user: 'member08 · CSV', time: 'Today · 10:42' },
    { actionEn: 'User registered', actionAr: 'تسجيل مستخدم جديد', user: 'New account', time: 'Today · 09:18' },
    { actionEn: 'Dataset validation completed', actionAr: 'اكتمال تدقيق البيانات', user: 'member03 · XLSX', time: 'Yesterday' },
    { actionEn: 'Push campaign recorded', actionAr: 'إرسال إشعار فوري', user: 'Test to admin device', time: 'Yesterday' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue mb-1">
            {isRTL ? 'إدارة المنظومة' : 'ADMIN WORKSPACE'}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-navy">
            {isRTL ? 'نظرة عامة على المنصة' : 'Platform overview'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isRTL
              ? 'رؤية تشغيلية آمنة للحسابات، نشاط البيانات، وحالة توصيل المنظومة.'
              : 'A privacy-safe operational view of accounts, data activity, and delivery health.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
            UI preview · sample figures
          </span>
          <button
            onClick={() => window.print()}
            className="h-9 px-4 rounded-lg bg-white border border-slate-200/80 text-navy hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors duration-150"
          >
            {isRTL ? 'تصدير الملخص' : 'Export summary'}
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue mb-3">
            <DecidixIcon name="account" size={16} color="var(--color-blue)" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'الحسابات المسجلة' : 'Registered accounts'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">24</span>
            <span className="text-[11px] font-bold text-blue bg-blue-50 px-2.5 py-0.5 rounded-full">
              All registered
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue mb-3">
            <DecidixIcon name="search" size={16} color="var(--color-blue)" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'مجموعات البيانات' : 'Platform datasets'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">33</span>
            <span className="text-[11px] font-bold text-blue bg-blue-50 px-2.5 py-0.5 rounded-full">
              Uploaded entries
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue mb-3">
            <DecidixIcon name="search" size={16} color="var(--color-blue)" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'المساحة المستهلكة' : 'Storage consumed'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">43.3 KB</span>
            <span className="text-[11px] font-bold text-blue bg-blue-50 px-2.5 py-0.5 rounded-full">
              R2 metadata
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue mb-3">
            <DecidixIcon name="notifications" size={16} color="var(--color-blue)" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'حملات الإشعارات' : 'Push campaigns'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">1</span>
            <span className="text-[11px] font-bold text-blue bg-blue-50 px-2.5 py-0.5 rounded-full">
              Recorded
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Feature Activity + Dataset Formats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Feature Activity Bar Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="mb-4">
            <h2 className="text-base font-bold text-navy">
              {isRTL ? 'نشاط الميزات والخدمات' : 'Feature activity'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isRTL ? 'تعداد الأحداث المجمعة · تمثيل توضيحي' : 'Aggregated event counts · sample visualization'}
            </p>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5FA" />
                <XAxis dataKey={isRTL ? 'nameAr' : 'name'} stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 100]} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#061A3A',
                    color: '#FFFFFF',
                    borderRadius: '10px',
                    border: 'none',
                    fontSize: '12px',
                    padding: '8px 12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Bar dataKey="val" radius={[6, 6, 0, 0]} maxBarSize={44}>
                  {activityData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.name === 'Datasets' ? '#21EAF4' : '#2563EB'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Dataset Formats Distribution (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-navy mb-0.5">
              {isRTL ? 'صيغ البيانات' : 'Dataset formats'}
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              {isRTL ? 'التوزيع عبر البيانات المخزنة في R2' : 'Distribution from stored metadata · sample'}
            </p>

            <div className="space-y-4">
              {formatDist.map((item) => (
                <div key={item.format} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-navy">
                    <span>{item.format}</span>
                    <span className="tabular-nums font-bold">{item.count}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-300`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Card: Recent Platform Activity */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <h2 className="text-base font-bold text-navy mb-0.5">
          {isRTL ? 'أحدث الأنشطة على المنصة' : 'Recent platform activity'}
        </h2>
        <p className="text-xs text-slate-500 mb-5">
          {isRTL
            ? 'بيانات وصفية تشغيلية فقط · لا تتضمن أي صفوف خاصة من البيانات أو نصوص المحادثات'
            : 'Metadata only · no private dataset rows or AI conversation content'}
        </p>

        <div className="divide-y divide-slate-100">
          {recentLogs.map((log, idx) => (
            <div key={idx} className="py-3.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-navy">{isRTL ? log.actionAr : log.actionEn}</span>
              <span className="text-slate-600 font-medium">{log.user}</span>
              <span className="text-slate-400 tabular-nums">{log.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
