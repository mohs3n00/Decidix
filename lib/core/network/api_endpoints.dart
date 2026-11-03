class ApiEndpoints {
  ApiEndpoints._();

  /// The server address, from `--dart-define=API_BASE_URL=...` (see env/).
  /// Empty by default: the mock needs none, and a real build must set it.
  static const String baseUrl = String.fromEnvironment('API_BASE_URL');

  // Overview
  static const String overview = '/overview';
  static const String regions = '/regions';
  static const String mapPoints = '/regions/map-points';
  static String regionDetail(String id) => '/regions/$id';

  // Insights
  static const String education = '/insights/education';
  static const String healthcare = '/insights/healthcare';
  static const String economy = '/insights/economy';
  static const String infrastructure = '/insights/infrastructure';
  static String sector(String key) => '/insights/$key';
  static const String comparison = '/insights/comparison';
  static const String historical = '/insights/historical';
  static const String priority = '/insights/priority';
  static const String dataQuality = '/insights/data-quality';

  // Intelligence
  static const String predictions = '/intelligence/predictions';
  static const String assistantChat = '/intelligence/assistant/chat';
  static const String recommendations = '/intelligence/recommendations';
  static String recommendationAccept(String id) =>
      '/intelligence/recommendations/$id/accept';
  static String recommendationDismiss(String id) =>
      '/intelligence/recommendations/$id/dismiss';

  // Decisions
  static const String simulate = '/decisions/simulate';
  static const String projects = '/decisions/projects';
  static const String citizenReports = '/decisions/citizen-reports';
  static String citizenReportLike(String id) =>
      '/decisions/citizen-reports/$id/like';

  // Notifications
  static const String deviceToken = '/notifications/device-token';
}
