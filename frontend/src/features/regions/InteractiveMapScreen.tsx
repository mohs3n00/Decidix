import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { overviewService } from '../../services/overviewService';
import { MapPoint } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { DecidixIcon } from '../../components/DecidixIcon';

export const InteractiveMapScreen: React.FC = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [selectedId, setSelectedId] = useState<string>('cairo');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchPoints = async () => {
      setIsLoading(true);
      try {
        const data = await overviewService.getMapPoints('overall');
        if (isMounted && Array.isArray(data) && data.length) {
          setPoints(data);
          const cairo = data.find((p) => p.id === 'cairo');
          setSelectedId(cairo ? cairo.id : data[0].id);
        }
      } catch (err) {
        console.warn('Map points fallback:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchPoints();
    return () => {
      isMounted = false;
    };
  }, []);

  const activePoint = points.find((p) => p.id === selectedId) || points[0] || {
    id: 'cairo',
    name: 'Cairo',
    arabic_name: 'القاهرة',
    score: 75,
    priority: 'medium',
    population: 10000000,
    latitude: 30.0444,
    longitude: 31.2357,
  };

  const getCoordinates = (lat?: number, long?: number, idx: number = 0) => {
    if (lat == null || long == null) {
      const angle = (idx / 23) * 2 * Math.PI;
      return { x: 50 + 30 * Math.cos(angle), y: 50 + 30 * Math.sin(angle) };
    }
    const x = Math.min(90, Math.max(10, ((long - 25.0) / (36.9 - 25.0)) * 75 + 12));
    const y = Math.min(88, Math.max(12, (1 - (lat - 22.0) / (31.6 - 22.0)) * 74 + 13));
    return { x, y };
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue mb-1">
            {isRTL ? 'نظرة عامة إقليمية' : 'REGIONAL INTELLIGENCE'}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-navy">
            {isRTL ? 'الخريطة التفاعلية للمحافظات' : 'Interactive National Map'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isRTL
              ? 'استكشف نقاط الرصد التنموي عبر خريطة الجمهورية وافحص إشارات المحافظات.'
              : 'Explore monitored governorates and inspect development indicators across Egypt.'}
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="h-9 px-4 rounded-lg bg-white border border-slate-200/80 text-navy hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors duration-150"
        >
          {isRTL ? 'تصدير الخريطة' : 'Export map'}
        </button>
      </div>

      {/* Main Grid: Interactive Map + Selected Region Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Map Container (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base font-bold text-navy">
                {isRTL ? 'خريطة نقاط الرصد الإقليمي' : 'Regional Coverage Map'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isRTL
                  ? `مصر · ${points.length || 23} نقطة رصد موثقة · انقر على أي نقطة لفحص مؤشراتها`
                  : `Egypt · ${points.length || 23} verified monitoring points · Click any point to inspect`}
              </p>
            </div>
            <span className="text-[11px] font-bold text-blue bg-blue-50 px-2.5 py-0.5 rounded-full">
              {isRTL ? 'بيانات معتمدة' : 'Official Coordinates'}
            </span>
          </div>

          {/* Stylized Interactive Map Canvas */}
          <div className="relative w-full h-[520px] bg-slate-50/70 rounded-xl border border-slate-200/80 overflow-hidden flex items-center justify-center p-4">
            {/* Compass */}
            <div className="absolute top-4 left-4 flex flex-col items-center text-navy font-bold text-xs select-none bg-white/90 px-2.5 py-1 rounded-md border border-slate-200/80 shadow-2xs">
              <DecidixIcon name="chevron_up" size={12} color="#0052FF" strokeWidth={3} />
              <span className="text-[10px] font-bold">N</span>
            </div>

            {/* Geographical Water Labels */}
            <span className="absolute top-6 left-1/3 text-[10px] font-bold text-slate-400 uppercase tracking-widest pointer-events-none select-none">
              {isRTL ? 'البحر الأبيض المتوسط' : 'Mediterranean Sea'}
            </span>
            <span className="absolute bottom-16 right-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest pointer-events-none select-none">
              {isRTL ? 'البحر الأحمر' : 'Red Sea'}
            </span>

            {/* Subtle River Nile Representation */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <path
                d="M 50 100 Q 52 75 56 60 Q 54 40 50 35 Q 46 25 43 12 M 50 35 Q 54 25 57 12"
                fill="none"
                stroke="#2563EB"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>

            {/* Interactive Pins */}
            {isLoading ? (
              <div className="text-center text-xs text-slate-400">
                <div className="w-6 h-6 border-2 border-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                {isRTL ? 'جاري تحميل الخريطة...' : 'Loading map points...'}
              </div>
            ) : (
              points.map((pt, idx) => {
                const { x, y } = getCoordinates(pt.latitude, pt.longitude, idx);
                const isSelected = pt.id === selectedId;

                return (
                  <button
                    key={pt.id}
                    onClick={() => setSelectedId(pt.id)}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-150 z-10 flex flex-col items-center group ${
                      isSelected ? 'scale-125 z-20' : 'hover:scale-110'
                    }`}
                    title={isRTL ? pt.arabic_name || pt.name : pt.name}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] tabular-nums shadow-xs transition-colors ${
                        isSelected
                          ? 'bg-navy text-cyan ring-4 ring-cyan/30'
                          : 'bg-white text-blue border-2 border-blue group-hover:bg-blue group-hover:text-white'
                      }`}
                    >
                      {Math.round(pt.score)}
                    </div>
                    <span
                      className={`text-[10px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded shadow-2xs mt-1 transition ${
                        isSelected
                          ? 'bg-navy text-white'
                          : 'bg-white/95 text-navy group-hover:bg-navy group-hover:text-white'
                      }`}
                    >
                      {isRTL ? pt.arabic_name || pt.name : pt.name}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Region Snapshot Card (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              {isRTL ? 'المحافظة المحددة' : 'SELECTED REGION'}
            </div>
            <h3 className="text-xl font-bold text-navy mb-1">
              {isRTL ? activePoint.arabic_name || activePoint.name : activePoint.name}
            </h3>
            <div className="text-xs text-slate-500 mb-6">
              {activePoint.population
                ? `${(activePoint.population / 1_000_000).toFixed(1)}M ${isRTL ? 'نسمة' : 'residents'}`
                : '1.0M residents'}
            </div>

            {/* Score Box */}
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/70 mb-5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                {isRTL ? 'المؤشر التنموي المعتمد' : 'VERIFIED INDEX SCORE'}
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">
                  {Math.round(activePoint.score)}
                </span>
                <span className="text-xs font-semibold text-slate-400">/ 100</span>
              </div>
              <div className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(5, activePoint.score))}%` }}
                />
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between text-xs p-3 rounded-lg bg-slate-50/70 border border-slate-200/70">
                <span className="font-medium text-slate-500">
                  {isRTL ? 'مستوى الأولوية' : 'Priority Level'}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    activePoint.priority === 'high' || activePoint.priority === 'critical'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                      : activePoint.priority === 'low'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                  }`}
                >
                  {activePoint.priority || 'Medium'}
                </span>
              </div>

              {activePoint.latitude && activePoint.longitude && (
                <div className="flex items-center justify-between text-xs p-3 rounded-lg bg-slate-50/70 border border-slate-200/70">
                  <span className="font-medium text-slate-500">
                    {isRTL ? 'الإحداثيات الجغرافية' : 'Geo Coordinates'}
                  </span>
                  <span className="font-semibold text-navy text-[11px] tabular-nums">
                    {activePoint.latitude.toFixed(2)}°N, {activePoint.longitude.toFixed(2)}°E
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => navigate(`/regions/${activePoint.id}`)}
            className="w-full h-10 rounded-lg bg-blue hover:bg-blue-hover text-white text-xs font-semibold shadow-2xs active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2"
          >
            <span>{isRTL ? 'عرض الملف التنموي الكامل' : 'View Full Profile'}</span>
            <DecidixIcon name="arrow_right" size={14} color="#FFFFFF" />
          </button>
        </div>
      </div>
    </div>
  );
};
