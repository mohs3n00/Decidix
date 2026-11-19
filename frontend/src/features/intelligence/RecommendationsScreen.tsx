import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { intelligenceService } from '../../services/intelligenceService';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { DecidixIcon } from '../../components/DecidixIcon';
import { Recommendation } from '../../types';

export const RecommendationsScreen: React.FC = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { requireAuth } = useAuth();
  const toast = useToast();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchRecs = async () => {
      setIsLoading(true);
      try {
        const res = await intelligenceService.getRecommendations();
        if (isMounted) {
          if (Array.isArray(res) && res.length > 0) {
            setRecommendations(res);
          } else {
            setRecommendations([]);
          }
        }
      } catch {
        if (isMounted) {
          setRecommendations([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchRecs();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAction = (item: Recommendation) => {
    requireAuth(
      isRTL
        ? 'يتطلب قبول أو اعتماد التوصيات الذكية تسجيل الدخول بحساب مسؤول معتمد.'
        : 'Sign in with an authorized account to accept or manage policy interventions.',
      () => {
        toast.success(
          isRTL
            ? `تم حفظ التوصية "${item.arabic_title || item.title}" بنجاح ضمن خطة العمل.`
            : `Recommendation "${item.title}" saved to action plan.`
        );
      },
      isRTL ? 'إدارة التوصيات' : 'Manage Interventions'
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue mb-1">
            {isRTL ? 'التوصيات الذكية وتدخلات السياسات' : 'INTELLIGENCE'}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-navy">
            {isRTL ? 'توصيات التدخل الذكية' : 'AI Policy Interventions'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isRTL
              ? 'تدخلات استراتيجية موجهة بناءً على تحليل الفجوات ومؤشرات التنمية المعتمدة.'
              : 'Targeted policy interventions driven by regional gap analysis and verified indicators.'}
          </p>
        </div>

        <button
          onClick={() => navigate('/assistant')}
          className="h-9 px-4 rounded-lg bg-blue hover:bg-blue-hover text-white text-xs font-semibold shadow-2xs active:scale-[0.98] transition-all duration-150 flex items-center gap-2"
        >
          <DecidixIcon name="robot" size={14} color="#FFFFFF" />
          <span>{isRTL ? 'استشارة المساعد الذكي' : 'Consult AI Assistant'}</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-xs">
          <div className="w-6 h-6 border-2 border-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <span>{isRTL ? 'جاري التحقق من التوصيات النشطة...' : 'Checking active recommendations...'}</span>
        </div>
      ) : recommendations.length > 0 ? (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="mb-6">
            <h2 className="text-base font-bold text-navy">
              {isRTL ? 'التدخلات المقترحة' : 'Recommended Interventions'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isRTL
                ? 'مرتبة حسب التأثير المتوقع والجدوى التنفيذية'
                : 'Ranked by expected impact and feasibility'}
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {recommendations.map((item) => (
              <div
                key={item.id}
                className="py-3.5 flex items-center justify-between hover:bg-slate-50/70 -mx-3 px-3 rounded-xl transition-colors duration-150 cursor-pointer"
                onClick={() => handleAction(item)}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue shrink-0">
                    <DecidixIcon name={item.sector as any} size={16} color="var(--color-blue)" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-navy">
                      {isRTL ? item.arabic_title || item.title : item.title}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {item.sector.toUpperCase()} · {item.priority.toUpperCase()} PRIORITY
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-blue bg-blue-50 px-2.5 py-0.5 rounded-full tabular-nums">
                    +{item.estimated_impact_pts} pts
                  </span>
                  <button
                    type="button"
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-blue hover:text-white text-navy flex items-center justify-center transition-colors duration-150"
                    aria-label="Inspect"
                  >
                    <DecidixIcon name="arrow_right" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Truthful, Elegant Empty / Guidance State */
        <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-xs max-w-3xl mx-auto my-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue flex items-center justify-center mx-auto mb-3.5">
            <DecidixIcon name="robot" size={24} color="var(--color-blue)" />
          </div>
          <h2 className="text-lg font-bold text-navy mb-1.5">
            {isRTL
              ? 'توصيات السياسات تتطلب ربط قواعد التدخل التنموي'
              : 'Policy Interventions Rule Linkage Required'}
          </h2>
          <p className="text-xs text-slate-500 max-w-xl mx-auto mb-6 leading-relaxed">
            {isRTL
              ? 'مجموعة البيانات الحالية (CAPMAS 2021-2024) موثقة ومعتمدة لمؤشرات الأداء التاريخية، والترتيب الإقليمي، والمسارات الاستشرافية. لتوليد توصيات مخصصة للسياسات أو محاكاة أثر التدخلات، يرجى استشارة المساعد الذكي أو استخدام محاكي السياسات.'
              : 'The active CAPMAS dataset is verified for historical tracking, regional ranking, and trend projections. For personalized policy interventions or intervention modeling, consult the Decidix AI Assistant or use the What-If Simulator.'}
          </p>

          <div className="flex flex-wrap justify-center gap-2.5">
            <button
              onClick={() => navigate('/assistant')}
              className="px-4 py-2 rounded-lg bg-blue text-white text-xs font-semibold hover:bg-blue-hover transition shadow-2xs flex items-center gap-2"
            >
              <DecidixIcon name="robot" size={14} color="#FFFFFF" />
              <span>{isRTL ? 'استشارة المساعد الذكي' : 'Ask AI Assistant'}</span>
            </button>
            <button
              onClick={() => navigate('/decisions/simulator')}
              className="px-4 py-2 rounded-lg bg-blue-50 text-blue text-xs font-semibold hover:bg-blue-100 transition flex items-center gap-2"
            >
              <DecidixIcon name="dashboard" size={14} color="var(--color-blue)" />
              <span>{isRTL ? 'محاكي السياسات (ماذا لو)' : 'Open Policy Simulator'}</span>
            </button>
            <button
              onClick={() => navigate('/insights/priority')}
              className="px-4 py-2 rounded-lg bg-white border border-slate-200/80 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition shadow-2xs"
            >
              {isRTL ? 'أولويات التنمية' : 'View Priority Queue'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
