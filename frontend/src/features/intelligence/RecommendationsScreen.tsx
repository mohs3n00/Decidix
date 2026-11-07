import React, { useState, useEffect } from 'react';
import { intelligenceService } from '../../services/intelligenceService';
import { Recommendation, PriorityLevel } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { DecidixCard } from '../../components/DecidixCard';
import { DecidixChip } from '../../components/DecidixChip';
import { DecidixButton } from '../../components/DecidixButton';
import { PriorityBadge } from '../../components/PriorityBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';

export const RecommendationsScreen: React.FC = () => {
  const { isRTL, t } = useLanguage();
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchRecs = async () => {
    try {
      setIsLoading(true);
      const data = await intelligenceService.getRecommendations(
        priorityFilter !== 'all' ? priorityFilter : undefined
      );
      setRecommendations(data || []);
    } catch (err) {
      console.error(err);
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecs();
  }, [priorityFilter]);

  const handleAccept = async (id: string) => {
    try {
      await intelligenceService.acceptRecommendation(id);
      setActionSuccess(isRTL ? 'تم إدراج التوصية في خطة العمل التنموية.' : 'Recommendation approved and added to plan.');
      setRecommendations((prev) => prev.filter((r) => r.id !== id));
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      alert(err?.message || 'Failed to accept recommendation');
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await intelligenceService.dismissRecommendation(id);
      setRecommendations((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      alert(err?.message || 'Failed to dismiss recommendation');
    }
  };

  const FILTER_OPTIONS = [
    { id: 'all', labelEn: 'All Priorities', labelAr: 'جميع الأولويات' },
    { id: 'critical', labelEn: 'Critical', labelAr: 'حرجة' },
    { id: 'high', labelEn: 'High Priority', labelAr: 'أولوية مرتفعة' },
    { id: 'medium', labelEn: 'Medium', labelAr: 'متوسطة' },
    { id: 'low', labelEn: 'Low Priority', labelAr: 'منخفضة' },
  ];

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="type-eyebrow mb-1">
            {isRTL
              ? 'مقترحات التدخل التنموي الموجهة بالأدلة الإحصائية'
              : 'Evidence-based intervention opportunities prioritized by return on investment'}
          </div>
          <TwoToneHeading
            first={isRTL ? 'توصيات' : 'AI Policy'}
            second={isRTL ? 'السياسات التنموية' : 'Recommendations'}
            level={1}
            className="type-heading-page"
          />
        </div>

        {/* Priority Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTER_OPTIONS.map((opt) => (
            <DecidixChip
              key={opt.id}
              label={isRTL ? opt.labelAr : opt.labelEn}
              selected={priorityFilter === opt.id}
              onClick={() => setPriorityFilter(opt.id)}
            />
          ))}
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-row bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>✓ {actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 font-bold">✕</button>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner message={isRTL ? 'جارٍ تحميل التوصيات...' : 'Loading recommendations queue...'} />
        </div>
      ) : recommendations.length === 0 ? (
        <DecidixCard variant="card" className="p-12 text-center text-ink">
          <p className="font-bold text-base mb-1">
            {isRTL ? 'لا توجد توصيات تتطلب مراجعة حالياً' : 'All recommended interventions are current.'}
          </p>
          <p className="text-xs text-faded-ink">
            {isRTL ? 'يتم استنتاج التوصيات آلياً بناءً على مؤشرات الأداء' : 'No pending recommendations found for the selected priority filter.'}
          </p>
        </DecidixCard>
      ) : (
        <div className="space-y-3.5">
          {recommendations.map((rec) => (
            <DecidixCard
              key={rec.id}
              variant="row"
              className="flex flex-col md:flex-row md:items-center justify-between gap-5 p-5"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2.5">
                  <PriorityBadge priority={rec.priority} isArabic={isRTL} />
                  <span className="text-xs font-bold text-navy uppercase px-2 py-0.5 rounded bg-well border border-hairline">
                    {rec.domain}
                  </span>
                  <span className="text-xs text-faded-ink font-mono">
                    Region: {rec.region_id}
                  </span>
                </div>

                <h3 className="font-bold text-navy text-base">
                  {isRTL && rec.arabic_title ? rec.arabic_title : rec.title}
                </h3>

                <p className="type-body-m text-ink leading-relaxed">
                  {isRTL && rec.arabic_description ? rec.arabic_description : rec.description}
                </p>

                {rec.expected_impact && (
                  <div className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-pill">
                    <span>▲ Expected Impact: +{rec.expected_impact} pts</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                <DecidixButton
                  variant="outlined"
                  compact
                  onClick={() => handleDismiss(rec.id)}
                >
                  {isRTL ? 'استبعاد' : 'Dismiss'}
                </DecidixButton>
                <DecidixButton
                  variant="primary"
                  compact
                  onClick={() => handleAccept(rec.id)}
                >
                  {isRTL ? 'اعتماد وإدراج' : 'Approve & Schedule'}
                </DecidixButton>
              </div>
            </DecidixCard>
          ))}
        </div>
      )}
    </div>
  );
};
