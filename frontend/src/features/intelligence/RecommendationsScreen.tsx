import React, { useState, useEffect } from 'react';
import { intelligenceService } from '../../services/intelligenceService';
import { Recommendation, PriorityLevel } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <TwoToneHeading
            first={isRTL ? 'توصيات' : 'AI Policy'}
            second={isRTL ? 'السياسات الذكية' : 'Recommendations'}
            level={1}
            className="text-3xl font-extrabold"
          />
          <p className="text-sm text-faded-ink mt-1">
            {isRTL
              ? 'مقترحات سياسات وتدخلات استثمارية مولدة آلياً ومقاسة بالأثر والميزانية'
              : 'Autonomous intervention opportunities ranked by cost-effectiveness & index gains'}
          </p>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-1 p-1 bg-white border border-line rounded-pill">
          {['all', 'critical', 'high', 'medium', 'low'].map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1.5 text-xs font-bold rounded-pill transition uppercase ${
                priorityFilter === p
                  ? 'bg-blue text-white shadow-sm'
                  : 'text-ink hover:text-navy hover:bg-well'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-card bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-between">
          <span>✓ {actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 font-bold">✕</button>
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner message={isRTL ? 'جارٍ تحميل التوصيات...' : 'Retrieving policy recommendations...'} />
      ) : recommendations.length === 0 ? (
        <div className="decidix-card p-12 text-center text-ink">
          <p className="font-semibold text-base mb-1">
            {isRTL ? 'لا توجد توصيات معلقة حالياً.' : 'No pending recommendations.'}
          </p>
          <p className="text-xs text-faded-ink">
            {isRTL ? 'كافة التوصيات مدرجة في خطة العمل أو تمت أرشفتها.' : 'All recommended interventions have been incorporated into planning.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((rec) => (
            <div key={rec.id} className="decidix-card p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue bg-blue/10 px-2.5 py-1 rounded-pill">
                    {rec.sector}
                  </span>
                  <PriorityBadge priority={rec.priority} isArabic={isRTL} />
                </div>

                <h3 className="font-bold text-navy text-base mb-2">
                  {t(rec, 'title')}
                </h3>
                <p className="text-xs text-ink mb-4 leading-relaxed line-clamp-3">
                  {t(rec, 'description')}
                </p>

                <div className="space-y-2 p-3 rounded-well bg-well text-xs mb-6">
                  <div className="flex justify-between">
                    <span className="text-faded-ink">{isRTL ? 'الأثر المتوقع:' : 'Index Gain:'}</span>
                    <strong className="text-navy">+{rec.estimated_impact_pts} pts</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-faded-ink">{isRTL ? 'الميزانية التقديرية:' : 'Cost:'}</span>
                    <strong className="text-navy">
                      ${(rec.estimated_cost?.amount / 1_000_000).toFixed(1)}M {rec.estimated_cost?.currency}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-faded-ink">{isRTL ? 'المدى الزمني:' : 'Timeframe:'}</span>
                    <strong className="text-navy">{rec.timeframe_months} {isRTL ? 'شهراً' : 'months'}</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-line">
                <button
                  onClick={() => handleAccept(rec.id)}
                  className="decidix-btn-primary flex-1 text-xs py-2 font-bold"
                >
                  ✓ {isRTL ? 'إضافة للخطة' : 'Add to Plan'}
                </button>
                <button
                  onClick={() => handleDismiss(rec.id)}
                  className="decidix-btn-secondary text-xs py-2 px-3 hover:text-danger hover:border-danger"
                  title={isRTL ? 'استبعاد' : 'Dismiss'}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
