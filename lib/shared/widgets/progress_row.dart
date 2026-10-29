import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_typography.dart';
import 'hatched_bar.dart';

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
        HatchedBar(value: progress, height: 8, gradient: gradient, color: color),
      ],
    );
  }
}
