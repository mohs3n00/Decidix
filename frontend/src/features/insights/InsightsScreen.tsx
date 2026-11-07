import React, { useState, useEffect } from 'react';
import { insightsService } from '../../services/insightsService';
import { SectorInsightData, Sector } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { DecidixCard } from '../../components/DecidixCard';
import { MetricCard } from '../../components/MetricCard';
import { DecidixChip } from '../../components/DecidixChip';
import { AiInsightPanel } from '../../components/AiInsightPanel';
import { HatchedBar } from '../../components/HatchedBar';
import { ScoreRing } from '../../components/ScoreRing';
import { ProvenanceCard } from '../../components/ProvenanceCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { DecidixIcon, DecidixIconName } from '../../components/DecidixIcon';
import { useLanguage } from '../../context/LanguageContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type InsightSector = 'education' | 'healthcare' | 'economy' | 'infrastructure';

interface SectorTab {
  id: InsightSector;
  labelEn: string;
  labelAr: string;
  icon: DecidixIconName;
}

const SECTOR_TABS: SectorTab[] = [
  { id: 'education', labelEn: 'Education', labelAr: 'التعليم', icon: 'education' },
  { id: 'healthcare', labelEn: 'Healthcare', labelAr: 'الصحة والرعاية', icon: 'healthcare' },
  { id: 'economy', labelEn: 'Economy & Jobs', labelAr: 'الاقتصاد والوظائف', icon: 'economy' },
  { id: 'infrastructure', labelEn: 'Infrastructure', labelAr: 'البنية التحتية', icon: 'infrastructure' },
];

export const InsightsScreen: React.FC = () => {
  const { isRTL } = useLanguage();
  const [activeSector, setActiveSector] = useState<InsightSector>('education');
  const [data, setData] = useState<SectorInsightData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchSector = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await insightsService.getSectorInsight(activeSector);
        if (isMounted) setData(result);
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'Failed to load sector insight');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchSector();
    return () => {
      isMounted = false;
    };
  }, [activeSector]);

  const trendPoints = Array.isArray(data?.trend) ? data.trend : (data?.trend as any)?.points || [];
  const chartData = trendPoints.map((p: any) => ({
    year: p.year,
    value: p.value,
  }));

  const breakdownBars = Array.isArray(data?.breakdown)
    ? data.breakdown
    : (data?.breakdown as any)?.bars || [];

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      {/* Heading & Sector Navigation */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="type-eyebrow mb-1">
            {isRTL
              ? 'تحليل المؤشرات القطاعية والتوزيع الإقليمي'
              : 'Domain performance & sectoral allocation'}
          </div>
          <TwoToneHeading
            first={isRTL ? 'تحليلات' : 'Sector'}
            second={isRTL ? 'القطاعات' : 'Insights'}
            level={1}
            className="type-heading-page"
          />
        </div>

        {/* Sector Tabs Bar with DecidixChips */}
        <div className="flex flex-wrap items-center gap-2">
          {SECTOR_TABS.map((tab) => {
            const isActive = activeSector === tab.id;
            return (
              <DecidixChip
                key={tab.id}
                label={isRTL ? tab.labelAr : tab.labelEn}
                selected={isActive}
                icon={
                  <DecidixIcon
                    name={tab.icon}
                    size={16}
                    color={isActive ? '#FFFFFF' : 'var(--color-ink)'}
                  />
                }
                onClick={() => setActiveSector(tab.id)}
              />
            );
          })}
        </div>
      </div>

      {isLoading && !data ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner message={isRTL ? 'جارٍ استرجاع بيانات القطاع...' : 'Loading sector analytics...'} />
        </div>
      ) : error && !data ? (
        <div className="p-6 rounded-card bg-rose-50 border border-rose-200 text-danger">
          <p className="font-bold text-sm">{error}</p>
        </div>
      ) : (
        <>
          {/* AI Automated Insight Panel */}
          {data?.ai_insight && (
            <AiInsightPanel
              label={isRTL ? 'رؤية الذكاء الاصطناعي القطاعية' : 'AI Domain Synthesis'}
              body={isRTL && data.ai_insight.arabic_text ? data.ai_insight.arabic_text : data.ai_insight.text}
              confidence={data.ai_insight.confidence}
            />
          )}

          {/* Sector Core KPIs */}
          {data?.kpis && data.kpis.length > 0 && (
            <div className="space-y-3">
              <h2 className="type-heading-section text-navy">
                {isRTL ? 'المؤشرات القطاعية الأساسية' : 'Core Domain KPIs'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.kpis.map((kpi) => (
                  <MetricCard
                    key={kpi.key}
                    metric={kpi}
                    isArabic={isRTL}
                    icon={activeSector as DecidixIconName}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Trajectory & Structural Breakdown Dual Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Historical Trend Chart */}
            <DecidixCard variant="card" className="lg:col-span-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="type-heading-section text-navy">
                    {isRTL ? 'المسار التاريخي للقطاع' : 'Historical Trajectory'}
                  </h3>
                  <span className="text-xs text-faded-ink">
                    {data?.index ? `Current: ${Number(data.index).toFixed(1)}/100` : ''}
                  </span>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="sectorGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-blue)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--color-blue)" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="year" stroke="#7D8AA0" fontSize={11} tickLine={false} axisLine={{ stroke: '#E3E9F2' }} />
                      <YAxis stroke="#7D8AA0" fontSize={11} tickLine={false} axisLine={{ stroke: '#E3E9F2' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-navy)',
                          color: '#FFFFFF',
                          borderRadius: '16px',
                          border: 'none',
                          fontSize: '12px',
                          padding: '8px 14px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="var(--color-blue)"
                        strokeWidth={2.8}
                        fillOpacity={1}
                        fill="url(#sectorGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="pt-3 border-t border-hairline text-xs text-faded-ink">
                {isRTL ? 'مؤشرات الأداء المقاسة سنوياً.' : 'Observed and verified longitudinal measurements.'}
              </div>
            </DecidixCard>

            {/* Structural Breakdown with Hatched Bars */}
            <DecidixCard variant="card" className="lg:col-span-5 flex flex-col justify-between">
              <div>
                <h3 className="type-heading-section text-navy mb-4">
                  {isRTL ? 'التوزيع الهيكلي والمؤشرات الفرعية' : 'Structural Breakdown'}
                </h3>

                <div className="space-y-4">
                  {breakdownBars.length === 0 ? (
                    <div className="py-8 text-center text-xs text-faded-ink">
                      {isRTL ? 'لا توجد بيانات تفصيلية إضافية' : 'Standard weighted indicators evenly distributed across regions.'}
                    </div>
                  ) : (
                    breakdownBars.map((b: any, i: number) => {
                      const pct = Math.min(100, Math.max(0, b.percentage ?? b.value ?? 50));
                      return (
                        <div key={i} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-navy">
                              {isRTL && b.arabic_category ? b.arabic_category : (b.category || b.name || b.label || `Indicator ${i + 1}`)}
                            </span>
                            <span className="font-bold text-blue">{pct.toFixed(0)}%</span>
                          </div>
                          <HatchedBar percentage={pct} height={8} />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-hairline text-xs text-faded-ink">
                {isRTL
                  ? 'مبني على تصنيف المؤشرات الفرعية للقطاع المختار.'
                  : 'Proportional distribution across sector sub-indices.'}
              </div>
            </DecidixCard>
          </div>

          {/* Regional Ranking Tables */}
          {data?.ranking && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Performing Regions */}
              <DecidixCard variant="card">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-success"></span>
                  <h3 className="type-heading-section text-navy">
                    {isRTL ? 'أعلى المناطق أداءً في القطاع' : 'Top Performing Regions'}
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {data.ranking.top.map((r, idx) => (
                    <div
                      key={r.region_id || idx}
                      className="flex items-center justify-between p-3 rounded-row bg-well border border-hairline"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-white border border-hairline flex items-center justify-center font-bold text-xs text-navy">
                          #{r.rank}
                        </span>
                        <span className="font-bold text-navy text-sm">
                          {isRTL && r.arabic_name ? r.arabic_name : r.name}
                        </span>
                      </div>
                      <ScoreRing score={r.score} size={38} strokeWidth={3.5} />
                    </div>
                  ))}
                </div>
              </DecidixCard>

              {/* Regions with Deficits */}
              <DecidixCard variant="card">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-danger"></span>
                  <h3 className="type-heading-section text-navy">
                    {isRTL ? 'مناطق تتطلب دعماً استثمارياً' : 'Regions Requiring Intervention'}
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {data.ranking.bottom.map((r, idx) => (
                    <div
                      key={r.region_id || idx}
                      className="flex items-center justify-between p-3 rounded-row bg-well border border-hairline"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-white border border-hairline flex items-center justify-center font-bold text-xs text-danger">
                          #{r.rank}
                        </span>
                        <span className="font-bold text-navy text-sm">
                          {isRTL && r.arabic_name ? r.arabic_name : r.name}
                        </span>
                      </div>
                      <ScoreRing score={r.score} size={38} strokeWidth={3.5} />
                    </div>
                  ))}
                </div>
              </DecidixCard>
            </div>
          )}

          {/* Canonical Provenance Card */}
          <ProvenanceCard provenance={data?.provenance} />
        </>
      )}
    </div>
  );
};
