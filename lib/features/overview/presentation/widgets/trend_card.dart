import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../api/models/common.dart';
import '../../../../shared/widgets/charts.dart';
import '../../../../shared/widgets/decidix_card.dart';
import '../../../../shared/widgets/decidix_chip.dart';
import '../controllers/dashboard_controller.dart';

/// National trend: 3Y / 5Y / 7Y chips over a line chart.
class TrendCard extends ConsumerWidget {
  final List<TrendPoint> points;

  const TrendCard({super.key, required this.points});

  static const ranges = ['3Y', '5Y', '7Y'];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(selectedTrendRangeProvider);

    return DecidixCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            spacing: 8,
            children: [
              for (final range in ranges)
                DecidixChip(
                  label: range,
                  selected: range == selected,
                  onTap: () => ref.read(selectedTrendRangeProvider.notifier).select(range),
                ),
            ],
          ),
          const SizedBox(height: 14),
          LineChartView(
            series: [
              ChartSeries(
                values: [for (final p in points) p.value],
                fill: true,
                endDot: true,
              ),
            ],
          ),
          const SizedBox(height: 6),
          ChartXLabels([for (final p in points) '${p.year}']),
        ],
      ),
    );
  }
}
