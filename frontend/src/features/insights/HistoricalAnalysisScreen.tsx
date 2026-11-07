import React, { useState, useEffect } from 'react';
import { insightsService } from '../../services/insightsService';
import { Sector } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { HeroCard } from '../../components/HeroCard';
import { DecidixCard } from '../../components/DecidixCard';
import { DecidixChip } from '../../components/DecidixChip';
import { StatWell } from '../../components/StatWell';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export const HistoricalAnalysisScreen: React.FC = () => {
  const { isRTL } = useLanguage();
  const [sector, setSector] = useState<Sector>('overall');
  const [range, setRange] = useState<string>('5Y');
  const [historyData, setHistoryData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const data = await insightsService.getHistorical(sector, range);
        if (isMounted) setHistoryData(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [sector, range]);

  const series = historyData?.series || [];

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="type-eyebrow mb-1">
            {isRTL
              ? 'تتبع تطور المؤشرات عبر السنوات المتتالية'
              : 'Multi-year longitudinal trajectory and structural evolution across domains'}
          </div>
          <TwoToneHeading
            first={isRTL ? 'المسار' : 'Historical'}
            second={isRTL ? 'الزمني الطولي' : 'Trends'}
            level={1}
            className="type-heading-page"
          />
        </div>

        {/* Range & Sector Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value as Sector)}
            className="decidix-input font-bold text-xs py-2 px-3 w-auto bg-white border-hairline shadow-sm"
          >
            <option value="overall">{isRTL ? 'المؤشر العام' : 'Overall Index'}</option>
            <option value="education">{isRTL ? 'التعليم' : 'Education'}</option>
            <option value="healthcare">{isRTL ? 'الصحة' : 'Healthcare'}</option>
            <option value="infrastructure">{isRTL ? 'البنية التحتية' : 'Infrastructure'}</option>
            <option value="economy">{isRTL ? 'الاقتصاد' : 'Economy'}</option>
          </select>

          {['3Y', '5Y', '7Y', 'All'].map((r) => (
            <DecidixChip
              key={r}
              label={r}
              selected={range === r}
              onClick={() => setRange(r)}
            />
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner message={isRTL ? 'جارٍ استرجاع السلسلة الزمنية...' : 'Loading longitudinal series...'} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Trajectory Card */}
          <HeroCard>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="type-heading-section text-navy">
                    {sector.toUpperCase()} {isRTL ? 'مسار المؤشر عبر الزمن' : 'Longitudinal Trajectory'}
                  </h3>
                  <p className="text-xs text-faded-ink mt-0.5">
                    {isRTL ? 'المتوسط الوطني مقارنة بمجموع المحافظات' : 'Tracking annual observations vs national benchmark'}
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-pill bg-white text-blue border border-white shadow-sm">
                  {range} Series
                </span>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} iconType="circle" />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name={isRTL ? 'المتوسط الوطني' : 'National Index Average'}
                      stroke="var(--color-blue)"
                      strokeWidth={3}
                      dot={{ r: 4, fill: 'var(--color-blue)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </HeroCard>

          {/* Regional Summary Table */}
          {historyData?.breakdowns && (
            <DecidixCard variant="card" className="p-0 overflow-hidden">
              <div className="p-5 border-b border-hairline">
                <h3 className="type-heading-section text-navy">
                  {isRTL ? 'تطور أداء الأقاليم عبر السلسلة' : 'Regional Longitudinal Shifts'}
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-well text-faded-ink font-semibold uppercase border-b border-hairline">
                      <th className="py-3 px-4">{isRTL ? 'المنطقة' : 'Region'}</th>
                      <th className="py-3 px-4">{isRTL ? 'خط الأساس' : 'Baseline'}</th>
                      <th className="py-3 px-4">{isRTL ? 'المستوى الحالي' : 'Latest'}</th>
                      <th className="py-3 px-4">{isRTL ? 'صافي التغير' : 'Net Accretion'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {historyData.breakdowns.map((b: any) => (
                      <tr key={b.region_id} className="hover:bg-well/40 transition">
                        <td className="py-3.5 px-4 font-bold text-navy">{b.name}</td>
                        <td className="py-3.5 px-4 text-faded-ink">{b.baseline}</td>
                        <td className="py-3.5 px-4 font-black text-navy">{b.latest}</td>
                        <td className="py-3.5 px-4">
                          <span className={`font-bold ${b.delta >= 0 ? 'text-emerald-600' : 'text-danger'}`}>
                            {b.delta >= 0 ? '+' : ''}{b.delta} pts
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DecidixCard>
          )}
        </div>
      )}
    </div>
  );
};
