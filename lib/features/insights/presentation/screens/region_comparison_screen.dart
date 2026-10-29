import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../api/models/insights.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_radius.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/format/formatters.dart';
import '../../../../shared/widgets/ai_insight_panel.dart';
import '../../../../shared/widgets/decidix_card.dart';
import '../../../../shared/widgets/decidix_page.dart';
import '../../../../shared/widgets/hatched_bar.dart';
import '../../../../shared/widgets/region_picker.dart';
import '../../../../shared/widgets/score_ring.dart';
import '../../../../shared/widgets/select_field.dart';
import '../../../overview/presentation/controllers/regions_controller.dart';
import '../controllers/insights_controller.dart';
import '../widgets/insights_chip_bar.dart';

class RegionComparisonScreen extends ConsumerWidget {
  const RegionComparisonScreen({super.key});

  Future<void> _pick(
    BuildContext context,
    WidgetRef ref, {
    required bool first,
    required String current,
  }) async {
    final regions = ref.read(allRegionsProvider).value;
    if (regions == null) return;
    final id = await showRegionPicker(context, regions: regions, selectedId: current);
    if (id == null) return;
    final choice = ref.read(comparisonChoiceProvider.notifier);
    first ? choice.pickA(id) : choice.pickB(id);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final comparison = ref.watch(comparisonProvider);
    final fmt = context.fmt;
    final locale = Localizations.localeOf(context);

    return DecidixPage(
      tabs: const InsightsChipBar(selectedIndex: 4),
      eyebrow: fmt.tr('in_eyebrow'),
      title: fmt.tr('in_title_comparison'),
      onRefresh: () => refreshFuture(ref, comparisonProvider),
      children: asyncSections(
        comparison,
        skeletonRows: 4,
        onRetry: () => ref.invalidate(comparisonProvider),
        builder: (data) => [
          Row(
            children: [
              Expanded(
                child: SelectField(
                  value: data.a.name.resolve(locale),
                  style: SelectFieldStyle.gradient,
                  onTap: () => _pick(context, ref, first: true, current: data.a.id),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: SelectField(
                  value: data.b.name.resolve(locale),
                  style: SelectFieldStyle.navy,
                  onTap: () => _pick(context, ref, first: false, current: data.b.id),
                ),
              ),
            ],
          ),
          DecidixCard(
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    ScoreRing(score: data.a.score, size: 64, strokeWidth: 6, color: AppColors.blue),
                    Text(
                      fmt.tr('cmp_vs'),
                      style: AppTypography.captionMedium.copyWith(color: AppColors.ink),
                    ),
                    ScoreRing(score: data.b.score, size: 64, strokeWidth: 6, color: AppColors.navy),
                  ],
                ),
                const SizedBox(height: 20),
                for (final (i, metric) in data.metrics.indexed) ...[
                  if (i > 0) const SizedBox(height: 14),
                  _MetricRow(metric: metric),
                ],
              ],
            ),
          ),
          AiInsightPanel(
            label: fmt.tr('cmp_gap_analysis'),
            body: data.gapAnalysis.resolve(locale),
          ),
        ],
      ),
    );
  }
}

/// `86  Overall  47`, with two bars growing from the middle.
class _MetricRow extends StatelessWidget {
  final ComparisonMetric metric;

  const _MetricRow({required this.metric});

  @override
  Widget build(BuildContext context) {
    final fmt = context.fmt;
    final locale = Localizations.localeOf(context);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 30,
          child: Text(
            fmt.number(metric.scoreA, decimals: 0),
            style: AppTypography.labelMStrong.copyWith(color: AppColors.blue),
          ),
        ),
        Expanded(
          child: Column(
            children: [
              Text(
                metric.label.resolve(locale),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTypography.captionRegular.copyWith(color: AppColors.ink),
              ),
              const SizedBox(height: 6),
              _Bars(scoreA: metric.scoreA, scoreB: metric.scoreB),
            ],
          ),
        ),
        SizedBox(
          width: 30,
          child: Text(
            fmt.number(metric.scoreB, decimals: 0),
            textAlign: TextAlign.end,
            style: AppTypography.labelMStrong,
          ),
        ),
      ],
    );
  }
}

class _Bars extends StatelessWidget {
  final double scoreA;
  final double scoreB;

  const _Bars({required this.scoreA, required this.scoreB});

  @override
  Widget build(BuildContext context) {
    Widget half(double score, {required bool first}) {
      return Expanded(
        child: Align(
          alignment: first ? AlignmentDirectional.centerEnd : AlignmentDirectional.centerStart,
          child: FractionallySizedBox(
            widthFactor: (score / 100).clamp(0.0, 1.0),
            heightFactor: 1,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: first ? null : AppColors.navy,
                gradient: first
                    ? const LinearGradient(
                        begin: AlignmentDirectional.centerEnd,
                        end: AlignmentDirectional.centerStart,
                        colors: [AppColors.blue, AppColors.cyan],
                      )
                    : null,
              ),
            ),
          ),
        ),
      );
    }

    return SizedBox(
      height: 8,
      child: Stack(
        fit: StackFit.expand,
        children: [
          HatchFill(borderRadius: AppRadius.pillRadius),
          ClipRRect(
            borderRadius: AppRadius.pillRadius,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [half(scoreA, first: true), half(scoreB, first: false)],
            ),
          ),
        ],
      ),
    );
  }
}
