import 'package:flutter/material.dart';

import '../../api/models/common.dart';
import 'charts.dart';
import 'decidix_card.dart';

/// A card with one line chart over the years, labelled underneath.
class TrendLineCard extends StatelessWidget {
  final List<TrendPoint> points;
  final Widget? header;

  const TrendLineCard({super.key, required this.points, this.header});

  @override
  Widget build(BuildContext context) {
    return DecidixCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (header != null) ...[header!, const SizedBox(height: 14)],
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
