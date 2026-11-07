import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { insightsService } from '../../services/insightsService';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { PriorityBadge } from '../../components/PriorityBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { DecidixCard } from '../../components/DecidixCard';
import { StatWell } from '../../components/StatWell';
import { DecidixButton } from '../../components/DecidixButton';
import { useLanguage } from '../../context/LanguageContext';

export const PriorityQueueScreen: React.FC = () => {
  const { isRTL, t } = useLanguage();
  const [queue, setQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchQueue = async () => {
      try {
        setIsLoading(true);
        const data = await insightsService.getPriorityQueue(20);
        if (isMounted) setQueue(data?.queue || data || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchQueue();
    return () => {
      isMounted = false;
    };
  }, []);

  const criticalCount = queue.filter(
    (q) => (q.priority || '').toLowerCase() === 'critical'
  ).length;
  const highCount = queue.filter(
    (q) => (q.priority || '').toLowerCase() === 'high'
  ).length;
  const maxScore = queue.length > 0 ? (queue[0]?.need_score ?? queue[0]?.score ?? '—') : '—';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <TwoToneHeading
            eyebrow={isRTL ? 'ترتيب التدخلات التنموية' : 'TARGETED RANKING ENGINE'}
            first={isRTL ? 'طابور' : 'Development'}
            second={isRTL ? 'الأولويات التنموية' : 'Priority Queue'}
            level={1}
            className="text-3xl font-extrabold"
          />
          <p className="text-sm text-faded-ink mt-1">
            {isRTL
              ? 'ترتيب المناطق تنازلياً حسب درجة الحاجة الماسة للتدخل التنموي والاستثماري'
              : 'Targeted ranking prioritized strictly by composite developmental deficits'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner message={isRTL ? 'جارٍ فرز أولويات التدخل...' : 'Ranking priority queue...'} />
      ) : (
        <div className="space-y-6">
          {/* Top Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatWell
              label={isRTL ? 'المناطق في الطابور' : 'Queued Regions'}
              value={queue.length}
              subtext={isRTL ? 'مدرجة في مصفوفة التدخل' : 'In intervention matrix'}
            />
            <StatWell
              label={isRTL ? 'أولوية حرجة' : 'Critical Need'}
              value={criticalCount}
              subtext={isRTL ? 'تتطلب تدخلاً فورياً' : 'Immediate focus'}
            />
            <StatWell
              label={isRTL ? 'أولوية مرتفعة' : 'High Priority'}
              value={highCount}
              subtext={isRTL ? 'مستهدفة بالتمويل' : 'Targeted allocation'}
            />
            <StatWell
              label={isRTL ? 'أعلى مؤشر احتياج' : 'Peak Deficit Score'}
              value={maxScore}
              subtext={isRTL ? 'أعلى فجوة مسجلة' : 'Max recorded gap'}
            />
          </div>

          <DecidixCard variant="card" className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs font-bold text-faded-ink uppercase">
                    <th className="py-3 px-4">{isRTL ? 'الأولوية' : 'Rank'}</th>
                    <th className="py-3 px-4">{isRTL ? 'المنطقة' : 'Region'}</th>
                    <th className="py-3 px-4">{isRTL ? 'درجة الاحتياج' : 'Need Score'}</th>
                    <th className="py-3 px-4">{isRTL ? 'القطاع الأكثر تضرراً' : 'Primary Gap Domain'}</th>
                    <th className="py-3 px-4">{isRTL ? 'التصنيف' : 'Priority Class'}</th>
                    <th className="py-3 px-4 text-right">{isRTL ? 'الإجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {queue.map((item, idx) => (
                    <tr key={idx} className="hover:bg-well/50 transition">
                      <td className="py-3.5 px-4 font-bold text-navy">
                        <span className="w-7 h-7 rounded-full bg-rose-50 text-danger border border-rose-200/60 flex items-center justify-center font-bold text-xs">
                          #{idx + 1}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-navy">
                        <Link to={`/regions/${item.region_id}`} className="hover:text-blue hover:underline">
                          {t(item, 'name')}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-black text-danger text-base">
                        {item.need_score ?? item.score}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-ink capitalize">
                        {item.primary_gap || item.domain || 'Infrastructure & Health'}
                      </td>
                      <td className="py-3.5 px-4">
                        <PriorityBadge priority={item.priority || 'high'} isArabic={isRTL} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link to={`/regions/${item.region_id}`}>
                          <DecidixButton variant="outlined" size="sm">
                            {isRTL ? 'فحص الملف' : 'Inspect'} →
                          </DecidixButton>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DecidixCard>
        </div>
      )}
    </div>
  );
};
