import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { decisionsService } from '../../services/decisionsService';
import { DevelopmentProject, CitizenReport } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { HeroCard } from '../../components/HeroCard';
import { DecidixCard } from '../../components/DecidixCard';
import { DecidixButton } from '../../components/DecidixButton';
import { PriorityBadge } from '../../components/PriorityBadge';
import { HatchedBar } from '../../components/HatchedBar';
import { SkeletonCard } from '../../components/Skeleton';
import { DecidixIcon } from '../../components/DecidixIcon';
import { useLanguage } from '../../context/LanguageContext';

export const DecisionsScreen: React.FC = () => {
  const { isRTL, t } = useLanguage();
  const [projects, setProjects] = useState<DevelopmentProject[]>([]);
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [projRes, repRes] = await Promise.all([
          decisionsService.getProjects({ per_page: 4 }),
          decisionsService.getCitizenReports({ per_page: 4 }),
        ]);
        if (isMounted) {
          setProjects(projRes.items || []);
          setReports(repRes.items || []);
        }
      } catch {
        // Fallback gracefully
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-7 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue mb-1">
            {isRTL
              ? 'أدوات المحاكاة الاستراتيجية وتتبع المشاريع'
              : 'STRATEGIC POLICY SIMULATION & CAPITAL PROJECTS'}
          </div>
          <TwoToneHeading
            first={isRTL ? 'صنع' : 'Decisions'}
            second={isRTL ? 'القرار والتخطيط' : 'Hub'}
            level={1}
            className="text-2xl md:text-3xl font-bold"
          />
        </div>

        <Link to="/decisions/simulator">
          <DecidixButton variant="primary" compact>
            <DecidixIcon name="decisions" size={14} color="#FFFFFF" />
            <span>{isRTL ? 'فتح محاكي الميزانية' : 'Launch Budget Simulator'}</span>
          </DecidixButton>
        </Link>
      </div>

      {/* Signature Hero Card for Budget Simulator */}
      <HeroCard>
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 border border-slate-200/80 text-blue text-xs font-bold shadow-2xs">
            <DecidixIcon name="spark" size={14} color="var(--color-blue)" />
            <span>{isRTL ? 'محاكاة السياسات والميزانية' : 'Quantitative Policy Simulation'}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-navy">
            {isRTL
              ? 'كيف تؤثر استثماراتك على مؤشرات التنمية؟'
              : 'Simulate Budget Reallocations in Real Time'}
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {isRTL
              ? 'اختبر سيناريوهات إعادة توزيع مخصصات الموازنة العامة بين الصحة والتعليم والبنية التحتية، وشاهد التأثير الرياضي المتوقع على المؤشر التنموي المركب.'
              : 'Model dynamic budget interventions across health, education, and infrastructure to observe statistically predicted regional index outcomes.'}
          </p>

          <div className="pt-2">
            <Link to="/decisions/simulator">
              <DecidixButton variant="brand" compact>
                <span>{isRTL ? 'بدء تشغيل المحاكي التفاعلي' : 'Start What-If Simulation'}</span>
                <DecidixIcon name="arrow_right" size={13} color="currentColor" />
              </DecidixButton>
            </Link>
          </div>
        </div>
      </HeroCard>

      {/* Dual Grid: Projects Portfolio & Frontline Citizen Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Projects Portfolio */}
        <DecidixCard variant="card" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-navy">
                  {isRTL ? 'سجل المشاريع التنموية' : 'Development Capital Projects'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isRTL ? 'متابعة نسب إنجاز المشروعات الميدانية' : 'Active public investments and execution progress'}
                </p>
              </div>
              <Link to="/decisions/projects" className="text-xs font-semibold text-blue hover:underline">
                {isRTL ? 'عرض الكل' : 'View all'}
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
                <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
              </div>
            ) : projects.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                {isRTL ? 'لا توجد مشاريع مسجلة حالياً' : 'No active projects found.'}
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70 hover:border-slate-300 transition-colors duration-150 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-navy truncate max-w-[200px]">
                          {isRTL && proj.arabic_title ? proj.arabic_title : proj.title}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200/80 uppercase">
                          {proj.domain}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-blue tabular-nums">{proj.progress_percent}%</span>
                    </div>

                    <HatchedBar percentage={proj.progress_percent} height={6} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </DecidixCard>

        {/* Citizen Reports */}
        <DecidixCard variant="card" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-navy">
                  {isRTL ? 'مشاركات وتقارير المواطنين' : 'Citizen Intelligence Reports'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isRTL ? 'ملاحظات ميدانية وبلاغات سد الفجوات' : 'Crowdsourced observations and localized feedback'}
                </p>
              </div>
              <Link to="/decisions/citizen-reports" className="text-xs font-semibold text-blue hover:underline">
                {isRTL ? 'عرض الكل' : 'View all'}
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
                <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
              </div>
            ) : reports.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                {isRTL ? 'لا توجد تقارير واردة حالياً' : 'No citizen reports found.'}
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70 hover:border-slate-300 transition-colors duration-150 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-navy truncate max-w-[220px]">
                        {isRTL && rep.arabic_title ? rep.arabic_title : rep.title}
                      </span>
                      <PriorityBadge priority={rep.priority} isArabic={isRTL} />
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {isRTL && rep.arabic_description ? rep.arabic_description : rep.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 pt-3.5 border-t border-slate-100 text-xs text-slate-500">
            {isRTL
              ? 'تخضع البلاغات للتحقق الجغرافي والربط التلقائي بأولويات التدخل.'
              : 'Signals are geocoded and mapped to priority intervention matrices.'}
          </div>
        </DecidixCard>
      </div>
    </div>
  );
};
