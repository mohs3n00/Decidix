import React, { useState, useEffect } from 'react';
import { decisionsService } from '../../services/decisionsService';
import { DevelopmentProject, ProjectStatus } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';

export const ProjectsScreen: React.FC = () => {
  const { isRTL, t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<ProjectStatus>('all');
  const [projects, setProjects] = useState<DevelopmentProject[]>([]);
  const [summary, setSummary] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        const res = await decisionsService.getProjects({
          status: statusFilter,
          per_page: 50,
        });
        if (isMounted) {
          setProjects(res.items || []);
          setSummary(res.summary || null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchProjects();
    return () => {
      isMounted = false;
    };
  }, [statusFilter]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <TwoToneHeading
            first={isRTL ? 'محفظة' : 'Development'}
            second={isRTL ? 'المشاريع الإقليمية' : 'Projects'}
            level={1}
            className="text-3xl font-extrabold"
          />
          <p className="text-sm text-faded-ink mt-1">
            {isRTL
              ? 'تتبع تنفيذ مشاريع البنية التحتية والخدمات التنموية ونسب الصرف المالي'
              : 'Tracking capital infrastructure, health, and education regional development investments'}
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 p-1 bg-white border border-line rounded-pill">
          {(['all', 'in_progress', 'planned', 'delayed', 'completed'] as ProjectStatus[]).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-bold rounded-pill transition capitalize ${
                statusFilter === st
                  ? 'bg-blue text-white shadow-sm'
                  : 'text-ink hover:text-navy hover:bg-well'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="decidix-card p-5">
            <div className="text-xs font-semibold text-faded-ink uppercase tracking-wider mb-1">
              {isRTL ? 'الميزانية الإجمالية' : 'Total Capital Outlay'}
            </div>
            <div className="text-2xl font-black text-navy">
              ${((summary.total_budget || 0) / 1_000_000).toFixed(1)}M
            </div>
          </div>

          <div className="decidix-card p-5">
            <div className="text-xs font-semibold text-faded-ink uppercase tracking-wider mb-1">
              {isRTL ? 'قيد التنفيذ' : 'In Progress'}
            </div>
            <div className="text-2xl font-black text-blue">
              {summary.in_progress_count || 0}
            </div>
          </div>

          <div className="decidix-card p-5">
            <div className="text-xs font-semibold text-faded-ink uppercase tracking-wider mb-1">
              {isRTL ? 'مكتملة بنجاح' : 'Completed'}
            </div>
            <div className="text-2xl font-black text-emerald-600">
              {summary.completed_count || 0}
            </div>
          </div>

          <div className="decidix-card p-5">
            <div className="text-xs font-semibold text-faded-ink uppercase tracking-wider mb-1">
              {isRTL ? 'متأخرة عن الجدول' : 'Delayed'}
            </div>
            <div className="text-2xl font-black text-danger">
              {summary.delayed_count || 0}
            </div>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      {isLoading ? (
        <LoadingSpinner message={isRTL ? 'جارٍ تحميل المشاريع...' : 'Loading capital projects...'} />
      ) : projects.length === 0 ? (
        <div className="decidix-card p-12 text-center text-ink">
          <p className="font-semibold">{isRTL ? 'لا توجد مشاريع مسجلة في هذا التصنيف.' : 'No projects found in this category.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => (
            <div key={proj.id} className="decidix-card p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue bg-blue/10 px-2.5 py-1 rounded-pill">
                    {proj.sector}
                  </span>
                  <span
                    className={`decidix-pill-badge text-[10px] font-bold ${
                      proj.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-600'
                        : proj.status === 'delayed'
                        ? 'bg-rose-50 text-danger'
                        : 'bg-blue/10 text-blue'
                    }`}
                  >
                    {proj.status.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="font-bold text-navy text-base mb-2">
                  {t(proj, 'title')}
                </h3>
                <div className="text-xs font-medium text-faded-ink mb-4">
                  {t(proj.region, 'name')}
                </div>

                <div className="space-y-1 mb-4">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-ink">{isRTL ? 'نسبة الإنجاز:' : 'Progress:'}</span>
                    <span className="text-navy">{proj.progress_percent}%</span>
                  </div>
                  <div className="w-full h-2 bg-well rounded-pill overflow-hidden">
                    <div
                      className="h-full bg-blue rounded-pill"
                      style={{ width: `${proj.progress_percent}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-line flex items-center justify-between text-xs text-faded-ink">
                <div>
                  {isRTL ? 'الميزانية: ' : 'Budget: '}
                  <strong className="text-navy">
                    ${(proj.budget.amount / 1_000_000).toFixed(1)}M
                  </strong>
                </div>
                <div>
                  {proj.due_date ? `Due: ${proj.due_date}` : proj.completed_at ? `Done: ${proj.completed_at}` : 'Ongoing'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
