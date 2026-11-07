import React, { useState, useEffect } from 'react';
import { decisionsService } from '../../services/decisionsService';
import { DevelopmentProject, ProjectStatus } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { DecidixCard } from '../../components/DecidixCard';
import { DecidixChip } from '../../components/DecidixChip';
import { StatWell } from '../../components/StatWell';
import { HatchedBar } from '../../components/HatchedBar';
import { PriorityBadge } from '../../components/PriorityBadge';
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

  const STATUS_LABELS: Record<string, { en: string; ar: string }> = {
    all: { en: 'All Projects', ar: 'جميع المشاريع' },
    in_progress: { en: 'In Progress', ar: 'قيد التنفيذ' },
    planned: { en: 'Planned', ar: 'مخطط لها' },
    delayed: { en: 'Delayed', ar: 'متعثرة' },
    completed: { en: 'Completed', ar: 'مكتملة' },
  };

  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="type-eyebrow mb-1">
            {isRTL
              ? 'تتبع المشاريع الإقليمية ومعدلات الإنجاز'
              : 'Capital infrastructure, healthcare & education investments tracking'}
          </div>
          <TwoToneHeading
            first={isRTL ? 'محفظة' : 'Development'}
            second={isRTL ? 'المشاريع الإقليمية' : 'Projects'}
            level={1}
            className="type-heading-page"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(['all', 'in_progress', 'planned', 'delayed', 'completed'] as ProjectStatus[]).map((st) => (
            <DecidixChip
              key={st}
              label={isRTL ? STATUS_LABELS[st]?.ar : STATUS_LABELS[st]?.en}
              selected={statusFilter === st}
              onClick={() => setStatusFilter(st)}
            />
          ))}
        </div>
      </div>

      {/* Overview Stat Wells */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatWell
          value={projects.length}
          label={isRTL ? 'إجمالي المشاريع' : 'Active Projects'}
        />
        <StatWell
          value={`$${(totalBudget / 1_000_000).toFixed(1)}M`}
          label={isRTL ? 'الميزانية الإجمالية' : 'Total Capital Outlay'}
        />
        <StatWell
          value={projects.filter((p) => p.status === 'in_progress').length}
          label={isRTL ? 'قيد التنفيذ' : 'Under Execution'}
        />
        <StatWell
          value={projects.filter((p) => p.status === 'delayed').length}
          label={isRTL ? 'متعثرة / متأخرة' : 'Delayed / Impeded'}
        />
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner message={isRTL ? 'جارٍ استرجاع محفظة المشاريع...' : 'Retrieving project portfolio...'} />
        </div>
      ) : projects.length === 0 ? (
        <DecidixCard variant="card" className="p-12 text-center text-ink">
          <p className="font-bold text-base mb-1">
            {isRTL ? 'لا توجد مشاريع مسجلة في هذا التصنيف' : 'No projects found for the selected filter.'}
          </p>
        </DecidixCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((proj) => (
            <DecidixCard
              key={proj.id}
              variant="card"
              className="flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-pill bg-well border border-hairline uppercase text-ink">
                      {proj.domain}
                    </span>
                    <span className="text-xs text-faded-ink font-mono">Region: {proj.region_id}</span>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-pill capitalize ${
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

                <h3 className="font-bold text-navy text-base leading-snug">
                  {isRTL && proj.arabic_title ? proj.arabic_title : proj.title}
                </h3>

                <p className="type-body-m text-ink line-clamp-2">
                  {isRTL && proj.arabic_description ? proj.arabic_description : proj.description}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-hairline">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-ink">{isRTL ? 'نسبة الإنجاز المالي والفني' : 'Progress'}</span>
                  <span className="text-blue font-bold">{proj.progress_percent}%</span>
                </div>

                <HatchedBar percentage={proj.progress_percent} height={8} />

                <div className="flex justify-between text-[11px] text-faded-ink pt-1">
                  <span>Budget: ${(proj.budget / 1_000_000).toFixed(2)}M</span>
                  <span>Spent: ${(proj.spent / 1_000_000).toFixed(2)}M</span>
                </div>
              </div>
            </DecidixCard>
          ))}
        </div>
      )}
    </div>
  );
};
