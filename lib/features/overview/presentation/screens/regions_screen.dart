import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../api/models/common.dart';
import '../../../../core/format/formatters.dart';
import '../../../../shared/widgets/chip_scroll_row.dart';
import '../../../../shared/widgets/decidix_page.dart';
import '../../../../shared/widgets/region_row.dart';
import '../../../../shared/widgets/search_field.dart';
import '../../../../shared/widgets/state_views.dart';
import '../controllers/regions_controller.dart';
import '../widgets/overview_chip_bar.dart';

class RegionsScreen extends ConsumerStatefulWidget {
  const RegionsScreen({super.key});

  @override
  ConsumerState<RegionsScreen> createState() => _RegionsScreenState();
}

class _RegionsScreenState extends ConsumerState<RegionsScreen> {
  /// null is "All".
  static const _filters = <Priority?>[null, Priority.high, Priority.medium, Priority.low];

  late final TextEditingController _search;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _search = TextEditingController(text: ref.read(regionsFilterProvider).query);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  /// Waits for a pause in typing so each letter is not a request.
  void _onSearchChanged(String text) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      ref.read(regionsFilterProvider.notifier).setQuery(text);
    });
  }

  @override
  Widget build(BuildContext context) {
    final regions = ref.watch(regionsProvider);
    final filter = ref.watch(regionsFilterProvider);
    final fmt = context.fmt;

    return DecidixPage(
      tabs: const OverviewChipBar(selectedIndex: 2),
      eyebrow: fmt.tr('ov_eyebrow'),
      title: fmt.tr('ov_title_regions'),
      onRefresh: () => refreshFuture(ref, regionsProvider),
      children: [
        SearchField(
          controller: _search,
          hint: fmt.tr('regions_search_hint'),
          onChanged: _onSearchChanged,
        ),
        ChipScrollRow(
          labels: [
            for (final p in _filters) p == null ? fmt.tr('filter_all') : fmt.priority(p),
          ],
          selectedIndex: _filters.indexOf(filter.priority),
          onSelected: (i) => ref.read(regionsFilterProvider.notifier).setPriority(_filters[i]),
        ),
        ...asyncSections(
          regions,
          skeletonRows: 6,
          onRetry: () => ref.invalidate(regionsProvider),
          builder: (page) {
            if (page.items.isEmpty) return const [EmptyView()];
            return [
              Column(
                children: [
                  for (final (i, region) in page.items.indexed) ...[
                    if (i > 0) const SizedBox(height: 10),
                    RegionRow(
                      region: region,
                      onTap: () => context.go('/overview/regions/${region.id}'),
                    ),
                  ],
                ],
              ),
            ];
          },
        ),
      ],
    );
  }
}
