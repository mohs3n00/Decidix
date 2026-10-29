import 'common_strings.dart';
import 'decisions_strings.dart';
import 'insights_strings.dart';
import 'intelligence_strings.dart';
import 'overview_strings.dart';

/// All strings added for the Figma screens. Each screen group has its own file,
/// merged here; app_localizations.dart puts them over the older keys.
const Map<String, String> appStringsEn = {
  ...commonEn,
  ...overviewEn,
  ...insightsEn,
  ...intelligenceEn,
  ...decisionsEn,
};

const Map<String, String> appStringsAr = {
  ...commonAr,
  ...overviewAr,
  ...insightsAr,
  ...intelligenceAr,
  ...decisionsAr,
};
