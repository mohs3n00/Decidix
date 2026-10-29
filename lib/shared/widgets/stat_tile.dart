import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_radius.dart';
import '../../core/constants/app_typography.dart';
import 'decidix_card.dart';

/// A number with a short label under it. [dark] is the translucent version
/// that sits on the navy hero card; otherwise it is a white card.
class StatTile extends StatelessWidget {
  final String value;
  final String label;
  final bool dark;

  const StatTile({super.key, required this.value, required this.label, this.dark = false});

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
            color: dark ? AppColors.white.withValues(alpha: 0.6) : AppColors.ink,
          ),
        ),
      ],
    );

    if (!dark) {
      return DecidixCard(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
        child: SizedBox(width: double.infinity, child: Center(child: content)),
      );
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 11),
      decoration: BoxDecoration(
        color: AppColors.white.withValues(alpha: 0.06),
        borderRadius: AppRadius.innerRadius,
        border: Border.all(color: AppColors.white.withValues(alpha: 0.12)),
      ),
      child: SizedBox(width: double.infinity, child: Center(child: content)),
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
