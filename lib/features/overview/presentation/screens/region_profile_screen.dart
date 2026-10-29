import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../../../api/models/overview.dart';
import '../../../../core/constants/app_assets.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/format/formatters.dart';
import '../../../../shared/widgets/ai_insight_panel.dart';
import '../../../../shared/widgets/charts.dart';
import '../../../../shared/widgets/decidix_card.dart';
import '../../../../shared/widgets/decidix_page.dart';
import '../../../../shared/widgets/progress_row.dart';
import '../controllers/regions_controller.dart';
import '../widgets/region_hero.dart';

class RegionProfileScreen extends ConsumerWidget {
  final String regionId;

  const RegionProfileScreen({super.key, required this.regionId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(regionProfileProvider(regionId));
    final locale = Localizations.localeOf(context);
    final fmt = context.fmt;

    return DecidixPage(
      onRefresh: () => refreshFuture(ref, regionProfileProvider(regionId)),
      children: asyncSections(
        profile,
        skeletonRows: 4,
        onRetry: () => ref.invalidate(regionProfileProvider(regionId)),
        builder: (data) => [
          RegionHero(profile: data),
          DecidixCard(
            child: Column(
              children: [
                for (final (i, domain) in data.domains.indexed) ...[
                  if (i > 0) const SizedBox(height: 14),
                  ProgressRow(
                    label: domain.label.resolve(locale),
                    valueLabel: fmt.number(domain.score, decimals: 0),
                    progress: domain.score / 100,
                  ),
                ],
              ],
            ),
          ),
          Section(
            title: fmt.tr('profile_history'),
            child: _HistoryCard(profile: data),
          ),
          AiInsightPanel(
            label: fmt.tr('label_ai_insight'),
            body: data.aiInsight.resolve(locale),
          ),
          Row(
            children: [
              SvgPicture.asset(
                AppAssets.icAiSpark,
                width: 14,
                height: 14,
                colorFilter: const ColorFilter.mode(AppColors.blue, BlendMode.srcIn),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  fmt.tr('profile_data_quality', {
                    'score': fmt.number(data.dataQualityScore, decimals: 0),
                    'date': fmt.monthYear(data.dataQualityUpdatedAt),
                  }),
                  style: AppTypography.captionRegular.copyWith(color: AppColors.ink),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// The region's index over the years against the national one (dashed).
class _HistoryCard extends StatelessWidget {
  final RegionProfile profile;

  const _HistoryCard({required this.profile});

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context);

    return DecidixCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          LineChartView(
            series: [
              ChartSeries(
                values: [for (final p in profile.historyNational) p.value],
                color: AppColors.mutedText.withValues(alpha: 0.6),
                dashed: true,
                strokeWidth: 2,
              ),
              ChartSeries(
                values: [for (final p in profile.historyRegion) p.value],
                fill: true,
                endDot: true,
              ),
            ],
          ),
          const SizedBox(height: 6),
          ChartXLabels([for (final p in profile.historyRegion) '${p.year}']),
          const SizedBox(height: 12),
          Wrap(
            spacing: 16,
            runSpacing: 6,
            children: [
              _LegendDot(color: AppColors.blue, label: profile.name.resolve(locale)),
              _LegendDot(
                color: AppColors.mutedText.withValues(alpha: 0.6),
                label: context.fmt.tr('profile_legend_national'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _LegendDot extends StatelessWidget {
  final Color color;
  final String label;

  const _LegendDot({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(label, style: AppTypography.captionRegular.copyWith(color: AppColors.ink)),
      ],
    );
  }
}
