import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../api/models/common.dart';
import '../../../../core/format/formatters.dart';
import '../../../../shared/widgets/ai_insight_panel.dart';
import '../../../../shared/widgets/charts.dart';
import '../../../../shared/widgets/decidix_card.dart';
import '../../../../shared/widgets/decidix_page.dart';
import '../../../../shared/widgets/metric_card.dart';
import '../../../../shared/widgets/progress_row.dart';
import '../../../../shared/widgets/trend_line_card.dart';
import '../controllers/insights_controller.dart';
import '../widgets/insights_chip_bar.dart';
import '../widgets/regional_ranking.dart';

/// Education, Healthcare, Economy and Infrastructure: one layout, four data sets.
class SectorScreen extends ConsumerWidget {
  final Domain sector;

  const SectorScreen({super.key, required this.sector});

  /// The order of the sector tabs.
  static const _tabs = [
    Domain.education,
    Domain.healthcare,
    Domain.economy,
    Domain.infrastructure,
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(sectorProvider(sector));
    final fmt = context.fmt;
    final locale = Localizations.localeOf(context);

    return DecidixPage(
      tabs: InsightsChipBar(selectedIndex: _tabs.indexOf(sector)),
      eyebrow: fmt.tr('in_eyebrow'),
      title: fmt.tr('in_title_${sector.name}'),
      onRefresh: () => refreshFuture(ref, sectorProvider(sector)),
      children: asyncSections(
        data,
        skeletonRows: 5,
        onRetry: () => ref.invalidate(sectorProvider(sector)),
        builder: (d) {
          final percent = d.breakdown.unit == MetricUnit.percent;
          final maxBar = percent
              ? 100.0
              : d.breakdown.bars.fold<double>(
                  1,
                  (m, b) => b.value > m ? b.value : m,
                );

          return [
            MetricGrid(metrics: d.kpis),
            if (d.trend.isNotEmpty)
              Section(
                title: fmt.tr('in_index_trend', {
                  'from': d.trend.first.year,
                  'to': d.trend.last.year,
                }),
                child: TrendLineCard(points: d.trend),
              ),
            Section(
              title:
                  '${d.breakdown.title.resolve(locale)}${percent ? ' (%)' : ''}',
              child: DecidixCard(
                child: BarChartView(
                  maxValue: maxBar,
                  valueLabel: (v) => fmt.number(v, decimals: 0),
                  bars: [
                    for (final bar in d.breakdown.bars)
                      ChartBarData(
                        label: bar.label.resolve(locale),
                        value: bar.value,
                      ),
                  ],
                ),
              ),
            ),
            Section(
              title: fmt.tr('in_key_indicators'),
              child: DecidixCard(
                child: Column(
                  children: [
                    for (final (i, item) in d.indicators.indexed) ...[
                      if (i > 0) const SizedBox(height: 14),
                      ProgressRow(
                        label: item.label.resolve(locale),
                        valueLabel: fmt.indicator(item.value, item.unit),
                        progress: item.value / 100,
                      ),
                    ],
                  ],
                ),
              ),
            ),
            Section(
              title: fmt.tr('in_regional_ranking'),
              child: RegionalRanking(
                top: d.rankingTop,
                bottom: d.rankingBottom,
              ),
            ),
            AiInsightPanel(
              label: fmt.tr('label_ai_insight'),
              body: d.aiInsight.resolve(locale),
            ),
          ];
        },
      ),
    );
  }
}
