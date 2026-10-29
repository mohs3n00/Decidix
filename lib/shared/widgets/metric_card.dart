import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../api/models/common.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_typography.dart';
import '../../core/format/formatters.dart';
import 'charts.dart';
import 'decidix_card.dart';
import 'trend_indicator.dart';

/// KPI card: label (and icon), the value with its unit, the change, and a
/// sparkline when the data has one.
class MetricCard extends StatelessWidget {
  final Metric metric;

  /// SVG asset shown at the end of the label row (dashboard only).
  final String? icon;

  const MetricCard({super.key, required this.metric, this.icon});

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context);
    final text = context.fmt.metric(metric);
    final good = metric.isImprovement;

    return DecidixCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  metric.label.resolve(locale),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.captionMedium.copyWith(color: AppColors.ink),
                ),
              ),
              if (icon != null)
                SvgPicture.asset(
                  icon!,
                  width: 16,
                  height: 16,
                  colorFilter: const ColorFilter.mode(AppColors.blue, BlendMode.srcIn),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Flexible(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: AlignmentDirectional.centerStart,
                  child: Text(
                    text.value,
                    style: AppTypography.adapt(context, AppTypography.numberL),
                  ),
                ),
              ),
              if (text.unit.isNotEmpty) ...[
                const SizedBox(width: 4),
                Text(
                  text.unit,
                  style: AppTypography.captionRegular.copyWith(color: AppColors.ink),
                ),
              ],
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              TrendIndicator(value: metric.change, inverted: !metric.higherIsBetter),
              const Spacer(),
              if (metric.sparkline.length > 1)
                Sparkline(
                  values: metric.sparkline,
                  color: good ? AppColors.blue : AppColors.danger,
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Two-column grid of [MetricCard]s.
class MetricGrid extends StatelessWidget {
  final List<Metric> metrics;
  final bool showIcons;

  const MetricGrid({super.key, required this.metrics, this.showIcons = false});

  @override
  Widget build(BuildContext context) {
    final rows = <Widget>[];
    for (var i = 0; i < metrics.length; i += 2) {
      Widget cell(int index) => index < metrics.length
          ? MetricCard(
              metric: metrics[index],
              icon: showIcons ? metricIcon(metrics[index].key) : null,
            )
          : const SizedBox.shrink();
      rows.add(
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(child: cell(i)),
              const SizedBox(width: 12),
              Expanded(child: cell(i + 1)),
            ],
          ),
        ),
      );
    }
    return Column(
      children: [
        for (final (i, row) in rows.indexed) ...[
          if (i > 0) const SizedBox(height: 12),
          row,
        ],
      ],
    );
  }
}
