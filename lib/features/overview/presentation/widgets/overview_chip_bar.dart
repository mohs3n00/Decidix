import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/localization/app_localizations.dart';
import '../../../../shared/widgets/section_chip_bar.dart';

/// Dashboard, Map and Regions tabs.
class OverviewChipBar extends StatelessWidget {
  final int selectedIndex;

  const OverviewChipBar({super.key, required this.selectedIndex});

  static const List<String> routes = [
    '/overview/dashboard',
    '/overview/map',
    '/overview/regions',
  ];

  @override
  Widget build(BuildContext context) {
    final chips = [
      context.tr('chip_dashboard'),
      context.tr('chip_map'),
      context.tr('chip_regions'),
    ];

    return SectionChipBar(
      chips: chips,
      selectedIndex: selectedIndex,
      onSelected: (idx) {
        if (idx != selectedIndex && idx < routes.length) {
          context.go(routes[idx]);
        }
      },
    );
  }
}
