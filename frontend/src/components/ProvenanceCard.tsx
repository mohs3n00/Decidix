import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface ProvenanceCardProps {
  provenance?: {
    answer_source?: 'model' | 'deterministic_fallback' | 'refusal';
    provider_status?: string | null;
    model_name?: string;
    retrieved_regions?: number;
    disclaimer_en?: string;
    disclaimer_ar?: string;
    is_official?: boolean;
    is_simulated?: boolean;
    validation_status?: string;
  };
}

export const ProvenanceCard: React.FC<ProvenanceCardProps> = ({ provenance }) => {
  const { isRTL } = useLanguage();
  if (!provenance) return null;

  const isDeterministic = provenance.answer_source === 'deterministic_fallback';
  const isSimulated = provenance.is_simulated || provenance.validation_status === 'simulated';

  return (
    <div className="decidix-card-well p-4 text-xs text-ink space-y-1.5 border-l-4 border-l-blue">
      <div className="flex items-center justify-between font-semibold">
        <span className="text-navy flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue inline-block"></span>
          {isRTL ? 'بيانات المصدر والمصداقية' : 'Data Provenance & Reliability'}
        </span>
        <span className="decidix-pill-badge bg-blue/10 text-blue font-bold">
          {provenance.model_name || (isDeterministic ? 'Canonical Aggregation' : 'Verified Pipeline')}
        </span>
      </div>

      {isDeterministic && (
        <p className="text-amber-800 font-medium">
          {isRTL
            ? 'ملاحظة: هذا ملخص مستخرج مباشرة من قاعدة البيانات المرجعية المعتمدة (Extraction Fallback).'
            : 'Notice: This summary is directly extracted from verified database records (Deterministic Fallback).'}
        </p>
      )}

      {isSimulated && (
        <p className="text-indigo-800">
          {isRTL
            ? provenance.disclaimer_ar || 'بيانات تنبؤية محاكاة وليست إحصاءات رسمية معتمدة.'
            : provenance.disclaimer_en || 'Simulated projections for planning purposes; not official census data.'}
        </p>
      )}

      {provenance.retrieved_regions !== undefined && (
        <div className="text-faded-ink">
          {isRTL
            ? `المناطق المرجعية المفحوصة: ${provenance.retrieved_regions} منطقة`
            : `Grounded in ${provenance.retrieved_regions} verified regional record(s)`}
        </div>
      )}
    </div>
  );
};
