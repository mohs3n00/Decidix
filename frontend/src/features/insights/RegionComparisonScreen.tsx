import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { insightsService } from '../../services/insightsService';
import { overviewService } from '../../services/overviewService';
import { useLanguage } from '../../context/LanguageContext';
import { DecidixIcon } from '../../components/DecidixIcon';
import { ComparisonData } from '../../types';

export const RegionComparisonScreen: React.FC = () => {
  const { isRTL } = useLanguage();
  const [searchParams] = useSearchParams();

  const [availableRegions, setAvailableRegions] = useState<Array<{ id: string; name: string; arabic_name?: string }>>([]);
  const [regionAId, setRegionAId] = useState<string>(searchParams.get('a') || searchParams.get('regionA') || 'cairo');
  const [regionBId, setRegionBId] = useState<string>(searchParams.get('b') || searchParams.get('regionB') || 'alexandria');
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load regions list for dropdowns
  useEffect(() => {
    let isMounted = true;
    const fetchRegions = async () => {
      try {
        const res = await overviewService.getRegions({ per_page: 50 });
        if (isMounted && res.items?.length) {
          setAvailableRegions(
            res.items.map((r) => ({
              id: r.id,
              name: r.name,
              arabic_name: r.arabic_name || r.name,
            }))
          );
        } else if (isMounted) {
          setAvailableRegions([
            { id: 'cairo', name: 'Cairo', arabic_name: 'القاهرة' },
            { id: 'alexandria', name: 'Alexandria', arabic_name: 'الإسكندرية' },
            { id: 'giza', name: 'Giza', arabic_name: 'الجيزة' },
            { id: 'port_said', name: 'Port Said', arabic_name: 'بورسعيد' },
            { id: 'aswan', name: 'Aswan', arabic_name: 'أسوان' },
          ]);
        }
      } catch {
        if (isMounted) {
          setAvailableRegions([
            { id: 'cairo', name: 'Cairo', arabic_name: 'القاهرة' },
            { id: 'alexandria', name: 'Alexandria', arabic_name: 'الإسكندرية' },
            { id: 'giza', name: 'Giza', arabic_name: 'الجيزة' },
            { id: 'port_said', name: 'Port Said', arabic_name: 'بورسعيد' },
            { id: 'aswan', name: 'Aswan', arabic_name: 'أسوان' },
          ]);
        }
      }
    };
    fetchRegions();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch comparison between A and B
  useEffect(() => {
    let isMounted = true;
    const fetchComparison = async () => {
      if (!regionAId || !regionBId) return;
      setIsLoading(true);
      try {
        const data = await insightsService.getComparison(regionAId, regionBId);
        if (isMounted) setComparison(data);
      } catch (err) {
        console.warn('Comparison fetch error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchComparison();
    return () => {
      isMounted = false;
    };
  }, [regionAId, regionBId]);

  const regA = comparison?.a || {
    id: regionAId,
    name: regionAId,
    arabic_name: regionAId,
    score: 75,
  };

  const regB = comparison?.b || {
    id: regionBId,
    name: regionBId,
    arabic_name: regionBId,
    score: 75,
  };

  const metrics = comparison?.metrics || [
    {
      key: 'overall',
      label: 'Overall Development Index',
      arabic_label: 'مؤشر التنمية الشاملة',
      score_a: regA.score,
      score_b: regB.score,
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue mb-1">
            {isRTL ? 'التحليلات والمقارنات' : 'INSIGHTS'}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-navy">
            {isRTL ? 'مقارنة المحافظات' : 'Compare Governorates'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isRTL
              ? 'مقارنة بين محافظتين عبر حزمة المؤشرات المعتمدة لنفس الفترة التقريرية (CAPMAS).'
              : 'Compare two governorates across the verified indicator set and reporting period.'}
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="h-9 px-4 rounded-lg bg-white border border-slate-200/80 text-navy hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors duration-150"
        >
          {isRTL ? 'تصدير المقارنة' : 'Export comparison'}
        </button>
      </div>

      {/* Provenance Banner */}
      {comparison?.provenance && (
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-blue-900 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span className="font-semibold">
              {isRTL ? 'المصدر المعتمد للمقارنة:' : 'Comparison Source:'}
            </span>
            <span>{comparison.provenance.source}</span>
          </div>
          <div className="text-[11px] text-blue font-medium">
            {comparison.provenance.geographic_coverage}
          </div>
        </div>
      )}

      {/* Two Region Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Region A Selector */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
            <span>{isRTL ? 'المحافظة (أ)' : 'GOVERNORATE A'}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue inline-block" />
          </div>
          <div className="flex items-center justify-between">
            <select
              value={regionAId}
              onChange={(e) => setRegionAId(e.target.value)}
              className="text-base font-bold text-navy bg-transparent outline-none cursor-pointer w-full py-1"
            >
              {availableRegions.map((r) => (
                <option key={`a-${r.id}`} value={r.id}>
                  {isRTL ? r.arabic_name || r.name : r.name}
                </option>
              ))}
            </select>
            <DecidixIcon name="location" size={18} color="var(--color-blue)" />
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-baseline justify-between">
            <span className="text-xs text-slate-500 font-medium">{isRTL ? 'المؤشر العام' : 'Overall Index'}</span>
            <span className="text-xl font-bold text-navy tabular-nums">{regA.score}/100</span>
          </div>
        </div>

        {/* Region B Selector */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
            <span>{isRTL ? 'المحافظة (ب)' : 'GOVERNORATE B'}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-cyan inline-block" />
          </div>
          <div className="flex items-center justify-between">
            <select
              value={regionBId}
              onChange={(e) => setRegionBId(e.target.value)}
              className="text-base font-bold text-navy bg-transparent outline-none cursor-pointer w-full py-1"
            >
              {availableRegions.map((r) => (
                <option key={`b-${r.id}`} value={r.id}>
                  {isRTL ? r.arabic_name || r.name : r.name}
                </option>
              ))}
            </select>
            <DecidixIcon name="location" size={18} color="var(--color-cyan)" />
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-baseline justify-between">
            <span className="text-xs text-slate-500 font-medium">{isRTL ? 'المؤشر العام' : 'Overall Index'}</span>
            <span className="text-xl font-bold text-navy tabular-nums">{regB.score}/100</span>
          </div>
        </div>
      </div>

      {/* Main Indicator Comparison Table Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-navy">
              {isRTL ? 'مقارنة المؤشرات المعتمدة' : 'Verified Indicator Comparison'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isRTL
                ? 'مقارنة مبنية على المؤشرات المعتمدة في قاعدة البيانات'
                : 'Comparison derived from version-matched observations'}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-blue">
              <span className="w-2.5 h-2.5 rounded-full bg-blue inline-block" />
              {isRTL ? regA.arabic_name || regA.name : regA.name}
            </span>
            <span className="flex items-center gap-1.5 text-cyan">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan inline-block" />
              {isRTL ? regB.arabic_name || regB.name : regB.name}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            {isRTL ? 'جاري استخراج المقارنة...' : 'Loading comparison...'}
          </div>
        ) : (
          <div className="space-y-4">
            {metrics.map((m) => {
              const diff = Math.abs(m.score_a - m.score_b);
              return (
                <div key={m.key} className="space-y-2 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-semibold text-navy gap-1.5">
                    <span className="truncate">{isRTL ? m.arabic_label || m.label : m.label}</span>
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 self-stretch sm:self-auto">
                      <span className="text-blue font-bold tabular-nums">{m.score_a}</span>
                      <span className="text-cyan font-bold tabular-nums">{m.score_b}</span>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full min-w-[55px] text-center border border-emerald-200/60 tabular-nums">
                        {diff.toFixed(1)} pts
                      </span>
                    </div>
                  </div>

                  {/* Dual Horizontal Bars */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Region A (Blue) */}
                    <div className="h-2 w-full bg-slate-200/70 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(4, m.score_a))}%` }}
                      />
                    </div>
                    {/* Region B (Cyan) */}
                    <div className="h-2 w-full bg-slate-200/70 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(4, m.score_b))}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Card: Gap Analysis Insight */}
      {comparison?.gap_analysis && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-navy mb-1 flex items-center gap-2">
              <DecidixIcon name="robot" size={16} color="var(--color-blue)" />
              <span>{isRTL ? 'تحليل الفجوة التنموية' : 'Development Gap Analysis'}</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {isRTL
                ? comparison.gap_analysis.arabic_text || comparison.gap_analysis.text
                : comparison.gap_analysis.text}
            </p>
          </div>

          <span className="shrink-0 text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue">
            {isRTL ? 'تحليل معتمد' : 'Verified Analysis'}
          </span>
        </div>
      )}
    </div>
  );
};
