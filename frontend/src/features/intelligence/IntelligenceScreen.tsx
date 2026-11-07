import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { intelligenceService } from '../../services/intelligenceService';
import { Recommendation } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { DecidixCard } from '../../components/DecidixCard';
import { DecidixButton } from '../../components/DecidixButton';
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
    <div className="space-y-7 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="type-eyebrow mb-1">
            {isRTL
              ? 'توقعات نماذج تعلم الآلة وتوصيات السياسات'
              : 'Machine learning forecasting & automated policy recommendations'}
          </div>
          <TwoToneHeading
            first={isRTL ? 'مركز' : 'Intelligence'}
            second={isRTL ? 'الذكاء والتحليل' : 'Hub'}
            level={1}
            className="type-heading-page"
          />
        </div>

        <div className="flex items-center gap-3">
          <Link to="/intelligence/predictions">
            <DecidixButton variant="outlined" compact>
              {isRTL ? 'عرض التوقعات التفصيلية ↗' : 'View Full Predictions ↗'}
            </DecidixButton>
          </Link>
          <Link to="/assistant">
            <DecidixButton variant="primary" compact>
              <DecidixIcon name="spark" size={14} color="#FFFFFF" />
              <span>{isRTL ? 'محادثة المساعد الذكي' : 'Launch AI Assistant'}</span>
            </DecidixButton>
          </Link>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-row bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>✓ {actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-emerald-600 font-bold">✕</button>
        </div>
      )}

      {/* Intelligence Pillar Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DecidixCard variant="card" className="flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-blue/10 text-blue flex items-center justify-center mb-4">
              <DecidixIcon name="intelligence" size={20} color="var(--color-blue)" />
            </div>
            <h3 className="type-heading-section text-navy mb-2">
              {isRTL ? 'تنبؤات تعلم الآلة (ML)' : 'ML Trajectory Forecasting'}
            </h3>
            <p className="type-body-m text-ink mb-4">
              {isRTL
                ? 'نماذج استشرافية مبنية على سلاسل زمنية واقعية للسنوات 2027، 2028، 2030.'
                : 'Long-horizon statistical projections and domain trajectory simulations.'}
            </p>
          </div>
          <Link
            to="/intelligence/predictions"
            className="text-xs font-bold text-blue hover:underline inline-flex items-center gap-1"
          >
            <span>{isRTL ? 'استعراض النماذج' : 'Explore Models'}</span>
            <span>→</span>
          </Link>
        </DecidixCard>

        <DecidixCard variant="card" className="flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-cyan/20 text-navy flex items-center justify-center mb-4">
              <DecidixIcon name="spark" size={20} color="var(--color-navy)" />
            </div>
            <h3 className="type-heading-section text-navy mb-2">
              {isRTL ? 'مساعد القرار الذكي' : 'Autonomous AI Assistant'}
            </h3>
            <p className="type-body-m text-ink mb-4">
              {isRTL
                ? 'محرك استرجاع مؤسس على بيانات المحافظات المصرية مع سياسة التكلفة الصفرية.'
                : 'Zero-cost OpenRouter model grounded strictly in canonical database records.'}
            </p>
          </div>
          <Link
            to="/assistant"
            className="text-xs font-bold text-blue hover:underline inline-flex items-center gap-1"
          >
            <span>{isRTL ? 'فتح المحادثة' : 'Start Discussion'}</span>
            <span>→</span>
          </Link>
        </DecidixCard>

        <DecidixCard variant="card" className="flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-warning flex items-center justify-center mb-4 border border-amber-100">
              <DecidixIcon name="trend_up" size={20} color="var(--color-warning-text)" />
            </div>
            <h3 className="type-heading-section text-navy mb-2">
              {isRTL ? 'محاكي القرارات والميزانيات' : 'What-If Policy Simulator'}
            </h3>
            <p className="type-body-m text-ink mb-4">
              {isRTL
                ? 'محاكاة أثر إعادة توزيع المخصصات المالية على مؤشرات الصحة والتعليم والبنية التحتية.'
                : 'Model the quantitative impact of budget reallocations across domains.'}
            </p>
          </div>
          <Link
            to="/decisions/simulator"
            className="text-xs font-bold text-blue hover:underline inline-flex items-center gap-1"
          >
            <span>{isRTL ? 'بدء المحاكاة' : 'Launch Simulator'}</span>
            <span>→</span>
          </Link>
        </DecidixCard>
      </div>

      {/* AI Recommendations Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="type-heading-section text-navy">
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
          <div className="py-12 flex justify-center">
            <LoadingSpinner message={isRTL ? 'جارٍ تحميل التوصيات...' : 'Loading recommendations...'} />
          </div>
        ) : recommendations.length === 0 ? (
          <DecidixCard variant="card" className="p-8 text-center text-ink">
            <p className="font-semibold text-sm">
              {isRTL ? 'لا توجد توصيات تتطلب اتخاذ قرار حالياً' : 'All recommended policy interventions are current.'}
            </p>
            <p className="text-xs text-faded-ink mt-1">
              {isRTL ? 'يتم تحديث التوصيات دورياً مع رفع وتدقيق ملفات البيانات' : 'Recommendations update automatically as new datasets are ingested.'}
            </p>
          </DecidixCard>
        ) : (
          <div className="space-y-3">
            {recommendations.slice(0, 5).map((rec) => (
              <DecidixCard
                key={rec.id}
                variant="row"
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={rec.priority} isArabic={isRTL} />
                    <span className="text-xs font-bold text-navy">{rec.domain?.toUpperCase()}</span>
                    <span className="text-xs text-faded-ink">• Region: {rec.region_id}</span>
                  </div>
                  <h4 className="font-bold text-navy text-sm">
                    {isRTL && rec.arabic_title ? rec.arabic_title : rec.title}
                  </h4>
                  <p className="type-body-m text-ink">
                    {isRTL && rec.arabic_description ? rec.arabic_description : rec.description}
                  </p>
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
                    {isRTL ? 'اعتماد' : 'Adopt'}
                  </DecidixButton>
                </div>
              </DecidixCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
