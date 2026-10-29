import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/format/formatters.dart';
import '../../../../shared/widgets/chip_scroll_row.dart';
import '../../../../shared/widgets/decidix_page.dart';
import '../../../../shared/widgets/state_views.dart';
import '../controllers/map_controller.dart';
import '../widgets/decidix_map.dart';
import '../widgets/overview_chip_bar.dart';
import '../widgets/selected_region_card.dart';

class InteractiveMapScreen extends ConsumerWidget {
  const InteractiveMapScreen({super.key});

  static const _sectors = ['overall', 'education', 'healthcare', 'economy', 'infrastructure'];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final points = ref.watch(mapPointsProvider);
    final sector = ref.watch(mapSectorProvider);
    final selectedId = ref.watch(selectedMapRegionProvider);
    final fmt = context.fmt;

    return DecidixPage(
      tabs: const OverviewChipBar(selectedIndex: 1),
      eyebrow: fmt.tr('ov_eyebrow'),
      title: fmt.tr('ov_title_map'),
      onRefresh: () => refreshFuture(ref, mapPointsProvider),
      children: [
        ChipScrollRow(
          labels: [for (final key in _sectors) fmt.tr('map_sector_$key')],
          selectedIndex: _sectors.indexOf(sector),
          onSelected: (i) => ref.read(mapSectorProvider.notifier).select(_sectors[i]),
        ),
        ...asyncSections(
          points,
          skeletonRows: 3,
          onRetry: () => ref.invalidate(mapPointsProvider),
          builder: (list) {
            if (list.isEmpty) return const [EmptyView()];
            final active = list.firstWhere((p) => p.id == selectedId, orElse: () => list.first);
            return [
              DecidixMap(
                points: list,
                selectedId: active.id,
                onPointSelected: (p) => ref.read(selectedMapRegionProvider.notifier).select(p.id),
              ),
              SelectedRegionCard(
                point: active,
                onOpenProfile: () => context.go('/overview/regions/${active.id}'),
              ),
            ];
          },
        ),
      ],
    );
  }
}
