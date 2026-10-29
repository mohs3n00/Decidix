import 'package:flutter/material.dart';
import '../../api/models/common.dart';
import '../../api/models/overview.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_radius.dart';
import '../../core/constants/app_typography.dart';
import '../../core/format/formatters.dart';
import 'decidix_card.dart';
import 'score_ring.dart';
import 'status_badge.dart';
import 'trend_indicator.dart';

/// A region in a list: score ring, name and population, priority and change.
class RegionRow extends StatelessWidget {
  final RegionListItem region;
  final VoidCallback? onTap;

  const RegionRow({super.key, required this.region, this.onTap});

  static BadgeTone toneFor(Priority priority) {
    switch (priority) {
      case Priority.critical:
      case Priority.high:
        return BadgeTone.high;
      case Priority.medium:
        return BadgeTone.medium;
      case Priority.low:
        return BadgeTone.low;
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context);
    final fmt = context.fmt;

    return DecidixCard(
      onTap: onTap,
      borderRadius: AppRadius.rowRadius,
      semanticLabel: region.name.resolve(locale),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          ScoreRing(score: region.score, color: ScoreRing.colorFor(region.priority)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  region.name.resolve(locale),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.titleS,
                ),
                const SizedBox(height: 2),
                Text(
                  fmt.people(region.population),
                  style: AppTypography.captionRegular.copyWith(color: AppColors.ink),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              StatusBadge(label: fmt.priority(region.priority), tone: toneFor(region.priority)),
              const SizedBox(height: 6),
              TrendIndicator(value: region.change, suffix: ''),
            ],
          ),
        ],
      ),
    );
  }
}
