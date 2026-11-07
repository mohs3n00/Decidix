import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { overviewService } from '../../services/overviewService';
import { MapPoint, Sector } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { PriorityBadge } from '../../components/PriorityBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { DecidixIcon, DecidixIconName } from '../../components/DecidixIcon';
import { useLanguage } from '../../context/LanguageContext';

export const InteractiveMapScreen: React.FC = () => {
  const { isRTL, t } = useLanguage();
  const [sector, setSector] = useState<Sector>('overall');
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchPoints = async () => {
      try {
        setIsLoading(true);
        const data = await overviewService.getMapPoints(sector);
        if (isMounted) {
          setPoints(data || []);
          if (data && data.length > 0 && !selectedPoint) {
            setSelectedPoint(data[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load map points:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchPoints();
    return () => {
      isMounted = false;
    };
  }, [sector]);

  // Map coordinates projection bounding box (Egypt approximation: Lat 22 to 32, Long 25 to 36)
  const projectCoords = (lat: number, lng: number) => {
    const minLat = 22.0;
    const maxLat = 32.0;
    const minLng = 24.5;
    const maxLng = 36.5;

    // Invert lat for SVG Y (top is 0)
    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 100;

    return {
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y)),
    };
  };

  const SECTORS: Array<{ id: Sector; labelEn: string; labelAr: string; icon: DecidixIconName }> = [
    { id: 'overall', labelEn: 'Overall Index', labelAr: 'المؤشر العام', icon: 'overview' },
    { id: 'education', labelEn: 'Education', labelAr: 'التعليم', icon: 'education' },
    { id: 'healthcare', labelEn: 'Healthcare', labelAr: 'الصحة', icon: 'healthcare' },
    { id: 'economy', labelEn: 'Economy', labelAr: 'الاقتصاد', icon: 'economy' },
    { id: 'infrastructure', labelEn: 'Infrastructure', labelAr: 'البنية التحتية', icon: 'infrastructure' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <TwoToneHeading
            first={isRTL ? 'الخريطة' : 'Interactive'}
            second={isRTL ? 'التفاعلية' : 'Map'}
            level={1}
            className="text-3xl font-extrabold"
          />
          <p className="text-sm text-faded-ink mt-1">
            {isRTL
              ? 'توزيع المؤشرات التنموية ومستويات الأداء عبر محافظات الجمهورية'
              : 'Spatial distribution of regional developmental performance & acute intervention priorities'}
          </p>
        </div>

        {/* Sector Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white border border-line rounded-pill shadow-sm">
          {SECTORS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSector(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-pill transition-all ${
                sector === s.id
                  ? 'bg-blue text-white shadow-sm'
                  : 'text-ink hover:text-navy hover:bg-well'
              }`}
            >
              <DecidixIcon name={s.icon} size={14} color={sector === s.id ? '#FFFFFF' : 'currentColor'} />
              <span>{isRTL ? s.labelAr : s.labelEn}</span>
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner message={isRTL ? 'جارٍ تحميل إحداثيات الخريطة...' : 'Loading geographic map layers...'} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Canvas Card */}
          <div className="lg:col-span-2 decidix-card p-6 bg-gradient-to-br from-[#061A3A] to-[#0A2554] text-white relative min-h-[500px] flex flex-col justify-between overflow-hidden">
            {/* Map Canvas Background Grid */}
            <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#21EAF4_1px,transparent_1px)] [background-size:24px_24px]"></div>

            {/* Region Pins on Vector Surface */}
            <div className="relative w-full h-[450px]">
              {points.map((pt) => {
                const rId = pt.region_id || (pt as any).id;
                const { x, y } = projectCoords(pt.latitude, pt.longitude);
                const isSelected = (selectedPoint?.region_id || (selectedPoint as any)?.id) === rId;

                return (
                  <button
                    key={rId}
                    onClick={() => setSelectedPoint(pt)}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 group transition-all duration-200 z-10 focus:outline-none`}
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-lg transition-transform ${
                          isSelected
                            ? 'bg-cyan text-navy ring-4 ring-cyan/40 scale-125 z-20'
                            : pt.priority === 'critical' || pt.priority === 'high'
                            ? 'bg-rose-500 text-white'
                            : 'bg-blue text-white'
                        }`}
                      >
                        {pt.score.toFixed(0)}
                      </div>
                      <span className="mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-navy/80 text-white whitespace-nowrap opacity-90 group-hover:opacity-100">
                        {t(pt, 'name')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Map Legend */}
            <div className="relative z-10 flex flex-wrap items-center justify-between text-xs text-white/70 pt-4 border-t border-white/10">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-cyan"></span> Selected
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500"></span> Priority
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue"></span> Moderate/High
                </span>
              </div>
              <div>
                WGS84 Coordinates • {points.length} Regions
              </div>
            </div>
          </div>

          {/* Selected Region Detail Flyout */}
          <div className="decidix-card p-6 flex flex-col justify-between">
            {selectedPoint ? (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-faded-ink uppercase tracking-wider">
                      {isRTL ? 'بيانات المنطقة المحددة' : 'Selected Region Profile'}
                    </span>
                    <PriorityBadge priority={selectedPoint.priority} isArabic={isRTL} />
                  </div>
                  <h3 className="text-2xl font-bold text-navy">
                    {t(selectedPoint, 'name')}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3 p-4 rounded-well bg-well text-xs">
                  <div>
                    <div className="text-faded-ink mb-0.5">{isRTL ? 'درجة المؤشر' : 'Composite Score'}</div>
                    <div className="text-xl font-bold text-navy">{selectedPoint.score.toFixed(1)} / 100</div>
                  </div>
                  <div>
                    <div className="text-faded-ink mb-0.5">{isRTL ? 'تعداد السكان' : 'Population'}</div>
                    <div className="text-xl font-bold text-navy">
                      {selectedPoint.population ? (selectedPoint.population / 1_000_000).toFixed(1) + 'M' : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="font-bold text-navy">
                    {isRTL ? 'الإحداثيات الجغرافية:' : 'Coordinates:'}
                  </div>
                  <div className="font-mono text-faded-ink">
                    Lat: {selectedPoint.latitude.toFixed(4)}, Long: {selectedPoint.longitude.toFixed(4)}
                  </div>
                </div>

                {selectedPoint.key_challenges && selectedPoint.key_challenges.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-navy">
                      {isRTL ? 'أبرز التحديات التنموية:' : 'Key Developmental Challenges:'}
                    </div>
                    <div className="space-y-1">
                      {selectedPoint.key_challenges.map((c, i) => (
                        <div key={i} className="text-xs text-ink flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          <span>{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <Link
                    to={`/regions/${selectedPoint.region_id || (selectedPoint as any).id}`}
                    className="decidix-btn-primary w-full text-xs font-bold"
                  >
                    {isRTL ? 'فتح الملف التنموي الكامل للمنطقة ←' : 'View Full Region Dossier →'}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center text-ink py-12">
                <p>{isRTL ? 'انقر على أي نقطة في الخريطة لعرض تفاصيلها' : 'Click on any regional point on the map to inspect details'}</p>
              </div>
            )}

            <div className="pt-4 border-t border-line text-xs text-faded-ink mt-6">
              {isRTL
                ? 'البيانات الجغرافية مستندة إلى أحدث مسح سكاني وإحصائي معتمد.'
                : 'GIS points aligned with verified Egyptian administrative divisions.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
