import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../../api/models/overview.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_radius.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/format/formatters.dart';
import '../../../../shared/widgets/hero_card.dart';
import '../../../../shared/widgets/stat_tile.dart';

/// The hero of the dashboard: the national index on a ring gauge, with the
/// number of regions, the population and the regions at risk in inset tiles.
class DevelopmentIndexCard extends StatelessWidget {
  final OverviewIndex index;

  const DevelopmentIndexCard({super.key, required this.index});

  @override
  Widget build(BuildContext context) {
    final fmt = context.fmt;

    return HeroCard(
      child: Column(
        children: [
          // The change pill drops under the title when there is no room.
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            runSpacing: 8,
            children: [
              Text(
                fmt.tr('ov_index_title'),
                style: AppTypography.bodyS.copyWith(color: AppColors.fadedInk),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: AppColors.successText.withValues(alpha: 0.10),
                  borderRadius: AppRadius.pillRadius,
                ),
                child: Text(
                  fmt.tr('ov_index_vs', {
                    'change': fmt.signed(index.change),
                    'year': index.comparedWith,
                  }),
                  style: AppTypography.captionMedium.copyWith(
                    color: AppColors.successText,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: _Gauge.size,
            height: _Gauge.size - 20,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CustomPaint(
                  size: const Size(_Gauge.size, _Gauge.size),
                  painter: _Gauge(progress: index.score / index.maxScore),
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      fmt.number(index.score),
                      style: AppTypography.adapt(
                        context,
                        AppTypography.headingPage.copyWith(
                          fontSize: 52,
                          height: 1,
                          color: AppColors.navy,
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      fmt.tr('ov_index_out_of', {
                        'max': fmt.number(index.maxScore, decimals: 0),
                        'band': fmt.indexBand(index.band),
                      }),
                      textAlign: TextAlign.center,
                      style: AppTypography.captionRegular.copyWith(
                        color: AppColors.fadedInk,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          StatRow(
            tiles: [
              StatTile(
                well: true,
                value: fmt.number(index.regionsCount, decimals: 0),
                label: fmt.tr('ov_stat_regions'),
              ),
              StatTile(
                well: true,
                value: fmt.compact(index.population),
                label: fmt.tr('ov_stat_population'),
              ),
              StatTile(
                well: true,
                value: fmt.number(index.atRiskCount, decimals: 0),
                label: fmt.tr('ov_stat_at_risk'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// A thick open ring (260 degrees): the reached part is the brand gradient,
/// the part still to go is striped.
class _Gauge extends CustomPainter {
  _Gauge({required this.progress});

  final double progress;

  static const double size = 220;
  static const double _stroke = 18;
  static const double _start = 140 * math.pi / 180;
  static const double _sweep = 260 * math.pi / 180;

  @override
  void paint(Canvas canvas, Size canvasSize) {
    final center = Offset(canvasSize.width / 2, canvasSize.height / 2);
    final radius = (size - _stroke) / 2;
    final rect = Rect.fromCircle(center: center, radius: radius);
    final reached = _sweep * progress.clamp(0.0, 1.0);

    // Striped remainder: short radial ticks across the width of the ring.
    final tick = Paint()
      ..color = AppColors.hatch
      ..strokeWidth = 1.6
      ..strokeCap = StrokeCap.butt;
    final from = _start + reached;
    final to = _start + _sweep;
    const step = 4.2 * math.pi / 180;
    for (var a = from + step; a < to; a += step) {
      final dir = Offset(math.cos(a), math.sin(a));
      canvas.drawLine(
        center + dir * (radius - _stroke / 2),
        center + dir * (radius + _stroke / 2),
        tick,
      );
    }

    canvas.drawArc(
      rect,
      _start,
      reached,
      false,
      Paint()
        ..shader = const SweepGradient(
          startAngle: _start,
          endAngle: _start + _sweep,
          colors: [AppColors.blue, AppColors.cyan],
          transform: GradientRotation(0),
        ).createShader(rect)
        ..style = PaintingStyle.stroke
        ..strokeWidth = _stroke
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(covariant _Gauge old) => old.progress != progress;
}
