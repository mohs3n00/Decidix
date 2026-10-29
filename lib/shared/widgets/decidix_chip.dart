import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/constants/app_radius.dart';
import '../../core/constants/app_typography.dart';

/// Pill chip. Selected: filled navy with white text. Not selected: white with a
/// hairline. Both states are one height, the hairline is drawn inside the box.
class DecidixChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback? onTap;

  const DecidixChip({
    super.key,
    required this.label,
    this.selected = false,
    this.onTap,
  });

  static const double height = 36;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          height: height,
          decoration: BoxDecoration(
            color: selected ? AppColors.navy : AppColors.white,
            borderRadius: AppRadius.pillRadius,
            border: selected ? null : Border.all(color: AppColors.hairline),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 18),
          child: Center(
            widthFactor: 1,
            child: Text(
              label,
              maxLines: 1,
              style: AppTypography.labelM.copyWith(
                color: selected ? AppColors.white : AppColors.ink,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
