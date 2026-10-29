import 'package:flutter/material.dart';

import '../../../../api/models/common.dart';
import '../../../../api/models/overview.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_radius.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/format/formatters.dart';
import '../../../../shared/widgets/hero_card.dart';

/// The hero of a region profile: priority and rank, name, size, and the
/// development index with its change.
class RegionHero extends StatelessWidget {
  final RegionProfile profile;

  const RegionHero({super.key, required this.profile});

  Color _priorityColor() {
    switch (profile.priority) {
      case Priority.critical:
      case Priority.high:
        return AppColors.dangerText;
      case Priority.medium:
        return AppColors.warningText;
      case Priority.low:
        return AppColors.successText;
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = context.fmt;
    final locale = Localizations.localeOf(context);
    final priorityColor = _priorityColor();
    final good = profile.change >= 0;
    final changeColor = good ? AppColors.successText : AppColors.dangerText;

    return HeroCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: priorityColor.withValues(alpha: 0.12),
                  borderRadius: AppRadius.pillRadius,
                ),
                child: Text(
                  fmt.priority(profile.priority),
                  style: AppTypography.microStrong.copyWith(
                    color: priorityColor,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  fmt.tr('profile_rank', {
                    'rank': profile.rank,
                    'total': profile.rankTotal,
                  }),
                  textAlign: TextAlign.end,
                  style: AppTypography.captionRegular.copyWith(
                    color: AppColors.fadedInk,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            profile.name.resolve(locale),
            style: AppTypography.adapt(
              context,
              AppTypography.headingPage.copyWith(
                fontSize: 32,
                color: AppColors.navy,
              ),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            fmt.tr('profile_size', {
              'residents': fmt.residents(profile.population),
              'area': fmt.compact(profile.areaKm2),
            }),
            style: AppTypography.bodyS.copyWith(color: AppColors.fadedInk),
          ),
          const SizedBox(height: 28),
          // One line when it fits; on a narrow screen or with large text the
          // change pill drops to the next line.
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.end,
            spacing: 12,
            runSpacing: 10,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    fmt.number(profile.score),
                    style: AppTypography.adapt(
                      context,
                      AppTypography.headingPage.copyWith(
                        fontSize: 56,
                        height: 1,
                        color: AppColors.navy,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Flexible(
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Text(
                        fmt.tr('profile_development_index'),
                        style: AppTypography.captionRegular.copyWith(
                          color: AppColors.fadedInk,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: changeColor.withValues(alpha: 0.10),
                  borderRadius: AppRadius.pillRadius,
                ),
                child: Text(
                  fmt.signed(profile.change, suffix: '%'),
                  style: AppTypography.captionStrong.copyWith(
                    color: changeColor,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
