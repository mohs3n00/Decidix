import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/constants/app_typography.dart';
import '../../api/models/common.dart';

/// A circular score. The colour follows how urgently the region needs help
/// (low is green, medium amber, high red) when [color] is not given.
class ScoreRing extends StatelessWidget {
  final double score;
  final double maxScore;
  final double size;
  final double strokeWidth;
  final Color? color;

  const ScoreRing({
    super.key,
    required this.score,
    this.maxScore = 100.0,
    this.size = 48.0,
    this.strokeWidth = 4,
    this.color,
  });

  /// The ring colour for a region's priority.
  static Color colorFor(Priority priority) {
    switch (priority) {
      case Priority.low:
        return AppColors.success;
      case Priority.medium:
        return AppColors.warning;
      case Priority.high:
      case Priority.critical:
        return AppColors.danger;
    }
  }

  @override
  Widget build(BuildContext context) {
    final ringColor =
        color ??
        (score >= 75
            ? AppColors.success
            : score >= 60
            ? AppColors.blue
            : AppColors.danger);

    return Semantics(
      label: score.toStringAsFixed(0),
      child: SizedBox(
        width: size,
        height: size,
        child: CustomPaint(
          painter: _ScoreRingPainter(
            progress: (score / maxScore).clamp(0.0, 1.0),
            trackColor: AppColors.track,
            progressColor: ringColor,
            strokeWidth: strokeWidth,
          ),
          child: Center(
            child: Text(
              score.toStringAsFixed(0),
              style: AppTypography.labelLStrong.copyWith(fontSize: size * 0.3),
            ),
          ),
        ),
      ),
    );
  }
}

class _ScoreRingPainter extends CustomPainter {
  final double progress;
  final Color trackColor;
  final Color progressColor;
  final double strokeWidth;

  _ScoreRingPainter({
    required this.progress,
    required this.trackColor,
    required this.progressColor,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - strokeWidth) / 2;

    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..color = trackColor
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth,
    );

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      2 * math.pi * progress,
      false,
      Paint()
        ..color = progressColor
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(covariant _ScoreRingPainter oldDelegate) {
    return oldDelegate.progress != progress ||
        oldDelegate.progressColor != progressColor;
  }
}
