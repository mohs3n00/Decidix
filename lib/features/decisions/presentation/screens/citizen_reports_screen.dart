import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../../../api/models/decisions.dart';
import '../../../../api/models/json.dart';
import '../../../../core/constants/app_assets.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/format/formatters.dart';
import '../../../../shared/widgets/chip_scroll_row.dart';
import '../../../../shared/widgets/decidix_card.dart';
import '../../../../shared/widgets/decidix_page.dart';
import '../../../../shared/widgets/region_row.dart';
import '../../../../shared/widgets/state_views.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../../../shared/widgets/trend_indicator.dart';
import '../controllers/decisions_controllers.dart';
import '../widgets/decisions_chip_bar.dart';

class CitizenReportsScreen extends ConsumerWidget {
  const CitizenReportsScreen({super.key});

  /// null is "All".
  static const _categories = <ReportCategory?>[
    null,
    ReportCategory.roads,
    ReportCategory.health,
    ReportCategory.schools,
    ReportCategory.water,
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reports = ref.watch(reportsProvider);
    final category = ref.watch(reportCategoryFilterProvider);
    final controller = ref.read(reportsProvider.notifier);
    final fmt = context.fmt;

    return DecidixPage(
      tabs: const DecisionsChipBar(selectedIndex: 2),
      eyebrow: fmt.tr('dc_eyebrow'),
      title: fmt.tr('dc_title_reports'),
      onRefresh: () => refreshNotifier(ref, reportsProvider),
      onLoadMore: controller.loadMore,
      loadingMore: reports.value?.loadingMore ?? false,
      children: [
        if (reports.value != null)
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: _StatCard(
                    label: fmt.tr('rep_open_week'),
                    value: fmt.number(reports.value!.data.openThisWeek.value, decimals: 0),
                    stat: reports.value!.data.openThisWeek,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    label: fmt.tr('rep_resolved_rate'),
                    value: fmt.percent(reports.value!.data.resolvedRate.value),
                    stat: reports.value!.data.resolvedRate,
                  ),
                ),
              ],
            ),
          ),
        ChipScrollRow(
          labels: [
            for (final c in _categories)
              c == null ? fmt.tr('filter_all') : fmt.tr('rep_cat_${wireName(c)}'),
          ],
          selectedIndex: _categories.indexOf(category),
          onSelected: (i) => ref.read(reportCategoryFilterProvider.notifier).select(_categories[i]),
        ),
        ...asyncSections(
          reports,
          skeletonRows: 4,
          onRetry: () => ref.invalidate(reportsProvider),
          builder: (paged) {
            if (paged.data.items.isEmpty) return const [EmptyView()];
            return [
              for (final report in paged.data.items)
                _ReportCard(report: report, onLike: () => controller.toggleLike(report.id)),
            ];
          },
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final ReportStat stat;

  const _StatCard({required this.label, required this.value, required this.stat});

  @override
  Widget build(BuildContext context) {
    return DecidixCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: AppTypography.captionRegular.copyWith(color: AppColors.ink),
          ),
          const SizedBox(height: 6),
          Text(value, style: AppTypography.adapt(context, AppTypography.numberL)),
          const SizedBox(height: 6),
          TrendIndicator(value: stat.change, inverted: !stat.higherIsBetter),
        ],
      ),
    );
  }
}

class _ReportCard extends StatelessWidget {
  final CitizenReport report;
  final VoidCallback onLike;

  const _ReportCard({required this.report, required this.onLike});

  BadgeTone get _statusTone {
    switch (report.status) {
      case ReportStatus.escalated:
        return BadgeTone.high;
      case ReportStatus.resolved:
        return BadgeTone.low;
      case ReportStatus.underReview:
      case ReportStatus.unknown:
        return BadgeTone.info;
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = context.fmt;
    final locale = Localizations.localeOf(context);
    final caption = AppTypography.captionRegular.copyWith(color: AppColors.ink);

    return DecidixCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (report.category != ReportCategory.unknown)
                StatusBadge(
                  label: fmt.tr('rep_cat_${wireName(report.category)}'),
                  tone: BadgeTone.info,
                ),
              const Spacer(),
              Text(
                fmt.timeAgo(report.createdAt, DateTime.now().toUtc()),
                style: AppTypography.microRegular.copyWith(color: AppColors.ink),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(report.title.resolve(locale), style: AppTypography.titleS),
          const SizedBox(height: 6),
          Row(
            children: [
              SvgPicture.asset(
                AppAssets.icLocation,
                width: 14,
                height: 14,
                colorFilter: const ColorFilter.mode(AppColors.ink, BlendMode.srcIn),
              ),
              const SizedBox(width: 6),
              Text(report.region.name.resolve(locale), style: caption),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _LikeButton(
                liked: report.likedByMe,
                count: report.likes,
                label: fmt.tr('rep_like'),
                onTap: onLike,
              ),
              const Spacer(),
              StatusBadge(
                label: fmt.priority(report.priority),
                tone: RegionRow.toneFor(report.priority),
              ),
              if (report.status != ReportStatus.unknown) ...[
                const SizedBox(width: 6),
                StatusBadge(
                  label: fmt.tr('rep_status_${wireName(report.status)}'),
                  tone: _statusTone,
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _LikeButton extends StatelessWidget {
  final bool liked;
  final int count;
  final String label;
  final VoidCallback onTap;

  const _LikeButton({
    required this.liked,
    required this.count,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = liked ? AppColors.danger : AppColors.ink;

    return Semantics(
      button: true,
      toggled: liked,
      label: label,
      value: '$count',
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 2),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                liked ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                size: 18,
                color: color,
              ),
              const SizedBox(width: 6),
              Text('$count', style: AppTypography.captionMedium.copyWith(color: color)),
            ],
          ),
        ),
      ),
    );
  }
}
