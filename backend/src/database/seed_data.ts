export interface RegionSeed {
  id: string;
  name: string;
  arabic_name: string;
  rank: number;
  score: number;
  change: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  population: number;
  latitude: number;
  longitude: number;
  domains: {
    education: number;
    healthcare: number;
    economy: number;
    infrastructure: number;
  };
}

export const SEED_REGIONS: RegionSeed[] = [
  { id: 'central_capital', name: 'Central Capital', arabic_name: 'العاصمة المركزية', rank: 1, score: 86, change: 2.9, priority: 'low', population: 9200000, latitude: 30.04, longitude: 31.24, domains: { education: 91, healthcare: 85, economy: 88, infrastructure: 80 } },
  { id: 'lakeside', name: 'Lakeside', arabic_name: 'ضفاف البحيرة', rank: 2, score: 72, change: 2.4, priority: 'low', population: 2800000, latitude: 24.1, longitude: 32.9, domains: { education: 78, healthcare: 74, economy: 68, infrastructure: 68 } },
  { id: 'western_coast', name: 'Western Coast', arabic_name: 'الساحل الغربي', rank: 3, score: 69, change: 1.8, priority: 'low', population: 4600000, latitude: 31.2, longitude: 29.9, domains: { education: 74, healthcare: 71, economy: 67, infrastructure: 64 } },
  { id: 'harbor_lowlands', name: 'Harbor Lowlands', arabic_name: 'سهول الميناء', rank: 4, score: 66, change: 1.5, priority: 'medium', population: 3100000, latitude: 31.1, longitude: 30.5, domains: { education: 71, healthcare: 67, economy: 65, infrastructure: 61 } },
  { id: 'northern_plains', name: 'Northern Plains', arabic_name: 'السهول الشمالية', rank: 5, score: 63, change: 1.1, priority: 'medium', population: 3400000, latitude: 29.6, longitude: 30.4, domains: { education: 68, healthcare: 64, economy: 62, infrastructure: 58 } },
  { id: 'eastern_valley', name: 'Eastern Valley', arabic_name: 'الوادي الشرقي', rank: 6, score: 61, change: 0.6, priority: 'medium', population: 3900000, latitude: 30.6, longitude: 32.3, domains: { education: 65, healthcare: 62, economy: 60, infrastructure: 57 } },
  { id: 'southern_basin', name: 'Southern Basin', arabic_name: 'الحوض الجنوبي', rank: 7, score: 59, change: 0.9, priority: 'medium', population: 3000000, latitude: 25.7, longitude: 32.6, domains: { education: 63, healthcare: 60, economy: 58, infrastructure: 55 } },
  { id: 'riverside', name: 'Riverside', arabic_name: 'ضفة النهر', rank: 8, score: 58, change: 0.4, priority: 'medium', population: 2500000, latitude: 27.2, longitude: 31.2, domains: { education: 61, healthcare: 59, economy: 57, infrastructure: 55 } },
  { id: 'northern_highlands', name: 'Northern Highlands', arabic_name: 'المرتفعات الشمالية', rank: 9, score: 54, change: -1.2, priority: 'high', population: 2100000, latitude: 29.5, longitude: 33.7, domains: { education: 57, healthcare: 53, economy: 53, infrastructure: 53 } },
  { id: 'delta', name: 'Delta', arabic_name: 'الدلتا', rank: 10, score: 52, change: -0.8, priority: 'high', population: 2200000, latitude: 31.0, longitude: 31.4, domains: { education: 55, healthcare: 48, economy: 50, infrastructure: 55 } },
  { id: 'steppe', name: 'Steppe', arabic_name: 'السهوب', rank: 11, score: 47, change: -2.1, priority: 'high', population: 1600000, latitude: 27.5, longitude: 27.5, domains: { education: 49, healthcare: 44, economy: 48, infrastructure: 47 } },
  { id: 'frontier', name: 'Frontier', arabic_name: 'المنطقة الحدودية', rank: 12, score: 44, change: -1.7, priority: 'high', population: 1200000, latitude: 25.5, longitude: 34.8, domains: { education: 46, healthcare: 40, economy: 45, infrastructure: 45 } }
];

export const SEED_OVERVIEW = {
  as_of: '2025-Q4',
  index: {
    score: 68.4,
    max_score: 100,
    change: 2.3,
    compared_with: '2024',
    band: 'moderate_high',
    regions_count: 12,
    population: 39600000,
    at_risk_count: 4
  },
  kpis: [
    { key: 'education', label: 'Education', arabic_label: 'التعليم', value: 74.2, unit: 'score_100', change: 1.8, higher_is_better: true, sparkline: [65.8, 66.5, 67.9, 69.6, 71.4, 72.9, 74.2] },
    { key: 'healthcare', label: 'Healthcare', arabic_label: 'الرعاية الصحية', value: 66.9, unit: 'score_100', change: 1.2, higher_is_better: true, sparkline: [58.0, 58.6, 60.2, 62.3, 64.4, 66.1, 66.9] },
    { key: 'unemployment', label: 'Unemployment', arabic_label: 'البطالة', value: 6.1, unit: 'percent', change: -0.4, higher_is_better: false, sparkline: [7.4, 7.9, 7.2, 6.8, 6.6, 6.5, 6.1] },
    { key: 'infrastructure', label: 'Infrastructure', arabic_label: 'البنية التحتية', value: 63.5, unit: 'score_100', change: 0.9, higher_is_better: true, sparkline: [56.0, 57.2, 58.6, 60.1, 61.7, 62.9, 63.5] }
  ],
  trend_points_7y: [
    { year: 2019, value: 58.2 },
    { year: 2020, value: 59.1 },
    { year: 2021, value: 60.4 },
    { year: 2022, value: 62.2 },
    { year: 2023, value: 64.5 },
    { year: 2024, value: 66.1 },
    { year: 2025, value: 68.4 }
  ],
  ai_insight: {
    text: 'Delta, Steppe and Frontier have declined for three consecutive periods. Healthcare access is the shared bottleneck, with clinic density 38% below the national mean.',
    arabic_text: 'تراجعت الدلتا والسهوب والمنطقة الحدودية لثلاث فترات متتالية. الوصول إلى الرعاية الصحية هو الاختناق المشترك، إذ تقل كثافة العيادات بنسبة 38% عن المتوسط الوطني.'
  }
};

export const SEED_PROJECTS = [
  {
    id: 'prj_delta_clean_water',
    title: 'Delta Clean Water & Sanitation Upgrade',
    arabic_title: 'مشروع مياه الشرب النظيفة والصرف في الدلتا',
    region: { region_id: 'delta', name: 'Delta', arabic_name: 'الدلتا' },
    status: 'in_progress',
    progress: 68,
    budget: { amount: 145000000, currency: 'USD' },
    due_date: '2026-09-30',
    completed_at: null
  },
  {
    id: 'prj_frontier_solar_grid',
    title: 'Frontier Solar Micro-Grid Expansion',
    arabic_title: 'توسعة شبكات الطاقة الشمسية المصغرة في الحدود',
    region: { region_id: 'frontier', name: 'Frontier', arabic_name: 'المنطقة الحدودية' },
    status: 'delayed',
    progress: 42,
    budget: { amount: 84000000, currency: 'USD' },
    due_date: '2026-03-31',
    completed_at: null
  },
  {
    id: 'prj_lakeside_logistics_hub',
    title: 'Lakeside Agricultural Logistics Hub',
    arabic_title: 'مركز الخدمات اللوجستية الزراعية بضفاف البحيرة',
    region: { region_id: 'lakeside', name: 'Lakeside', arabic_name: 'ضفاف البحيرة' },
    status: 'planned',
    progress: 15,
    budget: { amount: 110000000, currency: 'USD' },
    due_date: '2027-06-30',
    completed_at: null
  },
  {
    id: 'prj_central_tech_park',
    title: 'Central Capital Digital Innovation Campus',
    arabic_title: 'مجمع الابتكار الرقمي بالعاصمة المركزية',
    region: { region_id: 'central_capital', name: 'Central Capital', arabic_name: 'العاصمة المركزية' },
    status: 'completed',
    progress: 100,
    budget: { amount: 165000000, currency: 'USD' },
    due_date: null,
    completed_at: '2025-11-20'
  },
  {
    id: 'prj_steppe_health_centers',
    title: 'Steppe Primary Healthcare Network',
    arabic_title: 'شبكة مراكز الرعاية الأولية بالسهوب',
    region: { region_id: 'steppe', name: 'Steppe', arabic_name: 'السهوب' },
    status: 'in_progress',
    progress: 55,
    budget: { amount: 24000000, currency: 'USD' },
    due_date: '2026-12-15',
    completed_at: null
  }
];

export const SEED_REPORTS = [
  {
    id: 'rep_101',
    category: 'water',
    status: 'escalated',
    title: 'Intermittent water supply in East Delta municipal district',
    arabic_title: 'انقطاع متكرر للمياه في منطقة شرق الدلتا البلدية',
    region: { region_id: 'delta', name: 'Delta', arabic_name: 'الدلتا' },
    created_at: '2025-10-24T08:30:00Z',
    likes_count: 142,
    liked_by_me: false
  },
  {
    id: 'rep_102',
    category: 'health',
    status: 'under_review',
    title: 'Shortage of cold-chain pediatric vaccines in Frontier clinics',
    arabic_title: 'نقص لقاحات الأطفال في عيادات المنطقة الحدودية',
    region: { region_id: 'frontier', name: 'Frontier', arabic_name: 'المنطقة الحدودية' },
    created_at: '2025-10-23T14:15:00Z',
    likes_count: 89,
    liked_by_me: false
  },
  {
    id: 'rep_103',
    category: 'roads',
    status: 'under_review',
    title: 'Steppe secondary highway bridge structural crack reported',
    arabic_title: 'صدع إنشائي في جسر الطريق السريع الثانوي بالسهوب',
    region: { region_id: 'steppe', name: 'Steppe', arabic_name: 'السهوب' },
    created_at: '2025-10-22T19:00:00Z',
    likes_count: 215,
    liked_by_me: false
  },
  {
    id: 'rep_104',
    category: 'schools',
    status: 'resolved',
    title: 'Overcrowded secondary school classrooms in Harbor Lowlands',
    arabic_title: 'تكافؤ الفصول المدرسية في سهول الميناء',
    region: { region_id: 'harbor_lowlands', name: 'Harbor Lowlands', arabic_name: 'سهول الميناء' },
    created_at: '2025-10-18T11:45:00Z',
    likes_count: 67,
    liked_by_me: false
  }
];

export const SEED_RECOMMENDATIONS = [
  {
    id: 'rec_frontier_mobile_clinics',
    priority: 'high',
    region: { region_id: 'frontier', name: 'Frontier', arabic_name: 'المنطقة الحدودية' },
    domain: 'healthcare',
    title: 'Deploy Hybrid Mobile Clinic Network across Frontier Nomadic Outposts',
    arabic_title: 'نشر شبكة عيادات متنقلة هجينة في بادية المنطقة الحدودية',
    summary: 'Clinic density in Frontier is 38% below national average. Investing in 14 specialized mobile health units with satellite telemetry bridges primary care gaps within 9 months.',
    arabic_summary: 'كثافة العيادات في المنطقة الحدودية أقل بـ 38% من المتوسط الوطني. الاستثمار في 14 وحدة صحية متنقلة مزودة بالاتصال الفضائي يسد فجوة الرعاية الأولية خلال 9 أشهر.',
    index_impact: 4.2,
    estimated_cost: { amount: 18000000, currency: 'USD' },
    confidence: 94,
    status: 'suggested'
  },
  {
    id: 'rec_steppe_vocational_tech',
    priority: 'high',
    region: { region_id: 'steppe', name: 'Steppe', arabic_name: 'السهوب' },
    domain: 'education',
    title: 'Establish Solar and Agro-tech Vocational Centers in Steppe',
    arabic_title: 'إنشاء مراكز تدريب مهني للطاقة الزراعية والشمسية في السهوب',
    summary: 'Youth unemployment in Steppe reaches 14.8%. Regional renewable energy projects lack certified local workforce.',
    arabic_summary: 'بطالة الشباب في السهوب تبلغ 14.8%. مشاريع الطاقة المتجددة في المنطقة تعاني نقص الكوادر المحلية المؤهلة.',
    index_impact: 2.8,
    estimated_cost: { amount: 12000000, currency: 'USD' },
    confidence: 88,
    status: 'suggested'
  },
  {
    id: 'rec_delta_sanitation_grid',
    priority: 'medium',
    region: { region_id: 'delta', name: 'Delta', arabic_name: 'الدلتا' },
    domain: 'infrastructure',
    title: 'Secondary Water Purification and Canal Sanitation Infrastructure',
    arabic_title: 'محطات معالجة مياه ثانوية وتطهير شبكات الترع بالدلتا',
    summary: 'Safe sanitation access in Delta rural clusters is at 58 index points. Modernizing 6 treatment nodes protects potable supply.',
    arabic_summary: 'مستوى الصرف الصحي الآمن في تجمعات الدلتا 58 نقطة. تحديث 6 محطات معالجة يحمي إمدادات مياه الشرب.',
    index_impact: 3.1,
    estimated_cost: { amount: 35000000, currency: 'USD' },
    confidence: 91,
    status: 'suggested'
  }
];

export const SEED_DATA_SOURCES = [
  { id: 'src_moh', name: 'Ministry of Health Registry', arabic_name: 'سجل وزارة الصحة', original_source: 'National Health Information Center', license: 'Official Government Open Data License', geographic_coverage: 'National (12 Regions)', time_coverage: '2019-2025', update_frequency: 'Quarterly', record_count: 148200, completeness_pct: 98.4, timeliness_pct: 95.0, accuracy_pct: 97.2, age_days: 12, status: 'synced', last_synced_at: '2025-10-20T00:00:00Z' },
  { id: 'src_moe', name: 'Ministry of Education EMIS', arabic_name: 'نظام معلومات إدارة التعليم', original_source: 'General Directorate of Educational Planning', license: 'Official Government Open Data License', geographic_coverage: 'National (12 Regions)', time_coverage: '2019-2025', update_frequency: 'Bi-annual', record_count: 89400, completeness_pct: 99.1, timeliness_pct: 92.5, accuracy_pct: 98.0, age_days: 18, status: 'synced', last_synced_at: '2025-10-14T00:00:00Z' },
  { id: 'src_stats', name: 'Central Bureau of Statistics (Labor Force Survey)', arabic_name: 'المسح الميداني للقوى العاملة', original_source: 'National Statistics Authority', license: 'Public Statistical Authority License', geographic_coverage: 'National (12 Regions)', time_coverage: '2019-2025', update_frequency: 'Quarterly', record_count: 245000, completeness_pct: 96.5, timeliness_pct: 89.0, accuracy_pct: 95.8, age_days: 28, status: 'synced', last_synced_at: '2025-10-04T00:00:00Z' },
  { id: 'src_infra', name: 'National Infrastructure & Utilities Cadastre', arabic_name: 'السجل الوطني للبنية التحتية والمرافق', original_source: 'Ministry of Transport & Water Resources', license: 'Official Government Open Data License', geographic_coverage: 'National (12 Regions)', time_coverage: '2020-2025', update_frequency: 'Monthly', record_count: 312000, completeness_pct: 94.0, timeliness_pct: 96.2, accuracy_pct: 93.5, age_days: 8, status: 'synced', last_synced_at: '2025-10-24T00:00:00Z' }
];

export const SEED_RAG_DOCUMENTS = [
  {
    id: 'doc_health_frontier',
    title: 'Healthcare Disparity Assessment in Frontier Region',
    arabic_title: 'تقييم فوارق الرعاية الصحية في المنطقة الحدودية',
    content: 'Frontier region shows acute healthcare under-capacity. Doctor-to-population ratio is 1.1 per 1,000 residents compared to national target of 2.5. Clinic density is 38% below the national mean, primarily driven by geographic fragmentation across 45,000 km² of arid terrain.',
    arabic_content: 'تظهر المنطقة الحدودية نقصاً حاداً في طاقة الرعاية الصحية. تبلغ نسبة الأطباء للسكان 1.1 لكل 1000 نسمة مقارنة بالمستهدف الوطني 2.5. كثافة العيادات تقل بـ 38% عن المتوسط الوطني نظراً للتشتت الجغرافي عبر 45 ألف كم مربع.',
    source: 'Ministry of Health Registry',
    period: '2025-Q4',
    category: 'healthcare',
    region_id: 'frontier'
  },
  {
    id: 'doc_water_delta',
    title: 'Delta Canal System and Potable Water Sanitation Study',
    arabic_title: 'دراسة منظومة ترع الدلتا والصرف الصحي لمياه الشرب',
    content: 'Delta region accounts for 2.2M population with agricultural economy. Rural sanitation index is 58/100, where irrigation runoff impacts water treatment inlet stations. Clean water project prj_delta_clean_water reached 68% completion with $145M budget.',
    arabic_content: 'تضم منطقة الدلتا 2.2 مليون نسمة باقتصاد زراعي. مؤشر الصرف الصحي الريفي يبلغ 58/100، حيث يؤثر الصرف الزراعي على مآخذ محطات المعالجة. مشروع مياه الدلتا حقق 68% إنجاز بميزانية 145 مليون دولار.',
    source: 'National Infrastructure & Utilities Cadastre',
    period: '2025-Q4',
    category: 'infrastructure',
    region_id: 'delta'
  },
  {
    id: 'doc_economy_steppe',
    title: 'Steppe Employment and Renewable Energy Transition',
    arabic_title: 'التوظيف والانتقال نحو الطاقة المتجددة في السهوب',
    content: 'Steppe region has registered unemployment at 8.4% with youth unemployment nearing 14.8%. Developing regional solar micro-grids and vocational agro-tech training offers highest multiplier on employment growth.',
    arabic_content: 'سجلت السهوب معدل بطالة 8.4% وبطالة شباب تقارب 14.8%. تطوير شبكات الطاقة الشمسية المصغرة ومراكز التدريب المهني الزراعي يتيح أعلى مضاعف لنمو الوظائف.',
    source: 'Central Bureau of Statistics',
    period: '2025-Q4',
    category: 'economy',
    region_id: 'steppe'
  }
];

