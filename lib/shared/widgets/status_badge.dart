import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_radius.dart';
import '../../core/constants/app_typography.dart';

/// Tones of the Figma "Badge" component.
enum BadgeTone { high, medium, low, info, neutral }

class StatusBadge extends StatelessWidget {
  final String label;
  final BadgeTone tone;

  const StatusBadge({super.key, required this.label, required this.tone});

  @override
  Widget build(BuildContext context) {
    final (background, foreground) = switch (tone) {
      BadgeTone.high => (
          AppColors.danger.withValues(alpha: 0.10),
          AppColors.danger,
        ),
      BadgeTone.medium => (
          AppColors.warning.withValues(alpha: 0.15),
          AppColors.warningText,
        ),
      BadgeTone.low => (
          AppColors.success.withValues(alpha: 0.12),
          AppColors.success,
        ),
      BadgeTone.info => (
          AppColors.blue.withValues(alpha: 0.10),
          AppColors.blue,
        ),
      BadgeTone.neutral => (
          AppColors.ink.withValues(alpha: 0.10),
          AppColors.ink,
        ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: background,
        borderRadius: AppRadius.pillRadius,
      ),
      child: Text(
        label,
        maxLines: 1,
        style: AppTypography.microStrong.copyWith(color: foreground),
      ),
    );
  }
}
