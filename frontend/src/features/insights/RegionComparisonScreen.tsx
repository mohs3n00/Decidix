import React, { useState, useEffect } from 'react';
import { insightsService } from '../../services/insightsService';
import { overviewService } from '../../services/overviewService';
import { RegionListItem } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
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
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <TwoToneHeading
            first={isRTL ? 'مقارنة' : 'Region'}
            second={isRTL ? 'المحافظات' : 'Comparison'}
            level={1}
            className="text-3xl font-extrabold"
          />
          <p className="text-sm text-faded-ink mt-1">
            {isRTL
              ? 'مقارنة إحصائية مباشرة بين منطقتين عبر المؤشر العام وكافة القطاعات التنموية'
              : 'Direct side-by-side indicator benchmark between two selected administrative territories'}
          </p>
        </div>
      </div>

      {/* Region Selectors Card */}
      <div className="decidix-card p-6 bg-white grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
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
      </div>

      {/* Comparison Metrics Table */}
      {isLoading ? (
        <LoadingSpinner message={isRTL ? 'جارٍ مقارنة البيانات...' : 'Calculating comparative indicators...'} />
      ) : comparison ? (
        <div className="decidix-card p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-bold text-faded-ink uppercase">
                  <th className="py-3 px-4">{isRTL ? 'القطاع / المؤشر' : 'Domain / Indicator'}</th>
                  <th className="py-3 px-4 text-center font-black text-blue">{comparison.region_a?.name || 'Region A'}</th>
                  <th className="py-3 px-4 text-center font-black text-cyan text-slate-800">{comparison.region_b?.name || 'Region B'}</th>
                  <th className="py-3 px-4 text-right">{isRTL ? 'الفارق' : 'Net Delta'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {comparison.metrics?.map((m: any, i: number) => {
                  const valA = m.value_a ?? m.score_a ?? 0;
                  const valB = m.value_b ?? m.score_b ?? 0;
                  const delta = valA - valB;

                  return (
                    <tr key={i} className="hover:bg-well/50 transition">
                      <td className="py-3.5 px-4 font-bold text-navy">
                        {isRTL && m.arabic_label ? m.arabic_label : m.label || m.domain}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-navy">
                        {valA.toFixed(1)}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-navy">
                        {valB.toFixed(1)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black">
                        <span className={`text-xs px-2.5 py-1 rounded-pill ${
                          delta > 0
                            ? 'bg-blue/10 text-blue'
                            : delta < 0
                            ? 'bg-rose-50 text-rose-600'
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
        </div>
      ) : null}
    </div>
  );
};
