import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { DecidixIcon } from '../../components/DecidixIcon';
import { decisionsService } from '../../services/decisionsService';
import { ProjectsResponse } from '../../types';

export const ProjectsScreen: React.FC = () => {
  const { isRTL } = useLanguage();
  const { requireAuth } = useAuth();
  const toast = useToast();

  const [projectsData, setProjectsData] = useState<ProjectsResponse | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchProjects = async () => {
      setIsLoading(true);
      try {
        const res = await decisionsService.getProjects({
          status: filterStatus as any,
        });
        if (isMounted) setProjectsData(res);
      } catch (err) {
        console.warn('Projects fetch error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchProjects();
    return () => {
      isMounted = false;
    };
  }, [filterStatus]);

  const summary = projectsData?.summary || {
    projects_count: 5,
    total_budget: { amount: 528000000, currency: 'USD' },
    delayed_count: 1,
  };

  const items = projectsData?.items || [];

  const totalBudgetFormatted = `$${(summary.total_budget.amount / 1_000_000).toFixed(0)}M`;
  const delayedPercent = summary.projects_count
    ? Math.round((summary.delayed_count / summary.projects_count) * 100)
    : 0;

  const handleAddProject = () => {
    requireAuth(
      isRTL
        ? 'يتطلب تسجيل وإضافة مشاريع جديدة في المنظومة الوطنية تسجيل الدخول بحساب مسؤول.'
        : 'Sign in with an authorized account to register new development projects.',
      () => {
        toast.info(
          isRTL
            ? 'نافذة إضافة مشروع تنموي جديد قيد التجهيز.'
            : 'Add new development project initiated.'
        );
      },
      isRTL ? 'إضافة مشروع تنموي' : 'Add Development Project'
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          label: isRTL ? 'مكتمل' : 'Completed',
          className: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
        };
      case 'in_progress':
        return {
          label: isRTL ? 'قيد التنفيذ' : 'In Progress',
          className: 'bg-blue-50 text-blue border border-blue-200/60',
        };
      case 'delayed':
        return {
          label: isRTL ? 'متعثر' : 'Delayed',
          className: 'bg-rose-50 text-rose-700 border border-rose-200/60',
        };
      case 'planned':
      default:
        return {
          label: isRTL ? 'مخطط' : 'Planned',
          className: 'bg-amber-50 text-amber-700 border border-amber-200/60',
        };
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue mb-1">
            {isRTL ? 'دعم القرار والمشاريع' : 'DECISIONS'}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-navy">
            {isRTL ? 'محفظة مشاريع التنمية' : 'Development Projects Portfolio'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isRTL
              ? 'متابعة المشاريع التنموية الوطنية، نسب الإنجاز، والميزانيات المعتمدة.'
              : 'Track national development projects, delivery progress, and allocated budgets.'}
          </p>
        </div>

        <button
          onClick={handleAddProject}
          className="h-9 px-4 rounded-lg bg-blue hover:bg-blue-hover text-white text-xs font-semibold shadow-2xs active:scale-[0.98] transition-all duration-150"
        >
          {isRTL ? 'إضافة مشروع' : 'Add project'}
        </button>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue mb-3">
            <DecidixIcon name="infrastructure" size={16} color="var(--color-blue)" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'المشاريع المسجلة' : 'Registered Projects'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">
              {summary.projects_count}
            </span>
            <span className="text-[11px] font-bold text-blue bg-blue-50 px-2.5 py-0.5 rounded-full">
              {isRTL ? 'محفظة معتمدة' : 'Official portfolio'}
            </span>
          </div>
        </div>

        {/* Total Budget */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue mb-3">
            <DecidixIcon name="economy" size={16} color="var(--color-blue)" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'إجمالي الميزانية' : 'Total Portfolio Budget'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">
              {totalBudgetFormatted}
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
              USD
            </span>
          </div>
        </div>

        {/* On Schedule / Active */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
            <DecidixIcon name="arrow_up_right" size={16} color="currentColor" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'مشاريع قيد التنفيذ' : 'Active In Progress'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">
              {items.filter((i) => i.status === 'in_progress').length}
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
              {isRTL ? 'سير طبيعي' : 'On track'}
            </span>
          </div>
        </div>

        {/* Delayed Projects */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 mb-3">
            <DecidixIcon name="arrow_down_right" size={16} color="currentColor" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'مشاريع متعثرة' : 'Delayed Projects'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">
              {summary.delayed_count}
            </span>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200/60 tabular-nums">
              {delayedPercent}% {isRTL ? 'من المحفظة' : 'of portfolio'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Project Portfolio Table Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-bold text-navy">
              {isRTL ? 'سجل المشاريع الوطنية' : 'Project Portfolio Register'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isRTL
                ? 'تفاصيل الميزانيات، نسب الإنجاز، والمناطق المستهدفة'
                : 'Project details, budgets, completion rates, and target governorates'}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
            {(['all', 'in_progress', 'delayed', 'completed', 'planned'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-md capitalize transition-all duration-150 ${
                  filterStatus === st
                    ? 'bg-white text-navy shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-navy'
                }`}
              >
                {st === 'all'
                  ? isRTL ? 'الكل' : 'All'
                  : st === 'in_progress'
                  ? isRTL ? 'قيد التنفيذ' : 'In Progress'
                  : st === 'delayed'
                  ? isRTL ? 'متعثر' : 'Delayed'
                  : st === 'completed'
                  ? isRTL ? 'مكتمل' : 'Completed'
                  : isRTL ? 'مخطط' : 'Planned'}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            {isRTL ? 'جاري تحميل المشاريع...' : 'Loading projects...'}
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            {isRTL ? 'لا توجد مشاريع مطابقة لهذا الفلتر.' : 'No projects matching this filter.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((proj) => {
              const badge = getStatusBadge(proj.status);
              const budgetFormatted = `$${(proj.budget.amount / 1_000_000).toFixed(0)}M`;
              return (
                <div
                  key={proj.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 px-3 rounded-xl transition-colors duration-150"
                >
                  <div className="flex-1">
                    <div className="text-sm font-bold text-navy">
                      {isRTL ? proj.arabic_title || proj.title : proj.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <span className="font-semibold text-navy">
                        {isRTL ? proj.region.arabic_name : proj.region.name}
                      </span>
                      {proj.due_date && (
                        <span className="tabular-nums">· {isRTL ? 'تاريخ التسليم: ' + proj.due_date : 'Due: ' + proj.due_date}</span>
                      )}
                      {proj.completed_at && (
                        <span className="text-emerald-700 tabular-nums">· {isRTL ? 'اكتمل في: ' + proj.completed_at : 'Completed: ' + proj.completed_at}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-5 sm:w-1/2 justify-between">
                    <span className="text-xs font-bold text-navy w-20 tabular-nums">
                      {budgetFormatted}
                    </span>

                    <div className="flex-1 max-w-[140px] flex items-center gap-2">
                      <span className="text-xs font-bold text-navy w-8 tabular-nums">
                        {proj.progress}%
                      </span>
                      <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue rounded-full transition-all duration-300"
                          style={{ width: `${proj.progress}%` }}
                        />
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full min-w-[85px] text-center ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
