import React, { useState, useEffect } from 'react';
import { decisionsService } from '../../services/decisionsService';
import { overviewService } from '../../services/overviewService';
import { SimulationResult, RegionListItem } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
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
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <TwoToneHeading
            first={isRTL ? 'محاكي' : 'Policy & Budget'}
            second={isRTL ? 'السياسات التنموية' : 'Simulator'}
            level={1}
            className="text-3xl font-extrabold"
          />
          <p className="text-sm text-faded-ink mt-1">
            {isRTL
              ? 'اختبر سيناريوهات إعادة تخصيص الموازنات التقديرية واحسب الأثر المتوقع على المؤشرات'
              : 'Interactive What-If budget allocation modeling with instantaneous marginal return calculation'}
          </p>
        </div>

        {/* Region Picker */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-faded-ink">{isRTL ? 'المنطقة:' : 'Target Region:'}</span>
          <select
            value={selectedRegionId}
            onChange={(e) => setSelectedRegionId(e.target.value)}
            className="decidix-input font-bold text-xs py-1.5 px-3 w-auto"
          >
            {regions.map((r) => (
              <option key={r.region_id} value={r.region_id}>
                {t(r, 'name')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sliders Control Panel */}
        <div className="lg:col-span-2 decidix-card p-6 md:p-8 space-y-6 bg-white">
          <div className="flex items-center justify-between pb-4 border-b border-line">
            <h3 className="font-bold text-navy text-lg">
              {isRTL ? 'توزيع المخصصات المالية (USD)' : 'Domain Capital Allocations'}
            </h3>
            <div className="text-xs font-bold px-3 py-1 rounded-pill bg-blue/10 text-blue">
              {isRTL ? 'الإجمالي: ' : 'Total: '}${(totalBudget / 1_000_000).toFixed(1)}M
            </div>
          </div>

          {/* Education Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-navy flex items-center gap-2">
                <DecidixIcon name="education" size={16} color="#2563EB" />
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
              className="w-full accent-blue cursor-pointer h-2 bg-well rounded-lg appearance-none"
            />
          </div>

          {/* Healthcare Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-navy flex items-center gap-2">
                <DecidixIcon name="healthcare" size={16} color="#2563EB" />
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
              className="w-full accent-blue cursor-pointer h-2 bg-well rounded-lg appearance-none"
            />
          </div>

          {/* Infrastructure Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-navy flex items-center gap-2">
                <DecidixIcon name="infrastructure" size={16} color="#2563EB" />
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
              className="w-full accent-blue cursor-pointer h-2 bg-well rounded-lg appearance-none"
            />
          </div>

          {/* Economy Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-navy flex items-center gap-2">
                <DecidixIcon name="economy" size={16} color="#2563EB" />
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
              className="w-full accent-blue cursor-pointer h-2 bg-well rounded-lg appearance-none"
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={runSimulation}
              disabled={isSimulating}
              className="decidix-btn-secondary text-xs"
            >
              {isSimulating ? (isRTL ? 'جارٍ الحساب...' : 'Recalculating...') : (isRTL ? 'إعادة المحاكاة ⟳' : 'Recalculate ⟳')}
            </button>
          </div>
        </div>

        {/* Real-time Projected Outcome Card */}
        <div className="decidix-card p-6 md:p-8 bg-gradient-to-br from-white via-white to-well flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-faded-ink">
                {isRTL ? 'الأثر التنموي المتوقع' : 'Projected Policy Gain'}
              </span>
              {isSimulating && (
                <div className="w-3.5 h-3.5 border-2 border-blue border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>

            {simulation ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-black text-navy tracking-tight">
                      {simulation.projected_score.toFixed(1)}
                    </span>
                    <span className="text-sm font-semibold text-faded-ink">/ 100</span>

                    <span className="text-sm font-bold px-2.5 py-1 rounded-pill bg-emerald-50 text-emerald-600">
                      +{simulation.net_gain.toFixed(1)} pts
                    </span>
                  </div>

                  <div className="text-xs text-ink">
                    {isRTL ? 'المستوى الحالي: ' : 'Baseline Score: '}
                    <strong className="text-navy">{simulation.current_score.toFixed(1)}</strong>
                  </div>
                </div>

                {/* Domain Impacts Breakdown */}
                {simulation.domain_impacts && (
                  <div className="space-y-3 pt-4 border-t border-line">
                    <div className="text-xs font-bold text-navy">
                      {isRTL ? 'مكاسب القطاعات التفصيلية:' : 'Sector-Specific Gains:'}
                    </div>

                    {Object.entries(simulation.domain_impacts).map(([dom, impact]) => (
                      <div key={dom} className="flex items-center justify-between text-xs">
                        <span className="text-ink capitalize">{dom}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-faded-ink">{impact.before.toFixed(1)} →</span>
                          <span className="font-bold text-navy">{impact.after.toFixed(1)}</span>
                          <span className="text-emerald-600 font-semibold">
                            (+{impact.delta.toFixed(1)})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="py-12 text-center text-ink text-sm">
                {isRTL ? 'قم بتحريك أشرطة التخصيص لبدء المحاكاة' : 'Adjust sliders to simulate return'}
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-line text-[11px] text-faded-ink">
            {isRTL
              ? 'مبني على معادلات المرونة الاقتصادية والإنتاجية القطاعية المعتمدة.'
              : 'Computed via validated marginal productivity elasticity coefficients.'}
          </div>
        </div>
      </div>
    </div>
  );
};
