import React, { useState, useEffect } from 'react';
import { intelligenceService } from '../../services/intelligenceService';
import { PredictionsData } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export const PredictionsScreen: React.FC = () => {
  const { isRTL } = useLanguage();
  const [targetYear, setTargetYear] = useState<number>(2028);
  const [validationStatus, setValidationStatus] = useState<string>('experimental');
  const [predictions, setPredictions] = useState<PredictionsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchPreds = async () => {
      try {
        setIsLoading(true);
        const data = await intelligenceService.getPredictions(targetYear, validationStatus);
        if (isMounted) setPredictions(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchPreds();
    return () => {
      isMounted = false;
    };
  }, [targetYear, validationStatus]);

  const chartData = predictions?.series?.map((pt) => ({
    year: pt.year,
    actual: !pt.is_forecast ? pt.value : null,
    forecast: pt.is_forecast ? pt.value : null,
    lower: pt.lower,
    upper: pt.upper,
  })) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <TwoToneHeading
            first={isRTL ? 'تنبؤات' : 'ML'}
            second={isRTL ? 'تعلم الآلة التنبؤية' : 'Predictions'}
            level={1}
            className="text-3xl font-extrabold"
          />
          <p className="text-sm text-faded-ink mt-1">
            {isRTL
              ? 'نماذج استشرافية إحصائية للتنبؤ بمسارات المؤشرات التنموية ومجالات عدم اليقين'
              : 'Machine learning horizon projections, confidence intervals, and scenario evaluation'}
          </p>
        </div>

        {/* Target Year Selector */}
        <div className="flex items-center gap-1 p-1 bg-white border border-line rounded-pill shadow-sm">
          {[2027, 2028, 2030].map((yr) => (
            <button
              key={yr}
              onClick={() => setTargetYear(yr)}
              className={`px-4 py-1.5 text-xs font-bold rounded-pill transition ${
                targetYear === yr
                  ? 'bg-blue text-white shadow-sm'
                  : 'text-ink hover:text-navy hover:bg-well'
              }`}
            >
              Horizon {yr}
            </button>
          ))}
        </div>
      </div>

      {/* Mandatory Statistical Disclaimer Banner */}
      {predictions?.forecast_classification && (
        <div className="p-4 rounded-card bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <span className="text-base">⚠</span>
          <div>
            <strong className="font-bold">
              {isRTL ? 'تنبيه النمذجة الإحصائية:' : 'Predictive Modeling Disclaimer:'}
            </strong>{' '}
            {isRTL
              ? predictions.forecast_classification.disclaimer_ar || 'هذه مخرجات نمذجة إحصائية تجريبية لأغراض التخطيط والدراسة، ولا تعد إحصاءات أو قرارات رسمية ملزمة.'
              : predictions.forecast_classification.disclaimer_en || 'Projections represent experimental statistical simulations for policy exploration, not official census forecasts.'}
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner message={isRTL ? 'جارٍ توليد التنبؤات الإحصائية...' : 'Computing ML trajectory forecasts...'} />
      ) : predictions ? (
        <>
          {/* Main Forecast Trajectory Chart */}
          <div className="decidix-card p-6 md:p-8 bg-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-navy text-lg">
                  {isRTL ? `المسار التنبؤي المتوقع حتى عام ${targetYear}` : `Projected Trajectory to ${targetYear}`}
                </h3>
                <span className="text-xs text-faded-ink">
                  {isRTL ? 'يتضمن حدود الثقة الدنيا والعليا (Upper / Lower Bounds)' : 'Includes 95% confidence uncertainty interval'}
                </span>
              </div>
              <span className="decidix-pill-badge bg-blue/10 text-blue font-bold">
                {validationStatus.toUpperCase()}
              </span>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="year" stroke="#7D8AA0" fontSize={11} tickLine={false} />
                  <YAxis stroke="#7D8AA0" fontSize={11} domain={['dataMin - 5', 'dataMax + 10']} tickLine={false} />
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
                    dataKey="actual"
                    name={isRTL ? 'البيانات التاريخية المرصودة' : 'Historical Observed'}
                    stroke="#061A3A"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    name={isRTL ? 'التنبؤ المستقبلي' : 'ML Forecast'}
                    stroke="#2563EB"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={{ r: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="upper"
                    name={isRTL ? 'الحد الأعلى' : 'Upper Bound'}
                    stroke="none"
                    fill="#21EAF4"
                    fillOpacity={0.15}
                  />
                  <Area
                    type="monotone"
                    dataKey="lower"
                    name={isRTL ? 'الحد الأدنى' : 'Lower Bound'}
                    stroke="none"
                    fill="#21EAF4"
                    fillOpacity={0.15}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Model Metrics Benchmarks */}
          <div className="space-y-4">
            <h3 className="font-bold text-navy text-base">
              {isRTL ? 'مقاييس جودة النماذج التنبؤية (Model Diagnostics)' : 'Model Validation Diagnostics'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {predictions.models?.map((m, idx) => (
                <div key={idx} className="decidix-card p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-navy text-sm">{m.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-pill bg-well text-faded-ink">
                      {m.type}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-line">
                    <div>
                      <div className="text-faded-ink text-[10px]">MAE</div>
                      <div className="font-bold text-navy">{m.mae?.toFixed(2) ?? 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-faded-ink text-[10px]">RMSE</div>
                      <div className="font-bold text-navy">{m.rmse?.toFixed(2) ?? 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-faded-ink text-[10px]">R²</div>
                      <div className="font-bold text-navy">
                        {m.r2 !== null && m.r2 !== undefined ? m.r2.toFixed(3) : (
                          <span className="text-faded-ink text-[10px]">Unavailable</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
