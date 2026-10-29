import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'strings/app_strings.dart';

class AppLocalizations {
  final Locale locale;

  AppLocalizations(this.locale);

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations) ??
        AppLocalizations(const Locale('en'));
  }

  static const _legacyValues = <String, Map<String, String>>{
    'en': {
      // Navigation
      'nav_overview': 'Overview',
      'nav_insights': 'Insights',
      'nav_intelligence': 'Intelligence',
      'nav_decisions': 'Decisions',

      // Overview Chips
      'chip_dashboard': 'Dashboard',
      'chip_map': 'Interactive Map',
      'chip_regions': 'Regions',

      // Insights Chips
      'chip_education': 'Education',
      'chip_healthcare': 'Healthcare',
      'chip_economy': 'Economy',
      'chip_infrastructure': 'Infrastructure',
      'chip_comparison': 'Comparison',
      'chip_historical': 'Historical',
      'chip_priority': 'Priority',
      'chip_data_quality': 'Data Quality',

      // Intelligence Chips
      'chip_predictions': 'Predictions',
      'chip_assistant': 'Assistant',
      'chip_recommendations': 'Recommendations',

      // Decisions Chips
      'chip_simulator': 'Simulator',
      'chip_projects': 'Projects',
      'chip_reports': 'Citizen Reports',

      // Dashboard
      'eyebrow_regional_platform': 'REGIONAL DEVELOPMENT PLATFORM',
      'title_national_dev': 'National Development',
      'subtitle_national_dev': 'Comprehensive intelligence & decision-support summary',
      'label_development_index': 'National Development Index',
      'label_total_regions': 'Total Regions',
      'label_population': 'Population',
      'label_at_risk': 'Critical Attention',
      'label_as_of': 'As of',
      'label_national_trend': 'National Trend',
      'label_needs_attention': 'Needs Attention',
      'label_view_all': 'View All',
      'label_ai_insight': 'AI Decision Insight',
      'btn_explore_recommendations': 'Explore Recommendations',
      'btn_retry': 'Retry',

      // Time Ranges
      'range_1y': '1Y',
      'range_3y': '3Y',
      'range_5y': '5Y',
      'range_10y': '10Y',

      // Priority Levels
      'priority_critical': 'Critical',
      'priority_high': 'High',
      'priority_medium': 'Moderate',
      'priority_low': 'Stable',

      // Map
      'eyebrow_map': 'REGIONAL MAP EXPLORER',
      'title_map': 'Interactive Geographic Intelligence',
      'subtitle_map': 'Geospatial visualization of regional development indices',
      'label_select_region': 'Tap any region node to inspect details',
      'btn_view_profile': 'View Full Profile',
      'filter_all': 'All Regions',
      'filter_critical': 'Critical Priority',
      'filter_high': 'High Priority',
      'filter_moderate': 'Moderate Priority',

      // Regions
      'eyebrow_regions': 'REGIONAL DIRECTORY',
      'title_regions': 'Kingdom Regions',
      'subtitle_regions': 'Comprehensive monitoring across 13 administrative emirates',
      'search_regions_hint': 'Search region by name or challenge...',
      'sort_by_score': 'By Score',
      'sort_by_priority': 'By Priority',
      'sort_by_population': 'By Population',

      // Region Profile
      'eyebrow_profile': 'REGIONAL DEEP-DIVE',
      'title_profile': 'Region Profile',
      'label_composite_score': 'Composite Development Score',
      'label_national_avg': 'National Average',
      'label_sector_breakdown': 'Sectoral Performance',
      'label_key_challenges': 'Critical Vulnerabilities & Bottlenecks',
      'label_active_projects': 'Active Capital Projects',
      'label_forecast_target': '2028 Projected Target',
      'btn_simulate_intervention': 'Simulate Policy Intervention',

      // Education
      'eyebrow_education': 'SECTOR INTELLIGENCE',
      'title_education': 'Education & Talent Index',
      'subtitle_education': 'Human capital development, digital learning, and higher education metrics',
      'kpi_digital_classrooms': 'Digital Classroom Adoption',
      'kpi_student_teacher': 'Student-Teacher Ratio',
      'kpi_stem_enrollment': 'STEM Enrollment',
      'kpi_graduation_rate': 'Higher Ed Graduation Rate',
      'label_top_performers': 'Top Performing Regions',
      'label_reform_initiatives': 'Strategic Education Initiatives',

      // Healthcare
      'eyebrow_healthcare': 'SECTOR INTELLIGENCE',
      'title_healthcare': 'Healthcare Accessibility',
      'subtitle_healthcare': 'Specialized medical coverage, response speed, and bed capacity',
      'kpi_hospital_beds': 'Hospital Beds per 1k',
      'kpi_specialized_care': 'Specialized Care Coverage',
      'kpi_response_time': 'Avg Emergency Response',
      'kpi_primary_centers': 'Primary Healthcare Units',
      'label_regional_capacity': 'Regional Bed & Care Distribution',
      'label_health_initiatives': 'Active Health Interventions',

      // Economy
      'eyebrow_economy': 'SECTOR INTELLIGENCE',
      'title_economy': 'Economic Diversification',
      'subtitle_economy': 'Non-oil GDP growth, SME density, private sector employment, and FDI',
      'kpi_nonoil_gdp': 'Non-Oil GDP Share',
      'kpi_sme_density': 'SME Density / 1k Pop',
      'kpi_private_employment': 'Private Sector Workforce',
      'kpi_fdi_inflow': 'Regional FDI Inflow',
      'label_diversification_index': 'Diversification Trajectory',
      'label_economic_initiatives': 'Targeted Economic Programs',

      // Infrastructure
      'eyebrow_infrastructure': 'SECTOR INTELLIGENCE',
      'title_infrastructure': 'Infrastructure Quality',
      'subtitle_infrastructure': 'Road networks, water supply, high-speed connectivity, and power grids',
      'kpi_paved_roads': 'Paved Road Coverage',
      'kpi_water_desalination': 'Desalinated Water Access',
      'kpi_broadband_5g': 'High-Speed Fiber & 5G',
      'kpi_renewable_grid': 'Clean Energy Grid Share',
      'label_gap_analysis': 'Infrastructure Deficit Analysis',
      'label_infra_initiatives': 'Flagship Infrastructure Programs',

      // Comparison
      'eyebrow_comparison': 'CROSS-REGIONAL ANALYSIS',
      'title_comparison': 'Region Comparison',
      'subtitle_comparison': 'Side-by-side performance benchmarking across development pillars',
      'select_region_a': 'Region A',
      'select_region_b': 'Region B',
      'label_comparative_breakdown': 'Sectoral Comparison',
      'label_gap_summary': 'Comparative Gap Analysis',
      'label_convergence': 'Development Convergence Outlook',

      // Historical
      'eyebrow_historical': 'LONGITUDINAL TRENDS',
      'title_historical': 'Historical Trajectory',
      'subtitle_historical': 'Multi-year development trajectory and policy milestone impacts',
      'filter_sector_all': 'Composite Index',
      'label_milestones': 'Policy Interventions & Milestones',
      'label_compound_growth': 'Annual Growth Rate',
      'label_volatility': 'Score Volatility Index',

      // Priority
      'eyebrow_priority': 'INTERVENTION MATRIX',
      'title_priority': 'Development Priority',
      'subtitle_priority': 'Resource allocation urgency and regional vulnerability index',
      'label_critical_quadrant': 'Critical Intervention Zone',
      'label_priority_ranking': 'Urgency-Ranked Regions',
      'label_vulnerability_factors': 'Primary Deprivation Drivers',
      'btn_allocate_resources': 'Allocate Resources',

      // Data Quality
      'eyebrow_data_quality': 'GOVERNANCE & AUDIT',
      'title_data_quality': 'Data Quality & Freshness',
      'subtitle_data_quality': 'Registry audit, API sync freshness, and data reliability metrics',
      'label_overall_reliability': 'National Reliability Index',
      'label_registry_status': 'Connected Ministry Registries',
      'label_sync_latency': 'Data Ingestion Latency',
      'label_anomalies_detected': 'Anomalies Detected',
      'label_audit_log': 'System Audit Log',

      // Predictions
      'eyebrow_predictions': 'PREDICTIVE INTELLIGENCE',
      'title_predictions': 'ML Forecast 2026–2030',
      'subtitle_predictions': 'Gradient Boosted Multi-Sector forecasting with confidence bands',
      'label_model_confidence': 'Model Confidence',
      'label_mape': 'Mean Absolute Error',
      'label_r2': 'R² Goodness of Fit',
      'label_forecast_trajectory': 'National Index Projection',
      'label_regional_projections': 'Projected Regional Growth Rates',
      'label_confidence_band': '95% Confidence Band',

      // Assistant
      'eyebrow_assistant': 'DECISION COPILOT',
      'title_assistant': 'Decidix AI Copilot',
      'subtitle_assistant': 'Context-aware intelligence for regional policy and investments',
      'input_chat_hint': 'Ask Decidix AI anything about regional data...',
      'suggested_prompts_title': 'Suggested Decision Inquiries',
      'prompt_1': 'Which regions have the lowest healthcare coverage?',
      'prompt_2': 'Simulate SAR 500M transport grant to Jazan',
      'prompt_3': 'Summarize top 3 national development bottlenecks',

      // Recommendations
      'eyebrow_recommendations': 'ALGORITHMIC POLICY ACTIONS',
      'title_recommendations': 'AI Recommendations',
      'subtitle_recommendations': 'Evidence-backed interventions ranked by expected national impact',
      'label_expected_impact': 'Expected National Impact',
      'label_estimated_capex': 'Estimated CapEx',
      'label_timeline': 'Implementation Timeline',
      'btn_simulate_action': 'Simulate in What-If',

      // Simulator
      'eyebrow_simulator': 'POLICY LAB',
      'title_simulator': 'What-If Policy Simulator',
      'subtitle_simulator': 'Simulate budget allocation impacts on regional and national indicators',
      'label_target_region': 'Target Simulation Region',
      'slider_education_budget': 'Education Budget Allocation',
      'slider_healthcare_budget': 'Healthcare Budget Allocation',
      'slider_infrastructure_budget': 'Infrastructure Budget Allocation',
      'slider_economy_budget': 'Economic Incentives Budget',
      'label_simulated_budget': 'Total Simulated Budget',
      'label_projected_gain': 'Projected Regional Gain',
      'label_national_impact': 'National Index Impact',
      'label_efficiency_factor': 'Capital Efficiency Factor',
      'btn_reset_simulation': 'Reset Scenario',
      'btn_apply_policy': 'Save Scenario',

      // Projects
      'eyebrow_projects': 'CAPITAL DELIVERY',
      'title_projects': 'Development Projects',
      'subtitle_projects': 'Pipeline of regional strategic capital projects and milestones',
      'filter_project_all': 'All Projects',
      'filter_project_on_track': 'On Track',
      'filter_project_delayed': 'Needs Attention',
      'label_committed_capital': 'Committed Capital',
      'label_active_projects_count': 'Active Projects',
      'label_progress': 'Progress',
      'label_deadline': 'Target Completion',

      // Citizen Reports
      'eyebrow_reports': 'CIVIC SENSING',
      'title_reports': 'Citizen Reports & Feedback',
      'subtitle_reports': 'Real-time localized community issues and satisfaction sensing',
      'label_total_reports': 'Total Reports',
      'label_resolution_rate': 'Resolution Rate',
      'label_avg_response': 'Avg Resolution Time',
      'filter_category_all': 'All Categories',
      'filter_category_roads': 'Roads & Transport',
      'filter_category_water': 'Water & Sanitation',
      'filter_category_health': 'Health Facilities',
      'filter_category_schools': 'Schools & Youth',
      'status_under_review': 'Under Review',
      'status_in_progress': 'In Progress',
      'status_resolved': 'Resolved',

      // Common
      'language_switch_btn': 'عربي',
      'loading': 'Loading intelligence...',
      'error_loading': 'Failed to load intelligence data',
      'empty_results': 'No matching records found',
      'error_retry_hint': 'Check your connection and try again.',
    },
    'ar': {
      // Navigation
      'nav_overview': 'نظرة عامة',
      'nav_insights': 'القطاعات',
      'nav_intelligence': 'الذكاء الاصطناعي',
      'nav_decisions': 'القرارات',

      // Overview Chips
      'chip_dashboard': 'لوحة المؤشرات',
      'chip_map': 'الخريطة التفاعلية',
      'chip_regions': 'المناطق',

      // Insights Chips
      'chip_education': 'التعليم',
      'chip_healthcare': 'الصحة',
      'chip_economy': 'الاقتصاد',
      'chip_infrastructure': 'البنية التحتية',
      'chip_comparison': 'المقارنة',
      'chip_historical': 'التحليل التاريخي',
      'chip_priority': 'الأولويات',
      'chip_data_quality': 'جودة البيانات',

      // Intelligence Chips
      'chip_predictions': 'التنبؤات',
      'chip_assistant': 'المساعد الذكي',
      'chip_recommendations': 'التوصيات',

      // Decisions Chips
      'chip_simulator': 'محاكي السيناريوهات',
      'chip_projects': 'المشاريع',
      'chip_reports': 'بلاغات المواطنين',

      // Dashboard
      'eyebrow_regional_platform': 'منصة التنمية الإقليمية الوطنية',
      'title_national_dev': 'التنمية الوطنية',
      'subtitle_national_dev': 'ملخص استخباراتي شامل لدعم اتخاذ القرار وتوجيه الاستثمارات',
      'label_development_index': 'مؤشر التنمية الوطني المركب',
      'label_total_regions': 'إجمالي المناطق',
      'label_population': 'عدد السكان',
      'label_at_risk': 'مناطق ذات أولوية حرجة',
      'label_as_of': 'حتى تاريخ',
      'label_national_trend': 'المسار الزمني الوطني',
      'label_needs_attention': 'مناطق تتطلب تدخلاً عاجلاً',
      'label_view_all': 'عرض الكل',
      'label_ai_insight': 'رؤية الذكاء الاصطناعي للقرار',
      'btn_explore_recommendations': 'استعراض التوصيات',
      'btn_retry': 'إعادة المحاولة',

      // Time Ranges
      'range_1y': 'سنة',
      'range_3y': '٣ سنوات',
      'range_5y': '٥ سنوات',
      'range_10y': '١٠ سنوات',

      // Priority Levels
      'priority_critical': 'حرجة',
      'priority_high': 'عالية',
      'priority_medium': 'متوسطة',
      'priority_low': 'مستقرة',

      // Map
      'eyebrow_map': 'المستكشف الجغرافي الإقليمي',
      'title_map': 'الذكاء المكاني التفاعلي',
      'subtitle_map': 'رسم جغرافي مباشر لمؤشرات التنمية في مناطق المملكة',
      'label_select_region': 'انقر على أي منطقة لاستعراض بطاقة الأداء',
      'btn_view_profile': 'عرض الملف الكامل للمنطقة',
      'filter_all': 'كافة المناطق',
      'filter_critical': 'أولوية حرجة',
      'filter_high': 'أولوية عالية',
      'filter_moderate': 'أولوية معتدلة',

      // Regions
      'eyebrow_regions': 'دليل المناطق',
      'title_regions': 'مناطق المملكة (١٣)',
      'subtitle_regions': 'مراقبة شاملة لكافة إمارات ومناطق المملكة الإدارية',
      'search_regions_hint': 'ابحث عن منطقة أو التحدي التنموي...',
      'sort_by_score': 'حسب المؤشر',
      'sort_by_priority': 'حسب الأولوية',
      'sort_by_population': 'حسب السكان',

      // Region Profile
      'eyebrow_profile': 'تحليل تفصيلي للمنطقة',
      'title_profile': 'ملف المنطقة',
      'label_composite_score': 'المؤشر التنموي المركب',
      'label_national_avg': 'المتوسط الوطني',
      'label_sector_breakdown': 'أداء القطاعات التنموية',
      'label_key_challenges': 'التحديات والفجوات الرئيسية',
      'label_active_projects': 'المشاريع الرأسمالية القائمة',
      'label_forecast_target': 'المستهدف المتوقع لعام ٢٠٢٨',
      'btn_simulate_intervention': 'محاكاة تدخل تنموي للمنطقة',

      // Education
      'eyebrow_education': 'استخبارات القطاع',
      'title_education': 'مؤشر التعليم والمواهب',
      'subtitle_education': 'تطوير رأس المال البشري والفصول الرقمية ومخرجات التعليم العالي',
      'kpi_digital_classrooms': 'اعتماد الفصول الرقمية',
      'kpi_student_teacher': 'نسبة الطلاب إلى المعلمين',
      'kpi_stem_enrollment': 'الالتحاق بتخصصات STEM',
      'kpi_graduation_rate': 'نسبة التخرج من التعليم العالي',
      'label_top_performers': 'المناطق الأعلى أداءً',
      'label_reform_initiatives': 'المبادرات الاستراتيجية للتعليم',

      // Healthcare
      'eyebrow_healthcare': 'استخبارات القطاع',
      'title_healthcare': 'الوصول إلى الرعاية الصحية',
      'subtitle_healthcare': 'التغطية الطبية التخصصية وسرعة الاستجابة والطاقة السريرية',
      'kpi_hospital_beds': 'الأسرّة لكل ألف نسمة',
      'kpi_specialized_care': 'تغطية الرعاية التخصصية',
      'kpi_response_time': 'متوسط سرعة الاستجابة للطوارئ',
      'kpi_primary_centers': 'مراكز الرعاية الصحية الأولية',
      'label_regional_capacity': 'توزيع الطاقة السريرية إقليمياً',
      'label_health_initiatives': 'المبادرات الصحية الاستراتيجية',

      // Economy
      'eyebrow_economy': 'استخبارات القطاع',
      'title_economy': 'التنويع الاقتصادي',
      'subtitle_economy': 'نمو الناتج غير النفطي، المنشآت الصغيرة، توظيف القطاع الخاص والاستثمار الأجنبي',
      'kpi_nonoil_gdp': 'حصة الناتج المحلي غير النفطي',
      'kpi_sme_density': 'كثافة المنشآت الصغيرة / ألف نسمة',
      'kpi_private_employment': 'قوة العمل في القطاع الخاص',
      'kpi_fdi_inflow': 'تدفق الاستثمار الأجنبي الإقليمي',
      'label_diversification_index': 'مسار التنويع الاقتصادي',
      'label_economic_initiatives': 'البرامج الاقتصادية الموجهة',

      // Infrastructure
      'eyebrow_infrastructure': 'استخبارات القطاع',
      'title_infrastructure': 'جودة البنية التحتية',
      'subtitle_infrastructure': 'شبكات الطرق وإمدادات المياه والاتصال فائق السرعة وشبكات الطاقة',
      'kpi_paved_roads': 'تغطية شبكة الطرق المعبدة',
      'kpi_water_desalination': 'الوصول للمياه المحلاة',
      'kpi_broadband_5g': 'الألياف الضوئية والجيل الخامس',
      'kpi_renewable_grid': 'حصة الطاقة المتجددة بالشبكة',
      'label_gap_analysis': 'تحليل فجوات البنية التحتية',
      'label_infra_initiatives': 'مشاريع البنية التحتية الكبرى',

      // Comparison
      'eyebrow_comparison': 'التحليل المقارن بين المناطق',
      'title_comparison': 'مقارنة المناطق',
      'subtitle_comparison': 'مقارنة معيارية شاملة بين منطقتين عبر ركائز التنمية',
      'select_region_a': 'المنطقة الأولى',
      'select_region_b': 'المنطقة الثانية',
      'label_comparative_breakdown': 'المقارنة القطاعية المباشرة',
      'label_gap_summary': 'ملخص الفجوة التنموية',
      'label_convergence': 'توقعات التقارب التنموي',

      // Historical
      'eyebrow_historical': 'المسارات التنموية عبر الزمن',
      'title_historical': 'التحليل التاريخي',
      'subtitle_historical': 'تتبع أداء التنمية لسنوات متعددة وقياس أثر السياسات الحكومية',
      'filter_sector_all': 'المؤشر العام المركب',
      'label_milestones': 'محطات الإصلاح والتدخلات الكبرى',
      'label_compound_growth': 'معدل النمو السنوي المركب',
      'label_volatility': 'مؤشر تقلب الأداء',

      // Priority
      'eyebrow_priority': 'مصفوفة التدخل التنموي',
      'title_priority': 'أولويات التنمية',
      'subtitle_priority': 'إلحاحية تخصيص الموارد ومؤشر الهشاشة والاحتياج الإقليمي',
      'label_critical_quadrant': 'نطاق التدخل العاجل',
      'label_priority_ranking': 'ترتيب المناطق حسب الأولوية',
      'label_vulnerability_factors': 'دوافع الفجوة التنموية الرئيسية',
      'btn_allocate_resources': 'تخصيص الموارد',

      // Data Quality
      'eyebrow_data_quality': 'الحوكمة وتدقيق المؤشرات',
      'title_data_quality': 'جودة وموثوقية البيانات',
      'subtitle_data_quality': 'تدقيق السجلات وحداثة مزامنة الـ APIs وموثوقية المصادر',
      'label_overall_reliability': 'مؤشر الموثوقية الوطني',
      'label_registry_status': 'السجلات الوزارية المتصلة',
      'label_sync_latency': 'زمن تأخر تدفق البيانات',
      'label_anomalies_detected': 'الشذوذات المرصودة',
      'label_audit_log': 'سجل عمليات التدقيق',

      // Predictions
      'eyebrow_predictions': 'الذكاء الاصطناعي التنبؤي',
      'title_predictions': 'التنبؤات المستقبلية ٢٠٢٦–٢٠٣٠',
      'subtitle_predictions': 'توقعات النماذج الإحصائية المعززة مع نطاقات الثقة واليقين',
      'label_model_confidence': 'دقة النموذج التنبؤي',
      'label_mape': 'متوسط نسبة الخطأ المطلق',
      'label_r2': 'معامل التحديد R²',
      'label_forecast_trajectory': 'المسار المتوقع للمؤشر الوطني',
      'label_regional_projections': 'توقعات نمو المناطق الإقليمية',
      'label_confidence_band': 'نطاق الثقة ٩٥٪',

      // Assistant
      'eyebrow_assistant': 'المساعد الاستراتيجي للقرار',
      'title_assistant': 'مساعد Decidix الذكي',
      'subtitle_assistant': 'تحليلات ذكية وفورية لسياسات وتدخلات التنمية الإقليمية',
      'input_chat_hint': 'اطرح سؤالاً حول بيانات وتحديات مناطق المملكة...',
      'suggested_prompts_title': 'استفسارات مقترحة لصناع القرار',
      'prompt_1': 'ما هي المناطق الأقل في تغطية الرعاية الصحية؟',
      'prompt_2': 'حاكي منحة نقل بقيمة ٥٠٠ مليون ريال لجازان',
      'prompt_3': 'لخص أبرز ٣ اختناقات تنموية على المستوى الوطني',

      // Recommendations
      'eyebrow_recommendations': 'إجراءات السياسات المدعومة بالبيانات',
      'title_recommendations': 'التوصيات الذكية',
      'subtitle_recommendations': 'تدخلات استراتيجية موصى بها ومرتبة حسب الأثر الوطني المتوقع',
      'label_expected_impact': 'الأثر الوطني المتوقع',
      'label_estimated_capex': 'الإنفاق الرأسمالي التقديري',
      'label_timeline': 'الإطار الزمني للتنفيذ',
      'btn_simulate_action': 'محاكاة في السيناريوهات',

      // Simulator
      'eyebrow_simulator': 'مختبر اختبار السياسات',
      'title_simulator': 'محاكي السيناريوهات التنموية',
      'subtitle_simulator': 'محاكاة أثر تخصيص الميزانيات على مؤشرات المنطقة والمؤشر الوطني',
      'label_target_region': 'المنطقة المستهدفة بالمحاكاة',
      'slider_education_budget': 'ميزانية قطاع التعليم المخصصة',
      'slider_healthcare_budget': 'ميزانية قطاع الصحة المخصصة',
      'slider_infrastructure_budget': 'ميزانية البنية التحتية المخصصة',
      'slider_economy_budget': 'ميزانية الحوافز الاقتصادية',
      'label_simulated_budget': 'إجمالي الميزانية المحاكاة',
      'label_projected_gain': 'الارتفاع المتوقع بمؤشر المنطقة',
      'label_national_impact': 'الأثر على المؤشر الوطني العام',
      'label_efficiency_factor': 'معامل كفاءة رأس المال',
      'btn_reset_simulation': 'إعادة ضبط المحاكاة',
      'btn_apply_policy': 'حفظ هذا السيناريو',

      // Projects
      'eyebrow_projects': 'المحفظة الرأسمالية',
      'title_projects': 'المشاريع التنموية',
      'subtitle_projects': 'متابعة المشاريع الاستراتيجية ومراحل إنجازها عبر مناطق المملكة',
      'filter_project_all': 'كافة المشاريع',
      'filter_project_on_track': 'وفق الخطة',
      'filter_project_delayed': 'يحتاج متابعة',
      'label_committed_capital': 'رأس المال الملتزم به',
      'label_active_projects_count': 'المشاريع النشطة',
      'label_progress': 'نسبة الإنجاز',
      'label_deadline': 'تاريخ الإنجاز المستهدف',

      // Citizen Reports
      'eyebrow_reports': 'نبض وتطلعات المواطنين',
      'title_reports': 'بلاغات وآراء المواطنين',
      'subtitle_reports': 'رصد فوري للتحديات الميدانية ومستوى الرضا المجتمعي',
      'label_total_reports': 'إجمالي البلاغات',
      'label_resolution_rate': 'نسبة الإغلاق والمعالجة',
      'label_avg_response': 'متوسط وقت المعالجة',
      'filter_category_all': 'جميع التصنيفات',
      'filter_category_roads': 'الطرق والنقل',
      'filter_category_water': 'المياه والصرف',
      'filter_category_health': 'المرافق الصحية',
      'filter_category_schools': 'المدارس والشباب',
      'status_under_review': 'قيد المراجعة',
      'status_in_progress': 'قيد المعالجة',
      'status_resolved': 'تم الحل',

      // Common
      'language_switch_btn': 'English',
      'loading': 'جاري تحميل البيانات الاستخباراتية...',
      'error_loading': 'تعذر تحميل البيانات الاستخباراتية',
      'empty_results': 'لا توجد نتائج مطابقة',
      'error_retry_hint': 'تأكد من الاتصال بالإنترنت وحاول مرة أخرى.',
    },
  };

  /// The Figma-screen strings win over the older keys of the same name.
  static final _localizedValues = <String, Map<String, String>>{
    'en': {...?_legacyValues['en'], ...appStringsEn},
    'ar': {...?_legacyValues['ar'], ...appStringsAr},
  };

  String tr(String key) {
    final languageCode = locale.languageCode;
    return _localizedValues[languageCode]?[key] ??
        _localizedValues['en']?[key] ??
        key;
  }
}

class AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => ['en', 'ar'].contains(locale.languageCode);

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(AppLocalizations(locale));
  }

  @override
  bool shouldReload(AppLocalizationsDelegate old) => false;
}

extension LocalizationExtension on BuildContext {
  AppLocalizations get l10n => AppLocalizations.of(this);
  String tr(String key) => l10n.tr(key);
  bool get isRtl => Directionality.of(this) == TextDirection.rtl;
}
