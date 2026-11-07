import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { overviewService } from '../../services/overviewService';
import { RegionProfile } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { HeroCard } from '../../components/HeroCard';
import { DecidixCard } from '../../components/DecidixCard';
import { PriorityBadge } from '../../components/PriorityBadge';
import { TrendIndicator } from '../../components/TrendIndicator';
import { StatWell } from '../../components/StatWell';
import { ScoreRing } from '../../components/ScoreRing';
import { AiInsightPanel } from '../../components/AiInsightPanel';
import { ProvenanceCard } from '../../components/ProvenanceCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { DecidixIcon } from '../../components/DecidixIcon';
import { useLanguage } from '../../context/LanguageContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export const RegionProfileScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isRTL, t } = useLanguage();
  const [profile, setProfile] = useState<RegionProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        setError(null);
        const data = await overviewService.getRegionProfile(id);
        if (isMounted) setProfile(data);
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'Failed to load region profile');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner message={isRTL ? 'جارٍ تحميل الملف التنموي للمنطقة...' : 'Loading regional dossier...'} />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-8 rounded-card bg-rose-50 border border-rose-200 text-danger text-center">
        <h3 className="font-bold text-lg mb-2">{isRTL ? 'تعذر استرجاع ملف المنطقة' : 'Profile Unavailable'}</h3>
        <p className="text-sm">{error || 'Region not found in registry.'}</p>
        <Link to="/regions" className="decidix-btn-primary mt-4 inline-flex">
          {isRTL ? 'العودة لدليل المناطق' : 'Back to Regions'}
        </Link>
      </div>
    );
  }

  const chartData = profile.history?.region?.map((pt, i) => {
    const natPt = profile.history.national?.[i];
    return {
      year: pt.year,
      region: pt.value,
      national: natPt ? natPt.value : null,
    };
  }) || [];

  const rawScore = profile.score ?? 0;
  const scoreNum = Number(rawScore) || 0;

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-semibold text-faded-ink">
        <Link to="/regions" className="hover:text-blue transition">
          {isRTL ? 'دليل المناطق' : 'Regions'}
        </Link>
        <span>/</span>
        <span className="text-navy font-bold">{t(profile, 'name')}</span>
      </div>

      {/* Signature Hero Card for Region */}
      <HeroCard>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-pill bg-white text-navy border border-hairline shadow-sm">
                #{profile.rank} of {profile.rank_total || 27}
              </span>
              <PriorityBadge priority={profile.priority} isArabic={isRTL} />
              {profile.history_is_observed && (
                <span className="text-[11px] font-semibold text-blue bg-blue/10 px-2 py-0.5 rounded-pill">
                  {isRTL ? 'بيانات رصد معتمدة' : 'Observed Census Data'}
                </span>
              )}
            </div>

            <div>
              <TwoToneHeading
                first={t(profile, 'name')}
                second={profile.governorate || (isRTL ? 'إقليم جمهورية مصر' : 'Egyptian Governorate')}
                level={1}
                className="type-heading-page"
              />
              <p className="type-caption-regular text-ink mt-1">
                {isRTL
                  ? 'ملف تنموي شامل يغطي التعليم، الصحة، الاقتصاد، والبنية التحتية الأساسية.'
                  : 'Comprehensive developmental profile across education, healthcare, economy, and infrastructure.'}
              </p>
            </div>

            {/* Quick Inset Stat Wells */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <StatWell
                value={scoreNum.toFixed(1)}
                label={isRTL ? 'درجة المؤشر' : 'Composite Score'}
              />
              <StatWell
                value={profile.population ? `${(profile.population / 1_000_000).toFixed(2)}M` : 'N/A'}
                label={isRTL ? 'السكان' : 'Population'}
              />
              <StatWell
                value={profile.area_km2 ? `${profile.area_km2.toLocaleString()} km²` : 'N/A'}
                label={isRTL ? 'المساحة' : 'Area (km²)'}
              />
            </div>
          </div>

          {/* Right Column: Score Ring & Annual Delta */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-white/70 rounded-card border border-white shadow-sm space-y-3">
            <ScoreRing score={scoreNum} size={90} strokeWidth={8} />

            <div className="text-center">
              <div className="text-xs font-bold text-faded-ink uppercase tracking-wider">
                {isRTL ? 'المستوى العام' : 'Overall Index Score'}
              </div>
              <div className="mt-1 flex items-center justify-center gap-2">
                <TrendIndicator value={profile.change ?? 0} />
                <span className="text-xs text-ink">vs previous period</span>
              </div>
            </div>
          </div>
        </div>
      </HeroCard>

      {/* AI Insight Panel */}
      {profile.ai_insight && (
        <AiInsightPanel
          label={isRTL ? 'ملخص تحليلي للمنطقة' : 'Regional Intelligence Synthesis'}
          body={isRTL && profile.ai_insight.arabic_text ? profile.ai_insight.arabic_text : profile.ai_insight.text}
          confidence={profile.ai_insight.confidence}
        />
      )}

      {/* Domain Breakdown Grid */}
      {profile.domains && (
        <div className="space-y-3.5">
          <h2 className="type-heading-section text-navy">
            {isRTL ? 'الأداء التنموي عبر القطاعات' : 'Domain Performance Breakdown'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {profile.domains.map((dom) => (
              <DecidixCard key={dom.key} variant="row" className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-ink">
                  <span>{t(dom, 'name')}</span>
                  <DecidixIcon name={dom.key as any} size={15} color="var(--color-blue)" />
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="type-number-l text-navy">
                    {dom.score != null ? dom.score.toFixed(1) : 'N/A'}
                  </span>
                  {dom.change != null && (
                    <TrendIndicator value={dom.change} size="sm" />
                  )}
                </div>

                <div className="w-full h-2 bg-well rounded-pill overflow-hidden">
                  <div
                    className="h-full bg-blue rounded-pill transition-all duration-500"
                    style={{ width: `${Math.min(100, dom.score ?? 0)}%` }}
                  />
                </div>
              </DecidixCard>
            ))}
          </div>
        </div>
      )}

      {/* Historical Trend vs National Average */}
      <DecidixCard variant="card" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="type-heading-section text-navy">
              {isRTL ? 'المسار التاريخي مقارنة بالمتوسط الوطني' : 'Historical Trajectory vs National Average'}
            </h3>
            <p className="text-xs text-faded-ink mt-0.5">
              {isRTL
                ? 'مقارنة مسار المنطقة مع المتوسط المرجح لجميع محافظات الجمهورية'
                : 'Regional trajectory benchmarked against the weighted national aggregate'}
            </p>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="year" stroke="#7D8AA0" fontSize={11} tickLine={false} axisLine={{ stroke: '#E3E9F2' }} />
              <YAxis stroke="#7D8AA0" fontSize={11} tickLine={false} axisLine={{ stroke: '#E3E9F2' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-navy)',
                  color: '#FFFFFF',
                  borderRadius: '16px',
                  border: 'none',
                  fontSize: '12px',
                  padding: '8px 14px',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                iconType="circle"
              />
              <Line
                type="monotone"
                dataKey="region"
                name={t(profile, 'name')}
                stroke="var(--color-blue)"
                strokeWidth={3}
                dot={{ r: 4, fill: 'var(--color-blue)' }}
              />
              <Line
                type="monotone"
                dataKey="national"
                name={isRTL ? 'المتوسط الوطني' : 'National Benchmark'}
                stroke="#7D8AA0"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </DecidixCard>

      {/* Canonical Provenance Card */}
      <ProvenanceCard provenance={profile?.data_quality as any} />
    </div>
  );
};
