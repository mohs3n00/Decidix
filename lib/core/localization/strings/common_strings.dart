/// Strings shared by every screen: tabs, number and date formats, labels that
/// come from codes in the API (priority, bands, units). They override the older
/// keys of the same name in app_localizations.dart.
const Map<String, String> commonEn = {
  // Tabs
  'chip_dashboard': 'Dashboard',
  'chip_map': 'Map',
  'chip_regions': 'Regions',
  'chip_comparison': 'Compare',
  'chip_historical': 'History',
  'chip_priority': 'Priority',
  'chip_data_quality': 'Data Quality',
  'chip_simulator': 'Simulator',
  'chip_projects': 'Projects',
  'chip_reports': 'Reports',

  // Labels for codes the API sends
  'priority_critical': 'Critical',
  'priority_high': 'High',
  'priority_medium': 'Medium',
  'priority_low': 'Low',
  'band_low': 'Low',
  'band_moderate_low': 'Moderate-Low',
  'band_moderate': 'Moderate',
  'band_moderate_high': 'Moderate-High',
  'band_high': 'High',
  'quality_poor': 'Needs work',
  'quality_fair': 'Fair overall',
  'quality_good': 'Good overall',
  'quality_excellent': 'Excellent overall',

  // Bottom navigation
  'nav_overview': 'Overview',
  'nav_insights': 'Insights',
  'nav_intelligence': 'Intelligence',
  'nav_decisions': 'Decisions',

  // Tabs (the ones above are the shared ones; each group adds its own)
  'chip_education': 'Education',
  'chip_healthcare': 'Healthcare',
  'chip_economy': 'Economy',
  'chip_infrastructure': 'Infrastructure',
  'chip_predictions': 'Predictions',
  'chip_assistant': 'Assistant',
  'chip_recommendations': 'Recommendations',

  // Screen states
  'loading': 'Loading…',
  'error_loading': 'We couldn’t load this data',
  'error_retry_hint': 'Check your connection and try again.',
  'btn_retry': 'Retry',
  'empty_results': 'Nothing to show here yet',

  // Page not found
  'nf_title': 'Page not found',
  'nf_body': 'The page you opened does not exist or has moved.',
  'nf_button': 'Back to overview',

  // Top bar and shell
  'btn_back': 'Back',
  'notifications_empty': 'You have no new notifications.',
  'label_ai_insight': 'AI insight',
  'label_see_all': 'See all',
  'ranking_top': 'Top',
  'ranking_bottom': 'Bottom',
  'filter_all': 'All',
  'label_domain_education': 'Education',
  'label_domain_healthcare': 'Healthcare',
  'label_domain_economy': 'Jobs & enterprise',
  'label_domain_infrastructure': 'Infrastructure',

  // Number formats. {n} is replaced by the app.
  'fmt_million': 'M',
  'fmt_thousand': 'K',
  'fmt_billion': 'B',
  'fmt_people': '{n} people',
  'fmt_residents': '{n} residents',
  'fmt_ago_minutes': '{n}m ago',
  'fmt_ago_hours': '{n}h ago',
  'fmt_ago_days': '{n}d ago',
  'fmt_just_now': 'Just now',
  'unit_years': 'yrs',

  'month_short_1': 'Jan',
  'month_short_2': 'Feb',
  'month_short_3': 'Mar',
  'month_short_4': 'Apr',
  'month_short_5': 'May',
  'month_short_6': 'Jun',
  'month_short_7': 'Jul',
  'month_short_8': 'Aug',
  'month_short_9': 'Sep',
  'month_short_10': 'Oct',
  'month_short_11': 'Nov',
  'month_short_12': 'Dec',
};

const Map<String, String> commonAr = {
  // Tabs
  'chip_dashboard': 'لوحة المتابعة',
  'chip_map': 'الخريطة',
  'chip_regions': 'المناطق',
  'chip_comparison': 'مقارنة',
  'chip_historical': 'التاريخ',
  'chip_priority': 'الأولوية',
  'chip_data_quality': 'جودة البيانات',
  'chip_simulator': 'المحاكي',
  'chip_projects': 'المشاريع',
  'chip_reports': 'البلاغات',

  // Labels for codes the API sends
  'priority_critical': 'حرجة',
  'priority_high': 'عالية',
  'priority_medium': 'متوسطة',
  'priority_low': 'منخفضة',
  'band_low': 'منخفض',
  'band_moderate_low': 'متوسط إلى منخفض',
  'band_moderate': 'متوسط',
  'band_moderate_high': 'متوسط إلى مرتفع',
  'band_high': 'مرتفع',
  'quality_poor': 'تحتاج إلى تحسين',
  'quality_fair': 'مقبولة بشكل عام',
  'quality_good': 'جيدة بشكل عام',
  'quality_excellent': 'ممتازة بشكل عام',

  // Bottom navigation
  'nav_overview': 'نظرة عامة',
  'nav_insights': 'القطاعات',
  'nav_intelligence': 'الذكاء الاصطناعي',
  'nav_decisions': 'القرارات',

  // Tabs
  'chip_education': 'التعليم',
  'chip_healthcare': 'الصحة',
  'chip_economy': 'الاقتصاد',
  'chip_infrastructure': 'البنية التحتية',
  'chip_predictions': 'التنبؤات',
  'chip_assistant': 'المساعد الذكي',
  'chip_recommendations': 'التوصيات',

  // Screen states
  'loading': 'جارٍ التحميل…',
  'error_loading': 'تعذّر تحميل البيانات',
  'error_retry_hint': 'تأكد من الاتصال بالإنترنت وحاول مرة أخرى.',
  'btn_retry': 'إعادة المحاولة',
  'empty_results': 'لا يوجد ما يُعرض بعد',

  // Page not found
  'nf_title': 'الصفحة غير موجودة',
  'nf_body': 'الصفحة التي فتحتها غير موجودة أو تم نقلها.',
  'nf_button': 'العودة إلى نظرة عامة',

  // Top bar and shell
  'btn_back': 'رجوع',
  'notifications_empty': 'لا توجد إشعارات جديدة.',
  'label_ai_insight': 'رؤية الذكاء الاصطناعي',
  'label_see_all': 'عرض الكل',
  'ranking_top': 'الأعلى',
  'ranking_bottom': 'الأدنى',
  'filter_all': 'الكل',
  'label_domain_education': 'التعليم',
  'label_domain_healthcare': 'الرعاية الصحية',
  'label_domain_economy': 'الوظائف والأعمال',
  'label_domain_infrastructure': 'البنية التحتية',

  // Number formats
  'fmt_million': ' مليون',
  'fmt_thousand': ' ألف',
  'fmt_billion': ' مليار',
  'fmt_people': '{n} نسمة',
  'fmt_residents': '{n} نسمة',
  'fmt_ago_minutes': 'منذ {n} د',
  'fmt_ago_hours': 'منذ {n} س',
  'fmt_ago_days': 'منذ {n} يوم',
  'fmt_just_now': 'الآن',
  'unit_years': 'سنة',

  'month_short_1': 'يناير',
  'month_short_2': 'فبراير',
  'month_short_3': 'مارس',
  'month_short_4': 'أبريل',
  'month_short_5': 'مايو',
  'month_short_6': 'يونيو',
  'month_short_7': 'يوليو',
  'month_short_8': 'أغسطس',
  'month_short_9': 'سبتمبر',
  'month_short_10': 'أكتوبر',
  'month_short_11': 'نوفمبر',
  'month_short_12': 'ديسمبر',
};
