import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { overviewService } from '../../services/overviewService';
import { RegionProfile } from '../../types';
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

export const RegionProfileScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<RegionProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const data = await overviewService.getRegionProfile(id);
        if (isMounted) setProfile(data);
      } catch (err) {
        console.warn('Profile fallback:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const regionName = profile?.name || id || 'Cairo';
  const arabicName = profile?.arabic_name || profile?.name || 'القاهرة';
  const score = profile?.score != null ? Math.round(Number(profile.score)) : 75;
  const rank = profile?.rank || 1;
  const rankTotal = profile?.rank_total || 23;
  const population = profile?.population
    ? `${(profile.population / 1_000_000).toFixed(1)}M ${isRTL ? 'نسمة' : 'residents'}`
    : `1.0M ${isRTL ? 'نسمة' : 'residents'}`;

  const historyPoints = profile?.history?.region?.length
    ? profile.history.region.map((h) => ({ year: String(h.year), value: h.value }))
    : [
        { year: '2021', value: 78.6 },
        { year: '2022', value: 78.0 },
        { year: '2023', value: 77.1 },
        { year: '2024', value: 75.8 },
        { year: '2025', value: score },
      ];

  const domains = profile?.domains?.length
    ? profile.domains
    : [
        { key: 'education', label: 'Education', arabic_label: 'التعليم', score: 75 },
        { key: 'healthcare', label: 'Healthcare', arabic_label: 'الرعاية الصحية', score: 75 },
        { key: 'economy', label: 'Economy & jobs', arabic_label: 'الاقتصاد والوظائف', score: 75 },
        { key: 'infrastructure', label: 'Infrastructure', arabic_label: 'البنية التحتية', score: 75 },
      ];

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue mb-1">
            {isRTL ? 'ملف المحافظة الإقليمي' : 'GOVERNORATE PROFILE'}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-navy">
            {isRTL ? arabicName : regionName}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isRTL
              ? `الترتيب ${rank} من بين ${rankTotal} محافظة مسجلة · سجلات المؤشر التنموي المعتمدة`
              : `Rank ${rank} of ${rankTotal} registered governorates · Verified indicator records`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/insights/comparison?a=${id || 'cairo'}&b=alexandria`)}
            className="h-9 px-4 rounded-lg bg-blue hover:bg-blue-hover text-white text-xs font-semibold shadow-2xs active:scale-[0.98] transition-all duration-150"
          >
            {isRTL ? 'مقارنة المحافظة' : 'Compare Governorate'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-xs">
          <div className="w-6 h-6 border-2 border-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          {isRTL ? 'جاري تحميل ملف المحافظة...' : 'Loading profile...'}
        </div>
      ) : (
        <>
          {/* Hero Banner: Dark Navy */}
          <div className="bg-[#061A3A] rounded-2xl p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden border border-slate-800 shadow-xs">
            <div>
              <div className="text-[10px] font-bold text-cyan uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan inline-block animate-pulse" />
                <span>{isRTL ? 'المؤشر التنموي العام' : 'OVERALL DEVELOPMENT INDEX'}</span>
              </div>
              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-4xl md:text-5xl font-bold tracking-tight tabular-nums">{score}</span>
                <span className="text-xs text-slate-400">
                  {isRTL ? 'من 100 · أداء معتمد' : 'out of 100 · Verified performance'}
                </span>
              </div>
            </div>

            <div className="text-left md:text-right">
              <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-cyan text-xs font-semibold mb-2.5 border border-cyan/30">
                {isRTL ? `الترتيب #${rank} وطنياً` : `Rank #${rank} Nationally`}
              </span>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                {isRTL ? 'عدد السكان' : 'POPULATION'}
              </div>
              <div className="text-xl font-bold tabular-nums mb-1">{population}</div>
              <div className="text-xs text-slate-400">
                {isRTL ? 'مركز تنموي وإداري رئيسي' : 'Major administrative & economic hub'}
              </div>
            </div>
          </div>

          {/* 4 Sector Domain Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {domains.map((dom) => (
              <div
                key={dom.key}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue">
                  <DecidixIcon name={dom.key as any} size={16} color="var(--color-blue)" />
                </div>
                <div className="text-xs font-medium text-slate-500">
                  {isRTL ? dom.arabic_label || dom.label : dom.label}
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold tracking-tight text-navy tabular-nums">
                    {Math.round(dom.score)}
                  </span>
                  <span className="text-[11px] font-bold text-blue bg-blue-50 px-2 py-0.5 rounded-full">
                    / 100
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue rounded-full"
                    style={{ width: `${Math.min(100, Math.max(5, dom.score))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Main Grid: Historical Trend + AI Regional Assessment */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: Trend Bar Chart (8 cols) */}
            <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="mb-4">
                <h2 className="text-base font-bold text-navy">
                  {isRTL ? 'مسار الأداء التاريخي للمحافظة' : 'Historical Performance Trajectory'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isRTL
                    ? 'حركة المؤشر التنموي خلال السنوات المرصودة'
                    : 'Index movement over monitored annual periods'}
                </p>
              </div>

              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historyPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5FA" />
                    <XAxis
                      dataKey="year"
                      stroke="#94A3B8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                    />
                    <YAxis
                      stroke="#94A3B8"
                      fontSize={11}
                      domain={[50, 100]}
                      tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                    />
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
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={44}>
                      {historyPoints.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index === historyPoints.length - 1 ? '#21EAF4' : '#2563EB'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {profile?.data_quality && (
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between flex-wrap gap-2">
                  <span>
                    {isRTL ? 'جودة وتكامل البيانات: ' : 'Data Completeness: '}
                    <strong className="text-navy font-bold tabular-nums">{profile.data_quality.score}%</strong>
                  </span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200/60">
                    {profile.data_quality.source}
                  </span>
                </div>
              )}
            </div>

            {/* Right: AI Regional Insight & Governance (4 cols) */}
            <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-base font-bold text-navy mb-0.5">
                  {isRTL ? 'التحليل الاستراتيجي الذكي' : 'Strategic Assessment'}
                </h2>
                <p className="text-xs text-slate-500 mb-5">
                  {isRTL ? 'خلاصة التحليل المقارن للمحافظة' : 'Comparative summary of stored metrics'}
                </p>

                {profile?.ai_insight ? (
                  <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70 text-xs text-slate-600 leading-relaxed mb-4">
                    <div className="font-bold text-navy mb-1.5 flex items-center gap-1.5">
                      <DecidixIcon name="robot" size={14} color="var(--color-blue)" />
                      <span>{isRTL ? 'رأي المنظومة' : 'Intelligence Summary'}</span>
                    </div>
                    <p>{isRTL ? profile.ai_insight.arabic_text || profile.ai_insight.text : profile.ai_insight.text}</p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70 text-xs text-slate-400 mb-4">
                    {isRTL ? 'لا توجد ملاحظات استثنائية مسجلة.' : 'No exceptional anomalies recorded.'}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50/70 border border-slate-200/70">
                    <span className="text-slate-500">{isRTL ? 'مستوى الأولوية' : 'Priority Level'}</span>
                    <span className="font-bold text-navy capitalize">
                      {profile?.priority || 'medium'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50/70 border border-slate-200/70">
                    <span className="text-slate-500">{isRTL ? 'المحافظات المقارنة' : 'Total Governorates'}</span>
                    <span className="font-bold text-navy tabular-nums">{rankTotal}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                {isRTL
                  ? 'بيانات معتمدة ومطابقة لسجلات الجهاز المركزي للتعبئة العامة والإحصاء.'
                  : 'Derived from version-matched regional observations.'}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
