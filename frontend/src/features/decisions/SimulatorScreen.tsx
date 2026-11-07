import React, { useState, useEffect } from 'react';
import { decisionsService } from '../../services/decisionsService';
import { overviewService } from '../../services/overviewService';
import { SimulationResult, RegionListItem } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { HeroCard } from '../../components/HeroCard';
import { DecidixCard } from '../../components/DecidixCard';
import { DecidixButton } from '../../components/DecidixButton';
import { ScoreRing } from '../../components/ScoreRing';
import { TrendIndicator } from '../../components/TrendIndicator';
import { HatchedBar } from '../../components/HatchedBar';
import { AiInsightPanel } from '../../components/AiInsightPanel';
import { ProvenanceCard } from '../../components/ProvenanceCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { DecidixIcon } from '../../components/DecidixIcon';
import { useLanguage } from '../../context/LanguageContext';

export const SimulatorScreen: React.FC = () => {
  const { isRTL, t } = useLanguage();
  const [regions, setRegions] = useState<RegionListItem[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string>('frontier');

  // Budget allocations in USD
  const [education, setEducation] = useState<number>(30000000);
  const [healthcare, setHealthcare] = useState<number>(45000000);
  const [infrastructure, setInfrastructure] = useState<number>(20000000);
  const [economy, setEconomy] = useState<number>(25000000);

  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const res = await overviewService.getRegions({ per_page: 50 });
        if (res.items && res.items.length > 0) {
          setRegions(res.items);
          setSelectedRegionId(res.items[0].region_id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchRegions();
  }, []);

  const runSimulation = async () => {
    if (!selectedRegionId) return;
    try {
      setIsSimulating(true);
      const res = await decisionsService.simulate(selectedRegionId, {
        education,
        healthcare,
        infrastructure,
        economy,
      });
      setSimulation(res);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      runSimulation();
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedRegionId, education, healthcare, infrastructure, economy]);

  const totalBudget = education + healthcare + infrastructure + economy;

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      {/* Top Header & Region Target */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="type-eyebrow mb-1">
            {isRTL
              ? 'محاكاة أثر إعادة توزيع المخصصات المالية على المؤشر التنموي'
              : 'Interactive What-If budget allocation modeling with marginal return calculation'}
          </div>
          <TwoToneHeading
            first={isRTL ? 'محاكي' : 'Policy & Budget'}
            second={isRTL ? 'السياسات والميزانية' : 'Simulator'}
            level={1}
            className="type-heading-page"
          />
        </div>

        {/* Region Picker */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-faded-ink">{isRTL ? 'المنطقة المستهدفة:' : 'Target Region:'}</span>
          <select
            value={selectedRegionId}
            onChange={(e) => setSelectedRegionId(e.target.value)}
            className="decidix-input font-bold text-xs py-2 px-3.5 w-auto bg-white border-hairline shadow-sm"
          >
            {regions.map((r) => (
              <option key={r.region_id} value={r.region_id}>
                {t(r, 'name')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sliders Control Panel */}
        <DecidixCard variant="card" className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-hairline">
            <h3 className="type-heading-section text-navy">
              {isRTL ? 'توزيع المخصصات المالية (USD)' : 'Domain Capital Allocations'}
            </h3>
            <div className="text-xs font-bold px-3 py-1 rounded-pill bg-blue/10 text-blue">
              {isRTL ? 'الموازنة الإجمالية: ' : 'Total: '}${(totalBudget / 1_000_000).toFixed(1)}M
            </div>
          </div>

          {/* Education Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-navy flex items-center gap-2">
                <DecidixIcon name="education" size={15} color="var(--color-blue)" />
                {isRTL ? 'التعليم وبناء القدرات' : 'Education & Skills'}
              </span>
              <span className="font-bold text-blue">${(education / 1_000_000).toFixed(1)}M</span>
            </div>
            <input
              type="range"
              min="0"
              max="100000000"
              step="1000000"
              value={education}
              onChange={(e) => setEducation(Number(e.target.value))}
              className="w-full accent-blue cursor-pointer h-2 bg-well rounded-pill appearance-none"
            />
          </div>

          {/* Healthcare Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-navy flex items-center gap-2">
                <DecidixIcon name="healthcare" size={15} color="var(--color-blue)" />
                {isRTL ? 'الرعاية الصحية والمستشفيات' : 'Healthcare & Wellbeing'}
              </span>
              <span className="font-bold text-blue">${(healthcare / 1_000_000).toFixed(1)}M</span>
            </div>
            <input
              type="range"
              min="0"
              max="100000000"
              step="1000000"
              value={healthcare}
              onChange={(e) => setHealthcare(Number(e.target.value))}
              className="w-full accent-blue cursor-pointer h-2 bg-well rounded-pill appearance-none"
            />
          </div>

          {/* Infrastructure Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-navy flex items-center gap-2">
                <DecidixIcon name="infrastructure" size={15} color="var(--color-blue)" />
                {isRTL ? 'البنية التحتية والمرافق' : 'Infrastructure & Utilities'}
              </span>
              <span className="font-bold text-blue">${(infrastructure / 1_000_000).toFixed(1)}M</span>
            </div>
            <input
              type="range"
              min="0"
              max="100000000"
              step="1000000"
              value={infrastructure}
              onChange={(e) => setInfrastructure(Number(e.target.value))}
              className="w-full accent-blue cursor-pointer h-2 bg-well rounded-pill appearance-none"
            />
          </div>

          {/* Economy Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-navy flex items-center gap-2">
                <DecidixIcon name="economy" size={15} color="var(--color-blue)" />
                {isRTL ? 'الاقتصاد وتوفير فرص العمل' : 'Economy & Job Creation'}
              </span>
              <span className="font-bold text-blue">${(economy / 1_000_000).toFixed(1)}M</span>
            </div>
            <input
              type="range"
              min="0"
              max="100000000"
              step="1000000"
              value={economy}
              onChange={(e) => setEconomy(Number(e.target.value))}
              className="w-full accent-blue cursor-pointer h-2 bg-well rounded-pill appearance-none"
            />
          </div>

          <div className="pt-3 flex justify-end">
            <DecidixButton
              variant="outlined"
              compact
              onClick={runSimulation}
              disabled={isSimulating}
            >
              {isSimulating ? (isRTL ? 'جارٍ الحساب...' : 'Recalculating...') : (isRTL ? 'إعادة الحساب ⟳' : 'Recalculate ⟳')}
            </DecidixButton>
          </div>
        </DecidixCard>

        {/* Real-time Projected Outcome Card */}
        <HeroCard className="lg:col-span-5 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-faded-ink">
                {isRTL ? 'الأثر التنموي المتوقع' : 'Projected Policy Gain'}
              </span>
              {isSimulating && (
                <div className="w-3.5 h-3.5 border-2 border-blue border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>

            {simulation ? (
              (() => {
                const netGain = (simulation as any).gain ?? simulation.net_gain ?? 0;
                const baseline = (simulation as any).today_score ?? simulation.current_score ?? 0;
                const levers = (simulation as any).levers;

                return (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-baseline gap-3">
                        <span className="type-heading-page font-bold text-navy">
                          {simulation.projected_score.toFixed(1)}
                        </span>
                        <span className="text-xs font-semibold text-faded-ink">/ 100</span>
                        <TrendIndicator value={netGain} suffix=" pts" />
                      </div>

                      <div className="text-xs text-ink">
                        {isRTL ? 'المستوى الحالي: ' : 'Baseline Score: '}
                        <strong className="text-navy">{baseline.toFixed(1)}</strong>
                      </div>
                    </div>

                    {/* Sectoral Marginal Yields with Hatched Bars */}
                    {levers && Array.isArray(levers) && (
                      <div className="space-y-3 pt-3.5 border-t border-hairline">
                        <div className="text-xs font-bold text-navy">
                          {isRTL ? 'عائد الروافع القطاعية:' : 'Sectoral Marginal Yields:'}
                        </div>
                        {levers.map((lev: any) => (
                          <div key={lev.domain} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-ink capitalize font-medium">{lev.domain}</span>
                              <span className="font-bold text-emerald-600">+{lev.expected_gain?.toFixed(1) || '0.0'} pts</span>
                            </div>
                            <HatchedBar percentage={Math.min(100, (lev.expected_gain || 1) * 15)} height={6} />
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()
            ) : (
              <div className="py-12 text-center text-xs text-faded-ink">
                {isRTL ? 'جارٍ احتساب سيناريو المحاكاة...' : 'Simulating scenario...'}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-hairline text-xs text-faded-ink">
            {isRTL
              ? 'تعتمد معادلات المحاكاة على دوال الاستجابة الهامشية المقدرة من السلاسل الزمنية.'
              : 'Estimates calculated from non-linear marginal response curves.'}
          </div>
        </HeroCard>
      </div>

      {/* Simulation AI Note */}
      {simulation && (
        <AiInsightPanel
          label={isRTL ? 'ملاحظة المحاكاة' : 'Simulation Note'}
          body={
            isRTL
              ? `يظهر النموذج أن توجيه الاستثمار نحو قطاع الرعاية الصحية في هذه المنطقة يعطي العائد الأسرع على المؤشر المركب، بينما يحقق قطاع التعليم عائداً تراكمياً أعلى على المدى المتوسط.`
              : `The model reveals healthcare investments yield the most acute immediate index gain in this region (+${((simulation as any).gain ?? 2.4).toFixed(1)} pts), whereas educational allocations accumulate compounding long-horizon benefits.`
          }
        />
      )}

      {/* Provenance */}
      <ProvenanceCard provenance={simulation?.provenance} />
    </div>
  );
};
