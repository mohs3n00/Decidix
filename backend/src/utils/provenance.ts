export type DataClassification =
  | 'official_observed'
  | 'third_party_published'
  | 'synthetic_demonstration'
  | 'derived_calculation'
  | 'experimental_ml'
  | 'simulated_scenario'
  | 'unavailable';

export type SourceClassification = 'synthetic_demo' | 'official_source' | 'unknown';

export interface Provenance {
  data_classification: DataClassification;
  /** Classification of the SOURCE dataset, distinct from how this result was derived. */
  source_classification?: SourceClassification;
  source: string | null;
  dataset_version: string | null;
  observation_period: string | null;
  method: string | null;
  verification_status: 'verified' | 'unverified' | 'not_applicable';
  disclaimer_en: string;
  disclaimer_ar: string;
}

export const SYNTHETIC_PROVENANCE: Provenance = {
  data_classification: 'synthetic_demonstration',
  source: 'Decidix development fixtures',
  dataset_version: 'synthetic-v2.0.0',
  observation_period: '2019-2025',
  method: 'Algorithmically generated development fixtures; not an observed statistical series.',
  verification_status: 'unverified',
  disclaimer_en: 'Synthetic demonstration data. It is not an official measurement and must not be used as evidence of national or regional performance.',
  disclaimer_ar: 'بيانات توضيحية اصطناعية. ليست قياسات رسمية ولا يجوز استخدامها دليلاً على الأداء الوطني أو الإقليمي.',
};

export const UNAVAILABLE_PROVENANCE: Provenance = {
  data_classification: 'unavailable',
  source: null,
  dataset_version: null,
  observation_period: null,
  method: null,
  verification_status: 'not_applicable',
  disclaimer_en: 'Unavailable: no verified observations are available for this output.',
  disclaimer_ar: 'غير متاح: لا توجد ملاحظات موثقة متاحة لهذا المخرج.',
};
