import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../api/models/common.dart';
import '../../../../core/format/formatters.dart';
import '../../../../shared/widgets/ai_insight_panel.dart';
import '../../../../shared/widgets/decidix_page.dart';
import '../../../../shared/widgets/metric_card.dart';
import '../../../../shared/widgets/region_row.dart';
import '../controllers/dashboard_controller.dart';
import '../controllers/regions_controller.dart';
import '../widgets/development_index_card.dart';
import '../widgets/overview_chip_bar.dart';
import '../widgets/trend_card.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final overview = ref.watch(overviewProvider);
    final fmt = context.fmt;
    final locale = Localizations.localeOf(context);
    final asOf = overview.value?.asOf;

    return DecidixPage(
      tabs: const OverviewChipBar(selectedIndex: 0),
      eyebrow: asOf == null
          ? 'Decidix'
          : fmt.tr('ov_eyebrow_dashboard', {'period': fmt.period(asOf)}),
      title: fmt.tr('ov_title_dashboard'),
      onRefresh: () => refreshFuture(ref, overviewProvider),
      children: asyncSections(
        overview,
        skeletonRows: 5,
        onRetry: () => ref.invalidate(overviewProvider),
        builder: (data) => [
          DevelopmentIndexCard(index: data.index),
          MetricGrid(metrics: data.kpis, showIcons: true),
          Section(
            title: fmt.tr('ov_national_trend'),
            child: TrendCard(points: data.trend),
          ),
          Section(
            title: fmt.tr('ov_needs_attention'),
            actionLabel: fmt.tr('label_see_all'),
            onAction: () {
              ref.read(regionsFilterProvider.notifier).setPriority(Priority.high);
              context.go('/overview/regions');
            },
            child: Column(
              children: [
                for (final (i, region) in data.needsAttention.indexed) ...[
                  if (i > 0) const SizedBox(height: 10),
                  RegionRow(
                    region: region,
                    onTap: () => context.push('/overview/regions/${region.id}'),
                  ),
                ],
              ],
            ),
          ),
          AiInsightPanel(
            label: fmt.tr('label_ai_insight'),
            body: data.aiInsight.resolve(locale),
          ),
        ],
      ),
    );
  }
}
