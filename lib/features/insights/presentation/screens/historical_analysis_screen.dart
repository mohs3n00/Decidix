import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../api/models/insights.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/format/formatters.dart';
import '../../../../shared/widgets/charts.dart';
import '../../../../shared/widgets/chip_scroll_row.dart';
import '../../../../shared/widgets/decidix_card.dart';
import '../../../../shared/widgets/decidix_page.dart';
import '../../../../shared/widgets/trend_line_card.dart';
import '../controllers/insights_controller.dart';
import '../widgets/insights_chip_bar.dart';

class HistoricalAnalysisScreen extends ConsumerWidget {
  const HistoricalAnalysisScreen({super.key});

  static const _sectors = ['overall', 'education', 'healthcare', 'economy'];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final history = ref.watch(historicalProvider);
    final sector = ref.watch(historicalSectorProvider);
    final fmt = context.fmt;

    return DecidixPage(
      tabs: const InsightsChipBar(selectedIndex: 5),
      eyebrow: fmt.tr('in_eyebrow'),
      title: fmt.tr('in_title_historical'),
      onRefresh: () => refreshFuture(ref, historicalProvider),
      children: [
        ChipScrollRow(
          labels: [for (final key in _sectors) fmt.tr('map_sector_$key')],
          selectedIndex: _sectors.indexOf(sector),
          onSelected: (i) => ref.read(historicalSectorProvider.notifier).select(_sectors[i]),
        ),
        ...asyncSections(
          history,
          skeletonRows: 4,
          onRetry: () => ref.invalidate(historicalProvider),
          builder: (data) => [
            TrendLineCard(
              points: data.trend,
              header: _Summary(data: data),
            ),
            if (data.annualChange.isNotEmpty)
              Section(
                title: fmt.tr('hist_annual_change'),
                child: DecidixCard(
                  child: BarChartView(
                    maxValue: data.annualChange.fold<double>(
                      0.1,
                      (m, p) => p.value.abs() > m ? p.value.abs() : m,
                    ),
                    highlightIndex: data.annualChange.length - 1,
                    valueLabel: (v) => fmt.number(v),
                    bars: [
                      for (final p in data.annualChange)
                        ChartBarData(label: '${p.year}', value: p.value.abs()),
                    ],
                  ),
                ),
              ),
            if (data.milestones.isNotEmpty)
              Section(
                title: fmt.tr('hist_milestones'),
                child: Column(
                  children: [
                    for (final (i, milestone) in data.milestones.indexed) ...[
                      if (i > 0) const SizedBox(height: 10),
                      _MilestoneCard(milestone: milestone),
                    ],
                  ],
                ),
              ),
          ],
        ),
      ],
    );
  }
}

/// The current value and how much it moved since the first year.
class _Summary extends StatelessWidget {
  final HistoricalData data;

  const _Summary({required this.data});

  @override
  Widget build(BuildContext context) {
    final fmt = context.fmt;
    final up = data.changeSinceStart >= 0;
    final color = up ? AppColors.success : AppColors.danger;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Text(
          fmt.number(data.current),
          style: AppTypography.adapt(context, AppTypography.numberL.copyWith(fontSize: 34)),
        ),
        const SizedBox(width: 10),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          margin: const EdgeInsets.only(bottom: 6),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            fmt.signed(data.changeSinceStart),
            style: AppTypography.captionStrong.copyWith(color: color),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Text(
              fmt.tr('hist_change_since', {'year': data.startYear}),
              style: AppTypography.captionRegular.copyWith(color: AppColors.ink),
            ),
          ),
        ),
      ],
    );
  }
}

class _MilestoneCard extends StatelessWidget {
  final Milestone milestone;

  const _MilestoneCard({required this.milestone});

  @override
  Widget build(BuildContext context) {
    final fmt = context.fmt;
    final locale = Localizations.localeOf(context);
    final color = milestone.impactValue >= 0 ? AppColors.success : AppColors.danger;

    return DecidixCard(
      padding: const EdgeInsets.all(14),
      child: SizedBox(
        width: double.infinity,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${milestone.year}',
              style: AppTypography.captionStrong.copyWith(color: AppColors.blue),
            ),
            const SizedBox(height: 2),
            Text(milestone.title.resolve(locale), style: AppTypography.titleS),
            const SizedBox(height: 4),
            Text(
              '${fmt.signed(milestone.impactValue)} ${milestone.impactLabel.resolve(locale)}',
              style: AppTypography.captionMedium.copyWith(color: color),
            ),
          ],
        ),
      ),
    );
  }
}
