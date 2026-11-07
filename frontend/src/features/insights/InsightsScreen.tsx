import React, { useState, useEffect } from 'react';
import { insightsService } from '../../services/insightsService';
import { SectorInsightData, Sector } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { MetricCard } from '../../components/MetricCard';
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
  { id: 'economy', labelEn: 'Economy & Jobs', labelAr: 'الاقتصاد وفرص العمل', icon: 'economy' },
  { id: 'infrastructure', labelEn: 'Infrastructure', labelAr: 'البنية التحتية', icon: 'infrastructure' },
];

export const InsightsScreen: React.FC = () => {
  const { isRTL, t } = useLanguage();
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

  const chartData = data?.trend?.map((p) => ({
    year: p.year,
    value: p.value,
  })) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Heading & Sector Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <TwoToneHeading
            first={isRTL ? 'تحليلات' : 'Sector'}
            second={isRTL ? 'القطاعات' : 'Insights'}
            level={1}
            className="text-3xl font-extrabold"
          />
          <p className="text-sm text-faded-ink mt-1">
            {isRTL
              ? 'دراسة متعمقة للمؤشرات القطاعية، التوزيع الإقليمي، وتحليلات الذكاء الاصطناعي'
              : 'Deep-dive domain analytics, breakdowns, and automated intelligence summaries'}
          </p>
        </div>

        {/* Sector Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white border border-line rounded-card shadow-sm">
          {SECTOR_TABS.map((tab) => {
            const isActive = activeSector === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSector(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-pill transition-all ${
                  isActive
                    ? 'bg-blue text-white shadow-sm'
                    : 'text-ink hover:text-navy hover:bg-well'
                }`}
              >
                <DecidixIcon
                  name={tab.icon}
                  size={16}
                  color={isActive ? '#FFFFFF' : 'currentColor'}
                />
                <span>{isRTL ? tab.labelAr : tab.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {isLoading && !data ? (
        <LoadingSpinner message={isRTL ? 'جارٍ استرجاع بيانات القطاع...' : 'Loading sector analytics...'} />
      ) : error && !data ? (
        <div className="p-6 rounded-card bg-rose-50 border border-rose-200 text-danger">
          <p>{error}</p>
        </div>
      ) : (
        <>
          {/* AI Automated Insight Banner */}
          {data?.ai_insight && (
            <div className="decidix-card p-6 bg-gradient-to-r from-blue/5 via-cyan/5 to-white border-blue/20 relative overflow-hidden">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue text-white flex items-center justify-center shrink-0 shadow-md">
                  <DecidixIcon name="spark" size={20} color="#FFFFFF" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-navy text-sm">
                      {isRTL ? 'رؤية الذكاء الاصطناعي التحليلية' : 'AI Generated Domain Synthesis'}
                    </h3>
                    <span className="decidix-pill-badge bg-blue/10 text-blue">
                      {data.ai_insight.confidence}% {isRTL ? 'ثقة' : 'Confidence'}
                    </span>
                  </div>
                  <p className="text-sm text-ink leading-relaxed">
                    {isRTL && data.ai_insight.arabic_text ? data.ai_insight.arabic_text : data.ai_insight.text}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sector Core KPIs */}
          {data?.kpis && data.kpis.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.kpis.map((kpi) => (
                <MetricCard key={kpi.key} metric={kpi} isArabic={isRTL} />
              ))}
            </div>
          )}

          {/* Trend Chart & Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trend Chart */}
            <div className="lg:col-span-2 decidix-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-navy text-base">
                  {isRTL ? 'المسار الزمني للأداء القطاعي' : 'Longitudinal Sector Trajectory'}
                </h3>
                <span className="text-xs font-semibold text-faded-ink">
                  {isRTL ? 'نقاط المؤشر' : 'Index Points'}
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sectorGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="year" stroke="#7D8AA0" fontSize={11} tickLine={false} />
                    <YAxis stroke="#7D8AA0" fontSize={11} tickLine={false} />
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
                      dataKey="value"
                      stroke="#2563EB"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#sectorGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Breakdown Distribution */}
            <div className="decidix-card p-6 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-navy text-base mb-4">
                  {isRTL ? 'التوزيع الهيكلي' : 'Structural Breakdown'}
                </h3>

                <div className="space-y-4">
                  {data?.breakdown?.map((b, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-navy">
                          {isRTL && b.arabic_category ? b.arabic_category : b.category}
                        </span>
                        <span className="text-blue">{b.percentage}%</span>
                      </div>
                      <div className="w-full h-2 bg-well rounded-pill overflow-hidden">
                        <div
                          className="h-full bg-blue rounded-pill transition-all duration-500"
                          style={{ width: `${b.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-line text-[11px] text-faded-ink">
                {isRTL
                  ? 'مبني على تصنيف المؤشرات الفرعية للقطاع المختار.'
                  : 'Proportional distribution across sector sub-indices.'}
              </div>
            </div>
          </div>

          {/* Regional Rankings: Top & Bottom */}
          {data?.ranking && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Performing Regions */}
              <div className="decidix-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <h3 className="font-bold text-navy text-base">
                    {isRTL ? 'أعلى المناطق أداءً في هذا القطاع' : 'Top Performing Regions'}
                  </h3>
                </div>

                <div className="space-y-2">
                  {data.ranking.top.map((r, idx) => (
                    <div
                      key={r.region_id}
                      className="flex items-center justify-between p-3 rounded-well bg-well"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-white text-navy font-bold text-xs flex items-center justify-center border border-line">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-sm text-navy">{r.name}</span>
                      </div>
                      <span className="font-bold text-sm text-blue">{r.score.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Regions Needing Intervention */}
              <div className="decidix-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <h3 className="font-bold text-navy text-base">
                    {isRTL ? 'المناطق الأكثر احتياجاً للدعم' : 'Lowest Scoring Regions'}
                  </h3>
                </div>

                <div className="space-y-2">
                  {data.ranking.bottom.map((r, idx) => (
                    <div
                      key={r.region_id}
                      className="flex items-center justify-between p-3 rounded-well bg-well"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-white text-danger font-bold text-xs flex items-center justify-center border border-rose-200">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-sm text-navy">{r.name}</span>
                      </div>
                      <span className="font-bold text-sm text-danger">{r.score.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
