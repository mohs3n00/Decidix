import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../api/models/common.dart';
import '../../../../api/models/insights.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/format/formatters.dart';
import '../../../../shared/widgets/decidix_card.dart';
import '../../../../shared/widgets/decidix_page.dart';
import '../../../../shared/widgets/region_row.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../controllers/insights_controller.dart';
import '../widgets/insights_chip_bar.dart';

class DevelopmentPriorityScreen extends ConsumerWidget {
  const DevelopmentPriorityScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final priority = ref.watch(priorityProvider);
    final fmt = context.fmt;

    return DecidixPage(
      tabs: const InsightsChipBar(selectedIndex: 6),
      eyebrow: fmt.tr('in_eyebrow'),
      title: fmt.tr('in_title_priority'),
      onRefresh: () => refreshFuture(ref, priorityProvider),
      children: asyncSections(
        priority,
        skeletonRows: 5,
        onRetry: () => ref.invalidate(priorityProvider),
        builder: (data) => [
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(child: _Count(count: data.high, level: Priority.high)),
                const SizedBox(width: 8),
                Expanded(child: _Count(count: data.medium, level: Priority.medium)),
                const SizedBox(width: 8),
                Expanded(child: _Count(count: data.low, level: Priority.low)),
              ],
            ),
          ),
          Section(
            title: fmt.tr('prio_queue'),
            child: Column(
              children: [
                for (final (i, entry) in data.queue.indexed) ...[
                  if (i > 0) const SizedBox(height: 10),
                  _QueueCard(
                    entry: entry,
                    onTap: () => context.go('/overview/regions/${entry.regionId}'),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Count extends StatelessWidget {
  final int count;
  final Priority level;

  const _Count({required this.count, required this.level});

  @override
  Widget build(BuildContext context) {
    final fmt = context.fmt;

    return DecidixCard(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            fmt.number(count, decimals: 0),
            style: AppTypography.adapt(context, AppTypography.numberL),
          ),
          const SizedBox(height: 6),
          StatusBadge(label: fmt.priority(level), tone: RegionRow.toneFor(level)),
        ],
      ),
    );
  }
}

class _QueueCard extends StatelessWidget {
  final PriorityEntry entry;
  final VoidCallback onTap;

  const _QueueCard({required this.entry, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final fmt = context.fmt;
    final locale = Localizations.localeOf(context);

    return DecidixCard(
      onTap: onTap,
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.name.resolve(locale),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.titleS,
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Text(
                      '${entry.rank}',
                      style: AppTypography.captionMedium.copyWith(color: AppColors.ink),
                    ),
                    const SizedBox(width: 8),
                    StatusBadge(
                      label: fmt.priority(entry.priority),
                      tone: RegionRow.toneFor(entry.priority),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  fmt.tr('prio_weakest', {
                    'domain': entry.weakestDomain.label.resolve(locale),
                    'score': fmt.number(entry.weakestDomain.score, decimals: 0),
                  }),
                  style: AppTypography.captionRegular.copyWith(color: AppColors.ink),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                fmt.number(entry.needScore, decimals: 0),
                style: AppTypography.adapt(context, AppTypography.numberL),
              ),
              Text(
                fmt.tr('prio_need_score'),
                style: AppTypography.microRegular.copyWith(color: AppColors.ink),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
