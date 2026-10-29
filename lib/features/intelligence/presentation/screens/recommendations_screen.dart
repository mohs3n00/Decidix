import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../api/models/intelligence.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_radius.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/format/formatters.dart';
import '../../../../shared/widgets/decidix_button.dart';
import '../../../../shared/widgets/decidix_card.dart';
import '../../../../shared/widgets/decidix_page.dart';
import '../../../../shared/widgets/region_row.dart';
import '../../../../shared/widgets/score_ring.dart';
import '../../../../shared/widgets/state_views.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../controllers/intelligence_controllers.dart';
import '../widgets/intelligence_chip_bar.dart';

class RecommendationsScreen extends ConsumerWidget {
  const RecommendationsScreen({super.key});

  /// Runs [action] and tells the user how it went.
  Future<void> _run(
    BuildContext context,
    Future<bool> Function() action, {
    required String doneKey,
  }) async {
    final ok = await action();
    if (!context.mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(context.fmt.tr(ok ? doneKey : 'rec_action_failed')),
          duration: const Duration(seconds: 2),
        ),
      );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final recommendations = ref.watch(recommendationsProvider);
    final controller = ref.read(recommendationsProvider.notifier);
    final fmt = context.fmt;

    return DecidixPage(
      tabs: const IntelligenceChipBar(selectedIndex: 2),
      eyebrow: fmt.tr('ai_eyebrow'),
      title: fmt.tr('ai_title_recommendations'),
      onRefresh: () => refreshNotifier(ref, recommendationsProvider),
      children: asyncSections(
        recommendations,
        skeletonRows: 3,
        onRetry: () => ref.invalidate(recommendationsProvider),
        builder: (items) {
          if (items.isEmpty) return const [EmptyView()];
          return [
            for (final item in items)
              _RecommendationCard(
                item: item,
                onAdd: () => _run(
                  context,
                  () => controller.accept(item.id),
                  doneKey: 'rec_added',
                ),
                onDismiss: () => _run(
                  context,
                  () => controller.dismiss(item.id),
                  doneKey: 'rec_dismissed',
                ),
              ),
          ];
        },
      ),
    );
  }
}

class _RecommendationCard extends StatelessWidget {
  final Recommendation item;
  final VoidCallback onAdd;
  final VoidCallback onDismiss;

  const _RecommendationCard({
    required this.item,
    required this.onAdd,
    required this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    final fmt = context.fmt;
    final locale = Localizations.localeOf(context);
    final label = AppTypography.microRegular.copyWith(color: AppColors.ink);

    return DecidixCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              StatusBadge(
                label: fmt.priority(item.priority),
                tone: RegionRow.toneFor(item.priority),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  item.region.name.resolve(locale),
                  textAlign: TextAlign.end,
                  style: AppTypography.captionRegular.copyWith(
                    color: AppColors.ink,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(item.title.resolve(locale), style: AppTypography.titleM),
          const SizedBox(height: 4),
          Text(
            item.summary.resolve(locale),
            style: AppTypography.bodyS.copyWith(color: AppColors.ink),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.wellTint,
              borderRadius: AppRadius.innerRadius,
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(fmt.tr('rec_index_impact'), style: label),
                      const SizedBox(height: 2),
                      Text(
                        fmt.signed(item.indexImpact),
                        style: AppTypography.numberS.copyWith(
                          color: AppColors.successText,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(fmt.tr('rec_est_cost'), style: label),
                      const SizedBox(height: 2),
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: AlignmentDirectional.centerStart,
                        child: Text(
                          fmt.money(item.estimatedCost),
                          style: AppTypography.numberS,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    ScoreRing(
                      score: item.confidence,
                      size: 44,
                      color: AppColors.blue,
                    ),
                    const SizedBox(height: 2),
                    Text(fmt.tr('rec_conf'), style: label),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: DecidixButton(
                  label: fmt.tr('btn_add_to_plan'),
                  onPressed: onAdd,
                ),
              ),
              const SizedBox(width: 8),
              Semantics(
                button: true,
                label: fmt.tr('btn_dismiss'),
                excludeSemantics: true,
                child: GestureDetector(
                  onTap: onDismiss,
                  behavior: HitTestBehavior.opaque,
                  child: Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: AppColors.white,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.hairline),
                    ),
                    child: const Icon(
                      Icons.close_rounded,
                      size: 18,
                      color: AppColors.ink,
                    ),
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
