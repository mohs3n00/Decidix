import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_typography.dart';

/// Label and value on one line with a thin progress bar under them ("Key
/// indicators", "Education / Healthcare…" rows). [progress] is 0 to 1.
class ProgressRow extends StatelessWidget {
  final String label;
  final String valueLabel;
  final double progress;
  final Gradient? gradient;
  final Color? color;

  const ProgressRow({
    super.key,
    required this.label,
    required this.valueLabel,
    required this.progress,
    this.gradient,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final fill = color != null ? null : (gradient ?? AppColors.brandGradient);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTypography.labelM,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              valueLabel,
              style: AppTypography.captionRegular.copyWith(color: AppColors.ink),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(3),
          child: SizedBox(
            height: 5,
            child: DecoratedBox(
              decoration: const BoxDecoration(color: AppColors.track),
              child: Align(
                alignment: AlignmentDirectional.centerStart,
                child: FractionallySizedBox(
                  widthFactor: progress.clamp(0.0, 1.0).toDouble(),
                  heightFactor: 1,
                  child: DecoratedBox(
                    decoration: BoxDecoration(color: color, gradient: fill),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
