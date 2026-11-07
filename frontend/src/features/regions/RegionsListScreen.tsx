import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { overviewService } from '../../services/overviewService';
import { RegionListItem, PriorityLevel } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { DecidixCard } from '../../components/DecidixCard';
import { DecidixChip } from '../../components/DecidixChip';
import { DecidixButton } from '../../components/DecidixButton';
import { PriorityBadge } from '../../components/PriorityBadge';
import { ScoreRing } from '../../components/ScoreRing';
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

  const FILTER_OPTIONS = [
    { id: 'all', labelEn: 'All Priorities', labelAr: 'جميع الأولويات' },
    { id: 'critical', labelEn: 'Critical', labelAr: 'حرجة' },
    { id: 'high', labelEn: 'High Priority', labelAr: 'أولوية مرتفعة' },
    { id: 'medium', labelEn: 'Medium', labelAr: 'متوسطة' },
    { id: 'low', labelEn: 'Low Priority', labelAr: 'مستقرة' },
  ];

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="type-eyebrow mb-1">
            {isRTL
              ? 'دليل المحافظات والمناطق التنموية في مصر'
              : 'Complete directory of Egyptian administrative territories'}
          </div>
          <TwoToneHeading
            first={isRTL ? 'دليل' : 'Regions'}
            second={isRTL ? 'المحافظات والمناطق' : 'Directory'}
            level={1}
            className="type-heading-page"
          />
        </div>

        <Link to="/map">
          <DecidixButton variant="outlined" compact>
            <DecidixIcon name="location" size={14} color="var(--color-blue)" />
            <span>{isRTL ? 'عرض الخريطة التفاعلية' : 'Interactive Map'}</span>
          </DecidixButton>
        </Link>
      </div>

      {/* Search and Filters Bar */}
      <DecidixCard variant="row" className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-3.5 rtl:left-auto rtl:right-3.5 flex items-center pointer-events-none text-ink">
            <DecidixIcon name="search" size={15} color="var(--color-ink)" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              isRTL
                ? 'ابحث باسم المحافظة أو المنطقة...'
                : 'Search region by name (e.g. Cairo, Alexandria, Aswan)...'
            }
            className="decidix-input pl-10 rtl:pl-4 rtl:pr-10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
          {FILTER_OPTIONS.map((opt) => (
            <DecidixChip
              key={opt.id}
              label={isRTL ? opt.labelAr : opt.labelEn}
              selected={priorityFilter === opt.id}
              onClick={() => setPriorityFilter(opt.id)}
            />
          ))}
        </div>
      </DecidixCard>

      {/* Regions Data Table */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner message={isRTL ? 'جارٍ تحميل دليل المناطق...' : 'Retrieving regional directory...'} />
        </div>
      ) : regions.length === 0 ? (
        <DecidixCard variant="card" className="p-12 text-center text-ink">
          <p className="font-bold text-base mb-1">
            {isRTL ? 'لم يتم العثور على مناطق مطابقة' : 'No matching regions found'}
          </p>
          <p className="text-xs text-faded-ink">
            {isRTL
              ? 'يرجى تجربة كلمات بحث أخرى أو تعديل فلتر الأولويات.'
              : 'Try adjusting your search criteria or resetting the priority filter.'}
          </p>
        </DecidixCard>
      ) : (
        <DecidixCard variant="card" className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-well text-xs font-semibold text-faded-ink uppercase border-b border-hairline">
                  <th className="py-3.5 px-4 w-16 text-center">{isRTL ? 'الترتيب' : 'Rank'}</th>
                  <th className="py-3.5 px-4">{isRTL ? 'المنطقة / المحافظة' : 'Territory / Governorate'}</th>
                  <th className="py-3.5 px-4">{isRTL ? 'درجة المؤشر' : 'Composite Score'}</th>
                  <th className="py-3.5 px-4">{isRTL ? 'مستوى الأولوية' : 'Intervention Priority'}</th>
                  <th className="py-3.5 px-4 text-center">{isRTL ? 'الإجراء' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {regions.map((r) => (
                  <tr key={r.region_id} className="hover:bg-well/50 transition">
                    <td className="py-4 px-4 text-center">
                      <span className="w-7 h-7 rounded-full bg-well text-navy font-bold text-xs inline-flex items-center justify-center border border-hairline">
                        #{r.rank}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <Link
                        to={`/regions/${r.region_id}`}
                        className="font-bold text-navy hover:text-blue transition block"
                      >
                        {t(r, 'name')}
                      </Link>
                      <span className="text-xs text-faded-ink font-mono">{r.region_id}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <ScoreRing score={r.score} size={36} strokeWidth={3.5} />
                        <span className="font-black text-navy text-base">{r.score.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <PriorityBadge priority={r.priority} isArabic={isRTL} />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Link
                        to={`/regions/${r.region_id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue hover:underline"
                      >
                        <span>{isRTL ? 'عرض الملف' : 'View Dossier'}</span>
                        <span>→</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-well/40 border-t border-hairline flex items-center justify-between text-xs text-faded-ink">
            <span>
              {isRTL
                ? `إجمالي المناطق المسجلة: ${regions.length}`
                : `Showing ${regions.length} verified regions in national directory`}
            </span>
          </div>
        </DecidixCard>
      )}
    </div>
  );
};
