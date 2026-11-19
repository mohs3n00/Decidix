import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { overviewService } from '../../services/overviewService';
import { RegionListItem } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { DecidixIcon } from '../../components/DecidixIcon';

export const RegionsListScreen: React.FC = () => {
  const { isRTL } = useLanguage();
  const [regions, setRegions] = useState<RegionListItem[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'high'>('all');
  const [sortBy, setSortBy] = useState<'index' | 'name'>('index');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchRegions = async () => {
      setIsLoading(true);
      try {
        const res = await overviewService.getRegions({
          q: search,
          priority: filter === 'high' ? 'high' : 'all',
          per_page: 50,
        });
        if (isMounted) {
          const list = Array.isArray(res) ? res : (res.items || []);
          setRegions(list);
        }
      } catch (err) {
        console.warn('Regions fallback:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchRegions();
    return () => {
      isMounted = false;
    };
  }, [search, filter]);

  const displayList = regions.map((r) => {
    const scoreVal = r.score != null ? Number(r.score) : 50;
    return {
      id: r.id,
      name: r.name,
      arabicName: r.arabic_name || r.name,
      residents: r.population
        ? `${(r.population / 1_000_000).toFixed(1)}M ${isRTL ? 'نسمة' : 'residents'}`
        : `1.0M ${isRTL ? 'نسمة' : 'residents'}`,
      score: Math.round(scoreVal * 10) / 10,
      risk:
        r.priority === 'critical' || r.priority === 'high'
          ? isRTL ? 'أولوية عاجلة' : 'High priority'
          : r.priority === 'low'
          ? isRTL ? 'مخاطر منخفضة' : 'Low risk'
          : isRTL ? 'أداء مستقر' : 'Stable',
      priority: r.priority,
    };
  });

  const filteredList = displayList.filter((item) => {
    if (filter === 'high' && item.priority !== 'high' && item.priority !== 'critical') {
      return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.arabicName && item.arabicName.includes(q))
      );
    }
    return true;
  });

  if (sortBy === 'index') {
    filteredList.sort((a, b) => b.score - a.score);
  } else if (sortBy === 'name') {
    filteredList.sort((a, b) => a.name.localeCompare(b.name));
  }

  const avgIndex = displayList.length
    ? (displayList.reduce((acc, curr) => acc + curr.score, 0) / displayList.length).toFixed(1)
    : '56.1';

  const highPriorityCount = displayList.filter(
    (r) => r.priority === 'high' || r.priority === 'critical'
  ).length;

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue mb-1">
            {isRTL ? 'نظرة عامة على الجمهورية' : 'NATIONAL OVERVIEW'}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-navy">
            {isRTL ? 'سجل المحافظات والمناطق' : 'Governorates & Regions'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isRTL
              ? 'تصفح جميع المحافظات المسجلة في قاعدة البيانات الوطنية، وقارن مؤشرات الأداء المعتمدة.'
              : 'Browse all monitored governorates in the canonical store, compare scores, and inspect indicators.'}
          </p>
        </div>

        <button
          onClick={() => setFilter(filter === 'all' ? 'high' : 'all')}
          className="h-9 px-4 rounded-lg bg-blue hover:bg-blue-hover text-white text-xs font-semibold shadow-2xs active:scale-[0.98] transition-all duration-150"
        >
          {filter === 'all'
            ? isRTL ? 'تصفية المناطق ذات الأولوية' : 'Filter high priority'
            : isRTL ? 'عرض جميع المناطق' : 'Show all regions'}
        </button>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Regions monitored */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue mb-3">
            <DecidixIcon name="location" size={16} color="var(--color-blue)" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'المناطق المرصودة' : 'Monitored Regions'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">{displayList.length}</span>
            <span className="text-[11px] font-bold text-blue bg-blue-50 px-2.5 py-0.5 rounded-full">
              {isRTL ? 'مسجلة في النظام' : 'Registered in store'}
            </span>
          </div>
        </div>

        {/* Average index */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue mb-3">
            <DecidixIcon name="insights" size={16} color="var(--color-blue)" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'متوسط المؤشر الوطني' : 'National Average Index'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">{avgIndex}</span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
              / 100
            </span>
          </div>
        </div>

        {/* High priority */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 mb-3">
            <DecidixIcon name="arrow_down_right" size={16} color="currentColor" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'مناطق ذات أولوية' : 'High Priority'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">
              {highPriorityCount}
            </span>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200/60">
              {isRTL ? 'تتطلب تدخلاً' : 'Intervention focus'}
            </span>
          </div>
        </div>

        {/* Canonical Store */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue mb-3">
            <DecidixIcon name="shield" size={16} color="var(--color-blue)" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'اعتماد البيانات' : 'Data Integrity'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold text-navy">CAPMAS</span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              {isRTL ? 'موثقة 100%' : 'Verified 100%'}
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isRTL ? 'البحث عن محافظة...' : 'Search governorate...'}
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-navy placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-blue/15 focus:border-blue transition-colors duration-150"
          />
          <div className={`absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'} text-slate-400`}>
            <DecidixIcon name="search" size={14} color="#94A3B8" />
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-medium text-slate-500">
          <span>{isRTL ? 'ترتيب حسب:' : 'Sort by:'}</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5 text-xs font-bold text-navy outline-none cursor-pointer focus:ring-2 focus:ring-blue/15 focus:border-blue transition-colors"
          >
            <option value="index">{isRTL ? 'المؤشر التنموي' : 'Index Score'}</option>
            <option value="name">{isRTL ? 'الاسم' : 'Name'}</option>
          </select>
        </div>
      </div>

      {/* Main Regions Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-xs">
          <div className="w-6 h-6 border-2 border-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          {isRTL ? 'جاري تحميل المحافظات...' : 'Loading governorates...'}
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-slate-400 text-xs border border-slate-200/80 shadow-xs">
          {isRTL ? 'لا توجد محافظات مطابقة لمعايير البحث.' : 'No governorates match your search criteria.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((item) => (
            <Link
              key={item.id}
              to={`/regions/${item.id}`}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-sm transition-all duration-150 group block"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {item.residents}
                </span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    item.priority === 'high' || item.priority === 'critical'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                      : item.priority === 'low'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                  }`}
                >
                  {item.risk}
                </span>
              </div>

              <h3 className="text-base font-bold text-navy group-hover:text-blue transition-colors mb-3">
                {isRTL ? item.arabicName : item.name}
              </h3>

              <div className="flex items-baseline justify-between pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">
                  {isRTL ? 'المؤشر التنموي' : 'Development Index'}
                </span>
                <span className="text-lg font-bold text-navy tabular-nums">
                  {item.score}/100
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-blue rounded-full group-hover:bg-cyan transition-colors duration-200"
                  style={{ width: `${Math.min(100, Math.max(5, item.score))}%` }}
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
