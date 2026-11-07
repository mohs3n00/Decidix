import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { intelligenceService } from '../../services/intelligenceService';
import { Recommendation } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { PriorityBadge } from '../../components/PriorityBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { DecidixIcon } from '../../components/DecidixIcon';
import { useLanguage } from '../../context/LanguageContext';

export const IntelligenceScreen: React.FC = () => {
  const { isRTL, t } = useLanguage();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchRecs = async () => {
    try {
      setIsLoading(true);
      const data = await intelligenceService.getRecommendations();
      setRecommendations(data || []);
    } catch {
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecs();
  }, []);

  const handleAccept = async (id: string) => {
    try {
      await intelligenceService.acceptRecommendation(id);
      setActionMessage(isRTL ? 'تمت إضافة التوصية إلى خطة العمل الإقليمية بنجاح!' : 'Added recommendation to plan successfully!');
      setRecommendations((prev) => prev.filter((r) => r.id !== id));
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Failed to accept recommendation');
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await intelligenceService.dismissRecommendation(id);
      setRecommendations((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      alert(err?.message || 'Failed to dismiss');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <TwoToneHeading
            first={isRTL ? 'مركز' : 'Intelligence'}
            second={isRTL ? 'الذكاء والتحليل' : 'Hub'}
            level={1}
            className="text-3xl font-extrabold"
          />
          <p className="text-sm text-faded-ink mt-1">
            {isRTL
              ? 'توقعات نماذج تعلم الآلة التنبؤية وتوصيات السياسات المدعومة بالذكاء الاصطناعي'
              : 'Machine learning forecasting, predictive trajectories, and automated policy recommendations'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/intelligence/predictions" className="decidix-btn-secondary text-xs">
            {isRTL ? 'عرض التوقعات التفصيلية ↗' : 'View Full Predictions ↗'}
          </Link>
          <Link to="/assistant" className="decidix-btn-primary text-xs">
            <DecidixIcon name="spark" size={14} color="#FFFFFF" />
            <span>{isRTL ? 'محادثة المساعد الذكي' : 'Launch AI Assistant'}</span>
          </Link>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-card bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-between">
          <span>✓ {actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-emerald-600 font-bold">✕</button>
        </div>
      )}

      {/* Intelligence Pillar Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="decidix-card p-6 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue/10 text-blue flex items-center justify-center mb-4">
              <DecidixIcon name="intelligence" size={20} color="#2563EB" />
            </div>
            <h3 className="font-bold text-navy text-lg mb-2">
              {isRTL ? 'تنبؤات تعلم الآلة (ML)' : 'ML Trajectory Forecasting'}
            </h3>
            <p className="text-sm text-ink mb-4">
              {isRTL
                ? 'نماذج استشرافية مبنية على سلاسل زمنية واقعية للسنوات 2027، 2028، 2030.'
                : 'Long-horizon statistical projections and domain trajectory simulations.'}
            </p>
          </div>
          <Link
            to="/intelligence/predictions"
            className="text-xs font-bold text-blue hover:underline inline-flex items-center gap-1"
          >
            {isRTL ? 'استعراض النماذج ←' : 'Explore Models →'}
          </Link>
        </div>

        <div className="decidix-card p-6 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-cyan/20 text-navy flex items-center justify-center mb-4">
              <DecidixIcon name="spark" size={20} color="#061A3A" />
            </div>
            <h3 className="font-bold text-navy text-lg mb-2">
              {isRTL ? 'مساعد القرار الذكي' : 'Autonomous AI Assistant'}
            </h3>
            <p className="text-sm text-ink mb-4">
              {isRTL
                ? 'محرك استرجاع مؤسس على بيانات المحافظات المصرية مع سياسة التكلفة الصفرية.'
                : 'Zero-cost OpenRouter model grounded strictly in canonical database records.'}
            </p>
          </div>
          <Link
            to="/assistant"
            className="text-xs font-bold text-blue hover:underline inline-flex items-center gap-1"
          >
            {isRTL ? 'فتح المحادثة ←' : 'Start Discussion →'}
          </Link>
        </div>

        <div className="decidix-card p-6 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
              <DecidixIcon name="trend_up" size={20} color="#B45309" />
            </div>
            <h3 className="font-bold text-navy text-lg mb-2">
              {isRTL ? 'محاكي القرارات والميزانيات' : 'What-If Policy Simulator'}
            </h3>
            <p className="text-sm text-ink mb-4">
              {isRTL
                ? 'محاكاة أثر إعادة توزيع المخصصات المالية على مؤشرات الصحة والتعليم والبنية التحتية.'
                : 'Model the quantitative impact of budget reallocations across domains.'}
            </p>
          </div>
          <Link
            to="/decisions/simulator"
            className="text-xs font-bold text-blue hover:underline inline-flex items-center gap-1"
          >
            {isRTL ? 'بدء المحاكاة ←' : 'Launch Simulator →'}
          </Link>
        </div>
      </div>

      {/* AI Recommendations Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-navy">
              {isRTL ? 'التوصيات المقترحة لدعم القرار' : 'Active Policy Recommendations'}
            </h2>
            <p className="text-xs text-faded-ink mt-0.5">
              {isRTL
                ? 'مقترحات مستنتجة آلياً لسد الفجوات التنموية في المحافظات والمناطق الأكثر احتياجاً'
                : 'Evidence-based intervention opportunities prioritized by return on investment'}
            </p>
          </div>
          <Link
            to="/intelligence/recommendations"
            className="text-xs font-semibold text-blue hover:underline"
          >
            {isRTL ? 'عرض جميع التوصيات' : 'Manage all'}
          </Link>
        </div>

        {isLoading ? (
          <LoadingSpinner message={isRTL ? 'جارٍ تحميل التوصيات...' : 'Loading recommendations...'} />
        ) : recommendations.length === 0 ? (
          <div className="decidix-card p-8 text-center text-ink">
            <p className="font-medium">
              {isRTL
                ? 'لا توجد توصيات مقترحة معلقة حالياً، أو تم إدراجها جميعاً في خطة العمل.'
                : 'No pending recommendations. All items have been processed or added to plan.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recommendations.slice(0, 4).map((rec) => (
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
                  <p className="text-sm text-ink line-clamp-3 mb-4 leading-relaxed">
                    {t(rec, 'description')}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs text-faded-ink mb-6 p-3 rounded-well bg-well">
                    <div>
                      {isRTL ? 'الأثر المتوقع: ' : 'Projected Gain: '}
                      <strong className="text-navy">+{rec.estimated_impact_pts} pts</strong>
                    </div>
                    <div>
                      {isRTL ? 'الميزانية التقديرية: ' : 'Est. Cost: '}
                      <strong className="text-navy">${(rec.estimated_cost?.amount / 1_000_000).toFixed(1)}M</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-line">
                  <button
                    onClick={() => handleAccept(rec.id)}
                    className="decidix-btn-primary flex-1 text-xs py-2"
                  >
                    ✓ {isRTL ? 'إضافة إلى الخطة' : 'Add to Plan'}
                  </button>
                  <button
                    onClick={() => handleDismiss(rec.id)}
                    className="decidix-btn-secondary text-xs py-2 px-4 hover:text-danger hover:border-danger"
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
    </div>
  );
};
