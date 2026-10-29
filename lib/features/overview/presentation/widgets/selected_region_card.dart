import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../../../api/models/overview.dart';
import '../../../../core/constants/app_assets.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/format/formatters.dart';
import '../../../../shared/widgets/decidix_button.dart';
import '../../../../shared/widgets/decidix_card.dart';
import '../../../../shared/widgets/region_row.dart';
import '../../../../shared/widgets/score_ring.dart';
import '../../../../shared/widgets/status_badge.dart';

/// The region picked on the map, with a button to its profile.
class SelectedRegionCard extends StatelessWidget {
  final MapPoint point;
  final VoidCallback onOpenProfile;

  const SelectedRegionCard({super.key, required this.point, required this.onOpenProfile});

  @override
  Widget build(BuildContext context) {
    final fmt = context.fmt;
    final locale = Localizations.localeOf(context);

    return DecidixCard(
      child: Column(
        children: [
          Row(
            children: [
              ScoreRing(
                score: point.score,
                size: 52,
                color: ScoreRing.colorFor(point.priority),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      point.name.resolve(locale),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.titleM,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      fmt.tr('map_overall_score', {'people': fmt.people(point.population)}),
                      style: AppTypography.captionRegular.copyWith(color: AppColors.ink),
                    ),
                  ],
                ),
              ),
              StatusBadge(
                label: fmt.priority(point.priority),
                tone: RegionRow.toneFor(point.priority),
              ),
            ],
          ),
          const SizedBox(height: 14),
          DecidixButton(
            label: fmt.tr('btn_open_region_profile'),
            onPressed: onOpenProfile,
            trailing: SvgPicture.asset(
              AppAssets.icNext,
              width: 16,
              height: 16,
              matchTextDirection: true,
              colorFilter: const ColorFilter.mode(AppColors.cyan, BlendMode.srcIn),
            ),
          ),
        ],
      ),
    );
  }
}
