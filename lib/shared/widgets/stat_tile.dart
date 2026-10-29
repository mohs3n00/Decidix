import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/constants/app_radius.dart';
import '../../core/constants/app_typography.dart';
import 'decidix_card.dart';

/// A number with a short label under it. [dark] is the translucent version
/// for a navy surface; [well] is the inset pale tile that sits inside a hero
/// or a card; otherwise it is a white card.
class StatTile extends StatelessWidget {
  final String value;
  final String label;
  final bool dark;
  final bool well;

  const StatTile({
    super.key,
    required this.value,
    required this.label,
    this.dark = false,
    this.well = false,
  });

  @override
  Widget build(BuildContext context) {
    final content = Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          value,
          maxLines: 1,
          style: AppTypography.numberS.copyWith(
            color: dark ? AppColors.white : AppColors.navy,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: AppTypography.captionRegular.copyWith(
            color: dark
                ? AppColors.white.withValues(alpha: 0.6)
                : AppColors.ink,
          ),
        ),
      ],
    );

    if (well) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.white.withValues(alpha: 0.75),
          borderRadius: AppRadius.innerRadius,
          border: Border.all(color: AppColors.white),
        ),
        child: SizedBox(
          width: double.infinity,
          child: Center(child: content),
        ),
      );
    }
    if (!dark) {
      return DecidixCard(
        borderRadius: AppRadius.innerRadius,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
        child: SizedBox(
          width: double.infinity,
          child: Center(child: content),
        ),
      );
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 11),
      decoration: BoxDecoration(
        color: AppColors.white.withValues(alpha: 0.06),
        borderRadius: AppRadius.innerRadius,
        border: Border.all(color: AppColors.white.withValues(alpha: 0.12)),
      ),
      child: SizedBox(
        width: double.infinity,
        child: Center(child: content),
      ),
    );
  }
}

/// Stat tiles side by side, equal width.
class StatRow extends StatelessWidget {
  final List<StatTile> tiles;

  const StatRow({super.key, required this.tiles});

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final (i, tile) in tiles.indexed) ...[
            if (i > 0) const SizedBox(width: 8),
            Expanded(child: tile),
          ],
        ],
      ),
    );
  }
}
