import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { overviewService } from '../../services/overviewService';
import { RegionProfile } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { PriorityBadge } from '../../components/PriorityBadge';
import { MetricCard } from '../../components/MetricCard';
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
    return <LoadingSpinner message={isRTL ? 'جارٍ تحميل الملف التنموي للمنطقة...' : 'Loading regional dossier...'} />;
  }

  if (error || !profile) {
    return (
      <div className="p-8 rounded-card bg-rose-50 border border-rose-200 text-danger text-center">
        <h3 className="font-bold text-lg mb-2">{isRTL ? 'تعذر استرجاع ملف المنطقة' : 'Profile Unavailable'}</h3>
        <p>{error || 'Region not found in registry.'}</p>
        <Link to="/regions" className="decidix-btn-primary mt-4 inline-block">
          {isRTL ? 'العودة لدليل المناطق' : 'Back to Regions'}
        </Link>
      </div>
    );
  }

  // Combine region history and national history for Recharts
  const chartData = profile.history?.region?.map((pt, i) => {
    const natPt = profile.history.national?.[i];
    return {
      year: pt.year,
      region: pt.value,
      national: natPt ? natPt.value : null,
    };
  }) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs font-semibold text-faded-ink">
        <Link to="/regions" className="hover:text-blue">{isRTL ? 'دليل المناطق' : 'Regions'}</Link>
        <span>/</span>
        <span className="text-navy">{t(profile, 'name')}</span>
      </div>

      {/* Hero Header Card */}
      <div className="decidix-card p-6 md:p-8 bg-white flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-4 border-b-blue">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-blue text-white flex items-center justify-center font-black text-xs">
              #{profile.rank}
            </span>
            <h1 className="text-3xl font-black text-navy">{t(profile, 'name')}</h1>
            <PriorityBadge priority={profile.priority} isArabic={isRTL} />
          </div>

          <p className="text-sm text-faded-ink">
            {profile.governorate || t(profile, 'name')} • {isRTL ? 'السكان المقدرين: ' : 'Population: '}
            <strong className="text-navy">
              {profile.population ? (profile.population / 1_000_000).toFixed(2) + 'M' : 'N/A'}
            </strong>
          </p>
        </div>

        <div className="flex items-baseline gap-6 p-4 rounded-well bg-well self-start md:self-auto">
          <div>
            <div className="text-xs font-semibold text-faded-ink uppercase">{isRTL ? 'درجة المؤشر' : 'Composite Index'}</div>
            <div className="text-4xl font-black text-navy">{profile.score.toFixed(1)}</div>
          </div>

          <div>
            <div className="text-xs font-semibold text-faded-ink uppercase">{isRTL ? 'التغير السنوي' : 'Annual Delta'}</div>
            <div className={`text-xl font-bold ${profile.change >= 0 ? 'text-emerald-600' : 'text-danger'}`}>
              {profile.change >= 0 ? '+' : ''}{profile.change.toFixed(1)} pts
            </div>
          </div>
        </div>
      </div>

      {/* Domain Breakdown Grid */}
      {profile.domains && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-navy">
            {isRTL ? 'الأداء التنموي عبر القطاعات' : 'Domain Performance Breakdown'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {profile.domains.map((dom) => (
              <div key={dom.key} className="decidix-card p-5 space-y-2">
                <div className="text-xs font-semibold text-faded-ink uppercase tracking-wider">
                  {t(dom, 'name')}
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-navy">{dom.score.toFixed(1)}</span>
                  <span className={`text-xs font-bold ${dom.change >= 0 ? 'text-emerald-600' : 'text-danger'}`}>
                    {dom.change >= 0 ? '+' : ''}{dom.change.toFixed(1)}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-well rounded-pill overflow-hidden">
                  <div
                    className="h-full bg-blue rounded-pill"
                    style={{ width: `${Math.min(100, dom.score)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trajectory Comparison: Region vs National */}
      <div className="decidix-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-navy text-base">
            {isRTL ? 'مقارنة المسار التاريخي مع المتوسط الوطني' : 'Historical Trajectory vs National Average'}
          </h3>
          <span className="text-xs font-semibold text-faded-ink">
            {isRTL ? 'المؤشر العام' : 'Composite Score Trend'}
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="year" stroke="#7D8AA0" fontSize={11} tickLine={false} />
              <YAxis stroke="#7D8AA0" fontSize={11} domain={['dataMin - 5', 'dataMax + 5']} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#061A3A',
                  color: '#FFFFFF',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '12px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="region"
                name={t(profile, 'name')}
                stroke="#2563EB"
                strokeWidth={3}
                dot={{ r: 4 }}
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
      </div>

      {/* Key Metrics Grid */}
      {profile.key_metrics && profile.key_metrics.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-navy">
            {isRTL ? 'المؤشرات التفصيلية للمنطقة' : 'Key Detailed Metrics'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {profile.key_metrics.map((m) => (
              <MetricCard key={m.key} metric={m} isArabic={isRTL} />
            ))}
          </div>
        </div>
      )}

      {/* Strengths & Vulnerabilities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="decidix-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h3 className="font-bold text-navy text-base">
              {isRTL ? 'نقاط القوة التنموية' : 'Developmental Strengths'}
            </h3>
          </div>
          <div className="space-y-2">
            {profile.strengths?.map((s, i) => (
              <div key={i} className="p-3 rounded-well bg-emerald-50/50 text-emerald-900 text-xs font-medium border border-emerald-100 flex items-center gap-2">
                <span>✓</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="decidix-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <h3 className="font-bold text-navy text-base">
              {isRTL ? 'الفجوات ونقاط الضعف التي تتطلب تدخلاً' : 'Vulnerabilities & Policy Targets'}
            </h3>
          </div>
          <div className="space-y-2">
            {profile.vulnerabilities?.map((v, i) => (
              <div key={i} className="p-3 rounded-well bg-rose-50/50 text-rose-900 text-xs font-medium border border-rose-100 flex items-center gap-2">
                <span>⚠</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
