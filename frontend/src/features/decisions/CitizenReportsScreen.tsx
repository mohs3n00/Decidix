import React, { useState, useEffect } from 'react';
import { decisionsService } from '../../services/decisionsService';
import { CitizenReport, ReportCategory } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { DecidixCard } from '../../components/DecidixCard';
import { DecidixChip } from '../../components/DecidixChip';
import { StatWell } from '../../components/StatWell';
import { PriorityBadge } from '../../components/PriorityBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { DecidixIcon } from '../../components/DecidixIcon';
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

  const CATEGORY_TABS: Array<{ id: ReportCategory; labelEn: string; labelAr: string }> = [
    { id: 'all', labelEn: 'All Signals', labelAr: 'جميع البلاغات' },
    { id: 'education', labelEn: 'Education', labelAr: 'التعليم' },
    { id: 'healthcare', labelEn: 'Healthcare', labelAr: 'الصحة' },
    { id: 'infrastructure', labelEn: 'Infrastructure', labelAr: 'المرافق والخدمات' },
    { id: 'economy', labelEn: 'Jobs & Living', labelAr: 'المعيشة والوظائف' },
  ];

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="type-eyebrow mb-1">
            {isRTL
              ? 'بلاغات المواطنين وإشارات الاحتياج الميداني'
              : 'Frontline citizen feedback & grassroots service deficit signals'}
          </div>
          <TwoToneHeading
            first={isRTL ? 'بلاغات' : 'Citizen'}
            second={isRTL ? 'المواطنين الميدانية' : 'Reports'}
            level={1}
            className="type-heading-page"
          />
        </div>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORY_TABS.map((tab) => (
            <DecidixChip
              key={tab.id}
              label={isRTL ? tab.labelAr : tab.labelEn}
              selected={category === tab.id}
              onClick={() => setCategory(tab.id)}
            />
          ))}
        </div>
      </div>

      {/* Summary Stat Wells */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatWell
          value={reports.length}
          label={isRTL ? 'إجمالي البلاغات' : 'Total Signals'}
        />
        <StatWell
          value={reports.filter((r) => r.status === 'open').length}
          label={isRTL ? 'بلاغات مفتوحة' : 'Open / Unresolved'}
        />
        <StatWell
          value={reports.filter((r) => r.priority === 'critical' || r.priority === 'high').length}
          label={isRTL ? 'أولوية عاجلة' : 'High Priority'}
        />
        <StatWell
          value={reports.reduce((acc, r) => acc + (r.likes_count || 0), 0)}
          label={isRTL ? 'تأييدات المواطنين' : 'Citizen Endorsements'}
        />
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner message={isRTL ? 'جارٍ استرجاع بلاغات المواطنين...' : 'Loading citizen signals...'} />
        </div>
      ) : reports.length === 0 ? (
        <DecidixCard variant="card" className="p-12 text-center text-ink">
          <p className="font-bold text-base mb-1">
            {isRTL ? 'لا توجد بلاغات مسجلة في هذا القطاع' : 'No citizen feedback registered for this filter.'}
          </p>
        </DecidixCard>
      ) : (
        <div className="space-y-3.5">
          {reports.map((rep) => (
            <DecidixCard
              key={rep.id}
              variant="row"
              className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-5"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge priority={rep.priority} isArabic={isRTL} />
                  <span className="text-xs font-bold text-navy uppercase px-2 py-0.5 rounded bg-well border border-hairline">
                    {rep.category}
                  </span>
                  <span className="text-xs text-faded-ink font-mono">
                    Region: {rep.region_id}
                  </span>
                  <span className="text-[11px] text-faded-ink">
                    • {new Date(rep.created_at).toLocaleDateString()}
                  </span>
                </div>

                <p className="type-body-m text-navy leading-relaxed font-medium">
                  {isRTL && rep.arabic_description ? rep.arabic_description : rep.description}
                </p>

                {rep.address && (
                  <div className="text-xs text-faded-ink flex items-center gap-1">
                    <DecidixIcon name="location" size={13} color="var(--color-ink)" />
                    <span>{rep.address}</span>
                  </div>
                )}
              </div>

              {/* Citizen Endorsement Upvote */}
              <button
                onClick={() => handleToggleLike(rep.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-bold transition border shrink-0 ${
                  rep.liked_by_me
                    ? 'bg-blue text-white border-blue shadow-sm'
                    : 'bg-well text-navy border-hairline hover:bg-hairline'
                }`}
              >
                <span>▲</span>
                <span>{rep.likes_count || 0}</span>
                <span className="text-[10px] opacity-80">{isRTL ? 'تأييد' : 'Endorse'}</span>
              </button>
            </DecidixCard>
          ))}
        </div>
      )}
    </div>
  );
};
