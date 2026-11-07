import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { overviewService } from '../../services/overviewService';
import { OverviewData, Range } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { HeroCard } from '../../components/HeroCard';
import { DecidixCard } from '../../components/DecidixCard';
import { MetricCard } from '../../components/MetricCard';
import { PriorityBadge } from '../../components/PriorityBadge';
import { TrendIndicator } from '../../components/TrendIndicator';
import { DecidixChip } from '../../components/DecidixChip';
import { StatWell } from '../../components/StatWell';
import { ScoreRing } from '../../components/ScoreRing';
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
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner message={isRTL ? 'جارٍ تحميل لوحة المتابعة الإقليمية...' : 'Loading regional overview metrics...'} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 rounded-card bg-rose-50 border border-rose-200 text-danger">
        <h3 className="font-bold text-base mb-1">{isRTL ? 'خطأ في الاتصال بالبيانات' : 'Connection Error'}</h3>
        <p className="text-sm">{error}</p>
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

  const rawScore = data?.index?.current ?? (data?.index as any)?.score ?? 0;
  const scoreNum = Number(rawScore) || 0;

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      {/* Top Header & Range Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="type-eyebrow mb-1">
            {isRTL
              ? 'المؤشرات الوطنية والتوازن الإقليمي'
              : 'National performance & regional equilibrium'}
          </div>
          <TwoToneHeading
            first={isRTL ? 'المؤشر' : 'National'}
            second={isRTL ? 'الإقليمي' : 'Overview'}
            level={1}
            className="type-heading-page"
          />
        </div>

        {/* Range Selector with DecidixChips */}
        <div className="flex items-center gap-2">
          {(['3Y', '5Y', '7Y'] as Range[]).map((r) => (
            <DecidixChip
              key={r}
              label={r}
              selected={range === r}
              onClick={() => setRange(r)}
            />
          ))}
        </div>
      </div>

      {/* Signature Hero Card: National Index Score & Trend */}
      {data?.index && (
        <HeroCard>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Score & Key Regional Aggregates */}
            <div className="lg:col-span-5 space-y-5">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold text-ink">
                  {isRTL ? 'المؤشر الوطني المركب' : 'National Composite Index'}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-pill bg-white/90 border border-white text-blue shadow-sm">
                  {data.index.year || 2025}
                </span>
              </div>

              <div className="flex items-center gap-5">
                <ScoreRing
                  score={scoreNum}
                  size={68}
                  strokeWidth={6}
                />

                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="type-heading-page font-bold text-navy">
                      {scoreNum.toFixed(1)}
                    </span>
                    <span className="text-xs font-semibold text-faded-ink">/ 100</span>
                  </div>

                  <div className="mt-1 flex items-center gap-2">
                    <TrendIndicator value={data.index.change || 0} />
                    <span className="text-xs text-ink">
                      {isRTL ? 'مستوى الأداء: ' : 'Performance: '}
                      <strong className="text-navy capitalize">
                        {data.index.band?.replace('_', ' ') || 'Moderate'}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* 3 Quick Stat Wells */}
              <div className="grid grid-cols-3 gap-2.5 pt-2">
                <StatWell
                  value={data.index.regions_count || 5}
                  label={isRTL ? 'المناطق' : 'Regions'}
                />
                <StatWell
                  value={data.index.population ? `${(data.index.population / 1_000_000).toFixed(1)}M` : '39.6M'}
                  label={isRTL ? 'السكان' : 'Population'}
                />
                <StatWell
                  value={data.index.at_risk_count ?? 0}
                  label={isRTL ? 'مناطق ذات أولوية' : 'Priority Sites'}
                />
              </div>
            </div>

            {/* Historical Area Trajectory Chart */}
            <div className="lg:col-span-7 h-52 w-full pt-2">
              <div className="text-xs font-semibold text-faded-ink mb-2 flex items-center justify-between">
                <span>{isRTL ? 'مسار المؤشر التنموي الموحد' : 'Composite Trajectory'}</span>
                <span className="text-[11px] text-ink">{range} Range</span>
              </div>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="heroAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-blue)" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="var(--color-blue)" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="year"
                      stroke="#7D8AA0"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#E3E9F2' }}
                    />
                    <YAxis
                      stroke="#7D8AA0"
                      fontSize={11}
                      domain={['dataMin - 5', 'dataMax + 5']}
                      tickLine={false}
                      axisLine={{ stroke: '#E3E9F2' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-navy)',
                        color: '#FFFFFF',
                        borderRadius: '16px',
                        border: 'none',
                        boxShadow: 'var(--shadow-card)',
                        fontSize: '12px',
                        padding: '8px 14px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="index"
                      stroke="var(--color-blue)"
                      strokeWidth={2.8}
                      fillOpacity={1}
                      fill="url(#heroAreaGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </HeroCard>
      )}

      {/* Key Indicators Grid */}
      {(() => {
        const indicators = data?.key_indicators || (data as any)?.kpis || [];
        if (indicators.length === 0) return null;
        return (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="type-heading-section text-navy">
                {isRTL ? 'المؤشرات القطاعية الأساسية' : 'Core Sector Indicators'}
              </h2>
              <Link
                to="/insights"
                className="text-xs font-semibold text-blue hover:underline flex items-center gap-1"
              >
                <span>{isRTL ? 'استعراض كل القطاعات' : 'View all sector details'}</span>
                <span>→</span>
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
        <DecidixCard variant="card" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-danger"></span>
                <h3 className="type-heading-section text-navy">
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

            <div className="space-y-2.5">
              {data?.needs_attention?.map((r) => (
                <Link
                  key={r.region_id}
                  to={`/regions/${r.region_id}`}
                  className="flex items-center justify-between p-3.5 rounded-row bg-well hover:bg-hairline transition border border-hairline"
                >
                  <div>
                    <div className="font-bold text-navy text-sm">{t(r, 'name')}</div>
                    <div className="text-xs text-faded-ink mt-0.5">
                      {isRTL ? 'درجة المؤشر: ' : 'Composite Score: '}
                      <span className="font-bold text-navy">{r.score}</span>
                    </div>
                  </div>
                  <PriorityBadge priority={r.priority} isArabic={isRTL} />
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-hairline text-xs text-faded-ink">
            {isRTL
              ? 'تعتمد الأولويات على مقاييس الاحتياج التنموي ومعدلات الفقر والخدمات.'
              : 'Priority is classified by developmental deficits and baseline indicators.'}
          </div>
        </DecidixCard>

        {/* Top Improvers */}
        <DecidixCard variant="card" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-success"></span>
                <h3 className="type-heading-section text-navy">
                  {isRTL ? 'المناطق الأكثر تحسناً' : 'Top Improvers'}
                </h3>
              </div>
              <span className="text-xs font-medium text-faded-ink">
                {isRTL ? 'خلال الفترة المحددة' : 'Annual Progress'}
              </span>
            </div>

            <div className="space-y-2.5">
              {data?.top_improvers?.map((r) => (
                <Link
                  key={r.region_id}
                  to={`/regions/${r.region_id}`}
                  className="flex items-center justify-between p-3.5 rounded-row bg-well hover:bg-hairline transition border border-hairline"
                >
                  <div>
                    <div className="font-bold text-navy text-sm">{t(r, 'name')}</div>
                    <div className="text-xs text-faded-ink mt-0.5">
                      {isRTL ? 'المستوى الحالي: ' : 'Current Index: '}
                      <span className="font-bold text-navy">{r.current}</span>
                    </div>
                  </div>
                  <TrendIndicator value={r.delta} size="sm" />
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-hairline text-xs text-faded-ink">
            {isRTL
              ? 'قياس التغير السنوي الملحوظ عبر الملاحظات الإحصائية المعتمدة.'
              : 'Observed ranking based on verified historical trajectory.'}
          </div>
        </DecidixCard>
      </div>
    </div>
  );
};
