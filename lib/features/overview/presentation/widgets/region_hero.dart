import 'package:flutter/material.dart';
import '../../../../api/models/common.dart';
import '../../../../api/models/overview.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_radius.dart';
import '../../../../core/constants/app_shadows.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/format/formatters.dart';

/// The blue hero of a region profile: priority and rank, name, size, and the
/// development index with its change.
class RegionHero extends StatelessWidget {
  final RegionProfile profile;

  const RegionHero({super.key, required this.profile});

  Color _priorityColor() {
    switch (profile.priority) {
      case Priority.critical:
      case Priority.high:
        return AppColors.danger;
      case Priority.medium:
        return AppColors.warningText;
      case Priority.low:
        return AppColors.success;
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = context.fmt;
    final locale = Localizations.localeOf(context);
    final onBlue = AppColors.white.withValues(alpha: 0.8);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: AppRadius.heroRadius,
        boxShadow: AppShadows.hero,
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.blue, AppColors.cyan],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.white,
                  borderRadius: AppRadius.pillRadius,
                ),
                child: Text(
                  fmt.priority(profile.priority),
                  style: AppTypography.microStrong.copyWith(color: _priorityColor()),
                ),
              ),
              const Spacer(),
              Text(
                fmt.tr('profile_rank', {'rank': profile.rank, 'total': profile.rankTotal}),
                style: AppTypography.captionRegular.copyWith(color: onBlue),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            profile.name.resolve(locale),
            style: AppTypography.adapt(
              context,
              AppTypography.headingPage.copyWith(fontSize: 32, color: AppColors.white),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            fmt.tr('profile_size', {
              'residents': fmt.residents(profile.population),
              'area': fmt.compact(profile.areaKm2),
            }),
            style: AppTypography.bodyS.copyWith(color: onBlue),
          ),
          const SizedBox(height: 28),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                fmt.number(profile.score),
                style: AppTypography.adapt(
                  context,
                  AppTypography.headingPage.copyWith(
                    fontSize: 56,
                    height: 1,
                    color: AppColors.white,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Text(
                    fmt.tr('profile_development_index'),
                    style: AppTypography.captionRegular.copyWith(color: onBlue),
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.white.withValues(alpha: 0.2),
                  borderRadius: AppRadius.pillRadius,
                ),
                child: Text(
                  fmt.signed(profile.change, suffix: '%'),
                  style: AppTypography.captionStrong.copyWith(color: AppColors.white),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
