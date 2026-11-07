import React, { useState, useEffect } from 'react';
import { insightsService } from '../../services/insightsService';
import { overviewService } from '../../services/overviewService';
import { RegionListItem } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { HeroCard } from '../../components/HeroCard';
import { DecidixCard } from '../../components/DecidixCard';
import { ScoreRing } from '../../components/ScoreRing';
import { StatWell } from '../../components/StatWell';
import { HatchedBar } from '../../components/HatchedBar';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';

export const RegionComparisonScreen: React.FC = () => {
  const { isRTL, t } = useLanguage();
  const [regionsList, setRegionsList] = useState<RegionListItem[]>([]);
  const [regionA, setRegionA] = useState<string>('central_capital');
  const [regionB, setRegionB] = useState<string>('frontier');
  const [comparison, setComparison] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchList = async () => {
      try {
        const res = await overviewService.getRegions({ per_page: 50 });
        if (res.items && res.items.length >= 2) {
          setRegionsList(res.items);
          setRegionA(res.items[0].region_id);
          setRegionB(res.items[1].region_id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchList();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchComparison = async () => {
      if (!regionA || !regionB) return;
      try {
        setIsLoading(true);
        const data = await insightsService.getComparison(regionA, regionB);
        if (isMounted) setComparison(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchComparison();
    return () => {
      isMounted = false;
    };
  }, [regionA, regionB]);

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="type-eyebrow mb-1">
            {isRTL
              ? 'مقارنة إحصائية مباشرة بين محافظتين'
              : 'Direct side-by-side indicator benchmark between two selected administrative territories'}
          </div>
          <TwoToneHeading
            first={isRTL ? 'مقارنة' : 'Region'}
            second={isRTL ? 'المحافظات' : 'Comparison'}
            level={1}
            className="type-heading-page"
          />
        </div>
      </div>

      {/* Region Selectors Row */}
      <DecidixCard variant="row" className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center p-5">
        <div>
          <label className="block text-xs font-semibold text-ink uppercase mb-2">
            {isRTL ? 'المنطقة الأولى (أ)' : 'First Region (A)'}
          </label>
          <select
            value={regionA}
            onChange={(e) => setRegionA(e.target.value)}
            className="decidix-input font-bold text-navy"
          >
            {regionsList.map((r) => (
              <option key={r.region_id} value={r.region_id}>
                {t(r, 'name')} (#{r.rank} - Score {r.score})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink uppercase mb-2">
            {isRTL ? 'المنطقة المقابلة (ب)' : 'Benchmark Region (B)'}
          </label>
          <select
            value={regionB}
            onChange={(e) => setRegionB(e.target.value)}
            className="decidix-input font-bold text-navy"
          >
            {regionsList.map((r) => (
              <option key={r.region_id} value={r.region_id}>
                {t(r, 'name')} (#{r.rank} - Score {r.score})
              </option>
            ))}
          </select>
        </div>
      </DecidixCard>

      {/* Head-to-Head Cards */}
      {comparison && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <HeroCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-pill bg-white text-blue border border-white">
                  REGION A
                </span>
                <h3 className="type-heading-page text-2xl font-bold text-navy mt-1">
                  {comparison.region_a?.name || 'Region A'}
                </h3>
              </div>
              <ScoreRing score={comparison.region_a?.score ?? 80} size={64} strokeWidth={6} />
            </div>
          </HeroCard>

          <HeroCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-pill bg-white text-navy border border-white">
                  REGION B (BENCHMARK)
                </span>
                <h3 className="type-heading-page text-2xl font-bold text-navy mt-1">
                  {comparison.region_b?.name || 'Region B'}
                </h3>
              </div>
              <ScoreRing score={comparison.region_b?.score ?? 60} size={64} strokeWidth={6} />
            </div>
          </HeroCard>
        </div>
      )}

      {/* Comparison Metrics Table */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner message={isRTL ? 'جارٍ مقارنة البيانات...' : 'Calculating comparative indicators...'} />
        </div>
      ) : comparison ? (
        <DecidixCard variant="card" className="p-0 overflow-hidden">
          <div className="p-5 border-b border-hairline">
            <h3 className="type-heading-section text-navy">
              {isRTL ? 'المقارنة القطاعية المباشرة' : 'Sectoral Disparity Matrix'}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-well border-b border-hairline text-xs font-semibold text-faded-ink uppercase">
                  <th className="py-3.5 px-5">{isRTL ? 'القطاع / المؤشر' : 'Domain / Indicator'}</th>
                  <th className="py-3.5 px-5 text-center font-bold text-navy">{comparison.region_a?.name || 'Region A'}</th>
                  <th className="py-3.5 px-5 text-center font-bold text-navy">{comparison.region_b?.name || 'Region B'}</th>
                  <th className="py-3.5 px-5 text-right">{isRTL ? 'الفارق الصافي' : 'Net Disparity'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {comparison.metrics?.map((m: any, i: number) => {
                  const valA = m.value_a ?? m.score_a ?? 0;
                  const valB = m.value_b ?? m.score_b ?? 0;
                  const delta = valA - valB;

                  return (
                    <tr key={i} className="hover:bg-well/50 transition">
                      <td className="py-4 px-5 font-bold text-navy">
                        {isRTL && m.arabic_label ? m.arabic_label : m.label || m.domain}
                      </td>
                      <td className="py-4 px-5 text-center font-black text-navy">
                        {valA.toFixed(1)}
                      </td>
                      <td className="py-4 px-5 text-center font-black text-navy">
                        {valB.toFixed(1)}
                      </td>
                      <td className="py-4 px-5 text-right font-bold">
                        <span className={`text-xs px-2.5 py-1 rounded-pill ${
                          delta > 0
                            ? 'bg-emerald-50 text-emerald-600'
                            : delta < 0
                            ? 'bg-rose-50 text-danger'
                            : 'bg-well text-faded-ink'
                        }`}>
                          {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DecidixCard>
      ) : null}
    </div>
  );
};
