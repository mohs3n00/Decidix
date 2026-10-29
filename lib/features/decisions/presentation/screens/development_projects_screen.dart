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
import '../../../../shared/widgets/stat_tile.dart';
import '../../../../shared/widgets/state_views.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../controllers/decisions_controllers.dart';
import '../widgets/decisions_chip_bar.dart';

class DevelopmentProjectsScreen extends ConsumerWidget {
  const DevelopmentProjectsScreen({super.key});

  /// null is "All".
  static const _filters = <ProjectStatus?>[
    null,
    ProjectStatus.inProgress,
    ProjectStatus.planned,
    ProjectStatus.delayed,
    ProjectStatus.completed,
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final projects = ref.watch(projectsProvider);
    final filter = ref.watch(projectStatusFilterProvider);
    final fmt = context.fmt;

    return DecidixPage(
      tabs: const DecisionsChipBar(selectedIndex: 1),
      eyebrow: fmt.tr('dc_eyebrow'),
      title: fmt.tr('dc_title_projects'),
      onRefresh: () => refreshFuture(ref, projectsProvider),
      children: [
        // The totals stay put while a filter reloads the list.
        if (projects.value != null)
          StatRow(
            tiles: [
              StatTile(
                value: fmt.number(projects.value!.projectsCount, decimals: 0),
                label: fmt.tr('proj_active'),
              ),
              StatTile(
                value: fmt.money(projects.value!.totalBudget),
                label: fmt.tr('proj_budget'),
              ),
              StatTile(
                value: fmt.number(projects.value!.delayedCount, decimals: 0),
                label: fmt.tr('proj_delayed'),
              ),
            ],
          ),
        ChipScrollRow(
          labels: [
            for (final s in _filters)
              s == null ? fmt.tr('filter_all') : fmt.tr('proj_status_${wireName(s)}'),
          ],
          selectedIndex: _filters.indexOf(filter),
          onSelected: (i) => ref.read(projectStatusFilterProvider.notifier).select(_filters[i]),
        ),
        ...asyncSections(
          projects,
          skeletonRows: 4,
          onRetry: () => ref.invalidate(projectsProvider),
          builder: (data) {
            if (data.items.isEmpty) return const [EmptyView()];
            return [
              for (final project in data.items) _ProjectCard(project: project),
            ];
          },
        ),
      ],
    );
  }
}

class _ProjectCard extends StatelessWidget {
  final Project project;

  const _ProjectCard({required this.project});

  BadgeTone get _tone {
    switch (project.status) {
      case ProjectStatus.inProgress:
        return BadgeTone.info;
      case ProjectStatus.completed:
        return BadgeTone.low;
      case ProjectStatus.delayed:
        return BadgeTone.high;
      case ProjectStatus.planned:
      case ProjectStatus.unknown:
        return BadgeTone.neutral;
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = context.fmt;
    final locale = Localizations.localeOf(context);
    final caption = AppTypography.captionRegular.copyWith(color: AppColors.ink);
    final delayed = project.status == ProjectStatus.delayed;

    return DecidixCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: Text(project.title.resolve(locale), style: AppTypography.titleS)),
              const SizedBox(width: 8),
              if (project.status != ProjectStatus.unknown)
                StatusBadge(
                  label: fmt.tr('proj_status_${wireName(project.status)}'),
                  tone: _tone,
                ),
            ],
          ),
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
              Text(project.region.name.resolve(locale), style: caption),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(3),
                  child: SizedBox(
                    height: 6,
                    child: ColoredBox(
                      color: AppColors.track,
                      child: Align(
                        alignment: AlignmentDirectional.centerStart,
                        child: FractionallySizedBox(
                          widthFactor: (project.progress / 100).clamp(0.0, 1.0),
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              color: delayed ? AppColors.danger : null,
                              gradient: delayed ? null : AppColors.brandGradient,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Text(fmt.percent(project.progress), style: AppTypography.labelMStrong),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Text(fmt.tr('proj_budget'), style: caption),
              const SizedBox(width: 6),
              Text(fmt.money(project.budget), style: AppTypography.captionStrong),
              const Spacer(),
              // A finished project has no due date; it shows its status.
              Text(
                fmt.tr(project.dueDate == null ? 'proj_status_label' : 'proj_due'),
                style: caption,
              ),
              const SizedBox(width: 6),
              Text(
                project.dueDate == null
                    ? fmt.tr('proj_done')
                    : fmt.monthYear(project.dueDate!),
                style: AppTypography.captionStrong,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
