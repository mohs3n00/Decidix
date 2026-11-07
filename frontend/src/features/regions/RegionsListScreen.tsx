import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { overviewService } from '../../services/overviewService';
import { RegionListItem, PriorityLevel } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { PriorityBadge } from '../../components/PriorityBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { DecidixIcon } from '../../components/DecidixIcon';
import { useLanguage } from '../../context/LanguageContext';

export const RegionsListScreen: React.FC = () => {
  const { isRTL, t } = useLanguage();
  const [regions, setRegions] = useState<RegionListItem[]>([]);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchRegions = async () => {
      try {
        setIsLoading(true);
        const res = await overviewService.getRegions({
          q: search,
          priority: priorityFilter,
          per_page: 50,
        });
        if (isMounted) setRegions(res.items || []);
      } catch (err) {
        console.error('Failed to load regions:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchRegions();
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [search, priorityFilter]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <TwoToneHeading
            first={isRTL ? 'دليل' : 'Regions'}
            second={isRTL ? 'المحافظات والمناطق' : 'Directory'}
            level={1}
            className="text-3xl font-extrabold"
          />
          <p className="text-sm text-faded-ink mt-1">
            {isRTL
              ? 'ترتيب المحافظات والمناطق حسب درجات المؤشر التنموي الموحد والأولويات'
              : 'Complete ranking of Egyptian administrative territories sorted by composite performance'}
          </p>
        </div>

        <Link to="/map" className="decidix-btn-secondary text-xs self-start">
          <DecidixIcon name="location" size={14} color="currentColor" />
          <span>{isRTL ? 'الخريطة التفاعلية' : 'Interactive Map'}</span>
        </Link>
      </div>

      {/* Search and Filters Bar */}
      <div className="decidix-card p-4 flex flex-col sm:flex-row items-center gap-4 bg-white">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-ink">
            <DecidixIcon name="search" size={16} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isRTL ? 'ابحث باسم المحافظة أو المنطقة...' : 'Search region by name (e.g. Cairo, Alexandria)...'}
            className="decidix-input pl-10"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 bg-well rounded-pill">
          {['all', 'critical', 'high', 'medium', 'low'].map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1.5 text-xs font-bold rounded-pill transition uppercase ${
                priorityFilter === p
                  ? 'bg-blue text-white shadow-sm'
                  : 'text-ink hover:text-navy hover:bg-line'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Regions Ranking Table */}
      <div className="decidix-card p-6">
        {isLoading ? (
          <LoadingSpinner message={isRTL ? 'جارٍ تحميل السجلات الإقليمية...' : 'Loading regions ranking...'} />
        ) : regions.length === 0 ? (
          <div className="text-center py-12 text-ink">
            <p className="font-semibold">{isRTL ? 'لم يتم العثور على مناطق مطابقة لبحثك.' : 'No matching regions found.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-bold text-faded-ink uppercase">
                  <th className="py-3 px-4">{isRTL ? 'الترتيب' : 'Rank'}</th>
                  <th className="py-3 px-4">{isRTL ? 'المنطقة' : 'Region'}</th>
                  <th className="py-3 px-4">{isRTL ? 'المؤشر التنموي' : 'Score'}</th>
                  <th className="py-3 px-4">{isRTL ? 'التغير' : 'Change'}</th>
                  <th className="py-3 px-4">{isRTL ? 'السكان' : 'Population'}</th>
                  <th className="py-3 px-4">{isRTL ? 'مستوى الأولوية' : 'Priority'}</th>
                  <th className="py-3 px-4 text-right">{isRTL ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {regions.map((r) => (
                  <tr key={r.region_id} className="hover:bg-well/50 transition">
                    <td className="py-4 px-4 font-bold text-navy">
                      <span className="w-7 h-7 rounded-full bg-well flex items-center justify-center border border-line text-xs font-black">
                        #{r.rank}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <Link
                        to={`/regions/${r.region_id}`}
                        className="font-bold text-navy hover:text-blue hover:underline text-base"
                      >
                        {t(r, 'name')}
                      </Link>
                    </td>
                    <td className="py-4 px-4 font-black text-navy text-base">
                      {r.score.toFixed(1)}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-pill ${
                          r.change >= 0
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        <DecidixIcon
                          name={r.change >= 0 ? 'trend_up' : 'trend_down'}
                          size={12}
                          color={r.change >= 0 ? '#059669' : '#DC2626'}
                        />
                        <span>{r.change >= 0 ? '+' : ''}{r.change.toFixed(1)}</span>
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs font-semibold text-ink">
                      {r.population ? (r.population / 1_000_000).toFixed(1) + 'M' : 'N/A'}
                    </td>
                    <td className="py-4 px-4">
                      <PriorityBadge priority={r.priority} isArabic={isRTL} />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Link
                        to={`/regions/${r.region_id}`}
                        className="decidix-btn-secondary text-xs py-1.5 px-3"
                      >
                        {isRTL ? 'تفاصيل' : 'Profile'} →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
