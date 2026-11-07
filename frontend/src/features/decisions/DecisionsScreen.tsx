import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { decisionsService } from '../../services/decisionsService';
import { DevelopmentProject, CitizenReport } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { LoadingSpinner } from '../../components/LoadingSpinner';
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
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <TwoToneHeading
            first={isRTL ? 'صنع' : 'Decisions'}
            second={isRTL ? 'القرار والتخطيط' : 'Hub'}
            level={1}
            className="text-3xl font-extrabold"
          />
          <p className="text-sm text-faded-ink mt-1">
            {isRTL
              ? 'أدوات المحاكاة الاستراتيجية، تتبع مشاريع التنمية الإقليمية، وبلاغات المواطنين الميدانية'
              : 'Interactive policy simulation, regional capital projects, and frontline citizen signals'}
          </p>
        </div>

        <Link to="/decisions/simulator" className="decidix-btn-primary text-xs">
          <DecidixIcon name="decisions" size={14} color="#FFFFFF" />
          <span>{isRTL ? 'فتح محاكي الميزانية' : 'Launch Budget Simulator'}</span>
        </Link>
      </div>

      {/* Simulator Hero Card */}
      <div className="decidix-card p-6 md:p-8 bg-gradient-to-r from-navy via-navy to-[#0F2B59] text-white">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-white/10 text-cyan text-xs font-bold">
            <DecidixIcon name="spark" size={14} color="#21EAF4" />
            <span>{isRTL ? 'محاكاة السياسات والميزانية' : 'Quantitative Policy Simulation'}</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            {isRTL
              ? 'كيف تؤثر استثماراتك على مؤشرات التنمية؟'
              : 'Simulate Budget Reallocations in Real Time'}
          </h2>

          <p className="text-sm text-white/80 leading-relaxed">
            {isRTL
              ? 'قم باختبار سيناريوهات توزيع المخصصات المالية على قطاعات التعليم والصحة والبنية التحتية وفرص العمل واكتشف العائد التنموي المحسوب بدقة.'
              : 'Adjust budget allocations across education, healthcare, infrastructure, and jobs to observe projected impact on composite regional indices.'}
          </p>

          <div className="pt-2">
            <Link
              to="/decisions/simulator"
              className="decidix-btn-primary bg-cyan text-navy hover:bg-white text-xs font-bold px-6"
            >
              {isRTL ? 'ابدأ تجربة السيناريو الآن ←' : 'Start What-If Simulation →'}
            </Link>
          </div>
        </div>
      </div>

      {/* Split Grid: Projects & Citizen Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Development Projects Preview */}
        <div className="decidix-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DecidixIcon name="economy" size={18} color="#2563EB" />
                <h3 className="font-bold text-navy text-base">
                  {isRTL ? 'مشاريع التنمية الإقليمية' : 'Development Projects'}
                </h3>
              </div>
              <Link to="/decisions/projects" className="text-xs font-semibold text-blue hover:underline">
                {isRTL ? 'عرض الكل' : 'View all'}
              </Link>
            </div>

            {isLoading ? (
              <LoadingSpinner message="" />
            ) : projects.length === 0 ? (
              <p className="text-sm text-faded-ink p-4 text-center">{isRTL ? 'لا توجد مشاريع' : 'No projects found'}</p>
            ) : (
              <div className="space-y-3">
                {projects.map((proj) => (
                  <div key={proj.id} className="p-3.5 rounded-well bg-well space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-navy">{t(proj, 'title')}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-pill bg-white text-navy border border-line capitalize">
                        {proj.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-faded-ink">
                      <span>{t(proj.region, 'name')}</span>
                      <span>${(proj.budget.amount / 1_000_000).toFixed(1)}M</span>
                    </div>

                    <div className="w-full h-1.5 bg-line rounded-pill overflow-hidden">
                      <div
                        className="h-full bg-blue rounded-pill"
                        style={{ width: `${proj.progress_percent}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-line text-xs text-faded-ink mt-4">
            {isRTL ? 'تتبع الإنجاز الزمني ونسب الصرف المالي.' : 'Real-time timeline and expenditure milestones.'}
          </div>
        </div>

        {/* Citizen Reports Preview */}
        <div className="decidix-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DecidixIcon name="notifications" size={18} color="#2563EB" />
                <h3 className="font-bold text-navy text-base">
                  {isRTL ? 'بلاغات وشكاوى المواطنين' : 'Frontline Citizen Reports'}
                </h3>
              </div>
              <Link to="/decisions/citizen-reports" className="text-xs font-semibold text-blue hover:underline">
                {isRTL ? 'عرض الكل' : 'View all'}
              </Link>
            </div>

            {isLoading ? (
              <LoadingSpinner message="" />
            ) : reports.length === 0 ? (
              <p className="text-sm text-faded-ink p-4 text-center">{isRTL ? 'لا توجد بلاغات' : 'No reports found'}</p>
            ) : (
              <div className="space-y-3">
                {reports.map((rep) => (
                  <div key={rep.id} className="p-3.5 rounded-well bg-well space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-navy">{t(rep, 'title')}</span>
                      <span className="text-xs font-semibold text-blue bg-blue/10 px-2 py-0.5 rounded-pill capitalize">
                        {rep.category}
                      </span>
                    </div>

                    <p className="text-xs text-ink line-clamp-1">{rep.description}</p>

                    <div className="flex items-center justify-between text-[11px] text-faded-ink pt-1">
                      <span>{t(rep.region, 'name')}</span>
                      <span>❤️ {rep.likes_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-line text-xs text-faded-ink mt-4">
            {isRTL ? 'إشارات حية من الميدان لتحديد الاحتياجات الطارئة.' : 'Frontline signals identifying acute infrastructure needs.'}
          </div>
        </div>
      </div>
    </div>
  );
};
