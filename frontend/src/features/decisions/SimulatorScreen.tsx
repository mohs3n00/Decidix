import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { DecidixIcon } from '../../components/DecidixIcon';
import { GrainOverlay } from '../../components/GrainOverlay';
import { GlassStatCard } from '../../components/GlassStatCard';
import { decisionsService } from '../../services/decisionsService';
import { overviewService } from '../../services/overviewService';
import { SimulationResponse } from '../../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';

export const SimulatorScreen: React.FC = () => {
  const { isRTL } = useLanguage();
  const { requireAuth } = useAuth();
  const toast = useToast();

  const [selectedRegion, setSelectedRegion] = useState<string>('cairo');
  const [healthVal, setHealthVal] = useState<number>(15);
  const [eduVal, setEduVal] = useState<number>(10);
  const [infraVal, setInfraVal] = useState<number>(8);
  const [econVal, setEconVal] = useState<number>(5);

  const [simResult, setSimResult] = useState<SimulationResponse | null>(null);
  const [regions, setRegions] = useState<Array<{ id: string; name: string; arabic_name: string }>>([
    { id: 'cairo', name: 'Cairo', arabic_name: 'القاهرة' },
    { id: 'alexandria', name: 'Alexandria', arabic_name: 'الإسكندرية' },
    { id: 'giza', name: 'Giza', arabic_name: 'الجيزة' },
    { id: 'aswan', name: 'Aswan', arabic_name: 'أسوان' },
    { id: 'port_said', name: 'Port Said', arabic_name: 'بورسعيد' },
  ]);

  // Fetch active regions directory from backend
  useEffect(() => {
    let isMounted = true;
    overviewService
      .getRegions({ per_page: 100 })
      .then((res) => {
        if (!isMounted || !Array.isArray(res.items) || res.items.length === 0) return;
        const mapped = res.items.map((r) => ({
          id: r.id,
          name: r.name,
          arabic_name: r.arabic_name || r.name,
        }));
        setRegions(mapped);
        setSelectedRegion((prev) => (mapped.some((m) => m.id === prev) ? prev : mapped[0].id));
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Run backend simulation whenever region or sliders change
  useEffect(() => {
    const controller = new AbortController();
    const runSimulation = async () => {
      try {
        const res = await decisionsService.simulate(
          selectedRegion,
          {
            education: eduVal * 1_000_000,
            healthcare: healthVal * 1_000_000,
            infrastructure: infraVal * 1_000_000,
            economy: econVal * 1_000_000,
          },
          controller.signal
        );
        if (!controller.signal.aborted) setSimResult(res);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.warn('Simulation error:', err);
        }
      }
    };

    const timer = setTimeout(runSimulation, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [selectedRegion, healthVal, eduVal, infraVal, econVal]);

  const baseline = simResult?.today_score ?? 75;
  const projected = simResult?.projected_score ?? 75;
  const gain = simResult?.gain ?? 0;
  const rawTotalPackage = simResult?.total_package?.amount;
  const totalPackage =
    typeof rawTotalPackage === 'number'
      ? Math.round((rawTotalPackage >= 1000 ? rawTotalPackage / 1_000_000 : rawTotalPackage) * 10) / 10
      : healthVal + eduVal + infraVal + econVal;

  const leverChartData = [
    {
      name: isRTL ? 'الصحة' : 'Health',
      amount: healthVal,
      color: '#059669',
      domain: 'healthcare',
    },
    {
      name: isRTL ? 'التعليم' : 'Education',
      amount: eduVal,
      color: '#2563EB',
      domain: 'education',
    },
    {
      name: isRTL ? 'البنية التحتية' : 'Infra',
      amount: infraVal,
      color: '#D97706',
      domain: 'infrastructure',
    },
    {
      name: isRTL ? 'الاقتصاد' : 'Economy',
      amount: econVal,
      color: '#7C3AED',
      domain: 'economy',
    },
  ];

  const handleSaveScenario = () => {
    requireAuth(
      isRTL
        ? 'يتطلب حفظ سيناريوهات المحاكاة واستراتيجيات السياسات تسجيل الدخول.'
        : 'Sign in to save policy simulation scenarios and link them to regional intervention plans.',
      () => {
        toast.success(
          isRTL
            ? `تم حفظ السيناريو لمحافظة (${REGIONS.find((r) => r.id === selectedRegion)?.arabic_name || selectedRegion}) بحزمة استثمارية إجمالية قدرها $${totalPackage}M.`
            : `Simulation scenario saved successfully with total package of $${totalPackage}M.`
        );
      },
      isRTL ? 'حفظ السيناريو' : 'Save Policy Scenario'
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Policy Simulator Executive Strip - Dark Navy Glass */}
      <div className="relative bg-navy-gradient rounded-[2rem] overflow-hidden p-6 mb-6">
        <GrainOverlay />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-eyebrow text-[#21EAF4] mb-1">{isRTL ? 'محاكي السياسات' : 'Policy Simulator'}</div>
            <div className="text-xl font-bold text-white">{isRTL ? 'اختبار سيناريوهات الاستثمار قبل اتخاذ القرار' : 'Model Budget Allocations Before Committing'}</div>
          </div>
          <div className="flex gap-3">
            <GlassStatCard metric="4" caption={isRTL ? 'قطاعات تخصيص' : 'Budget Levers'} />
            <GlassStatCard metric={isRTL ? 'ماذا لو' : 'What-If'} caption={isRTL ? 'نموذج المحاكاة' : 'Simulation Model'} />
          </div>
        </div>
      </div>

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue mb-1">
            {isRTL ? 'دعم القرار والسياسات' : 'DECISIONS'}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-navy">
            {isRTL ? 'محاكي السياسات والاستثمارات (ماذا لو)' : 'What-If Policy Simulator'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isRTL
              ? 'نمذجة أثر حزم التخصيص الاستثماري عبر الروافع القطاعية لحساب العائد الحدي على مؤشر التنمية.'
              : 'Simulate alternative investment packages across sector levers to calculate marginal yield.'}
          </p>
        </div>

        <button
          onClick={handleSaveScenario}
          className="h-9 px-4 rounded-lg bg-blue hover:bg-blue-hover text-white text-xs font-semibold shadow-2xs active:scale-[0.98] transition-all duration-150"
        >
          {isRTL ? 'حفظ السيناريو' : 'Save scenario'}
        </button>
      </div>

      {/* Provenance Banner */}
      {simResult?.provenance && (
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-blue-900 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue inline-block animate-pulse" />
            <span className="font-semibold">
              {isRTL ? 'نموذج المحاكاة التناقصي:' : 'Simulation Model:'}
            </span>
            <span>Concave Diminishing Yield (Decidix v1)</span>
          </div>
          <div className="text-[11px] text-blue font-medium">
            {simResult.provenance.source} · {simResult.provenance.data_classification}
          </div>
        </div>
      )}

      {/* Main Grid: Parameters + Projected Outcome */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Scenario Parameters (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h2 className="text-base font-bold text-navy">
                  {isRTL ? 'معاملات السيناريو التنموي' : 'Scenario Parameters'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isRTL
                    ? 'حدد المحافظة وعدل مخصصات الاستثمار بملايين الدولارات'
                    : 'Select governorate and adjust funding allocations in $ Millions'}
                </p>
              </div>

              {/* Region Selector */}
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5 text-xs font-bold text-navy outline-none cursor-pointer focus:ring-2 focus:ring-blue/15 focus:border-blue transition-colors"
              >
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {isRTL ? r.arabic_name : r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4 pt-2">
              {/* Healthcare */}
              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70">
                <div className="flex items-center justify-between text-xs font-semibold text-navy mb-2">
                  <span className="flex items-center gap-1.5">
                    <DecidixIcon name="healthcare" size={14} color="var(--color-blue)" />
                    <span>{isRTL ? 'استثمارات الرعاية الصحية' : 'Healthcare Allocation'}</span>
                  </span>
                  <span className="text-blue bg-blue-50 px-2 py-0.5 rounded-full font-bold tabular-nums">
                    ${healthVal}M
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={healthVal}
                  onChange={(e) => setHealthVal(Number(e.target.value))}
                  className="w-full accent-blue cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-semibold tabular-nums">
                  <span>$0M</span>
                  <span>$25M</span>
                  <span>$50M</span>
                </div>
              </div>

              {/* Education */}
              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70">
                <div className="flex items-center justify-between text-xs font-semibold text-navy mb-2">
                  <span className="flex items-center gap-1.5">
                    <DecidixIcon name="education" size={14} color="var(--color-blue)" />
                    <span>{isRTL ? 'الإنفاق على التعليم والتدريب' : 'Education Spending'}</span>
                  </span>
                  <span className="text-blue bg-blue-50 px-2 py-0.5 rounded-full font-bold tabular-nums">
                    ${eduVal}M
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={eduVal}
                  onChange={(e) => setEduVal(Number(e.target.value))}
                  className="w-full accent-blue cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-semibold tabular-nums">
                  <span>$0M</span>
                  <span>$25M</span>
                  <span>$50M</span>
                </div>
              </div>

              {/* Infrastructure */}
              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70">
                <div className="flex items-center justify-between text-xs font-semibold text-navy mb-2">
                  <span className="flex items-center gap-1.5">
                    <DecidixIcon name="infrastructure" size={14} color="var(--color-blue)" />
                    <span>{isRTL ? 'مشروعات البنية التحتية والربط' : 'Infrastructure Access'}</span>
                  </span>
                  <span className="text-blue bg-blue-50 px-2 py-0.5 rounded-full font-bold tabular-nums">
                    ${infraVal}M
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={infraVal}
                  onChange={(e) => setInfraVal(Number(e.target.value))}
                  className="w-full accent-blue cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-semibold tabular-nums">
                  <span>$0M</span>
                  <span>$25M</span>
                  <span>$50M</span>
                </div>
              </div>

              {/* Economy */}
              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70">
                <div className="flex items-center justify-between text-xs font-semibold text-navy mb-2">
                  <span className="flex items-center gap-1.5">
                    <DecidixIcon name="economy" size={14} color="var(--color-blue)" />
                    <span>{isRTL ? 'دعم المشروعات الصغيرة والتوظيف' : 'Economy & Jobs'}</span>
                  </span>
                  <span className="text-blue bg-blue-50 px-2 py-0.5 rounded-full font-bold tabular-nums">
                    ${econVal}M
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={econVal}
                  onChange={(e) => setEconVal(Number(e.target.value))}
                  className="w-full accent-blue cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-semibold tabular-nums">
                  <span>$0M</span>
                  <span>$25M</span>
                  <span>$50M</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Projected Outcome & Marginal Yield Analysis (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-navy mb-0.5">
              {isRTL ? 'النتيجة والعائد الحدي المتوقع' : 'Projected Yield & Outcome'}
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              {isRTL
                ? 'محاكاة رياضية تناقصية لتقدير كفاءة المخصصات'
                : 'Concave diminishing returns mathematical model'}
            </p>

            {/* Score Comparison Box */}
            <div className="border-b border-slate-100 pb-5 mb-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    {isRTL ? 'المؤشر الحالي' : 'BASELINE SCORE'}
                  </div>
                  <div className="text-2xl font-bold text-slate-400 tabular-nums">{baseline}/100</div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-bold text-blue uppercase tracking-wider mb-0.5">
                    {isRTL ? 'المؤشر بعد المحاكاة' : 'SIMULATED SCORE'}
                  </div>
                  <div className="text-3xl font-bold tracking-tight text-navy tabular-nums">
                    {projected}
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full ml-2 border border-emerald-200/60">
                      +{gain} pts
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200/60 flex items-center justify-between text-xs text-blue-900 font-medium">
                <span>{isRTL ? 'إجمالي الحزمة الاستثمارية:' : 'Total Investment Package:'}</span>
                <span className="font-bold text-blue tabular-nums">${totalPackage}M USD</span>
              </div>
            </div>

            {/* Dynamic Sector Allocation Visual Chart */}
            <div className="mb-5 p-3 rounded-xl bg-slate-50/60 border border-slate-200/70">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {isRTL ? 'توزيع المخصصات القطاعية ($ ملايين)' : 'SECTOR ALLOCATION ($M)'}
                </span>
                <span className="text-[10px] font-bold text-navy tabular-nums">
                  100% {isRTL ? 'موزعة' : 'allocated'}
                </span>
              </div>
              <div className="h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leverChartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="name"
                      stroke="#94A3B8"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                    />
                    <YAxis
                      stroke="#94A3B8"
                      fontSize={10}
                      domain={[0, 50]}
                      tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickFormatter={(v) => `$${v}M`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg p-2 shadow-md text-xs">
                              <span className="font-bold text-navy block">{item.name}</span>
                              <span className="text-blue font-bold tabular-nums">${item.amount}M USD</span>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={36}>
                      {leverChartData.map((entry, index) => (
                        <Cell key={`lever-cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Levers Yield Breakdown */}
            <div className="space-y-2 mb-5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {isRTL ? 'العائد الحدي لكل مليون دولار' : 'MARGINAL YIELD PER $1M'}
              </div>

              {simResult?.levers ? (
                simResult.levers.map((lv) => (
                  <div
                    key={lv.domain}
                    className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50/70 border border-slate-200/70"
                  >
                    <span className="font-semibold text-navy capitalize">{lv.domain}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        ${Math.round((lv.amount >= 1000 ? lv.amount / 1_000_000 : lv.amount) * 10) / 10}M
                      </span>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200/60 tabular-nums">
                        +{lv.yield_per_million} pts / $1M
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 py-2">
                  {isRTL ? 'جاري حساب العوائد...' : 'Calculating yields...'}
                </div>
              )}
            </div>

            {/* AI Simulation Note */}
            {simResult?.note && (
              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70 text-xs text-slate-600">
                <div className="font-bold text-navy mb-1 flex items-center gap-1.5">
                  <DecidixIcon name="robot" size={14} color="var(--color-blue)" />
                  <span>{isRTL ? 'تحليل الرافعة الأكفأ' : 'Optimal Lever Analysis'}</span>
                </div>
                <p className="leading-relaxed">
                  {isRTL ? simResult.note.arabic_text || simResult.note.text : simResult.note.text}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
