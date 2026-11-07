import React, { useState, useEffect } from 'react';
import { decisionsService } from '../../services/decisionsService';
import { CitizenReport, ReportCategory } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';

export const CitizenReportsScreen: React.FC = () => {
  const { isRTL, t } = useLanguage();
  const [category, setCategory] = useState<ReportCategory>('all');
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [summary, setSummary] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchReports = async () => {
      try {
        setIsLoading(true);
        const res = await decisionsService.getCitizenReports({
          category,
          per_page: 50,
        });
        if (isMounted) {
          setReports(res.items || []);
          setSummary(res.summary || null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchReports();
    return () => {
      isMounted = false;
    };
  }, [category]);

  const handleToggleLike = async (id: string) => {
    try {
      const updated = await decisionsService.toggleLikeReport(id);
      setReports((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                liked_by_me: updated.liked_by_me,
                likes_count: updated.likes_count,
              }
            : r
        )
      );
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <TwoToneHeading
            first={isRTL ? 'بلاغات' : 'Frontline'}
            second={isRTL ? 'وشكاوى المواطنين' : 'Citizen Reports'}
            level={1}
            className="text-3xl font-extrabold"
          />
          <p className="text-sm text-faded-ink mt-1">
            {isRTL
              ? 'نبض الشارع المباشر ورصد المشكلات التنموية والخدمية في المحافظات'
              : 'Direct citizen feedback on road conditions, water access, and school infrastructure'}
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1 p-1 bg-white border border-line rounded-pill">
          {(['all', 'roads', 'health', 'schools', 'water'] as ReportCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 text-xs font-bold rounded-pill transition capitalize ${
                category === cat
                  ? 'bg-blue text-white shadow-sm'
                  : 'text-ink hover:text-navy hover:bg-well'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner message={isRTL ? 'جارٍ تحميل بلاغات المواطنين...' : 'Loading citizen signals...'} />
      ) : reports.length === 0 ? (
        <div className="decidix-card p-12 text-center text-ink">
          <p className="font-semibold">{isRTL ? 'لا توجد بلاغات مسجلة في هذا التصنيف.' : 'No citizen reports found.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((rep) => (
            <div key={rep.id} className="decidix-card p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue bg-blue/10 px-2.5 py-1 rounded-pill">
                    {rep.category}
                  </span>
                  <span
                    className={`decidix-pill-badge text-[10px] font-bold ${
                      rep.status === 'resolved'
                        ? 'bg-emerald-50 text-emerald-600'
                        : rep.status === 'escalated'
                        ? 'bg-rose-50 text-danger'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {rep.status.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="font-bold text-navy text-base mb-2">
                  {t(rep, 'title')}
                </h3>
                <p className="text-xs text-ink mb-4 leading-relaxed line-clamp-3">
                  {rep.description}
                </p>

                <div className="text-xs text-faded-ink mb-4">
                  📍 <strong className="text-navy">{t(rep.region, 'name')}</strong>
                </div>
              </div>

              <div className="pt-4 border-t border-line flex items-center justify-between">
                <button
                  onClick={() => handleToggleLike(rep.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-bold transition ${
                    rep.liked_by_me
                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                      : 'bg-well text-ink hover:bg-line'
                  }`}
                >
                  <span>{rep.liked_by_me ? '❤️' : '🤍'}</span>
                  <span>{rep.likes_count}</span>
                </button>

                <span className="text-[11px] text-faded-ink">
                  {rep.created_at ? new Date(rep.created_at).toLocaleDateString() : 'Recent'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
