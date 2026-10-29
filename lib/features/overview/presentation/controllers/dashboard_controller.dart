import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../api/api_providers.dart';
import '../../../../api/models/overview.dart';

/// `3Y`, `5Y` or `7Y`: how far back the national trend goes.
class SelectedTrendRange extends Notifier<String> {
  @override
  String build() => '7Y';

  void select(String range) => state = range;
}

final selectedTrendRangeProvider = NotifierProvider<SelectedTrendRange, String>(
  SelectedTrendRange.new,
);

/// The dashboard. Changing the range reloads it; the old data stays on screen
/// until the new data arrives.
final overviewProvider = FutureProvider<OverviewData>((ref) {
  final range = ref.watch(selectedTrendRangeProvider);
  return ref.watch(overviewApiProvider).getOverview(range: range);
});
