import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../api/models/intelligence.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/format/formatters.dart';
import '../../../../shared/widgets/charts.dart';
import '../../../../shared/widgets/chip_scroll_row.dart';
import '../../../../shared/widgets/decidix_card.dart';
import '../../../../shared/widgets/decidix_page.dart';
import '../../../../shared/widgets/progress_row.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../controllers/intelligence_controllers.dart';
import '../widgets/intelligence_chip_bar.dart';

class PredictionsScreen extends ConsumerWidget {
  const PredictionsScreen({super.key});

  /// Shown until the server says which years it can forecast.
  static const _defaultYears = [2027, 2028, 2030];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final predictions = ref.watch(predictionsProvider);
    final chosenYear = ref.watch(predictionYearProvider);
    final fmt = context.fmt;
    final locale = Localizations.localeOf(context);

    final years = predictions.value?.availableYears ?? _defaultYears;
    final year = chosenYear ?? predictions.value?.targetYear ?? years.first;

    return DecidixPage(
      tabs: const IntelligenceChipBar(selectedIndex: 0),
      eyebrow: fmt.tr('ai_eyebrow'),
      title: fmt.tr('ai_title_predictions'),
      onRefresh: () => refreshFuture(ref, predictionsProvider),
      children: [
        ChipScrollRow(
          labels: [for (final y in years) '$y'],
          selectedIndex: years.indexOf(year).clamp(0, years.length - 1),
          onSelected: (i) => ref.read(predictionYearProvider.notifier).select(years[i]),
        ),
        ...asyncSections(
          predictions,
          skeletonRows: 4,
          onRetry: () => ref.invalidate(predictionsProvider),
          builder: (data) => [
            _ForecastCard(data: data),
            Section(
              title: fmt.tr('pred_model_performance'),
              child: DecidixCard(
                child: Column(
                  children: [
                    for (final (i, model) in data.models.indexed) ...[
                      if (i > 0) const SizedBox(height: 14),
                      ProgressRow(
                        label: model.name.resolve(locale),
                        valueLabel: 'R² ${fmt.number(model.r2, decimals: 2)}',
                        progress: model.r2,
                      ),
                    ],
                  ],
                ),
              ),
            ),
            Section(
              title: fmt.tr('pred_improvers'),
              child: DecidixCard(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  children: [
                    for (final (i, region) in data.topImprovers.indexed) ...[
                      if (i > 0) const Divider(height: 1),
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(region.name.resolve(locale), style: AppTypography.labelL),
                            ),
                            Text(
                              fmt.tr('pred_by_year', {
                                'n': fmt.number(region.delta),
                                'year': data.targetYear,
                              }),
                              style: AppTypography.captionStrong.copyWith(color: AppColors.success),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

/// The projected index, its confidence, and the line: solid for the past,
/// dashed for the forecast, shaded for the interval.
class _ForecastCard extends StatelessWidget {
  final Predictions data;

  const _ForecastCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final fmt = context.fmt;
    final actual = data.series.where((p) => !p.isForecast).toList();
    final forecast = data.series.where((p) => p.isForecast).toList();

    // The forecast starts at the last real point, so the two lines join.
    final joinIndex = actual.isEmpty ? 0 : actual.length - 1;
    final joinValue = actual.isEmpty ? null : actual.last.value;

    final series = [
      ChartSeries(values: [for (final p in actual) p.value], fill: true),
      if (forecast.isNotEmpty)
        ChartSeries(
          values: [?joinValue, for (final p in forecast) p.value],
          startIndex: joinIndex,
          dashed: true,
          endDot: true,
        ),
    ];
    final band = forecast.isEmpty
        ? null
        : ChartBand(
            startIndex: joinIndex,
            lower: [?joinValue, for (final p in forecast) p.lower ?? p.value],
            upper: [?joinValue, for (final p in forecast) p.upper ?? p.value],
          );

    return DecidixCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            fmt.tr('pred_projected', {'year': data.targetYear}),
            style: AppTypography.captionRegular.copyWith(color: AppColors.ink),
          ),
          const SizedBox(height: 6),
          Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 12,
            runSpacing: 6,
            children: [
              Text(
                fmt.number(data.projectedIndex),
                style: AppTypography.adapt(context, AppTypography.numberL.copyWith(fontSize: 34)),
              ),
              StatusBadge(
                label: fmt.tr('pred_confidence', {'n': fmt.number(data.confidence, decimals: 0)}),
                tone: BadgeTone.info,
              ),
            ],
          ),
          const SizedBox(height: 14),
          LineChartView(series: series, band: band, height: 150),
          const SizedBox(height: 6),
          ChartXLabels([
            for (final p in data.series) "'${(p.year % 100).toString().padLeft(2, '0')}",
          ]),
          const SizedBox(height: 12),
          Text(
            fmt.tr('pred_note'),
            style: AppTypography.microRegular.copyWith(color: AppColors.ink),
          ),
        ],
      ),
    );
  }
}
