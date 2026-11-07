import React, { useState, useEffect } from 'react';
import { insightsService } from '../../services/insightsService';
import { Sector } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
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
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <TwoToneHeading
            first={isRTL ? 'المسار' : 'Historical'}
            second={isRTL ? 'الزمني الطولي' : 'Trends'}
            level={1}
            className="text-3xl font-extrabold"
          />
          <p className="text-sm text-faded-ink mt-1">
            {isRTL
              ? 'تتبع تطور المؤشرات عبر السنوات المتتالية ورصد التحولات الهيكلية'
              : 'Multi-year longitudinal trajectory and structural evolution across domains'}
          </p>
        </div>

        {/* Sector and Range Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value as Sector)}
            className="decidix-input font-bold text-xs py-1.5 px-3 w-auto"
          >
            <option value="overall">{isRTL ? 'المؤشر العام' : 'Overall Index'}</option>
            <option value="education">{isRTL ? 'التعليم' : 'Education'}</option>
            <option value="healthcare">{isRTL ? 'الصحة' : 'Healthcare'}</option>
            <option value="economy">{isRTL ? 'الاقتصاد' : 'Economy'}</option>
            <option value="infrastructure">{isRTL ? 'البنية التحتية' : 'Infrastructure'}</option>
          </select>

          <div className="flex items-center gap-1 p-1 bg-white border border-line rounded-pill">
            {['3Y', '5Y', '7Y'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 text-xs font-bold rounded-pill transition ${
                  range === r ? 'bg-blue text-white' : 'text-ink hover:text-navy'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner message={isRTL ? 'جارٍ تجميع السلاسل التاريخية...' : 'Aggregating longitudinal series...'} />
      ) : (
        <div className="decidix-card p-6 md:p-8 bg-white">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-navy text-lg">
              {isRTL ? 'مسارات الأداء التنموي عبر الزمن' : 'Longitudinal Performance Trajectory'}
            </h3>
            <span className="text-xs font-semibold text-faded-ink">
              {range} Horizon
            </span>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={isRTL ? 'قيمة المؤشر' : 'Index Score'}
                  stroke="#2563EB"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
