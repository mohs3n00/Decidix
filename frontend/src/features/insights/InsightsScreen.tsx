import React, { useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { insightsService } from '../../services/insightsService';
import { useLanguage } from '../../context/LanguageContext';
import { DecidixIcon } from '../../components/DecidixIcon';
import { SectorInsightData } from '../../types';
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

type SectorType = 'education' | 'healthcare' | 'economy' | 'infrastructure';

export const InsightsScreen: React.FC = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const [activeSector, setActiveSector] = useState<SectorType>('education');
  const [data, setData] = useState<SectorInsightData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchSector = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await insightsService.getSectorInsight(activeSector);
        if (isMounted) {
          setData(res);
        }
      } catch (err: any) {
        if (isMounted) {
          setData(null);
          setErrorMsg(
            err?.message ||
            (isRTL
              ? 'لا تتوفر مؤشرات موثقة لهذا القطاع في مجموعة البيانات الحالية.'
              : 'No verified indicators available for this sector in the active dataset.')
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchSector();
    return () => {
      isMounted = false;
    };
  }, [activeSector]);

  const SECTOR_META: Record<
    SectorType,
    { titleEn: string; titleAr: string; icon: string; shortEn: string; shortAr: string }
  > = {
    education: {
      titleEn: 'Education Analytics',
      titleAr: 'تحليلات التعليم والتدريب',
      shortEn: 'Education',
      shortAr: 'التعليم',
      icon: 'education',
    },
    healthcare: {
      titleEn: 'Healthcare Analytics',
      titleAr: 'تحليلات الصحة والرعاية',
      shortEn: 'Healthcare',
      shortAr: 'الصحة',
      icon: 'healthcare',
    },
    economy: {
      titleEn: 'Economy & Employment',
      titleAr: 'تحليلات الاقتصاد والوظائف',
      shortEn: 'Economy',
      shortAr: 'الاقتصاد',
      icon: 'economy',
    },
    infrastructure: {
      titleEn: 'Infrastructure Analytics',
      titleAr: 'تحليلات البنية التحتية والربط',
      shortEn: 'Infrastructure',
      shortAr: 'البنية التحتية',
      icon: 'infrastructure',
    },
  };

  const currentMeta = SECTOR_META[activeSector];

  // Map ranking data for charts and cards
  const topRegions = data?.ranking?.top || [];
  const chartData = topRegions.map((r) => ({
    name: isRTL ? r.arabic_name || r.name : r.name,
    score: Math.round(r.score * 10) / 10,
    rank: r.rank,
  }));

  const mainScore = data?.index?.score != null ? data.index.score : null;
  const scoreChange = data?.index?.change != null ? data.index.change : null;

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue mb-1">
            {isRTL ? 'التحليلات والرؤى القطاعية' : 'SECTOR INSIGHTS'}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-navy tracking-tight">
            {isRTL ? currentMeta.titleAr : currentMeta.titleEn}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            {isRTL
              ? 'مؤشرات الأداء الموثقة عبر المحافظات المصرية · بيانات الجهاز المركزي للتعبئة العامة والإحصاء (CAPMAS)'
              : 'Verified performance indicators across Egyptian governorates · CAPMAS official datasets'}
          </p>
        </div>

        <button
          onClick={() => navigate('/insights/comparison')}
          className="h-9 px-4 rounded-lg bg-blue hover:bg-blue-hover text-white text-xs font-semibold shadow-xs transition-colors duration-150"
        >
          {isRTL ? 'مقارنة المحافظات' : 'Compare Governorates'}
        </button>
      </div>

      {/* Analytical Sub-Nav Pills Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-4">
        {(['education', 'healthcare', 'economy', 'infrastructure'] as SectorType[]).map((s) => (
          <button
            key={s}
            onClick={() => setActiveSector(s)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 flex items-center gap-2 whitespace-nowrap ${activeSector === s
              ? 'bg-blue text-white shadow-xs font-bold'
              : 'bg-white border border-slate-200/80 text-slate-600 hover:text-navy hover:bg-slate-50'
              }`}
          >
            <DecidixIcon
              name={SECTOR_META[s].icon as any}
              size={14}
              color={activeSector === s ? '#FFFFFF' : '#64748B'}
            />
            <span>{isRTL ? SECTOR_META[s].shortAr : SECTOR_META[s].shortEn}</span>
          </button>
        ))}

        <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

        <NavLink
          to="/insights/comparison"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200/80 text-slate-600 hover:text-navy hover:bg-slate-50 transition-colors duration-150"
        >
          {isRTL ? 'مقارنة المناطق' : 'Region Comparison'}
        </NavLink>
        <NavLink
          to="/insights/historical"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200/80 text-slate-600 hover:text-navy hover:bg-slate-50 transition-colors duration-150"
        >
          {isRTL ? 'التحليل التاريخي' : 'Historical Analysis'}
        </NavLink>
        <NavLink
          to="/insights/priority"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200/80 text-slate-600 hover:text-navy hover:bg-slate-50 transition-colors duration-150"
        >
          {isRTL ? 'أولويات التنمية' : 'Development Priority'}
        </NavLink>
        <NavLink
          to="/insights/data-quality"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200/80 text-slate-600 hover:text-navy hover:bg-slate-50 transition-colors duration-150"
        >
          {isRTL ? 'جودة البيانات' : 'Data Quality'}
        </NavLink>
      </div>

      {/* Provenance Badge */}
      {data?.provenance && (
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-blue-900 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span className="font-semibold">
              {isRTL ? 'مصدر البيانات المعتمد:' : 'Official Data Source:'}
            </span>
            <span>{data.provenance.source}</span>
          </div>
          <div className="text-[11px] text-blue font-medium">
            {data.provenance.geographic_coverage}
          </div>
        </div>
      )}

      {/* Sector Not Connected / Missing State */}
      {errorMsg ? (
        <div className="bg-white rounded-2xl p-8 border border-[#E9EEF5] text-center shadow-card max-w-2xl mx-auto my-8">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <DecidixIcon name="info" size={24} color="#D97706" />
          </div>
          <h3 className="text-lg font-bold text-[#061A3A] mb-2">
            {isRTL ? 'لا توجد بيانات موثقة لهذا القطاع' : 'No Verified Indicators for This Sector'}
          </h3>
          <p className="text-sm text-[#7D8AA0] mb-6">
            {isRTL
              ? `مجموعة البيانات النشطة لا تحتوي حالياً على مؤشرات كافية مسجلة لقطاع ${currentMeta.shortAr}. يمكنك استعراض القطاعات المتاحة أدناه.`
              : `The active dataset does not currently contain stored indicators for ${currentMeta.shortEn}. Explore the available sectors below.`}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setActiveSector('education')}
              className="px-4 py-2 rounded-full bg-blue text-white text-xs font-semibold hover:bg-blue-hover transition"
            >
              {isRTL ? 'تحليلات التعليم' : 'View Education'}
            </button>
            <button
              onClick={() => setActiveSector('healthcare')}
              className="px-4 py-2 rounded-full bg-[#EFF6FF] text-blue text-xs font-semibold hover:bg-[#DBEAFE] transition"
            >
              {isRTL ? 'تحليلات الصحة' : 'View Healthcare'}
            </button>
            <button
              onClick={() => setActiveSector('economy')}
              className="px-4 py-2 rounded-full bg-[#EFF6FF] text-blue text-xs font-semibold hover:bg-[#DBEAFE] transition"
            >
              {isRTL ? 'تحليلات الاقتصاد' : 'View Economy'}
            </button>
          </div>
        </div>
      ) : isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-[#7D8AA0]">
          <div className="w-8 h-8 border-2 border-blue border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-xs font-semibold">
            {isRTL ? 'جاري تحميل المؤشرات القطاعية الموثقة...' : 'Loading verified sector indicators...'}
          </span>
        </div>
      ) : (
        <>
          {/* 3 Real KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* KPI 1: Sector Composite Score */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue mb-3">
                <DecidixIcon name={currentMeta.icon as any} size={16} color="var(--color-blue)" />
              </div>
              <div className="text-xs font-medium text-slate-500 mb-1">
                {isRTL ? `مؤشر ${currentMeta.shortAr}` : `${currentMeta.shortEn} index`}
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-bold text-navy tabular-nums">
                  {mainScore != null ? mainScore : '—'}
                </span>
                {scoreChange != null && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${scoreChange >= 0
                      ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                      : 'text-rose-700 bg-rose-50 border border-rose-200/60'
                      }`}
                  >
                    {scoreChange >= 0 ? `+${scoreChange}` : scoreChange}% vs prev
                  </span>
                )}
              </div>
            </div>

            {/* KPI 2: Primary Indicator */}
            {data?.kpis && data.kpis[0] ? (
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue mb-3">
                  <DecidixIcon name="insights" size={16} color="var(--color-blue)" />
                </div>
                <div className="text-xs font-medium text-slate-500 mb-1">
                  {isRTL
                    ? data.kpis[0].arabic_label || data.kpis[0].label
                    : data.kpis[0].label.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-bold text-navy tabular-nums">
                    {data.kpis[0].value}
                    {data.kpis[0].unit === 'percent' ? '%' : ''}
                  </span>
                  {data.kpis[0].change != null && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${data.kpis[0].change >= 0
                        ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                        : 'text-rose-700 bg-rose-50 border border-rose-200/60'
                        }`}
                    >
                      {data.kpis[0].change >= 0 ? `+${data.kpis[0].change}` : data.kpis[0].change}%
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue mb-3">
                  <DecidixIcon name="insights" size={16} color="var(--color-blue)" />
                </div>
                <div className="text-xs font-medium text-slate-500 mb-1">
                  {isRTL ? 'المحافظات المشمولة' : 'Governorates Covered'}
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-bold text-navy tabular-nums">
                    {topRegions.length}
                  </span>
                  <span className="text-[10px] font-bold text-blue bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                    {isRTL ? 'تحقق CAPMAS' : 'CAPMAS verified'}
                  </span>
                </div>
              </div>
            )}

            {/* KPI 3: Leading Region */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue mb-3">
                <DecidixIcon name="location" size={16} color="var(--color-blue)" />
              </div>
              <div className="text-xs font-medium text-slate-500 mb-1">
                {isRTL ? 'المحافظة الأولى' : 'Top Performer'}
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-lg sm:text-xl font-bold text-navy truncate max-w-[150px]">
                  {topRegions[0] ? (isRTL ? topRegions[0].arabic_name || topRegions[0].name : topRegions[0].name) : '—'}
                </span>
                {topRegions[0] && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 tabular-nums">
                    {topRegions[0].score}/100
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Main Grid: Sector Comparison Bar Chart + Regional Ranking Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: Performance Bar Chart across Governorates (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="mb-4">
                <h2 className="text-base sm:text-lg font-bold text-navy">
                  {isRTL
                    ? `مقارنة أداء المحافظات في قطاع ${currentMeta.shortAr}`
                    : `${currentMeta.shortEn} Performance by Governorate`}
                </h2>
                <p className="text-xs text-slate-500">
                  {isRTL
                    ? 'قيم معيارية من 0 إلى 100 محسوبة وفق النطاق الإقليمي المرصود'
                    : 'Normalized scores (0-100) derived from observed regional ranges'}
                </p>
              </div>

              <div className="h-64 sm:h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="name"
                      stroke="#94A3B8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                    />
                    <YAxis
                      stroke="#94A3B8"
                      fontSize={11}
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickFormatter={(v) => `${v}`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl p-3 shadow-lg text-xs space-y-1">
                              <span className="font-bold text-navy text-sm block">{item.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-blue font-bold uppercase bg-blue-50 px-2 py-0.5 rounded">
                                  {isRTL ? `الترتيب: #${item.rank}` : `Rank #${item.rank}`}
                                </span>
                                <span className="text-sm font-bold text-navy tabular-nums">{item.score}/100</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={44}>
                      {chartData.map((entry, index) => {
                        const sectorColor =
                          activeSector === 'healthcare'
                            ? index === 0 ? '#10B981' : '#059669'
                            : activeSector === 'economy'
                              ? index === 0 ? '#8B5CF6' : '#7C3AED'
                              : activeSector === 'infrastructure'
                                ? index === 0 ? '#F59E0B' : '#D97706'
                                : index === 0 ? '#38BDF8' : '#2563EB';
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={sectorColor}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {data?.normalization && (
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                  <span className="font-semibold text-navy">
                    {isRTL ? 'معيار الحساب: ' : 'Methodology: '}
                  </span>
                  {data.normalization.note}
                </div>
              )}
            </div>

            {/* Right: Regional Ranking List (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-navy mb-1">
                  {isRTL ? 'الترتيب الإقليمي المعتمد' : 'Official Regional Ranking'}
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  {isRTL ? 'ترتيب المحافظات بناءً على المؤشر المعياري' : 'Governorates ranked by normalized composite score'}
                </p>

                <div className="space-y-3">
                  {topRegions.map((reg) => (
                    <div
                      key={reg.region_id}
                      className="p-3 rounded-xl border border-slate-200/70 hover:border-blue/40 transition-colors duration-150 bg-slate-50/50 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue text-white flex items-center justify-center font-bold text-[10px]">
                            {reg.rank}
                          </span>
                          <span className="font-bold text-navy">
                            {isRTL ? reg.arabic_name || reg.name : reg.name}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-navy tabular-nums">
                          {reg.score}/100
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-blue-100/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue rounded-full"
                          style={{ width: `${Math.max(4, reg.score)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Insight Snippet */}
              {data?.ai_insight && (
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <div className="font-bold text-navy mb-1 flex items-center gap-1.5">
                    <DecidixIcon name="spark" size={14} color="var(--color-blue)" />
                    <span>{isRTL ? 'رأي المنظومة الذكية' : 'Intelligence Insight'}</span>
                  </div>
                  <p className="leading-relaxed">
                    {isRTL
                      ? data.ai_insight.arabic_text || data.ai_insight.text
                      : data.ai_insight.text}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
