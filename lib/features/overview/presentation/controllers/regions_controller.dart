import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../api/api_providers.dart';
import '../../../../api/models/common.dart';
import '../../../../api/models/overview.dart';

/// What the Regions screen is filtered by. A null [priority] means all.
class RegionsFilter {
  final String query;
  final Priority? priority;

  const RegionsFilter({this.query = '', this.priority});
}

class RegionsFilterNotifier extends Notifier<RegionsFilter> {
  @override
  RegionsFilter build() => const RegionsFilter();

  void setQuery(String query) => state = RegionsFilter(query: query, priority: state.priority);

  void setPriority(Priority? priority) =>
      state = RegionsFilter(query: state.query, priority: priority);
}

final regionsFilterProvider =
    NotifierProvider<RegionsFilterNotifier, RegionsFilter>(RegionsFilterNotifier.new);

/// One request carries up to this many regions; the national data set is 12.
const _regionsPerPage = 50;

final regionsProvider = FutureProvider<Paged<RegionListItem>>((ref) {
  final filter = ref.watch(regionsFilterProvider);
  return ref.watch(overviewApiProvider).getRegions(
        query: filter.query,
        priority: filter.priority,
        perPage: _regionsPerPage,
      );
});

/// Every region, for the pickers (compare, simulator).
final allRegionsProvider = FutureProvider<List<RegionListItem>>((ref) async {
  final page = await ref.watch(overviewApiProvider).getRegions(perPage: 100);
  return page.items;
});

final regionProfileProvider = FutureProvider.family<RegionProfile, String>((ref, id) {
  return ref.watch(overviewApiProvider).getRegion(id);
});
