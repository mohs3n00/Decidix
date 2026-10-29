import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../api/models/insights.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/format/formatters.dart';
import '../../../../shared/widgets/decidix_card.dart';
import '../../../../shared/widgets/decidix_page.dart';
import '../../../../shared/widgets/progress_row.dart';
import '../../../../shared/widgets/score_ring.dart';
import '../../../../shared/widgets/stat_tile.dart';
import '../controllers/insights_controller.dart';
import '../widgets/insights_chip_bar.dart';

class DataQualityScreen extends ConsumerWidget {
  const DataQualityScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final quality = ref.watch(dataQualityProvider);
    final fmt = context.fmt;
    final locale = Localizations.localeOf(context);

    return DecidixPage(
      tabs: const InsightsChipBar(selectedIndex: 7),
      eyebrow: fmt.tr('in_eyebrow'),
      title: fmt.tr('in_title_data_quality'),
      onRefresh: () => refreshFuture(ref, dataQualityProvider),
      children: asyncSections(
        quality,
        skeletonRows: 5,
        onRetry: () => ref.invalidate(dataQualityProvider),
        builder: (data) => [
          DecidixCard(
            child: Row(
              children: [
                ScoreRing(
                  score: data.score,
                  size: 84,
                  strokeWidth: 8,
                  color: _coverageColor(data.score),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        fmt.qualityBand(data.band),
                        style: AppTypography.titleM,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        fmt.tr('dq_confidence'),
                        style: AppTypography.bodyS.copyWith(
                          color: AppColors.ink,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          StatRow(
            tiles: [
              StatTile(
                value: fmt.percent(data.completeness),
                label: fmt.tr('dq_complete'),
              ),
              StatTile(
                value: fmt.percent(data.timeliness),
                label: fmt.tr('dq_timely'),
              ),
              StatTile(
                value: fmt.percent(data.accuracy),
                label: fmt.tr('dq_accurate'),
              ),
            ],
          ),
          Section(
            title: fmt.tr('dq_lowest_coverage'),
            child: DecidixCard(
              child: Column(
                children: [
                  for (final (i, entry) in data.lowestCoverage.indexed) ...[
                    if (i > 0) const SizedBox(height: 14),
                    ProgressRow(
                      label: entry.name.resolve(locale),
                      valueLabel: fmt.percent(entry.coverage),
                      progress: entry.coverage / 100,
                      color: _coverageColor(entry.coverage),
                    ),
                  ],
                ],
              ),
            ),
          ),
          Section(
            title: fmt.tr('dq_sources'),
            child: DecidixCard(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                children: [
                  for (final (i, source) in data.sources.indexed) ...[
                    if (i > 0) const Divider(height: 1),
                    _SourceRow(source: source),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Red below 65, amber below 75, green from 75.
  static Color _coverageColor(double value) {
    if (value >= 75) return AppColors.success;
    if (value >= 65) return AppColors.warning;
    return AppColors.danger;
  }
}

class _SourceRow extends StatelessWidget {
  final DataSource source;

  const _SourceRow({required this.source});

  @override
  Widget build(BuildContext context) {
    final fmt = context.fmt;
    final locale = Localizations.localeOf(context);
    final overdue = source.status == SourceStatus.overdue;

    final age = overdue
        ? fmt.tr('dq_overdue', {'n': source.ageDays})
        : source.ageDays == 0
        ? fmt.tr('dq_synced_today')
        : fmt.tr('dq_synced_days', {'n': source.ageDays});

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 14),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: overdue ? AppColors.danger : AppColors.success,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 3,
            child: Text(
              source.name.resolve(locale),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.labelM,
            ),
          ),
          const SizedBox(width: 8),
          Flexible(
            flex: 2,
            child: Text(
              age,
              textAlign: TextAlign.end,
              style: AppTypography.captionRegular.copyWith(
                color: overdue ? AppColors.dangerText : AppColors.ink,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
