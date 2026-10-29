import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/constants/app_typography.dart';
import 'hatched_bar.dart';

/// One line of a [LineChartView].
class ChartSeries {
  final List<double> values;

  /// Where the first value sits on the x axis (a forecast starts after the past).
  final int startIndex;
  final Color color;
  final bool dashed;

  /// Soft gradient under the line.
  final bool fill;
  final double strokeWidth;

  /// Ring on the last point.
  final bool endDot;

  const ChartSeries({
    required this.values,
    this.startIndex = 0,
    this.color = AppColors.blue,
    this.dashed = false,
    this.fill = false,
    this.strokeWidth = 2.5,
    this.endDot = false,
  });
}

/// The shaded confidence interval of a forecast.
class ChartBand {
  final List<double> lower;
  final List<double> upper;
  final int startIndex;

  const ChartBand({
    required this.lower,
    required this.upper,
    required this.startIndex,
  });
}

/// Smooth line chart drawn with a painter: any number of lines, dashed
/// lines, a gradient fill, a confidence band and a ring on the last point.
///
/// Points sit in the middle of equal columns, so a [ChartXLabels] row under
/// the chart lines up with them. With [edgeToEdge] the line runs to both edges
/// (sparklines).
class LineChartView extends StatelessWidget {
  final List<ChartSeries> series;
  final ChartBand? band;
  final double height;
  final double? minY;
  final double? maxY;
  final bool showGrid;
  final bool edgeToEdge;

  const LineChartView({
    super.key,
    required this.series,
    this.band,
    this.height = 130,
    this.minY,
    this.maxY,
    this.showGrid = true,
    this.edgeToEdge = false,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      width: double.infinity,
      child: CustomPaint(
        painter: _LinePainter(
          series: series,
          band: band,
          minY: minY,
          maxY: maxY,
          showGrid: showGrid,
          edgeToEdge: edgeToEdge,
        ),
      ),
    );
  }
}

class _LinePainter extends CustomPainter {
  _LinePainter({
    required this.series,
    required this.band,
    required this.minY,
    required this.maxY,
    required this.showGrid,
    required this.edgeToEdge,
  });

  final List<ChartSeries> series;
  final ChartBand? band;
  final double? minY;
  final double? maxY;
  final bool showGrid;
  final bool edgeToEdge;

  static const double _inset = 6;

  @override
  void paint(Canvas canvas, Size size) {
    var count = 0;
    final values = <double>[];
    for (final s in series) {
      count = count > s.startIndex + s.values.length
          ? count
          : s.startIndex + s.values.length;
      values.addAll(s.values);
    }
    if (band != null) {
      count = count > band!.startIndex + band!.upper.length
          ? count
          : band!.startIndex + band!.upper.length;
      values
        ..addAll(band!.lower)
        ..addAll(band!.upper);
    }
    if (count < 2 || values.isEmpty) return;

    var low = values.reduce((a, b) => a < b ? a : b);
    var high = values.reduce((a, b) => a > b ? a : b);
    final pad = (high - low) == 0 ? 2.0 : (high - low) * 0.15;
    low = minY ?? low - pad;
    high = maxY ?? high + pad;

    final w = size.width;
    final h = size.height;
    double x(int i) => edgeToEdge ? i * w / (count - 1) : (i + 0.5) * w / count;
    double y(double v) =>
        h - _inset - (v - low) / (high - low) * (h - 2 * _inset);

    if (showGrid) {
      final grid = Paint()
        ..color = AppColors.hairline
        ..strokeWidth = 1;
      for (var k = 0; k < 4; k++) {
        final yy = _inset + k * (h - 2 * _inset) / 3;
        canvas.drawPath(
          _dashed(
            Path()
              ..moveTo(0, yy)
              ..lineTo(w, yy),
            3,
            4,
          ),
          grid..style = PaintingStyle.stroke,
        );
      }
    }

    final b = band;
    if (b != null) {
      final area = Path()..moveTo(x(b.startIndex), y(b.upper.first));
      for (var i = 1; i < b.upper.length; i++) {
        area.lineTo(x(b.startIndex + i), y(b.upper[i]));
      }
      for (var i = b.lower.length - 1; i >= 0; i--) {
        area.lineTo(x(b.startIndex + i), y(b.lower[i]));
      }
      area.close();
      canvas.drawPath(
        area,
        Paint()..color = AppColors.blue.withValues(alpha: 0.12),
      );
    }

    for (final s in series) {
      if (s.values.isEmpty) continue;
      final points = [
        for (var i = 0; i < s.values.length; i++)
          Offset(x(s.startIndex + i), y(s.values[i])),
      ];
      final line = _smooth(points);

      if (s.fill) {
        final area = Path.from(line)
          ..lineTo(points.last.dx, h)
          ..lineTo(points.first.dx, h)
          ..close();
        canvas.drawPath(
          area,
          Paint()
            ..shader = ui.Gradient.linear(Offset.zero, Offset(0, h), [
              s.color.withValues(alpha: 0.18),
              s.color.withValues(alpha: 0),
            ]),
        );
      }

      canvas.drawPath(
        s.dashed ? _dashed(line, 5, 4) : line,
        Paint()
          ..color = s.color
          ..style = PaintingStyle.stroke
          ..strokeWidth = s.strokeWidth
          ..strokeCap = StrokeCap.round
          ..strokeJoin = StrokeJoin.round,
      );

      if (s.endDot) {
        canvas.drawCircle(points.last, 5, Paint()..color = AppColors.white);
        canvas.drawCircle(
          points.last,
          5,
          Paint()
            ..color = s.color
            ..style = PaintingStyle.stroke
            ..strokeWidth = 2.2,
        );
      }
    }
  }

  /// S-curves between points: flat at each point, so the line never overshoots.
  Path _smooth(List<Offset> p) {
    final path = Path()..moveTo(p.first.dx, p.first.dy);
    for (var i = 1; i < p.length; i++) {
      final mid = (p[i - 1].dx + p[i].dx) / 2;
      path.cubicTo(mid, p[i - 1].dy, mid, p[i].dy, p[i].dx, p[i].dy);
    }
    return path;
  }

  Path _dashed(Path source, double dash, double gap) {
    final result = Path();
    for (final metric in source.computeMetrics()) {
      var distance = 0.0;
      while (distance < metric.length) {
        result.addPath(
          metric.extractPath(distance, distance + dash),
          Offset.zero,
        );
        distance += dash + gap;
      }
    }
    return result;
  }

  @override
  bool shouldRepaint(covariant _LinePainter old) => true;
}

/// Labels under a [LineChartView]: one per point, centred under it.
class ChartXLabels extends StatelessWidget {
  final List<String> labels;

  const ChartXLabels(this.labels, {super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (final label in labels)
          Expanded(
            child: Text(
              label,
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.clip,
              style: AppTypography.microRegular.copyWith(color: AppColors.ink),
            ),
          ),
      ],
    );
  }
}

/// A tiny line for a KPI card.
class Sparkline extends StatelessWidget {
  final List<double> values;
  final Color color;

  const Sparkline({super.key, required this.values, required this.color});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 56,
      height: 22,
      child: LineChartView(
        series: [ChartSeries(values: values, color: color, strokeWidth: 1.8)],
        height: 22,
        showGrid: false,
        edgeToEdge: true,
      ),
    );
  }
}

class ChartBarData {
  final String label;
  final double value;

  const ChartBarData({required this.label, required this.value});
}

/// Vertical bars with the value above and the label below. One bar can be
/// highlighted with the brand gradient.
class BarChartView extends StatelessWidget {
  final List<ChartBarData> bars;
  final int highlightIndex;
  final double maxValue;
  final double barAreaHeight;
  final String Function(double value) valueLabel;

  const BarChartView({
    super.key,
    required this.bars,
    required this.maxValue,
    required this.valueLabel,
    this.highlightIndex = 0,
    this.barAreaHeight = 100,
  });

  @override
  Widget build(BuildContext context) {
    // The value above and the label below grow with the user's text size.
    final labels = MediaQuery.textScalerOf(context).scale(44);
    return SizedBox(
      height: barAreaHeight + labels,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          for (final (i, bar) in bars.indexed)
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        valueLabel(bar.value),
                        maxLines: 1,
                        style: AppTypography.microMedium.copyWith(
                          color: AppColors.ink,
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    // The highlighted bar is solid, the others are striped.
                    SizedBox(
                      height:
                          (bar.value / maxValue).clamp(0.0, 1.0) *
                          barAreaHeight,
                      width: double.infinity,
                      child: i == highlightIndex
                          ? const DecoratedBox(
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.all(
                                  Radius.circular(10),
                                ),
                                gradient: LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [AppColors.cyan, AppColors.blue],
                                ),
                              ),
                            )
                          : const HatchFill(
                              borderRadius: BorderRadius.all(
                                Radius.circular(10),
                              ),
                            ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      bar.label,
                      maxLines: 1,
                      overflow: TextOverflow.clip,
                      style: AppTypography.microRegular.copyWith(
                        color: AppColors.ink,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
