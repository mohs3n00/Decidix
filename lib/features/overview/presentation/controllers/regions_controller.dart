import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../api/api_providers.dart';
import '../../../../api/models/common.dart';
import '../../../../api/models/overview.dart';
import '../../../../core/errors/app_exception.dart';
import '../../../../shared/paging.dart';

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

/// The regions list: page 1, then more pages as the user scrolls down. A new
/// filter starts again from page 1.
class RegionsController extends AsyncNotifier<PagedState<List<RegionListItem>>> {
  /// Counts the starts from page 1, so a page that arrives for an old filter
  /// is thrown away instead of being added to the new list.
  int _generation = 0;

  @override
  Future<PagedState<List<RegionListItem>>> build() async {
    _generation++;
    final filter = ref.watch(regionsFilterProvider);
    final size = ref.watch(listPageSizeProvider);
    final page = await ref.watch(overviewApiProvider).getRegions(
          query: filter.query,
          priority: filter.priority,
          perPage: size,
        );
    return PagedState(page.items, page.meta);
  }

  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || current.loadingMore || !current.hasMore) return;

    final generation = _generation;
    final filter = ref.read(regionsFilterProvider);
    state = AsyncData(current.copyWith(loadingMore: true));
    try {
      final next = await ref.read(overviewApiProvider).getRegions(
            query: filter.query,
            priority: filter.priority,
            page: current.meta.page + 1,
            perPage: ref.read(listPageSizeProvider),
          );
      if (generation != _generation) return;
      state = AsyncData(PagedState([...current.data, ...next.items], next.meta));
    } on AppException {
      // Keep what is on screen; scrolling to the end tries again.
      if (generation != _generation) return;
      state = AsyncData(current.copyWith(loadingMore: false));
    }
  }
}

final regionsProvider =
    AsyncNotifierProvider<RegionsController, PagedState<List<RegionListItem>>>(
  RegionsController.new,
);

/// Every region, for the pickers (compare, simulator): all pages, 100 at a time.
final allRegionsProvider = FutureProvider<List<RegionListItem>>((ref) async {
  final api = ref.watch(overviewApiProvider);
  final all = <RegionListItem>[];
  for (var page = 1;; page++) {
    final result = await api.getRegions(page: page, perPage: 100);
    all.addAll(result.items);
    if (!result.meta.hasMore || result.items.isEmpty) return all;
  }
});

final regionProfileProvider = FutureProvider.family<RegionProfile, String>((ref, id) {
  return ref.watch(overviewApiProvider).getRegion(id);
});
