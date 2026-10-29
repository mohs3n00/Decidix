import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/constants/app_radius.dart';

/// Diagonal stripes. They mark what is empty, not reached or still to come,
/// next to the solid brand colour of what is filled.
class HatchPainter extends CustomPainter {
  final Color color;
  final double gap;
  final double strokeWidth;

  const HatchPainter({
    this.color = AppColors.hatch,
    this.gap = 6,
    this.strokeWidth = 1.4,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.butt;
    // Lines rising to the right, one every [gap] pixels along the bottom edge.
    for (var x = -size.height; x < size.width; x += gap) {
      canvas.drawLine(
        Offset(x, size.height),
        Offset(x + size.height, 0),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant HatchPainter old) =>
      old.color != color || old.gap != gap || old.strokeWidth != strokeWidth;
}

/// A rectangle filled with stripes.
class HatchFill extends StatelessWidget {
  final BorderRadius borderRadius;
  final Color color;

  const HatchFill({
    super.key,
    required this.borderRadius,
    this.color = AppColors.hatch,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: borderRadius,
      child: CustomPaint(
        painter: HatchPainter(color: color),
        child: const SizedBox.expand(),
      ),
    );
  }
}

/// A progress bar: the filled part is solid (the brand gradient, or [color]),
/// the rest is striped. [value] is 0 to 1.
class HatchedBar extends StatelessWidget {
  final double value;
  final double height;
  final Gradient? gradient;
  final Color? color;

  const HatchedBar({
    super.key,
    required this.value,
    this.height = 10,
    this.gradient,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final fill = color != null ? null : (gradient ?? AppColors.brandGradient);

    return SizedBox(
      height: height,
      child: Stack(
        fit: StackFit.expand,
        children: [
          HatchFill(borderRadius: AppRadius.pillRadius),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: FractionallySizedBox(
              widthFactor: value.clamp(0.0, 1.0).toDouble(),
              heightFactor: 1,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: color,
                  gradient: fill,
                  borderRadius: AppRadius.pillRadius,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
