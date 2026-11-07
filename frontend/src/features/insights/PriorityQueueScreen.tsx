import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { insightsService } from '../../services/insightsService';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { PriorityBadge } from '../../components/PriorityBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <TwoToneHeading
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
        <div className="decidix-card p-6">
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
                      <span className="w-7 h-7 rounded-full bg-rose-100 text-danger flex items-center justify-center font-bold text-xs">
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
                      <Link
                        to={`/regions/${item.region_id}`}
                        className="decidix-btn-secondary text-xs py-1.5 px-3"
                      >
                        {isRTL ? 'فحص الملف' : 'Inspect'} →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
