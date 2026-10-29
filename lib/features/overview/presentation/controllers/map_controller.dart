import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../api/api_providers.dart';
import '../../../../api/models/overview.dart';

/// `overall`, `education`, `healthcare`, `economy` or `infrastructure`.
class MapSector extends Notifier<String> {
  @override
  String build() => 'overall';

  void select(String sector) => state = sector;
}

final mapSectorProvider = NotifierProvider<MapSector, String>(MapSector.new);

final mapPointsProvider = FutureProvider<List<MapPoint>>((ref) {
  final sector = ref.watch(mapSectorProvider);
  return ref.watch(overviewApiProvider).getMapPoints(sector: sector);
});

/// The region the user tapped on the map; null means the first one.
class SelectedMapRegion extends Notifier<String?> {
  @override
  String? build() => null;

  void select(String? regionId) => state = regionId;
}

final selectedMapRegionProvider = NotifierProvider<SelectedMapRegion, String?>(
  SelectedMapRegion.new,
);
