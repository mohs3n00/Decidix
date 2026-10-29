import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../api/api_providers.dart';
import '../../../../api/models/common.dart';
import '../../../../api/models/insights.dart';
import '../../../overview/presentation/controllers/regions_controller.dart';

final sectorProvider = FutureProvider.family<SectorInsights, Domain>((ref, sector) {
  return ref.watch(insightsApiProvider).getSector(sector);
});

/// The two regions the user picked to compare. A null side means "not picked
/// yet": the screen then starts with the best and the weakest region.
class ComparisonChoice {
  final String? a;
  final String? b;

  const ComparisonChoice({this.a, this.b});
}

class ComparisonChoiceNotifier extends Notifier<ComparisonChoice> {
  @override
  ComparisonChoice build() => const ComparisonChoice();

  void pickA(String id) => state = ComparisonChoice(a: id, b: state.b);

  void pickB(String id) => state = ComparisonChoice(a: state.a, b: id);
}

final comparisonChoiceProvider =
    NotifierProvider<ComparisonChoiceNotifier, ComparisonChoice>(ComparisonChoiceNotifier.new);

final comparisonProvider = FutureProvider<RegionComparison>((ref) async {
  final regions = await ref.watch(allRegionsProvider.future);
  final choice = ref.watch(comparisonChoiceProvider);
  final a = choice.a ?? regions.first.id;
  final b = choice.b ?? regions.last.id;
  return ref.watch(insightsApiProvider).getComparison(a, b);
});

/// `overall`, `education`, `healthcare` or `economy`.
class HistoricalSector extends Notifier<String> {
  @override
  String build() => 'overall';

  void select(String sector) => state = sector;
}

final historicalSectorProvider =
    NotifierProvider<HistoricalSector, String>(HistoricalSector.new);

final historicalProvider = FutureProvider<HistoricalData>((ref) {
  final sector = ref.watch(historicalSectorProvider);
  return ref.watch(insightsApiProvider).getHistorical(sector: sector);
});

final priorityProvider = FutureProvider<PriorityOverview>((ref) {
  return ref.watch(insightsApiProvider).getPriority();
});

final dataQualityProvider = FutureProvider<DataQuality>((ref) {
  return ref.watch(insightsApiProvider).getDataQuality();
});
