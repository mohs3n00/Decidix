import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { overviewService } from '../../services/overviewService';
import { MapPoint, Sector } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { DecidixCard } from '../../components/DecidixCard';
import { DecidixChip } from '../../components/DecidixChip';
import { DecidixButton } from '../../components/DecidixButton';
import { PriorityBadge } from '../../components/PriorityBadge';
import { ScoreRing } from '../../components/ScoreRing';
import { TrendIndicator } from '../../components/TrendIndicator';
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
    <div className="space-y-7 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="type-eyebrow mb-1">
            {isRTL
              ? 'التوزيع المكاني للمؤشرات عبر محافظات الجمهورية'
              : 'Spatial GIS distribution of developmental indicators across Egypt'}
          </div>
          <TwoToneHeading
            first={isRTL ? 'الخريطة' : 'Spatial'}
            second={isRTL ? 'التفاعلية' : 'Map'}
            level={1}
            className="type-heading-page"
          />
        </div>

        {/* Sector Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {SECTORS.map((s) => {
            const isSelected = sector === s.id;
            return (
              <DecidixChip
                key={s.id}
                label={isRTL ? s.labelAr : s.labelEn}
                selected={isSelected}
                icon={
                  <DecidixIcon
                    name={s.icon}
                    size={15}
                    color={isSelected ? '#FFFFFF' : 'var(--color-ink)'}
                  />
                }
                onClick={() => setSector(s.id)}
              />
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner message={isRTL ? 'جارٍ تحميل إحداثيات الخريطة...' : 'Loading geographic map layers...'} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Map Canvas Card */}
          <div
            className="lg:col-span-8 p-6 text-white relative min-h-[520px] flex flex-col justify-between overflow-hidden shadow-decidix-card"
            style={{
              backgroundColor: 'var(--color-navy)',
              borderRadius: 'var(--radius-card)',
            }}
          >
            {/* Map Canvas Background Grid */}
            <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#21EAF4_1px,transparent_1px)] [background-size:24px_24px]"></div>

            {/* Region Pins on Vector Surface */}
            <div className="relative w-full h-[440px]">
              {points.map((pt) => {
                const rId = pt.region_id || (pt as any).id;
                const { x, y } = projectCoords(pt.latitude, pt.longitude);
                const isSelected = (selectedPoint?.region_id || (selectedPoint as any)?.id) === rId;

                return (
                  <button
                    key={rId}
                    onClick={() => setSelectedPoint(pt)}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 group transition-all duration-200 z-10 focus:outline-none"
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-decidix-pill transition-transform ${
                          isSelected
                            ? 'bg-cyan text-navy ring-4 ring-cyan/40 scale-125 z-20'
                            : pt.priority === 'critical' || pt.priority === 'high'
                            ? 'bg-rose-500 text-white'
                            : 'bg-blue text-white'
                        }`}
                      >
                        {pt.score.toFixed(0)}
                      </div>
                      <span className="mt-1 px-2 py-0.5 rounded-pill text-[10px] font-bold bg-navy/90 text-white whitespace-nowrap opacity-90 group-hover:opacity-100 border border-white/10 shadow-sm">
                        {t(pt, 'name')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Map Legend */}
            <div className="relative z-10 flex flex-wrap items-center justify-between text-xs text-white/75 pt-3.5 border-t border-white/10">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan"></span> Selected
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Priority Intervention
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue"></span> Benchmark
                </span>
              </div>
              <div>
                WGS84 Coordinates • {points.length} Regions Grounded
              </div>
            </div>
          </div>

          {/* Selected Region Detail Drawer */}
          <DecidixCard variant="card" className="lg:col-span-4 flex flex-col justify-between">
            {selectedPoint ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <PriorityBadge priority={selectedPoint.priority} isArabic={isRTL} />
                  <span className="text-xs text-faded-ink">
                    Lat: {selectedPoint.latitude.toFixed(2)}, Lng: {selectedPoint.longitude.toFixed(2)}
                  </span>
                </div>

                <div>
                  <h3 className="type-heading-page text-navy text-2xl font-bold">
                    {t(selectedPoint, 'name')}
                  </h3>
                  <div className="type-caption-regular text-ink mt-1">
                    {isRTL ? 'إقليم معتمد في قاعدة البيانات الجغرافية' : 'Verified Administrative Governorate'}
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-well bg-well border border-hairline">
                  <ScoreRing score={selectedPoint.score} size={54} strokeWidth={5} />
                  <div>
                    <div className="text-xs font-semibold text-faded-ink uppercase">
                      {sector.toUpperCase()} {isRTL ? 'درجة المؤشر' : 'Score'}
                    </div>
                    <div className="text-xl font-black text-navy">
                      {selectedPoint.score.toFixed(1)} <span className="text-xs text-faded-ink font-normal">/ 100</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-ink">
                  <div className="flex justify-between py-1.5 border-b border-hairline">
                    <span className="text-faded-ink">{isRTL ? 'معرف المنطقة' : 'Region ID'}</span>
                    <span className="font-mono font-bold text-navy">{selectedPoint.region_id || (selectedPoint as any).id}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-hairline">
                    <span className="text-faded-ink">{isRTL ? 'حالة الأولوية' : 'Intervention Urgency'}</span>
                    <span className="font-bold text-navy capitalize">{selectedPoint.priority}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-xs text-faded-ink">
                {isRTL ? 'انقر على أي نقطة في الخريطة لعرض تفاصيل المنطقة' : 'Click any pin on the map to inspect regional metrics.'}
              </div>
            )}

            {selectedPoint && (
              <div className="pt-4 border-t border-hairline">
                <Link
                  to={`/regions/${selectedPoint.region_id || (selectedPoint as any).id}`}
                  className="w-full"
                >
                  <DecidixButton variant="primary" compact expand>
                    <span>{isRTL ? 'عرض الملف التنموي الكامل' : 'Open Regional Dossier'}</span>
                    <span>→</span>
                  </DecidixButton>
                </Link>
              </div>
            )}
          </DecidixCard>
        </div>
      )}
    </div>
  );
};
