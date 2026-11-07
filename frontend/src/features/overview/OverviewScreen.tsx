import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { overviewService } from '../../services/overviewService';
import { OverviewData, Range } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { MetricCard } from '../../components/MetricCard';
import { PriorityBadge } from '../../components/PriorityBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { DecidixIcon } from '../../components/DecidixIcon';
import { useLanguage } from '../../context/LanguageContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const OverviewScreen: React.FC = () => {
  const { isRTL, t } = useLanguage();
  const [range, setRange] = useState<Range>('5Y');
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchOverview = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await overviewService.getOverview(range);
        if (isMounted) setData(result);
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'Failed to load dashboard overview');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchOverview();
    return () => {
      isMounted = false;
    };
  }, [range]);

  if (isLoading && !data) {
    return <LoadingSpinner message={isRTL ? 'جارٍ تحميل لوحة المتابعة الإقليمية...' : 'Loading regional overview metrics...'} />;
  }

  if (error && !data) {
    return (
      <div className="p-6 rounded-card bg-rose-50 border border-rose-200 text-danger">
        <h3 className="font-bold text-lg mb-2">{isRTL ? 'خطأ في الاتصال بالبيانات' : 'Connection Error'}</h3>
        <p>{error}</p>
        <button
          onClick={() => setRange(range)}
          className="decidix-btn-primary mt-4"
        >
          {isRTL ? 'إعادة المحاولة' : 'Retry'}
        </button>
      </div>
    );
  }

  const chartData = data?.trend?.points?.map((p) => ({
    year: p.year,
    index: p.value,
  })) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header & Range Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <TwoToneHeading
            first={isRTL ? 'المؤشر' : 'Regional'}
            second={isRTL ? 'الإقليمي' : 'Overview'}
            level={1}
            className="text-3xl font-extrabold"
          />
          <p className="text-sm text-faded-ink mt-1">
            {isRTL
              ? 'متابعة شاملة للأداء التنموي، المؤشرات الوطنية، وأولويات التدخل'
              : 'Holistic performance tracking across Egyptian regions & development domains'}
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1 p-1 bg-white border border-line rounded-pill shadow-sm self-start">
          {(['3Y', '5Y', '7Y'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-1.5 text-xs font-bold rounded-pill transition-all ${
                range === r
                  ? 'bg-blue text-white shadow-sm'
                  : 'text-ink hover:text-navy hover:bg-well'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Hero Card: National Index Score & Trend */}
      {data?.index && (
        <div className="decidix-card p-6 md:p-8 bg-gradient-to-br from-white via-white to-well">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            {/* Score & Band */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-faded-ink">
                  {isRTL ? 'المؤشر الوطني الموحد' : 'National Composite Index'}
                </span>
                <span className="decidix-pill-badge bg-blue/10 text-blue font-bold">
                  {data.index.year || 2025}
                </span>
              </div>

              <div className="flex items-baseline gap-4">
                <span className="text-5xl md:text-6xl font-black text-navy tracking-tight">
                  {(data.index.current ?? (data.index as any).score ?? 0).toFixed(1)}
                </span>
                <span className="text-sm font-semibold text-faded-ink">/ 100</span>

                <div
                  className={`inline-flex items-center gap-1 text-sm font-bold px-2.5 py-1 rounded-pill ${
                    data.index.change >= 0
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  <DecidixIcon
                    name={data.index.change >= 0 ? 'trend_up' : 'trend_down'}
                    size={14}
                    color={data.index.change >= 0 ? '#059669' : '#DC2626'}
                  />
                  <span>
                    {data.index.change >= 0 ? '+' : ''}
                    {data.index.change.toFixed(1)} pts
                  </span>
                </div>
              </div>

              <div className="text-sm text-ink capitalize">
                {isRTL ? 'مستوى الأداء التنموي: ' : 'Performance Band: '}
                <strong className="text-navy">{data.index.band.replace('_', ' ')}</strong>
              </div>
            </div>

            {/* Historical Area Chart */}
            <div className="lg:col-span-2 h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="indexGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="year" stroke="#7D8AA0" fontSize={11} tickLine={false} />
                  <YAxis stroke="#7D8AA0" fontSize={11} domain={['dataMin - 5', 'dataMax + 5']} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#061A3A',
                      color: '#FFFFFF',
                      borderRadius: '12px',
                      border: 'none',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="index"
                    stroke="#2563EB"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#indexGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Key Indicators Grid */}
      {(() => {
        const indicators = data?.key_indicators || (data as any)?.kpis || [];
        if (indicators.length === 0) return null;
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">
                {isRTL ? 'المؤشرات القطاعية الأساسية' : 'Key Core Indicators'}
              </h2>
              <Link to="/insights" className="text-xs font-semibold text-blue hover:underline">
                {isRTL ? 'عرض تفاصيل القطاعات ←' : 'View all sector details →'}
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {indicators.map((indicator: any) => (
                <MetricCard
                  key={indicator.key}
                  metric={indicator}
                  isArabic={isRTL}
                />
              ))}
            </div>
          </div>
        );
      })()}

      {/* Dual Panel: Needs Attention & Top Improvers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Needs Attention */}
        <div className="decidix-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <h3 className="font-bold text-navy text-base">
                  {isRTL ? 'مناطق تتطلب تدخلاً عاجلاً' : 'Regions Needing Priority Attention'}
                </h3>
              </div>
              <Link
                to="/regions?priority=high"
                className="text-xs font-semibold text-blue hover:underline"
              >
                {isRTL ? 'دليل المناطق' : 'See all'}
              </Link>
            </div>

            <div className="space-y-3">
              {data?.needs_attention?.map((r) => (
                <Link
                  key={r.region_id}
                  to={`/regions/${r.region_id}`}
                  className="flex items-center justify-between p-3.5 rounded-well bg-well hover:bg-line/60 transition"
                >
                  <div>
                    <div className="font-bold text-navy text-sm">{t(r, 'name')}</div>
                    <div className="text-xs text-faded-ink">
                      {isRTL ? 'درجة المؤشر: ' : 'Composite Score: '}
                      <span className="font-semibold text-navy">{r.score}</span>
                    </div>
                  </div>
                  <PriorityBadge priority={r.priority} isArabic={isRTL} />
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-line text-xs text-faded-ink">
            {isRTL
              ? 'تعتمد الأولويات على مقاييس الاحتياج التنموي ومعدلات الفقر والخدمات.'
              : 'Priority is classified by developmental deficits and baseline indicators.'}
          </div>
        </div>

        {/* Top Improvers */}
        <div className="decidix-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <h3 className="font-bold text-navy text-base">
                  {isRTL ? 'المناطق الأكثر تحسناً' : 'Top Improvers'}
                </h3>
              </div>
              <span className="text-xs font-semibold text-faded-ink">
                {isRTL ? 'خلال الفترة المحددة' : 'Annual Progress'}
              </span>
            </div>

            <div className="space-y-3">
              {data?.top_improvers?.map((r) => (
                <Link
                  key={r.region_id}
                  to={`/regions/${r.region_id}`}
                  className="flex items-center justify-between p-3.5 rounded-well bg-well hover:bg-line/60 transition"
                >
                  <div>
                    <div className="font-bold text-navy text-sm">{t(r, 'name')}</div>
                    <div className="text-xs text-faded-ink">
                      {isRTL ? 'المستوى الحالي: ' : 'Current Index: '}
                      <span className="font-semibold text-navy">{r.current}</span>
                    </div>
                  </div>
                  <div className="text-xs font-bold px-2.5 py-1 rounded-pill bg-emerald-50 text-emerald-600 flex items-center gap-1">
                    <DecidixIcon name="trend_up" size={12} color="#059669" />
                    <span>+{r.delta.toFixed(1)} pts</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-line text-xs text-faded-ink">
            {isRTL
              ? 'قياس التغير السنوي الملحوظ عبر الملاحظات الإحصائية المعتمدة.'
              : 'Observed ranking based on verified historical trajectory.'}
          </div>
        </div>
      </div>
    </div>
  );
};
