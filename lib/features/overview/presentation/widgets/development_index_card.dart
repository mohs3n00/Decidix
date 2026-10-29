import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../../api/models/overview.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_radius.dart';
import '../../../../core/constants/app_shadows.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/format/formatters.dart';
import '../../../../shared/widgets/stat_tile.dart';

/// The navy hero card of the dashboard: the national index on an arc, with
/// the number of regions, the population and the regions at risk.
class DevelopmentIndexCard extends StatelessWidget {
  final OverviewIndex index;

  const DevelopmentIndexCard({super.key, required this.index});

  @override
  Widget build(BuildContext context) {
    final fmt = context.fmt;

    return Container(
      decoration: BoxDecoration(
        borderRadius: AppRadius.heroRadius,
        boxShadow: AppShadows.hero,
      ),
      child: ClipRRect(
        borderRadius: AppRadius.heroRadius,
        child: DecoratedBox(
          decoration: const BoxDecoration(color: AppColors.navy),
          child: Stack(
            children: [
              const PositionedDirectional(
                bottom: -70,
                end: -50,
                child: _Glow(size: 224, color: AppColors.blue, alpha: 0.5),
              ),
              const PositionedDirectional(
                top: -40,
                start: 40,
                child: _Glow(size: 128, color: AppColors.cyan, alpha: 0.22),
              ),
              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            fmt.tr('ov_index_title'),
                            style: AppTypography.bodyS.copyWith(
                              color: AppColors.white.withValues(alpha: 0.75),
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.white.withValues(alpha: 0.10),
                            borderRadius: AppRadius.pillRadius,
                          ),
                          child: Text(
                            fmt.tr('ov_index_vs', {
                              'change': fmt.signed(index.change),
                              'year': index.comparedWith,
                            }),
                            style: AppTypography.captionMedium.copyWith(color: AppColors.cyan),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: 200,
                      height: _Arc.height,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          CustomPaint(
                            size: const Size(200, _Arc.height),
                            painter: _Arc(progress: index.score / index.maxScore),
                          ),
                          Padding(
                            padding: const EdgeInsets.only(top: 20),
                            child: Text(
                              fmt.number(index.score),
                              style: AppTypography.adapt(
                                context,
                                AppTypography.headingPage.copyWith(
                                  fontSize: 38,
                                  height: 1,
                                  color: AppColors.white,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      fmt.tr('ov_index_out_of', {
                        'max': fmt.number(index.maxScore, decimals: 0),
                        'band': fmt.indexBand(index.band),
                      }),
                      textAlign: TextAlign.center,
                      style: AppTypography.captionRegular.copyWith(
                        color: AppColors.white.withValues(alpha: 0.6),
                      ),
                    ),
                    const SizedBox(height: 16),
                    StatRow(
                      tiles: [
                        StatTile(
                          dark: true,
                          value: fmt.number(index.regionsCount, decimals: 0),
                          label: fmt.tr('ov_stat_regions'),
                        ),
                        StatTile(
                          dark: true,
                          value: fmt.compact(index.population),
                          label: fmt.tr('ov_stat_population'),
                        ),
                        StatTile(
                          dark: true,
                          value: fmt.number(index.atRiskCount, decimals: 0),
                          label: fmt.tr('ov_stat_at_risk'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Glow extends StatelessWidget {
  final double size;
  final Color color;
  final double alpha;

  const _Glow({required this.size, required this.color, required this.alpha});

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [color.withValues(alpha: alpha), color.withValues(alpha: 0)],
          ),
        ),
      ),
    );
  }
}

/// A 200 degree open arc: faint track, blue to cyan progress.
class _Arc extends CustomPainter {
  _Arc({required this.progress});

  final double progress;

  static const double height = 120;
  static const double _stroke = 12;
  static const double _start = 170 * math.pi / 180;
  static const double _sweep = 200 * math.pi / 180;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, 100);
    final rect = Rect.fromCircle(center: center, radius: 90);

    canvas.drawArc(
      rect,
      _start,
      _sweep,
      false,
      Paint()
        ..color = AppColors.white.withValues(alpha: 0.12)
        ..style = PaintingStyle.stroke
        ..strokeWidth = _stroke
        ..strokeCap = StrokeCap.round,
    );
    canvas.drawArc(
      rect,
      _start,
      _sweep * progress.clamp(0.0, 1.0),
      false,
      Paint()
        ..shader = const LinearGradient(colors: [AppColors.blue, AppColors.cyan])
            .createShader(rect)
        ..style = PaintingStyle.stroke
        ..strokeWidth = _stroke
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(covariant _Arc old) => old.progress != progress;
}
